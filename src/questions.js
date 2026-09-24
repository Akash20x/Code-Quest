const definitions = [
  {
    name: 'The Syntax Garden',
    description: 'Follow the garden paths, solve code coins, and find the gate.',
    color: 0x54dfb4,
    accent: '#54dfb4',
    sky: 0x9bcae1,
    grass: 0x578a50,
    path: 0xcab898,
    pathEdge: 0x978c77,
    hedge: 0x315d3d,
    hedgeTop: 0x458151,
    tree: 0x427744,
    questions: [
      { topic: 'Variables', code: 'let score = 5;\nscore += 3;\nconsole.log(score);', options: ['5', '8', '53', 'undefined'], answer: 1, explanation: 'The += operator adds 3 to the current value of score.' },
      { topic: 'Types', code: 'console.log(typeof "42");', options: ['number', 'string', 'object', 'undefined'], answer: 1, explanation: 'Quotes make 42 a string, even though it looks like a number.' },
      { topic: 'Coercion', code: 'console.log("5" + 2);', options: ['7', '52', 'NaN', 'undefined'], answer: 1, explanation: 'With a string on either side, + joins the values as text.' },
      { topic: 'Arrays', code: 'const gems = ["red", "blue"];\nconsole.log(gems.length);', options: ['1', '2', '3', 'undefined'], answer: 1, explanation: 'The array contains two items, so its length is 2.' },
      { topic: 'Comparisons', code: 'console.log(3 === "3");', options: ['true', 'false', '3', 'TypeError'], answer: 1, explanation: 'Strict equality compares both value and type.' },
      { topic: 'Objects', code: 'const player = { hp: 10 };\nconsole.log(player.hp);', options: ['hp', '10', 'undefined', 'null'], answer: 1, explanation: 'Dot notation reads the hp property from player.' },
      { topic: 'Functions', code: 'function double(n) { return n * 2; }\nconsole.log(double(4));', options: ['4', '6', '8', 'undefined'], answer: 2, explanation: 'double(4) returns 4 multiplied by 2.' },
      { topic: 'Output trap', code: 'console.log(Boolean("false"));', options: ['false', 'true', 'undefined', 'NaN'], answer: 1, explanation: 'Any nonempty string is truthy, including the text "false".' }
    ]
  },
  {
    name: 'The Logic House',
    description: 'Search rooms and corridors inside a mysterious house.',
    color: 0xbf77ff,
    accent: '#bf77ff',
    sky: 0x9e91bf,
    grass: 0x5d765c,
    path: 0xb8a8a5,
    pathEdge: 0x827b86,
    hedge: 0x385d51,
    hedgeTop: 0x567b68,
    tree: 0x516f65,
    questions: [
      { topic: 'Arrays', code: 'const nums = [1, 2, 3];\nconsole.log(nums[1]);', options: ['1', '2', '3', 'undefined'], answer: 1, explanation: 'Array positions start at 0, so index 1 contains 2.' },
      { topic: 'Objects', code: 'const item = { value: 7 };\nitem.value = 9;\nconsole.log(item.value);', options: ['7', '9', 'undefined', 'TypeError'], answer: 1, explanation: 'The object can be changed even though item was declared with const.' },
      { topic: 'Scope', code: 'let x = 1;\n{ let x = 2; }\nconsole.log(x);', options: ['1', '2', 'undefined', 'ReferenceError'], answer: 0, explanation: 'The inner x belongs only to the block; the outer x stays 1.' },
      { topic: 'Functions', code: 'const add = (a, b = 2) => a + b;\nconsole.log(add(3));', options: ['2', '3', '5', 'NaN'], answer: 2, explanation: 'The missing second argument uses its default value of 2.' },
      { topic: 'Coercion', code: 'console.log("5" - 2);', options: ['3', '52', 'NaN', 'undefined'], answer: 0, explanation: 'The - operator converts the string to a number before subtracting.' },
      { topic: 'Closures', code: 'function make() {\n  let n = 0;\n  return () => ++n;\n}\nconst next = make();\nnext();\nconsole.log(next());', options: ['0', '1', '2', 'undefined'], answer: 2, explanation: 'The returned function remembers n and increments it on both calls.' },
      { topic: 'Output trap', code: 'console.log([1, 2] + [3, 4]);', options: ['[1, 2, 3, 4]', '1,23,4', '10', 'TypeError'], answer: 1, explanation: 'Both arrays become strings, then + joins them.' },
      { topic: 'Truthiness', code: 'console.log([] == false);', options: ['true', 'false', '[]', 'TypeError'], answer: 0, explanation: 'Loose equality converts the empty array and false to numeric zero.' }
    ]
  },
  {
    name: 'The Async City',
    description: 'Navigate city roads and solve the event loop at dusk.',
    color: 0xffba5c,
    accent: '#ffba5c',
    sky: 0xd9a376,
    grass: 0x817e4b,
    path: 0xd0b38a,
    pathEdge: 0x9b8467,
    hedge: 0x565f36,
    hedgeTop: 0x78854a,
    tree: 0x777543,
    questions: [
      { topic: 'Promises', code: 'Promise.resolve(4).then(n =>\n  console.log(n * 2)\n);', options: ['4', '8', 'undefined', 'Promise'], answer: 1, explanation: 'The resolved value 4 is passed to the callback, which logs 8.' },
      { topic: 'Event loop', code: 'console.log("A");\nPromise.resolve().then(() => console.log("B"));\nconsole.log("C");', options: ['A B C', 'A C B', 'B A C', 'C B A'], answer: 1, explanation: 'Synchronous logs run first; the promise callback runs afterward.' },
      { topic: 'Async/await', code: 'async function get() { return 5; }\nget().then(console.log);', options: ['5', 'Promise', 'undefined', 'TypeError'], answer: 0, explanation: 'An async function returns a promise that resolves to 5.' },
      { topic: 'Closures', code: 'let n = 10;\nconst read = () => n;\nn = 12;\nconsole.log(read());', options: ['10', '12', 'undefined', 'ReferenceError'], answer: 1, explanation: 'The closure reads the current value of n when called.' },
      { topic: 'Output trap', code: 'console.log(null ?? "fallback");', options: ['null', 'fallback', 'false', 'undefined'], answer: 1, explanation: 'Nullish coalescing uses the right side when the left side is null or undefined.' },
      { topic: 'Promise chain', code: 'Promise.resolve(2)\n  .then(n => n + 3)\n  .then(console.log);', options: ['2', '3', '5', 'undefined'], answer: 2, explanation: 'The first callback returns 5, which reaches the next callback.' },
      { topic: 'Async/await', code: 'async function run() {\n  const n = await Promise.resolve(3);\n  console.log(n + 1);\n}\nrun();', options: ['3', '4', 'Promise', 'undefined'], answer: 1, explanation: 'await unwraps the resolved value 3, then the function logs 4.' },
      { topic: 'Event loop', code: 'setTimeout(() => console.log("later"), 0);\nconsole.log("now");', options: ['later then now', 'now then later', 'now only', 'later only'], answer: 1, explanation: 'The timer callback runs after the current synchronous code finishes.' }
    ]
  }
];

