# ADR-002 — Marketing Site: Azure Hosting, CI/CD Pipeline, and Infrastructure

**Status:** Accepted  
**Date:** 2026-04-29  
**Deciders:** Engineering  
**Relates to:** `docs/specifications/marketing-site.md`, `docs/specifications/ADR-001-system-architecture.md`

---

## Context

The Marketing Site specification (Open Question 6) deferred the hosting decision to Engineering with a default assumption of "Vercel or Netlify." The system architecture (ADR-001) chose **Microsoft Azure** as the cloud platform. This ADR resolves Open Question 6 and the related infrastructure questions — staging vs production environments, CI/CD pipeline, and onboarding URL structure (Open Question 7) — within the Azure constraint.

The Marketing Site has the following technical characteristics that shape the hosting choice:

- Server-side rendering (SSR) is required for SEO, live-rate widget freshness on initial page load, and structured data (ADR-001 §3.4; NFR — "Server-rendered HTML for all marketing content").
- Traffic is moderate and bursty (marketing campaigns). Cold-start latency under 2 s is acceptable; sustained high load is unlikely.
- The live-rate widget calls the internal pricing API (never Energi Data Service directly) — one lightweight API call per visitor per 15-minute cycle.
- Total budget pressure is high: this is a startup. The hosting cost should be near zero for low traffic and scale linearly.
- Two isolated environments are required: **staging** (for integration testing, stakeholder review) and **production** (public).
- PR preview environments dramatically speed up review cycles and are a hard requirement.
- Custom domains with managed SSL are required for both environments.

---

## Options Considered

| Option | Monthly cost (est.) | SSR | PR previews | CDN included | Notes |
|---|---|---|---|---|---|
| **Azure Static Web Apps (Standard)** | ~$9 | Yes (hybrid, Next.js) | Yes (built-in) | Yes (Azure CDN) | Best fit |
| Azure App Service (Basic B1) | ~$13–18 | Yes (full Node) | No (manual) | No (add-on) | Overkill, no PR previews |
| Azure Container Apps | ~$0–30+ | Yes (any runtime) | Manual (slots) | No (add-on) | Complex, cold starts |
| Azure CDN + Blob Storage | ~$1–3 | No | No | Yes | Static only — rules out SSR |
| Vercel / Netlify | ~$20–45/mo (Pro) | Yes | Yes | Yes | Outside Azure constraint |

**Azure Static Web Apps (Standard tier)** is the only Azure option that combines SSR, built-in PR preview channels, integrated CDN, and sub-$10/month cost.

---

## Decision

**Host the Marketing Site on Azure Static Web Apps (Standard tier), using GitHub Actions for CI/CD, with separate named deployment environments for staging and production, and automatic ephemeral preview channels per pull request.**

---

## Architecture Details

### Azure Static Web Apps Configuration

| Parameter | Value |
|---|---|
| Tier | Standard (~$9 USD/month) |
| Region | West Europe (Amsterdam — lowest latency to Denmark) |
| Framework | Next.js App Router with hybrid (SSR + static) output |
| SSR runtime | Managed Azure Functions (provisioned automatically by SWA for Next.js hybrid mode) |
| CDN | Azure CDN included in Standard tier; Points of Presence serve cached static assets globally |
| Custom domain (production) | `tcpc.dk` (or final registered domain) |
| Custom domain (staging) | `staging.tcpc.dk` |
| SSL | Managed certificates (auto-renewed, free, included in SWA) |

### Environment Strategy

Two named SWA environments share one Azure Static Web App resource:

```
Azure Static Web Apps resource: swa-marketing-prod
├── production environment  → tcpc.dk          (branch: main)
├── staging environment     → staging.tcpc.dk  (branch: develop)
└── PR preview channels     → <hash>.azurestaticapps.net  (automatic per PR)
```

Using a single SWA resource with named environments avoids paying twice and keeps configuration (env vars, custom domains) centralised. The Standard tier supports multiple named environments plus unlimited ephemeral PR preview channels.

**Environment variable isolation:**

| Variable | Production | Staging |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_PRICE_API_BASE_URL` | `https://api.tcpc.dk/v1` | `https://api.staging.tcpc.dk/v1` |
| `NEXT_PUBLIC_ONBOARDING_URL` | `https://tilmeld.tcpc.dk` (or `https://tcpc.dk/signup`) | `https://tilmeld.staging.tcpc.dk` |
| `PLAUSIBLE_DOMAIN` | `tcpc.dk` | `staging.tcpc.dk` |
| `NEXT_PUBLIC_SIGNUP_DISABLED` | `false` (default) | Toggleable for maintenance windows |

Env vars are configured in the Azure Portal (SWA → Configuration → Application settings) per environment. GitHub Actions does not receive production secrets — the SWA deployment token is sufficient.

### CI/CD Pipeline

