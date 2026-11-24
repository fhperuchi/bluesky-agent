# Bluesky Agent

An automated Bluesky / AT Protocol agent bot written in modern TypeScript, powered by [`@atproto/lex`](https://github.com/bluesky-social/atproto) and [`@atproto/lex-password-session`](https://github.com/bluesky-social/atproto).

The agent handles authenticated sessions, creates posts using typed AT Protocol lexicons, self-labels the account as a bot, and runs recurring posts on a configurable cron schedule.

---

## Features

- **AT Protocol Authentication**: Secure session management using `@atproto/lex-password-session`.
- **Type-Safe Lexicon Integration**: Built with `@atproto/lex` schemas (`app.bsky.feed.post`, `app.bsky.actor.profile`).
- **Bot Self-Labeling**: Automatically declares the account with the `bot` self-label (`com.atproto.label.defs#selfLabels`) to adhere to Bluesky platform etiquette.
- **Scheduled Automated Posts**: Background scheduling powered by `cron` (default: every 3 hours).
- **Modern ESM**: Native ECMAScript Modules with Node.js and TypeScript.

---

## Prerequisites

- **Node.js** (v20+ recommended)
- **npm** (or `pnpm` / `yarn`)
- A **Bluesky Account**
- A **Bluesky App Password** (create one at **Settings → Privacy & Security → App Passwords** in the Bluesky app; never use your main account password)

---

## Installation & Setup

1. **Clone the repository:**

   ```bash
   git clone git@github.com:fhperuchi/bluesky-agent.git
   cd bluesky-agent
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your Bluesky credentials:

   ```env
   BOT_PDS="https://bsky.social"
   BOT_HANDLE="your-handle.bsky.social"
   BOT_PASSWORD="xxxx-xxxx-xxxx-xxxx"
   ```

---

## How to Run

### Run the Agent

Start the agent directly:

```bash
npm start
```

_(Equivalent to running `npx tsx src/index.ts`)_

When started, the agent will:

1. Authenticate with your PDS using your app password.
2. Publish an initial post (`🙂`).
3. Apply the `bot` self-label to your Bluesky profile (preserving any existing profile data).
4. Keep running in the background, publishing a post every 3 hours according to the cron schedule (`0 */3 * * *`).

### Type Checking

Verify TypeScript compilation:

```bash
npm run typecheck
```

---

## Project Structure

```text
bluesky-agent/
├── src/
│   ├── index.ts           # Main bot logic (login, makePost, labelAsBot, cronJob)
│   └── lexicons/          # Generated AT Protocol TypeScript definitions
├── lexicons/              # AT Protocol lexicon JSON schemas
├── .env.example           # Example environment template
├── package.json           # Package metadata and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # Project documentation
```

---

## Customization

- **Post Content**: Edit `makePost()` in `src/index.ts` to customize text, facets, links, or media embeds.
- **Cron Schedule**: Modify `scheduleExpression` in `cronJob()` (`src/index.ts`) using standard cron syntax (e.g., `'0 */3 * * *'` for every 3 hours).

---

## License

ISC
