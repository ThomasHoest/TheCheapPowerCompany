# Design Specification: Marketing Site

This document specifies the visual and interaction design for the
Marketing Site of The Cheap Power Company. It is the implementation
counterpart to the functional specification at
`/docs/specifications/marketing-site.md`. All UI copy is in Danish
(da-DK). Dark mode is out of scope for v1.

---

## Design Principles

1. **Light, airy, Nordic** — predominantly white/off-white surfaces with
   one confident green accent. Generous whitespace; never dense.
2. **The price is the hero** — the live kWh rate is the single most
   visually dominant element on the landing page after the headline.
3. **Pragmatic, not promotional** — typography, layout, and motion serve
   comprehension and conversion. No marketing flourishes that delay the
   user from reaching the CTA.
4. **One CTA, repeated** — exactly one button style, one label
   ("Tilmeld dig"), in one accent colour. Repeated across the journey;
   never competing with a secondary CTA of equal visual weight.
5. **Mobile-first** — every component is designed for a 360px viewport
   first; desktop is an enhancement.
6. **Trends with restraint** — soft shadows, large rounded corners,
   tasteful gradient accents, subtle scroll-in motion. No carousels,
   parallax, glassmorphism overload, or stock imagery of power lines.
7. **Accessibility is not optional** — WCAG 2.1 AA is a baseline, not a
   ceiling.

---

## Colour Tokens

The palette is built around a single fresh Nordic green on a near-white
canvas. All hex values below are suggestions; ratios against the listed
counterpart tokens have been chosen to meet WCAG AA where they carry text.

### Brand

| Token | Hex | Usage |
|---|---|---|
| `color-brand-primary` | `#1F8F4E` | Primary CTA fill, key links, brand logo, focus accents |
| `color-brand-primary-hover` | `#1A7A42` | CTA hover/pressed state |
| `color-brand-primary-pressed` | `#155F34` | CTA active/pressed state |
| `color-brand-primary-subtle` | `#E6F4EC` | Tinted backgrounds for highlights, callouts, price widget halo |
| `color-brand-secondary` | `#0E3B26` | Headlines, deep accents, footer base |
| `color-brand-accent-gradient-from` | `#1F8F4E` | Hero gradient start |
| `color-brand-accent-gradient-to` | `#7CD6A6` | Hero gradient end |

### Surfaces

| Token | Hex | Usage |
|---|---|---|
| `color-surface-default` | `#FFFFFF` | Page background, card fill |
| `color-surface-muted` | `#F7FAF8` | Alternating section background, FAQ panel |
| `color-surface-raised` | `#FFFFFF` | Cards lifted with shadow |
| `color-surface-inverse` | `#0E3B26` | Footer, dark callout strips |
| `color-surface-overlay` | `rgba(14, 59, 38, 0.48)` | Modal/cookie banner overlay |

### Text

| Token | Hex | Usage | Pairs with |
|---|---|---|---|
| `color-text-primary` | `#0E1F17` | Body, headings on light surfaces | `color-surface-default` (15.8:1) |
| `color-text-secondary` | `#475A52` | Sub-headings, supporting copy | `color-surface-default` (7.6:1) |
| `color-text-disabled` | `#9AA8A2` | Disabled labels, placeholders | Decorative only, never carries critical info |
| `color-text-on-brand` | `#FFFFFF` | Text on `color-brand-primary` fill | (5.7:1 against `color-brand-primary`) |
| `color-text-on-inverse` | `#F2F7F4` | Text on `color-surface-inverse` | (14.2:1) |
| `color-text-link` | `#1A7A42` | Inline links on light surfaces | (5.4:1) |

### Borders & Dividers

| Token | Hex | Usage |
|---|---|---|
| `color-border-default` | `#E2EAE5` | Card borders, input outlines, dividers |
| `color-border-strong` | `#C3D2CB` | Emphasised dividers, accordion separators |
| `color-border-focus` | `#1F8F4E` | Focus ring base colour (used with offset, see Accessibility) |

### Status

| Token | Hex | Usage |
|---|---|---|
| `color-success` | `#1F8F4E` | Success states (alias of brand primary) |
| `color-success-subtle` | `#E6F4EC` | Success backgrounds |
| `color-error` | `#B42318` | Error text, error icons |
| `color-error-subtle` | `#FEECEB` | Error background panels |
| `color-warning` | `#B25E09` | Warning icons, stale-price label |
| `color-warning-subtle` | `#FDF1E2` | Warning background panels |

### Dark mode

Out of scope for v1. Tokens are named semantically so that a dark theme
can be layered later without renaming consumers.

