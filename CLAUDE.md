# CLAUDE.md

ONLYOFFICE Docs plugin "AI Auto Fill" (`asc.{6A95DA5C-857E-4C26-B00B-34876F1EEAD8}`). It fills PDF form fields with data from a host backend, and uses the editor's AI to map fields to data keys. It runs entirely in the browser inside the editor. There is no server part. See HANDOVER.md for context, history and the manual test checklist.

## Commands

```bash
make install-tools   # npm i -g terser html-minifier-terser (one-time)
make                 # = make build: clean, copy, minify into build/ (gitignored)
make test            # smoke tests: node --test tests/*.test.js (Node >= 18, no npm deps)
make clean
```

There is no dev server. To run it, serve the repo (or `build/`) over HTTP and point a Document Server 9.2.0+ editor config at it (`plugins.pluginsData` - `config.json`, plus `plugins.options` with `code` and `callback`). See README.md "For End Users" and `docs/third-party-integration.md`. In practice it is tested through the Pipedrive connector (`onlyoffice-pipedrive`, submodule at `backend/services/gateway/assets/aiautofill`).

## Layout

- `config.json`: plugin manifest (guid, `version`, `minVersion`, `EditorsSupport: ["word"]`, `store` block).
- Pages, which navigate with `window.location.href` and pass state through `localStorage`:
  - `index.html`: start panel. Runs the signed-form check and AI availability polling, then detect - fetch - AI map.
  - `form.html`: review/edit the suggested values, then Apply.
  - `revert.html`: success screen with "Cancel autofill".
  - `confirm.html` and `rconfirm.html`: modal windows (`Asc.PluginWindow`) for apply and revert.
- `scripts/`: one IIFE per file, each attaching to `window.Autofiller.*`. There are no modules and no bundler.
  - `extractor.js`: callback fetch and code rotation.
  - `library.js`: `Editor` helpers and the AI prompt (`Prompts`).
  - `mapper.js`: key extraction and AI response parsing.
  - `form.js`: form services and the review page controller.
  - `storage.js`, `event.js`, `utils.js`, `utils/theme.js`.
  - `fields/`: per-type handlers in a registry.
    - `detect.js` `collectForms` runs document-side.
    - `text.js` is the default handler. `boolean.js`, `radio.js` and `complex.js` handle the other types.
    - `constraints.js` validates values against format, mask, length and list constraints.
- `components/`: `Loader`, `Form`, `ConfirmModal`, `RevertModal`.
- `translations/`: 13 locales. Keys are the English source strings, and `langs.json` lists the locales.
- `vendor/`: jQuery 3.7.1 and select2 4.0.6-rc.1, committed as-is.
- `tests/smoke.test.js`: loads the real scripts into `node:vm` with fake `Asc`/`Api`/`fetch`.

## Conventions

- New script file: add a `<script>` tag to **every page that needs it** (index.html, form.html and sometimes revert.html), in dependency order. `fields/registry.js` must load before the handlers. Also add the file to `SCRIPTS` in `tests/smoke.test.js`.
- New field type: write a handler with `match`/`enrich`/`apply` and optional `getTargets`/`normalizeStored`, then `FieldTypes.register(...)`. Register it before `text.js` only if it needs to beat the default.
- Functions passed to `Asc.plugin.callCommand` (e.g. `collectForms`, the body in `restoreFields`) are **serialized and run in the document context**. They cannot use closures or `window.Autofiller`. Pass data via `Asc.scope` and use only the `Api.*` document API.
- New UI string: add the English text as the key to **all 13** `translations/*.json` files. `make test` checks that the key sets match.
- localStorage keys are namespaced as `autofiller_*`. Use `StorageManager('autofiller')`.
- Every source file keeps the Ascensio System SIA Apache-2.0 header.
- Gitflow. Branches are `feature/*`, `fix/*`, `release/x.y.z` and `hotfix/x.y.z`. PRs go into `develop`, and `master` holds releases only. Commits use conventional style (`fix(form): ...`).

## Don'ts

- Never send data **values** to the AI. Only field identifiers and data keys may go there. This is a product promise in the README, and a test asserts it.
- Don't change the plugin `guid`. Hosts reference it in `autostart` and `options`.
- Don't add npm runtime dependencies or a bundler without agreement. Pipedrive CI builds the plugin with just `make install-tools && make`.
- Don't bump `version` in only one place. `config.json` and the top entry of `CHANGELOG.md` must match, because CI tags from CHANGELOG.
- Don't put any version-like number (`x.y`) above the first `## x.y.z` heading in CHANGELOG.md. The CI grep takes the first match.
- Don't remove `store` or `icons` from `config.json`. They were added in the 1.1.1 hotfix.
- Don't commit `build/` or secrets. Codes are issued at runtime by the host.
