### Errata · Driftwood quickstart

`~\Music\Errata\runs\2026-11-26\claude-code\demo\demo\quickstart.md` · checked 2026-11-26 · Kane live · agent: claude-code (Claude Code CLI)

| | Step | Result |
|---|---|---|
| 🟢 | 1. Open the Driftwood dashboard and click Projects. | accurate |
| 🟡 | 2. Click Settings → API Keys and press Create key. | drifted · fixed, proven in 1 loop(s) |
| ⚪ | 3. Copy the key into your `.env` file as `DRIFTWOOD_KEY`. | not checkable: Editing a local .env file happens outside the browser. |
| 🟢 | 4. Open Team and click Invite member. | accurate |
| 🟡 | 5. Go to Settings → Billing and open Invoices. | drifted · fixed, proven in 1 loop(s) |
| 🔴 | 6. Open Reports and click Export CSV. | broken |

**2 of 5 checkable steps accurate** · 2 drifted (2 fixed and proven) · 1 broken · 269.9 Kane credits

<details><summary>What changed</summary>

**Step 2** 🟡

- Docs say: Settings → API Keys → Create key
- Real path (found by Kane): Developers → Tokens → New token
- Proven rewrite: Click **Developers** → **Tokens** and press **New token**.
- The doc's words no longer work. Kane found the real path; the rewrite passed a literal run in loop 1.
- Evidence: [goal run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M8BJVBCQRNABQQVJQDYJ0S4J/dashboard/share/US_EIIVIYKXBT8CESKTJGE14KEGPR5ID3H5WKR2BMAERFWJMLNHXUR60JF6S7XJIPIV?type=summary&agentView=true&fqdn=summary-page) · [proof run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M8BK2EB3VSF2QBMXAJXJ2SA3/dashboard/share/US_NCHT1QTQ36F90AZUL2M5BJ6S1RO3OLSF4N12ZAELFY5Z07FC231STUBMI0X2BTAX?type=summary&agentView=true&fqdn=summary-page)

**Step 5** 🟡

- Docs say: Settings → Billing → Invoices
- Real path (found by Kane): Settings → Account → Billing history
- Proven rewrite: Go to **Account** → **Billing history**.
- The doc's words no longer work. Kane found the real path; the rewrite passed a literal run in loop 1.
- Evidence: [literal run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M8BJXN0QPWXZBSNKFDWZH5K6/dashboard/share/US_R5RVMKSJY7X6VEBR6YNAS3ZIDM6QUI2HZ89TRO5IFRE3B2F715Y0GTI3UJ5KR2W0?type=summary&agentView=true&fqdn=summary-page) · [goal run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M8BK15D8V6NCBCZEHSSKDTSJ/dashboard/share/US_MWSU9XXUUC0QT93HUB8D6OW7519LQ9PMSSOC4GOQIROSIYRHSR61OMWVRZ83HAPD?type=summary&agentView=true&fqdn=summary-page) · [proof run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M8BK7HV13V06YNJGE1BR9GNH/dashboard/share/US_S8RRNQW037BCIGZFVBXZ6YRR9KCFI8XLLKZFJOIEESMDAWJE1X1P1PB61JSQBROH?type=summary&agentView=true&fqdn=summary-page)

**Step 6** 🔴

- Docs say: Reports → Export CSV
- Real path (found by Kane): Reports → Account → Settings → Developers → Projects → Team → Dashboard → Account → billing history → Account → Profile → Developers → Tokens → Webhooks → Settings → Appearance
- The goal can't be reached by any route Kane could find.
- Evidence: [literal run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M8BK01V953BD1C0PBEWAJ2QR/dashboard/share/US_71MYNJP3PAS3PFMMQELC95I67WJ3HJNCDB9SCA7NLV5GQBU35AI3Q52RZV57UK52?type=summary&agentView=true&fqdn=summary-page) · [goal run](https://test-manager.lambdatest.com/projects/01M7GPR4WEAG287QY8865MNHXP/test-cases/01M8BK435H0SFBETH1HM291PZ2/dashboard/share/US_S3DBO4BIP72TUQY739STRP90GHCNYCMUN15KJCK79PQU8EJFKZL83A5I29JJX8ZM?type=summary&agentView=true&fqdn=summary-page)

</details>

```diff
===================================================================
--- a/runs/2026-11-26/claude-code/demo/demo/quickstart.md	
+++ b/runs/2026-11-26/claude-code/demo/demo/quickstart.md	
@@ -6,8 +6,8 @@
 
 1. Open the Driftwood dashboard and click **Projects**. <!-- goal: The Projects list is visible -->
-2. Click **Settings** → **API Keys** and press **Create key**. <!-- goal: A form to create a new API key or token is visible -->
+2. Click **Developers** → **Tokens** and press **New token**. <!-- goal: A form to create a new API key or token is visible -->
 3. Copy the key into your `.env` file as `DRIFTWOOD_KEY`.
 4. Open **Team** and click **Invite member**. <!-- goal: A form to invite a new member by email is visible -->
-5. Go to **Settings** → **Billing** and open **Invoices**. <!-- goal: A list of past invoices with dates and amounts is visible -->
+5. Go to **Account** → **Billing history**. <!-- goal: A list of past invoices with dates and amounts is visible -->
 6. Open **Reports** and click **Export CSV**. <!-- goal: A CSV export of the reports is ready to download -->
```