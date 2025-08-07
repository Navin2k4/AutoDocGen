import { parsePythonWithAST } from "./parsers/pythonAstParser";
import { parseJSTSWithAST } from "./parsers/jsTsAstParser";
import { parseJavaWithRegex } from "./parsers/javaRegexParser";
import { ParsedFunction } from "./types";

export async function parseFunctions(
  text: string,
  language: string
): Promise<ParsedFunction[]> {
  if (language === "python") {
    return await parsePythonWithAST(text);
  }

  if (language === "javascript" || language === "typescript") {
    return await parseJSTSWithAST(text, language);
  }

  if (language === "java") {
    return parseJavaWithRegex(text);
  }

  return [];
}
