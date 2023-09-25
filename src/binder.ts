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
  ParameterType,
  EnumType,
  EnumMemberType,
} from "./nodes";
import {
  Scope,
  createRootScope,
  createScope,
  createTypeSymbol,
  createTypeVariable,
  createValueSymbol,
  dumpScope,
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
    } else if (item.type === NodeType.EnumDeclaration) {
      return bindEnum(item, scope);
    } else if (item.type === NodeType.TypeDeclaration) {
      bindTypeDeclaration(item, scope);
    } else {
      bindStatement(item, scope);
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

  if (
    constDec.value.type === NodeType.FunctionExpression &&
    constDec.name.type === NodeType.Identifier
  ) {
    constDec.value.identifier = constDec.name;
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
    case NodeType.FunctionCall: {
      expression.arguments.forEach((arg) => bindExpression(arg, scope));
      return scope;
    }
    case NodeType.BinaryOperation: {
      bindExpression(expression.left, scope);
      bindExpression(expression.right, scope);
      return scope;
    }
    case NodeType.Identifier: {
      // Nothing required
      return scope;
    }
    case NodeType.TemplateLiteral: {
      expression.spans
        .filter((span) => span.type === NodeType.TemplateSpan)
        .forEach((templateSpan) =>
          bindExpression(templateSpan.expression, scope)
        );
      return scope;
    }
    default: {
      console.log(dumpNode(expression));
      console.log(
        `Not binding possible sub-expressions for any ${
          NodeType[expression.type]
        }`
      );
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
  fnExpression.identifier =
    fnExpression.identifier && fnExpression.identifier.name
      ? fnExpression.identifier
      : {
          type: NodeType.Identifier,
          name: findAvailableName("fn"),
        };

  // Create FunctionType
  const functionType: FunctionType = {
    type: NodeType.FunctionType,
    parameters: params.map(
      (param): ParameterType => ({
        ...param,
        type: NodeType.ParameterType,
      })
    ),
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
  // ensure member names are unique
  const memberNames = enumNode.members.map((member) => member.identifier.name);
  const duplicateNames = memberNames.reduce((dupes, name) => {
    const isUnique =
      memberNames.indexOf(name) === memberNames.lastIndexOf(name);
    if (!isUnique) dupes.add(name);
    return dupes;
  }, new Set());

  if (duplicateNames.size > 0) {
    throw new Error(
      `Duplicate enum members: ${Array.from(duplicateNames).join(", ")}`
    );
  }

  const enumScope = createScope(scope);
  enumNode.scope = enumScope;
  enumNode.parameters.forEach((param) =>
    createTypeSymbol(param.name, enumScope)
  );

  // eagerly create a type for the enum and it's members
  const enumType: EnumType = {
    ...enumNode,
    type: NodeType.EnumType,
    members: enumNode.members.map(
      (memberVal) =>
        <EnumMemberType>{
          ...memberVal,
          type: NodeType.EnumMemberType,
        }
    ),
  };

  createTypeSymbol(enumType.identifier.name, scope, enumType);
  createValueSymbol(enumNode.identifier.name, scope, enumType);
}

export function bindTypeDeclaration(typeDec: TypeDeclaration, scope: Scope) {
  createTypeSymbol(typeDec.identifier.name, scope);
  const typeScope = createScope(scope);
  typeDec.scope = typeScope;
  typeDec.parameters.forEach((param) =>
    createTypeSymbol(param.name, typeScope)
  );
}
