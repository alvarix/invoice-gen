# Deploying invoice-gen to Vercel

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- The invoice-gen repo pushed to GitHub

## Step 1: Push to GitHub

If you haven't already created the repo:

```bash
cd ~/Sites/apps/invoice-gen
gh repo create invoice-gen --private --source=. --push
```

Or manually:

1. Create a new private repo on github.com
2. Add remote and push:

```bash
git remote add origin git@github.com:YOUR_USERNAME/invoice-gen.git
git push -u origin main
```

## Step 2: Import in Vercel

1. Go to vercel.com/new
2. Click "Import Git Repository"
3. Select the invoice-gen repo
4. Framework preset should auto-detect SvelteKit
5. Before clicking deploy, add environment variables (see Step 3)

## Step 3: Environment variables in Vercel

Add these in the Vercel project settings under Settings > Environment Variables:

| Variable | Value | Notes |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | Your Supabase project URL | Same as .env.local |
| `SUPABASE_SERVICE_KEY` | Your Supabase service role key | Same as .env.local |
| `APP_PASSWORD` | Choose a strong password | Can differ from local |
| `BREVO_API_KEY` | Your Brevo API key | Same as .env.local |
| `BREVO_SENDER_EMAIL` | Your verified Brevo sender email | Same as .env.local |
| `PUBLIC_BASE_URL` | `https://your-chosen-subdomain.vercel.app` | Set after first deploy, or use custom domain |

## Step 4: Custom domain (optional)

To run at `portal.alvarsirlin.dev` or similar:

1. In Vercel project: Settings > Domains
2. Add `portal.alvarsirlin.dev`
3. Vercel will give you a CNAME record to add
4. Add the CNAME in your DNS provider (wherever alvarsirlin.dev is managed)
5. Update `PUBLIC_BASE_URL` to `https://portal.alvarsirlin.dev`

## Step 5: Verify deployment

1. Visit the deployed URL - you should see the login page
2. Log in with your APP_PASSWORD
3. Confirm clients and invoices load from Supabase
4. Check a public invoice link works

---

## Email safety

The app has a built-in safeguard: the `sendEmail` action checks for `PUBLIC_BASE_URL` and refuses to send if it's not set. This means:

- Local dev (`npm run dev`): emails are blocked because `PUBLIC_BASE_URL` is not in `.env.local`
- Production: emails will send because you set `PUBLIC_BASE_URL` in Vercel

### Testing emails safely before going live

Option A - point all clients at yourself first:
Before adding real client emails, set every client's email to your own address in Supabase. Send test invoices to yourself. Once satisfied, update client emails to real addresses.

Option B - use a staging environment:
Vercel gives you preview deployments on every push/PR. These use the same env vars as production by default. To prevent accidental sends from previews:
1. In Vercel: Settings > Environment Variables
2. Set `PUBLIC_BASE_URL` only for the "Production" environment (uncheck Preview and Development)
3. Preview deploys will then block email sending, just like local dev

Option B is the safer approach.
