# HANDOVER: AI Auto Fill plugin

Current release: **1.1.1** (tag `v1.1.1`). Repository: `github.com/ONLYOFFICE/plugin-aiautofill`.

Day-to-day commands and conventions are in [CLAUDE.md](CLAUDE.md).

---

## 1. Integration type

- **This is an embedded plugin, not a service.** It is a static HTML/JS ONLYOFFICE Docs editor plugin (type `panel`, `EditorsSupport: ["word"]`). It runs in an iframe inside the editor. It has no backend, no database and no secrets of its own.
- **ONLYOFFICE products:**
  - **Docs (Document Server) 9.2.0+.** `minVersion` in `config.json` is confirmed as the real minimum. PDF forms open in the `word` editor type, as configured.
  - **The ONLYOFFICE AI plugin** must be enabled with at least one model that supports the *Chat* action. The plugin never calls an LLM directly. It uses `executeMethod('AI', [{type:'Actions'}])` to check availability and `executeMethod('AI', [{type:'Chat', data}])` to run the mapping. The model and provider are whatever the user configured in the AI plugin.
  - Editor APIs used:
    - methods: `IsFormSigned`, `GetFormValue`, `SetFormValue`, `StartAction`/`EndAction`, `CloseWindow`
    - `callCommand` with `Api.GetDocument().GetAllForms()`
    - `Asc.PluginWindow` for the modal windows
    - `plugins.js`/`plugins-ui.js` loaded from `onlyoffice.github.io/sdkjs-plugins/v1/`
- **Host:** the only consumer is the **Pipedrive connector** (`ONLYOFFICE/onlyoffice-pipedrive`). It is not published in any marketplace.
  - In that repo, the plugin is a git submodule at `backend/services/gateway/assets/aiautofill`, currently pinned to v1.1.1.
  - Pipedrive CI runs `make install-tools && make` in the submodule. The gateway embeds `aiautofill/build` and serves it at `/plugins/aiautofill/*`.
  - The connector puts the plugin into the editor config: `autostart` for ONLYOFFICE PDF forms, plus `options.code` and `options.callback`.
  - The callback is `GET /api/data?code=...`. It returns deal, person, organization and product data. Codes are one-time and stored in Mongo with a 30-day TTL. That code lives in the Pipedrive repo.
- **Host contract** (full spec: `docs/third-party-integration.md`):
  - `GET {callback}?code={code}` - `{ "data": {...}, "code": "<next code>" }`.
  - Every response must return a new code. The plugin stores it in `localStorage` (`autofiller_refresh_code`) and uses it on the next fetch.
  - If the host passes a different `options.code` than the one remembered in `autofiller_original_code`, the stored codes are dropped and the new one is used.
  - The callers wrap the fetch in a 5 s timeout.

## 2. Main features (user scenarios)

1. **Open panel and pre-checks** (`index.html`):
   - If the form is signed, it shows a "signed" error.
   - If there are no form fields, it shows a "no fields" error with Retry.
   - If no AI model is available, it shows a "model" error.
   - AI availability is polled every 1 s, and the Autofill button enables or disables live.
2. **Autofill**: detect fields - fetch host data - check AI - map with AI.
   - Field detection (`fields/detect.js`):
     - Covers text, checkbox, radio groups (merged by group key) and complex fields.
     - Complex fields made of digit boxes of ≤3 chars become one "thousands" field.
     - Picture and signature fields are skipped.
     - Generic names (`Text1`, `field2`, …) are filtered out.
   - Field identifier = form key, falling back to tag, then tip, then placeholder.
   - **Only field identifiers and data keys** (dot paths; arrays use the first element) are sent to the AI. Data values never are.
3. **Review** (`form.html`):
   - Each field has a checkbox and a select2 dropdown of candidate values. There can be several candidates for multi-key mappings or array data.
   - "Open file location" jumps to the field.
   - Restart re-runs the mapping.
   - Values are pre-validated against the field constraints: digit/letter format, mask, regExp, allowed symbols, char limit, list values, date parse. Invalid candidates are dropped, and a field with no valid candidate is hidden.
