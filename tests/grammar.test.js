import assertValidCode from "./lib/toBeValidCode.js";
import { match } from "../src/parser.js";

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
  ["destructure an array", `const [one, two,] = [1, 2,]`],
  ["destructure an object", `const { name, email } = user`],

  /**
   * Quote strings
   */
  ["empty quote string", `''`],
  ["simple quote string", `'hello flite!'`],
  ["quote string with escape sequence", `'one \\n two'`],
  ["quote string with emoji", `'Mood: 😁'`],
  ["quote string with espaced quote", `'Andrew\\'s'`],

  /**
   * Template strings
   */
  ["empty template string", "``"],
  ["simple template string", "`hello Flite!`"],
  [
    "multiline template string",
    `\`one
  two\``,
  ],
  ["template string with template expression", "`Hello ${name}!`"],
  ["template string with emoji", "`Flite is lit 🔥`"],
  [
    "template with multiple expressions",
    "`Hello ${name}, you are ${attribute} today!`",
  ],

  /**
   * Booleans
   */
  ["true", `true`],
  ["false", `false`],

  /**
   * If/Else expressions
   */
  // ["if/else with no blocks", `if (expr) trueBranch else falseBranch`],
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
  ["simple forward pipe", `'test' |> console.log()`],
  ["forward pipe with placeholder", `4 |> console.log('num: %d', @)`],
  ["forward pipe with multiple args", `'num: %d' |> console.log(10)`],
  ["backward pipe with multiple args", `console.log('num: %d') <| 10`],

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
  ["function call with with generic", `foo<Component>(bar, baz, test)`],
  [
    "multiline dot chaining",
    `foo
.bar 
.baz`,
  ],

  /**
   * Function expression
   */
  ["simple function expression", `() => {}`],
  ["function with one parameter", `(foo) => {}`],
  ["function with two parameters", `(foo, bar) => {}`],
  ["function with type annotations", `(user: User, name: string): User => {}`],
  [
    "function with multiline params",
    `const foo = (
  user: User,
  name: string
): User => {}`,
  ],
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
  [
    "function param type is union",
    `const baz = (
  foo: string | number,
  chez: Waz | Maz,
) => {}`,
  ],
  ["function with one param that has no parens", "x => x * x"],
  ["function with one rest params", "(...x: string[]) => x"],

  /**
   * Function type expressions
   */
  ["empty function type rexpression", `type Foo = () => {}`],

  /**
   * Async function expressions
   */
  ["basic async function", `async () => foo()`],
  [
    "regular async/await function",
    `async (url) => { await fetch(url).json() }`,
  ],

  /**
   * Abitrary block
   */
  ["arbitrary block", `{ const foo = 'bar' }`],

  /**
   * Array expression
   */
  ["empty array", `[]`],
  ["one element array", `[1]`],
  ["two element array", `[1,2]`],
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
   * Open statements
   */
  ["basic open", `open Core`],
  ["deep open", `open Core.Browser`],
  ["deeper open", `open Core.Browser.Fetch`],
  ["open and expose one", `open { Request } from Core.Browser.Fetch`],
  [
    "open and expose many",
    `open { Request, Response, fetch } from Core.Browser.Fetch`,
  ],
  ["open with expose alias", `open { Request as Req } from Core.Browser.Fetch`],

  /**
   * Import statements
   */
  ["flat import", "import `express`"],
  ["deeper flat import", "import `node:assert/strict`"],
  ["import one part", "import { Request } from `fetch`"],
  ["import many parts", "import { Request, Response, fetch } from `fetch/esm`"],
  ["import with alias", "import { Request as Req } from `express`"],
  ["default import", "import express from `express`"],
  ["aliased default import", "import express as exp from `express`"],
  ["star import", "import * as React from `react`"],

  /**
   * Module declaration
   */
  ["basic module", `module Foo`],
  ["deep module", `module Foo.Bar`],
  ["deeper module", `module Foo.Bar.Baz`],
  ["module with exporting", `module Foo.Bar exporting { fetch }`],
  [
    "module with multiple exports",
    `module Foo.Bar exporting { fetch, request, RequestError }`,
  ],
  [
    "module with aliased export",
    `module Fetch exporting { fetch as superfetch, RequestError }`,
  ],
  [
    "module with custom default export",
    `module Fetch exporting { fetch as default }`,
  ],

  /**
   * Object expression
   */
  ["const empty object", `const foo = {}`],
  ["single prop object", `({ foo: 'bar' })`],
  ["two props object", `({ foo: 1, bar: 2 })`],
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
  ["tuple type", `type Users = [string, User,]`],
  ["two dimensional array", `type Foo = string[][]`],
  ["object type with two generics", `type Foobar<T, Z> = { one: T, two: Z, }`],
  ["string literals as types", `type Foo = 'foo'`],
  ["numbers literals as types", `type Foo = 14`],
  [
    "multiline type object",
    `type User = {
    name: string,
    email: string,
    dateCreated: DateTime,
    points: number,
  }`,
  ],
  ["composite type", `type User = { name: string } & { email: string }`],
  ["composite type from identifiers", `type User = Named & WithEmail`],
  [
    "object with mapped types",
    `type Props = { [Prop in keyof Type]: boolean }`,
  ],
  ["basic template literal type", `type UserLang = \`en_\${Country}\``],
  ["conditional type", `type Foo = Dog extends Animal ? string : false`],
  ["aliased generic type", `type Foo = Animal<Dog>`],
  [
    "basic enum",
    `enum Either {
  Left,
  Right
}`,
  ],
  [
    "enum with generic",
    `enum Maybe<T> {
  Some<T>,
  None,
}`,
  ],
  [
    "enum with basic types",
    `enum MaybeString {
  Some<string>,
  None
}`,
  ],
  [
    "enum with object types",
    `enum User {
  Registered<{ username: string }>,
  Guest<{ name: string }>,
  Unknown,
}`,
  ],

  /**
   * Match expression
   */
  ["empty match", `match (x) {}`],
  [
    "simple match",
    `match (x) {
        Some<wow> -> wow
        None -> 'foo'
    }`,
  ],
  [
    "simple match with default",
    `match (x) {
      Some<wow> -> wow
      None -> 'foo'
      default -> 'bad'
    }`,
  ],
  [
    "complex match",
    `match (user) {
      ({ type: Role.Staff, }) -> 'Employee'
      ({ type: Role.Customer, company: 'Special Co', }) -> 'Special Customer'
      ({ type: Role.Customer, }) -> 'Normal customer'
      default -> { if (x) 'XXXX' else 'Unknown' }
    }`,
  ],

  /**
   * Composite
   */
  [
    "composite one",
    `
    const foo: string = 'hello'
    const makeGreet = name => \`Hello \${name}!\`
    Console.log(makeGreet('Flite'))`,

    "composite two",
    `
    type MobileOs = Android | Ios | Blackberry
    type Phone = { make: string; os: MobileOs }

    Console.log({ make: 'Samsung', os: MobileOs.Android })
    `,
  ],

  /**
   * JSX
   */
  ["basic JSX", `<h1>Hello Flite!</h1>`],
  ["JSX attributes", `<div className='font-semibold'>Semi bold</div>`],
  [
    "JSX with template string as attr value",
    "<div className=`font-${weight}`>Heavy</div>",
  ],
  ["Self-closing JSX", `<img src='foo.png' />`],
  [
    "react compontent",
    `const counter = (startCount) => {
      const [count, setCount] = React.useState(startCount)
    }`,
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
  ["weird sequence", `foo () {}`],
  ["missing JSX closing tag", `<div>Foo`],
  [
    "incorrect script order",
    `import \`test\`
  open Foo
  module Test`,
  ],
];

validCode.forEach(([name, code]) => {
  test(name, () => {
    const result = match(code);
    expect(result.message).toBeUndefined();
  });
});

invalidCode.forEach(([name, code]) => {
  test(name, () => {
    const result = match(code);
    expect(result.message).toBeDefined();
  });
});
