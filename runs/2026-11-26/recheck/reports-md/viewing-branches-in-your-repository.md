### Errata · Viewing branches in your repository

`https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-branches-in-your-repository/viewing-branches-in-your-repository` · checked 2026-11-26 · Kane live · agent: Claude (Claude Code, /errata skill) · rewrite: claude-code (Claude Code CLI)

| | Step | Result |
|---|---|---|
| ⚪ | 1. On GitHub, navigate to the main page of the repository. | not checkable: Covered by the start URL (the repository's main page). |
| 🟡 | 2. From the file tree view on the left, select the branch dropdown menu, then click View all branches. | drifted · fixed, proven in 1 loop(s) |
| 🟢 | 3. Active branches: The Active view shows all branches (excluding the default branch) that anyone has committed to within the last three months, ordered by the branches with the most recent commits first. | accurate |
| 🟢 | 4. All branches: The All view shows the default branch, followed by all other branches ordered by the branches with the most recent commits first. | accurate |

**2 of 3 checkable steps accurate** · 1 drifted (1 fixed and proven) · 0 broken · 118.2 Kane credits

<details><summary>What changed</summary>

**Step 2** 🟡

- Docs say: View all branches
- Real path (found by Kane): 23 Branches
- Proven rewrite: From the repository's main page, click **23 Branches**.
- The doc's words no longer work. Kane found the real path; the rewrite passed a literal run in loop 1.
- Evidence: [literal run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M8BX3VPJ9DDH9ST5YNZ1CNMV/dashboard/share/US_30WVSW3JA41U78KLAPYG6ASU4ATG1M58TSOE50IRY0KV4NG0KDJGWUP4AP3JZDCT?type=summary&agentView=true&fqdn=summary-page) · [goal run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M8BX75K2Z32QDSFVV1AHJ56W/dashboard/share/US_XXQC516AA3P1MDN8NBU2XAE2B1H5EM124912UY6UKQJ9T6W22UNMNF7WE8Q2LMNV?type=summary&agentView=true&fqdn=summary-page) · [proof run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M8BXCFX514P5QP7CYSCK0Z4C/dashboard/share/US_KM8L54NO4YCNHJDHXSK9CDVIYZ0CV4PY9K1OESI99UGHW3L49UPX03EEA8R0MPZB?type=summary&agentView=true&fqdn=summary-page)

</details>