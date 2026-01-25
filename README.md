# Claude Terminal Manager

A cross-platform desktop application for managing multiple Claude Code terminal sessions with SSH remote access capability.

Built with Electron, React, and Tailwind CSS.

## Requirements

- Node.js 18+
- npm

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run package` | Build and package as distributable |

## Project Structure

```
claude-terminal-manager/
├── index.html              # HTML entry point
├── package.json            # Dependencies and scripts
├── vite.config.ts          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript config (renderer)
├── tsconfig.main.json      # TypeScript config (main process)
├── docs/
│   └── DESIGN.md           # Design document
└── src/
    ├── main/               # Electron main process
    │   ├── index.ts        # Main entry point
    │   └── preload.ts      # Preload script
    └── renderer/           # React frontend
        ├── App.tsx         # Main React component
        ├── main.tsx        # React entry point
        └── styles/
            └── globals.css # Global styles with Tailwind
```

## Tech Stack

- **Runtime**: Electron
- **Frontend**: React 18
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Language**: TypeScript

## Roadmap

See [docs/DESIGN.md](docs/DESIGN.md) for the full feature roadmap.
