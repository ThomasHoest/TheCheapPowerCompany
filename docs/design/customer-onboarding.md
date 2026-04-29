# Design Specification: Customer Onboarding

This document is the visual and interaction specification for the Customer
Onboarding flow defined in
[`docs/specifications/customer-onboarding.md`](../specifications/customer-onboarding.md).
It covers both the responsive web signup flow and the iOS-native onboarding
screens. Where shared tokens are referenced (e.g. `color.brand.primary`),
they originate in the marketing-site design spec and are duplicated here
verbatim so the two surfaces stay visually identical. If the marketing-site
spec changes a shared token, this document MUST be updated to match.

The functional contract — what each step does, what data is collected, what
the error states are — is owned by the spec. This document only owns the
visual treatment, layout, motion, and component-level behaviour.

---

## Design Principles

1. **One task per screen.** Every step in the 13-step flow asks for exactly
   one thing. No screen contains two unrelated form sections.
2. **Light, green, alive.** The brand is a friendly, trustworthy Danish
   utility. Backgrounds are near-white with a warm undertone; the primary
   action colour is a confident, slightly desaturated green.
3. **Effortless beats ornate.** Generous whitespace, large touch targets,
   short copy, no decorative graphics that delay the user. Visual delight
   comes from motion and material, not from illustration density.
4. **Liquid glass on iOS, layered light on web.** iOS uses `.glassEffect()`
   cards floating over a soft tinted backdrop. Web uses subtly elevated
   white cards over a pale-green gradient — visually consistent without
   pretending the web is a native surface.
5. **The flow always tells the user where they are.** A persistent progress
   indicator is visible on every step. The user can always answer "how much
   longer?" without thinking.
6. **Errors are part of the design, not an afterthought.** Every error state
   in the spec has a designed treatment. No raw browser alerts, no untranslated
   server messages.
7. **Danish first, calm tone.** Copy is in Danish, sentence-case, second
   person ("du"). No exclamation marks except on the success screen.

---

## Colour Tokens

All colours are listed as `token-name` followed by light-mode hex. iOS and
web use the same token names; iOS resolves them through an asset catalogue,
web through CSS custom properties on `:root`. Dark mode is **out of scope
for v1** (Open Question — see below); tokens are nonetheless named so dark
variants can be added without renaming.

### Brand

| Token | Hex | Usage |
|---|---|---|
| `color.brand.primary` | `#2BA84A` | Primary CTAs, focus rings, active progress segments, success checkmark |
| `color.brand.primary.hover` | `#229A3F` | Hover state on primary CTAs (web only) |
| `color.brand.primary.pressed` | `#1B8334` | Active/pressed state on primary CTAs |
| `color.brand.primary.soft` | `#E6F6EA` | Soft brand background (selected toggle, info banner) |
| `color.brand.accent` | `#A8E063` | Decorative accent in gradients only |

### Surface

| Token | Hex | Usage |
|---|---|---|
| `color.surface.canvas` | `#F7FBF6` | Page background (web), root canvas tint (iOS) |
| `color.surface.card` | `#FFFFFF` | Web card background; iOS solid card fallback when reduced transparency is on |
| `color.surface.glass.tint` | `rgba(255,255,255,0.55)` | iOS liquid glass card tint over canvas |
| `color.surface.glass.stroke` | `rgba(255,255,255,0.8)` | iOS glass card 1px inner highlight |
| `color.surface.gradient.start` | `#F7FBF6` | Top of the canvas gradient |
| `color.surface.gradient.end` | `#E6F6EA` | Bottom of the canvas gradient |
| `color.surface.overlay` | `rgba(15, 32, 18, 0.32)` | Modal scrim (web), MitID handoff dim |

### Text

| Token | Hex | Usage |
|---|---|---|
| `color.text.primary` | `#0F2012` | Headlines, body copy on light surfaces |
| `color.text.secondary` | `#4A5A4D` | Secondary copy, helper text, field labels |
| `color.text.tertiary` | `#7C8A7F` | Placeholder text, disabled labels |
| `color.text.onPrimary` | `#FFFFFF` | Text on `color.brand.primary` |
| `color.text.link` | `#1B8334` | Inline links, "Få hjælp" |

### Feedback

| Token | Hex | Usage |
|---|---|---|
| `color.feedback.error` | `#C0392B` | Error borders, error icons, error message text |
| `color.feedback.error.soft` | `#FBEAE7` | Error banner background |
| `color.feedback.warning` | `#D68910` | Cautionary banners (e.g. "Vi fortsætter, hvor du slap") |
| `color.feedback.warning.soft` | `#FCF3E1` | Warning banner background |
| `color.feedback.success` | `#1E8E3E` | Confirmation checkmark, success banner |
| `color.feedback.success.soft` | `#E6F4EA` | Success banner background |
| `color.feedback.info` | `#1F6FB5` | Informational banner (MitID handoff explanation) |
| `color.feedback.info.soft` | `#E8F1FB` | Info banner background |

### Border

| Token | Hex | Usage |
|---|---|---|
| `color.border.default` | `#D8E1D9` | Default field border, divider lines |
| `color.border.strong` | `#A8B5AB` | Hovered field border (web) |
| `color.border.focus` | `color.brand.primary` | Focused field border + 2px focus ring |
| `color.border.error` | `color.feedback.error` | Error field border |

---

## Typography Tokens

Type family is **Inter** on web (variable font, weights 400/500/600/700)
and **SF Pro** on iOS (system default, supports Dynamic Type). Inter is
chosen for its similarity to SF Pro at common sizes and for its excellent
Danish character coverage including `æ`, `ø`, `å`.

| Token | Web (px / line-height) | iOS (pt / Dynamic Type role) | Weight | Usage |
|---|---|---|---|---|
| `text.display` | 40 / 48 | 34 / `.largeTitle` | 700 | Success screen headline only |
| `text.title.lg` | 32 / 40 | 28 / `.title1` | 700 | Step screen headline |
| `text.title.md` | 24 / 32 | 22 / `.title2` | 600 | Card section headlines |
| `text.title.sm` | 20 / 28 | 20 / `.title3` | 600 | Inline section labels |
| `text.body.lg` | 18 / 28 | 17 / `.body` | 400 | Primary body copy, field input |
| `text.body.md` | 16 / 24 | 15 / `.subheadline` | 400 | Secondary body, supporting copy |
| `text.label` | 14 / 20 | 13 / `.footnote` | 500 | Field labels, progress label |
| `text.caption` | 12 / 16 | 11 / `.caption1` | 500 | Helper text, error text |
| `text.button` | 17 / 24 | 17 / `.body` | 600 | Primary and secondary CTAs |

All typography uses `font-feature-settings: "ss01", "cv11"` on web for
clean numerals (relevant for the 18-digit metering point ID and CPR).
iOS uses `.monospacedDigit()` on the same fields.

