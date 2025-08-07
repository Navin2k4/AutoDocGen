import { ParsedFunction } from "../types";

export function buildPromptFromFunction(fn: ParsedFunction): string {
  return `
Given the following ${fn.language} function:
-------------------------
${fn.body}
-------------------------
Generate a clear and concise documentation comment that describes what this function does, its parameters, and return value.
  `.trim();
}
