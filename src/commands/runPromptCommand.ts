import * as vscode from "vscode";
import { getStoredModel, validateModelPath } from "../core/modelManager";
import { runModelWithPrompt } from "../core/llmrunner";
import * as path from "path";
import * as fs from "fs/promises";

export async function runPromptCommand(context: vscode.ExtensionContext) {
  const model = getStoredModel(context);

  if (!model) {
    vscode.window.showErrorMessage(
      "No model selected. Please select a model first."
    );
    return;
  }

  if (!validateModelPath(model)) {
    vscode.window.showErrorMessage("Stored model path is invalid.");
    return;
  }

  const prompt = await vscode.window.showInputBox({
    prompt: "Enter a prompt to run with the selected model",
    placeHolder: "e.g., Generate documentation for this function...",
  });

  if (!prompt) return;

  try {
    const result = await runModelWithPrompt(model, prompt);
    console.log("[AutoDocGen] Received output from model:", result);
    // Get workspace folder or fallback to home dir
    const folders = vscode.workspace.workspaceFolders;
    const baseDir =
      folders && folders.length > 0
        ? folders[0].uri.fsPath
        : require("os").homedir();

    // Create markdown file path
    const fileName = `autodocgen-output-${Date.now()}.md`;
    const filePath = path.join(baseDir, fileName);
    console.log("[AutoDocGen] Writing to file:", filePath);
    vscode.window.showInformationMessage("Processed");
  } catch (err: any) {
    vscode.window.showErrorMessage(err.toString());
  }
}