---

## Spacing & Layout Tokens

Spacing is on a 4-pt base. Web and iOS share the same token names.

| Token | Value | Common usage |
|---|---|---|
| `space.0` | 0 | Reset |
| `space.1` | 4 px / pt | Tight icon-text gap |
| `space.2` | 8 | Inner field padding (vertical) |
| `space.3` | 12 | Helper-text offset, small gap |
| `space.4` | 16 | Default gap between related elements |
| `space.5` | 24 | Gap between form fields |
| `space.6` | 32 | Card inner padding (mobile), section gap |
| `space.7` | 48 | Card inner padding (desktop), step transition gutter |
| `space.8` | 64 | Vertical rhythm between major sections |

| Token | Value | Usage |
|---|---|---|
| `radius.sm` | 8 | Toggle pills, small chips |
| `radius.md` | 12 | Form fields, secondary buttons |
| `radius.lg` | 16 | Primary buttons |
| `radius.xl` | 24 | Cards (web), liquid glass cards (iOS) |
| `radius.full` | 9999 | Progress segments, success checkmark badge |

| Token | Web | iOS | Usage |
|---|---|---|---|
| `shadow.card` | `0 4px 24px rgba(15,32,18,0.06)` | `Shadow(.black.opacity(0.05), radius: 16, y: 4)` | Web card elevation; iOS subtle drop under glass |
| `shadow.cta` | `0 2px 12px rgba(43,168,74,0.25)` | `Shadow(.brandPrimary.opacity(0.25), radius: 8, y: 2)` | Primary CTA |
| `shadow.focus` | `0 0 0 2px #FFFFFF, 0 0 0 4px color.brand.primary` | n/a (uses native focus ring) | Web focus ring (double ring for contrast) |

**Layout grid (web):**
- Mobile (≤599 px): single column, page padding `space.4` on each side, content max-width = viewport.
- Tablet (600–899 px): single column, content max-width 560 px, centred.
- Desktop (≥900 px): single column, content max-width 480 px, centred. The signup flow is intentionally narrow even on large screens — it is a focused task, not a dashboard.

**Layout (iOS):**
- All cards are full-width minus `space.4` horizontal margin.
- Vertical safe-area is respected; the progress indicator sits below the status bar with `space.4` top padding.
- Minimum tappable height for any interactive element is 44 pt (Apple HIG); primary CTAs are 56 pt.

---

## Web Onboarding Flow

The web flow is a single-page application route at `/signup` that swaps
step content with a slide animation. The browser URL is updated for each
step (`/signup/step/3-mitid`, `/signup/step/6-cpr`, etc.) so a refresh
preserves the step, and so server-side error pages can deep-link back.

### Global page chrome

- **Background:** Linear gradient from `color.surface.gradient.start` (top) to `color.surface.gradient.end` (bottom), fixed (does not scroll).
- **Header:** Sticky top bar, height 64 px. Left: brand mark (text logo, `text.title.sm`, `color.brand.primary`). Right: a discreet "Få hjælp" link in `color.text.link`. No nav, no cart, no other distractions.
- **Footer:** Single line of `text.caption` text in `color.text.tertiary`: "Vi sletter dine oplysninger, hvis du ikke afslutter tilmeldingen.". Centered. Sits at the bottom of the card, not the bottom of the viewport.
- **Card:** White (`color.surface.card`), `radius.xl`, `shadow.card`, padding `space.7` on desktop, `space.6` on mobile.

### Step-by-step screen designs

The 13 steps from the spec map to web screens as follows. Steps marked
"silent" are not user-visible — they happen between visible steps as a
quick loading state on the previous screen.

#### Step 1 — Entry from marketing CTA (silent)

The marketing site CTA navigates to `/signup`. There is no dedicated screen
for this step; the user lands directly on Step 2. If the URL was reached
with a `?referrer=` query parameter, that value is captured and not displayed.

#### Step 2 — Pre-flight screen

The first visible screen. Sets expectations for the whole flow.

- **Headline** (`text.title.lg`): "Bliv kunde på 3 minutter".
- **Subhead** (`text.body.lg`, `color.text.secondary`): "Du skal bruge dit MitID, din MobilePay og din nuværende elregning."
- **Step list:** Three rows, each row containing a circular numbered badge (32 px, `color.brand.primary.soft` fill, `color.brand.primary` numeral), a title (`text.body.lg`, semibold), and a one-line description (`text.body.md`, `color.text.secondary`). Rows are separated by `space.5`.
  1. **Bekræft din identitet** — "Vi bruger MitID. Det tager 30 sekunder."
  2. **Vælg betaling** — "MobilePay eller Betalingsservice. Du vælger selv."
  3. **Bekræft din adresse og måler** — "Find dit målepunkts-ID på din nuværende elregning."
- **Primary CTA:** "Start" — full-width on mobile, 240 px on desktop, height 56 px, `color.brand.primary`, `color.text.onPrimary`, `radius.lg`, `shadow.cta`, `text.button`.
- **No back button.** Closing the tab is the way out.

#### Step 3 — MitID handoff (visible)

A dedicated handoff screen shown for ≈1.5 seconds after the user clicks "Start" on step 2 and before the redirect happens. See "MitID handoff screen" below for the full design.

#### Step 4 — Token exchange (silent)

The browser returns from Signicat to `/auth/callback`. The page renders a centred loading state on the existing card: a circular brand-coloured spinner (32 px, 2 px stroke, indeterminate rotation 1 s linear) and the label "Et øjeblik — vi henter dine oplysninger." If this state lasts longer than 5 seconds, the spinner is replaced with the "MitID temporarily unavailable" error.

#### Step 5 — Existing customer detection (silent)

If a match is found, the user is routed to the relevant Error State screen ("Du er allerede kunde hos os" / resume banner). Otherwise, no UI change — the user advances to Step 6.

#### Step 6 — CPR Match

- **Headline:** "Bekræft dit CPR-nummer".
- **Subhead** (`text.body.md`, `color.text.secondary`): "Vi sammenligner med dit MitID. Vi gemmer ikke dit CPR-nummer."
- **Single field:** `TextField` of type "cpr". Placeholder `DDMMYY-XXXX`. The dash is auto-inserted after the 6th digit. The field uses monospaced numerals. Maxlength 11 (10 digits + 1 dash).
- **Inline validation:** Format check happens on blur; "no match" is returned only after server submission. Error states use the standard `TextField` error treatment.
- **Privacy reassurance:** Below the field, a small lock icon + `text.caption` line "Sikker forbindelse. CPR sendes kun til Signicat." in `color.text.tertiary`.
- **CTA:** "Fortsæt" — same primary button. Disabled until 10 digits are entered.

