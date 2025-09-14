# Copilot Instructions for somatic-client-form

## Project Overview
This repository appears to be the starting point for a client-side form application, likely using JavaScript/TypeScript and Node.js tooling. The main code is expected in the `somatic-client-form/` subdirectory, which currently contains only a `package.json` file. The project is in an early or scaffolded state.

## Directory Structure
- `/somatic-client-form/` — Main application code (expand as project grows)
- `/README.md` — Project summary (currently empty)
- `/.github/copilot-instructions.md` — AI agent instructions (this file)

## Key Patterns & Conventions
- **Monorepo-style root:** All source code and dependencies are nested under `somatic-client-form/`.
- **Node.js conventions:** Use `npm` for dependency management and scripts. Add build/test scripts to `package.json` as the project evolves.
- **Private package:** The project is marked as `private` in `package.json` (no publishing to npm).

## Developer Workflows
- **Install dependencies:**
  ```bash
  cd somatic-client-form
  npm install
  ```
- **Add scripts:**
  Define build, test, and start commands in `package.json` as the codebase grows.
- **Source code location:**
  Place all implementation files (e.g., `src/`, `components/`, etc.) inside `somatic-client-form/`.

## AI Agent Guidance
- **Expand README.md:** Update with architecture, usage, and workflow details as the project matures.
- **Document new patterns:** When adding new directories or conventions, update this file with examples and rationale.
- **Reference key files:** As new files (e.g., `src/index.js`, `test/`, etc.) are added, document their purpose and usage here.

## Example: Adding a Component
If you add a React component:
- Place it in `somatic-client-form/src/components/`
- Document its usage and props in this file and in the README

---
**Iterate on these instructions as the project evolves.**
