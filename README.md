# AutoDocGen – Intelligent Code Documentation

AutoDocGen is a Visual Studio Code extension that generates inline documentation for your functions and methods. It supports both cloud generation (Groq) and local generation via Ollama, with a simple preference to choose how docs are produced.

---

## Features

- Automatic documentation with JSDoc / JavaDoc / Python docstrings
- Cloud or Local generation: Groq API or Ollama
- Per-file history to avoid duplicates and re-run only when logic changes
- Skips already documented functions by default
- Command-driven workflow for precise control

---

## Requirements

- VS Code 1.102+
- Node.js 20+
- For Cloud mode: Groq API key and model
- For Local mode: [Ollama](https://ollama.com/download)

---

## Installation (Development)

```bash
git clone https://github.com/<your-name>/autodocgen
cd autodocgen
npm install
npm run watch
```

Open the folder in VS Code and press F5 to launch the Extension Development Host.

---

## Configuration

Open VS Code Settings and search for “AutoDocGen”, or use your `settings.json`.

Common settings:

- `autodocgen.generationMode` (cloud | local | ask)
  - How docs are generated: Groq, local Ollama, or ask every run.
- `autodocgen.groqApiKey` (string)
  - Your Groq API key for cloud doc generation. Create/view at `https://console.groq.com/keys`.
- `autodocgen.groqModel` (string)
  - Groq model name for cloud generation. See `https://console.groq.com/docs/models`.
- `autodocgen.availableModels` (array)
  - Options shown in the “Select LLM Model” picker for local generation.
- `autodocgen.manualMode` (boolean)
  - If true, runs only via commands. No automatic scanning.
- `autodocgen.overwriteExistingDocs` (boolean)
  - If true, replaces existing docs (behavior may be limited in this release).

Cloud example:

```json
{
  "autodocgen.generationMode": "cloud",
  "autodocgen.groqApiKey": "YOUR_GROQ_API_KEY",
  "autodocgen.groqModel": "llama-3.1-70b-versatile"
}
```

Local example:

```json
{
  "autodocgen.generationMode": "local"
}
```

Then run “AutoDocGen: Select LLM Model” to choose/download your local model.

---

## Commands

- AutoDocGen: Run Prompt with Model (`autodocgen.runPrompt`)
- AutoDocGen: Show Selected Model (`autodocgen.debugPrintModel`)
- AutoDocGen: Document Current File (`autodocgen.scanCurrentFile`)
- AutoDocGen: Document Selected Function (`autodocgen.documentSelection`)
- AutoDocGen: Reset Doc History (`autodocgen.resetDocHistory`)
- AutoDocGen: Select LLM Model (`autodocgen.selectModel`)

---

## Generation Modes

Choose via `autodocgen.generationMode`:

- Cloud (Groq)
  - Requires `autodocgen.groqApiKey` and `autodocgen.groqModel`.
  - API key: `https://console.groq.com/keys`, Models: `https://console.groq.com/docs/models`.
- Local (Ollama)
  - Requires [Ollama](https://ollama.com/download) running locally.
  - Use “AutoDocGen: Select LLM Model” to pick a model (e.g. `mistral:7b`, `codellama:7b`). If missing, you’ll be prompted to download.
- Ask Every Time
  - The extension will prompt you to choose Cloud vs Local each time you run a doc-generation command.

Where history is stored:

```
<workspace>/.autodocgen/history/<relative/path/to/file>.json
```

---

## Supported Languages

| Language   | Doc Style                       |
| ---------- | ------------------------------- |
| JavaScript | JSDoc `/** ... */`              |
| TypeScript | JSDoc `/** ... */` (types used) |
| Python     | Docstring `""" ... """`         |
| Java       | JavaDoc `/** ... */`            |

---

## How It Works

1. Parses the active file to find functions and checks for existing docs.
2. Builds a language-aware prompt from each undocumented function body.
3. Sends the prompt to Groq (Cloud) or Ollama (Local) based on your preference.
4. Inserts the generated doc block and records a per-file history entry to avoid duplicates.

---

## Troubleshooting

- Missing/invalid Groq credentials
  - Set `autodocgen.groqApiKey` and `autodocgen.groqModel` in Settings.
- Ollama not installed or running
  - Install from `https://ollama.com/download` and ensure it’s running.
- Local model not downloaded
  - Choose “Yes” when prompted to download or run `ollama pull <model>` manually.
- Nothing inserted
  - The function may already be documented or recorded in history. Use “AutoDocGen: Reset Doc History” for that file.

---

## Development

Scripts:

```bash
npm run compile   # Build TypeScript into out/
npm run watch     # Watch mode for development
npm run lint      # Lint sources
npm test          # Run extension tests
```

Open in VS Code and press F5 to start an Extension Development Host.

---

## Security & Privacy

- Cloud mode sends prompt content (function bodies) to Groq.
- Local mode keeps generation on your machine via Ollama.

---

## License

MIT. See `LICENSE` for details.