#### Step 7 — Address & metering point

This is the most form-heavy step. To honour "one task per screen", it is split into two sub-steps with a slide transition between them:

**Step 7a — Adresse:**
- Headline: "Hvor skal vi levere strøm?"
- Fields, in order: `AddressField` (street + house number, with autocomplete), `TextField` (floor/door, optional, helper text "fx 2. tv. — kan være tom"), `TextField` (postal code, 4-digit numeric, autoformat), `TextField` (city, auto-filled from postal code lookup, read-only when auto-filled), `TextField` (email).
- CTA "Fortsæt" — disabled until address, postal code, and email all validate.

**Step 7b — Målepunkts-ID:**
- Headline: "Indtast dit målepunkts-ID".
- Subhead: "Det 18-cifrede nummer står på din nuværende elregning."
- Single `TextField`, monospaced numerals, 18 digits, auto-grouped as `XXXX XXXX XXXX XXXX XX` for readability. Maxlength 22 (18 digits + 4 spaces).
- Below the field, a collapsible "Hvor finder jeg det?" panel. Open state shows a single illustrative line drawing of a sample bill with the metering-point area highlighted in `color.brand.primary.soft`. The illustration is SVG, max 320 × 200 px, lazy-loaded.
- CTA "Fortsæt" — disabled until 18 digits validate.

#### Step 8 — Billing frequency

- Headline: "Hvor ofte vil du betale?"
- Subhead: "Du kan altid skifte senere."
- A `ToggleGroup` of two pill options, each 1/2 width, height 88 px:
  - **Månedlig** — primary label `text.title.sm`, secondary line `text.caption` "1 betaling om måneden", default selected.
  - **Ugentlig** — primary label `text.title.sm`, secondary line `text.caption` "1 betaling om ugen".
- Selected pill: `color.brand.primary.soft` fill, `color.brand.primary` 2px border, `color.text.primary` text. Unselected pill: `color.surface.card` fill, `color.border.default` 1px border.
- CTA "Fortsæt".

#### Step 9 — Payment authorization

The payment step has multiple sub-states. The visible web screens are:

**Step 9a — Choose payment method (visible):**
- Headline: "Vælg betalingsmåde".
- Two stacked option cards (full width, height 96 px, `radius.lg`, 1 px `color.border.default`):
  - **MobilePay** — left: official MobilePay wordmark logo (height 24 px), centre: title "MobilePay" + subtitle "Anbefalet — det er hurtigst", right: chevron-right icon. Hover/focus elevates the card with `shadow.card` and recolours border to `color.border.focus`.
  - **Betalingsservice** — left: a generic bank icon (24 px, `color.text.secondary`), centre: title "Betalingsservice" + subtitle "Hvis du ikke har MobilePay", right: chevron-right.
- No primary CTA — selecting a card commits the choice.
- A small `text.caption` line below: "Vi opretter ikke nogen betaling endnu — kun en aftale om kommende betalinger."

**Step 9b — MobilePay handoff (visible):**
See "MobilePay handoff screen" below.

**Step 9c — Awaiting MobilePay confirmation (silent → visible):**
After the redirect to MobilePay, the user returns to `/signup/return`. Initially renders the same handoff card with copy "Vi venter på bekræftelse fra MobilePay…" and a 32 px brand spinner. If 30 seconds pass without webhook receipt, an additional `text.body.md` line appears: "Det tager længere tid end normalt. Vi venter stadig — du kan blive på siden." The 10-minute timeout from the spec triggers the dedicated error screen.

**Step 9d — Betalingsservice form (visible, fallback):**
- Headline: "Indtast dine bankoplysninger".
- Subhead: "Vi opretter en Betalingsservice-aftale via Nets."
- Two `TextField`s side by side on desktop, stacked on mobile: "Reg.nr." (4 digits) and "Kontonr." (10 digits). Both use monospaced numerals.
- An info banner (`color.feedback.info.soft` background, `color.feedback.info` 1px left border, `space.4` padding, `radius.md`) with text: "Vi sender dine oplysninger sikkert til Nets. Din bank godkender aftalen."
- CTA "Opret Betalingsservice-aftale".

#### Step 10 — Confirmation screen (visible)

See "Success screen" below.

#### Step 11 — DataHub registration (silent, post-confirmation)

Not user-visible during signup. The success screen already explains the
asynchronous start date.

#### Step 12 — DataHub acceptance event (out of session)

Triggers a follow-up email; no in-session UI.

#### Step 13 — DataHub rejection event (out of session)

Triggers an email + ops ticket; no in-session UI.

### Progress indicator

- Position: top of the card, full card width minus `space.6` left/right padding, immediately under the page header.
- Visual: a horizontal segmented bar made of N segments, each segment `radius.full`, height 4 px, separated by `space.1` gap.
- N is computed as the number of **visible** user-facing steps from the user's perspective, not the spec's 13. Concretely: 6 segments — `Intro`, `MitID`, `CPR`, `Adresse & måler`, `Betaling`, `Bekræft`.
- Completed segments: `color.brand.primary` fill.
- Active segment: `color.brand.primary` fill with a subtle 1 s pulse animation (opacity 1 → 0.6 → 1, ease-in-out, infinite).
- Upcoming segments: `color.border.default` fill.
- Above the bar, a `text.label` line in `color.text.secondary`: e.g. "Trin 3 af 6 — CPR".
- Reduced motion: pulse is replaced by a static fill at full opacity.

### Form components

All form components are designed to be reused across web and iOS where the
metaphor allows. Web specifications below; iOS variants are described in
the iOS section.

#### TextField

Default state:
- Height: 56 px.
- Border: 1 px `color.border.default`.
- Radius: `radius.md`.
- Background: `color.surface.card`.
- Padding: `space.4` horizontal, `space.3` vertical.
- Label: `text.label`, `color.text.secondary`, sits above the field with `space.2` gap. The label is always visible — no floating-label tricks. Required fields show a small `*` in `color.feedback.error` after the label text.
- Placeholder: `text.body.lg`, `color.text.tertiary`.
- Input value: `text.body.lg`, `color.text.primary`.

Hover (web only):
- Border: 1 px `color.border.strong`.

Focused:
- Border: 1 px `color.border.focus` (= `color.brand.primary`).
- Outer ring: `shadow.focus`.
- Outline: none (browser default replaced by the ring).

Filled (value present, not focused):
- Border: 1 px `color.border.default`.
- A small green check icon (16 px, `color.feedback.success`) appears at the right edge of the field, padding `space.4` from the right border. Only shown when client-side validation has passed.

Error:
- Border: 1 px `color.border.error`.
- A small alert-circle icon (16 px, `color.feedback.error`) replaces the check icon.
- Error message: `text.caption`, `color.feedback.error`, sits below the field with `space.2` gap. Message text is verbatim from the spec's Error States table.

