import { parsePythonWithAST } from "./pythonAstParser";
import { ParsedFunction } from "./types";

export async function parseFunctions(
  text: string,
  language: string
): Promise<ParsedFunction[]> {
  let regex: RegExp | undefined;

  if (language === "python") {
    return await parsePythonWithAST(text);
  }

  switch (language) {
    case "javascript":
    case "typescript":
      regex =
        /(?:function\s+(\w+)\s*\(([^)]*)\)\s*:?\s*[\w<>\[\]]*\s*\{)|(?:const\s+(\w+)\s*=\s*\(([^)]*)\)\s*:?\s*[\w<>\[\]]*\s*=>\s*\{)/g;
      break;
    case "java":
      regex =
        /(?:public|private|protected)?\s*(?:static\s*)?(?:[\w<>\[\]]+\s+)+(\w+)\s*\(([^)]*)\)\s*\{/g;
      break;
    default:
      return [];
  }

  const results: ParsedFunction[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const startIndex = match.index;

    // ---------- Handle JS / TS / Java (brace-based) ----------
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
          endIndex++; // Include closing brace
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
        const [name, type] = p.split(":");
        return { name: name.trim(), type: type?.trim() };
      });

    let returnType: string | undefined;
    if (language === "typescript") {
      const ret = text
        .substring(startIndex)
        .match(/\)\s*:\s*([\w<>\[\]]+)\s*(?:{|=>)/);
      returnType = ret ? ret[1] : undefined;
    }

    const rawBody = text.substring(startIndex, endIndex);
    const fnBody = rawBody
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");

    results.push({
      name: match[1] || match[2] || "anonymous",
      params,
      returnType,
      startIndex,
      endIndex,
      body: fnBody,
      language,
    });
  }

  return results;
}
