import { TextEditorEdit, TextEditor } from "vscode";
import { formatDocstring, getIndentationLevel } from "./formatter";

export function injectDocstring(
  editor: TextEditor,
  funcStartLine: number,
  docContent: string,
  language: string
): void {
  editor.edit((editBuilder: TextEditorEdit) => {
    const targetLine = editor.document.lineAt(funcStartLine);
    const indentLevel = getIndentationLevel(targetLine.text);
    const formatted = formatDocstring(docContent, language, indentLevel);
    const pos = targetLine.range.start;
    editBuilder.insert(pos, formatted);
  });
}
