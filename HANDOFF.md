# IEP Pal — Tech Handoff

**GitHub repo:** https://github.com/ncarrara28/IK-Advocate  
**Repo owner:** Nick Carrara (`ncarrara28`)  
**Internal tool for Interactive Kids BCBA team.**  
NJ Special Education advocacy reference, AI chat, IEP timeline calculator, document generator, and advocacy log.

---

## What this is

A standalone single-page web application. No framework, no build step. One HTML file + a small Azure serverless function that proxies calls to the Anthropic (Claude) API. Deployed to Azure Static Web Apps, backed by a GitHub repository.

---

## Project structure

```
iep-pathfinder/
│
├── index.html                  ← The entire app (HTML + CSS + JS, self-contained)
│
├── staticwebapp.config.json    ← Azure SWA security headers + optional auth config
├── .gitignore
├── HANDOFF.md                  ← this file
│
└── api/                        ← Azure Functions API (Node.js, no npm packages)
    ├── host.json               ← Functions runtime config
    ├── package.json            ← Node 18+ declaration
    └── advocate/
        ├── function.json       ← HTTP POST binding → route: /api/advocate
        └── index.js            ← Receives messages from browser, calls Anthropic API
```

**Key rule:** The Anthropic API key is **never** in source code. It lives only in Azure App Settings (environment variable). `index.js` reads it from `process.env.ANTHROPIC_API_KEY` at runtime.

---

## How the AI call works

```
Browser (index.html)
  └── POST /api/advocate  { messages: [...], system: "..." }
        ↓
  Azure Function (api/advocate/index.js)
        ↓  reads ANTHROPIC_API_KEY from Azure App Settings
  Anthropic API (api.anthropic.com/v1/messages)
        ↓
  Response flows back to browser
```

The browser never touches the API key. The function is the only thing that knows it.

---

## One-time setup: GitHub → Azure

### Step 1 — The GitHub repository already exists

The repo is at: **https://github.com/ncarrara28/IK-Advocate**  
It was created by Nick and has one existing commit (a README). No action needed here.

### Step 2 — Push the project to GitHub

The repo already has a commit, so use `--allow-unrelated-histories` to merge cleanly.

Open a terminal in `C:\Users\Chuck\nj-advocate\` and run these commands **one at a time**:

```bash
git init
git add .
git commit -m "Add IEP Pal app"
git branch -M main
git remote add origin https://github.com/ncarrara28/IK-Advocate.git
git pull origin main --allow-unrelated-histories -m "Merge initial repo"
git push -u origin main
```

After this, all files are live in GitHub at https://github.com/ncarrara28/IK-Advocate

### Step 3 — Create the Azure Static Web App

1. Go to [portal.azure.com](https://portal.azure.com)
2. Search for **Static Web Apps** → click **Create**
3. Fill in:
   - **Subscription:** your existing IK subscription
   - **Resource Group:** `rg-nick-dashboard` (reuse existing) or create `rg-ik-advocate`
   - **Name:** `ik-advocate`
   - **Plan type:** Free
   - **Region:** East US 2 (or match your existing resources)
4. Under **Deployment details:**
   - Source: **GitHub**
   - Click **Sign in with GitHub** if prompted
   - Organization / account: `ncarrara28`
   - Repository: `IK-Advocate`
   - Branch: `main`
5. Under **Build details:**
   - Build Preset: **Custom**
   - App location: `/`
   - Api location: `api`
   - Output location: *(leave blank)*
6. Click **Review + create** → **Create**

Azure will automatically commit a GitHub Actions workflow file into the repo and trigger the first deployment. Takes about 60–90 seconds.

### Step 4 — Add the Anthropic API key

This is the most important step. Without it, the AI chat will not work.

1. In the Azure portal, go to your new **Static Web App** (`ik-advocate`)
2. Left sidebar → **Configuration**
3. Under **Application settings**, click **+ Add**
4. Set:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-...` (your Anthropic API key)
5. Click **OK** → **Save**

