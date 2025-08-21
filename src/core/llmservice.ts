import * as vscode from "vscode";
import { ChatCompletionResponse } from "../types";
import { buildPrompt } from "../utils/llmpromptbuilder";

export async function generateDocFromGroq(
  fnBody: string,
  language: string
): Promise<string | undefined> {
  const config = vscode.workspace.getConfiguration("autodocgen");
  let apiKey = config.get<string>("groqApiKey");
  let groqModel = config.get<string>("groqModel");

  if (!apiKey) {
    vscode.window
      .showErrorMessage(
        "Missing or invalid Groq API key. Please set it in AutoDocGen Settings or in your environment variables.",
        "Open Settings",
        "Get API Key"
      )
      .then((selection) => {
        if (selection === "Open Settings") {
          vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "@ext:autodocgen"
          );
        } else if (selection === "Get API Key") {
          vscode.env.openExternal(
            vscode.Uri.parse("https://console.groq.com/keys")
          );
        }
      });
    return;
  }

  if (!groqModel) {
    vscode.window
      .showErrorMessage(
        "Missing or invalid Groq Model. Please set it in AutoDocGen Settings or in your environment variables.",
        "Open Settings",
        "Get Model"
      )
      .then((selection) => {
        if (selection === "Open Settings") {
          vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "@ext:autodocgen"
          );
        } else if (selection === "Get Model") {
          vscode.env.openExternal(
            vscode.Uri.parse("https://console.groq.com/docs/models")
          );
        }
      });
    return;
  }

  const prompt = buildPrompt(fnBody, language);

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: `${groqModel}`,
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant for documenting.",
            },
            { role: "user", content: prompt },
          ],
          stream: false,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Groq API error: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const docComment = data.choices?.[0]?.message?.content?.trim();

    return docComment || undefined;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(message);
    return undefined;
  }
}

export async function generateDocFromLocalModel(
  fnBody: string,
  language: string,
  model: string
): Promise<string | undefined> {
  const prompt = buildPrompt(fnBody, language);

  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Local model error: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as { response?: string };
    const docComment = data.response?.trim();
    return docComment || undefined;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(
      `Failed to generate with local model '${model}': ${message}`
    );
    return undefined;
  }
}
