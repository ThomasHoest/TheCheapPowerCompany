# Marketing Site — Functional Specification

## Overview

The Marketing Site is the public-facing web entry point for The Cheap Power
Company, a Danish power brokerage that resells electricity bought via
energinet.dk to consumers with a transparent per-kWh markup and a small
recurring subscription fee. The site exists to convert visitors into paying
customers: it explains the service, displays the current live spot price the
customer would pay today, and channels visitors into the signup flow which
completes via MitID authentication and a MobilePay subscription mandate.

Out of scope for this version: customer self-service, billing history,
authenticated account areas, or the companion app — those live elsewhere in
the system. The Marketing Site is read-only marketing plus a single
"Sign up" call-to-action that hands off to the Onboarding Flow.

## Goals

- Communicate the value proposition (cheap, transparent, Danish, simple) on
  the landing page within the first viewport.
- Show the current live electricity rate (DKK/kWh including markup) so
  visitors can compare immediately against incumbents.
- Explain pricing — both the per-kWh markup and the subscription fee
  (weekly / monthly options) — without forcing the user to read a long page.
- Drive visitors to the signup flow from any page in two clicks or fewer.
- Render correctly and convert effectively on mobile, since Danish consumers
  predominantly browse and authenticate (MitID, MobilePay) on mobile.
- Establish brand trust: light, green, modern Danish web aesthetic; copy in
  Danish as the primary language.

## Out of Scope (this version)

- Authenticated user areas (account dashboards, billing history, contracts).
- The companion app itself (separate component) — only a link/teaser is in scope.
- Self-service price calculator using the visitor's actual annual consumption
  in kWh (deferred; v2 may add postal-code / consumption-based estimates).
- Multi-language support beyond Danish (English may be added in v2).
- A blog, careers page, or press kit.
- Live chat / support widget.
- A/B testing infrastructure (instrumented for analytics, but no test runner).
- Cookie-consent flows beyond the legal minimum required for analytics.

## Technical Context

| Decision | Choice | Rationale |
|---|---|---|
| Platform | Web (responsive single-site) | Reach all Danish consumers; mobile-first traffic expected |
| Primary language | Danish (da-DK) | Target market is Denmark |
| Hosting | Static-site / SSR-capable host (e.g. Vercel, Netlify, or equivalent) | Fast TTFB, low ops overhead, cheap |
| Live price data source | Internal pricing service (which itself wraps energinet.dk + markup) | The Marketing Site never calls energinet.dk directly; it consumes the same internal price endpoint the app uses |
| Signup integration | Hand-off to the Onboarding Flow at a known URL (e.g. `/signup`) | Decouples marketing from onboarding implementation |
| Payment integration | None directly — MobilePay subscription is captured during Onboarding | Keeps Marketing Site free of PCI/payment scope |
| Identity | None directly — MitID is invoked during Onboarding | Marketing Site is fully anonymous |
| Analytics | Privacy-respecting analytics (e.g. Plausible, Umami, or self-hosted) | GDPR compliance; minimise cookie banners |

## User Stories

### US-01 — Visitor lands on the homepage and understands the offering

> As a Danish consumer who has heard about The Cheap Power Company, I want
> to land on the homepage and immediately understand what is being offered,
> so that I can decide within seconds whether to keep reading.

**Acceptance criteria:**
- The first viewport (above the fold) on a 390x844 mobile device shows: the
  brand name, a one-line value proposition in Danish, the current live kWh
  rate, and a primary "Tilmeld dig" (Sign up) call-to-action button.
- The first viewport on a 1440x900 desktop shows the same elements without
  the user needing to scroll.
- The page loads to a usable, interactive state in under 3 seconds on a
  standard 4G connection.

### US-02 — Visitor reads about pricing

> As a price-sensitive consumer, I want to see exactly how the pricing
> works (markup per kWh and subscription fee) so that I can compare it
> against my current provider.

**Acceptance criteria:**
- A pricing section is reachable from the landing page in one click (anchor
  link or top-nav).
- The pricing section states the per-kWh markup as a concrete number in
  øre/kWh.
- The pricing section states both subscription options (monthly fee in DKK,
  weekly fee in DKK) and which is the default recommendation.
- The pricing section explicitly states there are no binding periods, hidden
  fees, or exit fees (if true; otherwise states the binding period).
- A worked example is shown ("Et husstand der bruger 4.000 kWh/år betaler ca. ...").

### US-03 — Visitor sees the current live kWh rate

> As a visitor, I want to see what one kWh costs right now under this
> service so that I can judge whether it is a good deal.

**Acceptance criteria:**
- The current live rate is displayed prominently on the homepage in DKK/kWh
  (or øre/kWh) including the company's markup.
- A timestamp or "Opdateret kl. HH:MM" label indicates how fresh the price is.
- The displayed price refreshes at least every 15 minutes while the page is
  open, or on page refresh.