GitHub Actions is the CI/CD runtime. Azure Static Web Apps generates and commits a starter workflow automatically when linked to the GitHub repository via the Azure Portal. The team will extend this workflow.

**Full pipeline (`.github/workflows/azure-static-web-apps.yml`):**

```yaml
# Triggered on: push to main (production), push to develop (staging),
#               pull_request (PR preview), pull_request closed (cleanup)
on:
  push:
    branches: [main, develop]
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches: [main, develop]

jobs:
  build_and_deploy:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test:unit          # fast unit tests
      - run: pnpm build
      - uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}       # PR comments with preview URL
          action: upload
          app_location: /
          output_location: .next          # Next.js build output
          deployment_environment: ${{ github.ref == 'refs/heads/main' && 'production' || github.ref == 'refs/heads/develop' && 'staging' || '' }}
      # Post-deploy: Playwright + Lighthouse (against the preview URL)
      - run: pnpm test:e2e --base-url=${{ steps.deploy.outputs.static_web_app_url }}
      - run: pnpm lighthouse:ci --url=${{ steps.deploy.outputs.static_web_app_url }}

  cleanup_pr:
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    steps:
      - uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: close
```

**Pipeline stages and gates:**

| Stage | Runs on | Blocks merge if failing |
|---|---|---|
| `pnpm lint` | Every push/PR | Yes |
| `pnpm test:unit` | Every push/PR | Yes |
| `pnpm build` | Every push/PR | Yes |
| Azure SWA deploy | Every push/PR | Yes (preview URL required for review) |
| `pnpm test:e2e` | Against deployed preview URL | Yes |
| `lighthouse:ci` | Against deployed preview URL | Yes (LCP < 2.5s, Perf ≥ 90, A11y ≥ 95, weight < 500 KB) |
| `pnpm test:e2e` (smoke) against staging | On push to `main` only | No (alert only — prod already live) |

**Deployment flow:**

```
Developer pushes branch
        ↓
GitHub Actions: lint → test → build
        ↓
Azure SWA deploys to ephemeral preview channel
        ↓
GitHub bot comments preview URL on PR
        ↓
Playwright + Lighthouse run against preview URL
        ↓
PR approved and merged to develop
        ↓
GitHub Actions: same pipeline → deploys to staging environment (staging.tcpc.dk)
        ↓
Stakeholder acceptance on staging.tcpc.dk
        ↓
PR opened: develop → main
        ↓
Same pipeline → deploys to production (tcpc.dk)
```

### Next.js on Azure Static Web Apps

Azure Static Web Apps supports Next.js hybrid rendering (App Router + SSR) via the `@azure/static-web-apps-cli` build step. The SWA build system detects Next.js automatically when `framework_version: "detect"` is set in `staticwebapp.config.json`.

**Required configuration (`staticwebapp.config.json`):**

```json
{
  "platform": {
    "apiRuntime": "node:20"
  },
  "navigationFallback": {
    "rewrite": "/api/fallback"
  },
  "routes": [
    { "route": "/health", "statusCode": 200 }
  ],
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
  },
  "responseOverrides": {
    "404": {
      "rewrite": "/404",
      "statusCode": 404
    }
  }
}
```

Security headers are set globally in `staticwebapp.config.json` rather than per-page in Next.js `headers()`, since SWA injects them at the CDN edge before the response leaves Azure.

### Onboarding URL Structure (Open Question 7)

**Decision: Same primary domain, path `/signup`.**

Rationale:
- Avoids cross-origin complexity for future shared cookies or state.
- Brand consistency: one domain in all marketing copy.
- Simplest infrastructure: one SWA, one custom domain.
- The Onboarding Flow can be deployed as a separate Next.js app mounted at `/signup` via SWA routing rules, or collocated in a monorepo `apps/onboarding` workspace and proxied from the marketing SWA.
- If Onboarding outgrows the marketing SWA, it can be split to a subdomain (`tilmeld.tcpc.dk`) with a redirect rule added to `staticwebapp.config.json` — zero marketing-site code change.

`NEXT_PUBLIC_ONBOARDING_URL` = `https://tcpc.dk/signup` in production.

---

## Resolution of All 12 Open Questions

