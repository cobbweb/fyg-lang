import { test, expect } from "bun:test";
import { createScope, createSymbol } from "../src/scope";

test("cannot bind over an existing value symbol", () => {
  const scope = createScope();
  createSymbol("value", "myConst", scope);

  expect(() => createSymbol("value", "myConst", scope)).toThrow(/redeclare/i);
});

test("cannot bind over in a existing value from a parent scope", () => {
  const topScope = createScope();
  const childScope = createScope(topScope);

  createSymbol("value", "topConst", topScope);

  expect(() => createSymbol("value", "topConst", childScope)).toThrow(
    /redeclare/i
  );
});

test("cannot bind with the same name in sibling scopes", () => {
  const topScope = createScope();
  const leftScope = createScope(topScope);
  const rightScope = createScope(topScope);
  const constName = "myConst";

  createSymbol("value", constName, leftScope);

  expect(() => createSymbol("value", constName, rightScope)).not.toThrow();
  expect(leftScope.value).toHaveProperty(constName);
  expect(rightScope.value).toHaveProperty(constName);
});
