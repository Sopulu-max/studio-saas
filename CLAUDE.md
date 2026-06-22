@AGENTS.md

## Session memory protocol

This project uses a Notion page as persistent memory. Follow this protocol every session without being asked.

### At the start of every session
1. Read the Notion Session Log using the Notion MCP tool:
- Page ID: `3591d701-ec1a-8162-b744-d5b5e4311db0`
- It is a top-level page in the workspace titled **Session Log**

This page contains: the current app state, all live modules, key code patterns, the active backlog (priority-ordered), and the history of what was built. Read it before writing any code, making any suggestions, or answering any questions about the project. If the Notion MCP is unavailable, ask the user to paste the current state.

2. Read the `docs/ARCHITECTURE.md` file using the `view_file` tool to understand the first-principles, context-driven architecture of the system.

Do this before writing any code, making any suggestions, or answering any questions about the project.

### At the end of every session
When the user says they are done, asks to push/commit, says goodbye, or when the work naturally winds down — before closing:

1. Append a new dated entry at the **top** of the SESSION ENTRIES section (newest first). Include: date, commit hashes if any, what was completed with file paths, what was fixed, anything still pending.
2. Update the **CURRENT STATE** section if any new modules or patterns were added.
3. Tick off completed items in **ACTIVE BACKLOG** and add any newly discovered ones.

Never delete anything from SESSION ENTRIES. Never skip the end-of-session update.
