# Launch posts

Ready to post. The hackathon needs at least 2 public posts; save each post's link for the submission form.
Numbers are from `runs/2026-11-16` and `review.json`: 30 tutorials walked, 5 confirmed wrong steps, 3 fixes proven by Kane, 2 "needs a human", 2 false alarms (published).

Links
- Video: https://youtu.be/cjgjqvsVSbA
- Report: https://errata-nine.vercel.app/report/
- Repo: https://github.com/darkfallX/Errata
- npm: https://www.npmjs.com/package/errata-cli

---

## X (thread)

1/ "Click the Print/export link on the left sidebar."

You open Wikipedia. It's not there. The tutorial isn't lying, it's just old.

We built Errata: it follows tutorials word for word in a real browser, finds where they went wrong, and proves the fix. 🎥 https://youtu.be/cjgjqvsVSbA

2/ The trick is two passes per step, with Kane CLI by @testmuai.
Literal: click exactly what the doc says.
Goal: reach the same result, any route.
The gap between them is the bug. The route Kane took is the fix.

3/ Why two passes? A smart agent hides drift. Ask it to click a menu that moved and it finds another way and passes. Green test, wrong doc.

4/ Rewrites only use buttons Kane actually clicked, read from its sealed evidence pack. Then Kane runs the new step literally. No pass, no fix.

5/ We walked 30 public tutorials. Current GitHub Docs, Wikipedia Help and Grafana docs: accurate. Older tutorials: 5 real wrong steps, 3 fixes proven, 2 marked "needs a human". Our 2 false alarms are published too: https://errata-nine.vercel.app/report/

6/ Try it in 20 seconds, no sign-in:
npx errata-cli demo --replay

https://github.com/darkfallX/Errata #KaneCLI

---

## LinkedIn

Your tutorials are your onboarding funnel. When did you last follow one, word for word?

In a 202-developer survey at All Things Open 2025, 73% said the first thing they do with a new tool is try a quickstart or tutorial. If step three is wrong, you've lost them, and nobody on the team notices, because the team already knows the way and the tests check the product, not the words.

So I built Errata for the KaneCLI hackathon. It uses Kane CLI to walk each tutorial step in a real browser, twice:
→ Literal: click exactly what the doc says.
→ Goal: reach the same result by any route.
The gap between the two is the bug, and the route Kane took is the fix. Errata rewrites the step using only buttons Kane actually clicked, then Kane runs the new step to prove it.

I ran it on 30 public tutorials. The current docs (GitHub Docs, Wikipedia Help, Grafana) were all accurate. In older tutorials it found 5 real wrong steps and proved 3 fixes; for the other 2 it says "needs a human" instead of guessing. The 2 false alarms it raised are published with the reason.

🎥 Demo (4:49): https://youtu.be/cjgjqvsVSbA
📊 Report: https://errata-nine.vercel.app/report/
💻 Code: https://github.com/darkfallX/Errata
Try it, no sign-in: npx errata-cli demo --replay

#KaneCLI #DeveloperExperience #Documentation #DevRel #TestAutomation

---

## Hacker News (Show HN)

**Title:** Show HN: Errata – follow dev tutorials word for word in a real browser, find the drift

**Text:**

Docs drift quietly. A redesign moves "API Keys" under "Developers → Tokens", the quickstart still says Settings, and nobody notices, because the team knows the way and the tests check the product, not the words.

Errata checks the words. It walks a tutorial in a real browser with Kane CLI, twice per step:

- Literal pass: click exactly the labels the doc names, in order, nothing else.
- Goal pass, only if that fails: reach the step's goal by any route.

Literal passes → accurate. Literal fails, goal passes → drifted, and the route Kane took is the fix. Both fail → broken.

For drifted steps, the rewrite may only use labels Kane actually clicked, read from Kane's sealed evidence pack (not from anything a model says). Kane then runs the rewrite literally. A fix is proposed only once it passes.

Things that surprised us:
- A smart agent hides drift. Asked to click a menu item that moved, it finds another way and passes. So the two passes are the whole method.
- One button can have three names (visible text, element text, aria-label), and the matcher has to accept any of them.
- Our own scraper had paraphrased some quotes from the old tutorials. We now check every quote against the live page, fixed 15, and re-walked them.

Public run: 30 tutorials. Current docs from GitHub, Wikipedia Help and Grafana were accurate. A hunt through older tutorials found 5 real wrong steps, 3 with Kane-proven fixes, 2 marked "needs a human". Both false alarms are published with the cause: https://errata-nine.vercel.app/report/

Try it without signing in: `npx errata-cli demo --replay`. Video: https://youtu.be/cjgjqvsVSbA · Repo: https://github.com/darkfallX/Errata

---

## Reddit (r/technicalwriting, r/webdev)

**Title:** I built a tool that tests your docs, not your code

Docs-as-code teams test the product, but nothing tests that the words in the tutorial still match it. Errata walks each step literally in a real browser (Kane CLI). When a step no longer works, it finds the real path, rewrites the step, and proves the rewrite before proposing a patch. It runs as a CLI, a GitHub Action that comments on docs PRs, or a skill for your coding agent.

I ran it on 30 public tutorials: current docs were accurate; older ones had 5 real wrong steps, 3 fixed and proven, 2 left for a human. The report lists the false alarms too: https://errata-nine.vercel.app/report/

4-minute demo: https://youtu.be/cjgjqvsVSbA

Would love feedback from people who own docs: what would you need before you'd let this comment on your PRs?
