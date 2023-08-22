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
  TypeDeclaration,
} from "./nodes";
import {
  Scope,
  createRootScope,
  createScope,
  createTypeSymbol,
  createTypeVariable,
  createValueSymbol,
} from "./scope";

export function bindProgram(program: Program) {
  const rootScope = createRootScope();
  program.scope = rootScope;

  // TODO: bind imports & opens

  if (program.body) bindBody(program.body, rootScope);

  return rootScope;
}

export function bindBody(items: BodyItem[], scope: Scope) {
  items.forEach((item) => {
    if (item.type === NodeType.Block) {
      bindBlock(item, scope);
    } else if (item.type === NodeType.ConstDeclaration) {
      bindConstDeclaration(item, scope);
    } else if (item.type === NodeType.TypeDeclaration) {
      // bindTypeDeclaration(item, scope);
    }
  });
  return scope;
}

export function bindBlock(block: Block, scope: Scope) {
  block.scope = createScope(scope);

  if (block.body) bindBody(block.body, block.scope);
  return block.scope;
}

export function bindConstDeclaration(constDec: ConstDeclaration, scope: Scope) {
  const typeAnnotation = constDec.typeAnnotation.expression;
  const identifiers =
    constDec.name.type === NodeType.Identifier
      ? [constDec.name]
      : constDec.name.identifiers;

  // if (typeAnnotation.type === NodeType.InferenceRequired) {
  //   const typeVar = createTypeVariable(scope);
  //
  // }

  identifiers.forEach((id) =>
    createValueSymbol(id.name, scope, typeAnnotation)
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

      expression.clauses.forEach((matchClause) => {
        const caseScope = createScope(scope);
        matchClause.scope = caseScope;
        bindPattern(matchClause.pattern, caseScope);
        bindStatement(matchClause.body, caseScope);
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
  fnExpression.scope = createScope(scope);
  fnExpression.parameters.forEach((param) =>
    createValueSymbol(param.identifier.name, fnExpression.scope as Scope)
  );

  bindStatement(fnExpression.body, fnExpression.scope);

  return fnExpression.scope;
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
      return createValueSymbol(pattern.name, scope);

    case NodeType.ArrayLiteral: {
      return pattern.items
        .filter((item) => item.type === NodeType.Identifier)
        .forEach((identifier) =>
          createValueSymbol((identifier as Identifier).name, scope)
        );
    }

    case NodeType.ObjectLiteral:
    // TODO: handle { ...spread } patterns
  }
}

export function bindEnum(enumNode: EnumDeclaration, scope: Scope) {
  createValueSymbol(enumNode.identifier.name, scope);
  const enumScope = createScope(scope);
  enumNode.scope = enumScope;
  enumNode.parameters.forEach((param) =>
    createTypeSymbol(param.name, enumScope)
  );

  enumNode.members.forEach((member) => {
    createValueSymbol(member.identifier.name, enumScope);
  });
}

export function bindTypeDeclaration(typeDec: TypeDeclaration, scope: Scope) {
  createTypeSymbol(typeDec.identifier.name, scope);
  const typeScope = createScope(scope);
  typeDec.scope = typeScope;
  typeDec.parameters.forEach((param) =>
    createTypeSymbol(param.name, typeScope)
  );
}

