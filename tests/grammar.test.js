import { assertThrows } from "testing/asserts.ts";
import assertValidCode from "./lib/toBeValidCode.js";

/**
 * @type array<[string, string]>
 */
const validCode = [
  /**
   * Comments
   */
  ["single line comment", `// comment`],
  [
    "multi line comment",
    `/**
    * Yay!
    */`,
  ],

  /**
   * Numbers
   */
  ["zero", `0`],
  ["basic number", `12`],
  ["long number", `123456789543545681384135445791235`],
  ["underscore as arbitrary separator", `1_234_456`],

  /**
   * Const declarations
   */
  ["basic string const with no type annotation", `const foo = 'bar'`],
  ["basic string const with type annotation", `const foo: string = 'bar'`],
  [
    "basic identifier const with user type annotation",
    `const user: User = george`,
  ],
  [
    "const with typeof type annotation",
    `const email: typeof Email = 'foo@bar.com'`,
  ],

  /**
   * Quote strings
   */
  ["empty quote string", `''`],
  ["simple quote string", `'hello flitescript!'`],
  ["quote string with escape sequence", `'one \\n two'`],
  ["quote string with emoji", `'Mood: 😁'`],
  ["quote string with espaced quote", `'Andrew\\'s'`],

  /**
   * Template strings
   */
  ["empty template string", "``"],
  ["simple template string", "`hello FliteScript!`"],
  [
    "multiline template string",
    `\`one
  two\``,
  ],
  ["template string with template expression", "`Hello ${name}!`"],
  ["template string with emoji", "`FliteScript is lit 🔥`"],

  /**
   * Booleans
   */
  ["true", `true`],
  ["false", `false`],

  /**
   * If/Else expressions
   */
  ["if/else with no blocks", `if (expr) trueBranch else falseBranch`],
  ["if/else with blocks", `if (expr) { trueBranch } else { falseBranch }`],

  /**
   * Binary operations
   */
  ["logical or", `true || false`],
  ["logical and", `true && false`],
  ["addition", `1 + 2`],
  ["subtraction", `10 - 3`],
  ["multiplication", `9 * 9`],
  ["division", `70 / 7`],
  ["exponentiation", "10 ** 2"],
  ["option coalesce", "someString ?? 'empty'"],
  ["composite binary operations", `5 * (7 + 2) >= 3_123 / 12`],

  /**
   * Unary operations
   */
  ["negitive number", `-2`],
  ["positive number", `+2`],
  ["typeof operator", `typeof foo`],
  ["not operator", `!true`],

  /**
   * Call expressions
   */
  ["basic function call", `foo()`],
  ["namespaced function call", `foo.bar()`],
  ["function call with one arg", `foo(bar)`],
  ["function call with many args", `foo(bar, baz, test)`],

  /**
   * Function expression
   */
  ["simple function expression", `() => {}`],
  ["function with one parameter", `(foo) => {}`],
  ["function with two parameters", `(foo, bar) => {}`],
  ["function with type annotations", `(user: User, name: string): User => {}`],
  ["function in a const", `const fn = (x) => {}`],
  ["function with singleline body", `const fn = (x) => x * x`],
  ["function with singleline bracket body", `const fn = (x) => { x * x }`],
  [
    "function with singleline body on next line",
    `const fn = (x) =>
    x * x`,
  ],
  [
    "function with multine body",
    `const foo = (x) => {
      const y = x * 2
      (z) => z * y
    }`,
  ],
  ["function with one param that has no parens", "x => x * x"],
  ["function with one rest params", "(...x: string[]) => x"],

  /**
   * Async function expressions
   */
  ["basic async function", `async () => foo()`],
  ["regular async function", `async (url) => { await fetch(url).json() }`],

  /**
   * Abitrary block
   */
  ["arbitrary block", `{ const foo: string = 'bar' }`],

  /**
   * Array expression
   */
  ["empty array", `[]`],
  ["one element array", `[1,]`],
  ["two element array", `[1,2,]`],
  [
    "multiline array",
    `[
    1,
    2,
    3,
  ]`,
  ],
  ["array of straings", `['one', 'two', 'three',]`],

  /**
   * Await expression
   */
  ["basic await", `await foo()`],
  ["nested await", `await (await foo())`],

  /**
   * Object expression
   */
  ["const empty object", `const foo = {}`],
  ["single prop object", `({ foo: 'bar', })`],
  ["two props object", `({ foo: 1, bar: 2, })`],
  [
    "computed key in object",
    `({ [name]: true, 'test': 3, [name ?? 'name']: user, })`,
  ],
  ["object clone via spread", `({ ...user, })`],
  [
    "object with props and spreads",
    `({ [name]: true, 3: 'test', ...var, ...{ foo: 'bar', }, })`,
  ],
  ["nested objects", `({ top: { child: true, }, })`],

  /**
   * Custom type declarations
   */
  ["object type", `type User = { name: string, email: string, }`],
  ["opaque native type", `type Email = string`],
  ["simple variant type", `type Either = Left | Right`],
  ["tuple type", `type Users = [string, User,]`],
  ["variant with generic", `type Option<T> = Some(T) | None`],
  ["two dimensional array", `type Foo = string[][]`],
  ["object type with two generics", `type Foobar<T, Z> = { one: T, two: Z, }`],

  /**
   * Composite
   */
  [
    "composite one",
    `const foo: string = 'hello'
  const makeGreet = name => \`Hello \${name}!\`
  Console.log(makeGreet('FliteScript'))`,
  ],
];

const invalidCode = [
  ["let is not a keyword", `let foo = 'bar'`],
  ["broken quote string", `'''`],
  ["broken template string", "`Andrew`s`"],
  ["broken arrow dec", "() => {"],
  ["broken array type annotation", `const foo: string[ = ['bar']`],
  ["double const", `const one = 1 const two = 2`],
  ["numbers aren't identifiers", `const 2 = 'bar'`],
  ["if condition needs parens", `if true { 1 } else { 0 }`],
  ["double async", `await await foo()`],
];

validCode.forEach(([name, code]) => {
  Deno.test(name, () => assertValidCode(code));
});

invalidCode.forEach(([name, code]) => {
  Deno.test(name, () => assertThrows(() => assertValidCode(code)));
});
