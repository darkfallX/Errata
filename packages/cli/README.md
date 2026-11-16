# errata-cli

**Every doc has errata. Find yours.**

Errata follows your tutorials word for word in a real browser with [Kane CLI](https://www.testmuai.com/kane-cli/). When a step no longer matches the product, Kane finds the real path, the agent rewrites the step, and Kane proves the rewrite before anyone sees it.

```bash
npm i -g @testmuai/kane-cli && kane-cli login   # Errata drives Kane CLI
npx errata-cli demo                              # bundled app + docs: accurate, drifted, broken (~9 min live)
npx errata-cli demo --replay                     # same, from recorded real Kane runs: no sign-in, no credits
```

## Two passes per step

| Pass | Kane mode | What it asks | What it tells us |
|---|---|---|---|
| **Literal** | `--mode action` | Click exactly these labels, in order | Do the **words** still work? |
| **Goal** (if Literal fails) | `--mode testing` | Reach the step's goal by any route | Is the **goal** reachable, and how? |

Literal passes → **accurate**. Literal fails, Goal passes → **drifted**: the route Kane took is the fix. Both fail → **broken**.

A drifted step is rewritten from the clicks in Kane's sealed evidence pack, using only labels Kane actually clicked, and Kane runs the rewrite literally to prove it. If the proof fails, Kane's reason goes back to the agent, for up to 3 loops.

## Commands

```bash
errata check <url | file.md | x.tutorial.json>...   # check tutorials
  --app <url>           # where the app runs (docs-as-code); fills {{app}}
  --crawl <n>           # with a URL: also check the first n tutorial pages it links to
  --agent claude|rules  # Claude (ANTHROPIC_API_KEY) or the offline rules agent
  --fail-on broken|drifted|none
  --parallel <n>        # independent steps checked at once (default 3)
  --replay <dir>        # play back recorded Kane runs
errata fix <report.json> [--pr]                       # apply proven rewrites (and open a PR with gh)
errata doctor                                         # Kane CLI, sign-in, agent
```

Outputs in `.errata/`: `reports/*.json`, `reports-md/*.md` (PR comment), `patches/*.diff`, `tests/*_test.md` (a Kane test of the fixed tutorial: `kane-cli testmd run <file>`), and `recordings/`.

Docs, the GitHub Action and the Claude Code skill: <https://github.com/errata-sh/errata>

MIT
