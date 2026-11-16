---
name: errata
description: Check that tutorials and docs still match the product UI, using Errata and Kane CLI. Use after changing UI labels, menus, navigation or flows, or when the user asks whether docs, a quickstart or a tutorial are still accurate. Finds drifted and broken steps, rewrites drifted ones from the real path Kane found, and proves each rewrite in a real browser.
---

# Errata: check the docs after a UI change

You changed the product. Errata checks whether the docs still describe it, word for word, in a real browser.

## When to run

- You renamed, moved or removed a menu item, tab, button, link or page.
- The user asks "are the docs still right?", "check the quickstart", or similar.
- Before opening a PR that touches navigation or UI copy.

## Steps

1. **Find the docs that could be affected.** Search the repo's docs (`docs/`, `*.md`, `*.mdx`) for the old labels you changed. List the tutorials that mention them.
2. **Make sure the app is running locally** (or ask for the preview URL). Note its URL.
3. **Check Kane CLI is ready:** `npx errata-cli doctor`. If not signed in, ask the user to run `kane-cli login`. Never ask for or type their access key.
4. **Run Errata** on each affected tutorial:
   ```bash
   npx errata-cli check docs/quickstart.md --app http://localhost:3000
   ```
   Steps run in parallel in a headless browser. Each finishes as:
   - accurate: the doc's exact words still work
   - drifted: the words fail but the goal is reachable; Kane reports the real path
   - broken: the goal can't be reached by any route
   - not checkable: shell or file steps, which are stated plainly and never claimed as passed
5. **Read the report** at `.errata/reports/<tutorial>.json` (or the `.md` version next to it).
6. **For drifted steps with a proven rewrite**, apply the fix:
   ```bash
   npx errata-cli fix .errata/reports/<tutorial>.json
   ```
   This changes only steps whose rewrite passed a literal Kane run. Show the user the diff.
7. **For broken steps**, don't paper over them. Tell the user what Kane could not reach and why (from `goal_pass.one_liner`). Either the feature was removed (update the doc by hand, with the user's call) or it's a product bug.
8. **Report back** in one short table: step · verdict · what changed. Link the patch.

## Rules

- Never invent UI labels in docs. Errata's rewrites only use labels Kane actually clicked; keep it that way when you edit by hand.
- Don't claim a step is verified unless Errata marked it accurate or proven.
- Kane runs cost credits (~20 per run). Check only the tutorials your change could affect.
