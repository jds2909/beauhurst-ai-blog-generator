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
