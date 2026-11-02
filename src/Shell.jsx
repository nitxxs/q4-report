import { useEffect, useRef } from 'react'
import ChatPane from './ChatPane'

export const COLS = 'ABCDEFGHIJKLMNOP'.split('')
export const WIDTHS = [64, 92, 92, 52, 52, 92, 28, 64, 92, 52, 52, 92, 80, 80, 80, 80]
export const ROWS = 36

const TABS = ['파일', '홈', '삽입', '페이지 레이아웃', '수식', '데이터', '검토', '보기', '도움말']

function Icon({ d, w = 16 }) {
  return (
    <svg width={w} height={w} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.1">
      <path d={d} />
    </svg>
  )
}

function Ribbon({ chat }) {
  return (
    <div className="ribbon">
      <div className="ribbon-tabs">
        {TABS.map((t) => (
          <span key={t} className={t === '홈' ? 'rtab active' : t === '파일' ? 'rtab file' : 'rtab'}>{t}</span>
        ))}
        <span className="rtab-spacer" />
        {chat && (
          <span className={'rtab-memo' + (chat.visible ? ' on' : '')} onClick={chat.toggle}>
            메모{chat.unread > 0 && <span className="badge">{chat.unread > 9 ? '9+' : chat.unread}</span>}
          </span>
        )}
        <span className="rtab-share">공유</span>
      </div>
      <div className="ribbon-body">
        <div className="rgroup">
          <div className="rbig">
            <Icon w={26} d="M5 3h6v2H5zM4 4H3v10h10V4h-1M6 8h4M6 10h4M6 12h2" />
            <span>붙여넣기</span>
          </div>
          <div className="rcol">
            <span className="rsmall"><Icon d="M4 2v8M4 10l-2-2M12 6h-6v8h6z" /> 잘라내기</span>
            <span className="rsmall"><Icon d="M3 3h7v9H3zM6 6h7v8H6" /> 복사</span>
            <span className="rsmall"><Icon d="M3 13l5-9 2 2-5 9z" /> 서식 복사</span>
          </div>
          <div className="rlabel">클립보드</div>
        </div>
        <div className="rgroup">
          <div className="rrow">
            <span className="rselect" style={{ width: 118 }}>맑은 고딕</span>
            <span className="rselect" style={{ width: 40 }}>11</span>
            <span className="rbtn">가<sup>^</sup></span>
            <span className="rbtn">가<sup>ˇ</sup></span>
          </div>
          <div className="rrow">
            <span className="rbtn b">가</span>
            <span className="rbtn i">가</span>
            <span className="rbtn u">가</span>
            <span className="rsep" />
            <span className="rbtn"><Icon d="M2 2h12v12H2zM2 8h12M8 2v12" /></span>
            <span className="rbtn fill"><Icon d="M3 10l5-6 4 4-5 5zM2 14h12" /></span>
            <span className="rbtn fontc">가</span>
          </div>
          <div className="rlabel">글꼴</div>
        </div>
        <div className="rgroup">
          <div className="rrow">
            <span className="rbtn"><Icon d="M2 3h12M2 6h12M2 9h12" /></span>
            <span className="rbtn"><Icon d="M2 5h12M2 8h12M2 11h12" /></span>
            <span className="rbtn"><Icon d="M2 7h12M2 10h12M2 13h12" /></span>
            <span className="rsmall">텍스트 줄 바꿈</span>
          </div>
          <div className="rrow">
            <span className="rbtn"><Icon d="M2 4h12M2 7h8M2 10h12M2 13h8" /></span>
            <span className="rbtn"><Icon d="M2 4h12M4 7h8M2 10h12M4 13h8" /></span>
            <span className="rbtn"><Icon d="M2 4h12M6 7h8M2 10h12M6 13h8" /></span>
            <span className="rsmall">병합하고 가운데 맞춤</span>
          </div>
          <div className="rlabel">맞춤</div>
        </div>
        <div className="rgroup">
          <div className="rrow">
            <span className="rselect" style={{ width: 92 }}>일반</span>
          </div>
          <div className="rrow">
            <span className="rbtn">₩</span>
            <span className="rbtn">%</span>
            <span className="rbtn">,</span>
            <span className="rbtn small">.0</span>
            <span className="rbtn small">.00</span>
          </div>
          <div className="rlabel">표시 형식</div>
        </div>
        <div className="rgroup hide-sm">
          <div className="rcol">
            <span className="rsmall"><Icon d="M2 2h12v12H2zM5 9l2 2 4-5" /> 조건부 서식</span>
            <span className="rsmall"><Icon d="M2 2h12v12H2zM2 6h12M2 10h12M6 2v12" /> 표 서식</span>
            <span className="rsmall"><Icon d="M3 3h10v10H3zM3 8h10" /> 셀 스타일</span>
          </div>
          <div className="rlabel">스타일</div>
        </div>
        <div className="rgroup hide-sm">
          <div className="rcol">
            <span className="rsmall"><Icon d="M2 3h12v10H2zM8 5v6M5 8h6" /> 삽입</span>
            <span className="rsmall"><Icon d="M2 3h12v10H2zM5 8h6" /> 삭제</span>
            <span className="rsmall"><Icon d="M2 3h12v10H2zM2 7h12" /> 서식</span>
          </div>
          <div className="rlabel">셀</div>
        </div>
        <div className="rgroup hide-sm">
          <div className="rcol">
            <span className="rsmall">Σ 자동 합계</span>
            <span className="rsmall"><Icon d="M3 3h10l-4 5v5l-2-1V8z" /> 정렬 및 필터</span>
            <span className="rsmall"><Icon d="M7 3a4 4 0 110 8 4 4 0 010-8zM10 10l4 4" /> 찾기 및 선택</span>
          </div>
          <div className="rlabel">편집</div>
        </div>
      </div>
    </div>
  )
}

