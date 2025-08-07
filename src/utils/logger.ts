import * as vscode from "vscode";

export function logInfo(message: string) {
  vscode.window.showInformationMessage(`[AutoDocGen] ${message}`);
}

export function logError(message: string) {
  vscode.window.showErrorMessage(`[AutoDocGen Error] ${message}`);
}

export function logToConsole(...args: any[]) {
  console.log("[AutoDocGen]", ...args);
}