---

## Typography Tokens

### Font family

| Token | Value |
|---|---|
| `font-family-sans` | `"Inter", "Inter Variable", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` |
| `font-family-display` | `"Inter", "Inter Variable", system-ui, sans-serif` (same family at heavier weights) |
| `font-family-mono` | `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` |

**Rationale** — Inter is free, open-source (SIL OFL), variable-axis, and
widely loaded by modern Nordic SaaS sites. It carries Danish diacritics
(æ, ø, å) cleanly. Loaded self-hosted as woff2 with `font-display: swap`.

### Weights

| Token | Value |
|---|---|
| `font-weight-regular` | `400` |
| `font-weight-medium` | `500` |
| `font-weight-semibold` | `600` |
| `font-weight-bold` | `700` |
| `font-weight-extrabold` | `800` |

### Type scale

The scale uses a 1.25 (major third) ratio anchored at `font-size-base = 16px`.

| Token | Size | Line height | Letter spacing | Typical use |
|---|---|---|---|---|
| `font-size-xs` | `12px` / 0.75rem | `font-line-tight` (1.3) | `font-tracking-wide` (+0.02em) | Captions, footnotes, timestamps |
| `font-size-sm` | `14px` / 0.875rem | `font-line-normal` (1.5) | `0` | Small body, form helpers |
| `font-size-base` | `16px` / 1rem | `font-line-normal` (1.5) | `0` | Body copy |
| `font-size-md` | `18px` / 1.125rem | `font-line-normal` (1.5) | `0` | Lead paragraphs |
| `font-size-lg` | `20px` / 1.25rem | `font-line-snug` (1.4) | `font-tracking-tight` (-0.005em) | Large body, FAQ questions |
| `font-size-xl` | `24px` / 1.5rem | `font-line-snug` (1.4) | `-0.01em` | Section sub-headings |
| `font-size-2xl` | `32px` / 2rem | `font-line-tight` (1.25) | `-0.015em` | Section headings (mobile) |
| `font-size-3xl` | `40px` / 2.5rem | `font-line-tight` (1.2) | `-0.02em` | Section headings (desktop) |
| `font-size-4xl` | `56px` / 3.5rem | `font-line-tightest` (1.1) | `-0.025em` | Hero headline (mobile) |
| `font-size-5xl` | `72px` / 4.5rem | `font-line-tightest` (1.05) | `-0.03em` | Hero headline (desktop) |
| `font-size-price-mobile` | `64px` / 4rem | `1.0` | `-0.03em` | Live price numeral (mobile) |
| `font-size-price-desktop` | `112px` / 7rem | `0.95` | `-0.035em` | Live price numeral (desktop) — unmissable |

### Line-height tokens

| Token | Value |
|---|---|
| `font-line-tightest` | `1.05` |
| `font-line-tight` | `1.25` |
| `font-line-snug` | `1.4` |
| `font-line-normal` | `1.5` |
| `font-line-relaxed` | `1.65` |

### Letter-spacing tokens

| Token | Value |
|---|---|
| `font-tracking-tighter` | `-0.03em` |
| `font-tracking-tight` | `-0.01em` |
| `font-tracking-normal` | `0` |
| `font-tracking-wide` | `+0.02em` |
| `font-tracking-uppercase` | `+0.08em` (for small uppercase labels) |

### Heading defaults

- `h1` → `font-size-4xl` mobile / `font-size-5xl` desktop, `font-weight-extrabold`,
  `font-line-tightest`, `color-text-primary`.
- `h2` → `font-size-2xl` mobile / `font-size-3xl` desktop, `font-weight-bold`.
- `h3` → `font-size-xl`, `font-weight-semibold`.
- Body → `font-size-base`, `font-weight-regular`, `font-line-normal`.

---

## Spacing & Layout Tokens

### Spacing scale (4px base grid)

| Token | Value |
|---|---|
| `space-0` | `0` |
| `space-1` | `4px` |
| `space-2` | `8px` |
| `space-3` | `12px` |
| `space-4` | `16px` |
| `space-5` | `24px` |
| `space-6` | `32px` |
| `space-7` | `48px` |
| `space-8` | `64px` |
| `space-9` | `96px` |
| `space-10` | `128px` |

### Layout

