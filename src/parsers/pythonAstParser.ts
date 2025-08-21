
import { spawn } from "child_process";
import { ParsedFunction } from "../types";
import * as path from "path";

export function parsePythonWithAST(code: string): Promise<ParsedFunction[]> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "..", "core", "python_parser.py");
    console.log("Python script path:", scriptPath);

    const process = spawn("python", [scriptPath]);
    let output = "";
    let errorOutput = "";

    process.stdout.on("data", (data) => {
      output += data.toString();
    });

    process.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    process.on("close", (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch (err) {
          reject("Invalid JSON output from Python parser.");
        }
      } else {
        reject(`Python parser failed with code ${code}: ${errorOutput}`);
      }
    });

    process.stdin.write(code);
    process.stdin.end();
  });
}
