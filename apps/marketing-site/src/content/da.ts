export const da = {
  nav: {
    howItWorks: 'Sådan virker det',
    pricing: 'Pris',
    app: 'App',
    faq: 'FAQ',
    cta: 'Tilmeld dig',
    menuOpen: 'Åbn menu',
    menuClose: 'Luk menu',
  },
  hero: {
    eyebrow: 'Velkommen til The Cheap Power Company',
    headline: 'Strøm til spotpris. Plus et lille fast tillæg. Det er det.',
    subheadline:
      'Vi køber strøm på det åbne marked og vidersælger den til dig med maksimal gennemsigtighed.',
    trustRow: ['Ingen binding', 'MitID-login', 'MobilePay-betaling'],
  },
  price: {
    eyebrow: 'AKTUEL PRIS LIGE NU',
    unit: 'øre/kWh',
    explainer: 'Prisen følger spotprisen på det danske elmarked plus vores tillæg.',
    loading: 'Aktuel pris hentes…',
    error: 'Prisen er midlertidigt utilgængelig — prøv igen om lidt',
    noJs: 'Aktiver JavaScript for at se den aktuelle pris',
    attribution: 'Datakilde: Energi Data Service / Energinet (CC BY 4.0)',
    attributionUrl: 'https://www.energidataservice.dk',
  },
  howItWorks: {
    heading: 'Sådan virker det',
    steps: [
      {
        title: 'Tilmeld med MitID',
        body: 'Brug dit MitID til at bekræfte din identitet. Det tager under to minutter.',
      },
      {
        title: 'Godkend MobilePay-abonnement',
        body: 'Godkend dit månedlige abonnement sikkert med MobilePay.',
      },
      {
        title: 'Få strøm til spotpris',
        body: 'Du betaler spotprisen plus vores faste tillæg. Ingen skjulte gebyrer.',
      },
    ],
  },
  pricing: {
    heading: 'Prisen er enkel',
    markupLabel: 'Vores tillæg',
    markupUnit: 'øre/kWh',
    monthlyLabel: 'Månedligt abonnement',
    weeklyLabel: 'Ugentligt abonnement',
    recommendedBadge: 'Anbefalet',
    noBinding: 'Ingen binding. Ingen skjulte gebyrer. Ingen udmeldelsesgebyr.',
    exampleHeading: 'Hvad koster det for en typisk husstand?',
    cta: 'Tilmeld dig',
  },
  app: {
    heading: 'Din strøm i lommen',
    subheading: 'Med vores app kan du altid se din aktuelle pris og løbende regning.',
    features: ['Se din aktuelle kWh-pris i realtid', 'Se din løbende regning'],
    comingSoon: 'Kommer snart',
    appStoreAlt: 'Hent på App Store',
    googlePlayAlt: 'Hent på Google Play',
    appStoreComingSoonAlt: 'Appen kommer snart',
  },
  finalCta: {
    heading: 'Klar til billigere strøm?',
    cta: 'Tilmeld dig nu',
  },
  skipToContent: 'Spring til indhold',
  footer: {
    tagline: 'Strøm til spotpris. Ingen binding.',
    columns: {
      product: {
        heading: 'Produkt',
        links: [
          { label: 'Sådan virker det', href: '#sadan-virker-det' },
          { label: 'Pris', href: '#pris' },
          { label: 'App', href: '#app' },
        ],
      },
      company: {
        heading: 'Selskab',
        links: [{ label: 'Kontakt', href: 'mailto:support@tcpc.dk' }],
      },
      legal: {
        heading: 'Juridisk',
        links: [
          { label: 'Handelsbetingelser', href: '/handelsbetingelser' },
          { label: 'Privatlivspolitik', href: '/privatlivspolitik' },
          { label: 'Cookies', href: '/cookies' },
        ],
      },
    },
  },
} as const;
