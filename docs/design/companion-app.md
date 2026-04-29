# Design Specification: Companion iOS App

**Feature:** The Cheap Power Company — Companion iOS App
**Status:** Draft v1
**Last updated:** 2026-04-29
**Audience:** iOS designers, iOS implementers, product, accessibility QA
**Related specs:** [`/docs/specifications/companion-app.md`](../specifications/companion-app.md)

---

## 1. Design Principles

The visual design is governed by five principles. Every component, screen,
and motion choice in this document must be traceable to one or more of
them. Where they conflict, the priority order is:

1. **Numbers first.** The hero numerals (price, bill, next payment) are
   the loudest things on screen. Chrome, labels, and decoration shrink
   to make room for them.
2. **One screen, one job.** Home is a dashboard, not a control panel.
   Price Detail is a chart. Consumption is a breakdown. No screen has
   more than one primary purpose.
3. **Liquid glass calm.** Translucent material, soft green light, deep
   negative space. The interface should feel like sunlit frosted glass
   — not glossy, not skeuomorphic, not flat. Reference: iOS 26
   `.glassEffect()` and the visionOS panel idiom.
4. **Trust through restraint.** No gradients on text. No marketing
   colours. No upsell modals. The price is the price; the design
   doesn't try to sell it.
5. **Accessible by default.** Everything works at `accessibility3`
   Dynamic Type, Reduce Motion, Reduce Transparency, and VoiceOver
   without a redesign. If a component fails any of these, it is
   incomplete.

---

## 2. Colour Tokens

All colours are defined as semantic tokens. **Components must reference
tokens by name, never raw hex.** Hex values below are the source of
truth for the asset catalog.

### 2.1 Brand & Surface

| Token | Light value | Dark value | Usage |
|---|---|---|---|
| `colorBrandPrimary` | `#1FA85C` 100% | `#3FD587` 100% | Primary accents, MitID button, brand chrome |
| `colorBrandPrimarySoft` | `#1FA85C` 12% | `#3FD587` 18% | Tinted glass background behind hero card |
| `colorBrandPrimaryPressed` | `#168A4A` 100% | `#2FB872` 100% | Pressed state for primary buttons |
| `colorSurfaceBase` | `#F5FAF6` 100% | `#0C1410` 100% | App background, behind everything |
| `colorSurfaceElevated` | `#FFFFFF` 100% | `#16201A` 100% | Sheets, action sheets, opaque modals |
| `colorSurfaceTint` | `#1FA85C` 4% | `#3FD587` 6% | Subtle vertical gradient overlay on `colorSurfaceBase` |

### 2.2 Glass

| Token | Light value | Dark value | Usage |
|---|---|---|---|
| `colorGlassFill` | `#FFFFFF` 55% | `#FFFFFF` 8% | GlassCard fill (paired with `.ultraThinMaterial`) |
| `colorGlassFillStrong` | `#FFFFFF` 72% | `#FFFFFF` 14% | Hero PriceDisplay card (paired with `.thinMaterial`) |
| `colorGlassBorder` | `#FFFFFF` 30% | `#FFFFFF` 12% | 1px inner border on every glass surface |
| `colorGlassHighlight` | `#FFFFFF` 60% | `#FFFFFF` 20% | 1px top-edge inner highlight, evokes refraction |
| `colorGlassShadow` | `#000000` 8% | `#000000` 40% | Drop shadow under glass cards |

### 2.3 Text

| Token | Light value | Dark value | Usage |
|---|---|---|---|
| `colorTextPrimary` | `#0E1A12` 100% | `#F1F7F2` 100% | Hero numerals, headlines |
| `colorTextSecondary` | `#0E1A12` 60% | `#F1F7F2` 70% | Captions, "Opdateret kl. HH:mm", labels |
| `colorTextTertiary` | `#0E1A12` 38% | `#F1F7F2` 45% | Disabled rows, muted metadata |
| `colorTextOnBrand` | `#FFFFFF` 100% | `#0C1410` 100% | Text on `colorBrandPrimary` fill |

### 2.4 Semantic accents

The price-tile colour-coding (US-03 / US-04) uses these. **No red is
used anywhere in v1** — the existing spec forbids it and the design
respects that. `colorAccentNegative` is amber, not red.

| Token | Light value | Dark value | Usage |
|---|---|---|---|
| `colorAccentPositive` | `#1FA85C` 100% | `#3FD587` 100% | Cheap price (below 7-day average) |
| `colorAccentNeutral` | `#0E1A12` 70% | `#F1F7F2` 70% | Average price (within ±10%) |
| `colorAccentNegative` | `#C98A12` 100% | `#E8B144` 100% | Above-average price |
| `colorAccentLive` | `#1FA85C` 100% | `#3FD587` 100% | Live data dot on PriceDisplay |
| `colorAccentStale` | `#C98A12` 100% | `#E8B144` 100% | Stale data dot on PriceDisplay |

### 2.5 Dark Mode

All tokens above are defined as adaptive `UIColor` / `Color` in the
asset catalog. The system swaps automatically when the OS appearance
changes; no code branches on `colorScheme`. Dark-mode tuning beyond
these adaptive pairs is out of scope per the existing spec, but the
tokens in this document are sufficient for a coherent dark experience.

### 2.6 Reduce Transparency

When `UIAccessibility.isReduceTransparencyEnabled`, replace:
- `colorGlassFill` → `colorSurfaceElevated`
- `colorGlassFillStrong` → `colorSurfaceElevated`
- `colorGlassBorder` → 1px `colorTextTertiary`
- Drop the inner highlight entirely.

Materials (`.ultraThinMaterial` / `.thinMaterial`) become opaque fills
automatically under Reduce Transparency in SwiftUI; verify this in QA.

---

## 3. Typography Tokens

System font: **SF Pro Text** for body, **SF Pro Rounded** for the hero
numerals only. Numerals are tabular (`.monospacedDigit()`) everywhere a
number can change in place — this prevents jitter on refresh.

All tokens map to a `UIFont.TextStyle` so Dynamic Type works without
extra code. Sizes below are at the default content size category.

