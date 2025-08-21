// javaRegexParser.ts
import { ParsedFunction } from "../types";

/**
 * Parses Java functions using a regex-based approach.
 * This is less accurate than AST-based parsing but works for many common cases.
 */
export function parseJavaWithRegex(text: string): ParsedFunction[] {
  const results: ParsedFunction[] = [];

  const regex =
    /(?:public|private|protected)?\s*(?:static\s*)?(?:[\w<>\[\]]+\s+)+(\w+)\s*\(([^)]*)\)\s*\{/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const startIndex = match.index;
    let braceCount = 0;
    let endIndex = startIndex;
    let started = false;

    for (; endIndex < text.length; endIndex++) {
      const char = text[endIndex];
      if (char === "{") {
        braceCount++;
        started = true;
      } else if (char === "}") {
        braceCount--;
        if (braceCount === 0 && started) {
          endIndex++;
          break;
        }
      }
    }

    const rawParamsMatch = text.substring(startIndex).match(/\(([^)]*)\)/);
    const args = rawParamsMatch ? rawParamsMatch[1] : "";

    const params = args
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const [type, name] = p.trim().split(/\s+/);
        return {
          name: name || "",
          type: type || undefined,
        };
      });

    const rawBody = text.substring(startIndex, endIndex);
    const fnBody = rawBody
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");

    results.push({
      name: match[1] || "anonymous",
      params,
      returnType: undefined, // Java return type extraction can be added if needed
      startIndex,
      endIndex,
      body: fnBody,
      language: "java",
    });
  }

  return results;
}
