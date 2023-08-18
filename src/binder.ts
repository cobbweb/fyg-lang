import {
  DebuggerStatement,
  Block,
  BodyItem,
  ConstDeclaration,
  Expression,
  FunctionExpression,
  NodeType,
  Program,
  Statement,
  Pattern,
  Identifier,
  EnumDeclaration,
} from "./nodes";
import { Scope, createRootScope, createScope, createSymbol } from "./scope";

export function bind(program: Program) {
  const rootScope = createRootScope();

  if (program.body) bindBody(program.body, rootScope);

  return rootScope;
}

export function bindBody(items: BodyItem[], scope: Scope) {
  items.forEach((item) => {
    if (item.type === NodeType.Block) {
      bindBlock(item, scope);
    } else if (item.type === NodeType.ConstDeclaration) {
      bindConstDeclaration(item, scope);
    }
  });
  return scope;
}

export function bindBlock(block: Block, scope: Scope) {
  const blockScope = createScope(scope);
  if (block.body) bindBody(block.body, blockScope);
  return blockScope;
}

export function bindConstDeclaration(constDec: ConstDeclaration, scope: Scope) {
  const identifiers =
    constDec.name.type === NodeType.Identifier
      ? [constDec.name]
      : constDec.name.identifiers;
  identifiers.forEach(
    (id) => (id.symbol = createSymbol("value", id.name, scope))
  );
  bindExpression(constDec.value, scope);
  return scope;
}

export function bindExpression(expression: Expression, scope: Scope) {
  switch (expression.type) {
    case NodeType.PrimitiveValue:
      return scope;
    case NodeType.IfElseExpression: {
      bindStatement(expression.trueBlock, scope);
      bindStatement(expression.falseBlock, scope);
      return scope;
    }
    case NodeType.MatchExpression: {
      bindExpression(expression.subject, scope);

      expression.clauses.forEach((MatchClause) => {
        const caseScope = createScope(scope);
        bindPattern(MatchClause.pattern, caseScope);
        bindStatement(MatchClause.body, caseScope);
      });
      return scope;
    }
  }
}

export function bindDebuggerStatement(
  _dbgStatement: DebuggerStatement,
  _scope: Scope
) {
  throw new Error("Not implemented: bindDebuggerStatement");
}

export function bindFunction(fnExpression: FunctionExpression, scope: Scope) {
  const fnScope = createScope(scope);
  fnExpression.parameters.forEach((param) =>
    createSymbol("value", param.identifier.name, fnScope)
  );

  bindStatement(fnExpression.body, fnScope);

  return fnScope;
}

export function bindStatement(statement: Statement, scope: Scope) {
  if (statement.type === NodeType.Block) {
    return bindBlock(statement, scope);
  } else if (statement.type === NodeType.DebuggerStatement) {
    return bindDebuggerStatement(statement, scope);
  } else {
    // must be an expression
    return bindExpression(statement, scope);
  }
}

export function bindPattern(pattern: Pattern, scope: Scope) {
  switch (pattern.type) {
    case NodeType.Identifier:
      return createSymbol("value", pattern.name, scope);

    case NodeType.DataPattern: {
      return pattern.destructure.forEach((identifier) =>
        createSymbol("value", identifier.name, scope)
      );
    }

    case NodeType.ArrayLiteral: {
      return pattern.items
        .filter((item) => item.type === NodeType.Identifier)
        .forEach((identifier) =>
          createSymbol("value", (identifier as Identifier).name, scope)
        );
    }

    case NodeType.ObjectLiteral:
    // TODO: handle { ...spread } patterns
  }
}

export function bindEnum(enumNode: EnumDeclaration, scope: Scope) {
  createSymbol("value", enumNode.identifier.name, scope);
  const enumScope = createScope(scope);
  enumNode.parameters.forEach((param) =>
    createSymbol("type", param.name, enumScope)
  );

  enumNode.members.forEach((member) => {
    createSymbol("value", member.identifier.name, enumScope);
  });
}
