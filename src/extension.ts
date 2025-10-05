import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import { parseFunctions } from "./parser";
import { LocalModel } from "./types";
import {
  getAvailableModels,
  isModelDownloaded,
  syncAvailableModelsWithDefaults,
  storeSelectedModel,
} from "./core/modelManager";

import { getStoredModel } from "./core/modelManager";
import { isOllamaInstalled, promptInstallOllama } from "./core/ollamaUtils";
import { runPromptCommand } from "./commands/runPromptCommand";
import {
  generateDocFromGroq,
  generateDocFromLocalModel,
} from "./core/llmservice";

export async function getSelectedModel(
  context: vscode.ExtensionContext
): Promise<LocalModel | undefined> {
  return context.globalState.get<LocalModel>("selectedModel");
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

export async function selectModelCommand(context: vscode.ExtensionContext) {
  const modelOptions = getAvailableModels();

  if (!modelOptions || modelOptions.length === 0) {
    vscode.window.showErrorMessage(
      "No models configured. Please check your settings."
    );
    return;
  }

  const selected = await vscode.window.showQuickPick(modelOptions, {
    placeHolder: "Select a local LLM model to use for documentation generation",
  });

  if (!selected) {
    vscode.window.showInformationMessage("Model selection cancelled.");
    return;
  }

  const folders = await vscode.window.showOpenDialog({
    canSelectFolders: true,
    openLabel: "Select the folder where this model is stored",
  });

  if (!folders || folders.length === 0) {
    vscode.window.showErrorMessage("You must select a valid model folder.");
    return;
  }

  const modelData: LocalModel = {
    name: selected.label,
    value: selected.value,
    path: folders[0].fsPath,
    downloaded: true,
  };

  // Ensure Ollama is installed
  if (!isOllamaInstalled()) {
    await promptInstallOllama();
    return;
  }

  // Check if the model is already downloaded
  const modelExists = await isModelDownloaded(modelData.value);
  if (modelExists) {
    vscode.window.showInformationMessage(
      `You selected "${modelData.value}" Already downloaded.`
    );
  }
  if (!modelExists) {
    const proceed = await vscode.window.showInformationMessage(
      `The model "${modelData.value}" is not currently downloaded. Do you want to download it now using Ollama?`,
      "Yes",
      "No"
    );

    if (proceed === "Yes") {
      await downloadModel(modelData.value);
    } else {
      vscode.window.showWarningMessage(
        `You selected "${modelData.value}" but it's not downloaded. Functionality may be limited.`
      );
    }
  }

  await storeSelectedModel(context, modelData);

  vscode.window.showInformationMessage(
    `Model "${modelData.value}" saved and will be used for future generation.`
  );
}

export async function downloadModel(modelName: string): Promise<void> {
  // Terminal for Ollama server
  const serveTerminal = vscode.window.createTerminal({
    name: "Ollama: Server",
  });
  serveTerminal.show(true);
  serveTerminal.sendText("ollama serve");

  // Terminal for model pull
  const pullTerminal = vscode.window.createTerminal({
    name: `Ollama: Download ${modelName}`,
  });
  pullTerminal.show(true);
  pullTerminal.sendText(`ollama pull ${modelName}`);

  vscode.window.showInformationMessage(
    `Ollama server started, and model "${modelName}" download initiated. Check the respective terminals for logs.`
  );
}

export async function activate(context: vscode.ExtensionContext) {
  await syncAvailableModelsWithDefaults();

  const scanCommand = vscode.commands.registerCommand(
    "autodocgen.scanCurrentFile",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const document = editor.document;
      const text = document.getText();
      const language = document.languageId;

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

      // Determine generation mode (cloud/local/ask)
      const config = vscode.workspace.getConfiguration("autodocgen");
      let generationMode = config.get<string>("generationMode", "ask");

      if (generationMode === "ask") {
        const choice = await vscode.window.showQuickPick(
          [
            { label: "Cloud (Groq)", value: "cloud" },
            { label: "Local (Ollama)", value: "local" },
          ],
          { placeHolder: "Choose how to generate documentation for this scan" }
        );
        if (!choice) {
          vscode.window.showInformationMessage("Documentation scan cancelled.");
          return;
        }
        generationMode = choice.value;
      }

      // Resolve local model if needed
      let selectedLocalModel: LocalModel | undefined;
      if (generationMode === "local") {
        // Ensure Ollama is installed
        if (!isOllamaInstalled()) {
          await promptInstallOllama();
          return;
        }

        selectedLocalModel = getStoredModel(context);
        if (!selectedLocalModel) {
          await selectModelCommand(context);
          selectedLocalModel = getStoredModel(context);
        }
        if (!selectedLocalModel) {
          vscode.window.showWarningMessage(
            "No local model selected. Please select a model and try again."
          );
          return;
        }

        const exists = await isModelDownloaded(selectedLocalModel.value);
        if (!exists) {
          const proceed = await vscode.window.showInformationMessage(
            `The model "${selectedLocalModel.value}" is not downloaded. Download now via Ollama?`,
            "Yes",
            "No"
          );
          if (proceed === "Yes") {
            await downloadModel(selectedLocalModel.value);
          } else {
            vscode.window.showWarningMessage(
              `Selected local model "${selectedLocalModel.value}" is not available. Aborting.`
            );
            return;
          }
        }
      }

      // Parse functions
      let parsedFuncs: any[] = [];
      try {
        parsedFuncs = await parseFunctions(text, language);
        console.log(`Parsed ${language} functions`, parsedFuncs);
      } catch (err) {
        vscode.window.showErrorMessage("Function parsing failed. See console.");
        return;
      }

      const edits = new vscode.WorkspaceEdit();
      let insertedCount = 0;

      for (const fn of parsedFuncs) {
        let currentLine: number;
        if (language === "python") {
          currentLine =
            (typeof fn.startIndex === "number" ? fn.startIndex : 1) - 1;
        } else {
          const pos = document.positionAt(fn.startIndex);
          currentLine = pos.line;
        }
        if (currentLine < 0 || currentLine >= document.lineCount) {
          console.warn(
            "Skipping function with invalid line:",
            fn.name,
            currentLine
          );
          continue;
        }

        const fullBody = fn.body.replace(/\s+/g, " ");
        const hash = crypto.createHash("md5").update(fullBody).digest("hex");
        const uniqueKey = `${relativePath}::${language}::${hash}`;
        const hasDoc = hasDocCommentAbove(document, currentLine);

        if (hasDoc) {
          history[uniqueKey] = true;
          continue;
        }
        if (history[uniqueKey]) {
          delete history[uniqueKey];
        }

        const docText =
          generationMode === "local" && selectedLocalModel
            ? await generateDocFromLocalModel(
                fn.body,
                language,
                selectedLocalModel.value
              )
            : await generateDocFromGroq(fn.body, language);
        if (!docText) continue;

        edits.insert(
          document.uri,
          new vscode.Position(currentLine, 0),
          docText + "\n"
        );
        history[uniqueKey] = true;
        insertedCount++;
      }

      if (Object.keys(history).length) {
        fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
      }

      if (insertedCount > 0) {
        await vscode.workspace.applyEdit(edits);
        vscode.window.showInformationMessage(
          "Inserted AI-generated docs in file."
        );
      } else {
        vscode.window.showInformationMessage(
          "All functions already documented."
        );
      }
    }
  );

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

      // Determine generation mode (cloud/local/ask)
      const config = vscode.workspace.getConfiguration("autodocgen");
      let generationMode = config.get<string>("generationMode", "ask");

      if (generationMode === "ask") {
        const choice = await vscode.window.showQuickPick(
          [
            { label: "Cloud (Groq)", value: "cloud" },
            { label: "Local (Ollama)", value: "local" },
          ],
          {
            placeHolder:
              "Choose how to generate documentation for this selection",
          }
        );
        if (!choice) {
          vscode.window.showInformationMessage(
            "Documentation generation cancelled."
          );
          return;
        }
        generationMode = choice.value;
      }

      // Resolve local model if needed
      let selectedLocalModel: LocalModel | undefined;
      if (generationMode === "local") {
        if (!isOllamaInstalled()) {
          await promptInstallOllama();
          return;
        }

        selectedLocalModel = getStoredModel(context);
        if (!selectedLocalModel) {
          await selectModelCommand(context);
          selectedLocalModel = getStoredModel(context);
        }
        if (!selectedLocalModel) {
          vscode.window.showWarningMessage(
            "No local model selected. Please select a model and try again."
          );
          return;
        }

        const exists = await isModelDownloaded(selectedLocalModel.value);
        if (!exists) {
          const proceed = await vscode.window.showInformationMessage(
            `The model "${selectedLocalModel.value}" is not downloaded. Download now via Ollama?`,
            "Yes",
            "No"
          );
          if (proceed === "Yes") {
            await downloadModel(selectedLocalModel.value);
          } else {
            vscode.window.showWarningMessage(
              `Selected local model "${selectedLocalModel.value}" is not available. Aborting.`
            );
            return;
          }
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

        // Build doc via configured generator
        const snippetBody = text.substring(startIndex, endIndex + 1);
        const docText =
          generationMode === "local" && selectedLocalModel
            ? await generateDocFromLocalModel(
                snippetBody,
                language,
                selectedLocalModel.value
              )
            : await generateDocFromGroq(snippetBody, language);
        if (!docText) break;
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

  const resetDocHistoryCommand = vscode.commands.registerCommand(
    "autodocgen.resetDocHistory",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const document = editor.document;
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
      try {
        if (fs.existsSync(historyPath)) {
          fs.unlinkSync(historyPath);
          vscode.window.showInformationMessage(
            "Doc history reset for this file."
          );
        } else {
          vscode.window.showInformationMessage(
            "No doc history found for this file."
          );
        }
      } catch (err) {
        vscode.window.showErrorMessage("Failed to reset doc history: " + err);
      }
    }
  );

  const selectModel = vscode.commands.registerCommand(
    "autodocgen.selectModel",
    () => selectModelCommand(context)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("autodocgen.debugPrintModel", async () => {
      const model = getStoredModel(context);
      if (!model) {
        vscode.window.showWarningMessage("No model has been selected yet.");
      } else {
        vscode.window.showInformationMessage(
          `Stored Model: ${model.name} @ ${model.path}`
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("autodocgen.runPrompt", () =>
      runPromptCommand(context)
    )
  );

  context.subscriptions.push(
    scanCommand,
    scanSelection,
    resetDocHistoryCommand,
    selectModel
  );
}

export function deactivate() {}