4. **Apply**:
   - A confirm modal opens (`confirm.html`).
   - The plugin stores the original values (`autofiller_original_data`), then sets new values per handler. Radio sets the matching choice. Complex splits the digits across boxes from the right.
   - The editor shows a blocking action while this runs.
5. **Revert** (`revert.html` + `rconfirm.html`): "Cancel autofill" restores the original values document-side through `callCommand`. Empty values clear the field.
6. **Theming and i18n**: follows the editor theme (light/dark and named themes) and has 13 locales.

## 3. Build

- Toolchain:
  - GNU make
  - Node.js with global `terser` and `html-minifier-terser` (`make install-tools`). Versions are **not pinned**; whatever npm installs is used.
  - Node ≥ 18 for `make test`.
- `make` cleans `build/`, copies `scripts components vendor translations resources styles *.html config.json`, then minifies JS in `scripts/` and `components/` and the top-level HTML. `vendor/` is copied unminified, including the select2 docs folder.
- There is no package.json, lockfile, bundler or transpiler. The code is plain ES2020 that runs directly in the browser.
- **No private repos or dependencies.** `plugins.js`/`plugins-ui.js` load at runtime from the public ONLYOFFICE CDN. jQuery and select2 are vendored.
- Running locally means hosting the folder over HTTP and wiring it into a Document Server editor config. See README.md "For End Users". The realistic environment is the Pipedrive connector with the submodule pointed at your branch.
- There is no CI build or test. GitHub Actions only handle tags and releases.

## 4. Publishing

- **No marketplaces.** The plugin is not in the ONLYOFFICE plugin marketplace (`onlyoffice.github.io`) or anywhere else. It ships only by embedding into the Pipedrive connector.
- The `store` block and icons in `config.json` are there so it is marketplace-ready (added in 1.1.1). Keep them.
- A "release" therefore means:
  1. Merge to master.
  2. GitHub runs `create-tag.yml`, which tags `v<top CHANGELOG version>`. `release.yml` then creates the GitHub release with the top CHANGELOG section as notes. This is confirmed fully automatic.
  3. **Manual step:** the plugin maintainer bumps the submodule in `onlyoffice-pipedrive` and opens a PR there. That connector then has its own release process.

## 5. Implicit knowledge (why it's like this)

| Thing | Why / rule |
|---|---|
| No modules or bundler; IIFEs on `window.Autofiller`; scripts listed per page | The plugin is served as static files from the host. Keeping it dependency-free keeps the Pipedrive build to `make`. **Script order in each HTML matters.** The registry loads before handlers, and `text.js` is the default handler. |
| Multi-page navigation (`location.href`) + `localStorage` handoff (`form_fields`, `selected_data`, `original_data`, `theme`, codes) | Each step is a separate page inside the same plugin iframe. State has to survive navigation. `form_fields` is *popped* on load, so a reload of `form.html` loses it by design and goes back to the start. |
| `callCommand` functions (`collectForms`, restore body) | Serialized and executed in the document context. No closures and no `window.Autofiller`. Data goes in via `Asc.scope`. Keep them ES5-safe and defensive (`form.GetX ? form.GetX() : ...`), because API availability differs between field types and versions. |
| Only keys go to the AI | A privacy promise to users (README "How the value matching works"). It also keeps prompts small. Covered by a smoke test. |
| `DEFAULT_RE` in `library.js` | Fields auto-named by the editor (`Text1`, `Field3`) carry no meaning and confused the model. They are excluded from mapping. |
| `[System: Respond directly…]` prefix in `FormService.executeAI` | A workaround for reasoning models that otherwise emit `<think>` and long CoT and hit the 60 s timeout. Remove it once the AI plugin exposes a "no thinking" flag (TODO in code). |
| `mapper.js` tolerant parsing | Models wrap JSON in fences, add comments, or return OpenAI-style `choices[]`. The regex extraction handles all of these. If nothing parses, the result is an empty mapping rather than an exception. |
| Prompt wording (`getFieldMappingPrompt`) | Tuned across several releases (1.0.1 simplification, 1.1.0 confidence threshold). Treat changes as behaviour changes. Test them on real Pipedrive forms with more than one model. |
| Signed-form block, signature/picture exclusion | Filling a signed form would invalidate it. Image filling was removed in 1.0.1 because it wasn't supported. |
| "Thousands group" detection in `detect.js` | Bank-style amount boxes (several ≤3-digit boxes) are treated as one number and split right-to-left on apply. |
| Button routing in `form.js` (`_getButtonSource`) and `revert.html` (`Asc.plugin.button`) | The editor sends panel and modal button clicks to the same callback and distinguishes them by `windowId`. The `x` (close) button arrives as `-1`. This is fragile. The 1.1.1 hotfix was about this, so be careful touching it. |
| Version in two places | CI derives the tag from the first `x.y.z` in `CHANGELOG.md`, while the editor reads `config.json`. They must match (smoke test). |
| `guid` | Referenced by hosts in `autostart` and `options`. Changing it breaks Pipedrive. |

