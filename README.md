# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Local Gemini check

On Node 24 or later, copy `.env.example` to `.env.local` and set
`NUXT_GEMINI_API_KEY` to your Google AI Studio key. The file is ignored by Git.
`NUXT_GEMINI_MODEL` optionally overrides the default `gemini-3.5-flash-lite`.
Run `npm run check:gemini` from the project root. It makes one Gemini request
using selected facts from the fintech seed and prints the validated copy as JSON.
The check runs from the terminal and leaves the rendered fintech article alone.

Nuxt server code can call `generateArticleCopy` with the verified facts. The
service reads the key and model from private runtime config when no explicit
configuration is passed. Run `npm test` for the offline test suite.

## Local Supabase article check

1. Open the `beauhurst-ai-blog` project in Supabase. In SQL Editor, run
   [the articles migration](supabase/migrations/20261119000000_create_articles.sql) once.
2. Copy the project URL and a secret API key (`sb_secret_…`) into the existing
   Git-ignored `.env.local` as `NUXT_SUPABASE_URL` and `NUXT_SUPABASE_SECRET_KEY`.
3. Run `npm run check:articles`. Each run inserts one fictional healthtech article,
   retrieves it, and prints its blog path. The sample stays in the database.
4. Run `npm run dev -- --dotenv .env.local` and open the printed path on
   `http://localhost:3000`. Refresh the page, then try
   `/blog/unknown-article` to check the 404.

Nuxt uses the saved title and description for server-rendered metadata. Set
`NUXT_PUBLIC_SITE_URL` to the site's origin if you want canonical and Open Graph URLs.

## Generate an article from a CSV

With the Gemini and Supabase values in `.env.local` and the migration applied,
run `npm run dev -- --dotenv .env.local`. Open `http://localhost:3000`, enter an
industry name, and select a UTF-8 CSV of up to 1 MB with Company and Total Raised
columns. You can use `data/fintech_companies_seed.csv` to try the form. Select
**Generate Article** and refresh the generated URL to check the saved result.

Successful uploads publish directly at a shareable URL. Share only datasets
you intend to make public. Generated pages ask search engines to skip indexing.
The server caps concurrent generation requests per process, and the homepage
disables repeat submissions while a request is running. Anonymous callers can
still consume provider quota and create many public records over time.

The application writes each title and meta description from the industry and
verified company count. Gemini receives a bounded summary and writes the
introduction and sections using allowed placeholders for numeric facts. The
server substitutes the values before saving. These checks validate the values
and response structure. Editorial review is still needed to confirm that the
surrounding prose uses each fact correctly and stays within the dataset's scope.

## Deploy to Vercel

Import the GitHub repository into Vercel. Use the **Nuxt** framework preset,
the repository root and **Node.js 24.x**. Keep the default build settings so
Vercel runs the Nuxt server build. Nitro packages the SSR pages, API routes and
bundled fintech dataset in a Node function. The Vercel function limit is 60 seconds.

Set these project environment variables for **Production** before the first deployment.

| Variable | Value |
| --- | --- |
| `NUXT_GEMINI_API_KEY` | Gemini API key, stored as a Secret |
| `NUXT_GEMINI_MODEL` | `gemini-3.1-flash-lite`, the model used in live workflow tests |
| `NUXT_SUPABASE_URL` | URL of the Supabase project where the articles migration has been applied |
| `NUXT_SUPABASE_SECRET_KEY` | Supabase secret API key, stored as a Secret |
| `NUXT_PUBLIC_SITE_URL` | Stable HTTPS production origin, including the scheme |

If Vercel assigns the production domain after the initial deployment, set
`NUXT_PUBLIC_SITE_URL` and redeploy. Changes to environment variables apply to
new deployments.

For local artifact verification, run `npm run build` with `NITRO_PRESET=vercel`
in the process environment. The output is written to the Git-ignored
`.vercel/output` directory.
