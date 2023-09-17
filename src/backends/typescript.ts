// import { dumpNode } from "../ast.ts";
// import { Node, NodeType, Program } from "../nodes.ts";
//
// export function render(ast: Program): string {
//   return renderNode(ast);
// }
//
// function indent(code: string, indent: number): string {
//   const pre = "  ".repeat(indent);
//   if (!code.split) throw new Error(`Cannot split on ${JSON.stringify(code)}`);
//   return code.split("\n").map((l) => pre + l).join("\n");
// }
//
// export function renderNodes(nodes: Node[], tabs = 0): string[] {
//   return nodes.map((node) => renderNode(node, tabs));
// }
//
// export function rn(node: Node, tabs = 0) {
//   return indent(renderNode(node), tabs);
// }
//
// export function rnx(nodes: Node[], tabs = 0): string[] {
//   return renderNodes(nodes).map((line) => indent(line, tabs));
// }
//
// function renderNode(
//   node: Node,
//   tabs = 0,
// ): string {
//   switch (node.type) {
//     case NodeType.Program: {
//       return [
//         node.moduleDeclaration ? rn(node.moduleDeclaration, tabs) : "",
//         node.body ? rnx(node.body, tabs).join("\n") : "",
//       ].filter((v) => v !== "").join("\n");
//     }
//
//     case NodeType.ModuleDeclaration: {
//       const exporting = node.exporting ? ` exporting ${node.exporting}` : "";
//       return `/** module ${node.namespace}${exporting} */`;
//     }
//
//     case NodeType.ConstDeclaration: {
//       const name = typeof node.name === "string"
//         ? node.name
//         : rn(node.name, tabs);
//       return `const ${name} = ${rn(node.value, tabs)};`;
//     }
//
//     case NodeType.Identifier: {
//       return node.name;
//     }
//
//     case NodeType.ArrayLiteral: {
//       return [
//         "[",
//         rnx(node.items, tabs + 1).join(", "),
//         "]",
//       ].join("\n");
//     }
//
//     case NodeType.PrimitiveValue: {
//       switch (node.kind) {
//         case "string":
//           return `"${node.value}"`;
//       }
//       return "";
//     }
//
//     case NodeType.TypeDeclaration: {
//       return `type ${rn(node.identifier)} = ${rn(node.value, tabs)};`;
//     }
//
//     case NodeType.ObjectType: {
//       return [
//         "{",
//         rnx(node.definitions, tabs + 1),
//         "}",
//       ].join("\n");
//     }
//
//     case NodeType.PropertyTypeDefinition: {
//       return `${rn(node.name, tabs)}: ${rn(node.value, tabs)},`;
//     }
//
//     case NodeType.TypeReference: {
//       return [
//         rn(node.identifier, tabs),
//         node.arguments?.length ? `<${rnx(node.arguments).join(", ")}>` : "",
//       ].join("");
//     }
//
//     case NodeType.LiteralType: {
//       return node.literal;
//     }
//
//     case NodeType.NativeType: {
//       return node.kind;
//     }
//
//     case NodeType.ObjectLiteral: {
//       return [
//         "{",
//         rnx(node.properties, tabs + 1).join(",\n"),
//         "}",
//       ].join("\n");
//     }
//
//     case NodeType.ObjectProperty: {
//       return `${renderNode(node.name, tabs)}: ${renderNode(node.value, tabs)}`;
//     }
//
//     case NodeType.FunctionExpression: {
//       const bodyLines = ((body) => {
//         if (body.type === NodeType.Block) {
//           return body.body ? rnx(body.body, tabs + 1) : [];
//         }
//         return [rn(node.body, tabs + 1)];
//       })(node.body);
//
//       const lastLine = bodyLines.pop();
//
//       return [
//         `${node.async ? "async " : " "}(${rnx(node.parameters).join(", ")
//         }) => {`,
//         bodyLines && bodyLines.length ? bodyLines.join(";\n") : "",
//         lastLine ? indent(`return ${lastLine.trim()};`, tabs + 1) : "",
//         `}`,
//       ].filter((l) => !!l).join("\n");
//     }
//
//     case NodeType.Parameter: {
//       return [
//         node.isSpread ? "..." : "",
//         rn(node.identifier, tabs),
//         node.typeAnnotation.type !== NodeType.InferenceRequired
//           ? `:${rn(node.typeAnnotation, tabs)}`
//           : "",
//       ].join("");
//     }
//
//     case NodeType.AwaitExpression:
//       return `await ${rn(node.expression)}`;
//
//     case NodeType.FunctionCall:
//       return [
//         rn(node.expression),
//         node.typeArguments?.length ? `<${rnx(node.typeArguments, tabs)}>` : "",
//         `(${rnx(node.arguments)})`,
//       ].join("");
//
//     case NodeType.DotNotationCall:
//       return `${rn(node.left)}.${rn(node.right)}`;
//
//     case NodeType.TypeAnnotation:
//       return ` ${rn(node.expression)}`;
//
//     case NodeType.TemplateLiteral:
//       return ["`", rn(node.head), rnx(node.spans), "`"].join("");
//
//     case NodeType.TemplateTail:
//     case NodeType.TemplateHead:
//       return node.text;
//
//     case NodeType.VariantType: {
//       return rnx(node.types).join(" | ");
//     }
//
//     case NodeType.DataConstructor: {
//       return `\{ $$kind: "${rn(node.identifier)}", parameters: [${rnx(node.parameters).join(", ")
//         }] \}`;
//     }
//
//     case NodeType.TemplateSpan: {
//       const text = typeof node.text === "string" ? node.text : rn(node.text);
//       return ["${", rn(node.expression), "}", text].join("");
//     }
//
//     default: {
//       console.log(dumpNode(node));
//       return `Node '${NodeType[node.type]}' not implemented`;
//     }
//   }
// }
