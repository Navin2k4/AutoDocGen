export function buildPrompt(fnBody: string, language: string): string {
  if (language === "python") {
    return `
You are an expert Python developer. 
Generate a professional, PEP 257–compliant docstring for the following Python function.
Requirements:
- Place the docstring inside triple double quotes (""" ... """) directly under the function definition.
- Start with a one-line summary, then a more detailed description if necessary.
- Always include an "Args:" section for parameters with type and description.
- Always include a "Returns:" section with type and description.
- Add an "Examples:" section if relevant.
- Do not include the function code or Markdown fences (\`\`\`).
- Only output the docstring.

Function:
${fnBody}
`;
  } else if (language === "javascript" || language === "typescript") {
    return `
You are an expert JavaScript/TypeScript developer. 
Generate a concise, professional JSDoc documentation comment for the following ${language} function.

Requirements:
- Output ONLY a JSDoc block comment (/** ... */).
- Do not include additional opening block of JSDOc
- Use the standard JSDoc style with @param for each parameter and @returns.
- Provide clear, professional descriptions for each parameter and the return value.
- Do NOT include the function code, function signature, or any extra text.
- Do NOT include Markdown fences (\`\`\`).
- Do NOT restate the function name or definition.

Function:
${fnBody}
`;
  } else {
    // fallback for other languages
    return `
You are an expert software engineer. 
Generate a professional documentation comment for the following ${language} function.
Use the idiomatic style of ${language}.
Do not include the function code or Markdown fences (\`\`\`).
Only output the documentation comment.

Function:
${fnBody}
`;
  }
}