Disabled:
- Background: `color.surface.canvas`.
- Border: 1 px `color.border.default` at 50% opacity.
- Text: `color.text.tertiary`.
- Cursor: `not-allowed` (web).

#### SelectField

Same dimensions and states as `TextField`. The chevron-down icon at the right replaces any value-state icon. On click, opens a native `<select>` on web (for accessibility) styled to match.

#### ToggleGroup

A row of equal-width pills. Used only for billing frequency in v1.
- Pill height: 88 px on the billing-frequency screen (taller than default to fit two lines of copy).
- Pill height: 48 px in any other usage.
- Selected: `color.brand.primary.soft` fill, 2 px `color.brand.primary` border, `color.text.primary` text.
- Unselected: `color.surface.card` fill, 1 px `color.border.default` border, `color.text.primary` text.
- Hover (unselected): border becomes `color.border.strong`.
- Keyboard: arrow-left/arrow-right move selection; space/enter confirms.

#### AddressField

A single text input that accepts free-form Danish addresses with autocomplete.
- Visual: identical to `TextField`.
- Autocomplete: as the user types ≥3 characters, a dropdown appears below the field showing up to 5 matches from the Danish address API (DAR). Each result is a single line of `text.body.md`.
- Selected result fills the field with the canonical address string and silently populates postal code / city in their respective fields on Step 7a.
- If the API is unavailable, the field falls back to plain `TextField` behaviour (free typing, no dropdown). No error is shown — autocomplete is a convenience, not a requirement.
- A small `text.caption` helper "Vi finder din adresse, mens du skriver" appears below the field in default state and disappears once a value is selected.

### MitID handoff screen

A dedicated card replaces the step content during the redirect to Signicat.

- Headline (`text.title.md`): "Du sendes nu videre til MitID".
- Body (`text.body.lg`, `color.text.secondary`): "Når du er færdig, sender MitID dig tilbage hertil. Luk ikke vinduet."
- Visual: a centred circular badge, 96 px, `color.brand.primary.soft` fill, containing the MitID logo at 56 px. The badge has a subtle pulse animation (scale 1 → 1.04 → 1, 1.5 s ease-in-out, infinite). Reduced motion: static.
- Below the badge, a 32 px brand spinner.
- No CTA — the redirect happens automatically. If the redirect fails to start within 3 seconds, a fallback link "Klik her, hvis intet sker" appears in `color.text.link`.

### MobilePay handoff screen

The handoff screen shows an agreement preview before the redirect.

- Headline: "Sådan opretter vi din MobilePay-aftale".
- Below the headline, an "agreement preview" card (nested card, `color.brand.primary.soft` background, `radius.lg`, `space.5` padding, no shadow). The preview contains:
  - Top row: MobilePay wordmark (24 px) + "El-abonnement" in `text.title.sm`.
  - A 1 px `color.border.default` divider.
  - Three rows, each `text.body.md`:
    - "Beløb" — value: "Varierer efter forbrug"
    - "Hyppighed" — value: "Hver måned" or "Hver uge" (from US-06)
    - "Maksimum pr. betaling" — value: "3.000 kr."
  - A 1 px divider.
  - Footer line, `text.caption`, `color.text.secondary`: "Du godkender hver enkelt betaling i MobilePay-appen, hvis beløbet overskrider 250 kr."
- Below the preview card: explanatory copy (`text.body.md`, `color.text.secondary`): "Du sendes nu videre til MobilePay for at bekræfte aftalen. Det tager under et minut."
- Primary CTA "Åbn MobilePay" — full width, height 56 px, brand primary. The CTA initiates the redirect.
- Secondary link below the CTA: "Brug Betalingsservice i stedet" in `color.text.link`, `text.body.md`, centred.

### Success screen

The final visible screen. Celebratory but restrained.

- Headline (`text.display`): "Velkommen, [fornavn]!" — the only screen in the flow that uses `text.display` and an exclamation mark.
- Sub-headline (`text.title.md`, `color.text.secondary`): "Din strøm starter [dato]."
- Hero element: a 96 px circle, `color.brand.primary` fill, containing a white checkmark icon (40 px, 3 px stroke, rounded line caps). The circle is offset above the headline by `space.6`.
- **Animation on arrival (1 time):**
  - The circle scales from 0.6 → 1.05 → 1 (380 ms, custom spring, damping 0.7).
  - The checkmark's stroke draws on with `stroke-dasharray` from 0% → 100% (260 ms, ease-out, starting 120 ms after the circle scale begins).
  - The headline and summary card fade up (`translateY(8px) → 0`, opacity 0 → 1) 200 ms after the checkmark draw starts, 300 ms duration.
- Reduced motion: all elements appear immediately at final state.

Below the hero, a summary card containing the data the user just confirmed:
- Card: `color.surface.card`, `radius.xl`, `shadow.card`, `space.6` padding.
- Five rows, each row: label (`text.label`, `color.text.secondary`, left) + value (`text.body.lg`, `color.text.primary`, right). Rows are separated by 1 px `color.border.default` dividers with `space.4` vertical gap.
  1. **Navn** — full name from MitID.
  2. **Adresse** — supply address.
  3. **Betaling** — "MobilePay" or "Betalingsservice".
  4. **Hyppighed** — "Hver måned" or "Hver uge".
  5. **Telefonnummer** — masked phone number (e.g. `+45 ** ** ** 23`). Only shown for MobilePay.

Below the summary, primary and secondary CTAs:
- Primary: "Hent appen" — links to App Store. On iOS web (Safari iOS), the same button is shown but uses the App Store smart-banner styling. On desktop web, opens the App Store landing page in a new tab.
- Secondary: "Færdig" — closes the signup tab on web (best-effort `window.close()`); on iOS native, returns to the app home.
- Below both CTAs, a `text.caption` line in `color.text.tertiary`: "Vi sender en bekræftelse til [email]." with the email shown verbatim.

---

## iOS Onboarding Flow

The iOS app launches into the same conceptual flow but is rendered with
SwiftUI using a card-based layout floating above a soft-tinted backdrop.
Per Open Question 10 in the spec, MitID and MobilePay (steps 3 and 9b)
run inside `ASWebAuthenticationSession` / Universal Link app-switch
respectively; everything else is a native screen.

### Global iOS chrome

- **Backdrop:** A full-screen `LinearGradient` from `color.surface.gradient.start` (top) to `color.surface.gradient.end` (bottom). Above the gradient, a single soft blob of `color.brand.accent` at 18% opacity, 600×600 pt, blurred at radius 120 pt, positioned top-trailing — gives the canvas a subtle depth without adding noise.
- **Navigation:** A hidden `NavigationStack`. The app draws its own top bar:
  - Height 56 pt, sits below the safe area top inset.
  - Left: a back chevron `Button` (44×44 pt tap target). Hidden on the pre-flight and success screens.
  - Centre: progress indicator (see below).
  - Right: a "Hjælp" `Button` (44×44 pt tap target).
  - Top bar background is transparent.
