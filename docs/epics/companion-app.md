# Implementation Epics: Companion iOS App

**Source spec:** `docs/specifications/companion-app.md` (Draft v1, 2026-04-29)
**Architecture reference:** `docs/specifications/ADR-001-system-architecture.md` (PROPOSED, 2026-04-29)
**Audience:** iOS architect, iOS implementers, QA, project lead
**Last updated:** 2026-04-29

---

## How to read this document

The work of building the Companion iOS App is split into nine epics. Each
epic has a goal, a list of dependencies on other epics, and a series of
tasks. Each task is sized to be completable by one engineer in 1–3
working days, and carries:

- **Description** — what the task delivers in plain language.
- **Acceptance criteria** — observable, testable checklist items.
- **Definition of done** — process gates (tests, review, merge, etc).
- **Spec coverage** — the user story or section of the spec the task
  satisfies.

Epics are listed in implementation order. Where epics overlap (e.g.
Accessibility & Polish runs across all UI work), this is noted in
dependencies.

**Architecture-binding correction reflected in this document:** ADR-001
section 6.1 (severity HIGH) requires that companion-app.md US-01 and
section 6 step 4 be revised so that returning-user MitID logins request
`scope=openid profile` (without `nin`). New-user signup continues to
request `scope=openid profile nin` to enable CPR Match. This correction
is reflected in Epic 2 task acceptance criteria. Implementers must
follow the ADR, not the unrevised spec text.

---

## Epic index

1. Project Setup & Architecture
2. Authentication — MitID Login
3. Home / Dashboard Screen
4. Price Detail Screen
5. Consumption Screen
6. Account & Settings Screen
7. Push Notifications
8. Accessibility & Polish
9. Error & Offline Handling

---

## Epic 1 — Project Setup & Architecture

**Goal:** Stand up a buildable, testable SwiftUI iOS app target with the
foundational infrastructure (dependencies, secure storage, network
layer, design system, CI) that all subsequent epics depend on. After
this epic, every other epic can begin implementation.

**Dependencies:** None. This is the entry point.

**Spec coverage:** Section 4 (Technical Context), Section 8 (Design
Guidance), Section 10 (Non-Functional Requirements — security,
localisation).

### Task 1.1 — Create the iOS app target

**Description:** Create a new SwiftUI iOS app target in the
TheCheapPowerCompany repository. Configure the target for iPhone only,
iOS 15.0 minimum deployment, Danish (`da-DK`) as the primary
development language with localisation infrastructure ready for English
in v2.

**Acceptance criteria:**
- [ ] Xcode project / Swift package builds and launches a "Hello, world"
      SwiftUI view on an iOS 15 simulator and on a physical iOS 17+ device.
- [ ] Bundle identifier follows `dk.cheappower.app` convention (final
      identifier confirmed with the team before TestFlight).
- [ ] Deployment target is iOS 15.0 in build settings.
- [ ] Device family is iPhone only; iPad runs in iPhone-compat mode.
- [ ] Development language is `da` (Danish); `Localizable.strings` file
      exists with at least one example key under `da.lproj/`.
- [ ] No hard-coded user-visible strings in the "Hello, world" view —
      the placeholder string is loaded via `String(localized:)`.
- [ ] App Transport Security is set strict; no exceptions in
      `Info.plist`.

**Definition of done:**
- Builds clean (no warnings) on the team's chosen Xcode version.
- Pushed to a feature branch and merged to `main` via PR with at least
  one reviewer.
- README in the iOS app folder explains how to build and run.

**Spec coverage:** Section 4 (Platform, Minimum OS, UI framework),
Section 10 (Localisation).

---

### Task 1.2 — Add AppAuth-iOS as a dependency

**Description:** Integrate AppAuth-iOS via Swift Package Manager. Verify
it can be imported and instantiated. No flow logic yet — that lands in
Epic 2.

**Acceptance criteria:**
- [ ] AppAuth-iOS is added via SPM, pinned to a specific minor version.
- [ ] `import AppAuth` compiles in a smoke-test file.
- [ ] An `OIDServiceDiscovery` instance can be constructed in a unit
      test against a mocked discovery JSON.
- [ ] License attribution for AppAuth-iOS is added to the in-app
      "About" / acknowledgements section (placeholder location is fine
      — Account screen finalises in Epic 6).

**Definition of done:**
- Dependency is committed to `Package.resolved`.
- A short `docs/ios-dependencies.md` (or equivalent) lists every
  third-party dependency with version and license.

**Spec coverage:** Section 4 (OIDC client library = AppAuth-iOS),
Section 12 (Resolved Decisions).

---

### Task 1.3 — Configure Universal Links entitlement

**Description:** Set up the Associated Domains entitlement to allow
incoming Universal Links to `https://app.cheappower.dk/oauth/callback`.
Coordinate with backend to publish the
`/.well-known/apple-app-site-association` JSON at the relevant
domain. Wire a `onOpenURL` handler stub that logs the incoming URL —
the real callback handling lands in Epic 2.

**Acceptance criteria:**
- [ ] `Associated Domains` capability is enabled with
      `applinks:app.cheappower.dk` in the entitlements file.
- [ ] Backend has a working `apple-app-site-association` file at
      `https://app.cheappower.dk/.well-known/apple-app-site-association`,
      content-type `application/json`, no extension.
- [ ] Tapping a test link `https://app.cheappower.dk/oauth/callback?code=test`
      from Apple Notes or Mail opens the TCPC app and triggers the
      `onOpenURL` log line.
- [ ] The same link continues to open Safari if the app is uninstalled.

**Definition of done:**
- Manual verification recorded in the PR description with screenshots
  of the link opening the app.
- Backend AASA endpoint is verified by `curl -I` in the PR
  description showing 200 and correct content-type.

**Spec coverage:** Section 4 (Universal Links required), Section 6 step 8.

---

### Task 1.4 — Build a Keychain wrapper

**Description:** Build a small, well-tested Keychain helper that stores
and retrieves opaque token strings under a fixed service identifier,
using `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`. Two slots:
TCPC session JWT and TCPC refresh token. The wrapper must support
delete-all for sign-out.

**Acceptance criteria:**
- [ ] `KeychainStore.shared.set(.sessionToken, value:)` writes the
      value with the correct accessibility attribute.
- [ ] `KeychainStore.shared.get(.sessionToken)` reads back the value;
      returns `nil` when absent.
- [ ] `KeychainStore.shared.deleteAll()` removes both slots.
- [ ] Unit tests cover write, read, overwrite, missing key, and
      delete-all.
- [ ] No token strings ever land in `UserDefaults` or
      `FileManager`-managed paths.
- [ ] The wrapper is a Swift `actor` or has explicit thread-safety
      documentation; concurrent access is safe.

**Definition of done:**
- Unit tests pass under `xcodebuild test`.
- Code review approved.
- Security checklist signed (no logging of token values, no token
  values in crash reports).

**Spec coverage:** Section 4 (Auth-token storage), Section 10 (Security).

---

### Task 1.5 — Build the network layer

**Description:** Build a `URLSession`-based async/await network client
that targets the TCPC backend. Features required: base-URL
configuration, JSON encoding/decoding, automatic attachment of the
TCPC session JWT to requests, certificate pinning to the TCPC backend
leaf certificate, structured error reporting, and a single
intercept point for handling 401 (silent refresh — implementation
lands in Epic 2) and 426 (forced upgrade — UI lands in Epic 9).

**Acceptance criteria:**
- [ ] `APIClient.shared.get<T: Decodable>(_ path: String) async throws -> T`
      compiles and works against a mocked URL protocol.
- [ ] Equivalent `post`, `patch` methods exist.
- [ ] Session JWT is read from Keychain and attached as
      `Authorization: Bearer <token>` when present.
- [ ] TLS 1.2 minimum is enforced.
- [ ] Certificate pinning pins the TCPC backend leaf certificate
      (development build pins the staging cert; release build pins
      production).
- [ ] On HTTP 401, the client throws a typed `.unauthorized` error
      with a stub hook for future silent refresh.
- [ ] On HTTP 426, the client throws a typed `.forceUpgrade(minVersion:)`
      error.
- [ ] On HTTP 5xx, the client throws a typed `.serverError(status:)`
      error and the call site is responsible for retry/backoff.
- [ ] All requests are logged with a correlation ID header
      (`X-Correlation-ID`) generated client-side per request.

**Definition of done:**
- Unit tests cover happy path, 401, 426, 5xx, and decoding failure.
- Integration smoke test runs against a staging backend health
  endpoint.
- Documentation section shows how to add a new endpoint.

**Spec coverage:** Section 4 (Network calls all to TCPC backend),
Section 7 (Data Sources), Section 10 (Security — TLS 1.2+,
certificate pinning).

