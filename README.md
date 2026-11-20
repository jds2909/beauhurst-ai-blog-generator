# Beauhurst AI Blog Generator

A Nuxt application for the Beauhurst Graduate/Junior Web Developer technical assessment. It turns company fundraising CSVs into server-rendered ranking articles with a company table, regional insights and SEO metadata.

[Public demo](https://beauhurst-ai-blog-generator.vercel.app/) · [Bundled fintech article](https://beauhurst-ai-blog-generator.vercel.app/blog/top-100-uk-fintech-companies)

The public Vercel demo uses `gemini-3.1-flash-lite`, which was tested successfully with multiple datasets. Assessors can generate articles without providing API keys. To try another industry, upload the [fictional UK gaming fixture](data/uk_gaming_companies_fixture.csv), enter **Gaming**, and select **Generate Article**.

## How it works

1. **Nuxt 4, Vue and TypeScript** provide the upload form, Nitro API routes and server-rendered article pages. The form submits the CSV and industry name to `POST /api/articles`.
2. **Papa Parse** parses the CSV on the server. TypeScript validation checks the headers, rows and GBP values. The server ranks companies by total raised, preserves CSV order for ties and calculates the total and median funding, company counts by region and the count of companies with no region.
3. **Google Gemini** writes the introduction and sections from a bounded summary of the dataset. The server builds the title and meta description, validates the structure of the generated copy and substitutes approved placeholders with calculated values.
4. **Supabase PostgreSQL** stores the copy, rankings and statistics together in a JSONB column. Nuxt retrieves the saved article by its unique URL (`/blog/<slug>`) and renders it with the shared article and ranking table components. The page includes a title, description and Open Graph metadata. Setting the site origin also enables canonical and Open Graph URLs.
5. **Vercel** hosts the Nuxt server build and supplies the provider credentials as server-side environment variables.

The bundled fintech article calculates its statistics from the [fintech seed CSV](data/fintech_companies_seed.csv) shipped with the app.

## Run locally

Use **Node.js 24.x (24.15.0 or later)** and npm. The committed lockfile pins the dependencies.

```sh
git clone https://github.com/jds2909/beauhurst-ai-blog-generator.git
cd beauhurst-ai-blog-generator
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000) and select the fintech article. These steps are sufficient to view it from a clean clone without Gemini or Supabase credentials.

### Configure article generation and storage

To generate articles locally, configure both Gemini and Supabase. Opening an already saved article only requires access to the Supabase project that stores it.

1. Create a Supabase project. In its **SQL Editor**, run the contents of [the articles migration](supabase/migrations/20261119000000_create_articles.sql) once. It creates `public.articles` with a unique slug, a JSONB content column and row-level security. The migration grants the service role access to read and insert rows.
2. Copy [`.env.example`](.env.example) to the Git-ignored `.env.local` in the project root. Run `cp .env.example .env.local` in a POSIX shell or `Copy-Item .env.example .env.local` in PowerShell.
3. Fill in the values below. Use the Supabase project URL and a secret API key from the same project. Keep both provider keys in private server configuration.

| Variable | Purpose |
| --- | --- |
| `NUXT_GEMINI_API_KEY` | Google AI Studio API key for generating article copy. |
| `NUXT_GEMINI_MODEL` | Set to `gemini-3.1-flash-lite` to match the tested deployment. The template specifies `gemini-3.5-flash-lite`, which is also the application's fallback when the variable is unset or blank. |
| `NUXT_SUPABASE_URL` | Supabase project origin, such as the placeholder in the template. |
| `NUXT_SUPABASE_SECRET_KEY` | Supabase secret API key for server-side reads and inserts. |
| `NUXT_PUBLIC_SITE_URL` | Optional absolute site origin for canonical and Open Graph URLs, such as `http://localhost:3000` locally. |

Stop the existing dev server and restart it with the configured file.

```sh
npm run dev -- --dotenv .env.local
```

## CSV format

Use a non-empty, comma-delimited UTF-8 `.csv` file with a header row, at least one company and a maximum size of 1 MiB (1,048,576 bytes). The industry name is required and limited to 100 characters.

| Required field | Accepted headers |
| --- | --- |
| Company name | `Company`, `Company Name` |
| Total fundraising | `Total Raised`, `Total Funding`, `Total Fundraising` |

Optional headers are `Region`, `Stage`, `Employees`, `Description`, `Website` and `Industries`. Separate multiple industries in a cell with semicolons. Column order is flexible and header matching ignores case and extra whitespace. Each row must match the header's field count. Duplicate headers and multiple aliases for the same field are rejected. Unrecognised columns are ignored.

Use non-negative GBP amounts with an optional pound sign and up to two decimal places. For example, `0`, `1250`, `1250.50` and `"£1,250.50"` are valid CSV values. Quote fields containing commas. Currency codes, other currencies, negative values and abbreviations such as `£1.2m` are rejected.

## Test and build

```sh
npm test
npm run build
npm run preview
```

The offline tests cover CSV validation, fundraising calculations and formatting, Gemini response validation, article storage and the generation workflow. To load provider settings for the production preview, use `npm run preview -- --dotenv .env.local`.

Two optional checks use `.env.local` and contact live services.

- `npm run check:gemini` makes one Gemini request using selected fintech facts and prints the validated copy.
- `npm run check:articles` inserts and reads back a fictional healthtech article, then prints its blog path. The sample stays in the database. Open the path in the configured local app to verify retrieval.

### Vercel deployment

For a separate deployment, import the repository into Vercel using the Nuxt preset, the repository root and Node.js 24.x. Use the default build settings and configure the variables above for Production. Set the public site URL to the stable HTTPS origin and redeploy after configuration changes. Nitro packages the server routes and bundled dataset in a Node function with a 60-second execution limit. A local build with `NITRO_PRESET=vercel` in the process environment writes the Vercel artifact to `.vercel/output`.

## Limitations and security

- Successful uploads publish immediately. The homepage lists only the bundled fintech article, so save your generated article's URL to revisit it. The `noindex` directive discourages search indexing. Anyone with the URL can still read the article and its company data, so upload only data you intend to publish.
- The public endpoint accepts anonymous submissions and limits generation to two concurrent requests per server process. Anonymous callers can still consume provider quota and create records over time.
- The upload is treated as the source of truth. Server checks validate figures and response structure. Review the generated prose for context and accuracy before sharing it. Generation depends on Gemini availability and quota, and saved articles depend on Supabase availability.
- Only the Nuxt server uses the provider keys. The migration blocks direct table access for anonymous and authenticated client roles. Keep local credentials in `.env.local` and deployment credentials in Vercel's server environment.
