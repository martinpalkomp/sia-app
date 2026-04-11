# SIA Project: Operational Rules

## STRICT RULE: UI MAP SYNCHRONIZATION
Every time you modify, move, add, or delete a UI element in the code, you MUST simultaneously update the corresponding entry in `src/data/uiMapManifest.ts`.

- If you add a button, add it to the manifest.
- If you move a card from Dashboard to Insights, update the view category in the manifest.
- The manifest must always reflect the current state of the filesystem.
