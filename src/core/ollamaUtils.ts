import * as cp from "child_process";
import * as vscode from "vscode";

export function isOllamaInstalled(): boolean {
  try {
    cp.execSync("ollama --version", { stdio: "ignore" });
    return true;
  } catch (err) {
    return false;
  }
}

export async function promptInstallOllama() {
  const action = await vscode.window.showErrorMessage(
    "Ollama is not installed. You need it to run local LLM models.",
    "Open Installation Page"
  );

  if (action === "Open Installation Page") {
    vscode.env.openExternal(vscode.Uri.parse("https://ollama.com/download"));
  }
}
