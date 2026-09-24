import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { questions } from '../src/questions.js';

test('50 unique questions have valid choices and verified JavaScript output', async () => {
  assert.equal(questions.length, 50);
  assert.equal(new Set(questions.map(q => q.id)).size, 50);
  assert.equal(new Set(questions.map(q => q.code)).size, 50);
  for (const q of questions) {
    assert.ok(q.topic && q.explanation);
    assert.ok(q.options.length >= 3 && q.options.length <= 4);
    assert.equal(new Set(q.options).size, q.options.length);
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length);
    const logs = [], timers = [];
    vm.runInNewContext(q.code, {
      console: { log: (...args) => logs.push(args.map(String).join(' ')) },
      setTimeout: callback => timers.push(callback)
    }, { timeout: 1000, microtaskMode: 'afterEvaluate' });
    await new Promise(setImmediate);
    for (const callback of timers) callback();
    await new Promise(setImmediate);
    assert.equal(logs.join(' '), q.options[q.answer].replaceAll(' then ', ' '), q.id);
  }
});

test('independent random draws use the full bank and may repeat', () => {
  const randomDraw = () => questions[Math.floor(Math.random() * questions.length)];
  const draws = Array.from({ length: 1000 }, randomDraw);
  assert.ok(draws.every(question => questions.includes(question)));
  assert.ok(new Set(draws.map(question => question.id)).size > 40);
  assert.ok(new Set(draws.map(question => question.id)).size < draws.length, 'independent draws permit repeats');
});
