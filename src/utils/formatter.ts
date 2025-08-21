export function formatDocstring(
  docContent: string,
  language: string,
  indentLevel: number = 0
): string {
  const indent = ' '.repeat(indentLevel);

  switch (language) {
    case 'python':
      return `${indent}"""${docContent.trim()}"""\n`;
    case 'javascript':
    case 'typescript':
    case 'java':
      return `${indent}/**\n${indent} * ${docContent.trim().replace(/\n/g, `\n${indent} * `)}\n${indent} */\n`;
    default:
      return `${indent}// ${docContent.trim()}\n`;
  }
}

export function getIndentationLevel(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}