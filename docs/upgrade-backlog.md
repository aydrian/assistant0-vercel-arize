# Package Upgrade Backlog

These packages require manual migration work before upgrading. Each entry notes the effort level, breaking changes, and what needs updating in the codebase.

---

## COMPLETED

### ~~`next` 15.x → 16.x~~ ✓ Done
- Upgraded to `16.1.6` via `npx @next/codemod@canary upgrade latest`
- `eslint-config-next` and `@next/bundle-analyzer` bumped to `16.1.6`
- `src/middleware.ts` renamed to `src/proxy.ts` (`export default function proxy`)
- `next lint` removed; migrated to `eslint src/` via `next-lint-to-eslint-cli` codemod
- Flat ESLint config written to `eslint.config.mjs`

### ~~`eslint` 9.x → 10.x~~ ✓ Done
- Upgraded to `^10.0.0` alongside Next.js 16 upgrade
- Added `settings.react.version: "19"` to `eslint.config.mjs` (workaround for `eslint-plugin-react@7` / ESLint 10 context API incompatibility)

---

## Notes

- `engines.node` bumped to `>=20.9.0` (Node 18 dropped in Next.js 16)
- Bundle analysis now requires `--webpack` flag: `ANALYZE=true next build --webpack` (Turbopack is the default bundler in Next.js 16)