---

### Task 1.6 — Author the design token file

**Description:** Create a single Swift file (`DesignTokens.swift` or
similar) that defines the colour palette, typography scale, spacing
units, and corner radii used by every screen. This file is the only
place these values are defined. No screen-level magic numbers.

**Acceptance criteria:**
- [ ] `DesignTokens.Colors` exposes: brand green (`#2EBE6A` working
      value), background, glass tint, accent gold, neutral grey scale.
      No red.
- [ ] `DesignTokens.Typography` exposes named text styles that map to
      `.body`, `.headline`, `.caption` etc. with optional `SF Pro
      Rounded` overrides for the large numeral display (price tile,
      bill tile).
- [ ] `DesignTokens.Spacing` exposes a 4pt-grid scale (4, 8, 12, 16,
      24, 32).
- [ ] `DesignTokens.Radii` exposes `.card = 24` and `.button = 12`.
- [ ] All tokens have inline comments referencing the spec section
      they implement.
- [ ] A `DesignTokenPreview` SwiftUI preview renders a sample card to
      visually confirm the tokens compose correctly.

**Definition of done:**
- Code review approved by the design lead (or designated reviewer).
- Preview screenshots attached to the PR.

**Spec coverage:** Section 8 (Design Guidance — Palette, Typography,
Layout principles).

---

### Task 1.7 — Set up the CI scheme

**Description:** Configure a GitHub Actions (or equivalent) CI pipeline
that builds the iOS app, runs unit tests, and runs SwiftLint on every
PR.

**Acceptance criteria:**
- [ ] CI runs on every PR to `main` and on every push to `main`.
- [ ] Pipeline steps: checkout, set up Xcode, resolve SPM
      dependencies, build, run unit tests on iOS 15 and iOS 17
      simulators, run SwiftLint.
- [ ] Pipeline fails the PR check on any test failure or SwiftLint
      error.
- [ ] CI run time for a clean PR is under 15 minutes.
- [ ] A status badge is added to the iOS app folder's README.

**Definition of done:**
- A test PR shows the CI status check passing.
- A test PR with an intentionally-broken test shows the CI status
  check failing.

**Spec coverage:** Implicit — supports Section 10 (Non-Functional
Requirements — quality bar).

---

## Epic 2 — Authentication: MitID Login

**Goal:** Customers can sign in with MitID via Signicat, the app
exchanges the authorization code for tokens, posts the ID token to the
TCPC backend, stores the resulting TCPC session JWT and refresh token
in Keychain, and renews the session silently on subsequent launches.

**Dependencies:** Epic 1 (all tasks).

**Spec coverage:** Section 5.1 (US-01, US-02), Section 6
(Authentication Flow), Section 9 (Error States — auth failures), ADR-001
section 6.1 (scope correction).

### Task 2.1 — Login screen UI

**Description:** Build the Login screen as the first screen on a fresh
install. It shows the TCPC logo, the stylised faded line drawing of
Denmark, one line of marketing copy, and a single "Log ind med MitID"
button. Nothing else is interactive.

**Acceptance criteria:**
- [ ] Screen renders on iOS 15 and iOS 17 simulators, both light and
      dark mode.
- [ ] All text is loaded from `Localizable.strings` (Danish).
- [ ] The "Log ind med MitID" button uses the brand green token from
      Task 1.6 and meets a 44x44pt minimum tappable size.
- [ ] The faded Denmark illustration is rendered at <30% opacity and
      does not interfere with VoiceOver focus order.
- [ ] Tapping the button currently triggers a stub function — the
      real flow lands in Task 2.3.
- [ ] Screen is fully Dynamic Type compatible up to `accessibility3`.

**Definition of done:**
- SwiftUI preview snapshots committed.
- Accessibility audit (VoiceOver walk-through) recorded in the PR.

**Spec coverage:** US-01 acceptance criterion 1; Section 8 (Imagery,
Tone of voice).

---

### Task 2.2 — Signicat OIDC discovery and PKCE configuration

**Description:** Configure AppAuth-iOS to fetch the Signicat discovery
document at
`https://<tenant>.signicat.com/auth/open/.well-known/openid-configuration`
and prepare an `OIDServiceConfiguration`. Generate per-attempt PKCE
`code_verifier` and `code_challenge` (S256). Construct the full
authorization request including `idp_params`.

**Acceptance criteria:**
- [ ] The Signicat tenant URL and client ID are loaded from a build
      configuration file (different values for staging and production).
- [ ] Discovery is performed lazily on the first auth attempt and
      cached for the lifetime of the app process.
- [ ] PKCE `code_verifier` is at least 43 characters of secure random
      bytes; `code_challenge_method=S256`.
- [ ] An `idp_params` query parameter is built and URL-encoded
      containing exactly:
      `{"mitid":{"enable_app_switch":true,"app_switch_os":"ios","app_switch_url":"https://app.cheappower.dk/oauth/callback"}}`.
- [ ] **Scope selection (per ADR-001 section 6.1):**
      - First-time signup flows request `scope=openid profile nin`.
      - Returning-user logins request `scope=openid profile` (without
        `nin`).
      - The app determines which scope to use from a flag persisted in
        Keychain ("has-completed-signup") set after the first
        successful `POST /v1/auth/session` whose response indicates
        onboarding is complete.
- [ ] Unit tests verify the constructed authorization URL contains all
      required parameters, including the correct scope for each flow.

**Definition of done:**
- Unit tests pass.
- Code review approved.
- The scope-selection logic is called out in the PR description with
  reference to ADR-001 section 6.1.

**Spec coverage:** US-01 acceptance criterion 2; Section 6 step 3, 4
(corrected per ADR-001 section 6.1); Section 12 (Resolved Decisions).

---

### Task 2.3 — Run the ASWebAuthenticationSession flow

**Description:** Wire the "Log ind med MitID" button to start an
`ASWebAuthenticationSession` with the URL built in Task 2.2. Set
`prefersEphemeralWebBrowserSession = false` to allow Signicat session
cookies to persist for silent re-auth. Handle the callback when iOS
delivers it.

**Acceptance criteria:**
- [ ] Tapping "Log ind med MitID" opens an
      `ASWebAuthenticationSession` against the constructed authorize URL.
- [ ] If the MitID app is installed, the system app-switches to MitID
      (manual verification on a device with the MitID test app).
- [ ] If the MitID app is not installed, the Signicat-hosted browser
      flow is shown inside the auth session.
- [ ] On successful return, `ASWebAuthenticationSession` calls back with
      the redirect URL containing `?code=...&state=...`.
- [ ] User cancellation (closing the auth session) returns control to
      the Login screen with no error displayed.
- [ ] `WKWebView` is not present anywhere in the auth path (verified
      by grep in CI).

**Definition of done:**
- Manual end-to-end test on a device using the Signicat sandbox and
  MitID test app, recorded in the PR.
- Cancellation path verified manually.

**Spec coverage:** US-01 acceptance criteria 2–3; Section 6 steps 5–9;
Error States row "MitID user cancels".

---

### Task 2.4 — Handle the Universal Link callback

**Description:** Wire the Universal Link callback into the auth flow.
When iOS delivers the callback URL (either through
`ASWebAuthenticationSession`'s completion handler or via
`onOpenURL` if the session has already closed), pass the URL to
AppAuth-iOS for code-to-token exchange.

**Acceptance criteria:**
- [ ] `OIDAuthState.authState(byPresenting:...)` (or equivalent
      AppAuth API) consumes the redirect URL and exchanges the
      authorization code for ID token, access token, and refresh
      token at Signicat's token endpoint.
- [ ] On exchange success, the ID token is passed to
      Task 2.5.
- [ ] On exchange failure, the user is returned to the Login screen
      with the inline error from the spec's Error States table:
      "Login mislykkedes. Prøv igen, eller kontakt support." with a
      mailto link.
- [ ] The correlation ID from the failure is logged to the backend
      via `POST /v1/diagnostics` (or the agreed diagnostics route)
      and shown in small grey type underneath the error message.

**Definition of done:**
- End-to-end manual test with the Signicat sandbox.
- Failure path verified by injecting an invalid `code` value.

**Spec coverage:** US-01 acceptance criterion 4; Section 6 steps 9–10;
Error States row "MitID auth genuinely fails".

---

### Task 2.5 — Establish the TCPC session

**Description:** Once AppAuth-iOS has the ID token, post it to
`POST /v1/auth/session` on the TCPC backend. The response contains a
TCPC session JWT, a refresh token, and an
`onboardingComplete: Bool` flag. Persist both tokens to Keychain.
Route the user to Home (onboarding complete) or to the Onboarding
flow (not complete — implementation deferred to a separate
Onboarding spec/epic).

