import {
  InferenceRequired,
  NativeType,
  NodeType,
  TypeExpression,
} from "./nodes";
import { dumpNode } from "./ast";

export type ConstraintType = TypeExpression;
export type Constraint = [ConstraintType, ConstraintType];
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
  type: TypeExpression;
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
  const name = findAvailableName();
  const typeExpr = {
    type: NodeType.InferenceRequired,
    name,
  } as InferenceRequired;
  createTypeSymbol(name, scope, typeExpr);
  return typeExpr;
}

// hold the next type variable name that's free
let nameIds = {
  t: 0,
  fn: 0,
};
export const findAvailableName = (prefix: "t" | "fn" = "t"): string => {
  const name = `${prefix}${nameIds[prefix]}`;
  nameIds[prefix] += 1;
  return name;
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

export function updateTypeSymbol(
  name: string,
  typeExpression: TypeExpression,
  scope: Scope
) {
  const typeSymbol = findTypeSymbol(name, scope);
  if (!typeSymbol)
    throw new Error(`Could not update undefined type symbol called ${name}`);

  typeSymbol.type = typeExpression;
}

export function dumpScope(scope: Scope | Scope[]): object {
  if (Array.isArray(scope)) {
    return scope.map((s) => dumpScope(s));
  }

  const valueEntries = Object.entries(scope.value).map(
    ([name, valueSymbol]) => {
      return [
        name,
        {
          name: valueSymbol.name,
          type: dumpNode(valueSymbol.type),
          scope: "[omitted]",
        },
      ];
    }
  );

  const typeEntries = Object.entries(scope.type).map(([name, typeSymbol]) => {
    return [
      name,
      {
        name: typeSymbol.name,
        type: dumpNode(typeSymbol.type),
        scope: "[omitted]",
      },
    ];
  });

  return {
    parent: scope.parent ? "[omitted]" : "[]",
    value: Object.fromEntries(valueEntries),
    type: Object.fromEntries(typeEntries),
    constraints: scope.constraints.map(([left, right]) => {
      return [dumpNode(left), dumpNode(right)];
    }),
    children: scope.children.map((cs) => dumpScope(cs)),
  };
}
