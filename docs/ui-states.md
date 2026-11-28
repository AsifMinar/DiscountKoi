# UI states audit

Every module must be checked against these 10 states during design review and QA
acceptance testing. This file records how each state is handled, where the code lives, and
how to test it. Update it whenever a module is added or changed.

**Legend:** ✅ handled · ➖ not applicable (with the reason)

## The 10 states

| #   | State               | Rule                                                                    |
| --- | ------------------- | ----------------------------------------------------------------------- |
| 1   | Empty               | Explain why it's empty and give one clear primary action                |
| 2   | Loading             | Skeletons shaped like the real layout; never a blank screen             |
| 3   | Error               | Say what went wrong in plain words and offer a recovery (Retry)         |
| 4   | Offline             | Small banner straight away; show cached content instead of a blank page |
| 5   | Slow network        | Show progress and connection updates, then time out gracefully          |
| 6   | Zero search results | No dead ends: spelling fix, filter reset, alternatives                  |
| 7   | Permission denied   | Explain why access is needed and how to restore it                      |
| 8   | Session expiry      | Keep drafts and local state; never lose work                            |
| 9   | Form validation     | Inline errors right under the field, on input or blur                   |
| 10  | Success             | Confirm with a toast or animation and suggest a next step               |

## How the site handles each state

| #   | State             | How                                                                                                                                                                                                                                                                                                                                                                                      | Code                                                                      |
| --- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | Empty             | `EmptyState` panel: icon, reason, primary + secondary action. Each page has its own wording and actions (store page → "See other stores", Saved → "Browse deals").                                                                                                                                                                                                                       | `src/components/EmptyState.tsx`, `DealExplorer.tsx`, `SavedDeals.tsx`     |
| 2   | Loading           | The first screen of deals is in the HTML, so the default page is never empty. Filtered views show shimmering skeleton cards shaped like real cards, plus a "Loading deals…" line. The deal popup has its own skeleton.                                                                                                                                                                   | `DealCardSkeleton` in `DealCard.tsx`, `LoadingStatus` in `LoadStates.tsx` |
| 3   | Error             | `LoadErrorPanel` names the cause: offline, timeout, server error (with its code), dropped download (VPN or blocker), or damaged data. "Try again" retries in place without reloading the page. The deal popup has a separate "Couldn't load this deal" message so a network failure is never shown as "deal ended".                                                                      | `LoadStates.tsx`, `DealModal.tsx`                                         |
| 4   | Offline           | A banner appears as soon as the browser goes offline, and a "You're back online" toast appears when it returns. Every successful download of `deals.json` is saved in the browser's Cache Storage. If a later download fails, the saved copy is shown with a "Showing your offline copy from …" note and a Refresh button. It refreshes automatically when back online.                  | `StatusLayer.tsx`, `use-all-deals.ts`                                     |
| 5   | Slow network      | After 4 s the loading line becomes "Slow connection. Still downloading deals · 48 KB so far…" with a moving progress bar. After 25 s the download is cancelled and the timeout error (with Retry) is shown.                                                                                                                                                                              | `use-all-deals.ts` (`SLOW_AFTER_MS`, `TIMEOUT_MS`), `LoadStates.tsx`      |
| 6   | Zero results      | `NoResults` offers, in order: a "Did you mean …" spelling fix (only if it finds deals), the same search without filters (with its count), popular categories, and Clear all (with Undo). Every filter chip can also be removed on its own.                                                                                                                                               | `NoResults.tsx`, `src/lib/suggest.ts`                                     |
| 7   | Permission denied | The site asks for no device permissions (no location, camera or notifications). The one thing it relies on is site storage for Saved deals. If the browser blocks it, saving shows a warning toast with a "Fix" link, and the Saved page explains why storage is needed and the exact settings path for Chrome/Edge, Safari and Firefox. Web pages can't open browser settings directly. | `local-lists.ts` (`storageBlocked`), `SavedDeals.tsx`, `SaveButtons.tsx`  |
| 8   | Session expiry    | ➖ No accounts or sign-in, so nothing expires. Equivalent protection: the search text and every filter live in the URL (they survive reloads, Back and sharing). Saved deals are in localStorage, and clearing them can be undone.                                                                                                                                                       | `url-state.ts`, `local-lists.ts`                                          |
| 9   | Form validation   | The search box is the only text input. It shows an inline message under the field (with `aria-invalid` and `aria-describedby`) for symbol-only searches and at the 100-character limit. It checks on blur, or while typing once there's a second word. Filters are radio buttons and checkboxes, so they can't hold an invalid value.                                                    | `SearchBar.tsx` (`searchProblem`)                                         |
| 10  | Success           | Toasts with a next step: "Saved to this device · View saved", "Removed from saved · Undo", "Search and filters cleared · Undo", "Cleared N saved deals · Undo". They're announced to screen readers and pause while hovered or focused.                                                                                                                                                  | `src/lib/toast.ts`, `StatusLayer.tsx`                                     |