- A short explainer ("Prisen følger spotprisen på det danske elmarked")
  appears beside the number.

### US-04 — Visitor clicks to sign up

> As a convinced visitor, I want to click "Sign up" and be taken straight
> into the signup process, so that I am not slowed down by extra forms on
> the marketing site.

**Acceptance criteria:**
- A primary CTA button is present in the top navigation, in the hero section,
  and at the end of the pricing section.
- Clicking any CTA navigates the user to the Onboarding Flow entry URL.
- The CTA carries no inline form fields on the marketing site itself — the
  first field the visitor fills in is inside the Onboarding Flow.
- The CTA is keyboard-accessible and reachable via tab navigation.

### US-05 — Visitor uses the site on mobile

> As a Danish consumer browsing on my phone, I want the site to work
> perfectly on my mobile device so that I can sign up without switching to
> a computer.

**Acceptance criteria:**
- All content reflows correctly on screen widths from 360px to 1920px.
- No horizontal scrolling at any supported width.
- All tap targets are at least 44x44 px.
- The signup CTA remains visible or sticky on long-scroll mobile views.
- The site passes Lighthouse Mobile Performance score of at least 90 and
  Accessibility score of at least 95.

### US-06 — Visitor learns about the companion app

> As a curious visitor, I want to know that there is a companion app that
> shows my current rate and bill so that I know what I get after signing up.

**Acceptance criteria:**
- A section or block on the landing page describes the companion app.
- The block mentions the two key features: live kWh rate and current bill.
- If app store links exist, they are present; otherwise a "Coming soon" state
  is shown.

### US-07 — Visitor wants to read terms and privacy

> As a privacy-conscious Danish consumer, I want to find the terms of
> service and privacy policy before I sign up so that I know what I'm
> agreeing to.

**Acceptance criteria:**
- Footer links to "Handelsbetingelser" (Terms) and "Privatlivspolitik"
  (Privacy Policy) are present on every page.
- Both pages are publicly accessible without authentication.
- Both pages are rendered in Danish.

## Pages and Content

| Page / Section | Purpose | Key content elements |
|---|---|---|
| Landing page (`/`) | Convert visitor; primary entry point | Hero with value prop + CTA + live rate; pricing summary; how-it-works (3 steps); companion app teaser; FAQ; footer |
| Hero section | Hook in 5 seconds | Brand mark, headline, sub-headline, live kWh rate widget, primary CTA |
| How it works section | Reduce friction by showing simplicity | Three numbered steps: 1) Tilmeld med MitID, 2) Godkend MobilePay-abonnement, 3) Få strøm til spotpris + lille tillæg |
| Pricing section | Justify the offer | Per-kWh markup (concrete number), monthly fee, weekly fee, worked annual example, "ingen binding" callout, CTA |
| Live rate widget | Demonstrate transparency | Current DKK/kWh including markup, timestamp, short explainer, optional 24h sparkline (nice-to-have) |
| Companion app teaser | Reassure on post-signup experience | Screenshot mockup, two-bullet feature list, app store badges (or "Coming soon") |
| FAQ section | Pre-empt common objections | 5–8 Q&A: switching providers, MitID, MobilePay, what energinet.dk is, what happens if I move, how to cancel |
| Footer | Legal + contact | Company name, CVR number, contact email, links to Terms, Privacy, Cookie policy |
| Terms page (`/handelsbetingelser`) | Legal | Full terms in Danish |
| Privacy policy page (`/privatlivspolitik`) | Legal | GDPR-compliant privacy notice in Danish |
| Cookie policy page (`/cookies`) | Legal | Cookie usage explanation |
| 404 page | Graceful fallback | Friendly Danish copy, link back to home |

## Design Guidance

- **Palette** — primarily light (white / off-white background) with green
  as the accent and CTA colour. A single fresh green hue (think Nordic /
  natural) for buttons, highlights, and live-rate emphasis. Dark text on
  light background; never green-on-green.
- **Typography** — modern sans-serif (e.g. Inter, Geist, or a Nordic-feel
  display font for headlines). Large, generous headline sizes; relaxed
  line-height for readability.
- **Layout** — single-column mobile, max two-column on desktop. Lots of
  whitespace. No carousels. Above-the-fold density is low; scroll is fine.
- **Latest web trends** — soft shadows, rounded corners (8–16px),
  subtle motion on scroll-in (no parallax circus), tasteful gradient
  accents on the hero. No skeuomorphism, no stock photography of
  power lines or light bulbs.
- **Conversion focus** — exactly one primary CTA colour and label
  ("Tilmeld dig"). Repeat the CTA at hero, after pricing, after FAQ, and
  sticky on mobile. Reduce form fields on the marketing site to zero.
- **Tone** — friendly, direct, Danish-pragmatic. No hype. Numbers over
  adjectives. "Du betaler spotprisen plus X øre/kWh. Det er det." beats
  "Revolutionary energy savings".
