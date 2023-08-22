import { test, expect } from "bun:test";
import { createScope, createValueSymbol } from "../src/scope";

test("cannot bind over an existing value symbol", () => {
  const scope = createScope();
  createValueSymbol("myConst", scope);

  expect(() => createValueSymbol("myConst", scope)).toThrow(/redeclare/i);
});

test("cannot bind over in a existing value from a parent scope", () => {
  const topScope = createScope();
  const childScope = createScope(topScope);

  createValueSymbol("topConst", topScope);

  expect(() => createValueSymbol("topConst", childScope)).toThrow(/redeclare/i);
});

test("cannot bind with the same name in sibling scopes", () => {
  const topScope = createScope();
  const leftScope = createScope(topScope);
  const rightScope = createScope(topScope);
  const constName = "myConst";

  createValueSymbol(constName, leftScope);

  expect(() => createValueSymbol(constName, rightScope)).not.toThrow();
  expect(leftScope.value).toHaveProperty(constName);
  expect(rightScope.value).toHaveProperty(constName);
});