| Token | Size / Weight | Font face | Maps to | Usage |
|---|---|---|---|---|
| `fontDisplayXL` | 64pt / Bold | SF Pro Rounded | `.largeTitle` (custom) | Hero price numeral on Home, hero kWh number on Consumption |
| `fontDisplay` | 48pt / Bold | SF Pro Rounded | `.largeTitle` | Bill total on BillSummaryCard, period total on Consumption |
| `fontTitle1` | 28pt / Bold | SF Pro Text | `.title` | Screen titles when navigation bar is large-title |
| `fontTitle2` | 22pt / Semibold | SF Pro Text | `.title2` | Section headers inside a screen |
| `fontHeadline` | 17pt / Semibold | SF Pro Text | `.headline` | GlassCard titles, list-row primary text |
| `fontBody` | 17pt / Regular | SF Pro Text | `.body` | Paragraph copy, list-row secondary text |
| `fontCallout` | 16pt / Regular | SF Pro Text | `.callout` | Inline helper text, button labels in dense rows |
| `fontSubheadline` | 15pt / Regular | SF Pro Text | `.subheadline` | "øre/kWh" unit label, chart axis labels |
| `fontFootnote` | 13pt / Regular | SF Pro Text | `.footnote` | "Opdateret kl. HH:mm", DK1/DK2 chip text |
| `fontCaption` | 12pt / Regular | SF Pro Text | `.caption` | Stale-data captions, fine print |
| `fontCaption2` | 11pt / Medium | SF Pro Text | `.caption2` | Bar-chart hour labels |

**Dynamic Type rules**
- Every text token must scale up to `accessibility3` without truncation
  except where explicitly noted.
- `fontDisplayXL` is permitted to truncate with middle ellipsis at the
  largest sizes; the unit label below it is the fallback for clarity.
- Numbers in `BillSummaryCard` and `PriceDisplay` always use
  `.monospacedDigit()` so they don't reflow when the value updates.

---

## 4. Spacing & Layout Tokens

A 4pt base grid. All spacing references the tokens below — no raw
points in component specs.

| Token | Value | Usage |
|---|---|---|
| `space2xs` | 4pt | Icon-to-label gap, chip internal padding |
| `spaceXs` | 8pt | Stack of related labels (number + unit) |
| `spaceSm` | 12pt | List-row vertical padding, chart bar gaps |
| `spaceMd` | 16pt | Default card internal padding, edge insets |
| `spaceLg` | 24pt | Inter-card vertical spacing on Home |
| `spaceXl` | 32pt | Section breaks within a screen |
| `space2xl` | 48pt | Top breathing room above hero numerals |
| `space3xl` | 64pt | Reserved for Login screen vertical centring |

| Token | Value | Usage |
|---|---|---|
| `radiusSm` | 8pt | Inline chips (DK1/DK2), small pill buttons |
| `radiusMd` | 16pt | Inline buttons, secondary cards |
| `radiusLg` | 20pt | **Default GlassCard radius** |
| `radiusXl` | 28pt | Hero PriceDisplay card |
| `radiusFull` | 999pt | Pills, status badges, freshness dots (after sizing) |

**Screen edge inset:** `spaceMd` (16pt) horizontal on all screens.
**Safe-area top:** Native; navigation bar handles it.
**Safe-area bottom:** Native; tab bar handles it.

**Card-stack rhythm on Home:** Cards are separated by `spaceLg` (24pt).
The hero PriceDisplay card has `spaceXl` (32pt) above it from the
navigation bar baseline to give the hero number its breathing room.

---

## 5. Iconography

SF Symbols only. No custom icon set in v1. Weight: `.regular` on body
icons, `.semibold` for tab bar selected state, `.medium` for navigation
chrome.

| Token | SF Symbol | Usage |
|---|---|---|
| `iconHome` | `house` / `house.fill` | Tab bar — Home |
| `iconConsumption` | `chart.bar` / `chart.bar.fill` | Tab bar — Forbrug |
| `iconAccount` | `person.crop.circle` / `person.crop.circle.fill` | Tab bar — Konto |
| `iconRefresh` | `arrow.clockwise` | Pull-to-refresh, manual refresh |
| `iconPriceUp` | `arrow.up` | Above-average price indicator (paired with colour) |
| `iconPriceDown` | `arrow.down` | Below-average price indicator |
| `iconPriceNeutral` | `minus` | Average price indicator |
| `iconLive` | `circle.fill` (sized 8pt) | Live-data dot |
| `iconInfo` | `info.circle` | Info chips, DK1/DK2 explainer |
| `iconChevron` | `chevron.right` | List-row navigation affordance |
| `iconExternal` | `arrow.up.right.square` | MobilePay / Eloverblik deep-links |
| `iconWarn` | `exclamationmark.triangle` | Payment-failure banner |
| `iconCheck` | `checkmark.circle.fill` | Payment-success toast |
| `iconClose` | `xmark` | Sheet dismiss |
| `iconMitID` | Custom asset `brand-mitid` | MitID button only — required by MitID brand guide |

The MitID logo is the **only** non-SF-Symbol icon in v1, and is
provided as a vector asset by Signicat / MitID brand kit.

---

## 6. Component Library

Every component below specifies: visual structure, tokens used,
interaction states, accessibility behaviour, and Reduce Motion / Reduce
Transparency fallbacks.

### 6.1 GlassCard

**Purpose:** The primary surface for all content panels. Every
substantive piece of content on Home, Consumption, and Account sits
inside a GlassCard.

**Visual structure**
- Background: SwiftUI material — `.ultraThinMaterial` for standard
  cards, `.thinMaterial` for the hero PriceDisplay card. Material is
  layered over `colorGlassFill` (or `colorGlassFillStrong` for hero).
- Corner radius: `radiusLg` (20pt) standard, `radiusXl` (28pt) for hero.
- Inner border: 1pt stroke, `colorGlassBorder`, inset by 0.5pt so it
  reads as a refraction edge.
- Inner top-edge highlight: 1pt line, `colorGlassHighlight`, inset 1pt
  from the top edge, fades horizontally to 0% opacity at the corners.
- Drop shadow: `0pt 4pt 24pt` offset/blur, `colorGlassShadow`.
- Internal padding: `spaceMd` (16pt) on all sides, `spaceLg` (24pt)
  for hero.

**Behind-the-glass tint:** A faint `colorBrandPrimarySoft` shape sits
behind every card at 60% scale, blurred with a 40pt gaussian, to give
the material something green to refract. This is what makes the glass
read as warm rather than neutral.

