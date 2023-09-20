import { SetRequired } from "type-fest";
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
  FunctionType,
  TypeAnnotation,
  FunctionCall,
  FunctionCallType,
} from "./nodes";
import {
  Scope,
  createRootScope,
  createScope,
  createTypeSymbol,
  createTypeVariable,
  createValueSymbol,
  findAvailableName,
} from "./scope";
import { dumpNode } from "./ast";

export function bindProgram(program: Program): SetRequired<Program, "scope"> {
  const rootScope = createRootScope();
  const scopedProgram = { ...program, scope: rootScope };

  // TODO: bind imports & opens

  if (scopedProgram.body) bindBody(scopedProgram.body, rootScope);

  return scopedProgram;
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

  const constType =
    typeAnnotation.type === NodeType.InferenceRequired
      ? createTypeVariable(scope)
      : typeAnnotation;

  identifiers.forEach((id) => createValueSymbol(id.name, scope, constType));
  if (!constDec.value) {
    console.log("const dec: %o", constDec);
    throw new Error("Const has no value");
  }

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
    case NodeType.FunctionExpression: {
      bindFunction(expression, scope);
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
  fnExpression.scope = fnScope;

  // Handle function parameters
  const params = fnExpression.parameters.map((param) => {
    const paramType = !param.typeAnnotation?.expression
      ? ({
          type: NodeType.TypeAnnotation,
          expression: createTypeVariable(scope),
        } as TypeAnnotation)
      : param.typeAnnotation;

    createValueSymbol(param.identifier.name, fnScope, paramType.expression);
    return { ...param, typeAnnotation: paramType };
  });

  // Handle return type
  const returnTypeAnnotation = fnExpression.returnType;
  const returnType =
    returnTypeAnnotation.expression.type === NodeType.InferenceRequired
      ? ({
          type: NodeType.TypeAnnotation,
          expression: createTypeVariable(scope),
        } as TypeAnnotation)
      : fnExpression.returnType;

  // Generate a unique identifier for the function and add it to the type symbol table
  fnExpression.identifier = fnExpression.identifier ?? {
    type: NodeType.Identifier,
    name: findAvailableName("fn"),
  };
  // Create FunctionType
  const functionType: FunctionType = {
    type: NodeType.FunctionType,
    parameters: params,
    returnType: returnType,
    identifier: fnExpression.identifier,
  };
  createTypeSymbol(fnExpression.identifier.name, scope, functionType);

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
      return createValueSymbol(pattern.name, scope, {
        type: NodeType.InferenceRequired,
      });

    case NodeType.ArrayLiteral: {
      return pattern.items
        .filter((item) => item.type === NodeType.Identifier)
        .forEach((identifier) =>
          createValueSymbol((identifier as Identifier).name, scope, {
            type: NodeType.InferenceRequired,
          })
        );
    }

    case NodeType.ObjectLiteral:
    // TODO: handle { ...spread } patterns
  }
}

export function bindEnum(enumNode: EnumDeclaration, scope: Scope) {
  createValueSymbol(enumNode.identifier.name, scope, {
    type: NodeType.InferenceRequired,
  });
  const enumScope = createScope(scope);
  enumNode.scope = enumScope;
  enumNode.parameters.forEach((param) =>
    createTypeSymbol(param.name, enumScope)
  );

  enumNode.members.forEach((member) => {
    createValueSymbol(member.identifier.name, enumScope, {
      type: NodeType.InferenceRequired,
    });
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
