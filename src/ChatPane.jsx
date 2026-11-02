import { useEffect, useRef, useState } from 'react'

const hhmm = (ts) => {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 엑셀 "메모" 창처럼 보이는 채팅 패널
export default function ChatPane({ chat }) {
  const [text, setText] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chat.messages.length, chat.visible])

  const send = () => {
    if (chat.send(text)) setText('')
  }

  return (
    <aside className="chatpane">
      <div className="cp-head">
        <span className="cp-title">메모</span>
        <span className="cp-close" onClick={chat.close} title="닫기">✕</span>
      </div>
      <div className="cp-list" ref={listRef}>
        {chat.messages.length === 0 && <div className="cp-empty">이 시트에 메모가 없습니다.</div>}
        {chat.messages.map((m) =>
          m.sys ? (
            <div key={m.id} className="cp-sys">{m.text}</div>
          ) : (
            <div key={m.id} className={'cp-card' + (m.from === chat.myId ? ' mine' : '')}>
              <div className="cp-meta">
                <span className="cp-av">{(m.name || '?').slice(0, 1)}</span>
                <span className="cp-name">{m.name}</span>
                <span className="cp-time">{hhmm(m.ts)}</span>
              </div>
              <div className="cp-text">{m.text}</div>
            </div>
          ),
        )}
      </div>
      <div className="cp-input">
        <textarea
          rows={2}
          value={text}
          placeholder="메모 입력 (Enter 전송, Shift+Enter 줄바꿈)"
          maxLength={500}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              send()
            }
          }}
        />
        <button onClick={send} disabled={!text.trim()}>게시</button>
      </div>
    </aside>
  )
}
