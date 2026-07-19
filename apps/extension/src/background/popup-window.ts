/**
 * Programmatic popup launcher.
 *
 * MV3 disallows `chrome.action.openPopup()` from a background-triggered
 * connect/sign flow: by the time a dApp's `eth_requestAccounts` reaches the
 * background (page click → content script → background), Chrome no longer
 * considers it a live user gesture, so `openPopup()` either rejects or
 * resolves without actually showing anything — either way the flow is dead
 * with no visible popup and no error. (Confirmed by testing it directly:
 * the connect promise hung forever with nothing on screen.) So instead we
 * open a small `type: "popup"` window positioned in the top-right corner of
 * the current browser window, under where the toolbar icon lives, so it
 * reads as a dropdown rather than a separate, unrelated window.
 *
 * One window at a time: if a popup is already open we just focus it.
 */

import browser from "webextension-polyfill";

const POPUP_URL_PATH = "src/popup/index.html";
const POPUP_WIDTH = 357;
const POPUP_HEIGHT = 640;
const RIGHT_MARGIN = 12;
const TOP_MARGIN = 72; // clears the tab strip + toolbar so it sits under the extension icon.

let currentPopupWindowId: number | null = null;

async function computeAnchoredPosition(): Promise<{ left: number; top: number }> {
  try {
    const parent = await browser.windows.getLastFocused();
    const parentLeft = parent.left ?? 0;
    const parentTop = parent.top ?? 0;
    const parentWidth = parent.width ?? 1280;
    // Clamp non-negative: on a maximized/snapped/multi-monitor-adjacent window
    // the raw arithmetic can push the popup partly or fully off-screen, which
    // looks exactly like "clicking does nothing" since a real (just invisible)
    // window is still created and just gets refocused on every later attempt.
    return {
      left: Math.max(0, Math.round(parentLeft + parentWidth - POPUP_WIDTH - RIGHT_MARGIN)),
      top: Math.max(0, Math.round(parentTop + TOP_MARGIN)),
    };
  } catch {
    return { left: 0, top: 0 };
  }
}

export async function openPopupWindow(): Promise<void> {
  if (currentPopupWindowId !== null) {
    try {
      const existing = await browser.windows.get(currentPopupWindowId);
      if (existing) {
        // Re-anchor too, not just focus: the parent window may have moved
        // (different monitor, resized) since this popup was first opened, and
        // a stale off-screen/minimized position is otherwise indistinguishable
        // from the click doing nothing at all.
        const { left, top } = await computeAnchoredPosition();
        await browser.windows.update(currentPopupWindowId, {
          focused: true,
          drawAttention: true,
          state: "normal",
          left,
          top,
        });
        return;
      }
    } catch {
      currentPopupWindowId = null;
    }
  }

  try {
    const { left, top } = await computeAnchoredPosition();
    const url = browser.runtime.getURL(POPUP_URL_PATH) + "?window=1";
    const created = await browser.windows.create({
      url,
      type: "popup",
      width: POPUP_WIDTH,
      height: POPUP_HEIGHT,
      left,
      top,
      focused: true,
    });
    currentPopupWindowId = created.id ?? null;
  } catch (err) {
    console.warn("[PREMON] failed to open popup window:", err);
  }
}

export async function closePopupWindow(): Promise<void> {
  if (currentPopupWindowId === null) return;
  const id = currentPopupWindowId;
  currentPopupWindowId = null;
  try {
    await browser.windows.remove(id);
  } catch {
    /* already closed */
  }
}

export function resetPopupWindow(): void {
  currentPopupWindowId = null;
}
