import { SetRequired } from "type-fest";
import { generalizeType, resolveType } from "./analyze";
import { dumpNode } from "./ast";
import { getLastExpression } from "./lib/getLastExpression";
import {
  BinaryOperation,
  Block,
  BodyItem,
  ConstDeclaration,
  DotNotationCall,
  EnumCall,
  EnumCallType,
  EnumDeclaration,
  EnumPattern,
  Expression,
  FunctionCall,
  FunctionCallType,
  FunctionExpression,
  FunctionType,
  Identifier,
  IfElseExpression,
  MatchExpression,
  NativeType,
  NodeType,
  ObjectLiteral,
  ObjectPropLike,
  ObjectType,
  ParameterType,
  Pattern,
  PatternType,
  Program,
  PropertyTypeDefinition,
  Statement,
  TypeDeclaration,
  TypeExpression,
  TypeReference,
} from "./nodes";
import {
  ConstraintKind,
  ConstraintType,
  Scope,
  createTypeSymbol,
  createTypeVariable,
  dumpScope,
  findTypeSymbol,
  findValueSymbol,
  pushConstraint,
  renderTypeNode,
} from "./scope";
import { deepEquals } from "bun";

export function collectProgram(program: SetRequired<Program, "scope">) {
  program.body?.forEach((item) => collectBodyItem(item, program.scope));
  return program;
}

export function collectBodyItem(
  bodyItem: BodyItem,
  scope: Scope,
): ConstraintType {
  if (bodyItem.type === NodeType.ConstDeclaration) {
    return collectConstDeclaration(bodyItem, scope);
  } else if (bodyItem.type === NodeType.EnumDeclaration) {
    return collectEnumDeclaration(bodyItem, scope);
  } else if (bodyItem.type === NodeType.TypeDeclaration) {
    return collectTypeDeclaration(bodyItem, scope);
  } else {
    return collectStatement(bodyItem, scope);
  }
}

export function collectConstDeclaration(
  constDec: ConstDeclaration,
  scope: Scope,
): ConstraintType {
  if (constDec.name.type === NodeType.EnumDestructureBinding) {
    const name = constDec.name.unwrap[0].name;
    const existingTypeVar = scope.value[name]?.type;

    if (!existingTypeVar) {
      throw new Error(`Type variable for ${name} not found`);
    }

    const exprType = collectExpression(constDec.value, scope);

    // Add constraint between the existing type variable and the expression type
    // console.log("constdec", {
    //   existingTypeVar: dumpNode(existingTypeVar),
    //   exprType: dumpNode(exprType),
    //   constDec: dumpNode(constDec),
    // });

    const enumType = findTypeSymbol(constDec.name.enumName.name, scope)?.type;
    if (!enumType) {
      throw new Error(
        `Couldn't find an enum named ${constDec.name.enumName.name}`,
      );
    }
    const patternMatch = <PatternType>{
      type: NodeType.PatternType,
      typeVar: existingTypeVar,
      pattern: <EnumPattern>{
        type: NodeType.EnumPattern,
        enum: enumType,
        member: constDec.name.memberName,
      },
    };
    scope.constraints.push([patternMatch, exprType, scope]);
    return existingTypeVar;
  } else {
    const name =
      constDec.name.type === NodeType.Identifier
        ? constDec.name.name
        : constDec.name.identifiers[0].name; // Assuming first for simplification, handle more later

    const existingTypeVar = scope.value[name]?.type;

    if (!existingTypeVar) {
      throw new Error(`Type variable for ${name} not found`);
    }

    const exprType = collectExpression(constDec.value, scope);

    pushConstraint(scope, [existingTypeVar, exprType]);

    // special sauce to handle const-bound functions
    if (constDec.value.type === NodeType.FunctionExpression) {
      // @ts-ignore
      scope.type[existingTypeVar?.name].type = constDec.value.identifier!;
    }

    return existingTypeVar;
  }
}

export function collectTypeDeclaration(
  typeDec: TypeDeclaration,
  _scope: Scope,
) {
  const typeSymbol = findTypeSymbol(typeDec.identifier.name, _scope);
  if (!typeSymbol)
    throw new Error(
      `Could not find type symbol named ${typeDec.identifier.name} but it should have been creating by bindTypeDeclaration`,
    );
  // TODO: possible need to do some collection here?
  typeSymbol.type = typeDec.value;

  return <TypeReference>{
    type: NodeType.TypeReference,
    identifier: typeDec.identifier,
  };
}

