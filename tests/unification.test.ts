import { test, expect } from "bun:test";
import { Constraint } from "../src/scope";
import { numberType, typeVar } from "./lib/astBuilders";
import { NodeType } from "../src/nodes";
import { unify } from "../src/analyze";

test("basic unification", () => {
  const constraints: Constraint[] = [[numberType(), typeVar("t0")]];

  const subs = unify(constraints);
  expect(subs.has(typeVar("t0"))).toBe(true);
  expect(subs.get(typeVar("t0"))).toMatchObject({
    type: NodeType.NativeType,
    kind: "number",
  });
});

test("unify multiple type variables", () => {
  const constraints: Constraint[] = [
    [typeVar("t0"), typeVar("t1")],
    [typeVar("t1"), numberType()],
    [numberType(), typeVar("t1")],
  ];
  const subs = unify(constraints);
  expect(subs.size).toBe(2);
});

test("unify with a function expression", () => {});
