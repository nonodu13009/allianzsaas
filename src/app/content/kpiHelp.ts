export const kpiHelp = {
  actes: "Total des actes saisis dans le mois.",
  caBrut: "Somme des primes brutes du mois.",
  caPondere: {
    title: "CA pondéré",
    body: (
      `Somme des primes pondérées du mois. Calcul: primePondérée = arrondiEuro(primeBrute × tauxOrigine).\n` +
      `Taux: Proactif 100 %, Réactif 50 %, Prospection 120 %.`
    )
  },
  commission: {
    title: "Commission",
    body: "Commission estimée selon le barème sur CA pondéré du mois (taux appliqué dès le 1er euro).",
    table: [
      ["0 → 6 000 €", "0 %"],
      ["6 001 → 10 000 €", "2 %"],
      ["10 001 → 14 000 €", "3 %"],
      ["14 001 → 18 000 €", "4 %"],
      ["≥ 18 001 €", "6 %"],
    ],
  },
} as const;


