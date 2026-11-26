### Errata · Viewing the line-by-line revision history for a file

`https://docs.github.com/en/repositories/working-with-files/using-files/viewing-and-understanding-files` · checked 2026-11-26 · Kane live · agent: Claude (Claude Code, /errata skill) · rewrite: claude-code (Claude Code CLI)

| | Step | Result |
|---|---|---|
| ⚪ | 1. Click to open the file whose line history you want to view. | not checkable: Covered by the start URL (a file in the repository). |
| 🟢 | 2. Above the file content, click Blame. | accurate |
| 🟢 | 3. To return to the raw code view, above the file content, click Code. | accurate |
| 🟡 | 4. If you are viewing a Markdown file, above the file content, you can also click Preview to return to the view with Markdown formatting applied. | drifted · fixed, proven in 1 loop(s) |

**2 of 3 checkable steps accurate** · 1 drifted (1 fixed and proven) · 0 broken · 115.7 Kane credits

<details><summary>What changed</summary>

**Step 4** 🟡

- Docs say: Preview
- Real path (found by Kane): Readme.md
- Proven rewrite: If you are viewing a Markdown file, click the file name, such as **Readme.md**, to return to the view with Markdown formatting applied.
- The doc's words no longer work. Kane found the real path; the rewrite passed a literal run in loop 1.
- Evidence: [literal run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M8BYHKQWW96FE8XYNJJHVW60/dashboard/share/US_FEWOZ0W2J551ZA5CYH4R4FLLSJBYOTNYONLNAVMQEG20G69X785X43LVBZZPPJ8S?type=summary&agentView=true&fqdn=summary-page) · [goal run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M8BYN85KDVC7MPA97AX0SZRW/dashboard/share/US_B409V3W23EIUKDN5PZA9CI2NRGM8G2ZQMBL59WQLTWYO7175YDM8K9J5I2AUYND2?type=summary&agentView=true&fqdn=summary-page) · [proof run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M8BYWPCBKVS9QPCBAXN34B84/dashboard/share/US_YX24A30J36OX9LW811FEVG0J0GU1H437WYW4F5JA2KP13MHX0ASK54W056C0TGGT?type=summary&agentView=true&fqdn=summary-page)

</details>