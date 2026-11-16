// The public run corpus: real, public, no-sign-in tutorials, quoted word for word.
//   node corpus/build-corpus.mjs   → corpus/tutorials/*.tutorial.json + corpus/tutorials.csv
//
// Selection rule (also in corpus/README.md):
//   1. A published, click-by-click tutorial on a well-known product's own docs.
//   2. Every step can be done on the public site without signing in, and without writing data
//      (no forms submitted, no accounts, no purchases).
//   3. Steps quoted verbatim from the doc page on 16 Nov 2026. Icons dropped from labels; nothing reworded.
//   4. "Navigate to the main page of the repository" is satisfied by the start URL and marked as such.
//
// Extraction: done by Claude (in Claude Code, via the /errata skill) reading each page. Errata + Kane CLI
// then walk every step literally. Rewrites come from the rules agent, using only labels Kane clicked.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = "https://github.com/expressjs/express";
const NAV = { quote: "On GitHub, navigate to the main page of the repository.", text: "On GitHub, navigate to the main page of the repository.", goal: "The repository's main page is open", labels: [], checkable: false, skip_reason: "Covered by the start URL (the repository's main page)." };
const INSIGHTS = { quote: "Under your repository name, click **Insights**.", text: "Under your repository name, click Insights.", goal: "The repository's Insights page is visible", labels: ["Insights"], checkable: true };

const step = (quote, goal, labels, extra = {}) => ({ quote, text: quote.replace(/\*\*/g, ""), goal, labels, checkable: true, ...extra });
const then = (quote, goal, labels, extra = {}) => step(quote, goal, labels, { continues: true, ...extra });

