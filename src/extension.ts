import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import { parseFunctions } from "./parser";

async function debugParseCommand() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const text = editor.document.getText();
  const language = editor.document.languageId;

  try {
    const parsedFuncs = await parseFunctions(text, language);
    console.log("PARSED FUNCS (resolved):", parsedFuncs);
    vscode.window.showInformationMessage(
      `Parsed ${parsedFuncs.length} function(s). Check console for details.`
    );
  } catch (err) {
    console.error("Function parsing failed:", err);
    vscode.window.showErrorMessage("Function parsing failed. See console.");
  }
}
/**
 * Checks above a given line number if there is a real docblock.
 */
function hasDocCommentAbove(doc: vscode.TextDocument, line: number): boolean {
  let i = line - 1,
    inBlock = false;
  while (i >= 0) {
    if (i < 0 || i >= doc.lineCount) {
      return false;
    }
    const txt = doc.lineAt(i).text.trim();
    if (!inBlock) {
      if (txt.endsWith("*/")) {
        inBlock = true;
      } else if (txt.startsWith('"""')) {
        return true;
      } else if (txt.startsWith("//")) {
        i--;
        continue;
      } else if (txt === "") {
        i--;
        continue;
      } else {
        return false;
      }
    } else {
      if (txt.startsWith("/**") || txt.startsWith("/*")) {
        return true;
      }
    }
    i--;
  }
  return false;
}

/**
 * Inserts documentation into a document for a given function match.
 */
async function documentFunctions(
  document: vscode.TextDocument,
  text: string,
  regex: RegExp,
  historyPath: string,
  relativePath: string,
  language: string,
  edits: vscode.WorkspaceEdit
) {
  let history: Record<string, boolean> = {};
  if (fs.existsSync(historyPath)) {
    try {
      history = JSON.parse(fs.readFileSync(historyPath, "utf8"));
    } catch {
      history = {};
    }
  }

  let match;
  while ((match = regex.exec(text)) !== null) {
    const rawParamsMatch = text.substring(match.index).match(/\(([^)]*)\)/);
    const args = rawParamsMatch ? rawParamsMatch[1] : "";
    const params = args
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    const startIndex = match.index;
    let braceCount = 0;
    let endIndex = startIndex;
    for (; endIndex < text.length; endIndex++) {
      if (text[endIndex] === "{") braceCount++;
      else if (text[endIndex] === "}") {
        braceCount--;
        if (braceCount === 0) break;
      }
    }
    const fullBody = text.substring(startIndex, endIndex).replace(/\s+/g, " ");
    const hash = crypto.createHash("md5").update(fullBody).digest("hex");
    const uniqueKey = `${relativePath}::${language}::${hash}`;

    // get target line
    const pos = document.positionAt(startIndex);
    const currentLine = pos.line;
    const hasDoc = hasDocCommentAbove(document, currentLine);

    if (hasDoc) {
      history[uniqueKey] = true;
      continue;
    }
    if (history[uniqueKey]) {
      delete history[uniqueKey];
    }

    // build doc
    let docText = "";
    if (language === "python") {
      docText = `"""\n`;
      params.forEach((p) => {
        const [name] = p.split(":").map((s) => s.trim());
        docText += `:param ${name}: \n`;
      });
      docText += `:returns: \n"""\n`;
    } else if (language === "typescript") {
      docText = `/**\n`;
      params.forEach((p) => {
        const [name, type] = p.split(":").map((s) => s.trim());
        docText += ` * @param {${type || "any"}} ${name}\n`;
      });
      const ret = text
        .substring(startIndex)
        .match(/\)\s*:\s*([\w<>\[\]]+)\s*(?:{|=>)/);
      const returnType = ret ? ret[1] : "void";
      docText += ` * @returns {${returnType}} \n */\n`;
    } else {
      docText = `/**\n`;
      params.forEach((p) => {
        const name = p.split(":")[0].trim();
        docText += ` * @param ${name}\n`;
      });
      docText += ` * @returns \n */\n`;
    }

    edits.insert(document.uri, new vscode.Position(currentLine, 0), docText);
    history[uniqueKey] = true;
  }

  if (Object.keys(history).length) {
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  }
}

