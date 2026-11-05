# Changelog

## 1.2.0 — 2026-11-05

> **Play Store:** Money amounts are now stored more precisely, the app updates more smoothly, and several small bugs are fixed.

### Features
- Store money as integer cents (pricePerNightCents / priceCents / amountCents); IndexedDB schema version 6 converts existing records on upgrade
- Backup file format 2 stores cents; format-1 backups are converted on import
- Replace the hand-written service worker with vite-plugin-pwa (Workbox precache, update banner prompts for refresh); registered on the web only, native apps unregister old workers; PWA icons moved to public/icons/*.png
- Contexts reload automatically when their store changes, in the same tab and in other tabs

### Bug Fixes
- Guests payment form showed an unrounded balance with a hardcoded "$"
- Pressing Enter in the property-name field reopened the editor
- Landing page links returned 404 under /property-rental/

### Refactoring
- Centralise balance calculations in src/domain/balance.ts
- Split api/client.ts into db, crud, seed and backup modules; derive entity types from Zod schemas; route setup, demo seed and reset through SettingsService

### CI
- Gate deploys on CI, restore the E2E smoke job, pin actions by SHA, fail Trivy on CRITICAL findings, allow manual CI runs

## 1.1.26 — 2026-10-19

### Bug Fixes
- Fix React hooks violation in TodayView that caused crash after upgrading to React 19.3 — useMemo hooks were called after an early return, violating Rules of Hooks

### Testing
- Add TodayView component tests covering loading state, data state, and loading-to-loaded transition

## 1.0.3 — 2026-09-11

> **Play Store:** Improved accessibility, offline experience, and app performance with better loading times.

### Testing
- 143 unit tests covering all 6 services, domain models, Zod schemas, and i18n key parity
- 66 E2E tests covering check-in/out, payments, tasks, cancellation, settings, language switching, theme toggle, and data reset

### Accessibility
- Skip-to-content link for keyboard users
- ARIA roles, labels, and modal attributes across all dialogs
- Keyboard navigation (Enter/Space/Escape) on all interactive elements
- Visible focus indicators with focus-visible ring styles
- Color contrast fixes for WCAG AA compliance

### PWA
- Install prompt banner with beforeinstallprompt support and localStorage dismissal
- Offline/online status banners
- Service worker update detection with refresh prompt
- Manifest fixes: icon purpose split (any/maskable), apple-touch-icon, app shortcuts

### Performance
- Code splitting: lazy-loaded tab views and reservation modal via React.lazy
- Vendor chunk splitting: react, date-fns, lucide-react in separate chunks (426KB single bundle → multiple lazy chunks)
- Dynamic imports for non-English locale files
- React.memo on CalendarRow, StatCard, TabBar
- useMemo on NAV_ITEMS and translation objects
- Map-based O(1) lookups replacing O(n) .find() in TodayView, ReportsView, GuestsView
