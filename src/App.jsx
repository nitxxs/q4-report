import { useEffect, useState } from 'react'
import Shell from './Shell'
import { bossCells } from './boss'
import { useRoom } from './useRoom'
import { transportMode, serverHost, configWarning } from './transport'
import { isValid, resultText, MAX_INNINGS } from './game'

const FILE_NAME = 'Q4_실적분석_최종.xlsx'
const today = new Date().toISOString().slice(0, 10)

function genCode() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 5 }, () => a[Math.floor(Math.random() * a.length)]).join('')
}
const urlCode = () => (new URLSearchParams(location.search).get('doc') || '').toUpperCase()

const ls = {
  get: (k) => {
    try {
      return localStorage.getItem(k) || ''
    } catch {
      return ''
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v)
    } catch {}
  },
}

const link = (v, onClick, extra = '') => ({ v, onClick, cls: 'link ' + extra })
const hdr = (v, extra = '') => ({ v, cls: 'hdr ' + extra })
const muted = (v, span = 10) => ({ v, cls: 'muted', span })

export default function App() {
  const [sheet, setSheet] = useState('main')
  const [active, setActive] = useState('B4')
  const [name, setName] = useState(ls.get('q4-name'))
  const [codeInput, setCodeInput] = useState(urlCode())
  const [room, setRoom] = useState(null)
  const [secretInput, setSecretInput] = useState('')
  const [guessInput, setGuessInput] = useState('')
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const g = useRoom(room, name)

  useEffect(() => {
    document.title = FILE_NAME
  }, [])

  // 보스키: Esc 로 시트 전환
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setSheet((s) => (s === 'main' ? 'boss' : 'main'))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 내 차례가 되면 입력칸으로 커서 이동
  useEffect(() => {
    if (g.myTurn && sheet === 'main') setActive('B23')
  }, [g.myTurn, sheet])

  useEffect(() => {
    if (room && !g.ready) setActive('B8')
  }, [room, g.ready, g.round])

  const enter = (code) => {
    const n = name.trim()
    if (!n) {
      setMsg('담당자명을 입력하세요.')
      setActive('B4')
      return
    }
    ls.set('q4-name', n)
    setName(n)
    setRoom(code)
    setMsg('')
    history.replaceState(null, '', `?doc=${code}`)
  }

  const copyLink = async () => {
    const url = `${location.origin}${location.pathname}?doc=${room}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('링크를 복사하세요', url)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const submitSecret = () => {
    if (!isValid(secretInput)) return setMsg('기준값은 서로 다른 숫자 3자리여야 합니다.')
    g.confirmSecret(secretInput)
    setSecretInput('')
    setMsg('')
  }

  const submitGuess = () => {
    if (!g.myTurn) return
    if (!isValid(guessInput)) return setMsg('서로 다른 숫자 3자리를 입력하세요.')
    g.guess(guessInput)
    setGuessInput('')
    setMsg('')
  }

  const digits = (v) => v.replace(/\D/g, '').slice(0, 3)

  // ---------- 셀 구성 ----------
  const c = {}
  c.A1 = { v: '2026년 4분기 영업실적 분석', cls: 'title', span: 6 }
  c.A2 = { v: `경영지원팀 · 대외비 · 기준일 ${today}`, cls: 'muted', span: 6 }

  if (!room) {
    c.A4 = hdr('담당자명')
    c.B4 = { span: 2, cls: 'editable', input: { value: name, onChange: setName, onEnter: () => setActive('B5'), maxLength: 10, placeholder: '이름' } }
    c.A5 = hdr('문서코드')
    c.B5 = {
      span: 2,
      cls: 'editable',
      input: {
        value: codeInput,
        onChange: (v) => setCodeInput(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)),
        onEnter: () => codeInput && enter(codeInput),
        placeholder: '받은 코드 (신규 작성은 비움)',
      },
    }
    c.A7 = link('새 문서 작성', () => enter(genCode()), 'btn')
    c.B7 = link('문서 열기', () => (codeInput ? enter(codeInput) : setMsg('문서코드를 입력하세요.')), 'btn')
    c.A9 = muted('※ 공유받은 링크로 들어오면 문서코드가 자동 입력됩니다.')
    c.A10 = muted('※ Esc: 다른 시트로 전환')
    if (transportMode === 'local') c.A11 = muted('※ 로컬 테스트 모드: 같은 브라우저의 다른 탭끼리만 연결됩니다.')
    else c.A11 = muted(`※ 서버: ${serverHost}`)
    if (configWarning) c.A13 = { v: '⚠ ' + configWarning, cls: 'down', span: 10 }
  } else {
    const oppName = g.opp?.name || '대기중'
    c.A4 = hdr('문서코드')
    c.B4 = { v: room, cls: 'bold' }
    c.C4 = link(copied ? '복사됨' : '링크 복사', copyLink)
    c.D4 = link('나가기', () => {
      setRoom(null)
      history.replaceState(null, '', location.pathname)
    })
    c.A5 = hdr('작성자')
    c.B5 = { v: name }
    c.C5 = hdr('검토자')
    c.D5 = { v: oppName, span: 2, cls: g.opp ? '' : 'muted' }
    c.A6 = hdr('상태')
    c.B6 = {
      v: g.full ? '정원 초과(2인 문서)' : g.conn === 'SUBSCRIBED' ? '동기화됨' : g.conn === 'CONNECTING' ? '연결 중…' : `오류(${g.conn})`,
      span: 2,
      cls: g.conn === 'SUBSCRIBED' && !g.full ? '' : 'down',
    }
    c.F6 = { v: `${g.round}차`, cls: 'muted' }
    if (g.connErr) c.H6 = { v: `${g.connErr} (${serverHost})`, cls: 'down', span: 8 }

    // 기준값(비밀 숫자)
    c.A8 = hdr('기준값')
    if (!g.ready) {
      c.B8 = {
        cls: 'editable',
        input: { value: secretInput, onChange: (v) => setSecretInput(digits(v)), onEnter: submitSecret, type: 'password', maxLength: 3, inputMode: 'numeric', placeholder: '3자리' },
      }
      c.C8 = link('확정', submitSecret, 'btn')
    } else {
      c.B8 = { v: '●●●', cls: 'num', f: g.secret }
      c.C8 = { v: '확정됨', cls: 'muted' }
    }

    let status = ''
    if (!g.opp) status = '검토자 참여 대기중 — [링크 복사]로 공유하세요.'
    else if (!g.ready) status = '기준값(서로 다른 숫자 3자리)을 입력하고 확정하세요.'
    else if (!g.started) status = '검토자 기준값 입력 대기중…'
    else if (g.result) status = '검토 완료'
    else status = g.myTurn ? '▶ 입력 차례입니다. B23에 입력 후 Enter' : '검토자 입력 대기중…'
    c.A9 = muted(status)
    c.A9.cls = 'status'
    if (g.opp && g.opp.round > g.round) {
      c.A10 = { v: '검토자가 재검토를 요청했습니다.', cls: 'status', span: 3 }
      c.D10 = link('수락', () => {
        g.acceptRematch()
        setMsg('')
      }, 'btn')
    }

    // 표
    const H = ['이닝', '구분', '제출값', 'S', 'B', '판정', '', '구분', '검토자 값', 'S', 'B', '판정']
    'ABCDEFGHIJKL'.split('').forEach((col, i) => H[i] && (c[col + 12] = hdr(H[i], 'center')))
    const myTag = g.firstIsMe ? '초' : '말'
    const opTag = g.firstIsMe ? '말' : '초'
    const sum = { ms: 0, mb: 0, ts: 0, tb: 0 }
    for (let i = 0; i < MAX_INNINGS; i++) {
      const r = 13 + i
      c['A' + r] = { v: `${i + 1}회`, cls: 'center' }
      const m = g.mine[i]
      const t = g.theirs[i]
      c['B' + r] = { v: myTag, cls: 'center muted' }
      c['H' + r] = { v: opTag, cls: 'center muted' }
      if (m) {
        c['C' + r] = { v: m.guess, cls: 'num' }
        c['D' + r] = { v: m.s ?? '', cls: 'num' }
        c['E' + r] = { v: m.b ?? '', cls: 'num' }
        c['F' + r] = { v: resultText(m), cls: 'center ' + (m.s === 3 ? 'up bold' : m.s === 0 && m.b === 0 ? 'down' : ''), f: `=JUDGE(C${r},검토자!$B$8)` }
        sum.ms += m.s || 0
        sum.mb += m.b || 0
      }
      if (t) {
        c['I' + r] = { v: t.guess, cls: 'num' }
        c['J' + r] = { v: t.s, cls: 'num' }
        c['K' + r] = { v: t.b, cls: 'num' }
        c['L' + r] = { v: resultText(t), cls: 'center ' + (t.s === 3 ? 'up bold' : t.s === 0 && t.b === 0 ? 'down' : ''), f: `=JUDGE(I${r},$B$8)` }
        sum.ts += t.s
        sum.tb += t.b
      }
    }
    c.A22 = { v: '합계', cls: 'total center' }
    ;['B', 'C', 'F', 'H', 'I', 'L'].forEach((k) => (c[k + 22] = { v: '', cls: 'total' }))
    c.D22 = { v: sum.ms, cls: 'num total', f: '=SUM(D13:D21)' }
    c.E22 = { v: sum.mb, cls: 'num total', f: '=SUM(E13:E21)' }
    c.J22 = { v: sum.ts, cls: 'num total', f: '=SUM(J13:J21)' }
    c.K22 = { v: sum.tb, cls: 'num total', f: '=SUM(K13:K21)' }

    // 입력 행
    c.A23 = hdr('입력')
    c.B23 = {
      cls: 'editable' + (g.myTurn ? ' turn' : ''),
      input: {
        value: guessInput,
        onChange: (v) => setGuessInput(digits(v)),
        onEnter: submitGuess,
        maxLength: 3,
        inputMode: 'numeric',
        disabled: !g.myTurn,
        placeholder: g.myTurn ? '3자리' : '',
      },
    }
    c.C23 = link('제출', submitGuess, 'btn' + (g.myTurn ? '' : ' off'))
    if (msg) c.D23 = { v: msg, cls: 'down', span: 3 }

    // 결과 (입력 행 오른쪽)
    if (g.result) {
      const label = { win: '승인 (승리)', lose: '반려 (패배)', draw: '보류 (무승부)' }[g.result]
      c.H23 = hdr('결과')
      c.I23 = { v: label, span: 2, cls: 'bold ' + (g.result === 'win' ? 'up' : g.result === 'lose' ? 'down' : '') }
      c.H24 = hdr('검토자값')
      c.I24 = { v: g.oppSecret ?? '확인 중…', cls: 'num' }
      if (!(g.opp && g.opp.round > g.round)) c.L23 = link('재검토 요청', g.requestRematch, 'btn')
    } else if (g.opp && g.round > g.opp.round) {
      c.H23 = { v: '재검토 요청됨 — 검토자 수락 대기중', cls: 'status', span: 5 }
    }
    if (msg && !c.D23) c.D9 = { v: msg, cls: 'down', span: 6 }
  }
  if (!room && msg) c.A12 = { v: msg, cls: 'down', span: 6 }

  const cells = sheet === 'main' ? c : bossCells(today)
  const status = sheet === 'main' && g.started && !g.result && !g.myTurn ? '계산 중...' : '준비'

  return (
    <Shell
      fileName={FILE_NAME}
      cells={cells}
      active={active}
      setActive={setActive}
      sheet={sheet}
      setSheet={setSheet}
      sheets={[
        { id: 'main', label: '요약' },
        { id: 'boss', label: '매출현황' },
      ]}
      status={status}
      user={name}
    />
  )
}
