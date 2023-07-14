import { assert, assertThrows } from "testing/asserts.ts";
import assertValidCode from "./lib/toBeValidCode.js";

const validCode = {
  comments: [
    "// comment",
    `/**
      * Multiline comment
      */`,
  ],
  constAssignment: [
    "const foo = 'bar'",
    "const foo: string = 'bar'",
    "const user: User = 'andrew'",
    "const user: typeof SomeType = 'andrew'",
    "const posts: Return<typeof getPosts> = getPosts()",
  ],
  strings: [
    "'simple string'",
    "'string with escape \n sequence'",
    "`template string`",
    `\`multiline
    template
    string\``,
    `\` multine
    hello \${world}  \``,
  ],
  booleans: ["true", "false"],
  ifElse: ["if (1) true else false"],
  junctors: [
    "const test: boolean = true && false",
    "true || false",
    "false && false",
    "1 && `string`",
  ],
  instanceof: ["dog instanceof Animal"],
  additive: ["2 + 3", " 3 - 1 ", "3 + 9 + 1 - 10 + 2_123"],
  exponentiation: [" 12 ** 2"],
  arbitraryBlock: ["{ const foo: string = 'bar' }"],
  arrayDeclaration: [
    "[]",
    "[1,2,3,]",
    "['foo', 'bar',]",
    "[name,]",
    "[1,2,3,...name,]",
  ],
  objectDeclaration: [
    "{}",
    "({ foo: 'bar', })",
    "({ bar: 'baz', num: 2, })",
    "({ ['test']: 'yes', 3: 'bar', [name || fallback]: 'check', })",
  ],
  objectTypeDeclaration: [
    `type Pokemon = { id: number, name: string, }`,
    `type Option<T> = Some(T) | None`,
    `type Tuple = [string, Pokemeon,]`,
  ],
};

const invalidCode = {
  badVarOrLet: ["let foo = 'string'", "var foo: string = 'baz'"],
  invalidStrings: ["' test ''", String.raw`' test \'`],
};

const test = Deno.test;

Object.entries(validCode).forEach(([name, codes]) => {
  codes.forEach((code) => {
    Deno.test(`${name} --> ${code} should be valid code`, () =>
      assertValidCode(code)
    );
  });
});

Object.entries(invalidCode).forEach(([name, codes]) => {
  codes.forEach((code) => {
    test(`${name} -> ${code} should be invalid code`, () => {
      assertThrows(() => assertValidCode(code));
    });
  });
});
