import { compileSourceString } from "../src/flite.ts";
import { test, expect } from "bun:test";

const semanticErrors = [
  [
    "Cannot redeclare a const",
    `const foo = 'bar'
  const foo = 'baz'`,
    /redeclare/i,
  ],
  ["Simple type mismatch", `const foo: number = 'bar'`, /mismatch/i],
  [
    "Assign unknown type reference",
    `type Foo = :Bar
const foo: Foo = Baz`,
    /unknown/i,
  ],
  [
    "Redeclare a type",
    `type Foo = string
type Foo = number`,
    /redeclare/i,
  ],
  [
    "Double up on data constructor names",
    `type Foo = :Bar | :Bar`,
    /redeclare/i,
  ],
  [
    "Type mistmatch with data constructor",
    `type Foo = :Bar
  const foo: string = Bar`,
    /mismatch/i,
  ],
  [
    "Inner scope doesn't bubble up",
    `const foo = () => { const bar = 3 }
console.log(bar)`,
    /unknown/i,
  ],
];

const semanticallyCorrect = [
  ["Simple type match", `const foo: number = 4`],
  [
    "Simple scope inheritance",
    `const multi = 4
const calc = (factor: number) => factor * multi`,
  ],
  //   [
  //     "Create an use a simple data constructor",
  //     `type Foo = :Bar
  // const foo: Foo = Bar`
  //   ]
];

test("Program must have a module dec", () => {
  expect(() => compileSourceString(`const foo = 'bar'`)).toThrow(/module/);
});

semanticErrors.forEach(([name, code, errorMatch]) => {
  test(name, () => {
    const source = ["module Analyzer.Test", code].join("\n");
    expect(() => compileSourceString(source)).toThrow(errorMatch);
  });
});

semanticallyCorrect.forEach(([name, code]) => {
  test(name, () => {
    const source = ["module Analyzer.Test", code].join("\n");
    expect(() => compileSourceString(source)).not.toThrow();
  });
});
