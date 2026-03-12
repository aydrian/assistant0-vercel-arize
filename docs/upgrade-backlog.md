# Package Upgrade Backlog

These packages require manual migration work before upgrading. Each entry notes the effort level, breaking changes, and what needs updating in the codebase.

---

## HIGH EFFORT

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

- `eslint` + `eslint-config-next` upgrades are **blocked on next 15 → 16** migration.
- All other packages listed above are fully independent and can be tackled in any order.
