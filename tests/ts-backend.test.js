import { compileSourceString } from "../src/flite.ts";
import { expect, test } from "bun:test";

const cases = [
  ["simple module declaration", `module Foo.Bar`, `/** module Foo.Bar */`],
];

const autoModuleCases = [
  ["simple opaque type", `type Foo = string`, `type Foo = string;`],
];

cases.forEach(([name, input, expected]) => {
  test.skip(name, () => {
    const result = compileSourceString(input, { checkTypes: false });
    expect(result).toBe(expected);
  });
});

autoModuleCases.forEach(([name, input, expected]) => {
  test.skip(name, () => {
    const result = compileSourceString(
      ["module Test.TsBackend", input].join("\n"),
      { checkTypes: false }
    );
    const moduleWithExpected = `/** module Test.TsBackend */\n${expected}`;
    expect(result).toBe(moduleWithExpected);
  });
});