**Acceptance criteria:**
- [ ] `POST /v1/auth/session` is called via the network layer (Task
      1.5) with body `{"idToken":"<jwt>"}`.
- [ ] On 2xx, both tokens from the response are written to Keychain
      via Task 1.4.
- [ ] On 2xx, the "has-completed-signup" Keychain flag is set if
      `onboardingComplete == true`.
- [ ] The user is routed to the Home screen (Epic 3) when onboarding
      is complete.
- [ ] When onboarding is not complete, the user is routed to a
      placeholder Onboarding screen ("Onboarding kommer her") — full
      implementation belongs to a separate Onboarding epic.
- [ ] Total time from "Log ind med MitID" tap to Home for a returning
      user with the MitID app installed is under 15 seconds on a
      standard 4G connection (manually measured on at least three
      attempts).

**Definition of done:**
- End-to-end manual test using the Signicat sandbox and a staging
  backend.
- Performance measurement recorded in the PR description.

**Spec coverage:** US-01 acceptance criteria 5–7; Section 6 steps 11–12.

---

### Task 2.6 — Silent session refresh on launch

**Description:** On every app launch, if a TCPC refresh token is in
Keychain, attempt a silent refresh by calling
`POST /v1/auth/refresh` (or the agreed route — confirm with backend)
with the refresh token. On success, replace the session JWT in
Keychain. On failure (refresh expired or revoked), clear Keychain and
show the Login screen with no error modal.

**Acceptance criteria:**
- [ ] The refresh attempt happens before the first Home-screen
      network call on launch.
- [ ] On 2xx, the new session JWT is persisted; the user proceeds to
      Home with no visible interruption.
- [ ] On 4xx (token expired/invalid), the Keychain is cleared and the
      user is shown the Login screen with no error modal.
- [ ] On network failure, the cached Home is shown with the offline
      pill (Epic 9 owns the pill UI; this task surfaces the offline
      flag).
- [ ] Sessions remain valid for a minimum of 30 days of inactivity
      (verified by simulating a 30-day-old refresh token in staging).

**Definition of done:**
- Integration test against staging.
- Manual long-inactivity simulation via clock manipulation or token
  fixtures.

**Spec coverage:** US-02 (all criteria); Error States row "Backend
returns 401".

---

### Task 2.7 — Logout

**Description:** Implement the logout action callable from the Account
screen (Epic 6 owns the row UI; this task owns the action). Call
`POST /v1/auth/logout` with the refresh token, clear all Keychain
slots, and navigate to the Login screen.

**Acceptance criteria:**
- [ ] `AuthService.logout()` is callable from any screen.
- [ ] On call: the backend logout endpoint is invoked (best-effort —
      success or failure does not block the local logout).
- [ ] Keychain `deleteAll()` is invoked.
- [ ] The "has-completed-signup" flag is cleared so that the next
      sign-in correctly determines whether to request `nin` again
      (typically not — the flag is preserved across sessions; clearing
      on logout is a deliberate choice to force the returning-user
      scope on next login). Confirm this behaviour with backend lead;
      default is to preserve the flag across logout so the next login
      remains a returning-user flow.
- [ ] App navigates back to the Login screen.
- [ ] Subsequent network calls fail-fast with an unauthenticated
      error and route to Login.

**Definition of done:**
- Manual end-to-end test.
- Open question on flag preservation resolved in the PR (link to the
  decision).

**Spec coverage:** US-12; Section 6 (Logout paragraph).

---

## Epic 3 — Home / Dashboard Screen

**Goal:** Build the post-login Home screen showing the current
øre/kWh price, the running bill for the period, and the next payment.
Pull-to-refresh works; skeleton loading state works; stale-data
banners work.

**Dependencies:** Epic 1 (all), Epic 2 (Tasks 2.5, 2.6 — must have a
session), Epic 8 (parallel — accessibility hooks must be present from
day one).

**Spec coverage:** Section 5.2 (US-03, US-04), Section 9 (Error States
relevant to Home), Section 10 (latency budgets).

### Task 3.1 — Home screen layout and design

**Description:** Build the static visual layout of Home: three rounded
cards (price, bill, next payment), a "last updated" timestamp at the
bottom, and a subtle vertical-gradient background. Liquid-glass
treatment on the cards. No data wiring yet — show fixed sample values.

**Acceptance criteria:**
- [ ] Three cards visible without scrolling on a 6.1" iPhone screen.
- [ ] Cards use `Material.regular` for the glass effect; corner
      radius 24pt; thin separators only.
- [ ] Price card uses SF Pro Rounded for the numeral display at 64pt
      default Dynamic Type.
- [ ] Layout adapts to `accessibility3` Dynamic Type without
      truncation of the price numeral (validated visually).
- [ ] "Opdateret kl. HH:mm" timestamp renders at the bottom.
- [ ] Reduce Transparency: cards become solid near-white panels.
- [ ] Layout works in both light and dark mode (automatic SwiftUI
      behaviour acceptable per spec).

**Definition of done:**
- Snapshot tests for default and `accessibility3` sizes.
- Visual review by design lead.

**Spec coverage:** US-03 acceptance criterion 2 (sub-bullets 1, 2, 3);
Section 8 (Layout principles, Typography).

---

### Task 3.2 — Wire the current-price tile

**Description:** Fetch `GET /v1/prices/current` from the backend and
render the all-in price in øre/kWh on the price card. Add the
colour-coding logic against the rolling 7-day average (green = below;
neutral = within ±10%; amber = above) paired with an arrow icon
(▲ / ▼ / —). Tapping the tile navigates to Price Detail (Epic 4).

**Acceptance criteria:**
- [ ] On screen appearance, `GET /v1/prices/current` is called via the
      network layer.
- [ ] The response includes the current øre/kWh, a 7-day average, and
      the price area (DK1/DK2).
- [ ] The price is displayed as an integer or one-decimal value (per
      backend response shape) followed by the unit "øre/kWh".
- [ ] Below average → green tint + ▼; within ±10% → neutral + —;
      above average → amber tint + ▲.
- [ ] Colour coding never relies on colour alone (arrow icon is
      always present).
- [ ] Tapping the card navigates to a placeholder Price Detail screen
      (real screen lands in Epic 4).
- [ ] On HTTP 5xx or network failure, the previously-cached value is
      shown with the "Kunne ikke opdatere lige nu" caption.

**Definition of done:**
- Unit tests for the colour-code logic (below, within, above).
- Integration test against staging.

**Spec coverage:** US-03 acceptance criteria 2 (sub-bullet 1), 3, 5;
Section 9 (5xx behaviour); Section 10 (accessibility — colour + icon).

---

### Task 3.3 — Wire the bill tile

**Description:** Fetch `GET /v1/billing/current-period` (or agreed
backend route) and render the running DKK total accrued since the
start of the current billing period. Tapping the tile navigates to
Consumption (Epic 5).

**Acceptance criteria:**
- [ ] On screen appearance, the billing endpoint is called.
- [ ] The DKK total is rendered with two-decimal precision and the
      "kr." suffix.
- [ ] Tapping the card navigates to a placeholder Consumption screen
      (real screen lands in Epic 5).
- [ ] When the backend cannot compute a value (no consumption data
      yet), the card shows "—" with caption "Vi henter snart dine
      forbrugstal."

**Definition of done:**
- Unit tests for the formatting (DKK rendering, two-decimal,
  thousands separator per `da-DK` locale).
- Integration test against staging.

**Spec coverage:** US-03 acceptance criterion 2 (sub-bullet 2), 6;
Section 9 (Eloverblik consent not granted — bill tile fallback).

---

### Task 3.4 — Wire the next-payment tile

**Description:** Fetch `GET /v1/charges/next` (or agreed backend
route) and render the date and currently-projected DKK amount of the
next scheduled MobilePay charge.

**Acceptance criteria:**
- [ ] On screen appearance, the next-charge endpoint is called.
- [ ] The date is rendered in `da-DK` format ("d. MMM" — e.g.
      "12. maj").
- [ ] The amount is rendered as DKK with two decimals.
- [ ] When no upcoming charge exists (subscription stopped), the tile
      shows "—" with caption — exact copy to be confirmed; default
      "Ingen kommende betaling".

**Definition of done:**
- Unit tests for date formatting in Danish locale.
- Integration test against staging.

**Spec coverage:** US-03 acceptance criterion 2 (sub-bullet 3).

---

### Task 3.5 — Pull-to-refresh

**Description:** Implement pull-to-refresh on Home that re-fetches all
three tiles concurrently. Use the custom liquid-bead animation called
out in the spec; respect Reduce Motion (Epic 8 owns the fallback hook).

