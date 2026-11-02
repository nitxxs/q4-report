// "매출현황" 시트: 보스키(Esc)용 위장 데이터
const REGIONS = ['서울', '경기', '인천', '강원', '충청', '호남', '영남', '제주']
const HEAD = ['지역', '10월 목표', '10월 실적', '달성률', '11월 목표', '11월 누적', '전년 동기', '증감률']
const COLS = 'ABCDEFGH'.split('')
const fmt = (n) => n.toLocaleString('ko-KR')

function seeded(i) {
  const x = Math.sin(i * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

export function bossCells(today) {
  const c = {}
  c.A1 = { v: '2026년 지역별 매출 현황', cls: 'title', span: 6 }
  c.A2 = { v: `단위: 천원 · 기준일 ${today} · 영업기획팀`, cls: 'muted', span: 6 }
  HEAD.forEach((h, i) => (c[COLS[i] + 4] = { v: h, cls: 'hdr center' }))

  const tot = [0, 0, 0, 0, 0]
  REGIONS.forEach((reg, ri) => {
    const r = 5 + ri
    const base = Math.round(80000 + seeded(ri) * 420000)
    const t10 = Math.round(base / 1000) * 1000
    const a10 = Math.round(t10 * (0.86 + seeded(ri + 20) * 0.24))
    const t11 = Math.round((t10 * 1.04) / 1000) * 1000
    const a11 = Math.round(t11 * (0.04 + seeded(ri + 40) * 0.06))
    const prev = Math.round(a10 * (0.85 + seeded(ri + 60) * 0.25))
    ;[t10, a10, t11, a11, prev].forEach((v, k) => (tot[k] += v))
    c['A' + r] = { v: reg }
    c['B' + r] = { v: fmt(t10), cls: 'num' }
    c['C' + r] = { v: fmt(a10), cls: 'num', f: `=SUMIFS(실적!$E:$E,실적!$B:$B,A${r},실적!$C:$C,10)` }
    c['D' + r] = { v: ((a10 / t10) * 100).toFixed(1) + '%', cls: 'num', f: `=C${r}/B${r}` }
    c['E' + r] = { v: fmt(t11), cls: 'num' }
    c['F' + r] = { v: fmt(a11), cls: 'num' }
    c['G' + r] = { v: fmt(prev), cls: 'num' }
    const g = ((a10 - prev) / prev) * 100
    c['H' + r] = { v: (g >= 0 ? '▲' : '▼') + Math.abs(g).toFixed(1) + '%', cls: 'num ' + (g >= 0 ? 'up' : 'down'), f: `=(C${r}-G${r})/G${r}` }
  })
  const r = 5 + REGIONS.length
  c['A' + r] = { v: '합계', cls: 'total' }
  c['B' + r] = { v: fmt(tot[0]), cls: 'num total', f: `=SUM(B5:B${r - 1})` }
  c['C' + r] = { v: fmt(tot[1]), cls: 'num total', f: `=SUM(C5:C${r - 1})` }
  c['D' + r] = { v: ((tot[1] / tot[0]) * 100).toFixed(1) + '%', cls: 'num total' }
  c['E' + r] = { v: fmt(tot[2]), cls: 'num total', f: `=SUM(E5:E${r - 1})` }
  c['F' + r] = { v: fmt(tot[3]), cls: 'num total', f: `=SUM(F5:F${r - 1})` }
  c['G' + r] = { v: fmt(tot[4]), cls: 'num total', f: `=SUM(G5:G${r - 1})` }
  const g = ((tot[1] - tot[4]) / tot[4]) * 100
  c['H' + r] = { v: (g >= 0 ? '▲' : '▼') + Math.abs(g).toFixed(1) + '%', cls: 'num total ' + (g >= 0 ? 'up' : 'down') }

  c['A' + (r + 2)] = { v: '※ 11월 누적은 11/1 마감 기준이며 일부 지역 실적은 미확정입니다.', cls: 'muted', span: 8 }
  return c
}
