import { useEffect, useRef, useState } from 'react'
import { joinRoom } from './transport'
import { isValid, judge, evaluate } from './game'

export const myId = Math.random().toString(36).slice(2, 10)
export const MAX_MEMBERS = 4
const CHAT_LIMIT = 150

const byJoin = (a, b) => a.joinedAt - b.joinedAt || (a.id < b.id ? -1 : 1)
const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

// 두 선수의 스냅샷 기록을 합침 (판정이 끝난 항목 우선)
function mergeList(a = [], b = []) {
  const n = Math.max(a.length, b.length)
  return Array.from({ length: n }, (_, i) => {
    const x = a[i]
    const y = b[i]
    if (x && x.s != null) return x
    if (y && y.s != null) return y
    return x || y
  })
}

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
  const [chat, setChat] = useState([]) // {id, from, name, text, ts, sys?}
  const [snaps, setSnaps] = useState({}) // 관전용: 선수별 최신 스냅샷
  const joinedAt = useRef(Date.now())
  const chRef = useRef(null)
  const S = useRef({})
  const roomJoinedAt = useRef(0)

  // ---- 역할 계산 ----
  const sorted = [...peers].sort(byJoin)
  const players = sorted.slice(0, 2)
  const spectators = sorted.slice(2, MAX_MEMBERS)
  const meTracked = peers.some((p) => p.id === myId)
  const role = players.some((p) => p.id === myId)
    ? 'player'
    : spectators.some((p) => p.id === myId)
      ? 'spectator'
      : meTracked
        ? 'full'
        : 'connecting'
  const opp = role === 'player' ? players.find((p) => p.id !== myId) || null : null

  S.current = { round, secret, mine, theirs, oppId: opp?.id, chat, sorted }

  const reset = (r) => {
    setRound(r)
    setReady(false)
    setSecret('')
    setMine([])
    setTheirs([])
    setOppSecret(null)
  }

  const addChat = (msgs) =>
    setChat((cur) => {
      const ids = new Set(cur.map((m) => m.id))
      const add = msgs.filter((m) => m && m.id && !ids.has(m.id))
      if (!add.length) return cur
      return [...cur, ...add].sort((a, b) => a.ts - b.ts).slice(-CHAT_LIMIT)
    })

  useEffect(() => {
    if (!room) return
    roomJoinedAt.current = Date.now()
    setChat([])
    setSnaps({})
    const ch = joinRoom(room, myId, {
      onPresence: setPeers,
      onStatus: (st, e) => {
        setConn(st)
        setConnErr(st === 'SUBSCRIBED' ? '' : e || '')
      },
      onEvent: (type, d, from) => {
        const cur = S.current
        if (!d) return

        // 채팅은 역할과 무관
        if (type === 'chat') return addChat([d])
        if (type === 'chat-history') {
          if (d.to === myId) addChat(d.msgs || [])
          return
        }
        if (type === 'snap') {
          setSnaps((s) => ({ ...s, [from]: { ...d, at: Date.now() } }))
          return
        }

        // 이하 게임 메시지: 내 상대에게서 온 것만 처리
        if (from !== cur.oppId || d.round !== cur.round) return
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

  // ---- 입장/퇴장 알림 + 새로 온 사람에게 채팅 기록 전달 ----
  const prevPeers = useRef(null)
  useEffect(() => {
    const ids = new Map(peers.map((p) => [p.id, p.name]))
    const prev = prevPeers.current
    if (prev && meTracked) {
      const sys = []
      for (const [id, nm] of ids) if (!prev.has(id) && id !== myId) sys.push({ id: 'j' + id, sys: true, text: `${nm}님이 참여했습니다.`, ts: Date.now() })
      for (const [id, nm] of prev) if (!ids.has(id) && id !== myId) sys.push({ id: 'l' + id + Date.now(), sys: true, text: `${nm}님이 나갔습니다.`, ts: Date.now() })
      // 내가 막 들어온 직후에는 기존 참여자 목록이 순차 동기화되므로 알림 생략
      if (sys.length && Date.now() - roomJoinedAt.current > 3000) addChat(sys)
      // 가장 먼저 들어온 사람이 새 참여자에게 기록 전송
      const newcomers = [...ids.keys()].filter((id) => !prev.has(id) && id !== myId)
      if (newcomers.length && S.current.sorted[0]?.id === myId) {
        const msgs = S.current.chat.filter((m) => !m.sys)
        if (msgs.length) setTimeout(() => newcomers.forEach((to) => chRef.current?.send('chat-history', { to, msgs })), 500)
      }
    }
    if (meTracked) prevPeers.current = ids
  }, [peers, meTracked])

  // ---- 선수 시점 파생 상태 ----
  const amHost = players[0]?.id === myId
  const started = !!(role === 'player' && ready && opp?.ready && opp.round === round)
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

  // ---- 관전자에게 경기 상황 전송 (선수만) ----
  const host = players[0]
  const guest = players[1]
  const hasSpectators = spectators.length > 0
  useEffect(() => {
    if (role !== 'player' || !hasSpectators || !host || !guest) return
    const snap = () => ({
      round,
      hostId: host.id,
      guestId: guest.id,
      hostList: amHost ? mine : theirs,
      guestList: amHost ? theirs : mine,
      started,
      // 비밀 숫자는 경기가 끝난 뒤에만 공개
      hostSecret: outcome ? (amHost ? secret : oppSecret) : null,
      guestSecret: outcome ? (amHost ? oppSecret : secret) : null,
    })
    chRef.current?.send('snap', snap())
    const t = setInterval(() => chRef.current?.send('snap', snap()), 4000)
    return () => clearInterval(t)
  }, [role, hasSpectators, host?.id, guest?.id, round, mine, theirs, started, outcome, secret, oppSecret, amHost])

  // ---- 관전자 시점 ----
  let spectate = null
  if (role === 'spectator' && host) {
    const cands = Object.values(snaps).filter((s) => s.hostId === host.id && s.guestId === guest?.id)
    const maxRound = Math.max(0, ...cands.map((s) => s.round))
    const cur = cands.filter((s) => s.round === maxRound)
    const hostList = cur.reduce((acc, s) => mergeList(acc, s.hostList), [])
    const guestList = cur.reduce((acc, s) => mergeList(acc, s.guestList), [])
    const firstIsHost = maxRound % 2 === 1
    const sStarted = cur.some((s) => s.started)
    const o = sStarted ? evaluate(firstIsHost ? hostList : guestList, firstIsHost ? guestList : hostList) : null
    spectate = {
      round: maxRound || 1,
      host,
      guest: guest || null,
      hostList,
      guestList,
      firstIsHost,
      started: sStarted,
      winner: !o ? null : o === 'draw' ? 'draw' : (o === 'first') === firstIsHost ? 'host' : 'guest',
      hostSecret: cur.find((s) => s.hostSecret)?.hostSecret || null,
      guestSecret: cur.find((s) => s.guestSecret)?.guestSecret || null,
    }
  }

  const confirmSecret = (s) => {
    if (role !== 'player' || !isValid(s)) return false
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

  const sendChat = (text) => {
    const t = text.trim().slice(0, 500)
    if (!t || !chRef.current) return false
    const m = { id: newId(), from: myId, name, text: t, ts: Date.now() }
    addChat([m])
    chRef.current.send('chat', m)
    return true
  }

  return {
    conn,
    connErr,
    role,
    full: role === 'full',
    players,
    spectators,
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
    spectate,
    chat,
    sendChat,
    confirmSecret,
    guess,
    requestRematch: () => reset(round + 1),
    acceptRematch: () => opp && reset(opp.round),
  }
}
