# Blind review of every disagreement (26 Nov 2026)

Every step where Errata's word-for-word run and a goal-only run disagreed: the 4 flags in the public run and the 5 in the drift hunt. A separate AI agent (Claude Sonnet, fresh context) got only [`evidence.json`](evidence.json) (the sentence, Kane's two runs, the source URL) and was asked whether a careful reader would get stuck. It never saw our verdicts. It is not a human reviewer.

| id | Step | Blind reviewer | Our review |
|---|---|---|---|
| S1 | GitHub contributors graph, step 4 (**Period: All**) | UNSURE: could not see GitHub's buttons (they render with JavaScript) | real: checked in a browser on two repositories; the button reads **Period: Last 3 months** |
| S2 | GitHub branches, step 2 | TOOL: the dropdown must be opened first | false alarm |
| S3 | GitHub line-by-line history, step 4 | TOOL: started outside a Markdown file | false alarm |
| S4 | GitHub raw file, step 2 | TOOL: Errata required a page heading | false alarm |
| S5 | Dignited (2019), step 1 | REAL (milder: location changed) | real |
| S6 | How-To Geek (2010) book, step 1 | REAL (feature removed) | real |
| S7 | How-To Geek (2010) PDF, step 1 | REAL (milder) | real |
| S8 | labnol (2015), step 1 | REAL (feature removed) | real |
| S9 | SmartCompany (2011), step 1 | REAL (milder) | real |

Agreement: 8 of 9; the 9th it could not check.
