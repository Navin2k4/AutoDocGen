# AutoDocGen – Intelligent Code Documentation

**AutoDocGen** is a modular Visual Studio Code plugin that automatically generates inline documentation for functions and methods in your source code. It is designed for privacy-focused workflows using _local Large Language Models (LLMs)_ and supports JavaScript, TypeScript, Python, and Java.

---

## Features

- **Automatic function documentation** with JSDoc / JavaDoc / Python docstring formats  
- Detects undocumented functions in realtime  
- Generates doc templates with `@param`, `@returns`, and type extraction  
- Per-file history tracking to _avoid duplicates_ and only update when logic changes  
- Fully **offline**, privacy-preserving, and ready for **local LLM integration** (Ollama support)  
- Modular architecture so support for other languages and IDEs (IntelliJ etc.) can be plugged in  

---

## Upcoming (LLM Enabled Mode)

AutoDocGen will soon integrate with **local LLMs (via Ollama)** such as:
- `codellama`
- `deepseek-coder`
- `mistral`

to automatically _fill documentation text semantically_ instead of just inserting skeleton comments.

---

## Currently Supported Languages

| Language      | Template Style            |
|--------------|---------------------------|
| JavaScript    | `/** ... */` (JSDoc)       |
| TypeScript    | `/** ... */` (JSDoc + type extraction)|
| Python        | `""" ... """` (Google-style docstrings) |
| Java          | `/** ... */` (JavaDoc)     |

---

## Installation (Development Build)

```bash
git clone https://github.com/<your-name>/autodocgen
cd autodocgen
npm install
npm run watch
