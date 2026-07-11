# tauri-react-template

Tauri v2 desktop application with React 19, TypeScript, and Vite.

## Tech Stack

- **Desktop Shell**: [Tauri v2](https://v2.tauri.app/)
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, [shadcn/ui](https://ui.shadcn.com/)
- **Routing**: React Router v7
- **Forms**: React Hook Form + Zod
- **Code Quality**: Biome, Lefthook, Ultracite

## Prerequisites

- [Bun](https://bun.sh/) (JavaScript runtime & package manager)
- [Rust](https://www.rust-lang.org/tools/install) (for Tauri)

## Getting Started

```bash
# Install dependencies
bun install

# Start the dev server
bun run dev

# Start the full Tauri desktop app in dev mode
bun run tauri dev
```

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Vite dev server |
| `bun run build` | Type-check and build the frontend |
| `bun run tauri dev` | Run the Tauri desktop app in dev mode |
| `bun run tauri build` | Build the Tauri production binary |
| `bun run check` | Run Biome lint & format check |
| `bun run fix` | Auto-fix Biome issues |
| `bun run typecheck` | Run TypeScript type checking |
| `bun run preview` | Preview the built frontend |

## Project Structure

```
├── src/                    # React frontend
│   ├── components/         # Shared UI components
│   │   └── ui/            # shadcn/ui components
│   ├── features/          # Feature modules
│   ├── routes/            # Page routes
│   ├── lib/               # Utility functions
│   ├── App.tsx            # Root app component
│   ├── main.tsx           # Entry point
│   ├── router.tsx         # Route definitions
│   └── provider.tsx       # Global providers
├── src-tauri/              # Tauri (Rust) backend
│   ├── src/main.rs        # Rust entry point
│   ├── icons/             # App icons
│   ├── capabilities/      # Permission capabilities
│   └── tauri.conf.json    # Tauri configuration
├── scripts/                # Build & utility scripts
├── docs/                   # Documentation
├── biome.jsonc            # Biome configuration
└── lefthook.yml           # Git hooks configuration
```

## Features

- **System Tray** — Show/hide/quit from the tray menu
- **Auto Updates** — Built-in updater plugin with minisign verification
- **Dark Mode** — Theme provider with system preference detection
- **Tauri Plugins** — Dialog, notifications, HTTP, shell, file system, and more

## License

MIT