export const POINTS_PER_ANSWER = 10;
export const LEVEL_TARGET = 30;

export const levels = definitions.map(({ questions, ...theme }) => theme);

const additionalQuestions = [
  { topic: 'Types', code: 'console.log(typeof null);', options: ['null', 'undefined', 'object', 'number'], answer: 2, explanation: 'typeof null returns object, a long-standing JavaScript quirk.' },
  { topic: 'Numbers', code: 'console.log(Number.isNaN(NaN));', options: ['true', 'false', 'NaN', 'undefined'], answer: 0, explanation: 'Number.isNaN detects the special numeric value NaN.' },
  { topic: 'Strings', code: 'console.log("JavaScript".slice(0, 4));', options: ['Script', 'Java', 'JavaS', 'java'], answer: 1, explanation: 'slice includes index 0 and stops before index 4.' },
  { topic: 'Arrays', code: 'console.log([1, 2, 3].map(n => n * 2).join(","));', options: ['1,2,3', '2,3,4', '6', '2,4,6'], answer: 3, explanation: 'map doubles every element; join produces the comma-separated string.' },
  { topic: 'Arrays', code: 'console.log([1, 2, 3, 4].filter(n => n > 2).length);', options: ['4', '3', '2', '1'], answer: 2, explanation: 'Only 3 and 4 pass the filter, leaving two elements.' },
  { topic: 'Arrays', code: 'console.log([1, 2, 3].reduce((sum, n) => sum + n, 0));', options: ['6', '123', '3', '0'], answer: 0, explanation: 'reduce accumulates 0 + 1 + 2 + 3.' },
  { topic: 'Mutation', code: 'const a = [1, 2];\nconsole.log(a.push(3));', options: ['3', '1,2,3', '2', 'undefined'], answer: 0, explanation: 'push mutates the array and returns its new length.' },
  { topic: 'Arrays', code: 'console.log([10, 20, 30, 40].slice(1, 3).join("-"));', options: ['10-20', '20-30-40', '20-30', '30-40'], answer: 2, explanation: 'slice copies index 1 through index 2, excluding index 3.' },
  { topic: 'Objects', code: 'console.log(Object.keys({ a: 1, b: 2 }).length);', options: ['1', '2', '3', 'undefined'], answer: 1, explanation: 'The object has two own enumerable string keys.' },
  { topic: 'Destructuring', code: 'const { x = 7 } = {};\nconsole.log(x);', options: ['undefined', 'null', '0', '7'], answer: 3, explanation: 'The absent property is undefined, so the default value is used.' },
  { topic: 'Spread', code: 'const a = [1, 2];\nconst b = [...a, 3];\nconsole.log(a.length, b.length);', options: ['3 3', '2 2', '2 3', '3 2'], answer: 2, explanation: 'Spread creates a new array; the original still contains two elements.' },
  { topic: 'Optional chaining', code: 'const user = {};\nconsole.log(user.address?.city);', options: ['null', 'undefined', 'false', 'TypeError'], answer: 1, explanation: 'Optional chaining stops at the missing address and returns undefined.' },
  { topic: 'Default parameters', code: 'function f(n = 5) { return n; }\nconsole.log(f(0));', options: ['5', 'undefined', '0', 'null'], answer: 2, explanation: 'A default parameter replaces undefined, not zero.' },
  { topic: 'Rest parameters', code: 'function count(...items) { return items.length; }\nconsole.log(count("a", "b", "c"));', options: ['1', '2', '3', 'undefined'], answer: 2, explanation: 'Rest parameters collect the three arguments into an array.' },
  { topic: 'Scope', code: 'var n = 1;\n{ var n = 4; }\nconsole.log(n);', options: ['1', '4', 'undefined', 'ReferenceError'], answer: 1, explanation: 'var is not block-scoped; both declarations refer to the same variable.' },
  { topic: 'Hoisting', code: 'console.log(value);\nvar value = 8;', options: ['8', 'null', 'undefined', 'ReferenceError'], answer: 2, explanation: 'The var declaration is hoisted, but its assignment has not run.' },
  { topic: 'Closures', code: 'const reads = [];\nfor (let i = 0; i < 3; i++) reads.push(() => i);\nconsole.log(reads[0](), reads[2]());', options: ['3 3', '0 2', '0 3', '2 2'], answer: 1, explanation: 'Each loop iteration gets its own let binding.' },
  { topic: 'Closures', code: 'function counter() {\n  let n = 0;\n  return () => ++n;\n}\nconst a = counter();\nconst b = counter();\na();\nconsole.log(a(), b());', options: ['1 1', '2 2', '2 1', '3 4'], answer: 2, explanation: 'Each call to counter creates an independent captured variable.' },
  { topic: 'Promise errors', code: 'Promise.reject("oops")\n  .catch(() => "fixed")\n  .then(console.log);', options: ['oops', 'fixed', 'undefined', 'Unhandled rejection'], answer: 1, explanation: 'catch recovers by returning a value, so the next promise resolves to fixed.' },
  { topic: 'Promises', code: 'Promise.resolve(2)\n  .finally(() => 9)\n  .then(console.log);', options: ['9', 'undefined', '2', '11'], answer: 2, explanation: 'A normally completing finally callback preserves the original resolved value.' },
  { topic: 'Async/await', code: 'async function run() {\n  console.log("A");\n  await 0;\n  console.log("B");\n}\nrun();\nconsole.log("C");', options: ['A B C', 'C A B', 'A C B', 'B A C'], answer: 2, explanation: 'await suspends the async function; C is logged before the continuation logs B.' },
  { topic: 'References', code: 'console.log({ a: 1 } === { a: 1 });', options: ['true', 'false', 'undefined', 'TypeError'], answer: 1, explanation: 'These are distinct objects; strict equality compares their identities.' },
  { topic: 'Nullish coalescing', code: 'console.log(0 ?? 10);', options: ['10', 'null', 'undefined', '0'], answer: 3, explanation: 'Zero is neither null nor undefined, so it is preserved.' },
  { topic: 'Logical operators', code: 'console.log("" || "guest");', options: ['guest', 'true', 'false', 'undefined'], answer: 0, explanation: 'An empty string is falsy, so OR returns the second operand.' },
  { topic: 'Conditional expressions', code: 'const n = 4;\nconsole.log(n % 2 === 0 ? "even" : "odd");', options: ['odd', 'true', 'even', '4'], answer: 2, explanation: '4 has remainder 0 when divided by 2, selecting the first branch.' },
  { topic: 'Template strings', code: 'const n = 3;\nconsole.log(`Total: ${n + 2}`);', options: ['Total: 32', 'Total: 5', 'Total: n + 2', '5'], answer: 1, explanation: 'The interpolation evaluates n + 2 before converting it to text.' }
];

export const questions = [...definitions.flatMap(level => level.questions), ...additionalQuestions].map((question, index) => {
  const options = [...question.options];
  const answer = index % options.length;
  while (options.indexOf(question.options[question.answer]) !== answer) options.push(options.shift());
  return { ...question, id: `js-${String(index + 1).padStart(2, '0')}`, options, answer };
});