**Acceptance criteria:**
- [ ] Pull-to-refresh gesture re-fetches all three endpoints in
      parallel via async/await.
- [ ] Total round-trip from gesture release to refreshed data is
      under 2.0 seconds at the 90th percentile on a standard 4G
      connection (measured during integration testing).
- [ ] The custom liquid-bead animation plays during the refresh.
- [ ] When `UIAccessibility.isReduceMotionEnabled == true`, the
      animation collapses to a cross-fade.
- [ ] Errors during refresh do not unwind the existing displayed
      values; instead, the "Kunne ikke opdatere lige nu" caption is
      shown.

**Definition of done:**
- Manual P95 latency measurement recorded over at least 10 attempts.
- Reduce Motion verified manually.

**Spec coverage:** US-03 acceptance criterion 4; Section 8 (Motion);
Section 10 (latency budget — pull-to-refresh under 2.0s).

---

### Task 3.6 — Skeleton loading and cached-on-launch behaviour

**Description:** On first launch (or after a long period of inactivity),
Home shows a skeleton loading state for each tile while the data
fetch is in flight. On subsequent launches, Home renders cached
values immediately and refreshes in the background. This satisfies
the offline behaviour requirement that all tiles render last-known
values when offline.

**Acceptance criteria:**
- [ ] First launch: skeleton placeholders are visible for each tile
      until the network response arrives, then animate into the
      values.
- [ ] Subsequent launches: cached values render within 1.5s of app
      launch (90th percentile, measured); a background refresh fires
      and updates if newer.
- [ ] Offline launches: cached values render; the offline pill from
      Epic 9 appears at the top.
- [ ] Cache is keyed by the customer ID embedded in the session JWT;
      switching accounts (impossible in v1, but defensive) clears
      stale cache.

**Definition of done:**
- Latency measurement recorded.
- Offline simulation via airplane mode.

**Spec coverage:** US-03 (implicit — "first screen shown after auth"
must render fast); Section 10 (latency budget — launch under 1.5s,
offline behaviour).

---

### Task 3.7 — Stale-data captions

**Description:** Add the two stale-data captions called out in US-04:
the price-tile caption when price data is more than 90 minutes old,
and the bill-tile caption when consumption data is more than 36 hours
old. Captions are inline, never modal.

**Acceptance criteria:**
- [ ] Price tile shows "Prisdata kan være forsinket" when the
      backend's `priceTimestamp` is more than 90 minutes older than
      the device's current hour boundary.
- [ ] Bill tile shows "Forbrug opdateres med op til 1 dags
      forsinkelse" when the backend's `consumptionTimestamp` is more
      than 36 hours behind the current hour.
- [ ] Captions never trigger modals.
- [ ] Captions disappear once fresh data arrives.

**Definition of done:**
- Unit tests with fixture timestamps (90 minutes - 1 sec, 90 minutes
  + 1 sec, etc.).
- Manual verification with a backend stub.

**Spec coverage:** US-04 (all criteria).

---

### Task 3.8 — Catastrophic price-data unavailable

**Description:** When price data is more than 24 hours old, the price
tile dims, shows "—" instead of a number, and shows the caption
"Prisdata utilgængelige. Vi arbejder på det." Bill and Next-payment
tiles remain visible.

**Acceptance criteria:**
- [ ] When price-data age exceeds 24 hours, the price tile dims to
      ~50% opacity.
- [ ] The numeral is replaced with "—".
- [ ] Caption renders verbatim: "Prisdata utilgængelige. Vi arbejder
      på det."
- [ ] Other tiles remain unaffected.

**Definition of done:**
- Unit test for the >24h boundary.
- Manual verification with backend stub.

**Spec coverage:** Error States row "Price data older than 24 hours".

---

## Epic 4 — Price Detail Screen

**Goal:** Build the Price Detail screen with a 24-hour bar chart of
today's prices, a tomorrow tab unlocked after 13:00 CET, the price
area indicator, and cheapest/most-expensive hour annotations.

**Dependencies:** Epic 1, Epic 2, Epic 3 (price-tile tap navigates
here), Epic 8 (parallel — accessibility for charts).

**Spec coverage:** Section 5.3 (US-05, US-06), Section 8 (Charts on
iOS 16+ vs iOS 15 fallback).

### Task 4.1 — Price chart layout and SwiftUI Charts integration

**Description:** Build the bar-chart component using SwiftUI `Charts`
(iOS 16+) and a manual `Rectangle`-based fallback for iOS 15. Render
24 bars representing today's hourly prices in øre/kWh. Y-axis starts
at 0.

**Acceptance criteria:**
- [ ] On iOS 16+, the chart uses the `Charts` framework.
- [ ] On iOS 15, the chart uses a manual layout of `Rectangle` bars
      that visually matches the iOS 16+ version within ±2pt.
- [ ] The chart shows 24 bars (00:00 through 23:00).
- [ ] Y-axis is labelled in øre/kWh and starts at 0.
- [ ] The current hour's bar is highlighted (brighter green or
      bordered).
- [ ] Long-press on a bar shows a tooltip with the hour range and the
      all-in price.
- [ ] Animations on first render respect Reduce Motion (cross-fade
      fallback when enabled).

**Definition of done:**
- Snapshot tests on iOS 15 and iOS 17 simulators.
- Manual long-press verified on a device.

**Spec coverage:** US-05 acceptance criteria 1, 2, 3; Section 8
(Charts on iOS 15 fallback, Motion).

---

### Task 4.2 — Today / Tomorrow segmented control

**Description:** Add a segmented control above the chart that switches
between "I dag" and "I morgen". Before tomorrow's prices are
published (~13:00 CET), the "I morgen" tab is visible but disabled,
with the caption "Morgendagens priser offentliggøres efter kl. 13".

**Acceptance criteria:**
- [ ] Segmented control with two segments: "I dag", "I morgen".
- [ ] When `GET /v1/prices/tomorrow` returns 200, the "I morgen" tab
      is enabled and tapping switches the chart to tomorrow's data.
- [ ] When the backend returns "not yet published" (agreed contract:
      404 or empty array), the "I morgen" tab is disabled and the
      caption renders below the segmented control verbatim.
- [ ] After 13:00 CET on the device clock, the app re-fetches once if
      tomorrow was previously unavailable.

**Definition of done:**
- Manual test with backend stubs for both states.
- Time-boundary test (set device clock to 12:55, then 13:05).

**Spec coverage:** US-05 acceptance criterion 1 (sub-clause about
segmented control); US-06 (all criteria).

---

### Task 4.3 — Price-area label and info icon

**Description:** Add a small label at the top of the screen showing
"Prisområde: DK1" or "Prisområde: DK2" with a tappable info icon that
opens a sheet explaining the West/East split.

**Acceptance criteria:**
- [ ] Label reads "Prisområde: DK1" or "Prisområde: DK2" based on the
      customer's metering point (sourced from `GET /v1/customer`).
- [ ] Info icon meets 44x44pt tappable size.
- [ ] Tapping opens a sheet with a short paragraph in Danish
      explaining DK1 (West Denmark) vs DK2 (East Denmark) and that
      the area is determined by the customer's address.
- [ ] Sheet has a "Luk" button.

**Definition of done:**
- Manual visual verification.
- Copy reviewed by the team's Danish-language reviewer.

**Spec coverage:** US-05 acceptance criterion 4.

---

### Task 4.4 — Cheapest, most-expensive, and average annotations

**Description:** Below the chart, render three short statements: the
cheapest hour, the most-expensive hour, and the day's average — all in
øre/kWh.

**Acceptance criteria:**
- [ ] "Billigst kl. HH–HH (NN øre/kWh)" rendered for the cheapest
      hour in the displayed day.
- [ ] "Dyrest kl. HH–HH (NN øre/kWh)" rendered for the most-expensive
      hour.
- [ ] "Gennemsnit (NN øre/kWh)" rendered for the average.
- [ ] When the segmented control switches to tomorrow, these values
      recompute against tomorrow's data.
- [ ] When data is unavailable, the section is hidden (not shown with
      placeholders).

**Definition of done:**
- Unit tests for the min/max/avg calculations.

**Spec coverage:** US-05 acceptance criterion 5.

---

### Task 4.5 — Reduce Motion fallback for chart animations

**Description:** When `UIAccessibility.isReduceMotionEnabled` is true,
all chart bar entrance animations collapse to a cross-fade. No
parallax, no scaling, no spring physics.

**Acceptance criteria:**
- [ ] Reduce Motion enabled: bars appear via cross-fade only.
- [ ] Reduce Motion disabled: bars animate in with the spring
      transition (default SwiftUI Charts animation or the manual
      iOS 15 equivalent).
