// Chrome extension content-script entry. Runs in the active tab (isolated world,
// shared DOM) when the toolbar icon is clicked. Reuses the same capture +
// delivery logic as the bookmarklet — no duplicated code.
import { runSnapshot } from "../bookmarklet/snapshot.js";

runSnapshot();