export function activate(context: vscode.ExtensionContext) {
  /** --- full-file scan --- */
  const scanCommand = vscode.commands.registerCommand(
    "autodocgen.scanCurrentFile",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const document = editor.document;
      const text = document.getText();
      const language = document.languageId;

      let regex: RegExp | undefined;
      switch (language) {
        case "python":
          regex = /def\s+(\w+)\s*\(([^)]*)\)\s*:/g;
          break;
        case "javascript":
        case "typescript":
          regex =
            /(?:function\s+(\w+)\s*\([^)]*\)\s*:?\s*[\w\<\>\[\]]*\s*\{)|(?:const\s+(\w+)\s*=\s*\([^)]*\)\s*:?\s*[\w\<\>\[\]]*\s*=>\s*\{)/g;
          break;
        case "java":
          regex =
            /(?:public|private|protected)?\s*(?:static\s*)?(?:[\w\<\>\[\]]+\s+)+(\w+)\s*\(([^)]*)\)\s*\{/g;
          break;
        default:
          vscode.window.showInformationMessage(
            `Language '${language}' not supported.`
          );
          return;
      }

      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
      if (!workspaceFolder) return;

      const relativePath = path.relative(
        workspaceFolder.uri.fsPath,
        document.uri.fsPath
      );
      const historyPath = path.join(
        workspaceFolder.uri.fsPath,
        ".autodocgen",
        "history",
        `${relativePath}.json`
      );
      fs.mkdirSync(path.dirname(historyPath), { recursive: true });

      const edits = new vscode.WorkspaceEdit();
      await documentFunctions(
        document,
        text,
        regex,
        historyPath,
        relativePath,
        language,
        edits
      );

      if (edits.size > 0) {
        await vscode.workspace.applyEdit(edits);
        vscode.window.showInformationMessage("Inserted docs in file.");
      } else {
        vscode.window.showInformationMessage(
          "All functions in file already documented."
        );
      }
    }
  );

  /** --- selection-context scan --- */
  const scanSelection = vscode.commands.registerCommand(
    "autodocgen.documentSelection",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const document = editor.document;
      const language = document.languageId;
      const selection = editor.selection;
      const selectionPos = selection.start;
      const selectionOffset = document.offsetAt(selectionPos);
      const text = document.getText();

      let regex: RegExp | undefined;
      switch (language) {
        case "python":
          regex = /def\s+(\w+)\s*\(([^)]*)\)\s*:/g;
          break;
        case "javascript":
        case "typescript":
          regex =
            /(?:function\s+(\w+)\s*\([^)]*\)\s*:?\s*[\w\<\>\[\]]*\s*\{)|(?:const\s+(\w+)\s*=\s*\([^)]*\)\s*:?\s*[\w\<\>\[\]]*\s*=>\s*\{)/g;
          break;
        case "java":
          regex =
            /(?:public|private|protected)?\s*(?:static\s*)?(?:[\w\<\>\[\]]+\s+)+(\w+)\s*\(([^)]*)\)\s*\{/g;
          break;
        default:
          vscode.window.showInformationMessage(
            `Language '${language}' not supported.`
          );
          return;
      }

      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
      if (!workspaceFolder) return;
      const relativePath = path.relative(
        workspaceFolder.uri.fsPath,
        document.uri.fsPath
      );
      const historyPath = path.join(
        workspaceFolder.uri.fsPath,
        ".autodocgen",
        "history",
        `${relativePath}.json`
      );
      fs.mkdirSync(path.dirname(historyPath), { recursive: true });

      let history: Record<string, boolean> = {};
      if (fs.existsSync(historyPath)) {
        try {
          history = JSON.parse(fs.readFileSync(historyPath, "utf8"));
        } catch {
          history = {};
        }
      }

      let match;
      let foundOne = false;
      const edits = new vscode.WorkspaceEdit();

      while ((match = regex.exec(text)) !== null) {
        const startIndex = match.index;
        let braceCount = 0;
        let endIndex = startIndex;
        for (; endIndex < text.length; endIndex++) {
          if (text[endIndex] === "{") braceCount++;
          else if (text[endIndex] === "}") {
            braceCount--;
            if (braceCount === 0) break;
          }
        }

        // Check if selection is inside this function block:
        if (!(startIndex <= selectionOffset && selectionOffset <= endIndex)) {
          continue;
        }

        foundOne = true;
        const rawParamsMatch = text.substring(match.index).match(/\(([^)]*)\)/);
        const args = rawParamsMatch ? rawParamsMatch[1] : "";
        const params = args
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);

        const fullBody = text
          .substring(startIndex, endIndex)
          .replace(/\s+/g, " ");
        const hash = crypto.createHash("md5").update(fullBody).digest("hex");
        const uniqueKey = `${relativePath}::${language}::${hash}`;

        const pos = document.positionAt(startIndex);
        const currentLine = pos.line;
        const hasDoc = hasDocCommentAbove(document, currentLine);

        if (hasDoc) {
          history[uniqueKey] = true;
          break;
        }
        if (history[uniqueKey]) {
          delete history[uniqueKey];
        }

        // Build doc exactly like in file scan
        let docText = "";
        if (language === "python") {
          docText = `"""\n`;
          params.forEach((p) => {
            const name = p.split(":")[0].trim();
            docText += `:param ${name}: \n`;
          });
          docText += `:returns: \n"""\n`;
        } else if (language === "typescript") {
          docText = `/**\n`;
          params.forEach((p) => {
            const [name, type] = p.split(":").map((s) => s.trim());
            docText += ` * @param {${type || "any"}} ${name}\n`;
          });
          const ret = text
            .substring(startIndex)
            .match(/\)\s*:\s*([\w<>\[\]]+)\s*(?:{|=>)/);
          const returnType = ret ? ret[1] : "void";
          docText += ` * @returns {${returnType}} \n */\n`;
        } else {
          docText = `/**\n`;
          params.forEach((p) => {
            const name = p.split(":")[0].trim();
            docText += ` * @param ${name}\n`;
          });
          docText += ` * @returns \n */\n`;
        }
        edits.insert(
          document.uri,
          new vscode.Position(currentLine, 0),
          docText
        );
        history[uniqueKey] = true;
        break;
      }

      if (!foundOne) {
        vscode.window.showInformationMessage(
          "No function detected in selected area."
        );
        return;
      }

      if (edits.size > 0) {
        await vscode.workspace.applyEdit(edits);
        fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
        vscode.window.showInformationMessage(
          "Inserted docs for selected function."
        );
      } else {
        vscode.window.showInformationMessage(
          "Selected function already documented."
        );
      }
    }
  );

  const debugParserCommand = vscode.commands.registerCommand(
    "autodocgen.debugParseCurrentFile",
    debugParseCommand
  );

  context.subscriptions.push(scanCommand, scanSelection, debugParserCommand);
}

export function deactivate() {}