| Token | Value | Notes |
|---|---|---|
| `layout-content-max-width` | `1200px` | Outer container cap on desktop |
| `layout-prose-max-width` | `680px` | Long-form prose (Privacy, Terms) |
| `layout-gutter-mobile` | `space-4` (16px) | Page-edge padding on mobile |
| `layout-gutter-tablet` | `space-5` (24px) | Page-edge padding on tablet |
| `layout-gutter-desktop` | `space-6` (32px) | Page-edge padding on desktop |
| `layout-section-padding-y-mobile` | `space-7` (48px) | Vertical spacing per section on mobile |
| `layout-section-padding-y-desktop` | `space-9` (96px) | Vertical spacing per section on desktop |
| `layout-grid-gap-mobile` | `space-4` (16px) | Inter-card gap mobile |
| `layout-grid-gap-desktop` | `space-6` (32px) | Inter-card gap desktop |

### Radius tokens

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | `6px` | Inputs, small chips |
| `radius-md` | `12px` | Cards, FAQ panels |
| `radius-lg` | `16px` | Hero card, price widget surface |
| `radius-xl` | `24px` | Buttons, image frames |
| `radius-pill` | `9999px` | Pills, status badges |

### Shadow tokens

| Token | Value | Usage |
|---|---|---|
| `shadow-xs` | `0 1px 2px rgba(14, 31, 23, 0.04)` | Subtle separation, sticky nav |
| `shadow-sm` | `0 2px 8px rgba(14, 31, 23, 0.06)` | Card default |
| `shadow-md` | `0 8px 24px rgba(14, 31, 23, 0.08)` | Card hover, raised price widget |
| `shadow-lg` | `0 16px 48px rgba(14, 31, 23, 0.12)` | Cookie banner, modal |
| `shadow-focus` | `0 0 0 3px rgba(31, 143, 78, 0.35)` | Focus ring outer glow |

---

## Component Library

All components below MUST use token names from the sections above. Raw
hex values must not appear in component implementations.

### PrimaryButton

The single, dominant CTA across the site. Label is always
"Tilmeld dig" on conversion CTAs.

- **Layout** — flex row, icon optional on the right (`arrow-right`,
  16px). Padding `space-3` `space-5` (12px / 24px) on mobile;
  `space-4` `space-6` (16px / 32px) on desktop.
- **Typography** — `font-size-md`, `font-weight-semibold`,
  `font-line-snug`, `color-text-on-brand`.
- **Fill** — `color-brand-primary`.
- **Border radius** — `radius-xl` (24px) for a pill-leaning rectangle.
- **Shadow** — `shadow-sm` at rest; `shadow-md` on hover.
- **Min height** — 48px (meets 44x44 tap-target minimum with margin).
- **States**
  - Default — fill `color-brand-primary`, text `color-text-on-brand`.
  - Hover — fill `color-brand-primary-hover`, shadow `shadow-md`,
    transform `translateY(-1px)` (omitted under reduced motion).
  - Focus-visible — outer ring `shadow-focus`, 2px solid
    `color-border-focus`, 2px offset.
  - Active/Pressed — fill `color-brand-primary-pressed`,
    transform `translateY(0)`.
  - Disabled — fill `color-text-disabled`, text `color-surface-default`,
    cursor `not-allowed`. Used only on placeholder states; never on
    the conversion CTA in production.
- **Loading** — replaces label with a 16px spinner; pointer events
  disabled; aria-busy true.

### SecondaryButton

Used sparingly — for "Læs mere" type links that deserve button affordance
but must not compete with the primary CTA.

- **Layout** — same paddings as PrimaryButton.
- **Fill** — `color-surface-default`.
- **Border** — 1.5px solid `color-border-strong`.
- **Text** — `color-text-primary`, `font-weight-medium`.
- **Border radius** — `radius-xl`.
- **Shadow** — none at rest; `shadow-xs` on hover.
- **States**
  - Hover — border `color-brand-primary`, text `color-brand-primary`.
  - Focus-visible — `shadow-focus` ring.
  - Active — fill `color-brand-primary-subtle`.
  - Disabled — text `color-text-disabled`, border `color-border-default`.

### PriceDisplay (live kWh widget)

The single most prominent component on the landing page after the hero
headline. Renders the current rate in DKK/kWh including markup.

