# Specification: Companion iOS App

**Feature:** The Cheap Power Company — Companion iOS App
**Status:** Draft v1
**Last updated:** 2026-04-29
**Audience:** iOS architect, iOS implementers, backend integrators, QA

---

## 1. Overview

The Companion iOS App is the primary customer-facing surface of The Cheap Power
Company. It is the sole channel through which Danish residential electricity
customers sign up, see their current spot-indexed kWh price, monitor their
ongoing bill, manage their MobilePay subscription, and view their hourly
consumption. Authentication is MitID (Denmark's national digital identity);
billing runs through the Vipps MobilePay Recurring API; consumption data
comes from Eloverblik via customer-granted third-party consent.

The app is intentionally minimal. Its job is to make a usage-based,
spot-indexed product feel obvious, trustworthy, and effortless — not to
provide an energy management platform. v1 ships in Danish only, for iPhone,
and excludes optimisation features such as EV-charging schedules.

---

## 2. Goals

The app must achieve three things, in priority order:

1. **Clarity.** A customer opening the app can answer, in under 5 seconds and
   without scrolling: "What am I paying per kWh right now?" and "How much do
   I owe so far this period?"
2. **Simplicity.** Sign-up to first MobilePay charge requires no help text, no
   support call, and no more than 6 taps after the MitID flow completes.
3. **Trust.** Every figure shown can be traced to a transparent source
   (spot price + tariffs + tax + margin). No marketing copy, no upsell
   modals, no dark patterns. Cancel-subscription is two taps from the home
   screen.

Each goal is independently verifiable through the acceptance criteria in
section 5.

---

## 3. Out of Scope (v1)

Explicitly excluded from v1:

- **English-language UI.** Danish only. Localisation infrastructure must be
  in place but no `en.lproj` ships.
- **iPad layout.** App runs on iPad in iPhone-compat mode but no adaptive
  layout work is done.
- **watchOS companion.**
- **Home Screen widgets and Lock Screen widgets.**
- **Live Activities** (Dynamic Island for the current price).
- **Apple Pay or card billing fallback.** MobilePay only in v1.
   Betalingsservice fallback is deferred to v2.
- **EV / heat-pump optimisation features**, smart-charging schedules,
  consumption forecasts.
- **Multi-metering-point households** (e.g., summerhouse + primary
  residence). Single metering point per account in v1.
- **Business customers (CVR / MitID Erhverv).** Private individuals only.
- **Push-to-pay or one-off charges.** Recurring agreement only.
- **In-app customer support chat.** Mailto link to support is sufficient.
- **Dark mode polish.** App must function in dark mode but visual tuning
  beyond automatic SwiftUI behaviour is out of scope.

---

## 4. Technical Context

| Decision | Choice | Rationale |
|---|---|---|
| Platform | iOS native, iPhone | Required by MitID iOS app-switch flow; matches design ambition (liquid glass) |
| Minimum OS | iOS 15.0 | Lowest version supported by MitID broker iOS guidance; covers >97% of active iPhones in DK |
| UI framework | SwiftUI | Required for liquid-glass aesthetic; matches modern iOS patterns |
| Auth in-app browser | `ASWebAuthenticationSession` | Required by MitID broker; `WKWebView` and `UIWebView` are explicitly forbidden |
| OIDC client library | AppAuth-iOS | Recommended by Signicat; handles PKCE, discovery, token exchange |
| MitID broker | Signicat | Per `mitid-research.md` recommendation — best English docs, free sandbox |
| MitID app-switch | `idp_params` with `enable_app_switch: true`, `app_switch_os: "ios"`, `app_switch_url: <Universal Link>` | Required to trigger the app-switch flow on iOS |
| Universal Links | Required, registered with broker before production | Enables return-to-app after MitID app authentication |
| Billing | Vipps MobilePay Recurring API v3, `pricing.type = "VARIABLE"` | Required for usage-based billing; old MobilePay Subscriptions API is end-of-life |
| Billing intervals exposed to customer | Weekly (`{unit: "WEEK", count: 1}`) and Monthly (`{unit: "MONTH", count: 1}`) | Per system description |
| Spot-price source | Energi Data Service API (`Elspotprices` dataset), via TCPC backend | Free, open, CC BY 4.0; once-daily update cadence after ~13:00 CET |
| Consumption source | Eloverblik Third-Party API, via TCPC backend | Hourly kWh per metering point; requires customer consent |
| Network calls from app | All to TCPC backend, never directly to MobilePay/Eloverblik/Energinet | Backend holds API keys, JWT refresh tokens, and the Recurring API merchant credentials |
| Auth-token storage on device | Keychain, `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` | Standard iOS practice for OAuth refresh tokens |
| Push notifications | APNs via TCPC backend | Required for payment confirmations and failures |
| Currency display | DKK with kWh prices in **øre/kWh** | øre is the natural unit for retail electricity in Denmark |
| Price areas | DK1 (West) and DK2 (East) | Determined per-customer from their metering-point address |

---

## 5. Screens and User Stories

### 5.1 Login / MitID Authentication

**US-01 — First-time MitID sign-in**
> As a new customer, I want to authenticate with MitID so that the app can
> verify my Danish identity and link a customer record.

**Acceptance criteria:**
- The first screen on a fresh install shows the TCPC logo, a single
  "Log ind med MitID" button, and one line of marketing copy. Nothing else
  is interactive.
- Tapping "Log ind med MitID" opens an `ASWebAuthenticationSession` to the
  Signicat authorize endpoint with PKCE, `scope=openid profile nin`, and an
  `idp_params` query parameter containing `{"mitid":{"enable_app_switch":true,"app_switch_os":"ios","app_switch_url":"<universal link>"}}`.
- If the MitID app is installed, the system app-switches to it. If not, the
  Signicat-hosted browser flow is shown inside the auth session.
- On successful authentication, control returns to TCPC via Universal Link;
  the auth session closes; AppAuth-iOS exchanges the authorization code for
  tokens at the Signicat token endpoint.
- The app then calls the TCPC backend `POST /v1/auth/session` with the
  ID token. The backend returns a TCPC session token (stored in Keychain)
  and a flag indicating whether the user has completed onboarding.
- New users are routed to the Onboarding flow (sign agreement, set up
  MobilePay, grant Eloverblik consent). Returning users go straight to Home.
- Total time from "Log ind med MitID" tap to Home screen for a returning
  user with the MitID app installed: target under 15 seconds on a standard
  4G connection.

**US-02 — Returning sign-in / session expiry**
> As a returning customer, I want my session to persist so that I do not
> need to MitID-authenticate every time I open the app.

**Acceptance criteria:**
- TCPC session tokens are refreshed silently using the OAuth refresh token
  on app launch.
- If the refresh token is expired or revoked, the user is returned to the
  MitID Login screen with no error modal — the screen simply appears.
- Sessions remain valid for a minimum of 30 days of inactivity.

---

### 5.2 Home / Dashboard

**US-03 — See the current rate and current bill at a glance**
> As a customer, I want to open the app and immediately see my current
> price per kWh and how much I owe this period, so that I know whether I
> am winning today.

**Acceptance criteria:**
- Home is the first screen shown after authentication.
- Three pieces of information are visible without scrolling on a 6.1"
  iPhone screen:
  1. **Current price** — large numeric display of the current hour's
     all-in price in **øre/kWh**, with the unit visible below the
     number.
  2. **This period's bill so far** — DKK total accrued since the start
     of the current billing period (week or month, per the customer's
     subscription setting).
  3. **Next payment** — the date of the next scheduled MobilePay charge
     and its currently-projected amount.
- The current price tile colour-codes against a rolling 7-day average:
  green if below average, neutral if within ±10%, amber if above.
  No red — anxiety colours are avoided by design.
- Pull-to-refresh re-fetches all three numbers from the TCPC backend.
- A tap on the price tile navigates to Price Detail (5.3).
- A tap on the bill tile navigates to Consumption (5.4).
- A "last updated" timestamp is shown at the bottom of the screen,
  formatted as "Opdateret kl. HH:mm".

**US-04 — Stale data on Home**
> As a customer, I want the app to tell me when the displayed numbers may
> be out of date so that I do not make decisions based on stale data.

**Acceptance criteria:**
- If the most recent price data is more than 90 minutes old (relative to
  the current hour boundary), the price tile shows a small grey
  "Prisdata kan være forsinket" caption.
- If consumption data from Eloverblik is more than 36 hours behind the
  current hour, the bill tile shows "Forbrug opdateres med op til 1 dags
  forsinkelse".
- These captions never block the screen with a modal.

---

### 5.3 Price Detail

**US-05 — See today's hourly price curve**
> As a customer, I want to see how the price per kWh changes hour-by-hour
> today and tomorrow so that I can shift heavy usage to cheap hours.

**Acceptance criteria:**
- Screen shows a vertical bar chart (one bar per hour) covering today
  00:00–23:59. After Nord Pool publishes (~13:00 CET), an additional
  segmented control unlocks tomorrow's prices.
- Each bar is annotated with its all-in price in øre/kWh on hover/long-press;
  the current hour bar is highlighted.
- The chart's y-axis is in øre/kWh and starts at 0.
- A small label at the top of the screen indicates the customer's price
  area: "Prisområde: DK1" or "Prisområde: DK2", with a tappable info icon
  explaining the West/East Denmark split.
- Below the chart: today's lowest hour, highest hour, and average,
  expressed as "Billigst kl. HH–HH (NN øre/kWh)".
- Data is fetched from `GET /v1/prices/today` and `GET /v1/prices/tomorrow`
  on the TCPC backend (which proxies the Energi Data Service `Elspotprices`
  dataset and adds tariffs + elafgift + VAT + margin to produce the
  all-in price the customer actually pays).

**US-06 — Tomorrow's prices not yet available**
> As a customer browsing before 13:00 CET, I want a clear explanation of
> why tomorrow's prices are missing, not an error.

**Acceptance criteria:**
- Before tomorrow's prices have been published, the "I morgen" tab is
  visible but disabled, with the caption "Morgendagens priser offentliggøres
  efter kl. 13".

---

### 5.4 Consumption

**US-07 — See my hourly kWh usage and what it cost**
> As a customer, I want to see my actual hourly electricity usage and the
> cost it generated so that I understand my bill.

**Acceptance criteria:**
- Default view: current billing period (week or month, per subscription
  setting). A segmented control switches between "Denne periode" and
  "Sidste periode".
- Top of screen shows total kWh used and total DKK cost for the selected
  period.
- Below: a stacked horizontal cost-breakdown bar showing the proportion
  of the bill spent on (in this order): spot price, network tariff,
  Energinet system tariffs, elafgift, VAT, TCPC margin. Each segment is
  tappable to reveal its DKK value.
- Below the breakdown: a daily-usage bar chart of kWh per day for the
  selected period.
- Data is fetched from `GET /v1/consumption?from=...&to=...` on the
  TCPC backend (which calls the Eloverblik Third-Party API
  `POST /api/meterdata/gettimeseries/{from}/{to}/Hour` server-side).

**US-08 — No Eloverblik consent yet**
> As a new customer who has not yet authorised meter-data access, I want
> the app to clearly tell me what is missing and how to fix it.

**Acceptance criteria:**
- If the backend returns "no consent" for the customer's metering point,
  Consumption shows an empty state with one heading
  ("Vi mangler adgang til dit forbrug"), one paragraph of explanation,
  and one button ("Giv adgang via Eloverblik") that opens the
  Eloverblik consent flow in `ASWebAuthenticationSession`.
- Once consent is granted, the next backend response populates
  Consumption normally; the user is not asked to re-authenticate.

---

### 5.5 Account / Settings

**US-09 — View my account details**
> As a customer, I want to see the personal details and metering-point
> details on file so that I can verify what TCPC knows about me.

**Acceptance criteria:**
- Account screen shows: full name (from MitID `name` claim), home
  address (from metering-point master data), metering point ID
  (anonymised — last 4 digits visible, rest dotted), price area
  (DK1/DK2), and account creation date.
- None of these fields are editable in v1. Address changes route to a
  mailto support link.

**US-10 — Change billing frequency between weekly and monthly**
> As a customer, I want to switch between weekly and monthly billing so
> that I can match my cash-flow preference.

**Acceptance criteria:**
- A "Faktureringsinterval" row shows the current setting (Ugentligt or
  Månedligt) with a chevron.
- Tapping opens a sheet with two options. Selecting the new option calls
  `PATCH /v1/subscription/interval` on the backend, which calls
  `PATCH /recurring/v3/agreements/{id}` on Vipps with the new
  `interval` object.
- The change takes effect from the next billing period; the current
  in-progress period is finalised under the previous interval.
- A confirmation is shown: "Ændret. Træder i kraft fra næste periode."

**US-11 — Manage MobilePay subscription**
> As a customer, I want to see the status of my MobilePay agreement and
> stop it if I want to cancel.

**Acceptance criteria:**
- Account shows a "MobilePay-abonnement" section with: current status
  (`PENDING` / `ACTIVE` / `STOPPED`), `maxAmount` (the customer's chosen
  monthly ceiling, in DKK), and `suggestMaxAmount` (the recommended
  ceiling) for context.
- A "Skift maksbeløb" row deep-links to the MobilePay app's agreement
  management screen using the `vippsConfirmationUrl` pattern. (Customer
  changes maxAmount in the MobilePay app, not in our app.)
- A "Stop abonnement" row, after a confirmation sheet (see Error States),
  calls `PATCH /v1/subscription` with `{status: "STOPPED"}`. Backend
  patches the Vipps agreement to STOPPED.
- Once STOPPED is confirmed (via the
  `recurring.agreement-stopped.v1` webhook on the backend), the app's
  Home screen shows a banner "Dit abonnement er stoppet — kontakt os for
  at genstarte" and most actions are disabled.

**US-12 — Sign out**
> As a customer, I want to sign out so that the app no longer holds my
> session if I lend my phone.

**Acceptance criteria:**
- A "Log ud" row clears the Keychain session token, revokes the
  refresh token via the backend (`POST /v1/auth/logout`), and returns
  to the Login screen.

---

### 5.6 Notifications

**US-13 — Push notification permission**
> As a new customer, I want to be asked once for notification permission
> at the right moment so that I receive payment confirmations.

**Acceptance criteria:**
- The notification-permission prompt is requested **after** the
  MobilePay subscription is activated, not at app launch.
- An in-app pre-prompt screen explains what notifications will be used
  for ("Bekræftelse på betalinger og varsler om mislykkede betalinger")
  before the system prompt is shown.
- If the user denies, the app continues to work; an info banner in
  Account explains how to enable later.

**US-14 — Receive a payment confirmation**
> As a customer, I want a push notification confirming that a charge
> has been collected so that I know the payment went through.

**Acceptance criteria:**
- On `recurring.charge-captured.v1` webhook arrival on the backend, a
  push is sent: title "Betaling gennemført", body "NN,NN kr. trukket
  for [periode]." Tapping opens the app to a receipt view inside
  Account.
- If the app is open, an in-app toast is shown instead of a system
  notification.

**US-15 — Receive a payment-failure notification**
> As a customer, I want to be told immediately if a charge fails so that
> I can fix it before service is affected.

**Acceptance criteria:**
- On `recurring.charge-failed.v1` webhook arrival on the backend, a
  push is sent: title "Betaling mislykkedes", body "Vi kunne ikke trække
  NN,NN kr. Tjek dit MobilePay-maksbeløb." Tapping opens the app to a
  troubleshooting view explaining maxAmount and offering a deep-link
  to MobilePay.

**US-16 — Price-alert notifications (opt-in)**
> As a customer, I want to optionally receive a push notification when
> tomorrow's prices are unusually cheap or expensive so that I can plan.

**Acceptance criteria:**
- Account contains a "Prisvarsler" toggle, default off.
- When on, the backend sends a single daily push at ~13:30 CET if the
  next day's average price is more than ±20% from the trailing 14-day
  average. Body: "I morgen er strømmen N% billigere end normalt" or
  "...dyrere end normalt".
- Toggling off stops further alerts within 24 hours.

---

## 6. Authentication Flow

The MitID iOS flow, step by step:

1. App launches the Login screen.
2. User taps "Log ind med MitID".
3. App generates a PKCE `code_verifier` and `code_challenge`. AppAuth-iOS
   builds the authorization URL using Signicat's discovery endpoint
   (`https://<tenant>.signicat.com/auth/open/.well-known/openid-configuration`).
4. The authorization URL includes:
   - `client_id` (TCPC's Signicat client ID)
   - `redirect_uri` (TCPC Universal Link, e.g.
     `https://app.cheappower.dk/oauth/callback`)
   - `response_type=code`
   - `scope=openid profile nin`
   - `code_challenge` and `code_challenge_method=S256`
   - `idp_params` (URL-encoded JSON):
     `{"mitid":{"enable_app_switch":true,"app_switch_os":"ios","app_switch_url":"https://app.cheappower.dk/oauth/callback"}}`
5. The app opens this URL in `ASWebAuthenticationSession` with
   `prefersEphemeralWebBrowserSession = false` (so cookies persist for
   silent re-auth).
6. The Signicat-hosted page detects the app-switch parameters and
   redirects into the MitID app via its registered URL scheme.
7. The user authenticates in the MitID app (PIN + biometric).
8. The MitID app returns control to Signicat, which performs the OIDC
   redirect back to the TCPC Universal Link with `?code=...&state=...`.
9. iOS routes the Universal Link to the TCPC app; the
   `ASWebAuthenticationSession` callback fires with the redirect URL.
10. AppAuth-iOS exchanges the authorization code for an ID token, access
    token, and refresh token at Signicat's token endpoint.
11. The app posts the ID token to the TCPC backend
    (`POST /v1/auth/session`) which validates the signature against
    Signicat's JWKS, extracts `sub`, `mitid.uuid`, `name`, `birthdate`,
    `nin` (where applicable), and either creates a new TCPC customer
    record or returns an existing one. The backend returns its own
    session token (signed JWT) and a refresh token.
12. The app stores both tokens in the Keychain
    (`kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`) and routes the
    user to Home (returning user) or Onboarding (new user).

**Failure handling:** see Error States section.

**Logout:** `POST /v1/auth/logout` revokes the refresh token. The Signicat
session cookie persists in `ASWebAuthenticationSession` so MitID is not
re-prompted unnecessarily on next sign-in unless explicitly cleared.

---

## 7. Data Sources

The app **never** calls Eloverblik, Energinet, Signicat token endpoints,
or Vipps MobilePay directly from the device, with one exception:
`ASWebAuthenticationSession` for MitID and Eloverblik consent flows.
All other data is mediated by the TCPC backend.

| Data | Origin | Backend route exposed to app | Fresh-by |
|---|---|---|---|
| Spot prices (DK1, DK2, hourly) | Energi Data Service `Elspotprices` dataset | `GET /v1/prices/today`, `GET /v1/prices/tomorrow` | Backend cron at ~13:15 CET daily |
| All-in customer price per kWh | Backend computes spot + network tariff (DSO) + Energinet system tariff + elafgift + VAT + TCPC margin | `GET /v1/prices/current` | Re-evaluated hourly |
| Hourly consumption (kWh) | Eloverblik Third-Party API `POST /api/meterdata/gettimeseries/{from}/{to}/Hour` | `GET /v1/consumption?from=&to=` | Eloverblik publishes with up to ~24h delay |
| Charges (cost components per metering point) | Eloverblik Third-Party API `POST /api/meterdata/getcharges` | Embedded in `GET /v1/consumption` | Daily |
| Subscription / agreement state | Vipps MobilePay Recurring API `GET /recurring/v3/agreements/{id}` | `GET /v1/subscription` | Backend caches 60s; refreshed on webhook events |
| Charge history | Vipps MobilePay Recurring API `GET /recurring/v3/agreements/{id}/charges` | `GET /v1/charges` | Refreshed on webhook events |
| Customer master data (name, address, MP ID) | TCPC backend (own database, sourced from MitID + DataHub) | `GET /v1/customer` | On demand |
| Push token | App registers with APNs, posts to `POST /v1/devices` | — | Re-posted on token rotation |

**Eloverblik consent:** the customer-granted refresh token (1-year) is held
by the backend and exchanged for a 24-hour JWT data-access token as needed.
The app never sees these tokens.

**Webhook ingestion:** The backend subscribes to Vipps webhook events
(`recurring.charge-captured.v1`, `recurring.charge-failed.v1`,
`recurring.agreement-accepted.v1`, `recurring.agreement-stopped.v1`,
`recurring.agreement-expired.v1`) and pushes notifications to the app via
APNs.

---

## 8. Design Guidance

The app follows a "liquid glass" aesthetic in the iOS 26+ visual idiom,
adapted gracefully to iOS 15.

**Palette**
- Primary brand: a single saturated leaf-green (`#2EBE6A` working value;
  final swatch chosen during design).
- Background: light, soft off-white with subtle vertical gradient.
- Glass surfaces: translucent panels using `Material.regular` /
  `Material.thin` with the green tint behind for subtle warmth.
- Accent: a muted gold for the "below average" indicator on the price
  tile.
- No reds in v1.

**Typography**
- SF Pro (system). Numerals use SF Pro Rounded for the large price and
  bill displays — friendly, less clinical.
- Price-tile number is at least 64pt at default Dynamic Type, scaling
  with `.dynamicTypeSize(...DynamicTypeSize.accessibility3)` permitted.
- All other body copy uses standard `.body`, `.headline`, `.caption`
  text styles to inherit Dynamic Type behaviour.

**Layout principles**
- Ultra-minimal chrome. No tab bar visual noise — use `TabView` with the
  iOS 17+ refined translucent style (Home, Forbrug, Konto). Three tabs
  total.
- One screen, one job. Home is dashboard only; nothing on Home is
  primary-action eligible except "open detail".
- Rounded-rectangle cards (corner radius 24pt) with subtle inner
  highlight to evoke glass.
- Thin separators only — never heavy borders.
- Charts use SwiftUI Charts (`Charts` framework), iOS 16+ — for iOS 15
  fallback, render bars manually with simple `Rectangle` views.

**Motion**
- Subtle spring transitions on tab switches and tile taps (< 350 ms).
- Pull-to-refresh uses a custom liquid-bead animation.
- **Reduce Motion fallback:** when
  `UIAccessibility.isReduceMotionEnabled`, all animations collapse to
  cross-fades; no parallax or scaling.

**Imagery**
- No stock photography. No human faces. The product is the data.
- One illustration only: a stylised line drawing of Denmark used in the
  Login screen background, faded.

**Tone of voice**
- Danish, second person ("du"), short sentences.
- No marketing superlatives ("billigste!", "fantastisk!").
- Numbers always before adjectives. ("12 øre/kWh" before "billigt").

---

## 9. Error States

| Scenario | Expected Behaviour |
|---|---|
| No network on app launch | App falls back to last cached values for Home (price, bill, next payment); a small offline pill appears at top: "Offline — viser senest hentede tal". Pull-to-refresh attempts to reconnect. No modal. |
| No network during MitID auth | `ASWebAuthenticationSession` times out. App shows an inline message on the Login screen: "Kunne ikke kontakte MitID. Tjek din forbindelse og prøv igen." Single retry button. No technical error code shown. |
| MitID user cancels in the MitID app | App returns to Login screen with no error — cancellation is not a failure. |
| MitID auth genuinely fails (e.g., signature invalid, broker rejects) | Login screen shows "Login mislykkedes. Prøv igen, eller kontakt support." with a "Kontakt support" mailto link. Failure is logged to backend with a correlation ID; correlation ID is shown in small grey type. |
| Price data older than 90 minutes | Home price tile shows "Prisdata kan være forsinket" caption. Price still shown. No modal. |
| Price data older than 24 hours (catastrophic) | Home price tile dims, shows "—" instead of a number, with caption "Prisdata utilgængelige. Vi arbejder på det." Bill tile and Next-payment tile remain visible. |
| Eloverblik consent not granted | Consumption screen shows the empty state described in US-08. Home bill tile still works using the latest backend-computed estimate; if no estimate is available, the bill tile shows "—" with caption "Vi henter snart dine forbrugstal." |
| Eloverblik token revoked / consent withdrawn | Backend detects on next refresh; app receives `consentRevoked: true` flag in `GET /v1/customer`. Consumption screen reverts to the empty state with copy "Din adgang til Eloverblik er udløbet. Forny den her." |
| MobilePay charge failed (`recurring.charge-failed.v1`) | Push notification (US-15). On next app open, a non-dismissable banner appears at the top of Home: "Seneste betaling mislykkedes. Tryk for at rette." Tapping opens the troubleshooting view. Banner clears when the next charge succeeds. |
| MobilePay agreement expired or stopped | Banner on Home: "Dit abonnement er stoppet. Kontakt support for at genstarte." Most actions disabled (no consumption refresh, no price alerts toggling). |
| Stop subscription — confirmation | "Stop abonnement" tap shows a confirmation sheet with title "Stop abonnement?", body "Du betaler det resterende beløb for indeværende periode. Derefter stopper aftrykket. Du kan altid komme tilbage.", primary action "Stop", secondary "Behold". |
| Backend returns 401 (token expired/invalid) | App attempts silent refresh once. If that fails, user is silently routed to Login. No modal. |
| Backend returns 5xx | App shows the previously-cached value with a small grey "Kunne ikke opdatere lige nu" caption. Retries with exponential backoff (capped at 30s). |
| Push permission denied | Account screen shows banner "Du modtager ikke betalingsbekræftelser. Slå dem til i Indstillinger." with a button to deep-link to iOS Settings. |
| App version below minimum supported (forced upgrade) | Backend returns a 426 with `minVersion` field. App shows a full-screen "Opdatér appen" view with a single "Hent opdatering" button linking to App Store. No bypass. |

---

## 10. Non-Functional Requirements

**Latency budgets** (90th percentile, standard 4G in Copenhagen)
- App launch (cached session) to Home rendered with cached data: under 1.5s.
- Pull-to-refresh on Home to refreshed data: under 2.0s.
- MitID flow start to Home (returning user): under 15s end-to-end.
- Price Detail screen render with cached data: under 800 ms.

**Offline behaviour**
- All Home tiles must render last-known values when offline.
- Consumption screen renders the most-recent fetched period from local
  cache when offline.
- Price Detail renders today's curve from cache when offline; tomorrow's
  is hidden if not cached.
- The app never shows a full-screen "no internet" error — it degrades
  gracefully.

**Push notifications**
- All push payloads must be backend-routed through APNs. Silent /
  background pushes are used to refresh the local cache after webhook
  events.
- The badge count is used only for unread payment-failure events.

**Accessibility**
- Full Dynamic Type support up to `accessibility3`. All numeric displays
  remain on-screen (with truncation rules) at the largest size.
- VoiceOver: every tile, chart bar, and button has a meaningful
  `accessibilityLabel`. Charts expose values through the iOS 16+
  `accessibilityChartDescriptor` API where available; iOS 15 falls back
  to a hidden text summary.
- Minimum tappable target 44x44pt.
- Colour contrast meets WCAG 2.1 AA against both light and dark
  backgrounds. The price-tile colour-coding never relies on colour
  alone — it is paired with an arrow icon (▲ / ▼ / —).
- Reduce Motion fully respected (see section 8).
- Reduce Transparency: when enabled, glass surfaces become solid
  near-white panels.

**Privacy**
- No analytics SDKs in v1. App-level event logging goes only to the TCPC
  backend, keyed by customer ID.
- No third-party tracking pixels.
- App Privacy nutrition labels declare: identifiers (linked), financial
  info (linked), usage data (linked).
- Crash reporting via Apple's `MetricKit` + on-device aggregation only.
  No Firebase, no Sentry in v1.

**Localisation**
- Danish (`da-DK`) only in v1. All strings live in `.strings` files
  ready for English in v2. No hard-coded user-visible strings in code.

**Security**
- Refresh tokens stored in Keychain, never UserDefaults.
- TLS 1.2+ for all backend traffic, with certificate pinning to the
  TCPC backend's leaf certificate (rotated yearly).
- App Transport Security strict; no exceptions.
- Jailbreak-detection is **not** required in v1.

**Availability**
- The app must be functionally usable (Home renders cached data) when
  the TCPC backend is unreachable.
- Critical API failures are logged with a correlation ID surfaced to the
  user only when the user explicitly contacts support.

---

## 11. Open Questions

1. **watchOS companion** — Should v1.x include an Apple Watch
   complication for the current price? Owner: Product. Default
   assumption: not in v1, deferred to v1.2.
2. **Home Screen widget** — Same question for a small/medium widget
   showing current price + today's average. Owner: Product. Default
   assumption: not in v1, strongly desired for v1.1.
3. **English-language version** — When does the English UI ship for
   non-Danish-speaking residents? Owner: Product. Default assumption:
   v2 alongside Betalingsservice fallback.
4. **iPad layout** — Is iPhone-compat mode acceptable indefinitely, or
   is a native iPad layout planned? Owner: Design. Default assumption:
   iPhone-compat is fine for v1; revisit if iPad usage exceeds 5%.
5. **Live Activities for current price** — Worth the platform risk in
   v1? Owner: Engineering. Default assumption: defer to v1.2.
6. **Whether the app should display the elafgift line item at all
   after Jan 2026** — at ~1 øre/kWh it may add visual noise without
   information. Owner: Product. Default assumption: keep it visible for
   transparency.
7. **Eloverblik consent UX** — does the broker offer a delegated MitID
   flow we can re-use, or must the customer authenticate at
   eloverblik.dk separately? (Linked to mitid-research.md OQ#3.) Owner:
   Backend lead. Default assumption: separate Eloverblik flow,
   surfaced in `ASWebAuthenticationSession`.
8. **Price-area determination** — DK1 vs DK2 is determined by metering
   point. What does the app show in the brief window during onboarding
   before metering data is available? Owner: Backend lead. Default
   assumption: hide Home price tile, show "Vi henter dine data" until
   data arrives.
9. **Maximum amount default** — what `suggestMaxAmount` does the
   backend pass to Vipps for new agreements? (Linked to
   mobilepay-research.md OQ#2.) Owner: Product + Finance. Default
   assumption: 5,000 DKK to cover winter peaks for an average
   household.
10. **Push notification copy** — the strings in section 5.6 are
    drafts. Owner: Marketing/Copy. Default assumption: ship with the
    drafts.
11. **Onboarding flow detail** — this spec covers screens after
    Onboarding completes. The full Onboarding sequence
    (sign-agreement, choose-interval, MobilePay-agreement creation,
    Eloverblik-consent) needs its own sub-spec. Owner: Product.
    Default assumption: separate Onboarding spec to follow.

---

## 12. Resolved Decisions

| Question | Decision |
|---|---|
| OAuth library on iOS | AppAuth-iOS (per Signicat's recommendation in mitid-research.md) |
| In-app browser type | `ASWebAuthenticationSession`, not `SFSafariViewController`, because it offers cleaner cookie isolation per session and is supported by AppAuth-iOS out of the box |
| Webview prohibition | `WKWebView` is forbidden for MitID per Signicat — confirmed |
| Old MobilePay Subscriptions API | Will not be used — end-of-life as of March 2024. v3 Recurring API only |
| Pricing model | Variable (`pricing.type = "VARIABLE"`) — required to bill actual usage |
| Spot-price source | Energi Data Service (free, CC BY 4.0) — no commercial Nord Pool feed in v1 |
| Customer tokens for Eloverblik | Backend holds and refreshes them. App never sees them |
| Direct calls from device to MobilePay or Eloverblik | Disallowed. Only backend mediates these |
| Currency unit on the price tile | øre/kWh (not DKK/kWh) — matches Danish retail convention |
| App language at launch | Danish only |
| Minimum iOS version | 15.0 — aligns with MitID broker iOS requirements |
| MitID broker | Signicat (sandbox-first; final production broker confirmed in commercial track) |
| Webhook strategy | Backend ingests Vipps webhooks and translates to APNs pushes. App does not poll for billing status |
| Cancellation tap depth from Home | Two taps (Account → Stop abonnement) — explicit goal |
| Red colour use | Not used in v1 — design decision |
