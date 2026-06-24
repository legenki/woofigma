# Chrome Web Store Release — wooFrame (v26.6.0)

Release prep + copy + publishing steps for the `apps/plugin/extension` Chrome extension.

> **Two different "names" / "descriptions"** — keep them straight:
> - **Manifest fields** (`manifest.json` / `_locales`) ship *inside* the extension. They show in `chrome://extensions` and the toolbar tooltip.
> - **Store listing fields** (entered in the Developer Dashboard) are the *marketing* name, summary, and description shown on the Web Store page. The store name can differ from the manifest name.

---

## 1. Pre-flight checklist

- [ ] **Version bumped** — `manifest.json` `version` = `26.6.0` (done). Each store upload needs a strictly higher version than the last published one.
- [ ] **Manifest metadata** — `author` = `Andy Legenki`, `homepage_url` = `https://github.com/legenki/wooframe` (done).
- [ ] **In-product description updated** — `_locales/en/messages.json` → `extensionDescription.message` currently reads *"Save a complete page into a single HTML file"* (legacy SingleFile copy). Update to match the new positioning (see §2.4). This is the text Chrome shows on the `chrome://extensions` card.
- [ ] **Permissions justified** — every entry in `permissions` / `host_permissions` needs a one-line justification in the dashboard (see §4). `<all_urls>` + `tabs` + `scripting` will trigger manual review; that's expected.
- [ ] **No remote code** — confirm all JS is bundled locally (no `<script src="https://…">`, no `eval` of fetched code). MV3 forbids remote code; this is a common rejection cause.
- [ ] **Icons present** — 16/32/48/64/128 exist under `src/ui/resources/` and are referenced in the manifest (done). The 128px icon is also the store icon.
- [ ] **Load-unpacked smoke test** — load `apps/plugin/extension` unpacked, exercise: open editor, add/clear notes, highlight, save page, **Move to Figma → paste into the wooFrame Import Figma plugin**, switch light/dark theme. Console should be free of the old "No tab with id" errors (fixed in v26.6.0).
- [ ] **Privacy** — decide the single purpose statement and whether a privacy policy URL is required (it is, because the extension accesses page content on `<all_urls>`; see §4).
- [ ] **Screenshots ready** — at least 1, ideally 3–5. 1280×800 or 640×400 PNG/JPEG. Show: the annotation toolbar on a real page, a captured page, and the result as editable Figma layers.

---

## 2. The copy (what goes where)

### 2.1 Store name — Developer Dashboard → "Store listing" → *Name* (max 75 chars)

```
wooFrame — HTML to Figma
```

### 2.2 Summary — "Store listing" → *Summary* (max 132 chars)

```
Capture any web page and turn it into editable Figma layers — real text, fills, gradients, and auto-layout. Not a screenshot.
```

### 2.3 Detailed description — "Store listing" → *Description* (max 16,000 chars)

```
Turn any web page into editable Figma layers — not a flat screenshot.

wooFrame captures a live web page (real DOM, computed styles) and hands it to Figma as proper, editable layers: real text you can retype, vector fills, gradients, shadows, borders, and auto-layout. Point it at a page, click Move to Figma, and paste into the companion "wooFrame Import" Figma plugin.

WHY DESIGNERS & PMs USE IT
🎯 Real editable layers — text stays text, shapes stay shapes. No tracing over a PNG.
🧩 Faithful styles — fills, gradients, shadows, borders and spacing carried across.
📐 Auto-layout — structure comes through as Figma auto-layout, not absolute pixels.
⚡ One click — capture on the page, paste in Figma. No manual rebuild.

ALSO A FULL PAGE SAVER
📄 Save any page as a single self-contained .html file (images, CSS, fonts inlined).
✏️ Annotate before you capture — sticky notes in 3 colors and text highlights.
🌗 Light/dark UI that follows your system theme.
🔒 Local-first — pages are processed in your browser.

HOW IT WORKS
1. Open the page you want.
2. Click the wooFrame icon to open the editor.
3. (Optional) Add notes and highlights.
4. Click Move to Figma — the annotated HTML is copied to your clipboard.
5. In Figma, run the "wooFrame Import" plugin and paste. You get editable layers.

Prefer a file instead? Click Save to download the whole page as one .html.

Not affiliated with or endorsed by Figma.
```

### 2.4 In-product description — `_locales/en/messages.json` → `extensionDescription.message` (manifest, ≤132 chars effective)

Update the legacy SingleFile line to:

```
Capture a web page and turn it into editable Figma layers, or save it as a single HTML file.
```

