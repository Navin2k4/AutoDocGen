import { ParsedFunction } from "../types";
import * as babelParser from "@babel/parser";
import * as babelTraverse from "@babel/traverse";
import * as babelGenerator from "@babel/generator";

export async function parseJSTSWithAST(
  text: string,
  language: string
): Promise<ParsedFunction[]> {
  const results: ParsedFunction[] = [];

  let plugins: string[] = [
    "classProperties",
    "objectRestSpread",
    "optionalChaining",
    "nullishCoalescingOperator",
  ];

  if (language === "typescript") {
    plugins = ["typescript", ...plugins];
  } else {
    plugins = ["jsx", ...plugins];
  }

  let ast;
  try {
    ast = babelParser.parse(text, {
      sourceType: "module",
      plugins: plugins as any,
    });
  } catch (e) {
    console.error("Babel parse error:", e);
    return [];
  }

  const extractParams = (params: any[]) => {
    return params.map((p: any) => {
      if (p.type === "Identifier") {
        const typeNode = p.typeAnnotation?.typeAnnotation;
        return {
          name: p.name,
          type: typeNode
            ? (babelGenerator.default as any)(typeNode).code
            : undefined,
        };
      } else if (
        p.type === "AssignmentPattern" &&
        p.left.type === "Identifier"
      ) {
        const typeNode = p.left.typeAnnotation?.typeAnnotation;
        return {
          name: p.left.name,
          type: typeNode
            ? (babelGenerator.default as any)(typeNode).code
            : undefined,
        };
      } else {
        return {
          name: (babelGenerator.default as any)(p).code,
          type: undefined,
        };
      }
    });
  };

  const handleFunctionNode = (node: any, name: string) => {
    if (!name || name === "anonymous") return;

    const params = extractParams(node.params);
    let returnType;
    const typeNode = node.returnType?.typeAnnotation;
    if (typeNode) {
      returnType = (babelGenerator.default as any)(typeNode).code;
    }
    const startIndex = node.start ?? 0;
    const endIndex = node.end ?? 0;
    const body = (babelGenerator.default as any)(node).code;

    results.push({
      name,
      params,
      returnType,
      startIndex,
      endIndex,
      body,
      language,
    });
  };

  (babelTraverse.default as any)(ast, {
    FunctionDeclaration(path: any) {
      const node = path.node;
      const name = node.id?.name || "anonymous";
      handleFunctionNode(node, name);
    },
    FunctionExpression(path: any) {
      const node = path.node;
      const name = node.id?.name || "anonymous";
      handleFunctionNode(node, name);
    },
    ArrowFunctionExpression(path: any) {
      const node = path.node;
      let name = "anonymous";
      if (
        path.parent.type === "VariableDeclarator" &&
        path.parent.id.type === "Identifier"
      ) {
        name = path.parent.id.name;
      }
      handleFunctionNode(node, name);
    },
    ClassMethod(path: any) {
      const node = path.node;
      const name = node.key.name || "anonymous";
      handleFunctionNode(node, name);
    },
    TSDeclareFunction(path: any) {
      const node = path.node;
      const name = node.id?.name || "anonymous";
      handleFunctionNode(node, name);
    },
  });

  return results;
}
