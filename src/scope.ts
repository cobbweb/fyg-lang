import {
  Identifier,
  InferenceRequired,
  NativeType,
  NodeType,
  TypeExpression,
} from "./nodes";

export type TypeVar = string;
export type Constraint = [TypeVar, TypeVar];
export type Constraints = Constraint[];

export type Scope = {
  value: Record<string, ValueSymbol>;
  children: Scope[];
  parent?: Scope;
  type: Record<string, TypeSymbol>;
  constraints: Constraints;
};

export type SymbolMap = {
  value: ValueSymbol;
  type: ValueSymbol;
};

export type ValueSymbol = {
  name: string;
  type?: TypeExpression;
  scope: Scope;
};

export type TypeSymbol = {
  name: string;
  type: TypeExpression;
  scope: Scope;
};

function createNativeTypeSymbol(
  name: NativeType["kind"],
  scope: Scope
): TypeSymbol {
  return {
    name: name,
    scope,
    type: { type: NodeType.NativeType, kind: name },
  };
}

export function createRootScope(): Scope {
  const rootScope: Scope = {
    parent: undefined,
    children: [],
    value: {},
    type: {},
    constraints: [],
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
    constraints: [],
  };

  if (parent) {
    parent.children.push(scope);
  }

  return scope;
}

export function createValueSymbol(
  name: string,
  scope: Scope,
  type: TypeExpression
): ValueSymbol {
  const exists = findValueSymbol(name, scope);
  if (exists) {
    throw new Error(`Cannot redeclare variable "${name}"`);
  }

  const symbol: ValueSymbol = {
    name,
    type,
    scope,
  };

  scope.value[name] = symbol;

  return symbol;
}

export function createTypeVariable(scope: Scope): InferenceRequired {
  const name = findAvailableName(0, scope);
  createTypeSymbol(name, scope);
  return { type: NodeType.InferenceRequired, name };
}

const findAvailableName = (num: number, scope: Scope): string => {
  const name = `t${num}`;
  const result = findTypeSymbol(name, scope);
  return result ? findAvailableName(num + 1, scope) : name;
};

export function createTypeSymbol(
  name: string,
  scope: Scope,
  type?: TypeExpression
): TypeSymbol {
  const exists = findTypeSymbol(name, scope);
  if (exists) {
    throw new Error(`Cannot redeclare variable "${name}"`);
  }

  const symbol = {
    name,
    type,
    scope,
  } as TypeSymbol;

  scope.type[name] = symbol;

  return symbol;
}

export function findValueSymbol(
  name: string,
  scope: Scope
): ValueSymbol | undefined {
  if (name in scope.value) {
    return scope.value[name] as ValueSymbol;
  }

  if (scope.parent) {
    return findValueSymbol(name, scope.parent);
  }

  return undefined;
}

export function findTypeSymbol(
  name: string,
  scope: Scope
): TypeSymbol | undefined {
  if (name in scope.type) {
    return scope.type[name] as TypeSymbol;
  }

  if (scope.parent) {
    return findTypeSymbol(name, scope.parent);
  }

  return undefined;
}
