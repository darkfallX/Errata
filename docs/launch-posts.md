# Launch posts (drafts)

Not posted yet. Fill the `‹…›` blanks from `runs/<date>` after the public run and the review; never round up.
Required by the hackathon: at least 2 public posts. Save each post's link for the submission form.

---

## Hacker News (Show HN)

**Title:** Show HN: Errata – we followed ‹N› dev tutorials word for word with a browser agent

**Text:**

Docs drift quietly. A redesign moves "API Keys" under "Developers → Tokens", the quickstart still says Settings, and nobody on the team notices, because the team knows the way and the tests check the product, not the words.

Errata checks the words. It walks a tutorial in a real browser with Kane CLI, twice per step:

- Literal pass: click exactly the labels the doc names, in order, nothing else.
- Goal pass, only if that fails: reach the step's goal by any route.

Literal passes → accurate. Literal fails, goal passes → drifted, and the route Kane took is the fix. Both fail → broken.

For drifted steps, an agent rewrites the step using only labels Kane actually clicked, read from Kane's sealed evidence pack (not from anything the model says). Kane then runs the rewrite literally. A fix is proposed only once it passes.

Things that surprised us:
- A smart agent hides drift. Asked to click a menu item that moved, it will find another way and pass. So the two passes are the whole method.
- Asking the browser agent to "store the path you clicked" reads a value off the screen, not its history. We read the action log in the evidence pack instead.
- One button can have three names (visible text, element text, aria-label), and the matcher has to accept any of them.

Public run: ‹N› tutorials from ‹sites›, ‹X› with at least one wrong step. Every flag was reviewed and false alarms are listed: ‹link›

Try it without signing in: `npx errata-cli demo --replay` (recorded real runs). Live: `npx errata-cli demo`.

Repo: ‹github link› · Report: ‹site link›

---

## X (thread)

1/ Your docs say "Settings → API Keys". Your product moved it to "Developers → Tokens" six months ago. Nobody noticed. The tutorial is the bug.

We built Errata: it follows tutorials word for word in a real browser, finds the real path, and proves the fix. ‹GIF of the slip: struck step → real path → green rewrite›

2/ The trick: two passes per step with @testmuai's Kane CLI.
Literal: click exactly what the doc says.
Goal: reach the result by any route.
The gap between them is the bug.

3/ A smart agent hides drift: it finds another way and passes. So Errata makes it follow the words first.

4/ Fixes only use labels Kane actually clicked, read from Kane's sealed evidence pack. Then Kane runs the rewrite literally. No pass, no fix.

5/ We walked ‹N› real tutorials. ‹X› had at least one wrong step. Every flag reviewed, false alarms published: ‹report link›

6/ `npx errata-cli demo --replay`, no sign-in. Repo: ‹link› #KaneCLIHackathon

---

## Reddit (r/technicalwriting, r/webdev)

**Title:** We built a tool that tests your docs, not your code

Docs-as-code teams test the product, but nothing tests that the words in the tutorial still match it. Errata walks each step literally in a real browser (Kane CLI). When a step no longer works, it finds the real path, rewrites the step, and proves the rewrite before proposing a patch. It runs as a CLI, a GitHub Action that comments on docs PRs, or a Claude Code skill.

We ran it on ‹N› public tutorials: ‹summary›. The report lists every false alarm too: ‹link›. Would love feedback from people who own docs: what would you need before you'd let this comment on your PRs?

---

## LinkedIn (DevRel angle)

Your tutorials are your onboarding funnel. When did you last follow one, word for word?

In a 202-developer survey at All Things Open 2025, 73% said their first move with a new tool is a quickstart or tutorial (Catchy, Nov 2025). Drift in those pages is invisible to the people who wrote them.

We built Errata to catch it: it walks each tutorial step literally in a real browser with Kane CLI, finds the real path when a step drifts, and proves the fix. ‹N› public tutorials walked, ‹X› with a wrong step, false alarms published: ‹link›