export function collectStatement(
  statement: Statement,
  scope: Scope,
): TypeExpression {
  if (statement.type === NodeType.Block) {
    return collectBlock(statement);
  } else if (statement.type === NodeType.DebuggerStatement) {
    return { type: NodeType.NativeType, kind: "void" };
  } else {
    // Must be an expression
    return collectExpression(statement, scope);
  }
}

export function collectBlock(block: Block): TypeExpression {
  const blockScope = block.scope;

  if (!blockScope) {
    throw new Error("Block scope not found");
  }

  if (!block.body) return { type: NodeType.NativeType, kind: "void" };

  const constraints = block.body.map((stmt) => {
    return collectBodyItem(stmt, blockScope);
  });

  return constraints.at(-1) ?? { type: NodeType.NativeType, kind: "void" };
}

export function collectExpression(
  expr: Expression,
  scope: Scope,
): ConstraintType {
  switch (expr.type) {
    case NodeType.PrimitiveValue:
      return {
        type: NodeType.NativeType,
        kind: expr.kind,
      };

    case NodeType.BinaryOperation:
      return collectBinaryOperation(expr, scope);

    case NodeType.FunctionExpression:
      return collectFunctionDefinition(
        // @ts-ignore
        expr as SetRequired<FunctionExpression, "scope">,
      );

    case NodeType.FunctionCall:
      return collectFunctionCall(expr, scope);

    case NodeType.Identifier:
      return collectIdentifier(expr, scope);

    case NodeType.IfElseExpression:
      return collectIfElseExpression(expr, scope);

    case NodeType.DotNotationCall:
      return collectDotNotationCall(expr, scope);

    case NodeType.TemplateLiteral: {
      expr.spans
        .filter((span) => span.type === NodeType.TemplateSpan)
        .forEach((templateSpan) =>
          pushConstraint(scope, [
            collectExpression(templateSpan.expression, scope),
            <NativeType>{ type: NodeType.NativeType, kind: "string" },
          ]),
        );
      return { type: NodeType.NativeType, kind: "string" };
    }

    case NodeType.ObjectLiteral: {
      return collectObjectLiteral(expr, scope);
    }

    case NodeType.EnumCall: {
      return collectEnumCall(expr, scope);
    }

    case NodeType.MatchExpression: {
      return collectMatchExpression(expr, scope);
    }
  }

  throw new Error(`TODO: collectExpression with ${NodeType[expr.type]}`);
}

export function collectMatchExpression(
  matchExpr: MatchExpression,
  scope: Scope,
): TypeExpression {
  const subjectType = collectExpression(matchExpr.subject, scope);
  const firstClause = matchExpr.clauses[0];
  if (!firstClause) {
    throw new Error(`match expression has no clauses`);
  }

  const clauseTypes: [TypeExpression, TypeExpression][] = matchExpr.clauses.map(
    (clause) => [
      collectPattern(clause.pattern, clause.scope!),
      collectStatement(clause.body, clause.scope!),
    ],
  );

  const [firstClauseType, ...otherClauses] = clauseTypes;
  const [firstPatternType, firstBodyType] = firstClauseType;

  console.log("clauseTypes", dumpNode(clauseTypes));

  scope.constraints.push([subjectType, firstPatternType, scope]);

  otherClauses.forEach(([patternType, bodyType]) => {
    scope.constraints.push([
      patternType,
      subjectType,
      scope,
      ConstraintKind.Subset,
    ]);
    scope.constraints.push([firstBodyType, bodyType, scope]);
  });

  return firstBodyType;
}

export function collectPattern(pattern: Pattern, scope: Scope): TypeExpression {
  return collectExpression(pattern as Expression, scope);
}

export function collectEnumDeclaration(
  enumDec: EnumDeclaration,
  scope: Scope,
): TypeExpression {
  const enumTypeSymbol = findTypeSymbol(enumDec.identifier.name, scope);
  if (!enumTypeSymbol)
    throw new Error(`Missing EnumType for ${enumDec.identifier.name}`);
  return enumTypeSymbol.type;
}

export function collectEnumCall(
  enumCall: EnumCall,
  scope: Scope,
): TypeExpression {
  if (enumCall.expression.type !== NodeType.DotNotationCall) {
    throw new Error(`Odd way to call an enum??`);
  }

  const leftType = collectExpression(enumCall.expression.left, scope);
  if (!leftType || leftType.type !== NodeType.EnumType) {
    console.log(dumpNode(leftType));
    throw new Error(`Left side did not resolve to an enum type`);
  }

  const enumMember = leftType.members.find(
    (member) => member.identifier.name === enumCall.expression.right.name,
  );

  if (!enumMember) {
    throw new Error(
      `Enum ${leftType.identifier.name} does not have a variant called ${enumCall.expression.right.name}`,
    );
  }
  const argTypes = enumCall.arguments.map((arg) =>
    collectExpression(arg, scope),
  );

  const enumCallType = <EnumCallType>{
    type: NodeType.EnumCallType,
    enum: leftType,
    member: enumMember,
    arguments: argTypes,
  };

  return enumCallType;
}