- [ ] Verified on both iOS 15 and iOS 17 simulators.

**Definition of done:**
- Manual verification with Reduce Motion toggled in Settings.

**Spec coverage:** US-05 (chart animation Reduce Motion fallback —
cross-cuts US-05 and Section 8 Motion).

---

## Epic 5 — Consumption Screen

**Goal:** Build the Consumption screen showing hourly kWh usage from
Eloverblik, a cost-breakdown overlay, and a period selector. Handle
the "no Eloverblik consent" empty state gracefully.

**Dependencies:** Epic 1, Epic 2, Epic 3 (bill-tile tap navigates
here), Epic 4 (chart patterns reused), Epic 8 (parallel —
accessibility).

**Spec coverage:** Section 5.4 (US-07, US-08), Section 9 (Error States
— Eloverblik consent not granted, consent withdrawn).

### Task 5.1 — Period selector

**Description:** Build the segmented control "Denne periode" / "Sidste
periode" at the top of the screen. The selected period defaults to
"Denne periode". The period boundaries (week or month) come from the
customer's subscription setting.

**Acceptance criteria:**
- [ ] Segmented control with two segments.
- [ ] Default selection is "Denne periode".
- [ ] When the customer is on weekly billing, "Denne periode" maps to
      the current ISO week; "Sidste periode" maps to the previous ISO
      week.
- [ ] When the customer is on monthly billing, periods map to
      calendar months in `Europe/Copenhagen`.
- [ ] Selection change triggers a refetch.

**Definition of done:**
- Unit tests for the boundary calculations (week vs month, Sunday vs
  Monday week start — confirm `da-DK` calendar starts Monday).

**Spec coverage:** US-07 acceptance criterion 1.

---

### Task 5.2 — Period totals and cost-breakdown bar

**Description:** Render the total kWh used and total DKK cost for the
selected period at the top of the screen. Below that, a stacked
horizontal bar showing the proportion of the bill spent on (in this
order): spot price, network tariff, Energinet system tariffs,
elafgift, VAT, TCPC margin. Each segment is tappable to reveal its
DKK value.

**Acceptance criteria:**
- [ ] Total kWh and total DKK render for the selected period.
- [ ] Stacked horizontal bar renders six segments in the specified
      order with distinguishable colours (no red).
- [ ] Tapping a segment shows a popover or inline label with the DKK
      value and the segment label.
- [ ] Segment colours are accessible — meet WCAG AA contrast — and
      include an icon or label for VoiceOver.
- [ ] Segments expose a meaningful `accessibilityLabel` ("Spotpris,
      NN kr.", etc.).

**Definition of done:**
- Snapshot tests.
- VoiceOver walk-through recorded.

**Spec coverage:** US-07 acceptance criteria 2, 3.

---

### Task 5.3 — Daily kWh bar chart

**Description:** Below the cost breakdown, render a daily-usage bar
chart of kWh per day for the selected period. Reuse the chart patterns
from Epic 4 Task 4.1 (SwiftUI Charts on iOS 16+, manual fallback on
iOS 15).

**Acceptance criteria:**
- [ ] One bar per day in the selected period.
- [ ] Y-axis labelled in kWh, starting at 0.
- [ ] Bars are tappable; tapping shows the date and the day's kWh
      total.
- [ ] Reduce Motion fallback applied (cross-fade only).
- [ ] iOS 15 fallback uses manual rectangles matching the iOS 16+
      version visually within ±2pt.

**Definition of done:**
- Snapshot tests on iOS 15 and iOS 17.

**Spec coverage:** US-07 acceptance criterion 4.

---

### Task 5.4 — Wire `GET /v1/consumption`

**Description:** Fetch consumption data from
`GET /v1/consumption?from=&to=` for the selected period. The response
includes hourly kWh time-series data and the cost breakdown summary.
Cache the most recent fetched period locally for offline display.

**Acceptance criteria:**
- [ ] Period change triggers `GET /v1/consumption?from=&to=` with
      ISO 8601 timestamps in `Europe/Copenhagen`.
- [ ] The response populates the totals, breakdown bar, and daily
      chart.
- [ ] The most recent successful response per period is cached in a
      local store (Core Data, SQLite, or a JSON file — implementation
      choice; document in PR).
- [ ] Offline: the cached response renders immediately; the offline
      pill from Epic 9 appears.
- [ ] On HTTP 5xx, previously displayed values remain; the "Kunne
      ikke opdatere lige nu" caption appears.

**Definition of done:**
- Integration test against staging.
- Offline behaviour verified manually.

**Spec coverage:** US-07 acceptance criterion 5; Section 10 (offline
behaviour for Consumption).

---

### Task 5.5 — Eloverblik consent empty state

**Description:** When the backend returns "no consent" for the
customer's metering point, render the empty state from US-08. One
heading ("Vi mangler adgang til dit forbrug"), one paragraph of
explanation, one button ("Giv adgang via Eloverblik") that opens the
Eloverblik consent flow in `ASWebAuthenticationSession`.

**Acceptance criteria:**
- [ ] Backend response includes a flag (e.g. `consentStatus:
      "none"`) when consent is missing; on this flag, the empty state
      renders instead of the period selector and chart.
- [ ] One H1 heading, one body paragraph, one primary button — and
      nothing else interactive on the screen.
- [ ] Tapping the button opens `ASWebAuthenticationSession` against
      the Eloverblik consent URL provided by the backend (e.g.
      `GET /v1/consumption/consent-url`).
- [ ] On successful return from the consent flow, the next backend
      response populates Consumption normally; the user is not
      asked to re-authenticate to TCPC.

**Definition of done:**
- Manual end-to-end test against the Eloverblik test environment.

**Spec coverage:** US-08 (all criteria); Section 9 (Error States —
Eloverblik consent not granted).

---

### Task 5.6 — Consent revoked / expired state

**Description:** When `GET /v1/customer` returns `consentRevoked:
true` (e.g. the 1-year refresh token expired or the customer revoked
at eloverblik.dk), Consumption shows the same empty state with copy
"Din adgang til Eloverblik er udløbet. Forny den her."

**Acceptance criteria:**
- [ ] On `consentRevoked: true`, the empty state from Task 5.5
      renders, with the heading replaced by "Din adgang til
      Eloverblik er udløbet. Forny den her."
- [ ] The button reuses the consent flow from Task 5.5.

**Definition of done:**
- Manual test with a backend stub returning `consentRevoked: true`.

**Spec coverage:** Section 9 (Error States — Eloverblik token revoked).

---

## Epic 6 — Account & Settings Screen

**Goal:** Build the Account screen with personal details, billing
frequency toggle, MobilePay subscription status, deep-link to
MobilePay, and the logout button.

**Dependencies:** Epic 1, Epic 2 (logout), Epic 7 (push permission
banner), Epic 8 (parallel — accessibility).

**Spec coverage:** Section 5.5 (US-09 to US-12), Section 9 (Error
States — push permission denied, MobilePay agreement stopped).

### Task 6.1 — Account screen layout and personal details

**Description:** Build the static Account screen layout. Render the
customer's full name (from MitID `name` claim, persisted by backend),
home address (from metering-point master data), metering point ID
(anonymised — last 4 digits visible, rest dotted), price area
(DK1/DK2), and account creation date. None of these fields are
editable.

**Acceptance criteria:**
- [ ] All five fields render in a single grouped list.
- [ ] Metering point ID is displayed as `••••••1234` (or equivalent
      pattern with the last 4 digits visible).
- [ ] None of the fields offer an edit affordance.
- [ ] Below the fields, a small "Adresseændring? Skriv til support"
      mailto link is visible.
- [ ] Data is fetched from `GET /v1/customer`; cached on success.

**Definition of done:**
- Snapshot test.
- Integration test against staging.

**Spec coverage:** US-09 (all criteria).

---

### Task 6.2 — Billing frequency toggle (weekly ↔ monthly)

**Description:** Implement the "Faktureringsinterval" row that opens a
sheet with two options. Selecting the new option calls
`PATCH /v1/subscription/interval`. Confirm with "Ændret. Træder i
kraft fra næste periode."

**Acceptance criteria:**
- [ ] Row shows the current setting ("Ugentligt" or "Månedligt") with
      a chevron.
- [ ] Tapping opens a sheet with two options (radio-button style).
- [ ] Selecting the new option calls
      `PATCH /v1/subscription/interval` with body
      `{"interval":"WEEKLY"}` or `{"interval":"MONTHLY"}`.
- [ ] On 2xx, the sheet dismisses and a confirmation toast renders
      with the verbatim copy "Ændret. Træder i kraft fra næste
      periode."
- [ ] On 5xx, an inline error in the sheet says "Kunne ikke ændre
      lige nu. Prøv igen." (verbatim) — sheet does not dismiss.
- [ ] The change is reflected in the row text on the next backend
      `GET /v1/subscription` response.

**Definition of done:**
- Manual end-to-end test against staging.
- Error path verified.

**Spec coverage:** US-10 (all criteria).

---

### Task 6.3 — MobilePay subscription status section

**Description:** Render the "MobilePay-abonnement" section with
status (`PENDING` / `ACTIVE` / `STOPPED`), `maxAmount` (DKK), and
`suggestMaxAmount` (DKK). Add a "Skift maksbeløb" row that
deep-links to the MobilePay app's agreement management screen using
the `vippsConfirmationUrl` pattern.

**Acceptance criteria:**
- [ ] The status, maxAmount, and suggestMaxAmount come from
      `GET /v1/subscription`.
- [ ] Status is rendered in plain Danish: "Aktiv", "Afventer", or
      "Stoppet".
- [ ] maxAmount and suggestMaxAmount render in DKK with thousands
      separators.
- [ ] Tapping "Skift maksbeløb" opens the MobilePay app via the URL
      from the backend response.
- [ ] If MobilePay is not installed, fall back to opening the
      App Store listing for MobilePay.

**Definition of done:**
- Manual test on a device with MobilePay installed.
- Fallback verified by uninstalling MobilePay.

**Spec coverage:** US-11 acceptance criteria 1, 2.

---

### Task 6.4 — Stop subscription action

**Description:** Implement the "Stop abonnement" row with the
confirmation sheet and the `PATCH /v1/subscription` call to set status
to `STOPPED`.

**Acceptance criteria:**
- [ ] Tapping "Stop abonnement" shows a confirmation sheet with
      verbatim copy:
      - Title: "Stop abonnement?"
      - Body: "Du betaler det resterende beløb for indeværende
        periode. Derefter stopper aftrykket. Du kan altid komme
        tilbage."
      - Primary action: "Stop"
      - Secondary action: "Behold"
- [ ] Tapping "Stop" calls `PATCH /v1/subscription` with
      `{"status":"STOPPED"}`.
- [ ] On 2xx, the sheet dismisses; the row updates to reflect the
      pending stop.
- [ ] After the backend confirms via the
      `recurring.agreement-stopped.v1` webhook (delivered via APNs
      silent push or detected on next refresh), the Home screen
      shows the banner "Dit abonnement er stoppet — kontakt os for
      at genstarte" and most actions are disabled (Epic 9 owns the
      banner; this task surfaces the state).
