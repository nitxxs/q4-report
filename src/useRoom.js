import { useEffect, useRef, useState } from 'react'
import { joinRoom } from './transport'
import { isValid, judge, evaluate } from './game'

export const myId = Math.random().toString(36).slice(2, 10)

export function useRoom(room, name) {
  const [conn, setConn] = useState('CONNECTING')
  const [connErr, setConnErr] = useState('')
  const [peers, setPeers] = useState([])
  const [round, setRound] = useState(1)
  const [ready, setReady] = useState(false)
  const [secret, setSecret] = useState('')
  const [mine, setMine] = useState([]) // 내가 상대 숫자를 추측한 기록 {guess, s, b}
  const [theirs, setTheirs] = useState([]) // 상대가 내 숫자를 추측한 기록
  const [oppSecret, setOppSecret] = useState(null)
  const joinedAt = useRef(Date.now())
  const chRef = useRef(null)
  const S = useRef({})
  S.current = { round, secret, mine, theirs }

  const reset = (r) => {
    setRound(r)
    setReady(false)
    setSecret('')
    setMine([])
    setTheirs([])
    setOppSecret(null)
  }

  useEffect(() => {
    if (!room) return
    const ch = joinRoom(room, myId, {
      onPresence: setPeers,
      onStatus: (st, e) => {
        setConn(st)
        setConnErr(st === 'SUBSCRIBED' ? '' : e || '')
      },
      onEvent: (type, d) => {
        const cur = S.current
        if (!d || d.round !== cur.round) return
        if (type === 'guess') {
          const ex = cur.theirs[d.idx]
          if (ex) {
            ch.send('result', { round: d.round, idx: d.idx, s: ex.s, b: ex.b })
            return
          }
          if (d.idx !== cur.theirs.length || !cur.secret || !isValid(d.guess)) return
          const r = judge(cur.secret, d.guess)
          const next = [...cur.theirs, { guess: d.guess, ...r }]
          S.current = { ...cur, theirs: next }
          setTheirs(next)
          ch.send('result', { round: d.round, idx: d.idx, ...r })
        } else if (type === 'result') {
          setMine((m) =>
            m[d.idx] && m[d.idx].s == null ? m.map((x, i) => (i === d.idx ? { ...x, s: d.s, b: d.b } : x)) : m,
          )
        } else if (type === 'reveal') {
          setOppSecret(d.secret)
        }
      },
    })
    chRef.current = ch
    return () => {
      ch.close()
      chRef.current = null
    }
  }, [room])

  useEffect(() => {
    chRef.current?.track({ name, joinedAt: joinedAt.current, round, ready })
  }, [room, name, round, ready])

  // ---- 파생 상태 ----
  const players = [...peers].sort((a, b) => a.joinedAt - b.joinedAt || (a.id < b.id ? -1 : 1)).slice(0, 2)
  const meIn = players.some((p) => p.id === myId)
  const full = !meIn && peers.length >= 2 && peers.some((p) => p.id === myId)
  const opp = meIn ? players.find((p) => p.id !== myId) || null : null
  const amHost = players[0]?.id === myId
  const started = !!(ready && opp?.ready && opp.round === round)
  const firstIsMe = (round % 2 === 1) === amHost
  const firstList = firstIsMe ? mine : theirs
  const secondList = firstIsMe ? theirs : mine
  const outcome = started ? evaluate(firstList, secondList) : null
  const total = mine.length + theirs.length
  const firstTurn = total % 2 === 0
  const lastPending = mine.length > 0 && mine[mine.length - 1].s == null
  const myTurn = started && !outcome && firstTurn === firstIsMe && !lastPending
  const result = !outcome ? null : outcome === 'draw' ? 'draw' : (outcome === 'first') === firstIsMe ? 'win' : 'lose'

  // 상대가 바뀌면(나갔다 들어오면) 새 판으로 초기화
  const oppIdRef = useRef(null)
  useEffect(() => {
    const id = opp?.id || null
    if (oppIdRef.current && id && id !== oppIdRef.current) reset(1)
    if (id) oppIdRef.current = id
  }, [opp?.id])

  // 내 추측에 대한 결과가 안 오면 재전송
  useEffect(() => {
    if (!lastPending) return
    const idx = mine.length - 1
    const t = setInterval(() => chRef.current?.send('guess', { round, idx, guess: mine[idx].guess }), 2500)
    return () => clearInterval(t)
  }, [lastPending, mine, round])

  // 경기 종료 시 내 비밀 숫자 공개 (유실 대비 몇 번 반복)
  useEffect(() => {
    if (!outcome || !secret) return
    const send = () => chRef.current?.send('reveal', { round, secret })
    send()
    const t1 = setTimeout(send, 1500)
    const t2 = setTimeout(send, 4000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [outcome, secret, round])

  const confirmSecret = (s) => {
    if (!isValid(s)) return false
    setSecret(s)
    setReady(true)
    return true
  }

  const guess = (g) => {
    if (!myTurn || !isValid(g)) return false
    const idx = mine.length
    setMine([...mine, { guess: g, s: null, b: null }])
    chRef.current?.send('guess', { round, idx, guess: g })
    return true
  }

  return {
    conn,
    connErr,
    full,
    opp,
    round,
    ready,
    secret,
    mine,
    theirs,
    oppSecret,
    started,
    firstIsMe,
    myTurn,
    result,
    confirmSecret,
    guess,
    requestRematch: () => reset(round + 1),
    acceptRematch: () => opp && reset(opp.round),
  }
}
