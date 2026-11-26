# 26 Nov 2026: Claude Code as Errata's agent, live Kane

Errata ran with `--agent claude-code`: every rewrite was a headless Claude Code call (`claude -p`, Opus 5.5, no tools), and every failed Kane proof went back to it in the next call. Each report's `agent_calls` holds those calls word for word.

| Run | Command | Kane credits |
|---|---|---|
| Driftwood demo | `errata demo --agent claude-code` | 270 |
| 6 drift-hunt tutorials | `errata check corpus/tutorials/hunt-*.tutorial.json --agent claude-code --parallel 1` | 748 |

## Against the 16 Nov rules agent

- **Same fixes, clearer words.** Claude Code fixed the same 3 Wikipedia "Print/export → Tools" steps, each proven by Kane on loop 1, and kept the doc's context ("open the **Tools** menu to see the print and export options") instead of "Click **Tools**."
- **No new fixes.** How-To Geek's "Create a book" step still needs a human: the only route is typing a search, which a click-only literal run cannot prove.
- **One false fix, rejected.** How-To Geek book step 2 was judged after step 1 had already switched the book creator on, so a strange route got "proven". That is an Errata weakness with steps that continue from the previous one, not a docs error. See [`review.json`](review.json).
- **labnol: inconclusive.** Wikipedia's book creator state differed from the 17 Nov re-run; not counted either way.

The connection was slow and flaky during this run (Kane's account lookup failed several times before it started), so these take longer than the 16 Nov runs.