- **Trust signals** — CVR number visible, plain-language pricing, link to
  energinet.dk explanation, no dark patterns, no pre-ticked checkboxes.

## Error States

| Scenario | Expected Behaviour |
|---|---|
| Live price data unavailable (pricing service down or timing out) | Live rate widget shows fallback text "Aktuel pris hentes…" for up to 5 seconds, then falls back to "Prisen er midlertidigt utilgængelig — prøv igen om lidt". The rest of the page still renders. The CTA is unaffected. |
| Live price data is stale (last update > 1 hour ago) | The rate is shown with a muted "Opdateret kl. HH:MM" label and a small warning icon. The page does not block. |
| Signup service / Onboarding Flow URL unreachable | The CTA still renders. On click, if the destination returns an error, the user lands on a friendly fallback page with text "Tilmelding er midlertidigt nede. Prøv igen om et øjeblik, eller skriv til support@…" and a retry link. |
| JavaScript disabled in browser | Core content (value prop, pricing, terms, footer) renders via SSR/static HTML. The live-rate widget shows a "Aktiver JavaScript for at se den aktuelle pris" message. The CTA still works as a plain link. |
| User on an unsupported old browser | A non-blocking banner suggests upgrading; site still renders. |
| 404 (unknown URL) | Custom 404 page in Danish with link back to home and to signup. |
| Analytics service down | Page rendering and CTA are unaffected; analytics fails silently. |

## Non-Functional Requirements

- **Performance** — Largest Contentful Paint under 2.5 s on 4G; Time to
  Interactive under 3 s; total transferred page weight under 500 KB
  (excluding the optional sparkline).
- **Accessibility** — WCAG 2.1 AA. Lighthouse a11y score >= 95. Full
  keyboard navigation. All images have Danish alt text.
- **SEO** — Server-rendered HTML for all marketing content. Meta tags,
  Open Graph, structured data (Organization, Product/Offer where applicable).
- **Privacy / GDPR** — Privacy-respecting analytics that does not require
  cookie consent if possible. If consent is needed, banner is minimal and
  defaults to "no tracking" until accepted.
- **Browser support** — Latest two versions of Chrome, Safari, Firefox,
  Edge. Mobile Safari and Chrome Android.
- **Availability** — 99.9% uptime target for the marketing site itself.
  The site must remain readable even if the live-pricing service is down.
- **Localisation** — Danish (da-DK) only in v1. Numbers, currency, dates
  formatted to da-DK conventions.

## Open Questions

1. **Exact markup amount** — Owner: Product / Commercial. Default assumption:
   the spec uses a placeholder; the live number must be locked before launch.
2. **Subscription fee amounts (weekly and monthly)** — Owner: Product /
   Commercial. Default assumption: placeholder copy until set.
3. **Is there any binding period?** — Owner: Legal / Product. Default
   assumption: "ingen binding" (no binding period). Confirm before publishing.
4. **Companion app store availability at launch** — Owner: App team.
   Default assumption: "Coming soon" badges if not yet published.
5. **Analytics vendor choice** — Owner: Engineering. Default assumption:
   Plausible (cookie-less, GDPR-friendly).
6. **Hosting choice** — Owner: Engineering. Default assumption: Vercel or
   Netlify for ease of deploy.
7. **Is the Onboarding Flow a separate domain / subdomain or a path on the
   marketing domain?** — Owner: Engineering / Architecture. Default
   assumption: same domain, `/signup` path.
8. **Should we show a 24-hour spot-price sparkline in the hero?** — Owner:
   Design / Product. Default assumption: defer to v1.1; ship v1 with just
   the current number.
9. **Postal-code-based price estimate** — Owner: Product. Default
   assumption: out of scope for v1; revisit in v2.
10. **English-language version** — Owner: Product. Default assumption:
    Danish-only at launch.
11. **CVR number and legal entity name to display in footer** — Owner:
    Founders / Legal. Default assumption: placeholder until incorporated.
12. **FAQ content** — Owner: Product / Support. Default assumption: the
    spec writer drafts a starter set; product owner reviews before launch.

## Resolved Decisions

| Question | Decision |
|---|---|
| Should the marketing site collect any signup data itself? | No — every form field lives inside the Onboarding Flow. Marketing Site has zero forms apart from the CTA link. |
| Should the marketing site call energinet.dk directly? | No — it consumes the internal pricing service that already wraps energinet.dk plus markup. |
| Primary language at launch | Danish only. |
| Should signup require account creation on the marketing site? | No — identity is established via MitID inside Onboarding. |
| Payment capture on the marketing site? | No — MobilePay subscription is captured in Onboarding. |
| Mobile vs desktop priority | Mobile-first; desktop must still look great. |
| Number of primary CTAs | One label, one colour, repeated. No competing CTAs. |
