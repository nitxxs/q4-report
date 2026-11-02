import assert from 'node:assert/strict'
import { isValid, judge, evaluate, resultText } from '../src/game.js'

assert.equal(isValid('123'), true)
assert.equal(isValid('012'), true)
assert.equal(isValid('112'), false)
assert.equal(isValid('12'), false)
assert.equal(isValid('12a'), false)

assert.deepEqual(judge('123', '123'), { s: 3, b: 0 })
assert.deepEqual(judge('123', '321'), { s: 1, b: 2 })
assert.deepEqual(judge('123', '456'), { s: 0, b: 0 })
assert.deepEqual(judge('102', '201'), { s: 1, b: 2 })

assert.equal(resultText({ s: 0, b: 0 }), 'OUT')
assert.equal(resultText({ s: 3, b: 0 }), '완료')
assert.equal(resultText({ s: 1, b: 1 }), '1S 1B')

const r = (s) => ({ s, b: 0 })
// 진행 중
assert.equal(evaluate([], []), null)
assert.equal(evaluate([r(1)], []), null)
// 선공 3S → 후공 마지막 기회 대기
assert.equal(evaluate([r(3)], []), null)
assert.equal(evaluate([r(3)], [r(1)]), 'first')
assert.equal(evaluate([r(3)], [r(3)]), 'draw')
// 후공 3S
assert.equal(evaluate([r(1)], [r(3)]), 'second')
assert.equal(evaluate([r(1), r(2)], [r(0), r(3)]), 'second')
// 결과 대기(null s) 는 진행 중
assert.equal(evaluate([{ s: null }], []), null)
// 9회 모두 실패 → 무승부
const nine = Array.from({ length: 9 }, () => r(1))
assert.equal(evaluate(nine, nine), 'draw')
assert.equal(evaluate(nine, nine.slice(0, 8)), null)

console.log('game logic: all tests passed')