- **Layout** — vertical stack on mobile, horizontal stack on desktop
  inside the hero card.
  - Eyebrow label: "Aktuel pris lige nu" — `font-size-sm`,
    `font-weight-medium`, `color-text-secondary`,
    `font-tracking-uppercase`, all caps.
  - Numeral: `font-size-price-mobile` mobile / `font-size-price-desktop`
    desktop, `font-weight-extrabold`, `color-brand-secondary`,
    tabular-nums variant active so digits don't jitter on update.
  - Unit label: "kr/kWh" (or "øre/kWh" if the configured unit is øre)
    — `font-size-xl`, `font-weight-semibold`, `color-text-secondary`,
    aligned to the baseline of the numeral.
  - Refresh meta row (below):
    - Timestamp: "Opdateret kl. HH:MM" — `font-size-sm`,
      `color-text-secondary`.
    - Refresh indicator: 12px circle. Green pulsing dot
      (`color-success`) when fresh (<= 60 min), warning amber
      (`color-warning`) when stale (> 60 min), grey
      (`color-text-disabled`) when offline.
  - Explainer: "Prisen følger spotprisen på det danske elmarked plus
    vores tillæg." — `font-size-sm`, `color-text-secondary`,
    max-width 36ch.
- **Surface** — `color-surface-raised` with `shadow-md`,
  `radius-lg`, padding `space-6` mobile / `space-7` desktop.
  Optional 1px border `color-border-default`.
- **Halo** — a soft radial behind the numeral using
  `color-brand-primary-subtle` to lift the figure visually.
- **States**
  - Loading (initial fetch <= 5s) — numeral shows shimmer placeholder
    of equivalent height; eyebrow shows "Aktuel pris hentes…".
  - Loaded — numeral with crossfade transition into place
    (200ms ease-out).
  - Update — incoming value replaces previous via 250ms crossfade.
    Counter-roll fallback (digits scrolling 0–9) is acceptable;
    must not exceed 400ms total.
  - Stale (> 1 hour since update) — refresh dot turns
    `color-warning`, timestamp prefixed with a small warning icon,
    no blocking message.
  - Error — replaces numeral with text "Prisen er midlertidigt
    utilgængelig — prøv igen om lidt", in `color-text-secondary`,
    `font-size-md`. Page does not block; CTA still primary action.
  - JS disabled — numeral region renders the message "Aktiver
    JavaScript for at se den aktuelle pris" in
    `color-text-secondary`.
- **Accessibility** — wrapped in an `aria-live="polite"` region so
  screen readers announce updates without interrupting. Numeral has
  `aria-label="Aktuel pris {value} kroner per kilowatt-time"`.

### NavBar

Top-level site navigation. Sticky on scroll on all viewports.

- **Layout** — height 64px mobile / 72px desktop. Horizontal flex.
  Logo left; primary nav links centre/right (desktop only); PrimaryButton
  pinned right. Hamburger toggle left of CTA on mobile.
- **Surface** — `color-surface-default` with 88% opacity and 12px
  backdrop blur for a modern frosted look. Bottom border 1px
  `color-border-default`. Shadow `shadow-xs` once scrolled past 8px.
- **Links** — "Sådan virker det", "Pris", "App", "FAQ" — anchors to
  landing-page sections. `font-size-base`, `font-weight-medium`,
  `color-text-primary`. Hover underlines with
  `color-brand-primary` 2px offset 4px.
- **Mobile menu** — full-screen sheet sliding in from the right
  (250ms ease-out). Close button top-right (44x44 tap target).
  Items stacked, `font-size-xl`, `space-5` vertical gap.
  PrimaryButton at the bottom of the sheet.
- **States**
  - Default — frosted white surface.
  - Scrolled — adds `shadow-xs`.
  - Focus on link — focus ring per Accessibility.
- **Sticky CTA** — on mobile, when the user scrolls past the hero,
  the PrimaryButton remains visible inside the navbar.

### Footer

Bottom-of-page legal and links.

- **Layout** — full-bleed strip with `color-surface-inverse`
  background and `color-text-on-inverse` text. Inner content capped at
  `layout-content-max-width`. Padding `space-7` top, `space-6` bottom.
- **Columns** — desktop: 4 columns (Brand block, Produkt, Selskab,
  Juridisk). Tablet: 2 columns. Mobile: stacked.
- **Brand block** — logo (white variant), short tagline
  ("Strøm til spotpris. Ingen binding."), CVR number.
- **Link groups**
  - Produkt: "Sådan virker det", "Pris", "App".
  - Selskab: "Kontakt", "Status".
  - Juridisk: "Handelsbetingelser", "Privatlivspolitik", "Cookies".
- **Bottom row** — small print: "© 2026 The Cheap Power Company ApS — CVR
  {placeholder}", `font-size-xs`, `color-text-on-inverse` at 70%
  alpha, top border 1px rgba white 12%.
- **States** — link hover underlines with
  `color-brand-accent-gradient-to`. Focus uses the same ring style
  as elsewhere.

### SectionHero

The component used for the landing-page hero and any future hero
section.

