import exp from "constants";
import { dumpNode } from "./ast.ts";
import {
  Expression,
  FunctionType,
  LiteralType,
  NativeType,
  Node,
  NodeType,
  Parameter,
  Program,
  TypeAnnotation,
  TypeExpression,
} from "./nodes.ts";

type RootScope = {
  modules: Record<string, Program>;
  type: Record<string, RootSymbol<"type">>;
};

type Scope = {
  value: Record<string, Symbol<"value">>;
  children: Scope[];
  parent?: Scope;
  rootScope: RootScope;
  type: Record<string, Symbol<"type">>;
};

type SymbolKinds = "value" | "type";

type SymbolMap = {
  value: Symbol<"value">;
  type: Symbol<"type">;
};

type RootSymbol<K extends SymbolKinds> = {
  kind: K;
  name: string;
  type: TypeExpression;
};

type Symbol<K extends SymbolKinds> = {
  kind: K;
  name: string;
  type: TypeExpression;
  scope: Scope;
};

function makeRootScope(program: Program): RootScope {
  return {
    modules: { user: program },
    type: {
      string: makeNativeTypeSymbol("string"),
      number: makeNativeTypeSymbol("number"),
      boolean: makeNativeTypeSymbol("boolean"),
    },
  };
}

function makeNativeTypeSymbol(name: NativeType["kind"]): RootSymbol<"type"> {
  return {
    kind: "type",
    name: name,
    type: { _type: NodeType.NativeType, kind: name },
  };
}

export default function analyzeAst(program: Program) {
  const rootScope = makeRootScope(program);
  const scope = createScope(rootScope);
  a(program, scope);
  return rootScope;
}

// Analyze an array of Nodes
function ax(nodes: Node[] | undefined, scope: Scope) {
  return nodes?.map((n) => a(n, scope));
}

// Analyze a Node
function a(node: Node, scope: Scope): TypeExpression | undefined {
  switch (node._type) {
    case NodeType.Program: {
      const name = node?.moduleDeclaration?.namespace;
      const { modules } = scope.rootScope;

      if (!name) throw new Error(`File is missing a "module" declaration`);
      if (name in modules) throw new Error(`Cannot redeclare module ${name}`);

      modules[name] = node;
      ax(node.body, scope);
      return;
    }

    case NodeType.ConstDeclaration: {
      if (node.name._type !== NodeType.Identifier) {
        throw new Error("Not implemented: const destructuring");
      }

      const valueType = resolveType(node.value, scope);
      if (!valueType) {
        throw new Error(
          `Could not resolve type for ${NodeType[node.value._type]}`
        );
      }

      const unified = unify(node.typeAnnotation.expression, valueType);

      if (!unified) {
        throw Error("Could not unify type expression");
      }

      createSymbol("value", node.name.name, unified, scope);
      a(node.value, scope);
      return unified;
    }

    case NodeType.TypeDeclaration: {
      const alreadyExists = findSymbol("type", node.identifier.name, scope);
      if (alreadyExists)
        throw new Error(
          `Cannot redeclare type with name ${node.identifier.name}`
        );

      const result = a(node.value, scope);
      if (!result) {
        console.log(dumpNode(node.value));
        throw new Error(`Type expression could not be evaluated`);
      }

      createSymbol("type", node.identifier.name, result, scope);
      return result;
    }

    case NodeType.VariantType: {
      ax(node.types, scope);
      return node;
    }

    case NodeType.TypeReference: {
      const { identifier } = node;
      if (identifier._type == NodeType.NativeType) {
        return identifier;
      }
      throw new Error("not handled, custom type reference");
    }

    case NodeType.DataConstructor: {
      const alreadyExists = findSymbol("type", node.identifier.name, scope);
      if (alreadyExists) {
        throw new Error(
          `Cannot redeclare value called ${node.identifier.name}`
        );
      }

      createSymbol("value", node.identifier.name, node, scope);
      return node;
      // console.log("data made!\n", scope.value);
    }

    case NodeType.FunctionExpression: {
      const fnScope = createScope(scope.rootScope, scope);
      // check param names aren't shadowing anything already in scope
      const paramSymbols = node.parameters.map((param) => {
        createSymbol(
          "value",
          param.identifier.name,
          param.typeAnnotation,
          scope
        );
      });
    }

    default:
      console.log(dumpNode(node));
      console.warn(`Unhandled nodetype in analyzeAst: ${NodeType[node._type]}`);
  }
}

function resolveType(
  expression: Expression | Parameter,
  scope: Scope
): TypeExpression | undefined {
  switch (expression._type) {
    case NodeType.PrimitiveValue:
      return {
        _type: NodeType.LiteralType,
        literal: expression.kind,
      } as LiteralType;

    case NodeType.Identifier: {
      const symbol = findSymbol("value", expression.name, scope);
      if (!symbol) {
        throw new Error(`Unknown reference to ${expression.name}`);
      }
      return symbol.type;
    }

    case NodeType.FunctionExpression: {
      return {
        _type: NodeType.FunctionType,
        parameters: expression.parameters.map((param) =>
          resolveType(param, scope)
        ),
        returnType: expression.returnType,
      } as FunctionType;
    }

    default:
      return undefined;
  }
}

function unify(annotatedType: TypeExpression, resolvedType: TypeExpression) {
  if (annotatedType._type === NodeType.InferenceRequired) {
    return resolvedType;
  }

  // console.log({
  //   annotated: dumpNode(annotatedType),
  //   resolved: dumpNode(resolvedType),
  // });

  switch (annotatedType._type) {
    case NodeType.NativeType: {
      switch (resolvedType._type) {
        case NodeType.LiteralType: {
          if (annotatedType.kind !== resolvedType.literal) {
            throw new Error(
              `Type mismatch: expected ${annotatedType.kind} but was given ${resolvedType.literal}`
            );
          }
          return resolvedType;
        }

        default:
          throw new Error(
            `Type mismatch: expected ${annotatedType.kind} but got ${
              NodeType[resolvedType._type]
            }`
          );
      }
    }

    case NodeType.TypeReference: {
      switch (annotatedType.identifier._type) {
        case NodeType.LiteralType:
        case NodeType.NativeType:
          return unify(annotatedType.identifier, resolvedType);
      }

      console.log(`not literal type reference`, dumpNode(annotatedType));
    }

    default:
      console.log(
        `Unify not implemented for: ${NodeType[annotatedType._type]}`
      );
  }
}

function createScope(rootScope: RootScope, parent?: Scope): Scope {
  const scope: Scope = {
    children: [],
    parent,
    rootScope,
    type: {},
    value: {},
  };

  if (parent) {
    parent.children.push(scope);
  }

  return scope;
}

function createSymbol<K extends SymbolKinds>(
  kind: K,
  name: string,
  type: TypeExpression,
  scope: Scope
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

function findSymbol<K extends SymbolKinds>(
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
