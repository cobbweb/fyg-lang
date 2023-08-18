import { NativeType, NodeType, Program, TypeExpression } from "./nodes";

export type Scope = {
  value: Record<string, Symbol<"value">>;
  children: Scope[];
  parent?: Scope;
  type: Record<string, Symbol<"type">>;
};

export type SymbolKinds = "value" | "type";

export type SymbolMap = {
  value: Symbol<"value">;
  type: Symbol<"type">;
};

export type Symbol<K extends SymbolKinds> = {
  kind: K;
  name: string;
  type?: TypeExpression;
  scope: Scope;
};

function createNativeTypeSymbol(
  name: NativeType["kind"],
  scope: Scope
): Symbol<"type"> {
  return {
    kind: "type",
    name: name,
    scope,
    type: { type: NodeType.NativeType, kind: name },
  };
}

export function createRootScope(): Scope {
  const rootScope = {
    parent: undefined,
    children: [],
    value: {},
    type: {},
  };
  rootScope.type = {
    string: createNativeTypeSymbol("string", rootScope),
    number: createNativeTypeSymbol("number", rootScope),
    boolean: createNativeTypeSymbol("boolean", rootScope),
  };
  return rootScope;
}

export function createScope(parent?: Scope): Scope {
  const scope: Scope = {
    children: [],
    parent,
    type: {},
    value: {},
  };

  if (parent) {
    parent.children.push(scope);
  }

  return scope;
}

export function createSymbol<K extends SymbolKinds>(
  kind: K,
  name: string,
  scope: Scope,
  type?: TypeExpression
): SymbolMap[K] {
  const exists = findSymbol(kind, name, scope);
  if (exists) {
    throw new Error(`Cannot redeclare ${kind} "${name}"`);
  }

  const symbol = {
    kind,
    name,
    type,
    scope,
  } as SymbolMap[K];

  scope[kind][name] = symbol;

  return symbol;
}

export function findSymbol<K extends SymbolKinds>(
  kind: K,
  name: string,
  scope: Scope
): SymbolMap[K] | undefined {
  if (name in scope[kind]) {
    return scope[kind][name] as SymbolMap[K];
  }

  if (scope.parent) {
    return findSymbol(kind, name, scope.parent);
  }

  return undefined;
}