- **Layout** — two-column on desktop (>= 1200px), single-column on
  mobile/tablet.
  - Left column (desktop) / top (mobile): eyebrow, headline,
    sub-headline, PrimaryButton, trust row (small inline icons +
    "Ingen binding · MitID · MobilePay").
  - Right column (desktop) / below (mobile): PriceDisplay component.
- **Surface** — full-bleed background using a soft top-left to
  bottom-right gradient: from `color-brand-accent-gradient-from` at 6%
  alpha to `color-brand-accent-gradient-to` at 6% alpha, on top of
  `color-surface-default`. Subtle, never garish.
- **Padding** — `space-7` top mobile / `space-9` top desktop;
  `space-7` bottom on both.
- **Headline** — `h1` defaults; copy: "Strøm til spotpris.
  Plus et lille fast tillæg. Det er det." (or final wording).
- **Sub-headline** — `font-size-md` mobile / `font-size-lg` desktop,
  `color-text-secondary`, max-width 48ch.
- **Trust row** — `font-size-sm`, `color-text-secondary`, three
  inline pills separated by middle dots.

### FeatureCard

Used in the "Sådan virker det" three-step section, the companion app
teaser, and the pricing summary tiles.

- **Layout** — vertical stack: icon/numeral block top, title, body.
  Padding `space-5` mobile / `space-6` desktop.
- **Surface** — `color-surface-raised`, `radius-md`,
  `shadow-sm`. 1px border `color-border-default`.
- **Icon block** — 48px circle filled with
  `color-brand-primary-subtle`, icon stroke `color-brand-primary`,
  or a numeral "1/2/3" in `color-brand-primary`,
  `font-weight-bold`, `font-size-xl`.
- **Title** — `h3` defaults, `space-3` margin-top.
- **Body** — `font-size-base`, `color-text-secondary`,
  `font-line-relaxed`.
- **States**
  - Default — `shadow-sm`.
  - Hover (only when card is interactive) — `shadow-md`,
    `translateY(-2px)`, border `color-border-strong`. Omitted when
    the card is purely informational and non-interactive.
  - Focus-visible — focus ring per Accessibility.

### FAQAccordion

The FAQ section uses a stacked accordion pattern.

- **Layout** — full-width within `layout-content-max-width`.
  Each item is a button (question) plus a collapsible panel (answer).
- **Item surface** — `color-surface-default`. 1px bottom border
  `color-border-default`. No outer card; the list itself is the
  visual structure.
- **Question row** — height min 64px. Padding `space-4` `space-2`
  vertical/horizontal. Left: question text, `font-size-lg`,
  `font-weight-semibold`, `color-text-primary`. Right: 24px
  chevron icon, `color-brand-primary`, rotates 180° on expand
  (200ms ease-out).
- **Answer panel** — padding `space-2` top, `space-5` bottom.
  Body in `font-size-base`, `color-text-secondary`,
  `font-line-relaxed`, max-width 60ch.
- **States**
  - Collapsed — chevron pointing down.
  - Expanded — chevron pointing up; row background
    `color-brand-primary-subtle` at 40% alpha (very subtle).
  - Focus-visible — focus ring on the question row.
- **Behaviour** — only one open at a time is acceptable but not
  required. Implemented as `<details>`/`<summary>` for progressive
  enhancement; ARIA on the JS-enhanced version uses
  `button[aria-expanded]` + `region`.

### CookieBanner

Minimal, non-blocking. Only present if analytics requires consent
(default analytics is Plausible, which does not require consent —
see Resolved Decisions in the functional spec).

- **Layout** — fixed bottom-centre on desktop, full-width bottom on
  mobile. Max-width 720px desktop. Padding `space-5`.
- **Surface** — `color-surface-default`, `radius-lg`,
  `shadow-lg`. 1px border `color-border-default`.
