import {
  BodyItem,
  Identifier,
  Node,
  NodeType,
  Program,
  TypeExpression,
} from "./nodes.ts";

const modules: Record<string, Program> = {};

type Scope = {
  symbols: Record<string, Symbol>;
  children: Scope[];
  parent?: Scope;
};

type Symbol = {
  scope: Scope;
  name: string;
  type: TypeExpression;
};

export default function analyzeAst(program: Program) {
  const scope = createScope();
  a(program, scope);
}

function ax(nodes: Node[] | undefined, scope: Scope) {
  return nodes?.map((n) => a(n, scope));
}

function a(node: Node, scope: Scope) {
  switch (node._type) {
    case NodeType.Program: {
      const name = node?.moduleDeclaration?.namespace;

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

      createSymbol(node.name.name, node.typeAnnotation.expression, scope);

      a(node.value, scope);
    }
  }
}

function createScope(parent?: Scope): Scope {
  const scope: Scope = {
    symbols: {},
    children: [],
    parent,
  };

  if (parent) {
    parent.children.push(scope);
  }

  return scope;
}

function createSymbol(
  name: string,
  type: TypeExpression,
  scope: Scope,
): Symbol {
  const exists = doesSymbolExist(name, scope);
  if (exists) {
    throw new Error(`Cannot redeclare const "${name}"`);
  }

  const symbol = {
    name,
    type,
    scope,
  };
  scope.symbols[name] = symbol;

  return symbol;
}

function doesSymbolExist(name: string, scope: Scope): boolean {
  const exists = name in scope.symbols;
  if (exists) return true;
  return scope.parent ? doesSymbolExist(name, scope.parent) : false;
}
