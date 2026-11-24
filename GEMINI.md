# Project Guidelines

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

## Pre-Commit Verification Workflow

Before committing any changes to the repository, you must verify the code passes all quality checks:

1. **Auto-Format Code**:
   ```bash
   npm run format
   ```
2. **Verify Types**:
   ```bash
   npm run typecheck
   ```
   Ensures zero compiler diagnostics or type errors (`tsc --noEmit`).
3. **Verify Formatting**:
   ```bash
   npm run format:check
   ```
   Ensures all files strictly adhere to Prettier rules.
4. **All-in-One Pre-Commit Check**:
   ```bash
   npm run check
   ```
   Executes both type checking and formatting verification in one step. Must exit with code 0 before code is committed.