- **Content** — short Danish text ("Vi bruger kun anonym statistik
  uden cookies. Læs mere i vores [cookiepolitik]."), one
  PrimaryButton ("OK"), one SecondaryButton ("Indstillinger"),
  optional close icon top-right.
- **States**
  - Visible — slides up 200ms ease-out from below viewport.
  - Dismissed — slides down 200ms; choice persisted to localStorage.
  - Reduced motion — fades in/out only.
- **Accessibility** — labelled `role="dialog"`,
  `aria-labelledby="cookie-title"`, focus trapped while open if
  modal; non-modal banner does not trap focus but the dismiss
  button is the first tab stop after the page footer.

---

## Page Designs

All page widths cap at `layout-content-max-width` (1200px). Vertical
rhythm uses `layout-section-padding-y-*` between sections.

### Landing Page (`/`)

Top-to-bottom section stack. Approximate viewport heights given for
desktop (1440x900); mobile flows in the same order.

1. **NavBar** — sticky, ~72px tall.
2. **SectionHero with PriceDisplay** — fills the rest of the first
   viewport on desktop (~828px). On mobile (390x844), the hero must
   place the PriceDisplay and PrimaryButton above the fold; the
   sub-headline may push slightly below in the worst-case font
   rendering. Hero composition (desktop):
   - Left column ~55% width: eyebrow ("Velkommen til The Cheap Power
     Company"), `h1` headline (3 lines max), sub-headline (2 lines),
     PrimaryButton, trust row.
   - Right column ~45% width: PriceDisplay component (raised card).
   - Mobile: stacked. PriceDisplay sits between sub-headline and
     PrimaryButton so the price is the visual anchor.
3. **Sådan virker det** (How it works) — three FeatureCards in a row
   on desktop, stacked on mobile. Each card numbered 1/2/3.
   - 1) Tilmeld med MitID
   - 2) Godkend MobilePay-abonnement
   - 3) Få strøm til spotpris + lille tillæg
   Section background: `color-surface-muted`.
4. **Pris** (Pricing) — three-column FeatureCard layout (markup,
   subscription, worked example) plus a fourth full-width "Ingen
   binding" callout strip using `color-brand-primary-subtle`.
   Closes with a centred PrimaryButton.
   Section background: `color-surface-default`.
5. **App-teaser** (Companion app) — two-column on desktop:
   left a phone mockup screenshot frame (8% rotated, drop shadow
   `shadow-md`); right a heading, two-bullet feature list, and
   either app store badges or "Kommer snart" pills.
   Section background: `color-surface-muted`.
6. **FAQ** — heading + FAQAccordion. 5–8 items.
   Section background: `color-surface-default`. After the
   accordion, a centred SecondaryButton "Se alle spørgsmål" links
   to `/faq` if/when that page exists.
