### Errata · Accessing the contributors graph

`https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-a-projects-contributors` · checked 2026-11-26 · Kane live · agent: Claude (Claude Code, /errata skill) · rewrite: claude-code (Claude Code CLI)

| | Step | Result |
|---|---|---|
| ⚪ | 1. On GitHub, navigate to the main page of the repository. | not checkable: Covered by the start URL (the repository's main page). |
| 🟢 | 2. Under your repository name, click Insights. | accurate |
| 🟢 | 3. In the left sidebar, click Contributors. | accurate |
| 🟡 | 4. Optionally, to view contributors during a specific time period, to the right of "Contributors," click Period: All. | drifted · fixed, proven in 1 loop(s) |

**2 of 3 checkable steps accurate** · 1 drifted (1 fixed and proven) · 0 broken · 135.2 Kane credits

<details><summary>What changed</summary>

**Step 4** 🟡

- Docs say: Period: All
- Real path (found by Kane): Period: Last 3 months
- Proven rewrite: Optionally, to view contributors during a specific time period, click **Period: Last 3 months**.
- The doc's words no longer work. Kane found the real path; the rewrite passed a literal run in loop 2.
- Evidence: [literal run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M8BWNN4Y98QRAWSC7RNBSBRT/dashboard/share/US_YJKNLORZNS91P8PKA058S5NPSG68Y3BBDGBVW7MD64YCFLYZ78ET0QXH7R5OM6EB?type=summary&agentView=true&fqdn=summary-page) · [goal run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M8BWS3Q3GHNS7SZRA7GCGWRC/dashboard/share/US_X3W3BSNVC8N2K4SVCKGSDJHOSGPMOCBVQ6AIZOT2UH80ROV3YSBBFSQNI46X4A96?type=summary&agentView=true&fqdn=summary-page) · [proof run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M8BWYY32G53K1BSFQ9WCKDPR/dashboard/share/US_SKKD88A4WSOZ0PMY5OR4PL1K5YP67X1DHEDB4SB5NX0FZ40AMOQ6JZI3HV6BAFUW?type=summary&agentView=true&fqdn=summary-page)

</details>