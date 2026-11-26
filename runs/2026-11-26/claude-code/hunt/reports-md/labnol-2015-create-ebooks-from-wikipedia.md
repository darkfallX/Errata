### Errata · labnol (2015): Create eBooks from Wikipedia

`https://labnol.org/internet/create-wikipedia-ebooks/25491` · checked 2026-11-26 · Kane live · agent: Claude (Claude Code, /errata skill) · rewrite: claude-code (Claude Code CLI)

| | Step | Result |
|---|---|---|
| 🟡 | 1. Alternatively, you can open any Wikipedia page and choose Book Creator from the toolbox menu in the right sidebar. | drifted · needs a human |
| 🔴 | 2. Next browse to any Wikipedia page and click the “Add this page to your book” link to include that article into your ebook. | broken |

**0 of 2 checkable steps accurate** · 1 drifted (0 fixed and proven) · 1 broken · 178 Kane credits

<details><summary>What changed</summary>

**Step 1** 🟡

- Docs say: Book Creator
- Real path (found by Kane): Tools → Search → Search → Wikipedia:Books → Book Creator → Start book creator
- The doc's words no longer work and no rewrite passed a literal run in 3 loops. Needs a human; evidence attached.
- Evidence: [literal run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M8BQZE2R25G19YFN8HMG6G7T/dashboard/share/US_KO0P73800WPA5Q62T6Q7G92YFT6XRDZMCUNZGPV17KFC6GJFJA1OTG9K3IIGGPBB?type=summary&agentView=true&fqdn=summary-page) · [goal run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M8BR4K7PAXBSD5CAPHFJHWZ6/dashboard/share/US_ITS2UJWP9Z3QDIKFC58BDZT3WS8RNT9JU6EPQ6T8D9XCMOG13I6N0K6J5GQKC9QS?type=summary&agentView=true&fqdn=summary-page) · [proof run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M8BRYT5CT4HK5TGDVFD8YYAJ/dashboard/share/US_5IUD6YFQ3K67I8Z0FLBRSUSAYUJ9DWGZL4RCQTG6CU9TA8T49TBSN5XJ6SKZMK66?type=summary&agentView=true&fqdn=summary-page)

**Step 2** 🔴

- Docs say: Add this page to your book
- Real path (found by Kane): Tools → Save
- The goal can't be reached by any route Kane could find.
- Evidence: [literal run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M8BS4SSTZTV113ZQGMZ4HZ6X/dashboard/share/US_V1DVMCMNOB00A3P3W7HTLY87WWOIRQEK7VDUC4MAVU38OTENXD2FAGX7VA49KH6I?type=summary&agentView=true&fqdn=summary-page) · [goal run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M8BS8B1RTTN6WS83HZWZT2DN/dashboard/share/US_YPM0CUBTOFQB306189RJD1CCYBOYO4CN9YCZA3DAKNZ2RMSR363FGKTS76U7SPX7?type=summary&agentView=true&fqdn=summary-page)

</details>