- [ ] The cancellation tap depth from Home is 2 (Account →
      Stop abonnement) — verified by user-flow walkthrough.

**Definition of done:**
- Manual end-to-end test.
- User-flow walkthrough recorded showing 2-tap depth.

**Spec coverage:** US-11 acceptance criterion 3, 4; Error States row
"Stop subscription — confirmation"; Section 12 (Resolved Decisions —
cancellation tap depth).

---

### Task 6.5 — Logout row

**Description:** Add the "Log ud" row that triggers the logout action
from Epic 2 Task 2.7.

**Acceptance criteria:**
- [ ] Row at the bottom of the Account screen, separated from
      everything else.
- [ ] Tapping invokes `AuthService.logout()`.
- [ ] After logout, the app navigates to the Login screen.
- [ ] No confirmation dialog (logout is a single tap as per spec
      US-12).

**Definition of done:**
- Manual end-to-end test.

**Spec coverage:** US-12 (all criteria).

---

## Epic 7 — Push Notifications

**Goal:** Register for APNs, prompt for permission at the right moment
(after MobilePay activation), receive and route the four notification
types from the spec.

**Dependencies:** Epic 1, Epic 2, Epic 6 (deep-link to settings).

**Spec coverage:** Section 5.6 (US-13 to US-16), Section 9 (push
permission denied).

### Task 7.1 — APNs registration and device token forwarding

**Description:** Register with APNs, retrieve the device token, post
it to `POST /v1/devices`. Re-post on token rotation.

**Acceptance criteria:**
- [ ] After permission is granted, the app calls
      `UIApplication.registerForRemoteNotifications()`.
- [ ] On `application(_:didRegisterForRemoteNotificationsWithDeviceToken:)`,
      the device token is sent to `POST /v1/devices` with body
      `{"token":"<hex>","environment":"sandbox|production"}`.
- [ ] Token rotation re-fires the registration callback and re-posts.
- [ ] The token is never logged.

**Definition of done:**
- Manual test on a device.
- Backend logs confirm receipt of the token in staging.

**Spec coverage:** Section 7 (Push token row); Section 10 (push
notifications).

---

### Task 7.2 — Pre-prompt and permission request

**Description:** After the MobilePay subscription is activated (US-13),
show an in-app pre-prompt screen explaining what notifications will
be used for, then trigger the system permission prompt. Do not prompt
at app launch.

**Acceptance criteria:**
- [ ] Pre-prompt is triggered on the first foreground after the
      backend reports the agreement status changed to `ACTIVE`.
- [ ] Pre-prompt content: short explanation paragraph "Bekræftelse
      på betalinger og varsler om mislykkede betalinger", a primary
      "Slå til" button, and a secondary "Senere" button.
- [ ] Tapping "Slå til" triggers
      `UNUserNotificationCenter.current().requestAuthorization(...)`.
- [ ] Tapping "Senere" dismisses the pre-prompt; it is not shown
      again automatically.
- [ ] The permission prompt is never triggered before the agreement
      is `ACTIVE`.

**Definition of done:**
- Manual test on a fresh install.
- "Senere" path verified.

**Spec coverage:** US-13 (all criteria).

---

### Task 7.3 — Payment-confirmation notification

**Description:** Handle the payment-confirmation push (US-14): title
"Betaling gennemført", body "NN,NN kr. trukket for [periode].".
Tapping opens the app to a receipt view inside Account. If the app is
foregrounded, show an in-app toast instead.

**Acceptance criteria:**
- [ ] Background push with payload type `payment-confirmation` shows
      the system notification with the verbatim title and body.
- [ ] Tapping the notification opens the app to a Receipt detail view
      under Account (placeholder view acceptable in this task; final
      content depends on backend payload — note in PR).
- [ ] When the app is foregrounded, the notification is suppressed
      and an in-app toast renders the same body text.
- [ ] Badge count is unaffected (only payment-failure events touch
      the badge).

**Definition of done:**
- Manual test using APNs sandbox sending a fixture payload.
- Foreground vs background paths both verified.

**Spec coverage:** US-14 (all criteria).

---

### Task 7.4 — Payment-failure notification

**Description:** Handle the payment-failure push (US-15): title
"Betaling mislykkedes", body "Vi kunne ikke trække NN,NN kr. Tjek dit
MobilePay-maksbeløb.". Tapping opens the troubleshooting view that
explains maxAmount and offers a deep-link to MobilePay. Increments
the badge.

**Acceptance criteria:**
- [ ] Background push with payload type `payment-failure` shows the
      system notification with the verbatim title and body.
- [ ] Tapping opens a troubleshooting view (under Account) explaining
      maxAmount and offering a "Åbn MobilePay" button that uses the
      same deep-link as Epic 6 Task 6.3.
- [ ] Badge count increments by 1; clears when the troubleshooting
      view is dismissed.
- [ ] On next app open after the push, the non-dismissable banner
      from Epic 9 appears at the top of Home: "Seneste betaling
      mislykkedes. Tryk for at rette."

**Definition of done:**
- Manual test using APNs sandbox.
- Banner behaviour verified.

**Spec coverage:** US-15 (all criteria); Error States row "MobilePay
charge failed".

---

### Task 7.5 — Price-alert notification (opt-in)

**Description:** Add the "Prisvarsler" toggle in Account, default off.
Toggling on registers the customer for daily price-alert pushes via
`POST /v1/notifications/preferences`. Handle the incoming push with
body "I morgen er strømmen N% billigere/dyrere end normalt".

**Acceptance criteria:**
- [ ] "Prisvarsler" toggle visible in Account; default off.
- [ ] Toggling calls
      `POST /v1/notifications/preferences` with `{"priceAlerts":bool}`.
- [ ] Background push with payload type `price-alert` shows the
      system notification with the body string from the payload.
- [ ] Tapping the notification opens Price Detail with tomorrow's tab
      pre-selected.
- [ ] Toggling off stops further alerts within 24 hours (backend
      guarantee — verify in staging).

**Definition of done:**
- Manual end-to-end test in staging.

**Spec coverage:** US-16 (all criteria).

---

### Task 7.6 — Permission-denied banner in Account