> This is a code change (commit it). It updates the `chrome://extensions` card text. The localized `_locales/<lang>/messages.json` files still hold the old translated string; updating all 17 locales is optional — English is the `default_locale` and the safe fallback.

### 2.5 Optional manifest `name` change

The manifest `name` is `wooFrame Snapshot`. You can leave it (store name overrides what users see on the listing) or align it to `wooFrame` / `wooFrame — HTML to Figma`. If you change it, do it in `_locales/en/messages.json` via an `extensionName` message + set `"name": "__MSG_extensionName__"` in the manifest, OR just edit the literal `name` string. Not required for release.

---

## 3. Packaging the upload ZIP

The Web Store wants a ZIP of the extension directory **with `manifest.json` at the root of the zip** (not nested in a parent folder).

```bash
cd apps/plugin/extension
zip -r -FS ../../../wooframe-26.6.0.zip . \
  -x '*.DS_Store' -x '__MACOSX/*' -x '*/.git/*'
cd -
# Sanity check: manifest.json must be at the top level of the archive
unzip -l wooframe-26.6.0.zip | grep -E ' manifest.json$'
```

Notes:
- Include the whole `extension/` folder (lib bundles, `_locales`, `src`, resources). The store ships exactly what's in the zip.
- The `src/` folder is fine to include (it's referenced by the UI pages). Removing it would break the editor.
- Re-zip and bump the version for every resubmission.

---

## 4. Developer Dashboard fields (privacy & permissions)

In **Privacy practices**:

- **Single purpose** (one sentence):
  ```
  Capture the current web page and convert it into editable Figma layers, or save it as a single self-contained HTML file.
  ```
- **Permission justifications** (one line each):
  - `activeTab` / `tabs` — read the current tab's URL/title and message its content script to capture the page.
  - `scripting` — inject the capture/annotation content scripts into the page being saved.
  - `host_permissions <all_urls>` — the user can capture any page they choose; the page to convert is arbitrary.
  - `downloads` — save the captured page as an .html file.
  - `storage` — store the user's options/profiles.
  - `contextMenus` — provide right-click capture entry points.
  - `offscreen` — render/convert page content off-screen.
  - `sidePanel` — host the editor/UI.
  - `declarativeNetRequest` — adjust request headers needed to fetch page sub-resources during capture.
  - `clipboardWrite` — copy the converted HTML to the clipboard for "Move to Figma".
  - Optional (`identity`, `nativeMessaging`, `bookmarks`) — requested only when the matching destination feature is enabled.
- **Data usage**: declare you do **not** sell data and processing is local. Page content is processed in the browser; state what (if anything) leaves the device.
- **Privacy policy URL**: required because the extension accesses page content. A simple page in the repo or a GitHub Pages/Gist URL is acceptable. Minimum: state that page content is processed locally and not transmitted/sold (adjust to reality).

---

## 5. Publishing steps (Developer Dashboard)

1. Go to the **Chrome Web Store Developer Dashboard** (`https://chrome.google.com/webstore/devconsole`). One-time **$5 USD** registration fee for a developer account if not already paid.
2. **New item** → upload `wooframe-26.6.0.zip`. (For an update to an existing listing, open that item → **Package** → **Upload new package**.)
3. Fill **Store listing**: Name (§2.1), Summary (§2.2), Description (§2.3), category (Developer Tools or Productivity), language (English), icon (auto from 128px), and **screenshots** (1280×800).
4. Fill **Privacy practices** (§4): single purpose, per-permission justifications, data-use disclosures, privacy policy URL.
5. **Distribution**: Public (or Unlisted for a soft launch). Pick regions (default: all).
6. **Save draft** → **Submit for review**. With `<all_urls>` + `tabs` + `scripting`, expect **manual review** (commonly a few days). You'll get an email on approval or rejection (with the reason).
7. On approval it goes live automatically (unless you set a deferred/manual publish). For updates, published users auto-update to the new version.

---

## 6. Common rejection causes (avoid these)

- **Remote code** — any externally hosted/eval'd JS. Must be bundled.
- **Over-broad permissions without justification** — every permission needs a clear reason; `<all_urls>` must be tied to the core capture purpose.
- **Missing/empty privacy policy** when accessing page content.
- **Misleading metadata** — name/description must match what the extension actually does. ("HTML to Figma" + "page saver" both reflect real features, so this is fine.)
- **Keyword stuffing** in name/description.
- **Trademark** — "Figma" appears descriptively ("HTML to Figma", "import into Figma"). Keep the "Not affiliated with or endorsed by Figma." line; don't imply official affiliation or use Figma's logo as the product icon.
```