**States**
- **Default:** as above.
- **Pressed (when card is tappable):** 0.98 scale, shadow halves.
  Spring animation, 180ms.
- **Disabled:** card body at 50% opacity, no press affordance.

**Stacking on Home:** Cards stack vertically with `spaceLg` (24pt)
between them. The hero PriceDisplay card is the largest; subsequent
cards (BillSummaryCard, today's price teaser) are visually quieter
through smaller radius and `colorGlassFill` instead of
`colorGlassFillStrong`.

**Accessibility**
- A GlassCard is a single accessibility element if it is tappable.
  Children are merged via `.accessibilityElement(children: .combine)`.
- Reduce Transparency: solid `colorSurfaceElevated` fill, drop shadow
  preserved at `colorGlassShadow`, inner highlight removed, border
  changes to `colorTextTertiary`.

---

### 6.2 PriceDisplay

**Purpose:** The hero number on Home. Answers "What am I paying right
now?" in under one second.

**Visual structure (top to bottom inside the hero GlassCard)**
1. **Top row** — left-aligned area chip ("DK1" or "DK2"), right-aligned
   freshness indicator (live dot + "Live" or "Sidst opdateret kl.
   HH:mm").
   - Area chip: `radiusFull`, `fontFootnote`, `colorBrandPrimarySoft`
     fill, `colorBrandPrimary` text. Tappable, opens the area-explainer
     sheet (US-05).
   - Freshness indicator: 8pt circle (`colorAccentLive` if data <90min
     old, `colorAccentStale` if older), followed by `fontFootnote` text
     in `colorTextSecondary`.
2. **Hero numeral** — current all-in price as integer øre/kWh,
   `fontDisplayXL`, colour determined per the rules below.
   `.monospacedDigit()` always.
3. **Unit label** — "øre/kWh", `fontSubheadline`, `colorTextSecondary`,
   centred under the numeral, `space2xs` gap.
4. **Trend row** — small horizontal stack: trend arrow icon
   (`iconPriceDown` / `iconPriceNeutral` / `iconPriceUp`), `space2xs`
   gap, then `fontCaption` text describing the comparison
   ("Under gennemsnittet", "Omkring gennemsnittet", "Over
   gennemsnittet"). The icon is tinted to match the numeral colour.

**Numeral colour rules** (mirroring US-03)
- **Below 7-day rolling average:** `colorAccentPositive` numeral,
  `iconPriceDown` arrow.
- **Within ±10% of average:** `colorAccentNeutral` numeral,
  `iconPriceNeutral` glyph.
- **Above average:** `colorAccentNegative` numeral, `iconPriceUp`
  arrow.

The arrow icon is mandatory — colour alone never carries meaning
(WCAG 1.4.1).

**Interaction**
- Whole card is tappable, navigates to Price Detail.
- Pressed state inherits from GlassCard.

**Accessibility label** (VoiceOver)
- Format: `"Nuværende pris [N] øre per kilowatt-time, [trend
  description], prisområde [DK1/DK2], opdateret kl. HH:mm."`
- Example: `"Nuværende pris 32 øre per kilowatt-time, under
  gennemsnittet, prisområde DK1, opdateret kl. 14:05."`

---

### 6.3 BillSummaryCard

**Purpose:** Shows the second-most-important number — what the
customer owes so far this period — and previews the next charge.

**Visual structure (inside a standard GlassCard)**
- **Header row:** `fontHeadline` "Denne periode" left-aligned;
  `fontFootnote` period descriptor right-aligned ("Uge 18" or
  "April"), `colorTextSecondary`.
- **Hero number row:** `fontDisplay` (48pt bold rounded) DKK total,
  followed by `fontSubheadline` "kr.", `colorTextPrimary`.
  `.monospacedDigit()`.
- **Divider:** 1pt `colorGlassBorder`, full width with `spaceMd`
  vertical padding above/below.
- **Next-payment row:** two-column layout.
  - Left: `fontFootnote` `colorTextSecondary` label "Næste betaling".
    Below it, `fontCallout` `colorTextPrimary` date ("3. maj") and
    projected amount ("ca. 412 kr.").
  - Right: PaymentStatusBadge (component 6.6) reflecting agreement
    state.

**Interaction**
- Whole card tappable, navigates to Consumption.

**States**
- **Stale consumption:** appends `fontCaption` `colorTextSecondary`
  caption "Forbrug opdateres med op til 1 dags forsinkelse" beneath
  the divider.
- **Catastrophic stale (no estimate):** hero number renders as `—`,
  caption "Vi henter snart dine forbrugstal." (per existing spec
  Error States).

**Accessibility label**
- Format: `"Denne periode, [Period descriptor]. Hidtil [N] kroner.
  Næste betaling [date], cirka [N] kroner. Status [status]."`

---

### 6.4 HourlyPriceChart

**Purpose:** 24-bar vertical chart showing today's hourly all-in
prices. The single piece of content on Price Detail.

**Visual structure**
- Built with SwiftUI `Charts` (iOS 16+); manual `Rectangle` fallback
  for iOS 15.
- 24 bars, one per hour, even spacing. `spaceSm` (12pt) horizontal
  margin around the chart inside its GlassCard.
- Y-axis starts at 0 øre/kWh (per US-05). Grid lines are
  `colorGlassBorder`, hairline.
- Y-axis labels: `fontCaption2` `colorTextSecondary`, three labels
  total (0, mid, max).
- X-axis labels: `fontCaption2` `colorTextSecondary`, every 6 hours
  ("00", "06", "12", "18").

**Bar colour rule**
- Bars are filled with a vertical gradient stop derived from a
  green-to-amber ramp:
  - Bottom of bar: 100% bar tint
  - Top of bar: 70% bar tint
- Bar tint per hour:
  - Hour price < 7-day average: `colorAccentPositive`
  - Within ±10% of average: `colorAccentNeutral` at 60% opacity
  - Above average: `colorAccentNegative`
- The chart is intentionally a green-to-amber ramp, **never green to
  red** — anxiety colours are out per existing spec.

**Current-hour highlight**
- Current-hour bar gets a 2pt outline in `colorTextPrimary` and a
  small `iconLive`-style dot above the bar in `colorAccentLive`.
- All other bars at 100% opacity; current-hour bar slightly
  emphasised by outline only — no opacity dimming of others (keeps
  the chart readable at a glance).

**Interaction**
- **Tap a bar:** the bar's price floats above as a tooltip
  (`fontHeadline` price, `fontFootnote` "kl. HH–HH"), in a small
  GlassCard tooltip with `radiusMd`. Tooltip auto-dismisses after 3s
  or on next tap.
- **Drag (long-press + scrub):** tooltip follows the touched bar in
  real time. Releases stick to the last bar for 3s.
- Haptic: `.light` selection feedback when tooltip moves to a new bar.

**Reduce Motion fallback**
- No grow-from-baseline animation on entrance — bars render at full
  height immediately.
- No tooltip slide; tooltip cross-fades.
- Drag scrubbing still works but bar selection is instant.

**Accessibility**
- The chart container has `accessibilityLabel` "Timepriser i dag".
- Each bar is its own accessibility element with a label per bar:
  `"Kl. [HH], [N] øre per kilowatt-time, [trend description]."`
  Example: `"Kl. 14, 45 øre per kilowatt-time, over gennemsnittet."`
- iOS 16+: also exposes `accessibilityChartDescriptor` so VoiceOver
  users get the full data series.
- iOS 15: hidden text summary below the chart lists all 24 hours and
  prices.

---

### 6.5 ConsumptionChart

**Purpose:** Daily kWh usage bars on Consumption screen, plus the
cost-breakdown stacked bar above it.

**Cost-breakdown bar (top)**
- Single horizontal bar, full width inside its GlassCard, 24pt tall,
  `radiusFull`.
- Six segments in fixed order (per US-07): spot, network tariff,
  Energinet, elafgift, VAT, TCPC margin.
- Segment colours: a six-step palette derived from
  `colorBrandPrimary` shifting through neutral greys. Each segment
  has a 1pt `colorSurfaceBase` separator on its right edge so adjacent
  segments are visually distinct without relying on hue alone.
- Segments are tappable: tapping reveals the DKK value in a popover
  (`fontHeadline` value, `fontFootnote` segment name).
- A legend below the bar lists segment-name + value pairs in a 2-column
  grid, `fontCallout` for names, `fontCallout` `.monospacedDigit()`
  for values.

**Daily-usage bars (below)**
- Vertical bar chart, one bar per day in selected period.
- Bar fill: solid `colorBrandPrimary` at 100%, gradient to 70% at top.
- Bar width: as wide as fits within `spaceSm` (12pt) gaps.
- X-axis: day-of-month numbers, `fontCaption2`.
- Y-axis: kWh, three labels (0, mid, max).

**Interaction & accessibility:** same pattern as HourlyPriceChart.

---

### 6.6 PaymentStatusBadge

**Purpose:** Compact pill showing MobilePay agreement state
(`PENDING` / `ACTIVE` / `STOPPED`) wherever it's needed (Account
header, BillSummaryCard).

**Visual structure**
- `radiusFull` pill, height 24pt, internal horizontal padding `spaceSm`.
- 8pt status dot + `fontFootnote` Danish label.
- States:

| State | Dot colour | Label | Pill fill |
|---|---|---|---|
| `ACTIVE` | `colorAccentLive` | "Aktiv" | `colorBrandPrimarySoft` |
| `PENDING` | `colorAccentStale` | "Afventer" | `colorAccentNegative` 12% |
| `STOPPED` | `colorTextTertiary` | "Stoppet" | `colorTextTertiary` 12% |

**Accessibility label:** `"Status: [Aktiv/Afventer/Stoppet]"`.

---

### 6.7 TabBar

**Purpose:** Three-tab bottom navigation: Home, Forbrug, Konto.

**Visual structure**
- Native SwiftUI `TabView` with `.tabBarStyle(.automatic)` on iOS 17+,
  customised to render with `.ultraThinMaterial` background and a
  1pt top hairline in `colorGlassBorder`.
- Three items only. Selected item: icon `.fill` variant,
  `colorBrandPrimary` tint, label in `fontCaption2` `colorBrandPrimary`.
- Unselected: outline icon, `colorTextSecondary` tint, label in
  `fontCaption2` `colorTextSecondary`.
- Tab labels (Danish): "Hjem", "Forbrug", "Konto".

**Interaction**
- Tap to switch: 200ms cross-fade between tabs (per Motion section).
- Haptic: `.light` selection feedback (`UISelectionFeedbackGenerator`).
- Double-tap selected tab: scrolls the active screen to top (native).

**Accessibility**
- Each tab has `accessibilityLabel` matching the visible label and
  `accessibilityValue` "valgt" when selected.
- Touch targets are 44×44pt minimum (native `TabView` honours this).

---

### 6.8 NavigationBar

**Purpose:** Native iOS `NavigationStack` chrome, lightly customised.

**Visual structure**
- Background: `.ultraThinMaterial` with no opaque fill — the bar
  becomes a glass band when scrolling content sits behind it.
- Title: large title (`fontTitle1`) in `colorTextPrimary` on Home,
  Forbrug, Konto. Inline title (`fontHeadline`) on pushed screens.
- Trailing item on Home: refresh button (`iconRefresh`) — optional
  affordance for users who don't discover pull-to-refresh.
- Back button: native chevron + previous-screen title.
- No custom segmented controls in the nav bar — segmented controls
  live in the screen content area (Price Detail "I dag / I morgen",
  Consumption "Denne periode / Sidste periode").

**Accessibility:** Native `NavigationStack` semantics; no custom
overrides needed.

---

## 7. Screen Designs

Each screen is described top-to-bottom with proportions appropriate to
a 6.1" iPhone (393×852pt logical) at default Dynamic Type. Larger
type / smaller devices reflow vertically; nothing is positioned with
absolute coordinates.

### 7.1 Login / MitID Auth

**Layout (top to bottom)**
1. Top safe-area: empty.
2. Centre block (vertically centred, ~40% from top):
   - Faded background illustration: line drawing of Denmark, single-
     stroke, `colorBrandPrimary` at 8% opacity, ~280pt tall, behind
     everything else.
   - TCPC wordmark logo, `fontTitle1`, `colorBrandPrimary`.
   - `space2xl` gap.
   - Single line of marketing copy: `fontBody`, `colorTextSecondary`,
     centred, max 2 lines: "Strøm til indkøbspris. Intet bøvl."
3. Bottom block (anchored 80pt above safe-area bottom):
   - **MitID button** — full width minus `spaceMd` margins, 56pt tall,
     `radiusLg`. Fill `colorBrandPrimary`, label "Log ind med MitID",
     `fontHeadline` `colorTextOnBrand`, `iconMitID` leading at
     `space2xs`.
   - `spaceMd` gap.
   - `fontFootnote` `colorTextTertiary` legal line: "Ved at logge ind
     accepterer du [vilkår] og [privatlivspolitik]." Both link
     fragments are tappable, opening sheets.
4. Background: `colorSurfaceBase` with the `colorSurfaceTint` vertical
   gradient overlay (subtle, top-heavy).

**Components used:** none beyond the button. No GlassCard on Login —
this is the only screen without one.

**Navigation bar:** Hidden.
**Tab bar:** Hidden.

**Error states:** Inline copy below the button (per existing spec
Error States section). Single retry button beside the inline copy.

---

### 7.2 Home / Dashboard

**Layout (top to bottom)**
1. Navigation bar: large title "Hjem". Trailing `iconRefresh` button.
2. `space2xl` gap (this is the breathing room above the hero).
3. **Hero PriceDisplay card** — full width minus `spaceMd` margins,
   approximately 220pt tall at default type. `colorGlassFillStrong`,
   `radiusXl`. Contains the PriceDisplay component (6.2).
4. `spaceLg` gap.
5. **BillSummaryCard** — full width, ~140pt tall. `colorGlassFill`,
   `radiusLg`. Contains the BillSummaryCard component (6.3).
6. `spaceLg` gap.
7. **Today's price teaser card** — full width, ~160pt tall.
   `colorGlassFill`, `radiusLg`. Contains:
   - Header row: `fontHeadline` "I dag" left, `fontFootnote` chevron
     "Se alle timer" right.
   - Mini HourlyPriceChart: same component (6.4) but 80pt tall and
     non-interactive (taps go to Price Detail). Y-axis labels hidden.
8. `spaceLg` gap.
9. `fontFootnote` `colorTextTertiary` "Opdateret kl. HH:mm" centred.
10. Bottom safe area.

**Components used:** GlassCard (×3), PriceDisplay, BillSummaryCard,
HourlyPriceChart (mini variant), TabBar.

**Tab bar selection state:** "Hjem" selected.

**Pull-to-refresh:** Custom liquid-bead spinner — a small
`colorBrandPrimary` circle that stretches as the user pulls. On
release: `.medium` haptic. Reduce Motion: native iOS spinner.

**Stop / failure banners:** When applicable (per existing Error
States), a 48pt-tall banner appears above the hero card,
`colorAccentNegative` at 12% fill, `radiusMd`, with `iconWarn` leading
and `fontCallout` body text. Tapping the banner opens the relevant
remediation flow.

---

### 7.3 Price Detail

**Layout (top to bottom)**
1. Navigation bar: inline title "Priser i dag", back chevron.
2. `spaceMd` gap.
3. **Area chip row** — left-aligned area chip ("Prisområde: DK1"),
   trailing `iconInfo`. Tap opens area-explainer sheet.
4. `spaceMd` gap.
5. **Segmented control** — "I dag" / "I morgen". Native iOS segmented
   control styled with `.ultraThinMaterial` background.
   - "I morgen" disabled before ~13:00 CET, with caption below in
     `fontCaption` `colorTextSecondary`: "Morgendagens priser
     offentliggøres efter kl. 13."
6. `spaceLg` gap.
7. **Chart card** — full width minus margins, ~280pt tall.
   `colorGlassFill`, `radiusLg`. Contains the full HourlyPriceChart
   (6.4).
8. `spaceLg` gap.
9. **Summary card** — full width, `colorGlassFill`, `radiusLg`. Three
   rows, divided by hairlines:
   - "Billigst kl. HH–HH" — `fontBody` left, `fontHeadline`
     `.monospacedDigit()` value right ("12 øre/kWh").
   - "Dyrest kl. HH–HH" — same pattern.
   - "Gennemsnit i dag" — same pattern.

**Components used:** GlassCard (×2), HourlyPriceChart, TabBar.
**Tab bar selection state:** "Hjem" stays selected (Price Detail is
pushed from Home, not a tab).

---

### 7.4 Consumption

**Layout (top to bottom)**
1. Navigation bar: large title "Forbrug".
2. `spaceMd` gap.
3. **Period segmented control** — "Denne periode" / "Sidste periode".
4. `spaceLg` gap.
5. **Period totals card** — `colorGlassFill`, `radiusLg`. Two columns:
   - Left: `fontFootnote` "Forbrug" label, `fontDisplay` kWh value,
     `fontSubheadline` "kWh" unit.
   - Right: `fontFootnote` "Hidtil" label, `fontDisplay` DKK value,
     `fontSubheadline` "kr." unit.
6. `spaceLg` gap.
7. **Cost-breakdown card** — `colorGlassFill`, `radiusLg`.
   `fontHeadline` "Hvad du betaler for" header, then the
   ConsumptionChart cost-breakdown bar + legend (6.5).
8. `spaceLg` gap.
9. **Daily-usage card** — `colorGlassFill`, `radiusLg`. `fontHeadline`
   "Dagligt forbrug" header, then the daily-usage bar chart (6.5).
10. Bottom safe area.

**Empty state (no Eloverblik consent)** — replaces 5–9 above with a
single full-width GlassCard centred vertically:
- `iconExternal` 32pt, `colorBrandPrimary`, top.
- `fontTitle2` "Vi mangler adgang til dit forbrug".
- `fontBody` `colorTextSecondary` paragraph (per existing spec US-08).
- Primary button: "Giv adgang via Eloverblik", full width, 52pt tall,
  `radiusLg`, `colorBrandPrimary` fill, `colorTextOnBrand` label.

**Components used:** GlassCard (×3), ConsumptionChart, TabBar.
**Tab bar selection state:** "Forbrug" selected.

---

### 7.5 Account & Settings

**Layout (top to bottom)**
1. Navigation bar: large title "Konto".
2. `spaceMd` gap.
3. **Identity card** — `colorGlassFill`, `radiusLg`. Two-row:
   - Row 1: `fontHeadline` full name (from MitID), `fontFootnote`
     `colorTextSecondary` MP-area below ("Prisområde DK1").
   - Row 2: `fontBody` `colorTextSecondary` address.
4. `spaceLg` gap.
5. **Subscription card** — `colorGlassFill`, `radiusLg`. Header:
   `fontHeadline` "MobilePay-abonnement" + PaymentStatusBadge (6.6)
   trailing. Below the header, four list rows separated by hairlines:
   - "Maksbeløb" — current value right-aligned, `iconChevron`. Taps
     deep-link to MobilePay (`iconExternal`).
   - "Faktureringsinterval" — current value (Ugentligt / Månedligt)
     right-aligned, `iconChevron`. Taps open interval sheet.
   - "Næste betaling" — date + projected amount, no chevron.
   - "Stop abonnement" — `colorAccentNegative` text, no chevron. Taps
     open confirmation sheet.
6. `spaceLg` gap.
7. **Notifications card** — `colorGlassFill`, `radiusLg`. Two toggle
   rows:
   - "Betalingsbekræftelser" — toggle. Disabled with explainer if
     system permission denied.
   - "Prisvarsler" — toggle (default off).
8. `spaceLg` gap.
9. **Metering details card** — `colorGlassFill`, `radiusLg`. Read-only
   rows: metering point ID (last 4 digits visible), account creation
   date.
10. `spaceLg` gap.
11. **Footer** — vertical stack, centred:
    - "Log ud" text button, `colorAccentNegative`, `fontHeadline`.
    - `fontFootnote` `colorTextTertiary` app version & build.
    - `fontFootnote` link "Kontakt support" (mailto).

**Components used:** GlassCard (×4), PaymentStatusBadge, TabBar.
**Tab bar selection state:** "Konto" selected.

---

### 7.6 Notification Designs

The app does not draw push notifications itself — APNs renders them
using the system style. The design control we have is over **payload
copy** and **in-app surfaces**.

**System push (locked or banner)** — uses the strings from existing
spec section 5.6. Title + body only. No custom action buttons in v1.

**In-app toast (when app is foregrounded during a push)**
- Appears anchored to the top safe area, 16pt below the navigation
  bar.
- Full width minus `spaceMd` margins, ~64pt tall, `radiusLg`,
  `.thinMaterial` background, `colorGlassBorder`.
- Layout: leading icon (`iconCheck` for success, `iconWarn` for
  failure), `spaceSm` gap, two-line text stack (`fontHeadline` title,
  `fontFootnote` `colorTextSecondary` body).
- Slide-in from top, 280ms spring. Auto-dismiss after 4s. Tappable to
  open the relevant detail screen.

**Pre-prompt screen (before requesting system permission, US-13)**
- Full-screen modal, `colorSurfaceBase` background.
- Centred GlassCard, `colorGlassFill`, `radiusLg`, ~280pt tall.
  - Top: `iconLive`-style 56pt icon (or `bell.badge` SF Symbol),
    `colorBrandPrimary`.
  - `fontTitle2` "Få besked om dine betalinger".
  - `fontBody` `colorTextSecondary` paragraph (per existing spec).
  - Two buttons: primary "Slå notifikationer til" (triggers system
    prompt), secondary "Ikke nu" (dismisses).

**Failure banner (Home, persistent until cleared)** — see Error
States.

---

## 8. Motion & Animation

All durations and curves are defined as tokens. Reduce Motion
fallbacks are mandatory and listed beside each.

| Token | Value | Reduce Motion fallback |
|---|---|---|
| `motionDurationInstant` | 100ms | 0ms |
| `motionDurationQuick` | 200ms | 0ms (cross-fade) |
| `motionDurationStandard` | 250ms | 0ms (cross-fade) |
| `motionDurationDeliberate` | 300ms | 0ms (cross-fade) |
| `motionEaseStandard` | `.easeOut` | linear |
| `motionEaseSpring` | spring(response: 0.35, damping: 0.8) | linear cross-fade |

**Specific motion specs**

| Event | Animation | Reduce Motion |
|---|---|---|
| Tab switch | Cross-fade between tabs, `motionDurationQuick` (200ms), linear | Same — already a cross-fade |
| Screen push | Standard iOS NavigationStack slide | Standard iOS Reduce Motion behaviour (instant or cross-fade per OS) |
| GlassCard entrance (on screen appear) | Fade-up: opacity 0 → 1 + scale 0.96 → 1.0 + offset y +12pt → 0, `motionDurationStandard` (250ms), `motionEaseSpring`. Cards in a stack stagger by 40ms each | Cards appear at full opacity, no transform, instant |
| Card press | Scale 1.0 → 0.98, 180ms `motionEaseSpring` | Same scale (button-press affordance is preserved — this is a touch acknowledgement, not motion decoration) |
| Chart bar entrance | Each bar grows from baseline (height 0 → final), `motionDurationDeliberate` (300ms), `motionEaseSpring`, staggered 15ms across the 24 bars | Bars render at final height, no animation |
| Pull-to-refresh spinner | Custom liquid-bead: a `colorBrandPrimary` circle stretches vertically as the user pulls beyond threshold; on release, snaps back with `motionEaseSpring` while the data refreshes | Native iOS `UIRefreshControl` spinner |
| Toast slide-in | Top edge → resting position, `motionDurationStandard` (250ms), `motionEaseSpring` | Cross-fade in place, `motionDurationQuick` (200ms) |
| Tooltip on chart | Fade + scale 0.95 → 1.0, `motionDurationQuick` (200ms) | Cross-fade only |
| Sheet present / dismiss | Native iOS sheet | Native iOS Reduce Motion behaviour |

**Implementation note:** every animated modifier in SwiftUI is
wrapped in a helper that checks
`UIAccessibility.isReduceMotionEnabled` and substitutes the fallback.
This is enforced at code-review level — no raw `.animation(...)`
calls in component code.

---

## 9. Haptics

`UIFeedbackGenerator` only — no custom haptic patterns in v1.

| Event | Generator | Style |
|---|---|---|
| Tab bar switch | `UISelectionFeedbackGenerator` | `.selectionChanged()` (light) |
| Pull-to-refresh threshold reached | `UIImpactFeedbackGenerator` | `.medium` |
| Pull-to-refresh data returned | `UIImpactFeedbackGenerator` | `.light` |
| HourlyPriceChart bar selection | `UISelectionFeedbackGenerator` | `.selectionChanged()` |
| Successful payment confirmation toast | `UINotificationFeedbackGenerator` | `.success` |
| Payment failure notification (in-app) | `UINotificationFeedbackGenerator` | `.error` |
| MitID auth success (returning to Home) | `UINotificationFeedbackGenerator` | `.success` |
| Sheet primary action confirm (e.g., Stop abonnement) | `UIImpactFeedbackGenerator` | `.medium` |
| Toggle flip (notifications, Prisvarsler) | `UISelectionFeedbackGenerator` | `.selectionChanged()` |

**Rule:** haptics never fire alongside a system push (which has its
own haptic) or while VoiceOver is active in
`UIAccessibility.isVoiceOverRunning` (avoids competing feedback).

---

## 10. Accessibility

This section is normative. Components that fail any of these
requirements are not shippable.

### 10.1 VoiceOver

- Every interactive element has an `accessibilityLabel` in Danish.
- Every chart bar is its own focusable element with a label of the
  form `"Kl. [HH], [N] øre per kilowatt-time, [trend]."`
- GlassCards that are tappable announce `"Knap"` via
  `.accessibilityAddTraits(.isButton)`.
- Status pills use `accessibilityLabel` + `accessibilityValue`
  (e.g., label "Abonnementstatus", value "Aktiv").
- Toasts and banners use `UIAccessibility.post(notification:
  .announcement, ...)` so they're read aloud immediately.
- Pull-to-refresh exposes `accessibilityActions` for
  "Opdater indhold".

### 10.2 Dynamic Type

- All text uses the `fontXXX` tokens (mapped to `UIFont.TextStyle`).
- Layout reflows vertically — no fixed heights on text containers.
- The hero PriceDisplay numeral may truncate at `accessibility3` and
  above; the unit label and trend row remain visible to preserve
  meaning.
- Tested at: `xSmall`, `large` (default), `xxxLarge`,
  `accessibility3`. No clipping of meaningful content.

### 10.3 Touch targets

- Minimum tappable area: 44×44pt for every interactive element.
- Where the visible affordance is smaller (e.g., the live-data dot
  isn't a button itself), no accessibility action is exposed.
- Chart bars are individually tappable; their hit area includes the
  full vertical column from y=0 to chart top, regardless of bar
  height, so short bars aren't unhittable.

### 10.4 Colour contrast

- All text/background combinations meet WCAG 2.1 AA (4.5:1 for body,
  3:1 for large text >24pt or 19pt bold).
- Specifically verified: `colorTextSecondary` on `colorGlassFill` over
  `colorSurfaceBase` (worst case in light mode); `colorAccentNegative`
  text on `colorAccentNegative` 12% fill (banner case).
- The price-tile colour-coding never relies on colour alone — paired
  with `iconPriceUp` / `iconPriceDown` / `iconPriceNeutral` arrows
  and the trend description text (US-03 cross-reference).

### 10.5 Reduce Motion

See Motion section. All animations have a non-motion fallback;
positional motion (slide, parallax, scale entrance) is removed
entirely; opacity changes (cross-fades) are preserved at reduced
duration.

### 10.6 Reduce Transparency

- Glass surfaces (`colorGlassFill`, `colorGlassFillStrong`) become
  `colorSurfaceElevated` solid fills.
- Material backgrounds become opaque (SwiftUI handles this).
- Inner highlights are removed; borders darken to
  `colorTextTertiary`.
- Tab bar and navigation bar gain solid `colorSurfaceElevated`
  backgrounds.

### 10.7 Bold Text

- When `UIAccessibility.isBoldTextEnabled`, the system swaps SF Pro
  weights up one step. Designs verified to remain legible at the
  shifted weights.

---

## 11. Dark Mode

Per existing spec section 3, "dark mode polish" is out of scope for
v1, but the app must function in dark mode without breakage. This
specification provides the required token pairs (section 2) such that
dark mode renders coherently through the system's automatic adaptive
colour resolution.

**What is in scope for v1 dark mode:**
- All `colorXXX` tokens have light/dark adaptive values defined.
- All glass materials work in both appearances (SwiftUI native).
- Charts use the same brand-aware tokens; bar tints remain meaningful
  in dark mode (verified contrast).
- Hero numeral colour-coding uses dark-mode token variants.

**What is explicitly out of scope:**
- Custom dark-mode-only illustration tuning (Login background remains
  the same illustration, opacity adjusted via the adaptive colour).
- Dark-mode-specific motion or haptic adjustments.
- A user-facing dark/light toggle inside the app — system setting
  only.

---

## 12. Error State Designs

Visual specifications for the error scenarios defined in existing
spec section 9.

| Scenario | Visual treatment |
|---|---|
| **Offline pill (Home)** | Full-width pill anchored under the nav bar. 32pt tall, `radiusFull`, `colorTextTertiary` 12% fill, `iconWarn` leading, `fontFootnote` "Offline — viser senest hentede tal." Colours: `colorTextSecondary` icon + text. Non-dismissable; clears when network returns. |
| **MitID auth failed (Login)** | Inline beneath MitID button: 1pt `colorAccentNegative` 30% top border on a `colorAccentNegative` 8% fill panel, `radiusMd`, internal padding `spaceMd`. `fontCallout` `colorTextPrimary` "Login mislykkedes. Prøv igen, eller kontakt support." Below it: text-only "Kontakt support" link in `colorBrandPrimary`, and `fontCaption` `colorTextTertiary` correlation ID. |
| **Price data >90min stale** | PriceDisplay freshness indicator switches to amber dot + "Sidst opdateret kl. HH:mm". Caption below the unit label: `fontCaption` `colorTextSecondary` "Prisdata kan være forsinket." |
| **Price data >24h catastrophic** | Hero numeral renders `—` in `colorTextTertiary`, unit label dims to `colorTextTertiary`. Caption replaces trend row: `fontCaption` `colorTextSecondary` "Prisdata utilgængelige. Vi arbejder på det." Bill and next-payment rows still render normally. |
| **Eloverblik no consent (Consumption)** | Empty-state card per Screen 7.4. |
| **Eloverblik consent revoked** | Same empty-state card, copy changed to "Din adgang til Eloverblik er udløbet. Forny den her." Button label "Forny adgang". |
| **Charge failed banner (Home)** | Persistent 56pt banner above hero card. `colorAccentNegative` 14% fill, 1pt `colorAccentNegative` 30% border, `radiusMd`. `iconWarn` leading, `colorAccentNegative`. `fontHeadline` "Seneste betaling mislykkedes" + `fontFootnote` "Tryk for at rette." Whole banner tappable. |
| **Subscription stopped banner (Home)** | Same banner shape but `colorTextTertiary` 14% fill, no border. `fontHeadline` "Dit abonnement er stoppet". `fontFootnote` "Kontakt os for at genstarte." Underlying cards' tap actions disabled (visual: 50% opacity on disabled cards). |
| **Stop subscription confirmation sheet** | Native iOS confirmation sheet (`.confirmationDialog` style) with title "Stop abonnement?", message per existing spec, primary action "Stop" in `colorAccentNegative`, secondary "Behold" in `colorBrandPrimary`. |
| **Backend 5xx soft error** | `fontCaption` `colorTextSecondary` "Kunne ikke opdatere lige nu" appears at the bottom of Home replacing "Opdateret kl. HH:mm" until the next successful refresh. No banner, no modal. |
| **Push permission denied (Account)** | Inline banner inside Account, above Notifications card. `colorTextTertiary` 12% fill, `radiusMd`, `iconInfo` leading, `fontCallout` "Du modtager ikke betalingsbekræftelser." Trailing button "Slå til i Indstillinger" in `colorBrandPrimary`. |
| **Forced upgrade (426)** | Full-screen `colorSurfaceBase`. Centred GlassCard, `colorGlassFill`, `radiusLg`. `iconWarn` 56pt `colorAccentNegative`. `fontTitle2` "Opdatér appen". `fontBody` `colorTextSecondary` explainer. Primary button "Hent opdatering", full width, `colorBrandPrimary`, opens App Store. No dismiss affordance. |

**Rule across all error states:** no error in v1 uses red. The design
uses amber (`colorAccentNegative`) for warnings and grey
(`colorTextTertiary` derivatives) for muted / passive states. This is
consistent with the existing spec's "no red in v1" decision.

---

## 13. Open Questions

Numbered. Each surfaces a decision the design team needs to resolve
with product / engineering before implementation. Defaults are
provided so absence of an answer doesn't block work.

1. **Pull-to-refresh "liquid bead" specification** — is the custom
   stretchy spinner worth the engineering cost over the system
   `UIRefreshControl`? Owner: Design + iOS lead. Default assumption:
   ship custom in v1; budget a 2-day spike, fall back to system if it
   slips.
2. **Cost-breakdown segment colours** — should the six-step palette
   (spot, network tariff, Energinet, elafgift, VAT, margin) be
   monochromatic green-shade or use semantically distinct hues?
   Owner: Design lead. Default assumption: monochromatic green
   shades (matches "no anxiety colours" principle); revisit if user
   testing shows segments are indistinguishable.
3. **Login illustration** — final form of the "stylised line drawing
   of Denmark" referenced in the existing spec. Owner: Design.
   Default assumption: single-line vector at 8% `colorBrandPrimary`,
   produced by an illustrator before beta.
4. **Hero numeral wraparound at very high prices** — what happens at
   500+ øre/kWh during winter peaks? `fontDisplayXL` may not fit
   four digits on smaller iPhones at high Dynamic Type. Owner:
   Design + iOS lead. Default assumption: drop to `fontDisplay`
   (48pt) automatically when value ≥1000 or container is constrained.
5. **Reduce Transparency visual fidelity** — when materials become
   opaque, the green refraction tint is lost. Is the resulting flat
   look acceptable, or should we add a subtle `colorBrandPrimarySoft`
   overlay to retain warmth? Owner: Accessibility + Design. Default
   assumption: flat is acceptable in v1; reassess with users who use
   the setting.
6. **Tooltip persistence on chart** — should the tooltip stay until
   tapped away, or auto-dismiss after 3s? Owner: Design + Product.
   Default assumption: auto-dismiss after 3s (specified above);
   revisit if testing shows users want it sticky.
7. **Banner stacking** — what happens when multiple banner conditions
   are true simultaneously (e.g., offline + charge failed)? Owner:
   Design. Default assumption: priority order (subscription stopped
   > charge failed > offline), one banner shown at a time, top of
   stack. Spec'd here but not visually mocked.
8. **Onboarding screen designs** — covered by a separate Onboarding
   sub-spec per existing spec OQ#11. This document does not cover
   the agreement-signing, MobilePay-creation, or first-time
   Eloverblik-consent flows.

---

## 14. Resolved Decisions

| Question | Decision |
|---|---|
| Liquid glass material choice | `.ultraThinMaterial` for standard cards, `.thinMaterial` for hero |
| GlassCard corner radius | `radiusLg` (20pt) standard, `radiusXl` (28pt) hero |
| Drop shadow spec | `0pt 4pt 24pt`, `colorGlassShadow` (8% black light, 40% black dark) |
| Use of red | Not used anywhere in v1 (consistent with existing spec) |
| Numeral font | SF Pro Rounded for hero numerals, SF Pro Text for everything else |
| Tabular numerals | Required (`.monospacedDigit()`) on every value that can update in place |
| Hero numeral size | `fontDisplayXL` (64pt bold) |
| Number-of-tabs | Three (Hjem, Forbrug, Konto) — matches existing spec |
| Custom icons | None except MitID brand asset; SF Symbols only |
| Chart library | SwiftUI Charts on iOS 16+; manual `Rectangle` fallback on iOS 15 |
| Colour-coding alone for price status | Forbidden — always paired with arrow icon and trend text |
| Dark mode tuning | Token-level pairs only; no bespoke dark layouts (matches existing spec) |
| Analytics in design | None — there are no analytics SDKs in v1, so no tracked-event affordances appear in any component |
| Marketing copy in app chrome | None beyond Login one-liner — design is data-first |
| Accessibility minimum | WCAG 2.1 AA, full Dynamic Type to `accessibility3`, full VoiceOver, Reduce Motion, Reduce Transparency |
