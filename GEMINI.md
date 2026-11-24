# bluesky-agent Project Guidelines

## Tools & Environment

- Always use the `gh` binary (`/opt/homebrew/bin/gh`) for GitHub repository operations.

## Code Style & Formatting (TypeScript Industry Standards)

### 1. Prettier Formatting Configuration

Prettier is configured in `.prettierrc` according to TypeScript community standards:

- **Quotes**: Single quotes for strings (`'...'`), avoiding escaped quotes (`singleQuote: true`).
- **Semicolons**: Always required (`semi: true`) to avoid ASI (Automatic Semicolon Insertion) edge cases.
- **Indentation**: 2 spaces (`tabWidth: 2`, `useTabs: false`).
- **Trailing Commas**: Required on multi-line literals (`trailingComma: 'all'`) for clean git diffs.
- **Line Length**: 100 characters max (`printWidth: 100`).
- **Arrow Functions**: Always enclose parameters in parentheses (`arrowParens: 'always'`), e.g. `(arg: Type) => ...`.
- **Spacing**: Object literal bracket spacing enabled (`bracketSpacing: true`), e.g. `{ key: value }`.
- **Line Endings**: LF (`endOfLine: 'lf'`).

### 2. TypeScript Best Practices

- **Strict Typing**: The project enforces `strict: true` and `noUncheckedIndexedAccess: true`.
  - Never bypass compiler type checks using `any`; prefer explicit types, `unknown`, generics, or union types.
  - Do not suppress errors with `@ts-ignore`. If an external library typing is broken and unavoidable, use `@ts-expect-error` with a descriptive explanation comment.
  - Avoid non-null assertion operators (`!`) where possible; prefer type guards, optional chaining (`?.`), and nullish coalescing (`??`).
- **ESM & Imports**:
  - Node ESM resolution is active (`"module": "nodenext"`). Relative file imports must use the `.js` extension (e.g. `import * as app from './lexicons/app.js'`).
  - Use `import type { ... }` when importing types/interfaces to ensure clean separation from runtime values.
  - Group imports in order:
    1. Node.js built-ins (e.g. `process`, `path`)
    2. External third-party packages (e.g. `@atproto/lex`, `ai`)
    3. Internal project modules
- **Asynchronous Code**:
  - Always handle Promises explicitly with `async`/`await` and appropriate `try...catch` blocks.
  - Never leave unhandled floating Promises or unhandled rejections.
- **Code Cleanliness**:
  - Remove all unused variables, unused imports, temporary debugging logs (`console.log`), and dead code before committing.

## Git Pre-Commit Automation (Husky + lint-staged)

Git hooks are managed automatically using **Husky** (`.husky/pre-commit`) and **lint-staged**:

- **Automatic Execution**: Every `git commit` automatically triggers:
  1. `npm run typecheck` — project-wide TypeScript compiler diagnostic check (`tsc --noEmit`).
  2. `npx lint-staged` — runs Prettier on staged files (`*.ts`, `*.json`, `*.md`, etc.) and automatically re-stages them.
- **Manual Verification Commands**:
  - `npm run check` — runs full project type checking and formatting verification.
  - `npm run format` — formats all files across the repo.