const T = [
  {
    id: "gh-view-releases",
    title: "Viewing releases",
    source: "https://docs.github.com/en/repositories/releasing-projects-on-github/viewing-your-repositorys-releases-and-tags",
    start_url: REPO,
    steps: [NAV, step("To the right of the list of files, click **Releases**.", "The repository's Releases page is visible", ["Releases"]), then("At the top of the Releases page, click **Releases**.", "The list of published releases with release notes is visible", ["Releases"])],
  },
  {
    id: "gh-view-tags",
    title: "Viewing tags",
    source: "https://docs.github.com/en/repositories/releasing-projects-on-github/viewing-your-repositorys-releases-and-tags",
    start_url: REPO,
    steps: [NAV, step("To the right of the list of files, click **Releases**.", "The repository's Releases page is visible", ["Releases"]), then("At the top of the page, click **Tags**.", "A list of the repository's tags is visible", ["Tags"])],
  },
  {
    id: "gh-contributors",
    title: "Accessing the contributors graph",
    source: "https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-a-projects-contributors",
    start_url: REPO,
    steps: [NAV, INSIGHTS, then("In the left sidebar, click **Contributors**.", "The contributors graph for the repository is visible", ["Contributors"]), then("Optionally, to view contributors during a specific time period, to the right of \"Contributors,\" click **Period: All**.", "A menu for choosing a time period is open", ["Period: All"])],
  },
  {
    id: "gh-dependency-graph",
    title: "Viewing the dependency graph",
    source: "https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/exploring-the-dependencies-of-a-repository",
    start_url: REPO,
    steps: [NAV, INSIGHTS, then("In the left sidebar, click **Dependency graph**.", "The repository's dependency graph, listing its dependencies, is visible", ["Dependency graph"]), then("Optionally, to view the repositories and packages that depend on your repository, under \"Dependency graph\", click **Dependents**.", "A list of repositories and packages that depend on this repository is visible", ["Dependents"])],
  },
  {
    id: "gh-pulse",
    title: "Accessing Pulse",
    source: "https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-a-summary-of-repository-activity",
    start_url: REPO,
    steps: [NAV, step("Under your repository name, click **Insights**.", "The Pulse overview of recent repository activity is visible", ["Insights"]), then("Optionally, to choose a different time period, select the **Period** dropdown menu in the upper-right corner of the Pulse overview.", "A menu for choosing the Pulse time period is open", ["Period"])],
  },
  {
    id: "gh-network-graph",
    title: "Accessing the network graph",
    source: "https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/understanding-connections-between-repositories",
    start_url: REPO,
    steps: [NAV, INSIGHTS, then("In the left sidebar, click **Network**.", "The repository's network graph of branches and forks is visible", ["Network"])],
  },
  {
    id: "gh-forks",
    title: "Accessing the forks page",
    source: "https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/understanding-connections-between-repositories",
    start_url: REPO,
    steps: [NAV, INSIGHTS, then("In the left sidebar, click **Forks**.", "A list of the repository's forks is visible", ["Forks"]), then("Optionally, to sort the list by most starred forks, most recently updated forks, most open issues, or most open pull requests, click **Sort**, then choose an option from the dropdown menu.", "A menu of sort options for the forks list is open", ["Sort"])],
  },
  {
    id: "gh-commits-graph",
    title: "Accessing the commits graph",
    source: "https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/analyzing-changes-to-a-repositorys-content",
    start_url: REPO,
    steps: [NAV, INSIGHTS, then("In the left sidebar, click **Commits**.", "A graph of commits to the repository over time is visible", ["Commits"])],
  },
  {
    id: "gh-code-frequency",
    title: "Accessing the code frequency graph",
    source: "https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/analyzing-changes-to-a-repositorys-content",
    start_url: REPO,
    steps: [NAV, INSIGHTS, then("In the left sidebar, click **Code frequency**.", "A code frequency graph of additions and deletions is visible", ["Code frequency"])],
  },
  {
    id: "gh-view-branches",
    title: "Viewing branches in your repository",
    source: "https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-branches-in-your-repository/viewing-branches-in-your-repository",
    start_url: REPO,
    steps: [
      NAV,
      step("From the file tree view on the left, select the branch dropdown menu, then click **View all branches**.", "The repository's branches page is visible", ["View all branches"]),
      then("**Active branches:** The **Active** view shows all branches (excluding the default branch) that anyone has committed to within the last three months, ordered by the branches with the most recent commits first.", "The Active view of branches is shown", ["Active"]),
      then("**All branches:** The **All** view shows the default branch, followed by all other branches ordered by the branches with the most recent commits first.", "The All view of branches is shown, starting with the default branch", ["All"]),
    ],
  },
  {
    id: "gh-activity-view",
    title: "Using the activity view to see changes to a repository",
    source: "https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/using-the-activity-view-to-see-changes-to-a-repository",
    start_url: REPO,
    steps: [NAV, step("On the main page of the repository, to the right of the list of files, click **Activity**.", "The repository's activity view, listing pushes and merges, is visible", ["Activity"]), then("To filter by activity type, select the **All activity** dropdown menu, then click an activity type.", "A menu of activity types is open", ["All activity"])],
  },
  {
    id: "gh-filter-labels",
    title: "Filtering issues and pull requests by labels",
    source: "https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/filtering-and-searching-issues-and-pull-requests",
    start_url: REPO,
    steps: [NAV, step("Under your repository name, click **Issues** or **Pull requests**.", "The repository's list of issues is visible", ["Issues"]), then("Above the list of issues or pull requests, click **Labels**.", "The repository's list of labels is visible", ["Labels"]), then("In the list of labels, click a label.", "A list of issues filtered by one label is visible", [], { checkable: false, skip_reason: "Names no specific label to follow." })],
  },
  {
    id: "gh-workflow-runs",
    title: "Viewing workflow run history",
    source: "https://docs.github.com/en/actions/how-tos/monitor-workflows/view-workflow-run-history",
    start_url: REPO,
    steps: [NAV, step("Under your repository name, click **Actions**.", "The repository's list of workflow runs is visible", ["Actions"])],
  },
  {
    id: "gh-raw-file",
    title: "Viewing or copying the raw file content",
    source: "https://docs.github.com/en/repositories/working-with-files/using-files/viewing-and-understanding-files",
    start_url: `${REPO}/blob/master/index.js`,
    steps: [
      { ...NAV, quote: "Click the file that you want to view.", text: "Click the file that you want to view.", goal: "A file is open", skip_reason: "Covered by the start URL (a file in the repository)." },
      step("In the upper-right corner of the file view, click **Raw**.", "The file's raw content is shown as plain text", ["Raw"]),
    ],
  },
  {
    id: "gh-blame",
    title: "Viewing the line-by-line revision history for a file",
    source: "https://docs.github.com/en/repositories/working-with-files/using-files/viewing-and-understanding-files",
    start_url: `${REPO}/blob/master/Readme.md`,
    steps: [
      { ...NAV, quote: "Click to open the file whose line history you want to view.", text: "Click to open the file whose line history you want to view.", goal: "A file is open", skip_reason: "Covered by the start URL (a file in the repository)." },
      step("Above the file content, click **Blame**.", "A line-by-line blame view, with code grouped by commit, is visible", ["Blame"]),
      then("To return to the raw code view, above the file content, click **Code**.", "The file's code view is shown again", ["Code"]),
      then("If you are viewing a Markdown file, above the file content, you can also click **Preview** to return to the view with Markdown formatting applied.", "The Markdown file is shown with formatting applied", ["Preview"]),
    ],
  },
  {
    id: "wp-page-history",
    title: "Help:Page history",
    source: "https://en.wikipedia.org/wiki/Help:Page_history",
    start_url: "https://en.wikipedia.org/wiki/Ada_Lovelace",
    steps: [
      step("To view the history of a page, use the tab labeled \"**View history**\" at the top of the page.", "The article's revision history list is visible", ["View history"]),
      then("To compare a revision with the revision before it, click \"**prev**\" on that entry.", "A comparison of one revision with the revision before it is visible", ["prev"]),
    ],
  },
  {
    id: "osm-export",
    title: "OpenStreetMap: Export",
    source: "https://wiki.openstreetmap.org/wiki/Export",
    start_url: "https://www.openstreetmap.org/#map=16/51.5074/-0.1278",
    steps: [step("Use the **export** button in the top bar to open the export sidebar to get OpenStreetMap XML data for an area.", "The export sidebar with a bounding box for the current area is visible", ["Export"])],
  },
  {
    id: "wp-download-pdf",
    title: "Help:Download as PDF",
    source: "https://en.wikipedia.org/wiki/Help:Download_as_PDF",
    start_url: "https://en.wikipedia.org/wiki/Ada_Lovelace",
    steps: [
      step("Open the **Tools** drop-down menu in the top navigation bar, below the page name.", "The Tools menu is open, showing page tools", ["Tools"]),
      then("In the Print/export section, select \"**Download as PDF**\".", "A page offering to download the article as a PDF is shown", ["Download as PDF"]),
    ],
  },
  {
    id: "wp-what-links-here",
    title: "Help:What links here",
    source: "https://en.wikipedia.org/wiki/Help:What_links_here",
    start_url: "https://en.wikipedia.org/wiki/Ada_Lovelace",
    steps: [step("Within the **Tools** section at the top-right of every page, click \"**What links here**\".", "A list of pages that link to the article is shown", ["Tools", "What links here"])],
  },
  {
    id: "wp-permanent-link",
    title: "Help:Permanent link",
    source: "https://en.wikipedia.org/wiki/Help:Permanent_link",
    start_url: "https://en.wikipedia.org/wiki/Ada_Lovelace",
    steps: [step("A permalink can be made by clicking \"**Permanent link**\" in the sidebar's toolbox.", "The page is shown at a permanent link to its current revision (the address includes oldid)", ["Permanent link"])],
  },
  {
    id: "wp-page-information",
    title: "Help:Page information",
    source: "https://en.wikipedia.org/wiki/Help:Page_information",
    start_url: "https://en.wikipedia.org/wiki/Ada_Lovelace",
    steps: [step("A link to \"**Page information**\" is in the **Tools** panel on the desktop site.", "The page information page for the article is shown", ["Tools", "Page information"])],
  },
  {
    id: "grafana-explore",
    title: "Grafana fundamentals: Explore",
    source: "https://grafana.com/tutorials/grafana-fundamentals/",
    start_url: "https://play.grafana.org/",
    steps: [step("Click the menu icon and, in the sidebar, click **Explore**.", "Grafana's Explore view for querying a data source is shown", ["Explore"])],
  },
  {
    id: "grafana-dashboards",
    title: "Grafana fundamentals: Dashboards",
    source: "https://grafana.com/tutorials/grafana-fundamentals/",
    start_url: "https://play.grafana.org/",
    steps: [step("Click the menu icon and, in the sidebar, click **Dashboards**.", "A list of Grafana dashboards is shown", ["Dashboards"])],
  },
  {
    id: "plausible-filter",
    title: "Plausible: Filtering the dashboard",
    source: "https://plausible.io/docs/filters-segments",
    start_url: "https://plausible.io/plausible.io",
    steps: [step("Click on the **Filter** button, open **Location** and select **Country**.", "A control for choosing which countries to filter the dashboard by is shown", ["Filter", "Location", "Country"])],
  },
  // ── Set B: the drift hunt (added 16 Nov 2026). Older third-party tutorials, chosen BECAUSE they are
  // likely out of date. The selection is deliberately biased: these numbers say nothing about docs in general.
  {
    id: "hunt-htg-wikipedia-pdf",
    set: "hunt",
    title: "How-To Geek (2010): Wikipedia article to PDF",
    source: "https://www.howtogeek.com/27882/create-an-ebook-or-pdf-from-wikipedia-articles-for-offline-reading/",
    start_url: "https://en.wikipedia.org/wiki/Ada_Lovelace",
    steps: [
      step("In the left sidebar, click \"**Print/export**.\"", "The article's print and export options are shown", ["Print/export"]),
      then("Click \"**Download as PDF**.\"", "A page offering to download the article as a PDF is shown", ["Download as PDF"]),
    ],
  },
  {
    id: "hunt-htg-wikipedia-book",
    set: "hunt",
    title: "How-To Geek (2010): Make a book from Wikipedia articles",
    source: "https://www.howtogeek.com/27882/create-an-ebook-or-pdf-from-wikipedia-articles-for-offline-reading/",
    start_url: "https://en.wikipedia.org/wiki/Ada_Lovelace",
    steps: [
      step("In the left sidebar, under \"**Print/export**,\" click \"**Create a book**.\"", "Wikipedia's Book creator page is shown", ["Print/export", "Create a book"]),
      then("On the Book creator page, click \"**Start book creator**.\"", "The book creator is on, offering to add the current page to a book", ["Start book creator"]),
    ],
  },
  {
    id: "hunt-dignited-wikipedia-pdf",
    set: "hunt",
    title: "Dignited (2019): Export a Wikipedia page as a PDF",
    source: "https://dignited.com/44778/how-to-export-a-wikipedia-page-as-a-pdf",
    start_url: "https://en.wikipedia.org/wiki/Ada_Lovelace",
    steps: [step("In the left sidebar, find the section labeled \"**Print/export**.\" Under that section, click \"**Download as PDF**\" from the list.", "A page offering to download the article as a PDF is shown", ["Print/export", "Download as PDF"])],
  },
  {
    id: "hunt-smartcompany-wikipedia-pdf",
    set: "hunt",
    title: "SmartCompany (2011): Convert Wikipedia articles into PDF files",
    source: "https://www.smartcompany.com.au/startupsmart/convert-wikipedia-articles-into-pdf-files/",
    start_url: "https://en.wikipedia.org/wiki/Ada_Lovelace",
    steps: [step("On the left hand side of the screen, you should see a link that says \"**Print/Export**\". Click it, then select \"**Download as PDF**\".", "A page offering to download the article as a PDF is shown", ["Print/Export", "Download as PDF"])],
  },
  {
    id: "hunt-labnol-wikipedia-book",
    set: "hunt",
    title: "labnol (2015): Create eBooks from Wikipedia",
    source: "https://labnol.org/internet/create-wikipedia-ebooks/25491",
    start_url: "https://en.wikipedia.org/wiki/Ada_Lovelace",
    steps: [
      step("Open any article and pick \"**Book Creator**\" from the toolbox menu in the right sidebar.", "Wikipedia's book creator is on for this article", ["Book Creator"]),
      then("Click the \"**Add this page to your book**\" link.", "The current article is added to a book", ["Add this page to your book"]),
    ],
  },
  {
    id: "hunt-vancouvereditor-cite",
    set: "hunt",
    title: "Vancouver Editor (2011): How to cite a Wikipedia page",
    source: "https://blog.vancouvereditor.com/2011/10/how-to-cite-wikipedia-page.html",
    start_url: "https://en.wikipedia.org/wiki/Ada_Lovelace",
    steps: [step("Look for \"**Tools**\" on the left side of the page and click on \"**Cite this page**.\"", "A page with ready-made citations for the article is shown", ["Tools", "Cite this page"])],
  },
];

mkdirSync(join(here, "tutorials"), { recursive: true });
const rows = [["id", "title", "source", "start_url", "steps", "checkable"]];
for (const t of T) {
  const tut = {
    title: t.title,
    source: t.source,
    start_url: t.start_url,
    extracted_by: "Claude (Claude Code, /errata skill)",
    extracted_at: "2026-11-16",
    set: t.set ?? "docs",
    steps: t.steps.map((s, i) => ({ n: i + 1, ...s })),
  };
  writeFileSync(join(here, "tutorials", `${t.id}.tutorial.json`), JSON.stringify(tut, null, 2) + "\n");
  rows.push([t.id, t.title, t.source, t.start_url, String(t.steps.length), String(t.steps.filter((s) => s.checkable).length)]);
}
writeFileSync(join(here, "tutorials.csv"), rows.map((r) => r.map((c) => (/[",]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n") + "\n");
console.log(`${T.length} tutorials, ${T.reduce((a, t) => a + t.steps.filter((s) => s.checkable).length, 0)} checkable steps`);
