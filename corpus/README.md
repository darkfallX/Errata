# The public run corpus

Real, public tutorials, walked word for word with Errata and Kane CLI.

## Selection rule

1. A published, click-by-click tutorial in a well-known product's own docs.
2. Every step can be done on the public site **without signing in** and **without writing data**: no forms submitted, no accounts created, nothing bought.
3. Steps are quoted **verbatim** from the doc page as it read on the extraction date. Icons are dropped from labels; nothing is reworded.
4. A step like "navigate to the main page of the repository" is satisfied by the start URL and marked **not checkable** (with that reason), never counted as passed.
5. A step that names no specific label ("click a label", "choose a time period") is marked **not checkable**: there are no words to follow literally.

GitHub Docs walkthroughs run against one public repository, [`expressjs/express`](https://github.com/expressjs/express). The rest run on the page each doc describes.

## Files

- `build-corpus.mjs`: the list itself, with every quote, goal and source URL. Run it to regenerate the files below.
- `tutorials/*.tutorial.json`: the extracted steps Errata walks.
- `tutorials.csv`: one row per tutorial.
- `run.mjs`: runs the corpus live (`node corpus/run.mjs`) and writes `runs/<date>/`.

## Who did what

- **Extraction**: Claude, in Claude Code via the `/errata` skill, read each page and wrote its `tutorial.json`. That's the skill path Errata supports for any coding agent.
- **Walking, finding real paths, proving**: Kane CLI, live, via Errata. Every run is recorded under `runs/<date>/recordings/`.
- **Rewrites**: Errata's rules agent, from the clicks in Kane's evidence pack only.
- **Review**: every drifted or broken step is checked against the live page and Kane's evidence, and the reviewer is named on each verdict (a first pass by Claude is marked as such until a person confirms it). Verdicts and reasons are in `runs/<date>/review.json` and published on the report, false alarms included.

## Run rules

- Pinned date; a few Kane runs at a time.
- Read-only steps only.
- Evidence packs stay on the machine that ran them (Kane's default); reports link each run's Test Manager page.
