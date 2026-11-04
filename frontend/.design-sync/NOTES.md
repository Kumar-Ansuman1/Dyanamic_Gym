# design-sync notes: Dynamic Gym

## How this repo builds for the converter

- `frontend/` is an app, not a published library. `npm run build:ds` (= `cfg.buildCmd`) produces `dist-ds/`: `tsc -p tsconfig.ds.json` (JS + .d.ts for `src/components/ui`, `src/lib`, `src/types`), then the Tailwind CLI compiles `.design-sync/ds-entry.css` → `dist-ds/styles.css` (= `cfg.cssEntry`).
- `package.json` `types`/`module` point at `dist-ds/components/ui/index.*`. That `types` field is how the converter finds the component list; without it you get `[ZERO_MATCH]`.
- Always pass `--entry ./dist-ds/components/ui/index.js` (there is no `node_modules/frontend`).
- Run everything from `frontend/`. On Windows, a shell whose cwd is inside `ds-bundle/` locks it, and the next build fails with `EBUSY ... rmdir`.
- `.ds-sync/` has `playwright@1.62.0` pinned to match the cached `chromium-1234` in `%LOCALAPPDATA%/ms-playwright`. Re-check the pin if that cache changes.

## Rendering

- Components are drawn for the panel-black ground. `Surface` is `cfg.provider` (with 24px padding); without it, off-white text renders invisible on the card's white page. The conventions header tells the design agent to wrap designs in `Surface` too.
- Tailwind only compiles classes it finds. Previews use inline styles with `var(--color-*)`, plus the `label-panel` and `tabular-nums` classes. `ds-entry.css` has `@source './previews'`, so any preview-only class still compiles, but only after `npm run build:ds`.
- The capture harness freezes the clock (dates render in May). Previews compute dates relative to "today", so captures stay deterministic.
- Wide cards use `cardMode: "column"`: ExpiryRow, Wordmark, DaysLeft, SegmentDisplay.

## Known render warns

- None at the end of the first sync (15/15 clean).

## Re-sync risks

- `cfg.dtsPropsFor` is hand-written for Button, TextField, SelectField, Segmented, ExpiryRow and Surface. The auto-extractor dropped native HTML props and the generic `T`, and left the `RenewPlan`/`RenewInput` references unresolved. Any prop change in those components must be mirrored here, or the design agent codes against a stale API.
- `.design-sync/conventions.md` lists token and class names (`--color-*`, `label-panel`, `tabular-nums`). Re-validate against `ds-bundle/_ds_bundle.css` whenever `src/index.css` tokens change.
- `dist-ds/` is gitignored: a fresh clone must run `npm install` and then `npm run build:ds` before the converter.
- Standalone Claude Design closes 2026-12-14; check where the project lives before the next sync after that date.
