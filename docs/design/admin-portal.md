# Design Specification: Admin Web Portal

This document is the visual and interaction design specification for the
internal Admin Web Portal of The Cheap Power Company. It complements the
functional spec at `/docs/specifications/admin-portal.md` and inherits brand
tokens from the marketing-site design system (referenced as `marketing.*`
throughout). The portal is desktop-first, employee-facing, and optimised
for clarity and density over marketing appeal.

---

## Design Principles

1. **Function over flourish.** The portal is a work tool. Every pixel must
   earn its place by serving a task. No decorative imagery, no hero
   illustrations, no marketing copy.
2. **Density without clutter.** Employees scan many records per day. We use
   tight vertical rhythm, restrained colour, and consistent column widths so
   that high-information screens still feel calm.
3. **Brand-quiet, brand-true.** We carry the marketing site's green-and-light
   identity into the portal but mute it: the brand green appears as accents
   (active states, primary actions, status indicators), not as large fills.
4. **Status is colour, colour is status.** Green, amber, red, and grey are
   reserved for state communication (status badges, trend deltas, error
   messages). They are not used as decoration.
5. **One primary action per surface.** A page or modal has at most one
   filled primary button; secondary actions are outlined or text-only.
6. **Predictable geometry.** Every component sits on the 4px spacing grid.
   Tables, cards, and forms share a single set of radius, padding, and
   border tokens.
7. **Keyboard-first.** Every action reachable by mouse is reachable by
   keyboard, with a visible focus ring at all times.

---

## Colour Tokens (reference and extend marketing-site tokens)

All admin tokens are defined in addition to, not in replacement of, the
marketing-site palette. Where a marketing token is reused unchanged, it is
referenced as `marketing.<token-name>`.

### Inherited from marketing site

| Token | Value (reference) | Usage in portal |
|---|---|---|
| `marketing.color-brand-green-500` | Primary brand green | Primary buttons, focus ring, active nav state, link colour |
| `marketing.color-brand-green-600` | Brand green, hover/pressed | Primary button hover, pressed state |
| `marketing.color-brand-green-100` | Brand green, soft tint | Selected nav background, table row selected, KPI positive border |
| `marketing.color-brand-green-50` | Brand green, faintest | Table row hover tint |
| `marketing.color-neutral-0` | Pure white | Page background, modal background |
| `marketing.color-neutral-50` | Off-white | Subtle surface (KPI cards, table headers) |
| `marketing.color-neutral-100` | Light grey | Borders, dividers, disabled fills |
| `marketing.color-neutral-300` | Mid grey | Secondary borders, placeholder text |
| `marketing.color-neutral-500` | Body grey | Secondary text |
| `marketing.color-neutral-700` | Dark grey | Body text |
| `marketing.color-neutral-900` | Near-black | Headings, primary numerals |

### Admin-specific extensions

