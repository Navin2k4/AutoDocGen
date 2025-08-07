import * as vscode from "vscode";
import { LocalModel } from "../types";
import * as fs from "fs";
import { execSync } from "child_process";

const MODEL_KEY = "selectedModel";

/**
 * Fetch available models from extension configuration
 */
export function getAvailableModels(): {
  label: string;
  detail: string;
  value: string;
  name: string;
}[] {
  const config = vscode.workspace.getConfiguration("autodocgen");
  const models = config.get<any[]>("availableModels", []);

  return models.map((model) => ({
    label: model.name,
    detail: `${model.size} – ${model.performance}`,
    value: model.value,
    name: model.name,
  }));
}

/**
 * Store selected model in global extension storage
 */
export async function storeSelectedModel(
  context: vscode.ExtensionContext,
  model: LocalModel
): Promise<void> {
  await context.globalState.update(MODEL_KEY, model);
}

/**
 * Retrieve stored model (if previously selected)
 */
export function getStoredModel(
  context: vscode.ExtensionContext
): LocalModel | undefined {
  return context.globalState.get<LocalModel>(MODEL_KEY);
}

/**
 * Ensure the stored path is still valid (basic check)
 */
export function validateModelPath(model: LocalModel): boolean {
  return fs.existsSync(model.path);
}

export async function syncAvailableModelsWithDefaults(): Promise<void> {
  const config = vscode.workspace.getConfiguration("autodocgen");
  const modelsInspect = config.inspect<any[]>("availableModels");

  if (!modelsInspect) return;

  const userDefinedModels = modelsInspect.globalValue;
  const defaultModels = modelsInspect.defaultValue;

  const isUserOverridden =
    userDefinedModels &&
    JSON.stringify(userDefinedModels) !== JSON.stringify(defaultModels);

  if (isUserOverridden) {
    const result = await vscode.window.showInformationMessage(
      "AutoDocGen: Your 'availableModels' list differs from the extension defaults. Do you want to reset to the latest default models?",
      "Reset to Defaults",
      "Keep My Settings"
    );

    if (result === "Reset to Defaults") {
      await config.update(
        "availableModels",
        undefined,
        vscode.ConfigurationTarget.Global
      );
      vscode.window.showInformationMessage(
        "AutoDocGen: Model list has been reset to defaults."
      );
    }
  }
}


export function isModelDownloaded(modelName: string): boolean {
  try {
    const output = execSync("ollama list").toString();
    return output.includes(modelName);
  } catch (error) {
    console.error("Error checking downloaded models:", error);
    return false;
  }
}
