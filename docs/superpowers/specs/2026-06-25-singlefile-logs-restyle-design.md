# SingleFile Logs Panel Restyle

**Date:** 2026-06-25
**Scope:** The capture progress logs panel ("singlefile-logs") shown in the page corner during a save.

## Goal

Modernize the small progress-logs window SingleFile renders in the bottom-left
of the page during capture: rounded corners, an iOS-terminal look (semi-transparent
black background with backdrop blur), light-grey text, and bright green checkmarks.

## Affected code

| File | Role |
|------|------|
| `apps/plugin/extension/src/ui/content/content-ui.js` | Source: defines the logs window styles (`createLogsWindowElement`, ~542-573) and the checkmark color (`updateLogLine`, ~616). |
| The loaded content bundle that contains this code | Must mirror the source change (no build pipeline; bundle is the pre-built artifact actually injected). |

The panel lives in a shadow DOM (`singlefile-logs-window` custom element), so these
styles are isolated from the host page.

## Changes

### Container — `.singlefile-logs` (currently white bg, `opacity: 0.9`, no radius)

```css
position: fixed;
bottom: 24px;
left: 8px;
z-index: 2147483647;
padding: 10px 12px;
border-radius: 8px;
background-color: rgba(0, 0, 0, 0.7);
backdrop-filter: blur(10px);
-webkit-backdrop-filter: blur(10px);
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
min-width: ${LOG_PANEL_WIDTH}px;
min-height: 16px;
transition: height 100ms;
```

Removed: the outer `opacity: 0.9` (transparency now comes from the rgba background)
and `background-color: white`; added `border-radius`, blur, shadow, roomier padding.

### Lines — `.singlefile-logs-line` (currently white bg, black text)

```css
display: flex;
justify-content: space-between;
padding: 2px;
font-family: arial, sans-serif;
color: #e5e5e5;            /* was black */
background-color: transparent; /* was white */
```

### Checkmark / status — `updateLogLine` (~616)

```js
statusElement.style.setProperty("color", textStatus == "✓" ? "#30d158" : "#e5e5e5");
```

- `✓` color: `#055000` (dark green) → `#30d158` (bright iOS green).
- non-`✓` (in-progress) color: `black` → `#e5e5e5` (visible on the dark bg).

Completed-line dimming (`opacity: .5` on text + status) and the pulse animation
for in-progress lines are unchanged.

## Out of scope

- No layout/position change (still bottom-left, same width).
- No font change (stays `arial, sans-serif`; user chose light-grey text, not monospace).
- No behavior change to logging logic.

## Verification

`node --check` on the edited file(s), then manual: trigger a capture on a page with
`logsEnabled` and confirm the panel shows rounded corners, dark translucent blurred
background, light-grey text, and bright green checkmarks, in both light and dark host pages.