export function collectObjectLiteral(
  object: ObjectLiteral,
  scope: Scope,
): TypeExpression {
  const objectType: ObjectType = {
    type: NodeType.ObjectType,
    definitions: object.properties.map((prop) => {
      return <PropertyTypeDefinition>{
        type: NodeType.PropertyTypeDefinition,
        name: prop.name,
        value: collectExpression(prop.value, scope),
      };
    }),
  };
  return objectType;
}

export function collectDotNotationCall(
  dotCall: DotNotationCall,
  scope: Scope,
): TypeExpression {
  const referencedType = collectExpression(dotCall.left, scope);

  if (referencedType.type === NodeType.EnumType) {
    const referencedMember = referencedType.members.find((memberType) => {
      return deepEquals(memberType.identifier, dotCall.right);
    });
    if (!referencedMember)
      throw new Error(`Couldn't find enum member called ${dotCall.right.name}`);

    return <EnumCallType>{
      type: NodeType.EnumCallType,
      enum: referencedType,
      member: referencedMember,
      arguments: [],
    };
  } else if (referencedType.type === NodeType.InferenceRequired) {
    if (dotCall.right.type !== NodeType.Identifier) {
      // this should be unreachable due to the grammar
      throw new Error(`Dot call expressions must be static identifiers`);
    }
    const propTypeVar = createTypeVariable(scope);
    // unknown type, so we need to infer
    const objectType: ObjectType = {
      type: NodeType.ObjectType,
      identifier: createTypeVariable(scope),
      definitions: [
        <PropertyTypeDefinition>{
          type: NodeType.PropertyTypeDefinition,
          name: dotCall.right,
          value: propTypeVar,
        },
      ],
    };
    pushConstraint(scope, [referencedType, objectType]);
    return propTypeVar;
  } else if (referencedType.type === NodeType.ObjectType) {
    const referencedPropDefinition = referencedType.definitions.find((def) =>
      deepEquals(def.name, dotCall.right),
    );
    console.log("ref", dumpNode(referencedType));
    console.log("dotCall", dumpNode(dotCall));
    if (!referencedPropDefinition) {
      throw new Error(`Could not find a field called ${dotCall.right.name}`);
    }
    console.log("refDef", dumpNode(referencedPropDefinition));
    return referencedPropDefinition.value;
  } else {
    throw new Error("unhandled dot call notation");
  }
  throw new Error("**");
}

export function collectIfElseExpression(
  expr: IfElseExpression,
  scope: Scope,
): TypeExpression {
  const conditionType = collectExpression(expr.condition, scope);
  pushConstraint(scope, [
    conditionType,
    <NativeType>{ type: NodeType.NativeType, kind: "boolean" },
  ]);

  const trueBranch = collectStatement(expr.trueBlock, scope);
  const falseBranch = collectStatement(expr.falseBlock, scope);

  pushConstraint(scope, [trueBranch, falseBranch]);

  return generalizeType(trueBranch);
}

export function collectBinaryOperation(
  expr: BinaryOperation,
  scope: Scope,
): TypeExpression {
  const leftType = collectExpression(expr.left, scope);
  const rightType = collectExpression(expr.right, scope);

  // Add constraints based on the operator.
  switch (expr.op) {
    case "addition":
    case "subtraction":
    case "multiply":
    case "divide":
    case "exponentiation":
      pushConstraint(scope, [
        leftType,
        { type: NodeType.NativeType, kind: "number" },
      ]);
      pushConstraint(scope, [
        rightType,
        { type: NodeType.NativeType, kind: "number" },
      ]);
      return { type: NodeType.NativeType, kind: "number" };

    case "greaterThan":
    case "greaterOrEqual":
    case "lessThan":
    case "lessOrEqual":
      pushConstraint(scope, [
        leftType,
        { type: NodeType.NativeType, kind: "number" },
      ]);
      pushConstraint(scope, [
        rightType,
        { type: NodeType.NativeType, kind: "number" },
      ]);
      return { type: NodeType.NativeType, kind: "boolean" };

    case "logicalOr":
    case "logicalAnd":
      // These must be booleans
      pushConstraint(scope, [
        leftType,
        { type: NodeType.NativeType, kind: "boolean" },
      ]);
      pushConstraint(scope, [
        rightType,
        { type: NodeType.NativeType, kind: "boolean" },
      ]);
      return { type: NodeType.NativeType, kind: "boolean" };

    case "equal":
    case "notEqual":
      pushConstraint(scope, [leftType, rightType]);
      return { type: NodeType.NativeType, kind: "boolean" };
  }
  throw new Error(`Unknown binary operation ${expr.op}`);
}

