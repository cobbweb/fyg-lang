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
  EnumCallType,
  EnumDeclaration,
  Expression,
  FunctionCall,
  FunctionCallType,
  FunctionExpression,
  FunctionType,
  Identifier,
  IfElseExpression,
  NativeType,
  NodeType,
  ObjectLiteral,
  ObjectType,
  ParameterType,
  Program,
  PropertyTypeDefinition,
  Statement,
  TypeDeclaration,
  TypeExpression,
  TypeReference,
} from "./nodes";
import {
  ConstraintType,
  Scope,
  createTypeSymbol,
  createTypeVariable,
  dumpScope,
  findTypeSymbol,
  findValueSymbol,
  renderTypeNode,
} from "./scope";
import { deepEquals } from "bun";

export function collectProgram(program: SetRequired<Program, "scope">) {
  program.body?.forEach((item) => collectBodyItem(item, program.scope));
  return program;
}

export function collectBodyItem(
  bodyItem: BodyItem,
  scope: Scope
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
  scope: Scope
): ConstraintType {
  const name =
    constDec.name.type === NodeType.Identifier
      ? constDec.name.name
      : constDec.name.identifiers[0].name; // Assuming first for simplification

  const existingTypeVar = scope.value[name]?.type;

  if (!existingTypeVar) {
    throw new Error(`Type variable for ${name} not found`);
  }

  const exprType = collectExpression(constDec.value, scope);

  // Add constraint between the existing type variable and the expression type
  console.log("constdec", {
    [renderTypeNode(existingTypeVar)]: renderTypeNode(exprType),
  });
  scope.constraints.push([existingTypeVar, exprType]);

  // special sauce to handle const-bound functions
  if (constDec.value.type === NodeType.FunctionExpression) {
    // @ts-ignore
    scope.type[existingTypeVar?.name].type = constDec.value.identifier!;
  }

  return existingTypeVar;
}

export function collectTypeDeclaration(
  typeDec: TypeDeclaration,
  _scope: Scope
) {
  console.log(dumpNode(typeDec));
  const typeSymbol = findTypeSymbol(typeDec.identifier.name, _scope);
  if (!typeSymbol)
    throw new Error(
      `Could not find type symbol named ${typeDec.identifier.name} but it should have been creating by bindTypeDeclaration`
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
  scope: Scope
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
  scope: Scope
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
        expr as SetRequired<FunctionExpression, "scope">
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
          scope.constraints.push([
            collectExpression(templateSpan.expression, scope),
            <NativeType>{ type: NodeType.NativeType, kind: "string" },
          ])
        );
      return { type: NodeType.NativeType, kind: "string" };
    }

    case NodeType.ObjectLiteral: {
      return collectObjectLiteral(expr, scope);
    }
  }

  throw new Error(`TODO: collectExpression with ${NodeType[expr.type]}`);
}

export function collectEnumDeclaration(
  enumDec: EnumDeclaration,
  scope: Scope
): TypeExpression {
  const enumTypeSymbol = findTypeSymbol(enumDec.identifier.name, scope);
  if (!enumTypeSymbol)
    throw new Error(`Missing EnumType for ${enumDec.identifier.name}`);
  return enumTypeSymbol.type;
}

export function collectObjectLiteral(
  object: ObjectLiteral,
  scope: Scope
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
  scope: Scope
): TypeExpression {
  const referencedType = collectExpression(dotCall.left, scope);
  console.log(dumpNode(dotCall));
  console.log(dumpNode(referencedType));

  if (referencedType.type === NodeType.EnumType) {
    const referencedMember = referencedType.members.find((memberType) => {
      return deepEquals(memberType.identifier, dotCall.right);
    });
    if (!referencedMember)
      throw new Error(`Couldn't find enum member called ${dotCall.right.name}`);
    console.log("found", dumpNode(referencedMember));

    return <EnumCallType>{
      type: NodeType.EnumCallType,
      enum: referencedType,
      member: referencedMember,
    };
  } else if (referencedType.type === NodeType.InferenceRequired) {
    // TODO: handle record call
  } else {
    console.log("ref", dumpNode(referencedType));
    console.log("dotCall", dumpNode(dotCall));
    throw new Error("unhandled dot call notation");
  }
  throw new Error("**");
}

