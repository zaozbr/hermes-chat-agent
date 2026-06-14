# Hermes Agent

Full Cascade-grade AI coding agent for VS Code, powered by Hermes Agent via the Agent Client Protocol (ACP). Multi-file edits, plans, tool calls, terminal, MCP, skills, sessions, approvals — all driven from the editor.

## Features

- **Chat Interface**: Natural language interaction with AI models
- **Cascade Flow**: Step-by-step planning and execution
- **Tool Integration**: Access to MCP servers, filesystem, GitHub, and more
- **Session Management**: Save and resume conversations
- **Inline Editing**: Edit code directly from the editor
- **Terminal Integration**: Run commands within the editor
- **Approval System**: Control AI actions with granular permissions

## Installation

1. Build the extension:
   ```bash
   node scripts/build.mjs --mode production
   ```

2. Package the extension:
   ```bash
   npx vsce package --allow-missing-repository -o vscode-hermes-agent-0.1.0.vsix
   ```

3. Install the extension:
   ```bash
   code --uninstall-extension hermes-agent.vscode-hermes-agent
   code --install-extension "E:\Hermes agent\vscode-hermes-agent-0.1.0.vsix" --force
   ```

## Usage

- **Chat**: Press `Ctrl+L` (or `Cmd+L` on Mac) to open the Hermes chat
- **Cascade Flow**: Press `Ctrl+Shift+L` (or `Cmd+Shift+L` on Mac) to open the cascade flow
- **New Session**: Press `Ctrl+Alt+N` (or `Cmd+Alt+N` on Mac) to start a new session
- **Inline Edit**: Select code and press `Ctrl+I` (or `Cmd+I` on Mac) to edit with Hermes

## Configuration

The extension supports the following configuration options:

- `hermes-agent.path`: Path to the hermes executable
- `hermes-agent.args`: Arguments passed to hermes to start the ACP server
- `hermes-agent.env`: Extra environment variables
- `hermes-agent.cwd`: Working directory for ACP sessions
- `hermes-agent.mcpServers`: MCP servers to pass into session/new
- `hermes-agent.yolo`: Pass --yolo to hermes acp (bypasses dangerous command approval prompts)
- `hermes-agent.checkpoints`: Enable filesystem checkpoints before destructive operations
- `hermes-agent.maxTurns`: Maximum tool-calling iterations per turn
- `hermes-agent.defaultMode`: Cascade Code (edits) vs Chat (questions) mode for new sessions
- `hermes-agent.terminalApprovePattern`: Glob of command patterns to auto-approve
- `hermes-agent.autoApprove`: Auto-accept permission requests at the host level
- `hermes-agent.statusBar.enabled`: Show the Hermes status bar item
- `hermes-agent.telemetry.enabled`: Send anonymous usage events to help improve the extension

## Development

### Building

```bash
# Build for production
node scripts/build.mjs --mode production

# Build for development with watch
node scripts/build.mjs --mode development --watch
```

### Testing

```bash
# Run tests
npx vitest run

# Run tests in watch mode
npx vitest
```

### Linting and Type Checking

```bash
# Lint
npx eslint src webview/src

# Format
npx prettier --write .

# Type check
npx tsc -p tsconfig.json --noEmit
npx tsc -p tsconfig.webview.json --noEmit
```

## License

MIT License

Copyright (c) 2026 Hermes Agent

## Contributing

Contributions are welcome! Please read our contributing guidelines for more information.