function cellText(spec) {
  if (!spec) return ''
  if (spec.input) return spec.input.type === 'password' ? '●'.repeat(spec.input.value.length) : spec.input.value
  if (spec.f) return spec.f
  return typeof spec.v === 'string' || typeof spec.v === 'number' ? String(spec.v) : ''
}

export default function Shell({ fileName, cells, active, setActive, sheet, setSheet, sheets, status, user, chat }) {
  const inputRefs = useRef({})
  const spec = cells[active]
  const editable = spec?.input && spec.input.type !== 'password' && !spec.input.disabled

  useEffect(() => {
    const el = inputRefs.current[active]
    if (el && document.activeElement !== el) el.focus()
  }, [active, spec?.input?.disabled])

  const activeCol = active.match(/[A-Z]+/)[0]
  const activeRow = Number(active.match(/\d+/)[0])

  const rows = []
  for (let r = 1; r <= ROWS; r++) {
    const tds = []
    for (let ci = 0; ci < COLS.length; ci++) {
      const ref = COLS[ci] + r
      const c = cells[ref]
      const span = c?.span || 1
      const isActive = ref === active
      tds.push(
        <td
          key={ref}
          colSpan={span}
          className={['cell', c?.cls, isActive && 'active', c?.onClick && 'clickable'].filter(Boolean).join(' ')}
          onMouseDown={() => setActive(ref)}
          onClick={c?.onClick}
        >
          {c?.input ? (
            <input
              ref={(el) => (inputRefs.current[ref] = el)}
              className="cell-input"
              type={c.input.type || 'text'}
              value={c.input.value}
              placeholder={c.input.placeholder}
              maxLength={c.input.maxLength}
              disabled={c.input.disabled}
              inputMode={c.input.inputMode}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => c.input.onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') c.input.onEnter?.()
              }}
            />
          ) : (
            c?.v
          )}
          {isActive && <span className="handle" />}
        </td>,
      )
      ci += span - 1
    }
    rows.push(
      <tr key={r}>
        <th className={'rowh' + (r === activeRow ? ' sel' : '')}>{r}</th>
        {tds}
      </tr>,
    )
  }

  return (
    <div className="app">
      <div className="titlebar">
        <div className="tb-left">
          <span className="appicon" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#fff" opacity=".95" /><path d="M1 5.5h14M1 10h14M5.5 1v14M10 1v14" stroke="#1e7145" strokeWidth="1" /></svg>
          </span>
          <span className="autosave">자동 저장 <span className="toggle"><span /></span></span>
          <span className="qa">
            <Icon d="M3 2h8l2 2v10H3zM5 2v4h6V2M5 14v-4h6v4" />
            <Icon d="M4 7a4 4 0 117 3M4 4v3h3" />
            <Icon d="M12 7a4 4 0 10-7 3M12 4v3H9" />
          </span>
        </div>
        <div className="tb-title">{fileName} · 저장됨</div>
        <div className="tb-right">
          <span className="search"><Icon d="M7 3a4 4 0 110 8 4 4 0 010-8zM10 10l4 4" /> 검색</span>
          <span className="avatar">{(user || '사').slice(0, 1)}</span>
          <span className="win">—</span>
          <span className="win">▢</span>
          <span className="win close">✕</span>
        </div>
      </div>
      <Ribbon chat={chat} />
      <div className="formulabar">
        <div className="namebox">{active}</div>
        <div className="fx-icons">
          <span>✕</span>
          <span>✓</span>
          <span className="fx"><i>fx</i></span>
        </div>
        {editable ? (
          <input
            className="fx-input"
            value={spec.input.value}
            maxLength={spec.input.maxLength}
            onChange={(e) => spec.input.onChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && spec.input.onEnter?.()}
          />
        ) : (
          <div className="fx-input ro">{cellText(spec)}</div>
        )}
      </div>
      <div className="main-area">
      <div className="grid-wrap">
        <table className="grid">
          <colgroup>
            <col style={{ width: 40 }} />
            {WIDTHS.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="corner" />
              {COLS.map((c) => (
                <th key={c} className={'colh' + (c === activeCol ? ' sel' : '')}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
      {chat?.visible && <ChatPane chat={chat} />}
      </div>
      <div className="sheetbar">
        <span className="nav">◀</span>
        <span className="nav">▶</span>
        {sheets.map((s) => (
          <span key={s.id} className={'stab' + (sheet === s.id ? ' active' : '')} onClick={() => setSheet(s.id)}>
            {s.label}
          </span>
        ))}
        <span className="stab add">+</span>
      </div>
      <div className="statusbar">
        <span>{status}</span>
        <span className="sb-acc">접근성: 계속 진행 가능</span>
        <span className="sb-spacer" />
        <span className="sb-views">
          <Icon d="M2 3h12v10H2zM2 6h12M6 3v10" />
          <Icon d="M3 2h10v12H3z" />
          <Icon d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" />
        </span>
        <span className="zoom">— <span className="zbar"><span /></span> + 100%</span>
      </div>
    </div>
  )
}
