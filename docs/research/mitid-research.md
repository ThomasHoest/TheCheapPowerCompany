# Research: MitID Authentication

## Summary

MitID is Denmark's national digital identity system, operated by the non-profit Nets/Digitaliseringsstyrelsen partnership. Private companies cannot integrate MitID directly — they must connect through a certified commercial broker (there are 12 in Denmark). The broker-to-app integration is OIDC-based (Authorization Code Flow + PKCE). On iOS, the authentication must run inside `SFSafariViewController` with Universal Links for the app-switch-back flow; WKWebView is explicitly forbidden. MitID can be used for identity verification at signup (CPR matching via a broker add-on), making it a complete identity onboarding solution for a power brokerage that needs verified Danish customer accounts.

---

## What is MitID

MitID is the Danish national digital identity system replacing NemID. It is operated by a partnership between Digitaliseringsstyrelsen (Agency for Digital Government) and Nets. All Danish citizens and residents can obtain a MitID, which is used for login and identity verification across public and private services. The identity assurance level is equivalent to EU eIDAS "High".

---

## Integration Architecture Options

### Direct vs Broker

**Direct integration is not permitted.** All service providers — public and private — must go through a certified MitID broker. This is a legal requirement set by Digitaliseringsstyrelsen.

- Source: [Become a broker — MitID](https://www.mitid.dk/en-gb/broker/become-a-broker-contact/)
- Source: [Get started — MitID Broker](https://www.mitid.dk/en-gb/broker/get-started/)

**NemLog-in3 is the government broker — not for private companies.** NemLog-in3 is the government-operated MitID broker used exclusively for public sector services. Private companies use the commercial certified brokers.

### Certified Brokers (12 total)

The officially confirmed list lives at [digst.dk](https://digst.dk/it-loesninger/mitid/til-brokere/liste-over-godkendte-brokere/). Confirmed brokers:

| Broker | Notes |
|---|---|
| **Signicat** | Best English documentation, self-serve sandbox Dashboard, recommended |
| **Signaturgruppen / Nets eID Broker** | Technically strong, GitHub docs, more enterprise/bank oriented |
| **Idura** (formerly Criipto) | Public pricing model visible, solid option |
| **ZignSec** | Developer docs at docs.zignsec.com |
| IN Groupe | Less documentation available |

### Recommended Broker: Signicat

Signicat is recommended for The Cheap Power Company because:
1. Most complete public developer documentation in English, including a dedicated MitID iOS app-switching guide
2. Free sandbox account with no upfront commitment — development can begin before contracts are signed
3. Won the Denmark digital ID wallet and mDL contract in December 2025 — strong long-term position
4. Standard OIDC (Authorization Code + PKCE) — integrates with any modern OIDC library

**Second choice:** Signaturgruppen/Nets eID Broker — technically capable, GitHub-hosted demo repos, but harder to navigate.

---

## iOS Mobile Integration

**No native SDK — must use `SFSafariViewController` or `ASWebAuthenticationSession`.** WKWebView and UIWebView are explicitly prohibited because they break the MitID app-switch mechanism.

### Required iOS Flow
1. Open authorization URL in `SFSafariViewController` (or `ASWebAuthenticationSession`)
2. User taps "Open MitID App" → MitID app authenticates
3. Universal Link fires → app resumes
4. `SFSafariViewController` closes via OIDC `redirect_uri`

### App-Switch OIDC Parameter

Pass `idp_params` on the authorization request to trigger app switching:

```json
{
  "mitid": {
    "enable_app_switch": true,
    "app_switch_os": "ios",
    "app_switch_url": "https://your.universallink.url/"
  }
}
```

This must be URL-encoded and passed as a query parameter on the authorization request.

### iOS Requirements
- iPhone 6S or newer
- iOS 15+
- MitID app installed

### Recommended iOS Library
Use **AppAuth-iOS** or a similar OIDC library to manage token exchange. Register the app's Universal Link domain with the broker before going to production.

Sources:
- [Signicat App Switching guide](https://developer.signicat.com/identity-methods/mitid/integration-guide/app-switching/)
- [Signaturgruppen App MitID Integration](https://signaturgruppen-a-s.github.io/signaturgruppen-broker-documentation/idps/app-mitid-integration.html)

---

## Web Integration

Standard OIDC Authorization Code + PKCE flow with server-side token exchange. Use the broker's discovery URL to auto-configure endpoints.

### Signicat OIDC Endpoints

| Endpoint | URL Pattern |
|---|---|
| Discovery | `https://<YOUR_DOMAIN>.signicat.com/auth/open/.well-known/openid-configuration` |
| Authorize | `https://<YOUR_DOMAIN>.signicat.com/auth/open/connect/authorize` |
| Token | `https://<YOUR_DOMAIN>.signicat.com/auth/open/connect/token` |

### Signaturgruppen (Nets eID Broker) Pre-Production Endpoints

| Endpoint | URL |
|---|---|
| Admin portal | `https://pp.netseidbroker.dk/admin` |
| Authorize | `https://pp.signaturgruppen.dk/op/connect/authorize` |
| Token | `https://pp.signaturgruppen.dk/op/connect/token` |

### OIDC Claims Returned (Signicat, scopes: `openid profile nin`)

| Claim | Description |
|---|---|
| `sub` | Unique subject identifier |
| `mitid.uuid` | MitID UUID |
| `given_name` | First name |
| `family_name` | Last name |
| `name` | Full name |
| `birthdate` | Date of birth |
| `nin` | National ID number |
| `nin_type` | Type of national ID |
| `nin_issuing_country` | Country |
| `mitid.ial` | Identity Assurance Level |
| `mitid.aal` | Authentication Assurance Level |
| `mitid.loa` | Level of Assurance |
| `mitid.has_cpr` | Whether a CPR is associated (does NOT return CPR value) |

---

## Identity Verification at Signup

**CPR is NOT directly returned to private service providers.** Instead use the **CPR Match API** (broker add-on):

1. User authenticates with MitID
2. User is asked to enter their CPR number
3. The broker matches it against the authenticated MitID identity
4. Service provider receives a confirm/deny match result

This is sufficient for contract-signing purposes and is the standard approach for Danish private-sector services.

> **Legal note:** Storing or processing CPR numbers may have GDPR implications. Legal review required before implementation.

---

## Costs and Onboarding Process

### Costs
- **Danish state fee:** 0.28 DKK per MitID verification (confirmed)
- **Broker fees:** Not publicly listed by Signicat or Nets/Signaturgruppen. Require a sales conversation. Idura/Criipto has a visible monthly/yearly subscription model plus state fee.

### Onboarding Process (Signicat)
1. Choose a certified broker and sign service agreement
2. Broker registers your service/client in their admin portal
3. Configure OIDC client (redirect URIs, scopes, app-switch URL)
4. Test in pre-production using MitID Test Tool
5. Broker promotes configuration to production

No direct contract with Digitaliseringsstyrelsen is required — the broker handles compliance.

Source: [6 steps to get ready for MitID — Signicat blog](https://www.signicat.com/blog/6-steps-to-get-your-services-ready-for-mitid)

---

## Test Environment / Sandbox

| Resource | URL |
|---|---|
| MitID PP Test Tool | `https://pp.mitid.dk/test-tool/frontend/` |
| Signicat sandbox Dashboard | Available after free account signup |
| Signaturgruppen PP admin | `https://pp.netseidbroker.dk/admin` |

Use AUTOFILL + CREATE IDENTITY in the MitID Test Tool to create test identities.

---

## Recommended Approach

1. **Broker:** Start with Signicat — create a free sandbox account immediately to begin development.
2. **iOS:** `ASWebAuthenticationSession` + Universal Links + `idp_params` app-switch flag + AppAuth-iOS for token exchange.
3. **Web:** Standard OIDC Authorization Code + PKCE, server-side token exchange using Signicat's discovery URL.
4. **Signup identity verification:** MitID authentication + CPR Match add-on. Do not attempt to store raw CPR — confirm/deny match is sufficient for onboarding.
5. **Legal review:** Commission a GDPR assessment for CPR handling before launch.

---

## Open Questions

1. Broker pricing — requires sales conversation with Signicat and at least one alternative for comparison.
2. CPR data handling GDPR compliance — needs legal review.
3. Whether Eloverblik.dk access (meter data) requires a separate MitID delegation flow from customers.
4. Whether business customers (MitID Erhverv / CVR-linked) need to be supported in v1.
5. Full current list of 12 certified brokers — cross-check at digst.dk before finalising broker selection.

---

## Sources

- [MitID broker overview — mitid.dk](https://www.mitid.dk/en-gb/about-mitid/mitid-broker/)
- [Get started as service provider — MitID](https://www.mitid.dk/en-gb/broker/get-started/)
- [Digitaliseringsstyrelsen approved broker list](https://digst.dk/it-loesninger/mitid/til-brokere/liste-over-godkendte-brokere/)
- [Signicat MitID Broker product page](https://www.signicat.com/products/mitid-broker)
- [Signicat MitID integration guide](https://developer.signicat.com/identity-methods/mitid/integration-guide/)
- [Signicat OIDC for MitID](https://developer.signicat.com/identity-methods/mitid/integration-guide/oidc-mitid/)
- [Signicat app-switching guide](https://developer.signicat.com/identity-methods/mitid/integration-guide/app-switching/)
- [Signicat attributes reference](https://developer.signicat.com/identity-methods/mitid/attributes-reference/)
- [Signicat MitID test in Dashboard](https://developer.signicat.com/identity-methods/mitid/test/)
- [Signaturgruppen/Nets eID Broker documentation](https://signaturgruppen-a-s.github.io/signaturgruppen-broker-documentation/idps/mitid.html)
- [Signaturgruppen app MitID integration](https://signaturgruppen-a-s.github.io/signaturgruppen-broker-documentation/idps/app-mitid-integration.html)
- [Nets eID Broker Technical Reference PDF](https://www.signaturgruppen.dk/download/broker/docs/Nets%20eID%20Broker%20Technical%20Reference.pdf)
- [Nets eID Broker demo GitHub repo](https://github.com/Signaturgruppen-A-S/nets-eID-broker-demo)
- [Idura (formerly Criipto) MitID broker](https://idura.eu/blog/mitid-broker)
- [NemLog-in components — digst.dk](https://en.digst.dk/systems/nemlog-in/nemlog-in-components/)
- [MitID Test Tool (PP environment)](https://pp.mitid.dk/test-tool/frontend/)
- [6 steps to get ready for MitID — Signicat blog](https://www.signicat.com/blog/6-steps-to-get-your-services-ready-for-mitid)
- [ZignSec MitID developer docs](https://docs.zignsec.com/eids/mitid-dk/)
