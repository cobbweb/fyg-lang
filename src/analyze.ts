import { InferenceRequired, NodeType, Program, TypeExpression } from "./nodes";
import {
  ConstraintType,
  Scope,
  dumpScope,
  findTypeSymbol,
  renderTypeNode,
  updateTypeSymbol,
} from "./scope";
import { dumpNode } from "./ast";
import { typeAnnotation } from "../tests/lib/astBuilders";

export function analyzeProgram(program: Program) {
  if (!program.scope) throw new Error("Program must have scope created");
  if (!program.body) return;

  // console.log(dumpScope(program.scope));
  // unify constraints back into the type table
  unifyScope(program.scope);
  // Now all types directly in the symbol table should be resolved
  // Let's substitute any remaining type var references
  applySubstitutions(program.scope);
  // apply type info back to the value table
  // applyTypesToValueTable(program.scope);
  // manually check final type issues
  // validateScope(program.scope);
  return program;
}

export function applySubstitutions(scope: Scope) {
  const types = Object.values(scope.type);

  types.forEach((typeSymbol) => {
    const { type } = typeSymbol;

    switch (type.type) {
      case NodeType.FunctionType: {
        type.parameters.forEach((param) => {
          param.typeAnnotation.expression = resolveType(
            param.typeAnnotation.expression,
            scope
          );
        });
        type.returnType.expression = resolveType(
          type.returnType.expression,
          scope
        );
      }
    }
  });
}

export function resolveType(
  typeExpression: TypeExpression,
  scope: Scope
): TypeExpression {
  if (isNamedTypeReference(typeExpression)) {
    const foundSymbol = findTypeSymbol(typeExpression.name!, scope);
    if (foundSymbol) {
      console.log("found symbol: %s", typeExpression.name!);
      const foundTypeExpression = foundSymbol.type;
      // is the resolved type _another_ identifier, do a deeper search
      console.log(
        renderTypeNode(typeExpression),
        renderTypeNode(foundTypeExpression)
      );
      return foundTypeExpression !== typeExpression
        ? resolveType(foundTypeExpression, scope)
        : foundTypeExpression;
    }

    if (scope.parent) return resolveType(typeExpression, scope.parent);
    return resolveType(typeExpression, scope) ?? typeExpression;
  }

  if (typeExpression.type === NodeType.TypeReference) {
    console.log("resolve typ ref");
    console.log(dumpNode(typeExpression));
    return resolveType(typeExpression.identifier, scope);
  }

  if (typeExpression.type === NodeType.TypeAnnotation) {
    return resolveType(typeExpression.expression, scope);
  }

  return typeExpression;
}

export function unifyScope(scope: Scope) {
  if (!scope.constraints)
    throw new Error(`Scope needs its constraints collected first`);

  scope.constraints.forEach(([typeA, typeB]) => {
    unify(typeA, typeB, scope);
  });
  scope.children.forEach((childScope) => unifyScope(childScope));
}