7. **Final CTA strip** — full-width strip, background
   `color-brand-secondary`, white headline ("Klar til billigere
   strøm?"), centred PrimaryButton variant with white fill / green
   text (inverse PrimaryButton — see note below).
   - Inverse PrimaryButton: fill `color-surface-default`, text
     `color-brand-primary`. Same paddings, radius, shadow.
8. **Footer** — see Footer component.

**Above-the-fold checklist (mandatory)**:
- Brand mark (NavBar logo), value-prop headline, current live kWh rate,
  and PrimaryButton "Tilmeld dig" all visible without scrolling on:
  - 390x844 (iPhone 13/14/15 baseline mobile).
  - 1440x900 (standard desktop).

### FAQ Page (`/faq`)

A dedicated FAQ page if/when content grows. Reuses the FAQAccordion.

1. **NavBar**.
2. **Page header** — `h1` "Ofte stillede spørgsmål", sub-text
   ~`font-size-md`, `color-text-secondary`. Padding
   `layout-section-padding-y-*`.
3. **Search/filter (optional, deferred)** — placeholder for v1.1.
4. **FAQ content** — grouped by category headings (`h2`), each
   group an FAQAccordion. Categories: "Tilmelding", "Pris og
   betaling", "Skift af leverandør", "MitID og MobilePay",
   "Flytning og opsigelse".
5. **Still need help block** — small panel with
   `color-brand-primary-subtle` background, `radius-md`,
   contact email link, SecondaryButton "Skriv til os".
6. **Final CTA strip** — same as landing page.
7. **Footer**.

### Pricing & Terms Page (`/pris` and `/handelsbetingelser`)

Two related pages with shared patterns. `/pris` is a marketing
page; `/handelsbetingelser` is the formal terms.

#### `/pris` (Pricing detail)

1. **NavBar**.
2. **Page header** — `h1` "Sådan beregner vi din pris", sub-text
   one paragraph.
3. **Price breakdown panel** — large card, `color-surface-raised`,
   `radius-lg`, `shadow-md`. Three rows:
   - Spotpris fra energinet.dk (variabel)
   - Vores tillæg pr. kWh (fast øre/kWh)
   - Abonnement (DKK/måned eller DKK/uge)
   Each row separated by 1px `color-border-default` divider.
4. **Worked example** — wider panel with a table and a sample annual
   bill for a 4.000 kWh household. Background
   `color-surface-muted`, `radius-md`.
5. **No-binding callout** — full-width strip with
   `color-brand-primary-subtle` background and a checkmark icon row:
   "Ingen binding · Ingen oprettelsesgebyr · Ingen skjulte gebyrer".
6. **PrimaryButton** centred.
7. **Footer**.

#### `/handelsbetingelser` (Terms)

1. **NavBar**.
2. **Page header** — `h1` "Handelsbetingelser", last-updated date.
3. **Prose container** — `layout-prose-max-width` (680px),
   `font-size-base`, `font-line-relaxed`. Headings hierarchical
   (`h2`, `h3`). Lists, definitions, and tables styled minimally.
4. **Table of contents** (sticky on desktop, collapsible on mobile)
   — left rail listing `h2` sections.
5. **Footer**.

### Privacy Policy Page (`/privatlivspolitik`)

Mirrors the Terms page structure exactly to maintain familiarity.

1. **NavBar**.
2. **Page header** — `h1` "Privatlivspolitik", last-updated date,
   data controller name and CVR.
3. **Prose container** with sticky TOC on desktop. Sections:
   - Hvilke oplysninger vi indsamler
   - Hvordan vi bruger oplysningerne
   - Retsgrundlag (GDPR)
   - Modtagere af oplysninger
   - Opbevaringsperiode
   - Dine rettigheder
   - Kontakt og klage til Datatilsynet
4. **Contact panel** — small card, `color-brand-primary-subtle`,
   contact email and physical address.
5. **Footer**.

---

## Motion & Animation

All motion respects `prefers-reduced-motion: reduce` — under that
setting, transforms and translations are removed and only fades remain
(or motion is omitted entirely where it is decorative).

### Section entrance

- **Trigger** — IntersectionObserver at 15% visibility.
- **Behaviour** — `opacity 0 → 1`, `translateY(16px) → 0`.
- **Duration** — 300ms.
- **Easing** — `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo, gentle).
- **Stagger** — child cards stagger 60ms each, capped at 4 children
  (subsequent children animate together).
- **Reduced motion** — opacity-only, 200ms.

### Button micro-interactions

- Hover transform `translateY(-1px)`, 120ms ease-out.
- Active transform `translateY(0)`, 80ms.
- Reduced motion — colour change only, no transform.

### NavBar

- Shadow `shadow-xs` fades in over 200ms when scroll Y exceeds 8px.
- Mobile menu sheet slides 250ms `cubic-bezier(0.32, 0.72, 0, 1)`
  (iOS-feel ease-out).

### PriceDisplay updates

- **Initial load** — shimmer placeholder fades to numeral over 200ms.
- **Value change** — 250ms crossfade between old and new value, with
  the new value entering at scale 0.98 → 1.0. Counter-roll
  alternative is acceptable but must not exceed 400ms total and
  must use `tabular-nums` to prevent layout shift.
- **Refresh dot** — pulsing dot 2s loop, 70% → 100% opacity.
  Reduced motion — static dot.

### FAQ accordion

- Panel height transitions 200ms ease-out.
- Chevron rotates 180° in 200ms.
- Reduced motion — instant open/close, no chevron rotation
  (only colour change).

### Cookie banner

- Slide up from below viewport, 200ms ease-out.
- Reduced motion — fade only.

### No-go list

- No parallax.
- No auto-playing video.
- No carousels.
- No motion that prevents the user from interacting (loading states
  must keep the CTA reachable).

---

## Accessibility

Target: WCAG 2.1 AA. Lighthouse Accessibility >= 95.

### Colour contrast

All combinations below meet AA at minimum.

| Foreground | Background | Ratio | Minimum required |
|---|---|---|---|
| `color-text-primary` (#0E1F17) | `color-surface-default` (#FFFFFF) | 15.8:1 | 4.5:1 |
| `color-text-primary` | `color-surface-muted` (#F7FAF8) | 15.0:1 | 4.5:1 |
| `color-text-secondary` (#475A52) | `color-surface-default` | 7.6:1 | 4.5:1 |
| `color-text-on-brand` (#FFFFFF) | `color-brand-primary` (#1F8F4E) | 5.7:1 | 4.5:1 |
| `color-text-on-inverse` (#F2F7F4) | `color-surface-inverse` (#0E3B26) | 14.2:1 | 4.5:1 |
| `color-text-link` (#1A7A42) | `color-surface-default` | 5.4:1 | 4.5:1 |
| `color-error` (#B42318) | `color-surface-default` | 5.9:1 | 4.5:1 |
| `color-error` | `color-error-subtle` (#FEECEB) | 5.6:1 | 4.5:1 |
| `color-warning` (#B25E09) | `color-surface-default` | 4.7:1 | 4.5:1 |
| Hero numeral `color-brand-secondary` (#0E3B26) | `color-surface-default` | 14.6:1 | 3:1 (large text) |

`color-text-disabled` is intentionally below contrast thresholds and
must NEVER carry critical information; use it only for decorative
or genuinely disabled controls.

### Focus

- All interactive elements have a visible focus state.
- **Focus ring** — 2px solid `color-border-focus` plus
  `shadow-focus` outer glow, 2px offset from the element. Border
  radius matches the element's radius.
- Focus is never removed (`outline: none` is not permitted without a
  replacement style of equal or greater visibility).
- Tab order follows visual order: nav → hero CTA → sections → footer
  links.

### Skip-to-content

- A "Spring til indhold" link is the first focusable element on every
  page. Visually hidden until focused; on focus it appears top-left
  with `color-brand-primary` background, `color-text-on-brand` text,
  `radius-md`, padding `space-3` `space-4`, `shadow-md`.
- Targets `#main-content` (the page's `<main>` element).

### Tap targets

- Minimum 44x44 CSS px for all interactive elements
  (PrimaryButton min-height 48px satisfies this).
- Adjacent targets separated by at least `space-2` (8px).

### Semantics

- One `<h1>` per page.
- Landmarks: `<header>`, `<main>`, `<nav>`, `<footer>` present and
  unique per page.
- Live regions: PriceDisplay numeral wrapped in `aria-live="polite"`.
- All non-decorative images have Danish `alt` text. Decorative
  images use `alt=""`.
- Icon-only buttons have `aria-label` in Danish.

### Forms

The marketing site has zero forms (per the functional spec). The
cookie banner is the only interactive surface beyond CTAs/links.

### Language

- Root `<html lang="da">`.
- Any English brand-name fragments wrapped in
  `<span lang="en">` if needed for screen-reader pronunciation.

---

## Responsive Breakpoints

| Breakpoint | Range | Token |
|---|---|---|
| Mobile | `< 768px` | `breakpoint-mobile-max: 767px` |
| Tablet | `768px – 1199px` | `breakpoint-tablet-min: 768px` |
| Desktop | `>= 1200px` | `breakpoint-desktop-min: 1200px` |

Design is mobile-first. All tokens above default to mobile values;
desktop values are applied via min-width media queries at the
appropriate breakpoint.

### Hero adaptation

- **Mobile (< 768px)** — single column. Order: eyebrow → headline →
  sub-headline → PriceDisplay → PrimaryButton → trust row. Headline
  uses `font-size-4xl`. PriceDisplay numeral uses
  `font-size-price-mobile` (64px). Section padding-top
  `space-7` (48px).
- **Tablet (768–1199px)** — single column, wider type. Headline
  uses a midpoint of `font-size-4xl` to `font-size-5xl` (~64px via
  fluid clamp). PriceDisplay numeral 88px (clamp between mobile and
  desktop). Centre-aligned at content max-width 720px.
- **Desktop (>= 1200px)** — two columns 55/45. Headline uses
  `font-size-5xl` (72px). PriceDisplay numeral uses
  `font-size-price-desktop` (112px). Section padding-top
  `space-9` (96px).

### NavBar adaptation

- **Mobile** — height 64px. Logo left, hamburger and PrimaryButton
  right. Nav links hidden behind the hamburger sheet. After hero is
  scrolled past, PrimaryButton remains in the navbar.
- **Tablet** — height 64px. Same as mobile, but nav links may
  appear inline if space permits (≥ 900px); otherwise hamburger.
- **Desktop** — height 72px. Logo left, nav links centre-right,
  PrimaryButton far right. No hamburger.

### PriceDisplay adaptation

- **Mobile** — full width inside hero card, numeral 64px,
  vertical stack (eyebrow, numeral + unit horizontal, refresh row,
  explainer).
- **Tablet** — centred inside hero column, numeral 88px (fluid
  clamp), card max-width 480px.
- **Desktop** — right-column card, numeral 112px, horizontal layout
  for numeral + unit. Halo radial visible.

### Grid adaptation

- **Mobile** — single-column for all card grids.
- **Tablet** — two columns where the source defines three or four;
  three-step "Sådan virker det" stays single-column to maintain
  vertical rhythm; four-tile pricing grid becomes 2x2.
- **Desktop** — full grid as designed.

### Type fluidity

For headlines, consider `clamp()` to interpolate between mobile and
desktop sizes smoothly:

- `h1`: `clamp(font-size-4xl, 5vw + 1rem, font-size-5xl)`.
- `h2`: `clamp(font-size-2xl, 3vw + 0.5rem, font-size-3xl)`.

Body text remains fixed at `font-size-base` across breakpoints to
preserve readability.