export function collectIfElseExpression(
  expr: IfElseExpression,
  scope: Scope
): TypeExpression {
  const conditionType = collectExpression(expr.condition, scope);
  scope.constraints.push([
    conditionType,
    <NativeType>{ type: NodeType.NativeType, kind: "boolean" },
  ]);

  const trueBranch = collectStatement(expr.trueBlock, scope);
  const falseBranch = collectStatement(expr.falseBlock, scope);

  scope.constraints.push([trueBranch, falseBranch]);

  return generalizeType(trueBranch);
}

export function collectBinaryOperation(
  expr: BinaryOperation,
  scope: Scope
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
      scope.constraints.push([
        leftType,
        { type: NodeType.NativeType, kind: "number" },
      ]);
      scope.constraints.push([
        rightType,
        { type: NodeType.NativeType, kind: "number" },
      ]);
      return { type: NodeType.NativeType, kind: "number" };

    case "greaterThan":
    case "greaterOrEqual":
    case "lessThan":
    case "lessOrEqual":
      scope.constraints.push([
        leftType,
        { type: NodeType.NativeType, kind: "number" },
      ]);
      scope.constraints.push([
        rightType,
        { type: NodeType.NativeType, kind: "number" },
      ]);
      return { type: NodeType.NativeType, kind: "boolean" };

    case "logicalOr":
    case "logicalAnd":
      // These must be booleans
      scope.constraints.push([
        leftType,
        { type: NodeType.NativeType, kind: "boolean" },
      ]);
      scope.constraints.push([
        rightType,
        { type: NodeType.NativeType, kind: "boolean" },
      ]);
      return { type: NodeType.NativeType, kind: "boolean" };

    case "equal":
    case "notEqual":
      scope.constraints.push([leftType, rightType]);
      return { type: NodeType.NativeType, kind: "boolean" };
  }
  throw new Error(`Unknown binary operation ${expr.op}`);
}

export function collectFunctionCall(
  fnCall: FunctionCall,
  scope: Scope
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

    scope.constraints.push([resolvedValue, fnType]);
  } else if (isResolvedFunction) {
    scope.constraints.push([resolvedValue, fnCallType]);
  } else {
    throw new Error(
      `Cannot call ${renderTypeNode(resolvedValue)} as it is not a function`
    );
  }

  return fnCallType.returnType;
}

export function collectFunctionDefinition(
  fnExpression: SetRequired<FunctionExpression, "scope" | "identifier">
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
      dumpNode(fnTypeSymbol.type)
    );
    throw new Error(`Related symbol isn't a function type`);
  }

  const returnType = fnTypeSymbol.type.returnType.expression;

  // Collect constraints for the function body
  collectStatement(fnExpression.body, fnExpression.scope);

  const [returnExpression, returnScope] = getLastExpression(
    fnExpression.body,
    fnScope
  );
  const returnExpressionType = returnExpression
    ? collectExpression(returnExpression, returnScope)
    : ({ type: NodeType.NativeType, kind: "void" } as NativeType);

  if (returnExpressionType) {
    if (!returnType) throw new Error("no return type");
    console.log("FD", {
      [renderTypeNode(returnType)]: renderTypeNode(returnExpressionType),
    });
    fnScope.parent!.constraints.push([returnExpressionType, returnType]);
  }

  const fnType = findTypeSymbol(
    fnExpression.identifier.name,
    fnExpression.scope
  );
  if (!fnType)
    throw new Error(
      `Could not find function named ${fnExpression.identifier.name}`
    );

  return fnType.type;
}

export function collectIdentifier(
  identifier: Identifier,
  scope: Scope
): ConstraintType {
  const identifierType = findValueSymbol(identifier.name, scope);
  if (!identifierType) {
    throw new Error(`Couldn't find type for ${identifier.name}`);
  }

  if (!identifierType.type)
    throw new Error(`No type information for identifier ${identifier.name}`);

  return identifierType.type!;
}