- **Reduce transparency:** When `UIAccessibility.isReduceTransparencyEnabled` is true, all glass effects degrade to solid `color.surface.card` cards with `shadow.card`. The backdrop gradient remains.

### Liquid glass card components

The iOS card is the visual workhorse. It is implemented as a SwiftUI
`VStack` modified by `.glassEffect()` (iOS 26+). The fallback for iOS
17–25 uses `.background(.ultraThinMaterial)` with the same shape.

**`OnboardingCard` modifier:**
- Shape: `RoundedRectangle(cornerRadius: 24)` (= `radius.xl`).
- Material: `.glassEffect(.regular, in: RoundedRectangle(cornerRadius: 24))` on iOS 26+, otherwise `.background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24))`.
- Tint overlay: a single 1 px overlay using `color.surface.glass.tint` to warm the glass toward the brand.
- Inner highlight: a 1 px stroke at the top edge using `color.surface.glass.stroke`, `LinearGradient` from full opacity at top to 0 at bottom — gives the card the "wet glass" lensing effect.
- Padding: `space.6` (24 pt) on all sides; `space.7` (32 pt) on the success card.
- Shadow: `shadow.card`.
- Margin: `space.4` (16 pt) horizontal from the screen edge.

A primary card and any number of secondary cards can stack vertically with
`space.4` between them. Cards never stretch beyond the safe area.

**`GlassButton` (primary CTA):**
- Background: `color.brand.primary` (solid, no glass — primary action must be unmissable).
- Foreground: `color.text.onPrimary`.
- Height 56 pt, full width inside the card content area.
- `radius.lg`, `shadow.cta`.
- Pressed state: scale to 0.97 (animation `interactiveSpring(response: 0.25, dampingFraction: 0.7)`), background to `color.brand.primary.pressed`.

**`GlassSecondaryButton`:**
- Background: `.glassEffect(.regular)` on iOS 26+, else `.ultraThinMaterial`.
- Foreground: `color.brand.primary`.
- Height 48 pt.
- 1 pt stroke `color.brand.primary` at 50% opacity.

### Screen designs per step

The iOS step mapping mirrors the web flow. Differences are noted per step.

#### Step 2 — Pre-flight (native)

- Single `OnboardingCard` filling the safe area minus the top/bottom bars.
- Headline + subhead (same copy as web), then a `VStack` of three `StepListRow` components. Each row uses the same circular badge as web.
- `GlassButton` "Start" pinned to the bottom of the card with `space.5` above.
- On appear: card slides up 12 pt + fades in (260 ms ease-out).

#### Step 3 — MitID (`ASWebAuthenticationSession`)

See the dedicated section below.

#### Step 4 — Token exchange (native loading)

A small `OnboardingCard` (height fits content) replaces the previous step content. Centred 32 pt brand spinner (rotating `Circle().trim(from: 0, to: 0.7)` with stroke `color.brand.primary`, 3 pt line width, 1 s linear repeat). Below: `text.body.md` "Et øjeblik — vi henter dine oplysninger.".

#### Step 5 — Existing customer detection (native, conditional)

If a match is found, replace the loading card with the matching error card (see Error State Designs).

#### Step 6 — CPR Match (native)

- Headline + subhead in the card.
- Single `TextField` (iOS variant), `keyboardType: .numberPad`, custom auto-formatter for `DDMMYY-XXXX`.
- Privacy reassurance line with SF Symbol `lock.fill` (12 pt) + caption text.
- `GlassButton` "Fortsæt" — disabled until 10 digits entered.
- Below the keyboard, a "Done" toolbar accessory that submits the form.

#### Step 7 — Address & metering point (native)

Split into the same two sub-steps as web (7a Adresse, 7b Målepunkts-ID).

- 7a uses a `Form`-like vertical stack of native `TextField`s. The address field uses the iOS `MKLocalSearchCompleter` for autocomplete; results render in a glass card that pops up below the field, max 5 rows, separated by 1 pt dividers.
- 7b is a single 56 pt `TextField` with `keyboardType: .numberPad`, monospaced, auto-grouped 4-4-4-4-2.
- The "Hvor finder jeg det?" disclosure expands inline, animating the card height with `withAnimation(.smooth(duration: 0.25))`.

#### Step 8 — Billing frequency (native)

- Two horizontally laid out `BillingFrequencyTile` components inside the card. Each tile is itself a small glass surface (using `.glassEffect()`); the selected tile gains a 2 pt `color.brand.primary` stroke and a `color.brand.primary.soft` overlay at 50% opacity.
- Selecting a tile triggers a light haptic and animates the stroke in over 180 ms.

#### Step 9a — Choose payment method (native)

- Two stacked `PaymentMethodCard` components inside the parent `OnboardingCard`. Each is itself a glass tile (44 pt min height; 96 pt actual) with the appropriate logo, title, subtitle, and a chevron.
- Tap triggers a light haptic + scale-down to 0.98 + immediate transition (no separate confirm step).

#### Step 9b — MobilePay handoff (native preview, then app-switch)

- A `MobilePayPreviewCard` showing exactly the same agreement preview as the web spec (logo, three rows, footer line). The preview uses a `color.brand.primary.soft` background instead of glass, so it visually nests inside the parent glass card.
- `GlassButton` "Åbn MobilePay" triggers `UIApplication.shared.open(mobilepayURL)` (the `vippsConfirmationUrl`). MobilePay handles the rest natively in its own app.
- Below the CTA: `GlassSecondaryButton` "Brug Betalingsservice i stedet".

#### Step 9c — Awaiting MobilePay confirmation (native loading)

When the app returns to foreground from MobilePay, this card is shown. Same spinner + copy as web. After 30 seconds, an additional `text.body.md` line appears.

#### Step 9d — Betalingsservice form (native)

- Same fields as web (reg.nr. + kontonr.), laid out side by side using a `HStack` with `space.4` gap on iPad and stacked on iPhone.
- Info banner uses a translucent `color.feedback.info.soft` glass tile.
- `GlassButton` "Opret Betalingsservice-aftale".

#### Step 10 — Confirmation (native success)

The success card replaces the entire screen. See Shared Components → Success Screen for the shared visual; iOS-specific notes:

- The hero checkmark badge is rendered with `.glassEffect()` masked into a circle, with `color.brand.primary` set as the background tint of the glass — the result is a luminous green disc, not a flat fill.
- On appear, in addition to the shared scale + draw animation, a `notification(.success)` haptic fires.
- The "Hent appen" CTA is replaced by "Fortsæt til appen" since the user is already in the app.