**Description:** When the user has denied notifications, Account shows
a banner "Du modtager ikke betalingsbekræftelser. Slå dem til i
Indstillinger." with a button that deep-links to iOS Settings.

**Acceptance criteria:**
- [ ] On Account screen appearance, current notification settings are
      checked.
- [ ] If `authorizationStatus == .denied`, the banner renders
      verbatim above the personal-details section.
- [ ] Tapping the button opens iOS Settings to the TCPC app's
      settings page via `UIApplication.openSettingsURLString`.
- [ ] If permission is later granted, the banner disappears on next
      Account screen appearance.

**Definition of done:**
- Manual test with permission denied.
- Manual test with permission granted (banner disappears).

**Spec coverage:** Error States row "Push permission denied".

---

## Epic 8 — Accessibility & Polish

**Goal:** Bring the entire app to the spec's accessibility bar
(Dynamic Type, VoiceOver, Reduce Motion, Reduce Transparency, contrast,
target size) and apply the liquid-glass / green-and-light visual
treatment consistently. Dark-mode functional support (no visual
tuning beyond automatic SwiftUI behaviour, per spec out-of-scope).

**Dependencies:** Runs in parallel with Epics 3–7. Final polish pass
should land after those epics are feature-complete.

**Spec coverage:** Section 8 (Design Guidance), Section 10
(Accessibility, Localisation).

### Task 8.1 — Dynamic Type audit and fixes

**Description:** Walk through every screen at every Dynamic Type size
from `xSmall` to `accessibility3`. Fix every truncation, every
overlapping element, every numeric display that gets clipped.

**Acceptance criteria:**
- [ ] Every screen rendered correctly at `accessibility3`.
- [ ] No text is truncated except per documented truncation rules
      (e.g. metering point ID).
- [ ] Numeric displays (price tile, bill tile, period totals) remain
      legible and do not overlap surrounding chrome at any size.
- [ ] Layout adapts gracefully — multi-column layouts collapse to
      single-column at the largest sizes.

**Definition of done:**
- Snapshot tests at default and `accessibility3` for every screen.
- Accessibility audit checklist signed off by a reviewer.

**Spec coverage:** Section 10 (Accessibility — Dynamic Type up to
`accessibility3`).

---

### Task 8.2 — VoiceOver labels everywhere

**Description:** Add `accessibilityLabel` and where appropriate
`accessibilityValue` and `accessibilityHint` to every interactive
element and every chart bar. Ensure VoiceOver focus order is logical
on every screen.

**Acceptance criteria:**
- [ ] Every button, row, toggle, and tile has a meaningful
      `accessibilityLabel` in Danish.
- [ ] Chart bars expose their hour-range and price via
      `accessibilityChartDescriptor` on iOS 16+; iOS 15 fallback uses
      a hidden VoiceOver-only summary block.
- [ ] No element is announced as "Button, button" or with an
      auto-generated meaningless name.
- [ ] Focus order on each screen matches reading order.
- [ ] Decorative images (e.g. the faded Denmark illustration) are
      hidden from VoiceOver via
      `.accessibilityHidden(true)`.

**Definition of done:**
- VoiceOver walk-through for every screen recorded as a video and
  attached to the PR.
- Reviewer confirms every screen flows logically.

**Spec coverage:** Section 10 (Accessibility — VoiceOver).

---

### Task 8.3 — Reduce Motion fallbacks across all transitions

**Description:** Audit every animated transition (tab switches, tile
taps, sheet presentations, chart entry, pull-to-refresh). Confirm
each respects Reduce Motion. Where the default SwiftUI behaviour does
not collapse to a cross-fade, add an explicit conditional.

**Acceptance criteria:**
- [ ] All custom animations gate on
      `UIAccessibility.isReduceMotionEnabled`.
- [ ] With Reduce Motion enabled: all transitions cross-fade only;
      no parallax, no scaling.
- [ ] With Reduce Motion disabled: original animations play.
- [ ] Verified on both iOS 15 and iOS 17 simulators with the toggle.

**Definition of done:**
- Manual verification with Reduce Motion toggled.

**Spec coverage:** Section 8 (Motion); Section 10 (Reduce Motion fully
respected).

---

### Task 8.4 — Reduce Transparency support

**Description:** When `UIAccessibility.isReduceTransparencyEnabled`,
glass surfaces (every `Material` panel) become solid near-white
panels.

**Acceptance criteria:**
- [ ] All `Material.regular` and `Material.thin` uses are wrapped in
      a helper that switches to a solid colour when Reduce
      Transparency is on.
- [ ] Verified on every screen.

**Definition of done:**
- Manual verification with Reduce Transparency toggled.

**Spec coverage:** Section 10 (Reduce Transparency).

---

### Task 8.5 — Colour contrast and tappable targets audit

**Description:** Verify every text/background combination meets WCAG
2.1 AA contrast in light and dark mode. Verify every interactive
element is at least 44x44pt.

**Acceptance criteria:**
- [ ] Contrast ratios documented for: body text, caption text, button
      labels, segmented controls, status pills (offline, stale, etc.).
- [ ] All ratios meet WCAG AA (4.5:1 for normal text, 3:1 for large
      text).
