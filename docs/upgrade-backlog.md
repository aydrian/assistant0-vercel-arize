# Package Upgrade Backlog

These packages require manual migration work before upgrading. Each entry notes the effort level, breaking changes, and what needs updating in the codebase.

---

## HIGH EFFORT

### `zod` 3.x → 4.x
- **Breaking**: Error customization API overhauled; `.catch()`/`.default()` behavior on optional object keys changed.
- **Impact**: Schema definitions used throughout tools, RAG pipeline, and form validation. `drizzle-zod` and `zod-to-json-schema` both need v4-compatible releases simultaneously.
- **Work**:
  - Audit every `z.object()`/`.parse()`/`.safeParse()` call across `src/`
  - Update error handling where Zod error shapes are inspected
  - Upgrade `drizzle-zod` to `^0.8.x` (already uses Zod v4 types)
  - Upgrade `zod-to-json-schema` to its Zod v4-compatible release

### `next` 15.x → 16.x
- `eslint-config-next` and `@next/bundle-analyzer` must be bumped to 16.x in lockstep.
- **Work**:
  - Run `npx @next/codemod@latest` migration script
  - Review App Router API changes
  - Verify middleware and headers behavior
  - Note: `next lint` is already deprecated in 15.x; migrate to ESLint CLI first (`npx @next/codemod@canary next-lint-to-eslint-cli .`)

---

## LOW EFFORT

### `eslint` 9.x → 10.x
- Must be done together with `eslint-config-next` upgrade to Next.js 16.x.
- **Work**: Blocked on `next` 15 → 16 upgrade (see above).

---

## Notes

- `drizzle-zod` upgrade is **blocked on zod 3 → 4** migration (drizzle-zod@0.8.x uses Zod v4 types).
- `eslint` + `eslint-config-next` upgrades are **blocked on next 15 → 16** migration.
- All other packages listed above are fully independent and can be tackled in any order.