The function app will restart automatically and pick up the key.

---

## Ongoing deployment workflow

Every push to `main` auto-deploys in ~60 seconds. No manual steps needed after initial setup.

```
Edit files locally
    ↓
git add . && git commit -m "description"
    ↓
git push
    ↓
GitHub Actions runs (~60 sec)
    ↓
Live at your Azure URL
```

Your live URL will be something like:
`https://<random-name>.azurestaticapps.net`

You can set a custom domain in the Azure portal under **Custom domains** if needed.

---

## Optional: Lock access to Interactive Kids Microsoft accounts

Right now the app has no login — anyone with the URL can access it. Since this is an internal tool, you may want to restrict it to IK Microsoft (Entra) accounts.

Replace the contents of `staticwebapp.config.json` with:

```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "openIdIssuer": "https://login.microsoftonline.com/98a447d0-f30a-42a5-a45c-02054864159f/v2.0",
        "clientIdSettingName": "AZURE_CLIENT_ID",
        "clientSecretSettingName": "AZURE_CLIENT_SECRET"
      }
    }
  },
  "routes": [
    { "route": "/login", "redirect": "/.auth/login/aad", "statusCode": 302 },
    { "route": "/logout", "redirect": "/.auth/logout", "statusCode": 302 },
    { "route": "/*", "allowedRoles": ["authenticated"] }
  ],
  "globalHeaders": {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer"
  }
}
```

Then add `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET` to Azure App Settings (same place as the Anthropic key) — copy these values from the existing `nick-dashboard` app registration in Azure AD, or create a new one. Loop Chuck in for this step.

---

## How data is stored

There is **no database**. All user data (chat sessions, saved documents, advocacy log) is stored in the browser's `localStorage` under the key `iep_pathfinder_v1`. 

- Data is per-browser, per-device
- Nothing is sent to a server except the AI messages
- Clearing browser data will erase saved sessions and documents
- There is no cross-device sync

This is intentional — no PHI should be entered, so there is no need for server-side storage.

---

## AI model

The app uses **Claude Sonnet 4** (`claude-sonnet-4-6`) via the Anthropic API.

- `max_tokens: 1500` per response
- System prompt is embedded in `index.html` (search for `SYSTEM_PROMPT`)
- Model can be changed in `api/advocate/index.js` — look for the `model:` field

---

## Making changes

All UI, logic, and the AI system prompt are in **`index.html`**. There is no build step.

| What you want to change | Where |
|---|---|
| App title / branding | `index.html` — search `IEP Pal` |
| AI system prompt | `index.html` — search `SYSTEM_PROMPT` |
| Document template prompts | `index.html` — search `TEMPLATES` array |
| NJ timeline reference data | `index.html` — search `NJ_TIMELINES` array |
| AI model or max_tokens | `api/advocate/index.js` |
| Security headers | `staticwebapp.config.json` |
| Auth / access control | `staticwebapp.config.json` |

---

## Troubleshooting

**AI chat returns an error message**
→ The Azure Function isn't reaching Anthropic. Check:
1. `ANTHROPIC_API_KEY` is set in Azure App Settings (Configuration tab)
2. The `api/` folder deployed correctly — check the GitHub Actions log in your repo under Actions tab
3. The function route is `/api/advocate` — verify in the Azure portal under Functions

**Changes aren't showing up after push**
→ Check the Actions tab in GitHub: https://github.com/ncarrara28/IK-Advocate/actions  
If the workflow failed, the error message will be there.

**Data disappeared**
→ Browser localStorage was cleared, or a different browser/device is being used. Data is local-only by design.

---

## Key contacts

| Role | Person | Account |
|---|---|---|
| GitHub repo owner | Nick | ncarrara28 · ncarrara@interactivekids.com |
| Azure / deployment | Chuck | cmccue@interactivekids.com |
| Anthropic API key | Chuck | (Anthropic console login) |
| Clinical owner | Nick | ncarrara@interactivekids.com |

---

*Built May 2026. No external dependencies. No database. No framework.*
