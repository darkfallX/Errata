# Draft PR for github/docs (not opened yet)

**Repository:** github/docs
**File:** `content/repositories/viewing-activity-and-data-for-your-repository/viewing-a-projects-contributors.md` (line 34)
**Title:** Contributors graph: the period button no longer reads "Period: All"

## Change

```diff
-1. Optionally, to view contributors during a specific time period, to the right of "Contributors," click **Period: All**. Then select a time period.
+1. Optionally, to view contributors during a specific time period, to the right of "Contributors," click the **Period** button (for example, **Period: Last 3 months**). Then select a time period.
```

## PR description

### Why

Step 4 of [Viewing a project's contributors](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-a-projects-contributors) tells readers to click **Period: All**. On the contributors graph today, that button reads **Period: Last 3 months**, and the page opens with `?from=` set to three months back. We saw this on `expressjs/express` and on a small personal repository (26 Nov 2026), so it looks like the default changed for every repository.

A reader looking for "Period: All" won't find it. The button is still in the same place; only its label changed.

### How we found it

A browser agent (Kane CLI) followed the sentence word for word and stopped: *"The run expected a control labeled 'Period: All,' but the page showed 'Period: Last 3 months' instead."* A second run, allowed to reach the goal by any route, clicked **Period: Last 3 months**, and a word-for-word run of that wording passed. Found with [Errata](https://github.com/darkfallX/Errata), which walks tutorials this way.

### The wording

The suggested text names the **Period** button and gives today's label as an example, so it stays correct if the default period changes again. A narrower alternative is "click **Period: Last 3 months**".

I've only changed this one line.
