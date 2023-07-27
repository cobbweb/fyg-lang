import { assertEquals } from "testing/asserts.ts";
import { compileSourceString } from "../src/flitescript.ts";

const cases = [
  ["simple opaque type", `type Foo = string`, `type Foo = string;`],
  ["simple module declaration", `module Foo.Bar`, `/** module Foo.Bar */`],
];

cases.forEach(([name, input, expected]) => {
  Deno.test(name, () => {
    const result = compileSourceString(input);
    assertEquals(
      result,
      expected,
      `compile output doesn't match for: ${input}`,
    );
  });
});
