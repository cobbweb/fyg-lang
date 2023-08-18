import { test, expect } from "bun:test";
import { addModule, globalScope } from "../src/modules";
import { NodeType } from "../src/nodes";

test("Global scope exists", () => {
  expect(globalScope).toHaveProperty("modules");
});

test("Can add a module to global scope", () => {
  const program = { type: NodeType.Program };
  expect(globalScope.modules).toEqual({});
  addModule("Foo.Bar", program);
  expect(globalScope.modules).toEqual({ "Foo.Bar": program });
});