## Module × state checklist

| Module                     | Empty | Loading | Error | Offline | Slow | Zero results | Permission | Session | Validation | Success |
| -------------------------- | ----- | ------- | ----- | ------- | ---- | ------------ | ---------- | ------- | ---------- | ------- |
| Home (deal explorer)       | ✅    | ✅      | ✅    | ✅      | ✅   | ✅           | ➖         | ✅ URL  | ✅         | ✅      |
| Store page                 | ✅    | ✅      | ✅    | ✅      | ✅   | ✅           | ➖         | ✅ URL  | ✅         | ✅      |
| Student page               | ✅    | ✅      | ✅    | ✅      | ✅   | ✅           | ➖         | ✅ URL  | ✅         | ✅      |
| Free page (freebies)       | ✅    | ✅      | ✅    | ✅      | ✅   | ✅           | ➖         | ✅ URL  | ✅         | ✅      |
| Free page (food help list) | ➖ ¹  | ➖ ¹    | ➖ ¹  | ✅ ¹    | ➖ ¹ | ➖ ²         | ➖         | ✅ URL  | ➖ ²       | ➖      |
| Saved                      | ✅    | ✅      | ✅    | ✅      | ✅   | ➖ ²         | ✅         | ✅      | ➖ ²       | ✅      |
| All stores                 | ✅    | ➖ ¹    | ➖ ¹  | ✅ ¹    | ➖ ¹ | ➖ ²         | ➖         | ➖      | ➖ ²       | ➖      |
| Deal popup                 | ✅ ³  | ✅      | ✅    | ✅      | ✅   | ➖           | ➖         | ✅ URL  | ➖         | ✅      |
| About, 404                 | ➖ ¹  | ➖ ¹    | ➖ ¹  | ✅ ¹    | ➖ ¹ | ➖           | ➖         | ➖      | ➖         | ➖      |

¹ Built into the static HTML, so there's nothing to download after the page opens. If the page itself opened, it's complete. The offline banner still shows.
² No search box or form on this view.
³ "This deal isn't available anymore", with a "Browse deals" button.

## How to test each state

| State           | How                                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| Empty           | Saved page with nothing saved. A store page for a store with only a flyer.                                           |
| Loading / slow  | DevTools → Network → throttle "Slow 3G", then open `/?type=free` (a filtered view needs the full list).              |
| Timeout         | DevTools → Network → add a custom throttling profile with 1 kbit/s download, open `/?type=free` and wait 25 s.       |
| Error           | DevTools → Network → block request URL `deals.json`, reload, open a filtered view.                                   |
| Offline + cache | Load any page once (saves the copy). DevTools → Network → Offline, reload with a filter: the cached-copy note shows. |
| Zero results    | Search `cofee` (spelling fix), or `coffee` with "Online" selected (without-filters count), or `unicorn saddle`.      |
| Permission      | Chrome → Settings → Privacy → Site settings → On-device site data → "Don't allow sites to save data". Then tap ♡.    |
| Validation      | Type `!!!` in search and press Tab.                                                                                  |
| Success         | Tap ♡ on any deal, then Undo or View saved.                                                                          |

The automated screenshots (`npm run screenshots`) include the main states. See `scripts/screenshots.ts`.
