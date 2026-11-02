export const MAX_INNINGS = 9
export const DIGITS = 4 // 자릿수 (3으로 바꾸면 3자리 게임)

export function isValid(s) {
  return new RegExp(`^\\d{${DIGITS}}$`).test(s) && new Set(s).size === DIGITS
}

export function judge(secret, guess) {
  let s = 0
  let b = 0
  for (let i = 0; i < DIGITS; i++) {
    if (guess[i] === secret[i]) s++
    else if (secret.includes(guess[i])) b++
  }
  return { s, b }
}

export function resultText(r) {
  if (!r || r.s == null) return '집계중'
  if (r.s === DIGITS) return '완료'
  if (r.s === 0 && r.b === 0) return 'OUT'
  return `${r.s}S ${r.b}B`
}

/**
 * 이닝제 판정. first = 초(선공), second = 말(후공).
 * 선공이 정답(전부 S)을 내도 같은 이닝 말에 후공에게 마지막 기회를 줍니다.
 * 반환: null(진행 중) | 'first' | 'second' | 'draw'
 */
export function evaluate(firstList, secondList) {
  for (let i = 0; i < MAX_INNINGS; i++) {
    const f = firstList[i]
    const sc = secondList[i]
    if (!f || f.s == null) return null
    if (f.s === DIGITS) {
      if (!sc || sc.s == null) return null
      return sc.s === DIGITS ? 'draw' : 'first'
    }
    if (!sc || sc.s == null) return null
    if (sc.s === DIGITS) return 'second'
  }
  return 'draw'
}