| Token | Value | Usage |
|---|---|---|
| `color-surface-page` | `marketing.color-neutral-0` (#FFFFFF) | Main content background |
| `color-surface-sidebar` | `#F4F8F4` (very light green-tinted off-white, ~3% darker than page) | Fixed sidebar background |
| `color-surface-topbar` | `marketing.color-neutral-0` with 1px bottom border `marketing.color-neutral-100` | Top bar |
| `color-surface-card` | `marketing.color-neutral-0` with 1px border `marketing.color-neutral-100` | KPI cards, panels, modals |
| `color-surface-card-muted` | `marketing.color-neutral-50` | Section dividers within Customer Detail |
| `color-status-active` | `#1F8A3B` (green fill) | Active customer/agreement/payment status |
| `color-status-active-bg` | `#E6F4EA` (10% green tint) | Background fill for Active badges |
| `color-status-pending` | `#B8860B` (amber, AA on white) | Pending status text + outline |
| `color-status-pending-bg` | `#FFF8E1` | Background fill for Pending badges (outline variant uses transparent bg) |
| `color-status-failed` | `#C0392B` (red fill) | Failed status, destructive action |
| `color-status-failed-bg` | `#FBEAE7` | Background fill for Failed badges |
| `color-status-suspended` | `marketing.color-neutral-500` | Suspended status fill |
| `color-status-suspended-bg` | `marketing.color-neutral-100` | Background fill for Suspended badges |
| `color-status-stopped` | `marketing.color-neutral-700` | Stopped status (outline only, transparent bg) |
| `color-trend-positive` | `color-status-active` | KPI trend up arrow + delta text |
| `color-trend-negative` | `color-status-failed` | KPI trend down arrow + delta text |
| `color-trend-neutral` | `marketing.color-neutral-500` | Zero-delta KPI trend |
| `color-table-row-default` | `marketing.color-neutral-0` | Default table row background |
| `color-table-row-hover` | `marketing.color-brand-green-50` (~#F1F8F2) | Row hover tint |
| `color-table-row-selected` | `marketing.color-brand-green-100` (~#DDEEDE) | Row selected background |
| `color-table-header-bg` | `marketing.color-neutral-50` | Sticky table header fill |
| `color-divider` | `marketing.color-neutral-100` | Horizontal rules, table grid lines |
| `color-focus-ring` | `marketing.color-brand-green-500` at 40% opacity, 2px outset | Keyboard focus indicator |
| `color-overlay-modal` | `marketing.color-neutral-900` at 40% opacity | Modal scrim |
| `color-text-primary` | `marketing.color-neutral-900` | Headings, KPI numerals |
| `color-text-secondary` | `marketing.color-neutral-700` | Body text, table cells |
| `color-text-muted` | `marketing.color-neutral-500` | Labels, helper text, timestamps |
| `color-text-link` | `marketing.color-brand-green-600` | In-text links, customer-row links |

All status, trend, text, and link tokens meet WCAG 2.1 AA contrast against
their stated background (verified in the Accessibility section).

---

## Typography Tokens

Inherits the marketing site's type family. Portal uses tighter scale because
density matters more than expressive hierarchy.

| Token | Family | Size | Line height | Weight | Usage |
|---|---|---|---|---|---|
| `font-family-base` | `marketing.font-family-sans` (e.g., Inter) | — | — | — | All UI text |
| `font-family-mono` | `marketing.font-family-mono` (e.g., JetBrains Mono) | — | — | — | IDs (`customerId`, `chargeId`, `agreementId`), JSON payloads |
| `text-display-l` | base | 32px | 40px | 600 | KPICard primary numeral, Pricing page current-value numerals |
| `text-display-m` | base | 24px | 32px | 600 | Page titles in TopBar |
| `text-heading` | base | 18px | 28px | 600 | Section headings within Customer Detail, modal titles |
| `text-subheading` | base | 14px | 20px | 600 | KPICard label, table column header, sidebar nav item |
| `text-body` | base | 14px | 20px | 400 | Default body text, table cells |
| `text-body-strong` | base | 14px | 20px | 600 | Customer name in tables, emphasised values |
| `text-caption` | base | 12px | 16px | 400 | Helper text, timestamps, audit-log metadata |
| `text-caption-strong` | base | 12px | 16px | 600 | StatusBadge label, KPI delta text |
| `text-mono-s` | mono | 12px | 16px | 400 | IDs in tables |
| `text-mono-m` | mono | 13px | 20px | 400 | JSON payload viewer |

Numeric values displayed in tables and KPI cards use tabular figures
(`font-variant-numeric: tabular-nums`) so columns of money align.

---

## Spacing & Layout Tokens

Base grid: 4px. All spacing tokens are multiples of the base.

| Token | Value | Common use |
|---|---|---|
| `space-0` | 0px | — |
| `space-1` | 4px | Icon-to-label gap, inline chip padding |
| `space-2` | 8px | Compact stack gap, badge padding-x |
| `space-3` | 12px | Form field internal padding |
| `space-4` | 16px | Default card internal padding-y, table cell padding-x |
| `space-5` | 20px | KPI card internal padding |
| `space-6` | 24px | Section spacing within a page, modal padding |
| `space-8` | 32px | Page block separator |
| `space-10` | 40px | Page top padding (below TopBar) |
| `space-12` | 48px | Hero section spacing on Dashboard |

| Token | Value | Use |
|---|---|---|
| `radius-s` | 4px | StatusBadge, small chips |
| `radius-m` | 8px | Buttons, form fields, KPI cards, panels |
| `radius-l` | 12px | Modals, large cards |
| `border-width-s` | 1px | Default borders |
| `border-width-m` | 2px | Focus ring, KPI card border-left accent |
| `shadow-card` | `0 1px 2px rgba(20, 40, 25, 0.04)` | KPI cards, panels |
| `shadow-modal` | `0 12px 32px rgba(20, 40, 25, 0.16)` | Modals, popovers |
| `shadow-sticky-header` | `0 1px 0 marketing.color-neutral-100` | Sticky table header bottom edge |

### Page frame

| Element | Dimension |
|---|---|
| Sidebar width | 240px (fixed) |
| TopBar height | 64px (fixed) |
| Main content max-width | 1440px |
| Main content horizontal padding | `space-8` (32px) at ≥1280px viewport, `space-6` (24px) at 1024–1279px |
| Main content top padding | `space-10` (40px) |
| Minimum supported viewport | 1024 × 720 |

---

## Component Library

### Sidebar Navigation

**Container:**
- Width: 240px, fixed left, full viewport height.
- Background: `color-surface-sidebar`.
- Right border: `1px solid color-divider`.
- Padding: `space-4` top, `space-3` horizontal, `space-4` bottom.

**Brand block (top):**
- Height: 64px (matches TopBar).
- Logo wordmark (small, monochrome): `marketing.color-brand-green-600` on
  `color-surface-sidebar`.
- Bottom border: `1px solid color-divider`.

**Nav item:**
- Height: 40px.
- Layout: 20px icon + `space-2` gap + label.
- Typography: `text-subheading` (14px / 600).
- Default text: `color-text-secondary`.
- Default icon: `color-text-muted`.
- Padding: `space-3` horizontal.
- Radius: `radius-m`.

**Nav item states:**

| State | Background | Text | Icon | Notes |
|---|---|---|---|---|
| Default | transparent | `color-text-secondary` | `color-text-muted` | — |
| Hover | `marketing.color-brand-green-50` | `color-text-primary` | `marketing.color-brand-green-600` | — |
| Active (current page) | `marketing.color-brand-green-100` | `marketing.color-brand-green-600` | `marketing.color-brand-green-600` | 3px left accent bar in `marketing.color-brand-green-500` |
| Focus (keyboard) | as Hover | as Hover | as Hover | `color-focus-ring` outset |
| Disabled | transparent | `color-text-muted` at 60% | `color-text-muted` at 60% | cursor: not-allowed |

**Nav items (v1 order):**
1. Dashboard
2. Customers
3. Financials
4. Payments
5. Pricing
6. Audit Log

A bottom-anchored "Help" item (link to internal runbook) is permitted but
not required for v1.

### TopBar

**Container:**
- Height: 64px (fixed).
- Width: viewport minus sidebar (calc on 240px).
- Background: `color-surface-topbar`.
- Bottom border: `1px solid color-divider`.
- Padding: `space-6` horizontal.
- Layout: flex row, `justify-content: space-between`, `align-items: center`.

**Left cluster:**
- Page title in `text-display-m` (24px / 600), `color-text-primary`.
- Optional breadcrumb above title in `text-caption` `color-text-muted`
  (used on Customer Detail: "Customers / Lars Nielsen").

**Right cluster (flex row, `space-4` gap):**
- Optional contextual action button (e.g., "Refresh" on Dashboard).
- User chip: 32px circular avatar (initials on `marketing.color-brand-green-100`,
  text `marketing.color-brand-green-600`) + `space-2` gap + employee name in
  `text-body-strong`. Clickable; opens dropdown.
- Dropdown menu items: "My profile" (disabled in v1), "Logout".

### KPICard

Used on Dashboard. Surfaces a single primary metric.

**Container:**
- Background: `color-surface-card`.
- Border: `1px solid color-divider`.
- Border-left accent: `border-width-m` (2px), colour determined by `trend`
  prop:
  - positive trend → `color-trend-positive`
  - negative trend → `color-trend-negative`
  - neutral / no trend → `marketing.color-neutral-100` (matches body border;
    visually no accent)
- Radius: `radius-m`.
- Padding: `space-5` (20px).
- Shadow: `shadow-card`.
- Min-height: 128px.

**Internal layout (vertical stack, `space-2` gap):**
1. **Label** — `text-subheading`, `color-text-muted`, uppercase letter-spacing
   `0.04em`. Example: "ACTIVE CUSTOMERS".
2. **Primary value** — `text-display-l` (32px / 600), `color-text-primary`,
   tabular figures. Example: "1,247" or "DKK 248,392.50" or "94.2 øre/kWh".
3. **Trend row** — flex row, `space-1` gap:
   - Arrow glyph (12px): `↑` for positive, `↓` for negative, `→` for neutral.
   - Delta text: `text-caption-strong`, colour `color-trend-positive |
     -negative | -neutral`. Example: "+12 this week" or "−2.4% vs last
     month".
   - The whole trend row is omitted if the metric has no comparison
     baseline (e.g., spot price card uses a freshness pill instead — see
     below).
4. **Optional sub-line** — `text-caption`, `color-text-muted`. Used on the
   spot price card to show the price hour: "for hour 14:00–15:00".

**Spot price card variant:**
- Two values stacked or side-by-side: "DK1: 78.4 øre/kWh" and
  "DK2: 81.0 øre/kWh", each in `text-display-l` (use 24px if both inline).
- Replaces the trend row with a freshness pill:
  - Fresh (≤ 25h): green outline, `color-status-active`, label "Live".
  - Stale (> 25h): red fill, `color-status-failed-bg` background,
    `color-status-failed` text, label "Stale — last updated {timestamp}".

**States:**

| State | Effect |
|---|---|
| Default | as above |
| Hover | `shadow-card` strengthens to `0 2px 4px rgba(20,40,25,0.06)`; cursor `default` (cards are not clickable in v1) |
| Loading | Show 3-line skeleton: 12px label bar, 28px value bar, 14px trend bar; subtle shimmer at 1.4s loop |
| Error (data unavailable) | Value renders as "—" in `color-text-muted`; trend row replaced with `text-caption` "Data unavailable" in `color-status-failed` |

### DataTable

The portal's primary data surface. One implementation, parameterised.

**Container:**
- Background: `color-surface-card`.
- Border: `1px solid color-divider`, `radius-m` (rounded outer, inner cells
  square).
- Shadow: `shadow-card`.
- Overflow-x: auto (horizontal scroll if needed at narrow viewports).

**Filter / search bar (above table, inside container, `space-4` padding):**
- Left: search input, 320px wide, leading-icon search glyph.
- Centre: filter chips (e.g., "Status: Active ×"). Removable.
- Right: "Add filter" button (text + plus icon, secondary).
- Bottom border: `1px solid color-divider` separating from table head.

**Column header row:**
- Height: 40px.
- Background: `color-table-header-bg`.
- Sticky (`position: sticky; top: 0`) within the table's scroll container.
- Bottom border: `1px solid color-divider`.
- Cell padding: `space-4` horizontal, `space-2` vertical.
- Typography: `text-subheading` (14px / 600), `color-text-secondary`.
- Sortable columns show an arrow indicator (12px) trailing the label:
  `↕` neutral, `↑` ascending, `↓` descending.
- Hovering a sortable header tints the cell `marketing.color-brand-green-50`
  and shows the indicator at full opacity.

**Body row:**
- Height: 48px.
- Cell padding: `space-4` horizontal.
- Bottom border: `1px solid color-divider` (no border on last row).
- Typography: `text-body`. Numeric/monetary cells use tabular figures and
  right-align. ID cells use `text-mono-s` `color-text-muted`.

**Body row states:**

| State | Background | Notes |
|---|---|---|
| Default | `color-table-row-default` | — |
| Hover | `color-table-row-hover` | Row-action buttons (if any) slide in from right edge |
| Selected | `color-table-row-selected` | Used in multi-select tables (not v1; reserved) |
| Focused (keyboard) | as Hover, plus `color-focus-ring` outset on the row |
| Disabled / inactive customer | text at 60% opacity | — |

**Row actions:**
- Hidden by default; revealed on row hover or row keyboard focus.
- Slide in from the right edge: 200ms `ease-out`, x-translate from 8px to 0.
- Each action is an icon button (32px square, `radius-s`); tooltip on hover.
- Examples: "Open" (chevron-right), "Retry" (refresh), "Resend" (envelope).

**Pagination footer:**
- Height: 56px.
- Padding: `space-4` horizontal.
- Top border: `1px solid color-divider`.
- Layout: left cluster shows "Showing 1–50 of 1,247" in `text-caption`
  `color-text-muted`; right cluster shows page-size selector ("50 per page"),
  prev/next icon buttons, and a numeric page input.
- Pagination is also rendered above the table when `paginationPosition`
  prop is `both` (used on Customer List per US-03).

**Empty state:**
- Centred within the table body area, min 240px tall.
- Single line of `text-body` `color-text-muted`. Examples:
  - Customer list, no results: "No customers match these filters."
  - Failed payments queue, empty: "No failed payments. Nice."
  - Audit log, empty for filter: "No actions match the selected filters."
- Optional secondary link in `color-text-link` to clear filters.

**Loading skeleton:**
- 8 placeholder rows at default row height (48px).
- Each cell is a 12px-tall rounded rectangle in `marketing.color-neutral-100`
  with shimmer animation at 1.4s loop.
- Header row is rendered fully (no skeleton) so column structure is
  immediately legible.

### CustomerDetailPanel

A composite layout shell used by the Customer Detail page, but documented
here so other detail-style pages can reuse it.

**Container:**
- Two-column grid: left column 360px fixed, right column flex (1fr),
  `space-6` gap.
- Below 1280px viewport, columns stack (left then right) and right column
  scrolls within the page rather than independently.

**Section card (used inside both columns):**
- Background: `color-surface-card`.
- Border: `1px solid color-divider`.
- Radius: `radius-m`.
- Padding: `space-6`.
- Header: section title in `text-heading` (18px / 600), optional trailing
  action link (`text-caption-strong` in `color-text-link`).
- Divider between header and body: `1px solid color-divider`,
  margin `space-4` vertical.
- Body: definition-list pattern — label (`text-caption` `color-text-muted`,
  uppercase, letter-spacing 0.04em) above value (`text-body` or
  `text-body-strong` for primary fields).

### FinancialChart

Line chart used on the Dashboard (MRR trend, spot price curve) and on the
Financial Overview page (revenue/margin trend).

**Container:**
- Same card shell as KPICard (background, border, radius, shadow, padding).
- Min-height: 320px including header and legend.

**Header row:**
- Title in `text-heading`.
- Right-aligned: period selector (text + caret) in `text-caption-strong`
  `color-text-link`, e.g. "Last 12 months".

**Plot area:**
- Background: `color-surface-card`.
- Grid lines: horizontal only, `1px dashed color-divider`, every 4 ticks.
- Axes: tick labels in `text-caption` `color-text-muted`. Y-axis on left;
  X-axis hugs bottom.
- Lines: 2px stroke. Default line: `marketing.color-brand-green-500`.
  Comparison line (e.g., previous period or DK2 vs DK1):
  `marketing.color-neutral-500` dashed.
- Data points: invisible by default; visible on hover (4px filled circle in
  line colour with 2px white halo).
- Hover tooltip: card shell at `radius-s`, `shadow-modal`, padding
  `space-3`. Shows: bold value, dim secondary value, timestamp in
  `text-caption`.
- No animations on load beyond a 200ms opacity fade.

**Legend:**
- Below plot, left-aligned, `text-caption-strong`. Each series: 8px line
  swatch + `space-1` + label.

**Empty / loading:**
- Loading: rectangular skeleton at plot dimensions with shimmer.
- Empty: centred line "No data for this period." in `text-body`
  `color-text-muted`.

### StatusBadge

Pill badge for any status field (customer, agreement, payment, charge).

**Geometry:**
- Height: 22px.
- Padding: `space-2` horizontal (8px).
- Radius: `radius-s` (4px) — pill-style with rounded ends acceptable
  (`radius-l` if the design system prefers fully rounded; the renderer
  defaults to 4px corners for consistency with other chips).
- Typography: `text-caption-strong` (12px / 600), letter-spacing 0.02em.
- Inline-flex; optional 8px leading dot for emphasis (off by default).

**Variants:**

| State | Variant | Background | Border | Text |
|---|---|---|---|---|
| Active | filled | `color-status-active-bg` | none | `color-status-active` |
| Pending | outline | transparent | `1px solid color-status-pending` | `color-status-pending` |
| Failed | filled | `color-status-failed-bg` | none | `color-status-failed` |
| Suspended | filled | `color-status-suspended-bg` | none | `color-status-suspended` |
| Stopped | outline | transparent | `1px solid color-status-stopped` | `color-status-stopped` |

A11y: each badge sets `role="status"` (or appropriate ARIA) and exposes the
state via accessible name (e.g., "Status: Active"). See Accessibility section.

### ActionButton

Single button component, three variants. Inherits marketing-site button
typography but uses portal radii and density.

**Common:**
- Height: 36px (default), 32px (compact, used in row actions and inside
  filter bar), 44px (large, used as primary modal CTA).
- Padding: `space-4` horizontal.
- Radius: `radius-m`.
- Typography: `text-subheading` (14px / 600).
- Icon (optional, leading): 16px, `space-2` gap to label.

**Variants:**

| Variant | Default | Hover | Pressed | Disabled |
|---|---|---|---|---|
| Primary | bg `marketing.color-brand-green-500`, text `marketing.color-neutral-0` | bg `marketing.color-brand-green-600` | bg `marketing.color-brand-green-600`, inset shadow | bg `marketing.color-neutral-100`, text `color-text-muted` |
| Secondary (outline) | bg transparent, border `1px solid color-divider`, text `color-text-primary` | bg `marketing.color-brand-green-50`, border `marketing.color-brand-green-500` | bg `marketing.color-brand-green-100` | border `marketing.color-neutral-100`, text `color-text-muted` |
| Destructive | bg `color-status-failed`, text `marketing.color-neutral-0` | bg darker shade of failed (`#A4302A`) | inset shadow | as Primary disabled |
| Ghost (text-only) | bg transparent, text `color-text-link` | bg `marketing.color-brand-green-50` | bg `marketing.color-brand-green-100` | text `color-text-muted` |

**Focus:** all variants use `color-focus-ring` outset (2px, 2px offset).

**Loading state:** label hidden, 16px spinner centred in
`marketing.color-neutral-0` (primary/destructive) or
`marketing.color-brand-green-500` (secondary/ghost). Button keeps width.

### ConfirmationModal

Used for any destructive or pricing-changing action (US-07, US-10, US-11).

**Scrim:**
- Full viewport, `color-overlay-modal` (40% black). Click closes only when
  modal has no destructive impact pending; for destructive modals, scrim
  click is ignored — user must Cancel or Confirm explicitly.

**Card:**
- Width: 480px (default), 560px (when displaying a payload preview such as
  the pricing change summary).
- Background: `color-surface-card`.
- Radius: `radius-l`.
- Shadow: `shadow-modal`.
- Padding: `space-6`.

**Layout (vertical stack, `space-4` gap):**
1. Title — `text-heading`, `color-text-primary`. e.g. "Deactivate Lars
   Nielsen?".
2. Body — `text-body`, `color-text-secondary`. Verbatim string from the spec
   where one is defined.
3. Optional payload preview block — `color-surface-card-muted` panel,
   `radius-m`, `space-4` padding, `text-body-strong` for new values.
4. Optional input — reason text area (US-10), labelled "Reason (required,
   max 500 chars)", with character counter in `text-caption` below right.
5. Action row — flex row, `justify-content: flex-end`, `space-2` gap:
   - "Cancel" — Secondary ActionButton.
   - "Confirm" / verb-specific — Primary or Destructive ActionButton (large,
     44px). Destructive variant for Deactivate.

**Behaviour:**
- Mounts with `opacity 0 → 1` over 150ms, no transform.
- Focus is moved to the first interactive element (text area if present,
  else Cancel) on open.
- Focus is trapped within the modal until close.
- `Esc` triggers Cancel (only if Cancel is enabled).
- On confirm, the primary button enters loading state until the backend
  call resolves; modal closes on success or surfaces an inline error
  banner above the action row on failure (red filled banner using
  `color-status-failed-bg` / `color-status-failed`).

### WebhookEventLog

Specialised viewer used on the Payments page (US-08, "MobilePay webhook
event log" tab).

**Container:**
- DataTable shell with these columns: Timestamp, Event type, Customer,
  `agreementId`, `chargeId`, Payload.
- Row height: 48px (default DataTable height).

**Event-type cell:**
- Renders a small chip in `text-mono-s` on `marketing.color-neutral-50`
  background, `radius-s`, padding `space-1` horizontal. Examples:
  `recurring.charge-failed.v1`, `recurring.agreement-stopped.v1`.

**Payload cell:**
- Collapsed by default, shows "{ … }" placeholder in `text-mono-s`
  `color-text-muted`.
- Expand control: chevron-right toggles to chevron-down.
- Expanded state replaces row layout with full-width JSON viewer below the
  row (additional sub-row of variable height):
  - Background: `color-surface-card-muted`.
  - Padding: `space-4`.
  - Typography: `text-mono-m`.
  - Syntax-highlighted (keys in `color-text-primary`, strings in
    `marketing.color-brand-green-600`, numbers/booleans in
    `color-status-pending`).
  - "Copy JSON" ghost ActionButton in the upper right of the expanded
    block.

**Filter bar (DataTable filter slot):**
- Event-type multi-select chip dropdown.
- Date-range picker, default "Last 7 days", maximum "Last 90 days" per
  Open Question 7.

**Banner (top of tab):**
- If no webhook events received in the last hour, render a banner above
  the table:
  - Background: `color-status-pending-bg`.
  - Border-left: `border-width-m` `color-status-pending`.
  - Padding: `space-4`.
  - Icon (warning) + `text-body` "No webhook events received in the last
    hour — possible delivery issue." (Per spec error states.)

---

## Page Designs

### Login (email + TOTP)

**Layout:**
- Single centred card on a full-bleed `color-surface-page` background.
- Card: 400px wide, `radius-l`, `shadow-modal`, padding `space-8`.
- Vertically centred via flex.

**Contents (vertical stack, `space-4` gap):**
1. Wordmark logo, centred, 32px tall, `marketing.color-brand-green-600`.
2. Title "Sign in" — `text-display-m`, centred.
3. Subtitle "Employee access only" — `text-caption` `color-text-muted`,
   centred.
4. Form (vertical stack `space-4`):
   - Email field — labelled "Work email", 44px tall input, `radius-m`,
     border `1px solid color-divider`, focus border
     `marketing.color-brand-green-500`.
   - Password field — labelled "Password", 44px, with show/hide toggle
     icon button on right.
   - "Continue" — Primary ActionButton, full-width, 44px.
5. **Step 2 (after email/password accepted):**
   - Replace the form with TOTP entry: 6-digit code field (large, monospaced,
     `text-mono-m`, individual cells optional or one wide field).
   - Helper text in `text-caption` `color-text-muted`: "Enter the 6-digit
     code from your authenticator app."
   - "Verify" — Primary ActionButton, full-width.
   - Ghost link "Back" returns to step 1.
6. Footer caption — `text-caption` `color-text-muted`, centred: "Lost
   access? Contact your admin." No self-serve recovery in v1.

**Error states:**
- Wrong password: inline error below password, `color-status-failed`,
  "Email or password is incorrect."
- 5 failed attempts in 10 min: form replaced with locked state — title
  "Account temporarily locked", body "Too many failed attempts. Try again
  in 15 minutes." (Per spec.)
- Wrong TOTP: inline below code field, `color-status-failed`, "Code is
  incorrect or expired."

### Dashboard

**Page title:** "Dashboard" in TopBar.
**TopBar right action:** "Refresh" Secondary ActionButton (icon: refresh).

**Layout (vertical stack, `space-8` gap, max-width 1440px):**

1. **KPI row** — CSS grid, `repeat(4, 1fr)`, `space-6` gap.
   - Card 1 — "ACTIVE CUSTOMERS" — value: integer count; trend: "+12 this
     week" (positive accent).
   - Card 2 — "MRR" — value: "DKK 248,392.50"; trend: vs previous full
     month.
   - Card 3 — "MARGIN MTD" — value: "DKK 38,210.00"; trend: vs same period
     last month.
   - Card 4 — "SPOT PRICE" — spot-price variant with DK1 and DK2 values
     stacked, freshness pill below.

2. **MRR trend chart** — FinancialChart, full width.
   - Title: "Monthly recurring revenue".
   - Default range: last 12 months.
   - Single line in brand green.

3. **Today's spot price curve** — FinancialChart, full width.
   - Title: "Spot price — today".
   - Two lines: DK1 (solid green), DK2 (dashed grey).
   - Toggle in chart header: "Today / Tomorrow" segmented control;
     "Tomorrow" disabled until next-day data is published.

4. **Recently failed payments** — DataTable, full width, header "Recently
   failed payments" with right-aligned "View all →" link to the Payments
   page.
   - Columns: Customer, Amount (DKK), Failure reason, Charge ID, Failed at.
   - Row limit: 5. No pagination on this embedded table.
   - Empty state: "No failed payments in the last 24 hours."

### Customer List

**Page title:** "Customers".

**Layout:**
- Single full-width DataTable filling the content area below TopBar.

**Filter bar contents:**
- Search input (320px), placeholder "Search by name, email, customer ID,
  metering point ID".
- Filter chips: Status, MobilePay status, Joined date range.
- Right: "Add filter" Secondary ActionButton.

**Columns:**

| Column | Type | Alignment | Notes |
|---|---|---|---|
| Name | `text-body-strong` link | left | Click navigates to Customer Detail |
| Customer ID | `text-mono-s` `color-text-muted` | left | — |
| Metering point | `text-mono-s` `color-text-muted` | left | Truncate with tooltip |
| Status | StatusBadge | left | Active / Pending / Suspended (Deactivated rendered as Suspended variant) |
| MobilePay | StatusBadge | left | Active / Pending / Failed / Stopped |
| MRR | DKK, tabular | right | — |
| Margin MTD | DKK, tabular | right | Negative values in `color-status-failed` |
| Joined | date `dd MMM yyyy` | left | — |

**Pagination:** rendered both above and below table (per US-03). Default
page size 50.

**Row interactions:**
- Whole row is clickable (Customer Detail). Primary mouse target is the
  Name cell which renders as a link.
- Row hover reveals a single row action: "Open" chevron-right button on
  the right edge.

### Customer Detail

**Page title:** Customer name in TopBar.
**Breadcrumb:** "Customers / {Customer name}".

**Layout:** CustomerDetailPanel two-column grid.

**Left column (360px fixed):**

1. **Account** section card:
   - Definition list: Name, Email, Phone, Address, Customer ID
     (mono), Status (StatusBadge), Joined date, Deactivated date (if any).
   - Trailing action in section header: "Edit" (ghost link) — disabled in
     v1 (read-only customer record).

2. **Metering point** section card:
   - Definition list: Metering point ID (mono), Grid area (DK1 or DK2),
     DSO name, Consumption MTD (kWh), Last reading (timestamp).
   - If consumption unavailable: value cell reads "Data unavailable" in
     `color-status-failed`, with caption "Last successful sync: {timestamp}".

3. **Margin** section card:
   - Definition list: Lifetime margin (DKK), Margin MTD (DKK), Last-month
     margin (DKK). Negative values in `color-status-failed`.

4. **Support actions** section card:
   - Stack of ActionButtons (full-width within card, `space-2` gap):
     - "Resend onboarding link" — Secondary; visible only if Pending.
     - "Retry failed charge" — Secondary; visible only if a failed charge
       exists; opens ConfirmationModal with charge details.
     - "Deactivate account" — Destructive; visible only if Active and the
       acting employee is admin; opens ConfirmationModal with reason
       textarea.
   - Buttons disabled per role/state with tooltip text from the spec
     ("Admin role required", "Customer is already active", etc.).

**Right column (flex):**

1. **Current bill** section card:
   - Header: "Current bill" + period range in `text-caption`
     `color-text-muted`.
   - Definition list (two columns, label/value pairs): Period, kWh,
     Spot cost, Network fees, Subscription fee, Margin, Total, Status
     (StatusBadge: Pending / Charged / Failed).

2. **Payment history** section card:
   - Compact DataTable inside a section card:
     - Columns: Date, Amount (DKK), Status (StatusBadge), Charge ID
       (mono).
     - Row action: "Retry" (admin only) for Failed rows.
     - Pagination: 10 per page.

3. **MobilePay subscription** section card:
   - Definition list: Agreement ID (mono), Status (StatusBadge: Pending /
     Active / Stopped / Expired), Variable max amount (DKK), Last status
     change (timestamp).
   - Header trailing link: "Open in MobilePay portal →" in
     `color-text-link` — opens external (out-of-scope for visual; spec'd
     for completeness).

**Banners (above two-column area, full-width):**
- DataHub deregistration pending: amber banner per Error States table.
- Bill cannot be calculated: amber banner.
- Customer not found (deep link 404): replaces full content with empty
  state — heading "Customer not found", body "They may have been deleted
  or the link is incorrect.", primary link "Back to customers".

### Financial Overview

**Page title:** "Financials".

**Layout (vertical stack, `space-8` gap):**

1. **Period selector bar:**
   - Inline horizontal segmented control: "This month" / "Last month" /
     "Last 3 months" / "Last 12 months" / "Custom".
   - Selected segment: `marketing.color-brand-green-100` background,
     `marketing.color-brand-green-600` text.
   - "Custom" reveals an inline date-range picker.
   - Right side: "Export CSV" Secondary ActionButton (per Open Question 1
     default assumption).

2. **KPI row** — CSS grid `repeat(4, 1fr)`, `space-6` gap:
   - Total revenue (DKK).
   - Total broker cost (DKK).
   - Total network fees (DKK).
   - Total margin (DKK) with margin % as sub-line.

3. **Revenue & margin trend chart** — FinancialChart:
   - Two lines: revenue (solid green), margin (dashed green).
   - Period matches the page's active period.

4. **Per-month breakdown** — DataTable:
   - Columns: Month, Active customers, Revenue, Broker cost, Network fees,
     Margin, Margin %.
   - Numeric columns right-aligned, tabular figures.

5. **Top / Bottom 10 by margin** — two side-by-side compact DataTables in
   a 2-col grid:
   - Title left: "Top 10 customers by margin".
   - Title right: "Bottom 10 customers by margin".
   - Columns each: Rank, Customer (link), Margin (DKK).

### Pricing Management

**Page title:** "Pricing".

**Layout (vertical stack, `space-8` gap):**

1. **Current values panel** — single card, full width, `space-6` padding.
   - Two-column grid (`repeat(2, 1fr)`, `space-8` gap):
     - **Per-kWh markup** column:
       - Label: "PER-KWH MARKUP" — `text-subheading` `color-text-muted`.
       - Value: `text-display-l` (32px, bumped to 48px to read as a "large
         numeral") — e.g. "12.5 øre/kWh".
       - Trailing edit icon-only button (24px square) in
         `color-text-link`, visible only to admins; otherwise disabled
         with tooltip "Admin role required".
       - Caption below: `text-caption` `color-text-muted` —
         "Last changed {timestamp} by {employee}".
     - **Subscription fee** column: same treatment, value in DKK/month.

2. **Edit modal** (ConfirmationModal, 560px wide, opens on edit):
   - Title: "Update pricing".
   - Body fields:
     - Per-kWh markup numeric input (decimal, suffix "øre/kWh").
     - Subscription fee numeric input (decimal, suffix "DKK / month").
   - "Continue" button (Primary, 44px) does NOT save — it advances to
     **confirmation step** which shows a payload preview block:
     - Headline (verbatim per US-07): "You are about to change pricing for
       {N} active customers. New markup: {X} øre/kWh. New subscription fee:
       {Y} DKK/month. Effective from now. This action is logged."
     - Localised Danish copy (per spec localisation requirement) below in
       muted text: "Ændringen træder i kraft fra næste faktureringsperiode."
     - Action row: "Back" Secondary, "Confirm change" Primary
       (44px). On confirm, primary enters loading state.
   - On save success, modal closes, page values update, a success toast
     appears top-right ("Pricing updated").
   - On save failure, inline error banner above action row:
     "Could not save pricing change. The previous values are still in
     effect. Please try again." (verbatim per Error States).

3. **History table** — DataTable, full width.
   - Title above: "Change history" (`text-heading`).
   - Columns: Effective from, Effective to, Markup (øre/kWh), Subscription
     fee (DKK), Changed by, Reason.
   - Reverse chronological. The current row's "Effective to" cell reads
     "—" in `color-text-muted`.

### Payment Management

**Page title:** "Payments".

**Layout:** two-tab page.

**Tab strip (top of content area):**
- Tabs: "Failed payments" (default), "Webhook events".
- Selected tab: `marketing.color-brand-green-600` text, 2px bottom border
  in `marketing.color-brand-green-500`.
- Unselected tab: `color-text-secondary`, no border.
- Right side of tab strip: "Refresh from MobilePay" Secondary ActionButton
  (per Error States entry).

**Failed payments tab:**
- DataTable, full width.
- Filter bar: search by customer name/ID; date-range filter; failure-reason
  filter.
- Columns: Customer (link), Customer ID (mono), Amount (DKK), Due date,
  Failure reason, Charge ID (mono), Agreement ID (mono).
- Row actions on hover (admin only):
  - "Retry" (refresh icon) → ConfirmationModal showing customer name,
    amount, due date.
  - "Open customer" (chevron-right) → Customer Detail.

**Webhook events tab:**
- WebhookEventLog component as specified.

### Audit Log

**Page title:** "Audit log".

**Layout:** single full-width DataTable.

**Filter bar:**
- Search: free text against `targetId`, `employeeId`, `action`.
- Filter chips: action type (multi-select), employee (multi-select),
  date range (default last 30 days).

**Columns:**

| Column | Type | Notes |
|---|---|---|
| Timestamp | date+time, Europe/Copenhagen | `text-body` |
| Employee | name + ID in caption | — |
| Action | chip in `text-mono-s` (e.g. `pricing.update`) | colour-coded by category: pricing = green, customer = neutral, charge = amber |
| Target | type + ID (mono) | — |
| Reason | truncated `text-body` with tooltip if long | — |
| Details | "View" ghost button | Opens a side panel showing `before`/`after` JSON in mono |

**Side panel:**
- Slides in from right, 480px wide, full content height, `shadow-modal`,
  `radius-l` on left edges only.
- Two stacked code blocks: "Before" and "After", each in a
  `color-surface-card-muted` panel with `text-mono-m`.
- Close button (×) in top-right.

---

## Motion & Animation

Motion is restrained. The portal is a work tool, and most users perform
hundreds of interactions per day; long animations create cumulative drag.

| Motion | Duration | Easing | Notes |
|---|---|---|---|
| Page transitions | 0ms | — | SPA route changes swap instantly. No fade. |
| Modal open | 150ms | `ease-out` | Opacity 0 → 1; no transform. |
| Modal close | 100ms | `ease-in` | Opacity 1 → 0. |
| Side panel (Audit Log details) | 200ms | `ease-out` | Translate-x from +24px to 0; opacity 0 → 1. |
| Table row action slide-in | 200ms | `ease-out` | Translate-x from +8px to 0; opacity 0 → 1. Triggered on row hover or focus. |
| Table sort indicator change | 0ms | — | Instant. |
| Skeleton shimmer | 1400ms loop | `ease-in-out` | Linear gradient sweep across `marketing.color-neutral-100`. |
| KPI card hover | 120ms | `ease-out` | Shadow strengthens. |
| Button hover | 80ms | `ease-out` | Background colour cross-fade. |
| Toast appearance | 150ms | `ease-out` | Translate-y from +8px to 0; opacity 0 → 1. Auto-dismiss after 4s; pauses on hover. |
| Tab strip indicator | 120ms | `ease-out` | Underline translate-x to active tab. |

**Never animated:** numerals (no count-up animations on KPIs), chart line
draw beyond 200ms opacity fade, status badge state changes, focus rings.

**Reduced motion:** when the user has `prefers-reduced-motion: reduce`, all
durations above are reduced to 0ms except for the toast auto-dismiss
fade (which stays at 150ms for legibility) and the modal scrim (which
stays at 100ms to avoid jarring contrast change).

---

## Accessibility

The portal targets WCAG 2.1 AA compliance.

**Contrast (verified for stated tokens against stated backgrounds):**
- `color-text-primary` on `color-surface-page`: ≥ 12:1.
- `color-text-secondary` on `color-surface-page`: ≥ 8:1.
- `color-text-muted` on `color-surface-page`: ≥ 4.5:1.
- `marketing.color-brand-green-500` on `color-neutral-0` (primary button
  text white on green-500): ≥ 4.5:1.
- All status text on its paired `*-bg` token: ≥ 4.5:1.
- Focus ring `color-focus-ring` against any surface: visually distinct at
  ≥ 3:1 luminance contrast and 2px outset.

**Keyboard navigation:**
- Tab order follows visual order: TopBar (skip link → user menu) →
  Sidebar nav → Main content.
- A "Skip to main content" link appears as the first focusable element on
  every page; visually hidden until focused, then rendered as a Primary
  ActionButton at top-left.
- All DataTable rows are reachable with `Tab` and activatable with
  `Enter`. Within a row, sub-actions are reachable with `Tab`; arrow keys
  move between rows.
- DataTable sortable headers are activated with `Enter` or `Space`.
- Pagination controls are buttons reachable in tab order.
- Tab strip uses `role="tablist"`, arrow-key navigation between tabs,
  Enter/Space to activate.

**Focus management:**
- Visible focus ring (`color-focus-ring`, 2px, 2px offset) on every
  focusable element. Never `outline: none` without a replacement.
- Focus is moved into modals on open and trapped until close.
- Focus returns to the triggering element on modal close.
- Side panels (Audit Log details) trap focus identically.

**Screen reader labels:**
- StatusBadge exposes its state via accessible name, e.g.
  `aria-label="Status: Active"`. The visual label alone is not relied
  upon.
- KPICard trend indicators expose direction via accessible text:
  `aria-label="Up 12 this week"` (the arrow glyph itself is
  `aria-hidden="true"`).
- DataTable column headers use `<th scope="col">`. Sort state is exposed
  via `aria-sort="ascending|descending|none"`.
- Row action icon-only buttons all have an `aria-label` (e.g., "Retry
  failed charge for Lars Nielsen").
- Charts include a textual summary (`<figcaption>` or visually hidden
  description) of the trend, e.g. "MRR over the last 12 months: rising
  from DKK 180,000 to DKK 248,000".
- Toast notifications use `role="status"` (non-blocking) for success and
  `role="alert"` for error.
- Banners (deregistration pending, stale spot price, etc.) use
  `role="status"` for informational variants and `role="alert"` for
  red/error variants.

**Forms:**
- Every input has a programmatically associated `<label>`.
- Inline error messages use `aria-describedby` to associate with the
  input; the input also receives `aria-invalid="true"`.
- Required fields are marked with both a visual asterisk and the
  `required` attribute.

**Motion preference:** `prefers-reduced-motion` honoured per the Motion
section.

**Out of scope for v1 (per functional spec):** full screen-reader
optimisation beyond the labels above is desirable but not blocking.

---

## Responsive behaviour (desktop-first, but functional at 1024px+)

The portal is designed for desktop. The minimum supported viewport is
1024 × 720. Below 1024px width, the portal renders a single full-screen
notice ("The admin portal is designed for desktop. Please use a screen at
least 1024px wide.") and no functional UI.

### Breakpoints

| Breakpoint | Range | Behaviour |
|---|---|---|
| `desktop-l` | ≥ 1440px | Default. Content centred at max-width 1440px. Sidebar 240px. KPI grid 4 columns. Customer Detail two-column with 360px left rail. |
| `desktop-m` | 1280–1439px | Content fills viewport minus sidebar; horizontal padding `space-8`. KPI grid 4 columns. Customer Detail two-column unchanged. Tables may horizontal-scroll if total column width exceeds available space. |
| `desktop-s` | 1024–1279px | Horizontal padding reduced to `space-6`. KPI grid drops to 2 columns (2×2). Customer Detail collapses to single column (left rail above right column). Sidebar remains 240px. Tables use horizontal scroll. |
| `unsupported` | < 1024px | Viewport-blocking notice as above. |

### Component-specific responsive notes

- **DataTable**: at `desktop-s`, columns marked `priority: secondary`
  (e.g., Metering point on Customer List, Reason on Audit Log) collapse
  into a "More" expandable row instead of horizontal scroll, where
  feasible. Otherwise the table scrolls horizontally with a sticky first
  column (Name).
- **KPICard**: minimum width 240px; cards never shrink below this and
  the grid wraps to fewer columns instead.
- **FinancialChart**: minimum height 240px; chart aspect ratio adjusts but
  legend and header remain inline at all supported widths.
- **ConfirmationModal**: width never exceeds 90vw; at `desktop-s` the
  payload preview block stacks vertically.
- **CustomerDetailPanel**: collapses to single column at `desktop-s`. The
  Support actions card moves to the bottom of the page (after Payment
  history) so primary information is reached first.

### Print

Printing is not a v1 requirement. The Financial Overview page should
nonetheless print legibly at A4 portrait: hide sidebar and TopBar, render
content full-width, force light-on-white colours, drop hover/focus
styling. (Defer detailed print stylesheet to v1.1.)

---

## Open design questions

The following design-level questions are not resolved by the functional
spec or this document; they are surfaced for the team:

1. **Brand wordmark colour on the dark sidebar surface** — The sidebar is
   only ~3% darker than the page; the marketing logo's primary colour
   should still read clearly. Owner: Brand. Default: use
   `marketing.color-brand-green-600` monochrome wordmark.
2. **Avatar source** — Initials only in v1, or pull profile photos from
   the company IdP? Owner: IT/Brand. Default: initials only.
3. **Toast positioning** — Top-right (default in this spec) or bottom-right?
   Owner: Product. Default: top-right, 16px from top and right edges,
   below the TopBar.
4. **Iconography library** — Lucide, Heroicons, or a bespoke set matching
   the marketing site? Owner: Design. Default: Lucide (open licence,
   matches the geometric, restrained style described here).
5. **Danish vs English copy in this spec** — Verbatim spec strings are
   English (per US-07, US-10); the localised Pricing modal includes a
   Danish secondary line. Owner: Localisation lead. Default: English
   primary copy for v1 employee tool, Danish where the functional spec
   prescribes it.
