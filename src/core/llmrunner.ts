import { spawn } from "child_process";
import { LocalModel } from "../types";

/**
 * Runs the given prompt through the local LLM using Ollama and streams output.
 */
export function runModelWithPrompt(
  model: LocalModel,
  prompt: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const command = "ollama";
    const args = ["run", model.name, `"${prompt}"`];

    console.log("[AutoDocGen] Spawning command:", command, args.join(" "));
    const child = spawn(command, args, {
      cwd: model.path,
      shell: true, // Needed for Windows environments
    });

    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (data) => {
      const out = data.toString();
      console.log("[AutoDocGen][stdout]", out);
      output += out;
    });

    child.stderr.on("data", (data) => {
      const err = data.toString();
      console.error("[AutoDocGen][stderr]", err);
      errorOutput += err;
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(`LLM process exited with code ${code}: ${errorOutput}`);
      } else {
        resolve(output.trim());
      }
    });

    child.on("error", (err) => {
      reject(`Failed to start LLM process: ${err.message}`);
    });
  });
}