- [ ] All tappable elements measured at ≥44x44pt — listed in PR.
- [ ] Where contrast falls short, design tokens are adjusted (in
      Task 1.6's file) and re-verified.

**Definition of done:**
- Audit table attached to the PR.
- Token adjustments merged.

**Spec coverage:** Section 10 (Accessibility — colour contrast,
tappable target).

---

### Task 8.6 — Liquid-glass and brand-palette polish pass

**Description:** Final visual polish to ensure the liquid-glass
aesthetic and green-and-light palette are consistent across every
screen. Adjust gradients, card highlights, separator weights.

**Acceptance criteria:**
- [ ] Every card uses the same corner radius, the same Material
      treatment, and the same inner highlight.
- [ ] Brand green is used consistently for primary actions; muted
      gold only for the "below average" indicator.
- [ ] No reds anywhere in the app.
- [ ] Visual review by design lead signs off.

**Definition of done:**
- Side-by-side screenshots before/after attached to the PR.
- Design lead approval recorded.

**Spec coverage:** Section 8 (Palette, Layout principles).

---

### Task 8.7 — Dark-mode functional sweep

**Description:** Walk through every screen in dark mode. Verify the
app remains functional (no unreadable text, no invisible elements).
Per spec out-of-scope, no dark-mode visual tuning beyond automatic
SwiftUI behaviour is required.

**Acceptance criteria:**
- [ ] Every screen renders without unreadable text in dark mode.
- [ ] All interactive elements remain visible and tappable.
- [ ] No regressions noted compared to light mode functionality.

**Definition of done:**
- Screenshots of every screen in dark mode attached to the PR.

**Spec coverage:** Section 3 (Out of Scope — dark-mode polish);
Section 10 (colour contrast in dark mode).

---

## Epic 9 — Error & Offline Handling

**Goal:** Implement every error and offline state from the spec's
Error States table. The app must degrade gracefully — never show a
full-screen "no internet" error, never block the user with a
gratuitous modal, always favour inline captions and graceful
fallbacks.

**Dependencies:** Runs in parallel with Epics 2–7. Final pass should
land after those epics are feature-complete.

**Spec coverage:** Section 9 (Error States — entire table), Section
10 (Offline behaviour, Availability).

### Task 9.1 — Offline pill and cached-data fallback

**Description:** Implement the small "Offline — viser senest hentede
tal" pill that appears at the top of Home when the device is offline.
Pull-to-refresh attempts to reconnect.

**Acceptance criteria:**
- [ ] When `NWPathMonitor` reports no connectivity, the offline pill
      appears at the top of Home.
- [ ] Cached values continue to render in all three tiles.
- [ ] Pull-to-refresh on Home re-checks connectivity and reattempts
      the fetch.
- [ ] Pill disappears within 1 second of connectivity returning.
- [ ] Pill never blocks any tile or button.

**Definition of done:**
- Manual test with airplane mode toggled.

**Spec coverage:** Error States row "No network on app launch";
Section 10 (offline behaviour).

---

### Task 9.2 — MitID auth no-network and failure paths

**Description:** Implement the two MitID error states from the spec:
no network during auth (inline message + retry) and genuine auth
failure (inline message + mailto + correlation ID). User cancellation
in the MitID app returns silently.

**Acceptance criteria:**
- [ ] No network during auth: Login screen shows verbatim "Kunne
      ikke kontakte MitID. Tjek din forbindelse og prøv igen." with
      a single retry button. No technical error code shown.
- [ ] Genuine failure: Login screen shows verbatim "Login mislykkedes.
      Prøv igen, eller kontakt support." with a "Kontakt support"
      mailto link and a correlation ID in small grey type.
- [ ] User cancels in MitID: Login screen redisplayed with no error
      message.

**Definition of done:**
- Manual test for each path.

**Spec coverage:** Error States rows "No network during MitID auth",
"MitID user cancels", "MitID auth genuinely fails".

---

### Task 9.3 — Backend 401 silent refresh and route-to-login

**Description:** When any backend call returns 401, the app attempts a
silent refresh once. If that fails, the user is silently routed to
Login. No modal.

**Acceptance criteria:**
- [ ] First 401 in a session triggers
      `POST /v1/auth/refresh`.
- [ ] On refresh success, the original request is retried once.
- [ ] On refresh failure, Keychain is cleared and the user is routed
      to the Login screen with no error modal.
- [ ] No more than one refresh attempt per inbound 401 (no infinite
      loop).

**Definition of done:**
- Unit test for the refresh-then-retry path.
- Manual test with an expired session token.

**Spec coverage:** Error States row "Backend returns 401".

---

### Task 9.4 — Backend 5xx with cached fallback and exponential backoff

**Description:** When any backend call returns 5xx, the app continues
to display the previously-cached value with a small grey "Kunne ikke
opdatere lige nu" caption. Background retries follow exponential
backoff capped at 30 seconds.

**Acceptance criteria:**
- [ ] On 5xx, no modal is shown.
- [ ] The "Kunne ikke opdatere lige nu" caption renders verbatim
      adjacent to the affected tile or section.
- [ ] Retries follow 1s, 2s, 4s, 8s, 16s, 30s, 30s... sequence.
- [ ] On any successful retry, the caption clears.
- [ ] Pull-to-refresh resets the backoff sequence.

**Definition of done:**
- Unit test for the backoff sequence.
- Manual test with a backend stub returning 500.

**Spec coverage:** Error States row "Backend returns 5xx".

---

### Task 9.5 — Forced-upgrade screen

**Description:** When the backend returns 426 with a `minVersion`
field, the app shows a full-screen "Opdatér appen" view with a single
"Hent opdatering" button linking to the App Store. No bypass.

**Acceptance criteria:**
- [ ] On 426, the entire app navigation is replaced with the upgrade
      screen.
- [ ] Heading "Opdatér appen" (verbatim).
- [ ] One body paragraph explaining the new version is required.
- [ ] One "Hent opdatering" button that opens the App Store listing.
- [ ] No back, dismiss, or skip affordance.
- [ ] The screen reappears on every subsequent 426; cannot be
      bypassed.

**Definition of done:**
- Manual test with a backend stub returning 426.

**Spec coverage:** Error States row "App version below minimum
supported".

---

### Task 9.6 — Payment-failure banner on Home

**Description:** When the backend reports a recent payment failure
(via APNs silent push or detected on the next `GET /v1/charges/last`
call), Home shows a non-dismissable banner "Seneste betaling
mislykkedes. Tryk for at rette." Tapping opens the troubleshooting
view from Epic 7 Task 7.4. Banner clears when the next charge
succeeds.

**Acceptance criteria:**
- [ ] Banner renders at the top of Home above all three tiles.
- [ ] Banner cannot be dismissed by the user.
- [ ] Tapping opens the troubleshooting view.
- [ ] Banner clears within 30 seconds of the next successful charge
      arriving via webhook → silent push → app refresh.

**Definition of done:**
- Manual end-to-end test with backend stubs.

**Spec coverage:** Error States row "MobilePay charge failed".

---

### Task 9.7 — Subscription stopped / expired banner and disabled state

**Description:** When the backend reports the agreement is `STOPPED`
or expired, Home shows the banner "Dit abonnement er stoppet — kontakt
os for at genstarte" and most actions are disabled.

**Acceptance criteria:**
- [ ] Banner renders at the top of Home (verbatim copy).
- [ ] Disabled (non-tappable) on Home: pull-to-refresh remains;
      tile-tap navigations remain (read-only); price-alert toggle
      grays out; billing-frequency change disabled.
- [ ] Stop-subscription action is hidden (already stopped).
- [ ] Tapping the banner opens a mailto support link.

**Definition of done:**
- Manual test with backend stub.

**Spec coverage:** Error States row "MobilePay agreement expired or
stopped".

---

### Task 9.8 — Eloverblik consent-not-granted bill-tile fallback

**Description:** When Eloverblik consent has not been granted and the
backend cannot supply an estimated bill, the Home bill tile shows "—"
with caption "Vi henter snart dine forbrugstal." The Consumption
screen empty state (Task 5.5) covers the deeper consent flow.

**Acceptance criteria:**
- [ ] When `consentStatus: "none"` and no estimate is available, the
      bill tile renders "—" with the verbatim caption.
- [ ] When an estimate is available, the bill tile renders the
      estimate with no caption.
- [ ] Once consent is granted and consumption arrives, the tile
      renders the actual value.

**Definition of done:**
- Manual test with backend stubs covering all three states.

**Spec coverage:** Error States row "Eloverblik consent not granted".

---

### Task 9.9 — Final error-state acceptance review

**Description:** Walk through every row of Section 9 of the spec and
verify each is implemented. Cross-check copy verbatim. Cross-check
that no row introduces a modal that the spec says should be inline.

**Acceptance criteria:**
- [ ] A checklist of every Error State row is attached to the PR.
- [ ] Each row references the implementing task and a screenshot or
      video of the implemented behaviour.
- [ ] Any deviation from the spec copy is flagged and either
      corrected or surfaced as an open question.

**Definition of done:**
- Reviewer (project lead or QA) signs off on the checklist.

**Spec coverage:** Section 9 (entire table).

---

## Cross-cutting open questions

These questions are inherited from the companion-app spec Section 11
and from ADR-001. They affect implementation plans across multiple
epics and should be resolved before the relevant epic begins.

1. **Onboarding flow detail (spec OQ #11).** Tasks 2.5 routes new users
   to a placeholder Onboarding screen. The full Onboarding sequence
   (sign-agreement, choose-interval, MobilePay-agreement creation,
   Eloverblik-consent) is owned by a separate Onboarding spec/epic
   that does not yet exist. Owner: Product. Default assumption: a
   separate Onboarding spec follows; this iOS plan covers only the
   placeholder.

2. **`suggestMaxAmount` value (ADR-001 section 6.4, spec OQ #9).**
   Affects what is shown in Account Task 6.3. Owner: Product +
   Finance. Default per ADR-001: 3,000 DKK (from customer-onboarding.md
   US-05) until formally resolved. Reflect the resolved value when
   the backend sends it via `GET /v1/subscription`.

3. **Eloverblik consent UX (spec OQ #7).** Affects Task 5.5. Owner:
   Backend lead. Default assumption: separate Eloverblik flow,
   surfaced in `ASWebAuthenticationSession`.

4. **Price-area determination during onboarding (spec OQ #8).** During
   the brief onboarding window before metering data is available, the
   app should hide the Home price tile and show "Vi henter dine data".
   Affects Task 3.2 acceptance criteria. Owner: Backend lead.

5. **Push notification copy (spec OQ #10).** Drafts in section 5.6
   are used verbatim in Tasks 7.3, 7.4, 7.5. Owner: Marketing/Copy.
   Default: ship with the drafts.

6. **Logout flag preservation (Task 2.7).** Whether the
   "has-completed-signup" Keychain flag persists across logout, or is
   cleared on logout. Determines whether the next sign-in requests
   `nin` again. Owner: Backend lead. Default: preserve across logout
   so the next sign-in remains a returning-user flow.

7. **Watch / widget / Live Activities scope (spec OQ #1, #2, #5).**
   Excluded from v1. Will be revisited for v1.1+.

---

## Resolved decisions referenced by these epics

| Decision | Source |
|---|---|
| iOS 15 minimum, SwiftUI, `ASWebAuthenticationSession`, AppAuth-iOS | Spec section 4 + section 12 |
| Universal Links required for MitID return | Spec section 4 |
| Keychain accessibility = `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` | Spec section 4 |
| `pricing.type = "VARIABLE"` on MobilePay | Spec section 4 |
| Currency unit on price tile = øre/kWh | Spec section 4 + section 12 |
| App language = Danish only in v1 | Spec section 3 + section 12 |
| Cancellation tap depth = 2 from Home | Spec section 12 |
| No reds in v1 | Spec section 8 + section 12 |
| Webhook-driven push notifications (no polling) | Spec section 12 |
| **Returning-user MitID scope = `openid profile` (not `nin`)** | **ADR-001 section 6.1** |
| Signup MitID scope = `openid profile nin` | Spec section 6 + ADR-001 section 3.2 |
