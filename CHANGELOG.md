# Changelog

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