export function unify(
  typeA: TypeExpression,
  typeB: TypeExpression,
  scope: Scope
): void {
  console.log(
    `Constraint of ${renderTypeNode(typeA)} = ${renderTypeNode(typeB)}`
  );
  const resolvedA = resolveType(typeA, scope);
  const resolvedB = resolveType(typeB, scope);
  console.log(
    `Resolved constraint of ${renderTypeNode(resolvedA)} = ${renderTypeNode(
      resolvedB
    )}`
  );
  // const resolvedA = typeA;
  // const resolvedB = typeB;

  if (isNamedTypeReference(resolvedA)) {
    console.log(
      `Set ${renderTypeNode(resolvedA)} = ${renderTypeNode(resolvedB)}\n`
    );
    updateTypeSymbol(resolvedA.name!, resolvedB, scope);
    return;
  }

  if (isNamedTypeReference(resolvedB)) {
    console.log(
      `Set ${renderTypeNode(resolvedB)} = ${renderTypeNode(resolvedA)}\n`
    );
    updateTypeSymbol(resolvedB.name!, resolvedA, scope);
    return;
  }

  if (
    resolvedA.type === NodeType.NativeType &&
    resolvedB.type === NodeType.NativeType
  ) {
    if (resolvedA.kind !== resolvedB.kind) {
      throw new Error(`Type mismatch: ${resolvedA.kind} vs ${resolvedB.kind}`);
    }
    return;
  }

  if (
    resolvedA.type === NodeType.FunctionType &&
    resolvedB.type === NodeType.FunctionType
  ) {
    if (resolvedA.parameters.length !== resolvedB.parameters.length) {
      throw new Error("Function parameter count mismatch");
    }
    for (let i = 0; i < resolvedA.parameters.length; i++) {
      unify(
        resolvedA.parameters[i].typeAnnotation.expression,
        resolvedB.parameters[i].typeAnnotation.expression,
        scope
      );
    }
    unify(
      resolvedA.returnType.expression,
      resolvedB.returnType.expression,
      scope
    );
    return;
  }

  if (
    resolvedA.type === NodeType.FunctionCallType &&
    resolvedB.type === NodeType.FunctionType
  ) {
    if (resolvedA.arguments.length !== resolvedB.parameters.length) {
      throw new Error("Function argument count mismatch");
    }
    for (let i = 0; i < resolvedA.arguments.length; i++) {
      unify(
        resolvedA.arguments[i],
        resolvedB.parameters[i].typeAnnotation.expression,
        scope
      );
    }

    unify(resolvedA.returnType, resolvedB.returnType.expression, scope);
    return;
  }

  if (
    resolvedB.type === NodeType.FunctionCallType &&
    resolvedA.type === NodeType.FunctionType
  ) {
    unify(resolvedB, resolvedA, scope); // Reorder and unify
    return;
  }

  if (
    resolvedA.type === NodeType.EnumType &&
    resolvedB.type === NodeType.EnumCallType
  ) {
    if (resolvedA !== resolvedB.enum) {
      throw new Error(
        `Enum references do not match: ${resolvedA.identifier.name} and ${resolvedB.enum.identifier.name}`
      );
    }

    return;
  }

  if (
    resolvedA.type === NodeType.EnumCallType &&
    resolvedB.type === NodeType.EnumType
  ) {
    unify(typeB, typeA, scope);
    return;
  }

  if (
    resolvedA.type === NodeType.EnumType &&
    resolvedB.type === NodeType.EnumType
  ) {
    if (resolvedA !== resolvedB) {
      throw new Error(
        `Enum references do not match: ${resolvedA.identifier.name} and ${resolvedB.identifier.name}`
      );
    }
    return;
  }

  if (
    resolvedA.type === NodeType.EnumCallType &&
    resolvedB.type === NodeType.EnumCallType
  ) {
    if (resolvedA.enum !== resolvedB.enum) {
      throw new Error(
        `Enum references do not match: ${resolvedA.enum.identifier.name} and ${resolvedB.enum.identifier.name}`
      );
    }
    // if (resolvedA.member !== resolvedB.member) {
    //   throw new Error(
    //     `Expected ${renderTypeNode(resolvedA)} but got ${renderTypeNode(
    //       resolvedB
    //     )}`
    //   );
    // }
    return;
  }

  if (
    resolvedA.type === NodeType.ObjectType &&
    resolvedB.type === NodeType.ObjectType
  ) {
    const missingFields = resolvedA.definitions.filter((propDef) => {
      const propDefB = resolvedB.definitions.find(
        (pd) => pd.name.name === propDef.name.name
      );
      if (!propDefB) return true;
      unify(propDef.value, propDefB.value, scope);
    });

    if (missingFields.length > 0) {
      throw new Error(
        `Missing fields in object: ${missingFields
          .map((f) => f.name.name)
          .join(", ")}`
      );
    }

    if (resolvedB.definitions.length != resolvedA.definitions.length) {
      throw new Error("Object B has too many properties");
    }

    return;
  }

  console.log({
    resolvedA: dumpNode(resolvedA),
    resolvedB: dumpNode(resolvedB),
  });
  throw new Error(
    `Couldn't unify ${renderTypeNode(resolvedA)} with ${renderTypeNode(
      resolvedB
    )}`
  );
}

function isNamedTypeReference(
  typeExpr: ConstraintType
): typeExpr is InferenceRequired {
  return (
    typeExpr.type === NodeType.InferenceRequired ||
    typeExpr.type === NodeType.Identifier
  );
}

export function generalizeType(typeExpression: TypeExpression): TypeExpression {
  if (typeExpression.type === NodeType.EnumCallType) {
    return typeExpression.enum;
  }

  return typeExpression;
}
