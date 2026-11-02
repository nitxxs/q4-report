import assert from 'node:assert/strict'
import { isValid, judge, evaluate, resultText, DIGITS } from '../src/game.js'

assert.equal(DIGITS, 4)
assert.equal(isValid('1234'), true)
assert.equal(isValid('0123'), true)
assert.equal(isValid('1123'), false)
assert.equal(isValid('123'), false)
assert.equal(isValid('12345'), false)
assert.equal(isValid('12a4'), false)

assert.deepEqual(judge('1234', '1234'), { s: 4, b: 0 })
assert.deepEqual(judge('1234', '4321'), { s: 0, b: 4 })
assert.deepEqual(judge('1234', '1243'), { s: 2, b: 2 })
assert.deepEqual(judge('1234', '5678'), { s: 0, b: 0 })
assert.deepEqual(judge('1023', '3021'), { s: 2, b: 2 })

assert.equal(resultText({ s: 0, b: 0 }), 'OUT')
assert.equal(resultText({ s: 4, b: 0 }), '완료')
assert.equal(resultText({ s: 1, b: 2 }), '1S 2B')

const r = (s) => ({ s, b: 0 })
assert.equal(evaluate([], []), null)
assert.equal(evaluate([r(1)], []), null)
assert.equal(evaluate([r(3)], [r(3)]), null) // 3S는 이제 정답 아님
assert.equal(evaluate([r(4)], []), null) // 후공 마지막 기회 대기
assert.equal(evaluate([r(4)], [r(1)]), 'first')
assert.equal(evaluate([r(4)], [r(4)]), 'draw')
assert.equal(evaluate([r(1)], [r(4)]), 'second')
assert.equal(evaluate([{ s: null }], []), null)
const nine = Array.from({ length: 9 }, () => r(1))
assert.equal(evaluate(nine, nine), 'draw')

console.log('game logic: all tests passed')
