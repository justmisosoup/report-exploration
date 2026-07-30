# Identity Intelligence

Implementation of the **Identity Intelligence** prototype from the Middesk
Claude Design project, restyled onto the **`@/core` product design system**
(the dashboard system from the `app` repo — Suisse Intl, `--core-*` tokens,
light chrome with scoped dark panels).

Three surfaces for one business (Vela Logistics, Inc.):

- **Intelligence** — ask-anything chat over identities, attributes, and the
  whole portfolio, with structured answers (connected businesses, link
  strength, risk paths, what to act on).
- **Identity** — the business record with a version timeline ("time machine"),
  business-identity risk meter, and policy Insights evaluated per question
  (pass / review / flag) from `src/policy.js`.
- **Network** — relationship network as a transit map with a highlighted risk
  path and the identity-over-time scrubber.

## Run

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # static build in dist/
```

## Design system

- `public/core-theme.css` — **copied verbatim from the app repo's
  `src/core/theme.css`** (the `--core-*` source of truth, scoped to
  `.core-theme`, light + `[data-theme="dark"]`). Don't edit it here; re-copy
  from the app repo when the system changes.
- `public/tokens.css` — the thin app layer: Suisse Intl font-faces, base
  element defaults, prototype keyframes, and app-semantic aliases (the
  five-tone risk ramp, `--app-font*`) defined **from** core tokens only.
- `public/fonts/` — Suisse Intl Regular/SemiBold + Suisse Intl Mono, same
  files the product app ships.
- Everything in `src/App.js` consumes `--core-*` tokens (or the aliases
  above); no raw hex, no legacy brand tokens. Like-for-like mappings:
  status/risk chips → core Badge family tokens, buttons → `core-action`
  (pill, compact), selected states → `--core-color-state-selected-*`,
  panels → `--core-radius-card` + `elevation-card`, nav → AppShell nav
  tokens, dark viz panels → the scoped dark theme
  (`class="core-theme" data-theme="dark"`).

## Structure

- `src/App.js` — the app, ported from the design prototype
  (`design/Identity Intelligence.dc.html`). One React class component;
  state persists to `localStorage` under `mid-iv`.
- `src/policy.js` — the evaluated policy questions (Insights) data module,
  loaded lazily.
- `design/` — the original Claude Design source files (pre-restyle, with the
  old marketing design system), kept for reference; not part of the app.

## Chrome

- The sidebar mirrors the app repo's `AppShell` nav: 58px brand header,
  Search… trigger (⌘K), 32px icon rows, and the entity ("Vela Logistics,
  Inc.") as a chevron **disclosure group** with Identity/Network sub-items —
  no eyebrow section labels. Hover/active states live in the `.app-nav-*`
  classes in `public/tokens.css` (all core tokens).
- The Intelligence composer follows the ask-anything pattern: input on top,
  action row below with a **Sources** dropdown (per-source toggles) at left
  and attach + circular send at right, on `@/core` ChatComposer chrome.

## Prototype knobs

`src/main.jsx` passes the prototype's defaults: `startDirection: 'A'`,
`startView: 'intelligence'`, `showRiskPath: true`. **The app always lands on
Intelligence at load**; direction/timeline/query state still persists per
browser via `localStorage`.