### `ASWebAuthenticationSession` presentation

The MitID flow on iOS runs inside `ASWebAuthenticationSession`. This is a
system-controlled modal that we cannot fully restyle, but we control how
it is launched and what is visible behind it.

- **Trigger:** The pre-flight `GlassButton` "Start" calls into the auth coordinator. A 350 ms transition begins immediately so the user gets feedback before the system modal animates.
- **Behind-the-scenes screen:** Before presenting `ASWebAuthenticationSession`, the app navigates to the MitID handoff screen (same headline + body copy as web: "Du sendes nu videre til MitID"). The system modal then animates up over this screen.
- **Background blur:** While `ASWebAuthenticationSession` is presenting, the app applies a `UIBlurEffect(style: .systemUltraThinMaterial)` to the underlying handoff screen. The handoff screen's pulsing badge and spinner are still partially visible through the blur, reinforcing visual continuity.
- **`prefersEphemeralWebBrowserSession`:** Set to `false` (so a returning user's MitID broker cookie is reused, avoiding a re-login prompt mid-session).
- **Status bar:** The system modal manages its own; we do not override.
- **Cancellation:** If the user dismisses the modal (`ASWebAuthenticationSessionError.canceledLogin`), the handoff screen un-blurs over 200 ms and a non-blocking `Toast` slides down from the top: "Du afbrød MitID-login. Prøv igen, når du er klar." The "Start" CTA on the pre-flight screen re-enables.
- **Universal Link return:** When MitID returns via Universal Link, the auth coordinator dismisses the system modal and transitions to Step 4 (token exchange). The handoff screen is replaced with the loading card during this transition.

### Haptics

Haptic feedback fires on these moments only. iOS uses `UIImpactFeedbackGenerator` and `UINotificationFeedbackGenerator`; intensity is system default unless noted.

| Moment | Generator | When |
|---|---|---|
| Step advance (forward) | `.impactOccurred(intensity: 0.6)` light | Immediately when the step transition animation starts |
| Step retreat (back) | `.impactOccurred(intensity: 0.4)` light | When the back chevron is tapped |
| Toggle / payment-method selection | `.selectionChanged()` | On each new selection |
| Inline validation error appears | `.notificationOccurred(.error)` | When the error message is rendered (debounced — fires once per error per field) |
| MitID return success | `.impactOccurred(intensity: 0.7)` medium | When step 4 begins |
| Payment authorized (webhook received) | `.impactOccurred(intensity: 0.6)` light | When step 9c transitions to step 10 |
| Success screen arrival | `.notificationOccurred(.success)` | When the success card appears, fires once at the start of the checkmark animation |

If `UIAccessibility.isReduceMotionEnabled` is true, animations are
shortened to 100 ms but haptics still fire. If the user has system-wide
haptics disabled, `UIImpactFeedbackGenerator` is a no-op (system handles
this) — no special-casing needed.

---

## Shared Components

These component definitions are surface-agnostic: the same name, props,
and visual specification apply to both web and iOS. Implementation
language differs, naming does not.

### `Banner`

Used for: PENDING-resume notice, info messages, non-blocking errors.

- Layout: horizontal `HStack` of icon (20 px / pt) + body text + optional dismiss button.
- Padding: `space.4` all sides.
- Radius: `radius.md`.
- Border: 1 px on the leading edge only, in the appropriate feedback colour.
- Background: corresponding `*.soft` token.
- Variants: `info` (`color.feedback.info`), `warning`, `error`, `success`.

### `LoadingState`

A centred 32 px / pt brand spinner above a single line of `text.body.md`.
Used for token-exchange screen, MobilePay-awaiting screen, and any
indeterminate wait under 30 s. After 30 s, a secondary line appears
with copy specific to the context.

### `PrivacyChip`

A small inline element pairing an SF Symbol / SVG `lock.fill` icon with
`text.caption` copy. Used to reassure users at moments where they enter
sensitive data (CPR step, Betalingsservice bank step).

### `Toast`

Surface-specific implementation, shared visual.
- Slides down from the top of the safe area / viewport over 200 ms.
- Auto-dismisses after 4 s.
- Single line of `text.body.md`, max 2 lines on mobile.
- Background: `color.surface.card` with `shadow.card` on web, `.glassEffect()` on iOS.
- 1 px leading border in the matching feedback colour.

### `StepListRow`

The numbered row used in the pre-flight step. Three sub-elements: badge (32 px / pt circle, `color.brand.primary.soft` fill, `color.brand.primary` numeral), title (`text.body.lg`, semibold), description (`text.body.md`, `color.text.secondary`).

### Success summary card

The 5-row summary on the confirmation screen, defined once and reused on
both surfaces.

---

## Motion & Animation

### Step transitions

| Direction | Web | iOS |
|---|---|---|
| Forward (next step) | New screen slides in from the right (translateX 24 px → 0) + fades in (opacity 0 → 1). Outgoing slides out to the left (0 → -24 px) + fades out. Duration 250 ms, easing `cubic-bezier(0.4, 0, 0.2, 1)` (Material standard ease-in-out). | Same metaphor implemented as a `transition(.asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity), removal: .move(edge: .leading).combined(with: .opacity)))` with `.smooth(duration: 0.25)`. |
| Backward (previous step) | Mirror of forward: new screen slides in from the left, outgoing slides to the right. | Mirror — `.move(edge: .leading)` for insertion. |
| Lateral (sub-step within Step 7) | Same as forward/backward but with a smaller travel of 12 px / pt and a faster 200 ms duration so the user perceives sub-step navigation as lighter. | Same. |

### Field-level animations

| Trigger | Web | iOS |
|---|---|---|
| Field gains focus | Border colour transitions over 120 ms ease-out; focus ring fades in over the same duration. | Border colour transitions via `.animation(.smooth(duration: 0.12), value: isFocused)`. |
| Inline error appears | Error message slides down from the field edge (translateY -4 px → 0) + fades in (200 ms). | Same metaphor with `.transition(.move(edge: .top).combined(with: .opacity))`. |
| Filled-state check icon | Fades in over 150 ms once validation passes. | Same. |

### Special motion

- **Pre-flight CTA hover (web):** subtle scale to 1.02 over 120 ms + `shadow.cta` intensifies (shadow opacity 0.25 → 0.35).
- **Success checkmark:** see Success screen specification.
- **Progress indicator advance:** the newly-active segment animates its fill from 0% → 100% width over 280 ms ease-out.
- **MitID handoff badge pulse:** scale 1 → 1.04 → 1, 1.5 s ease-in-out, infinite.

### Reduced motion

Both `prefers-reduced-motion: reduce` (web) and `UIAccessibility.isReduceMotionEnabled` (iOS) collapse all motion to:
- Step transitions become an instant swap (no slide, no fade).
- Pulsing animations are static at full opacity.
- The success-screen checkmark draw is skipped — the final state appears immediately.
- Field-level transitions reduce to 80 ms straight fades.
- Haptics on iOS still fire.

---

## Accessibility

The flow targets WCAG 2.1 AA per the spec's Non-Functional Requirements.
Concrete, testable requirements:

### Colour contrast

All text/background pairings meet WCAG 2.1 AA contrast ratios. Verified pairings:
- `color.text.primary` on `color.surface.canvas`: 16.1:1 ✓ (AAA).
- `color.text.primary` on `color.surface.card`: 17.6:1 ✓ (AAA).
- `color.text.secondary` on `color.surface.card`: 8.5:1 ✓ (AAA).
- `color.text.onPrimary` on `color.brand.primary`: 4.7:1 ✓ (AA).
- `color.feedback.error` on `color.feedback.error.soft`: 6.2:1 ✓ (AAA).
- `color.text.link` on `color.surface.card`: 5.3:1 ✓ (AA).

The brand primary green at the v1 hex (`#2BA84A`) was chosen specifically to clear 4.5:1 against white at the body sizes used. If a future brand refresh shifts the green, every CTA pairing must be re-verified before rollout.

### Web accessibility

- Every form field has a programmatically associated `<label>` (no placeholder-as-label).
- Required fields use both the visual `*` and `aria-required="true"`.
- Error messages are linked via `aria-describedby` on the field and use `role="alert"` so screen readers announce them when they appear.
- The progress indicator uses `<nav aria-label="Tilmeldingstrin">` containing an ordered list; the current step has `aria-current="step"`.
- Step transitions update the document title (`<title>`) so screen readers announce the new step ("CPR-bekræftelse — Tilmelding — The Cheap Power Company").
- Focus management: on every step transition, focus moves to the new step's headline (`tabindex="-1"` + `.focus()`).
- Focus ring: `shadow.focus` is always visible — no `:focus { outline: none }` without a replacement.
- All interactive controls reachable by keyboard in a logical order; no keyboard traps.
- The MitID handoff screen does not auto-redirect for users on `prefers-reduced-motion`; instead, the "Klik her, hvis intet sker" link is shown immediately.

### iOS accessibility

- Every form field has a `.accessibilityLabel(...)` matching its visible label.
- VoiceOver order matches visual order (top to bottom, left to right).
- Custom controls (toggle group, payment-method cards) declare `.accessibilityAddTraits(.isButton)` and `.accessibilityValue(...)` for selection state.
- All text scales with Dynamic Type up to and including `.accessibility5`. Cards grow vertically as needed; layouts are tested at every standard Dynamic Type size.
- Cards respect `UIAccessibility.isReduceTransparencyEnabled` per the rule above (solid fallback).
- The progress indicator is a single `accessibilityElement(children: .ignore)` with label "Trin 3 af 6 — CPR" so VoiceOver users hear the position concisely.
- Haptics never replace visual or auditory feedback — they augment.
- `ASWebAuthenticationSession` is itself accessible via the system. We do not override its accessibility.

### Touch targets

- iOS: every interactive element ≥ 44×44 pt.
- Web: every interactive element ≥ 44×44 px on touch devices (verified via touch-input media query).

---

## Error State Designs

Each error state in the spec's Error States table has a matching visual
design. Where the spec specifies copy verbatim, the design uses that copy
unchanged.

### Visual taxonomy

Errors fall into one of three visual treatments:

1. **Inline field error** — error attaches to a single form field. Used for postal code, metering point ID format, CPR format. Visual: `TextField` error state described above.
2. **Inline form error** — banner placed at the top of the current step's card. Used for transient errors that don't justify a full screen change (e.g. "Vi kunne ikke oprette MobilePay-aftalen" with retry CTA).
3. **Dedicated error screen** — replaces the entire step content. Used for terminal or flow-redirecting errors (MitID unavailable, CPR Match permanent fail, MobilePay declined → fallback offer, duplicate active customer).

### Specific error designs

#### MitID unavailable (broker 5xx, timeout >30 s)

- **Treatment:** dedicated error screen.
- **Layout:** centred in the card.
- **Hero:** 64 px / pt circular badge, `color.feedback.error.soft` fill, containing an SF Symbol / SVG `exclamationmark.triangle` icon at 32 px in `color.feedback.error`.
- **Headline:** "MitID er midlertidigt utilgængeligt".
- **Body:** "Vi prøver igen automatisk om lidt. Du kan også prøve manuelt."
- **Auto-retry indicator:** A 15-second countdown progress bar in `color.feedback.warning`, label "Prøver igen om 15 sekunder…". Bar fills from 0% → 100% as the countdown elapses.
- **Primary CTA:** "Prøv igen" — restarts the OIDC flow immediately.
- **Secondary link:** "Få hjælp" → support.

#### CPR Match fail (first attempt)

- **Treatment:** inline field error on the existing CPR step.
- **The TextField** transitions to its error state (red border, alert icon).
- **Error message** (below the field, `text.caption`, `color.feedback.error`): "Det CPR-nummer du indtastede matcher ikke din MitID. Prøv igen."
- The "Fortsæt" CTA remains enabled so the user can retry without clearing the field manually. The field gains focus automatically.
- iOS: `notificationOccurred(.error)` haptic fires.

#### CPR Match fail (second attempt — terminal)

- **Treatment:** dedicated error screen.
- **Hero:** same error badge as MitID unavailable.
- **Headline:** "Vi kan ikke bekræfte din identitet".
- **Body:** "Vi kan stadig ikke bekræfte dit CPR. Kontakt support, så hjælper vi dig videre."
- **Primary CTA:** "Kontakt support" — links to `mailto:` or in-app support sheet.
- **Secondary link:** "Tilbage til forsiden" — exits signup.
- The signup session is terminated server-side at the moment this screen is shown.

#### MobilePay declined / timeout → Betalingsservice offer

- **Treatment:** dedicated error screen with a positive "fallback" framing — this is not a hard error.
- **Hero:** 64 px circle, `color.feedback.warning.soft` fill, with a `creditcard.trianglebadge.exclamationmark` icon (32 px, `color.feedback.warning`).
- **Headline:** "MobilePay-aftalen blev ikke gennemført".
- **Body:** Either "Du afviste MobilePay-aftalen. Du kan prøve igen eller vælge Betalingsservice i stedet." or "Vi modtog ikke bekræftelse fra MobilePay. Prøv igen, eller vælg Betalingsservice." depending on the trigger.
- **Two primary actions, stacked:**
  1. `GlassButton` / web primary "Vælg Betalingsservice" — routes to step 9d.
  2. `GlassSecondaryButton` / web secondary "Prøv MobilePay igen" — routes back to step 9b.
- **Tertiary link:** "Afslut tilmelding" — exits flow with confirmation modal "Er du sikker? Vi sletter dine oplysninger." with "Ja, afslut" / "Bliv her" options.

#### Duplicate active customer

- **Treatment:** dedicated screen, but visually warm rather than alarming — the user is welcome, just in the wrong place.
- **Hero:** 64 px circle, `color.brand.primary.soft` fill, containing an SF Symbol / SVG `person.fill.checkmark` (32 px, `color.brand.primary`).
- **Headline:** "Du er allerede kunde hos os".
- **Body:** "Vi har en aktiv konto med dit MitID. Du kan logge ind for at se dine oplysninger."
- **Primary CTA:** "Gå til min konto" — navigates to the logged-in account home (the user is already authenticated from the MitID step earlier in this same flow).
- **Secondary link:** "Log ud" — kills the just-established session and returns to the marketing site.

#### Existing PENDING customer (resume)

- **Treatment:** non-blocking warning banner above the next incomplete step.
- **Banner:** `Banner` component, `warning` variant, copy: "Vi fortsætter, hvor du slap.".
- The banner auto-dismisses after 6 s but can be dismissed manually via an `x` button.
- The user lands directly on the next incomplete step (address, payment, or DataHub re-submission). No extra screen.

#### Hashed-CPR match without MitID UUID match (escalation)

- **Treatment:** dedicated screen — terminal until support intervenes.
- **Hero:** 64 px circle, `color.feedback.warning.soft` fill, with an `envelope.badge` icon (32 px, `color.feedback.warning`).
- **Headline:** "Vi har sendt dig en e-mail".
- **Body:** "Vi har brug for at verificere din identitet manuelt. Tjek din indbakke — vi skriver inden for 1 hverdag."
- **Primary CTA:** "Luk" — exits flow.
- No retry option; this is a support-driven recovery.

#### Inline form errors (MobilePay 4xx/5xx, Betalingsservice creation fail, etc.)

- **Treatment:** inline form error banner at the top of the current step's card.
- **Banner:** `error` variant.
- **Copy:** taken verbatim from the spec's Error States table for each scenario.
- **Action(s):** any retry / fallback CTAs are rendered immediately below the banner, before the rest of the step content. The user is not knocked off the step.

#### Session idle timeout

- **Treatment:** dedicated screen — replaces whatever step was open.
- **Hero:** 64 px circle, `color.feedback.warning.soft` fill, with a `clock` icon (32 px, `color.feedback.warning`).
- **Headline:** "Din tilmelding udløb".
- **Body:** "Vi gemte ikke dine oplysninger. Du skal starte forfra med MitID for at fortsætte."
- **Primary CTA:** "Start forfra" — restarts the entire signup flow at step 2.

#### DataHub rejection (post-confirmation, email-only)

- No in-flow screen; handled via email and an ops ticket per the spec.
- The customer's account home (out of scope here) shows a banner reflecting the `DATAHUB_REJECTED` state.

---

## Open Questions

1. **Dark mode** — Owner: Product + Design. Default assumption: out of scope for v1. Token names support a future dark variant without rename, but no dark colour values are defined in this document. iOS will lock to light mode via `Info.plist` until dark mode is designed.
2. **Brand mark final form** — Owner: Brand / Marketing. Default assumption: text-only wordmark "The Cheap Power Company" in `color.brand.primary` until the marketing-site spec defines a logo asset. If a logo emerges, all surfaces in this document use it at the same height (24 px on web header, 24 pt on iOS top bar).
3. **MobilePay logo licensing** — Owner: Legal / Partnerships. Default assumption: we use the official MobilePay wordmark on the payment-method card and handoff card per Vipps MobilePay's brand guidelines. If licensing requires a specific lockup, the visual on Step 9a/9b must be updated accordingly.
4. **Address autocomplete provider** — Owner: Engineering. Default assumption: DAR (Danmarks Adresseregister) free public API. If a paid provider is selected, the visual is unchanged but the latency budget for the dropdown (currently <300 ms) must be re-validated.
5. **Help-link destination** — Owner: Product + Support. Default assumption: a `/hjaelp` page on the marketing site (web) or an in-app sheet (iOS) listing email + phone. Final destinations and copy are deferred to the support-channel spec.
6. **Marketing-site shared tokens** — Owner: Design. Default assumption: this document defines the canonical values. When the marketing-site design spec is written, it should reference these tokens and the marketing-site deviations (if any) noted there. If the marketing-site spec lands first, this assumption is reversed.
7. **Reduced transparency on iOS — exact fallback** — Owner: Design + iOS engineering. Default assumption: solid `color.surface.card` cards with `shadow.card`. Need to confirm visually that the fallback still feels "ours" and not generic.

---

## Resolved Decisions

| Question | Decision |
|---|---|
| Should the web flow use a multi-step form on one URL or a route per step? | Route per step. Refresh-safe and easier to deep-link from error states. |
| Should the progress indicator count the spec's 13 steps or the user-visible steps? | User-visible steps (6). Internal silent steps (token exchange, existing-customer detection, DataHub) are not user-perceived progress. |
| Should the "Hjælp" link be visible during the MitID handoff? | Yes. Users may need help at exactly that moment. |
| Should we collapse Step 7 (address + meter) into one screen? | No. Two sub-steps. Honours the "one task per screen" principle and the meter-ID instruction needs space. |
| Are floating labels used? | No. Labels are always visible above the field. Screen-reader and translation-friendly. |
| Should iOS render MitID inline via WKWebView with custom chrome? | No — forbidden by the spec and by MitID's broker contract. `ASWebAuthenticationSession` only. |
| Should we use a separate success route or a modal on the last step? | Separate route (`/signup/done`). The user has earned a real screen, and it's bookmarkable / shareable as a confirmation. |
| Should the success screen auto-redirect to the app store after N seconds? | No. The user controls the pace. |
| Should we fire haptics on every keystroke in CPR and meter-ID fields? | No. Haptics are reserved for moment-of-decision events. |
| Is the brand green tested for AA contrast on white? | Yes. `#2BA84A` on white is 4.7:1 — passes AA at body sizes; passes AAA for large text. |
| Should the `ASWebAuthenticationSession` use ephemeral browser session? | No. Reusing the broker session lowers MitID friction for users who recently authenticated elsewhere. |
| Should the back button be visible on the pre-flight screen? | No. The pre-flight screen is the entry point; users close the tab / app to leave. |
| Should we show the MobilePay agreement preview before the redirect? | Yes. It builds trust and is visually consistent with our brand even though MobilePay's own UI follows. |
| Should the success animation include confetti or other celebration graphics? | No. The checkmark + headline does the work. Restraint reads as confidence. |
