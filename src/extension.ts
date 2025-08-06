import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";

function hasDocCommentAbove(doc: vscode.TextDocument, line: number): boolean {
  let i = line - 1;
  let inBlock = false;

  while (i >= 0) {
    const txt = doc.lineAt(i).text.trim();
    if (!inBlock) {
      if (txt.endsWith("*/")) {
        inBlock = true;
      } else if (txt.startsWith("//") || txt.startsWith('"""')) {
        return true;
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

export function activate(context: vscode.ExtensionContext) {
  const scanCommand = vscode.commands.registerCommand(
    "autodocgen.scanCurrentFile",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No active editor window.");
        return;
      }

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
      if (!workspaceFolder) {
        vscode.window.showWarningMessage(
          "File is not inside a workspace folder."
        );
        return;
      }
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

      const historyDir = path.dirname(historyPath);
      if (!fs.existsSync(historyDir)) {
        fs.mkdirSync(historyDir, { recursive: true });
      }

      let history: Record<string, boolean> = {};
      if (fs.existsSync(historyPath)) {
        try {
          history = JSON.parse(fs.readFileSync(historyPath, "utf8"));
        } catch {
          history = {};
        }
      }

      const edits = new vscode.WorkspaceEdit();
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
        const fullBody = text
          .substring(startIndex, endIndex)
          .replace(/\s+/g, " ");
        const hash = crypto.createHash("md5").update(fullBody).digest("hex");

        const uniqueKey = `${relativePath}::${language}::${hash}`;

        const pos = document.positionAt(startIndex);
        const currentLine = pos.line;
        const hasDoc = hasDocCommentAbove(document, currentLine);

        // 1) If a real doc already exists above → always skip insertion
        if (hasDoc) {
          history[uniqueKey] = true; // ensure it's tracked
          continue;
        }

        // 2) If history thinks it's documented but doc is gone → reset
        if (history[uniqueKey]) {
          delete history[uniqueKey];
        }

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
            const [name, type] = p.split(":").map((x) => x.trim());
            docText += ` * @param {${type || "any"}} ${name}\n`;
          });
          const ret = text
            .substring(startIndex)
            .match(/\)\s*:\s*([\w<>\[\]]+)\s*(?:{|=>)/);
          const returnType = ret ? ret[1] : "void";
          docText += ` * @returns {${returnType}} \n */\n`;
        } else {
          docText = `/**\n * \n`;
          params.forEach((p) => {
            const name = p.split(":")[0].trim();
            docText += ` * @param ${name}\n`;
          });
          docText += ` * @returns \n */\n`;
        }

        const insertPos = new vscode.Position(currentLine, 0);
        edits.insert(document.uri, insertPos, docText);

        history[uniqueKey] = true;
      }

      if (edits.size > 0) {
        await vscode.workspace.applyEdit(edits);
        fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
        vscode.window.showInformationMessage("Inserted docs where needed.");
      } else {
        vscode.window.showInformationMessage(
          "All functions already documented."
        );
      }
    }
  );

  context.subscriptions.push(scanCommand);
}

export function deactivate() {}