## 6. Known issues and tech debt

- **Thinking-models hack.** The system-prompt prefix above doesn't reliably suppress reasoning. Some models are still slow or emit `<think>`. That can produce a timeout after 60 s or an unparsable answer, which shows up as "nothing to fill".
- **Fragile button/window-ID routing.** The main panel and the modals share one `button` callback. New windows or editor changes can break close and confirm handling, as happened in 1.1.1.
- **Docs and behaviour drift:**
  - `docs/third-party-integration.md` says the *extractor* has a 5 s timeout. The timeout is actually applied by the callers (`index.html` and the form restart path), not inside `DataExtractor.fetch`.
  - The fetch uses default credentials. Same-origin cookies are sent, because in Pipedrive the plugin and the callback share an origin.
  - The doc's error messages don't exactly match the code.
- **No automated tests in CI and no CI build.** Smoke tests now exist (`make test`), but nothing runs them automatically. The build tool versions are unpinned.
- Minor:
  - `revert.html` loads `components/Form/script.js` without using it.
  - The commented-out locked-field filter in `detectAllForms` means locked fields are still offered.
  - The `vendor/select2…/docs` folder ships in the build.

## 7. Plans and promises

- No external promises to clients or partners.
- After each plugin release, update the Pipedrive submodule (see §4).

---

## Smoke tests and manual checklist

**Automated:** `make test` (`tests/smoke.test.js`, 14 tests, under 3 s). It loads the real scripts into a Node VM with fake editor APIs and covers:
- detection (radio grouping, complex grouping, signature/picture exclusion, generic-name filter)
- code rotation, including a host code change and error responses
- the keys-only prompt
- AI response parsing
- options and constraint validation
- apply for each field type
- revert
- version consistency between `config.json` and CHANGELOG
- translation key parity

**Manual:** these need a real editor and AI, so they can't be automated here. Use the Pipedrive connector with the submodule pointed at the build under test, Docs 9.2.0+, and the AI plugin with a working model.

- [ ] Open an ONLYOFFICE PDF form in a Pipedrive deal that has a person, an organization and products. The plugin autostarts in the left panel, the theme matches the editor, and the UI language follows the editor.
- [ ] AI model removed or disabled: the "model" error appears. Re-enable it and, within about 1 s, the Autofill button becomes enabled without a reload.
- [ ] A form with no fields shows the "no fields" error and Retry works. A signed form shows the "signed" error.
- [ ] Autofill: the loader steps go detect - fetch - AI - form. The review list shows sensible values. Products (an array) show several choices in the dropdown.
- [ ] Constraints: a digit-only or limited-length field gets a trimmed or filtered value. A dropdown or radio only gets a value from its list. Checkbox is true/false.
- [ ] "Open file location" scrolls to the field. Unchecking a field skips it. Restart re-runs mapping.
- [ ] Apply - confirm modal - Confirm fills the fields, and the success page appears. Apply - Cancel leaves the document untouched and the buttons re-enable.
- [ ] Success page - "Cancel autofill" - confirm restores the original values exactly, including clearing fields that were empty.
- [ ] The `x` close button works on the main panel, on the confirm modal and on the revert modal (the 1.1.1 regression area).
- [ ] Reopen the editor: the next data fetch uses the rotated code. Check the gateway logs for `/api/data?code=` with a new code and no 4xx.
- [ ] With a reasoning-type model configured, mapping still completes within 60 s or shows an error, with no stuck spinner.
- [ ] Switch the editor theme while the panel is open (light - dark): all pages and both modals follow.