export function collectFunctionCall(
  fnCall: FunctionCall,
  scope: Scope,
): TypeExpression {
  const referencedValue = collectExpression(fnCall.expression, scope);
  const resolvedValue = resolveType(referencedValue, scope);

  const isResolvedFunction = resolvedValue.type === NodeType.FunctionType;
  const isUnresolvedReference =
    resolvedValue.type === NodeType.InferenceRequired ||
    resolvedValue.type === NodeType.Identifier;

  const fnCallType: FunctionCallType = {
    type: NodeType.FunctionCallType,
    returnType: createTypeVariable(scope),
    arguments: fnCall.arguments.map((arg) => collectExpression(arg, scope)),
    callee: referencedValue,
  };

  if (isUnresolvedReference) {
    // if we can't resolve the FunctionType being called,
    // create a constraint that resolvedValue must be a FunctionType
    const fnType: FunctionType = {
      type: NodeType.FunctionType,
      returnType: {
        type: NodeType.TypeAnnotation,
        expression: fnCallType.returnType,
      },
      identifier:
        resolvedValue.type === NodeType.Identifier ||
        resolvedValue.type === NodeType.InferenceRequired
          ? resolvedValue
          : undefined,
      parameters: fnCall.arguments.map((arg: Expression): ParameterType => {
        return {
          type: NodeType.ParameterType,
          typeAnnotation: {
            type: NodeType.TypeAnnotation,
            expression: collectExpression(arg, scope),
          },
          isSpread: false, // TODO: spread parameter support
        };
      }),
    };

    pushConstraint(scope, [resolvedValue, fnType]);
  } else if (isResolvedFunction) {
    pushConstraint(scope, [resolvedValue, fnCallType]);
  } else {
    throw new Error(
      `Cannot call ${renderTypeNode(resolvedValue)} as it is not a function`,
    );
  }

  return fnCallType.returnType;
}

export function collectFunctionDefinition(
  fnExpression: SetRequired<FunctionExpression, "scope" | "identifier">,
): TypeExpression {
  const fnScope = fnExpression.scope;
  const fnTypeSymbol = findTypeSymbol(fnExpression.identifier.name, fnScope);

  if (!fnTypeSymbol) {
    throw new Error("Function type not found in type symbol table");
  }

  if (fnTypeSymbol.type.type !== NodeType.FunctionType) {
    console.log(
      "FnExpression: %o\nSymbol: %o\n",
      dumpNode(fnExpression),
      dumpNode(fnTypeSymbol.type),
    );
    throw new Error(`Related symbol isn't a function type`);
  }

  const returnType = fnTypeSymbol.type.returnType.expression;

  // Collect constraints for the function body
  collectStatement(fnExpression.body, fnExpression.scope);

  const [returnExpression, returnScope] = getLastExpression(
    fnExpression.body,
    fnScope,
  );
  const returnExpressionType = returnExpression
    ? collectExpression(returnExpression, returnScope)
    : ({ type: NodeType.NativeType, kind: "void" } as NativeType);

  if (returnExpressionType) {
    if (!returnType) throw new Error("no return type");
    console.log("FD", {
      [renderTypeNode(returnType)]: renderTypeNode(returnExpressionType),
    });
    pushConstraint(fnScope, [returnExpressionType, returnType]);
  }

  const fnType = findTypeSymbol(
    fnExpression.identifier.name,
    fnExpression.scope,
  );
  if (!fnType)
    throw new Error(
      `Could not find function named ${fnExpression.identifier.name}`,
    );

  return fnType.type;
}

export function collectIdentifier(
  identifier: Identifier,
  scope: Scope,
): ConstraintType {
  const identifierType = findValueSymbol(identifier.name, scope);
  if (!identifierType) {
    throw new Error(`Couldn't find type for ${identifier.name}`);
  }

  if (!identifierType.type)
    throw new Error(`No type information for identifier ${identifier.name}`);

  return identifierType.type!;
}
