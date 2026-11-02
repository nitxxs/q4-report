import { createClient } from '@supabase/supabase-js'

const URL = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '')
const KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

// 화면 진단용 (키는 표시하지 않음)
export const serverHost = URL.replace(/^https?:\/\//, '')
export const configWarning = !URL
  ? ''
  : !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(URL)
    ? 'URL 형식 오류: https://프로젝트ID.supabase.co 형태여야 합니다'
    : !/^(sb_publishable_|eyJ)/.test(KEY)
      ? '키 형식 오류: sb_publishable_ 또는 eyJ 로 시작하는 공개 키를 넣으세요'
      : ''

// 환경변수가 없으면 같은 브라우저의 탭끼리만 통신하는 로컬 테스트 모드로 동작합니다.
export const transportMode = URL && KEY ? 'supabase' : 'local'

let client = null

/**
 * handlers: { onPresence(list), onEvent(type, data, from), onStatus(status) }
 * 반환: { track(state), send(type, data), close() }
 */
export function joinRoom(room, myId, handlers) {
  return transportMode === 'supabase'
    ? joinSupabase(room, myId, handlers)
    : joinLocal(room, myId, handlers)
}

function joinSupabase(room, myId, handlers) {
  client ??= createClient(URL, KEY)
  const ch = client.channel(`q4-${room}`, {
    config: { broadcast: { self: false }, presence: { key: myId } },
  })
  let state = null
  let subscribed = false

  ch.on('presence', { event: 'sync' }, () => {
    const ps = ch.presenceState()
    const list = Object.entries(ps).map(([id, metas]) => ({ id, ...metas[metas.length - 1] }))
    handlers.onPresence(list)
  })
  ch.on('broadcast', { event: 'msg' }, ({ payload }) => {
    handlers.onEvent(payload.type, payload.data, payload.from)
  })
  ch.subscribe((status, err) => {
    if (status === 'SUBSCRIBED') {
      subscribed = true
      if (state) ch.track(state)
    } else if (err) {
      console.error('[realtime]', status, err)
    }
    handlers.onStatus?.(status, err?.message || (err ? String(err) : ''))
  })

  return {
    track(s) {
      state = s
      if (subscribed) ch.track(s)
    },
    send(type, data) {
      ch.send({ type: 'broadcast', event: 'msg', payload: { type, data, from: myId } })
    },
    close() {
      client.removeChannel(ch)
    },
  }
}

function joinLocal(room, myId, handlers) {
  const bc = new BroadcastChannel(`q4-${room}`)
  const peers = new Map()
  let state = null

  const emit = () => {
    const now = Date.now()
    for (const [id, p] of peers) if (now - p.t > 5000) peers.delete(id)
    const list = [...peers.entries()].map(([id, p]) => ({ id, ...p.s }))
    if (state) list.push({ id: myId, ...state })
    handlers.onPresence(list)
  }

  bc.onmessage = (e) => {
    const m = e.data
    if (m.kind === 'presence') {
      peers.set(m.id, { s: m.state, t: Date.now() })
      emit()
      if (m.hello && state) bc.postMessage({ kind: 'presence', id: myId, state })
    } else if (m.kind === 'leave') {
      peers.delete(m.id)
      emit()
    } else if (m.kind === 'msg') {
      handlers.onEvent(m.type, m.data, m.id)
    }
  }

  const hb = setInterval(() => {
    if (state) bc.postMessage({ kind: 'presence', id: myId, state })
    emit()
  }, 1500)
  setTimeout(() => handlers.onStatus?.('SUBSCRIBED'), 0)

  return {
    track(s) {
      const hello = !state
      state = s
      bc.postMessage({ kind: 'presence', id: myId, state: s, hello })
      emit()
    },
    send(type, data) {
      bc.postMessage({ kind: 'msg', type, data, id: myId })
    },
    close() {
      bc.postMessage({ kind: 'leave', id: myId })
      clearInterval(hb)
      bc.close()
    },
  }
}
