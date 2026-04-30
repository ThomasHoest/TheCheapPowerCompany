export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const faqItems: FaqItem[] = [
  {
    id: 'skift-leverandor',
    question: 'Hvordan skifter jeg til The Cheap Power Company?',
    answer:
      'Du tilmelder dig med dit MitID, og vi klarer resten. Vi kontakter din nuværende elleverandør og sørger for, at du skifter uden afbrydelser. Det tager normalt 1-2 hverdage.',
  },
  {
    id: 'mitid',
    question: 'Hvorfor skal jeg bruge MitID?',
    answer:
      'MitID bruges til at bekræfte din identitet og give os adgang til at administrere din elaftale. Det er den sikre og lovpligtige måde at identificere sig digitalt i Danmark.',
  },
  {
    id: 'mobilepay',
    question: 'Hvordan fungerer betaling med MobilePay?',
    answer:
      'Du godkender et fast månedligt abonnement via MobilePay. Abonnementet dækker vores servicetillæg. Selve strømforbruget afregnes direkte med netselskabet baseret på din målte forbrug.',
  },
  {
    id: 'energinet',
    question: 'Hvad er energinet.dk?',
    answer:
      'Energinet er den danske systemoperatør, der driver el- og gasnettet i Danmark. De publicerer spotpriser og forbrugsdata, som vi bruger til at beregne din pris. Data er åbent tilgængeligt under CC BY 4.0-licensen via Energi Data Service.',
  },
  {
    id: 'flytning',
    question: 'Hvad sker der, hvis jeg flytter?',
    answer:
      'Kontakt os, når du kender din nye adresse, og vi opdaterer din aftale. Hvis din nye adresse er i et andet prisområde (DK1 eller DK2), justerer vi prisen tilsvarende. Der er ingen gebyr ved flytning.',
  },
  {
    id: 'afmelding',
    question: 'Hvordan opsiger jeg min aftale?',
    answer:
      'Du kan opsige din aftale når som helst — der er ingen binding og ingen opsigelsesfrist. Send os en mail eller gør det via appen, og vi sørger for at overdrage dig til en ny leverandør inden for 1-2 hverdage.',
  },
];
