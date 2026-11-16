### Errata · Viewing the line-by-line revision history for a file

`https://docs.github.com/en/repositories/working-with-files/using-files/viewing-and-understanding-files` · checked 2026-11-16 · Kane live · agent: Claude (Claude Code, /errata skill) · rewrite: rules (offline, deterministic)

| | Step | Result |
|---|---|---|
| ⚪ | 1. Click to open the file whose line history you want to view. | not checkable: Covered by the start URL (a file in the repository). |
| 🟢 | 2. Above the file content, click Blame. | accurate |
| 🟢 | 3. To return to the raw code view, above the file content, click Code. | accurate |
| 🟡 | 4. If you are viewing a Markdown file, above the file content, you can also click Preview to return to the view with Markdown formatting applied. | drifted · fixed, proven in 1 loop(s) |

**2 of 3 checkable steps accurate** · 1 drifted (1 fixed and proven) · 0 broken · 110.5 Kane credits

<details><summary>What changed</summary>

**Step 4** 🟡

- Docs say: Preview
- Real path (found by Kane): Readme.md
- Proven rewrite: Click **Readme.md**.
- The doc's words no longer work. Kane found the real path; the rewrite passed a literal run in loop 1.
- Evidence: [literal run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M7GTEBQMHYGJDFV5MNKMHZ3Q/dashboard/share/US_8G9IRLMT10OB9JH0YUMDXFBPKLACXO1CAR4PFFJ45U0HFQNE18LMCH0KVPSNHPHY?type=summary&agentView=true&fqdn=summary-page) · [goal run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M7GTK43JVHV7PRX98SSDQQ25/dashboard/share/US_IQZTLVIKP07QWAU008OYPVZ0DHZGFX0CNWGTMI3DNTR97OUS8UVPUF4NA5TF0BYJ?type=summary&agentView=true&fqdn=summary-page) · [proof run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M7GTSDZZ0Y3BGKBCVHTENJAN/dashboard/share/US_BLDWNEBCA9E6SD4C6VQA99KDW3R6YVID32630AR9UK7O3VGXJJ0HHVU0A2WG77DJ?type=summary&agentView=true&fqdn=summary-page)

</details>