| # | Question | Decision | Owner |
|---|---|---|---|
| 1 | Exact markup amount | Placeholder in code (`content/pricing.ts`). Lock before launch. | Product / Commercial |
| 2 | Subscription fees (weekly, monthly) | Placeholder in `content/pricing.ts`. Lock before launch. | Product / Commercial |
| 3 | Binding period | **"Ingen binding"** confirmed as default. If policy changes, update `content/pricing.ts`. | Legal / Product |
| 4 | Companion app store availability at launch | **"Kommer snart"** badge state shipped in v1. Flip to live badges when store URLs available via env vars. | App team |
| 5 | Analytics vendor | **Plausible** confirmed. Cookie-less (`plausible.io`; self-hosted option available). No consent banner required for analytics. Cookie banner (`/cookies` page) still ships for completeness. | Engineering |
| 6 | Hosting choice | **Azure Static Web Apps Standard (~$9/month)**. West Europe region. See full architecture above. | Engineering |
| 7 | Onboarding URL (subdomain vs path) | **Same domain, `/signup` path**. `NEXT_PUBLIC_ONBOARDING_URL=https://tcpc.dk/signup`. Subdomain migration possible later with no code change. | Engineering / Architecture |
| 8 | 24-hour sparkline in hero | **Deferred to v1.1.** Ship v1 with current rate number and timestamp only. | Design / Product |
| 9 | Postal-code price estimate | **Deferred to v2.** | Product |
| 10 | English-language version | **Deferred to v2.** Danish-only at launch. | Product |
| 11 | CVR and legal entity name | Placeholder in `content/legal.ts`. Legal must provide before launch. | Founders / Legal |
| 12 | FAQ content | Spec-writer starter set (5 Q&A) committed to `content/faq.ts`. Product owner to review and extend before launch. | Product / Support |

---

## Consequences

### Positive

- **$9/month** for full staging + production + unlimited PR previews + CDN + SSL — lowest cost Azure option with SSR.
- **Zero CI/CD infrastructure to manage** — GitHub Actions + Azure SWA is a managed service. No self-hosted runners, no pipeline VMs.
- **PR preview URLs are automatic** — every PR gets a unique preview URL and a GitHub bot comment. No manual deploy steps for reviewers.
- **Consistent with ADR-001** — stays within Azure; no third-party PaaS exceptions to justify.
- **Lighthouse gates in CI** prevent performance and accessibility regressions from reaching production.
- **Plausible** analytics requires no cookie consent banner, reducing legal complexity and CLS from a consent modal.

### Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Azure Static Web Apps Next.js SSR cold-start adds latency | Medium | Use `next/cache` aggressively for price API responses; ISR (Incremental Static Regeneration) for pages where SSR is not required; monitor LCP in CI. |
| SWA Next.js hybrid support lags behind Next.js releases | Low | Pin Next.js version; monitor Azure SWA changelog. If blocked, fall back to App Service with a container. |
| `NEXT_PUBLIC_ONBOARDING_URL` misconfigured in production | Medium | Build fails if variable unset (T-0401). Verified by E2E test asserting CTA href. |
| Plausible outage | Low | Analytics loaded async; errors swallowed (T-0704). Site unaffected. |

---

## Implementation Notes for Epic E-01 Task T-0102

Task T-0102 (hosting setup) is updated as follows:

> Configure Azure Static Web Apps (Standard tier) in West Europe region and wire GitHub Actions CI/CD:
> - Create SWA resource via Azure Portal; link to GitHub repository; confirm auto-generated workflow committed to `.github/workflows/`.
> - Add named `staging` environment in SWA configuration; map `develop` branch to staging environment.
> - Configure custom domains: `tcpc.dk` (production), `staging.tcpc.dk` (staging) with managed SSL certificates.
> - Add `AZURE_STATIC_WEB_APPS_API_TOKEN` to GitHub repository secrets.
> - Add all environment variables to SWA Configuration → Application settings for each environment (see table above).
> - Commit `staticwebapp.config.json` with security headers and 404 rewrite rule.
> - Extend auto-generated GitHub Actions workflow with lint, unit test, E2E (Playwright), and Lighthouse CI steps.
> - Verify: two consecutive PRs produce unique preview URLs posted as GitHub PR comments; `develop` push deploys to `staging.tcpc.dk` over HTTPS; `main` push deploys to `tcpc.dk` over HTTPS.
>
> DoD: staging and production environments both serve the starter Next.js page over HTTPS on custom domains; PR preview URL generated within 3 minutes of opening a PR; Lighthouse CI gate blocks a deliberately slow PR.

---

## References

- [Azure Static Web Apps pricing](https://azure.microsoft.com/en-us/pricing/details/app-service/static/)
- [Azure Static Web Apps — Next.js hybrid rendering](https://learn.microsoft.com/en-us/azure/static-web-apps/deploy-nextjs-hybrid)
- [Azure Static Web Apps — deployment environments](https://learn.microsoft.com/en-us/azure/static-web-apps/review-publish-pull-requests)
- [Azure Static Web Apps — custom domains](https://learn.microsoft.com/en-us/azure/static-web-apps/custom-domain)
- [Azure/static-web-apps-deploy GitHub Action](https://github.com/Azure/static-web-apps-deploy)
- [Plausible Analytics — self-hosted](https://plausible.io/docs/self-hosting)
- `docs/specifications/marketing-site.md` — source specification
- `docs/specifications/ADR-001-system-architecture.md` — system-level Azure decision
