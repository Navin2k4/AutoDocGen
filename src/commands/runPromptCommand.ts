import * as vscode from "vscode";

interface ChatCompletionResponse {
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
}

export async function runPromptCommand(context: vscode.ExtensionContext) {
  const prompt = await vscode.window.showInputBox({
    prompt: "Enter a prompt to run with Groq API",
    placeHolder: "e.g., Generate documentation for this function...",
  });

  if (!prompt) return;

  try {
    const outputChannel = vscode.window.createOutputChannel("AutoDocGen");
    outputChannel.show(true);

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
            { role: "system", content: "You are a helpful assistant." },
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
    const content = data.choices?.[0]?.message?.content ?? "[No response]";

    outputChannel.appendLine(content);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(message);
  }
}
