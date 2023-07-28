import { assertThrows } from "testing/asserts.ts";
import { compile, compileSourceString } from "../src/flitescript.ts";

const semanticErrors = [
  [
    "Cannot redeclare a const",
    `const foo = 'bar'
  const foo = 'baz'`,
    /redeclare/i,
  ],
];

Deno.test("Program must have a module dec", () => {
  assertThrows(compileSourceString(`const foo = 'bar'`));
});

semanticErrors.forEach(([name, code, regex]) => {
  console.log(compileSourceString(code));
  Deno.test(name, () => {
    assertThrows(() =>
      compileSourceString(["module Analyzer.Test", code].join("\n"))
    );
  });
});
