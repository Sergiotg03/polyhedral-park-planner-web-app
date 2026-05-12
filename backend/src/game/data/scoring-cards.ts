export type ScoringCardDefinition = {
  id: string;
  title: string;
  soloTarget: number;
};

// cartas de puntuacion
export const SCORING_CARDS: ReadonlyArray<ScoringCardDefinition> = [
  {
    id: '01-un-camino-largo-y-sinuoso',
    title: 'Un camino largo y sinuoso',
    soloTarget: 11,
  },
  {
    id: '02-el-bosque-de-los-cien-acres',
    title: 'El bosque de los cien acres',
    soloTarget: 12,
  },
  {
    id: '03-de-mar-a-mar',
    title: 'De mar a mar',
    soloTarget: 13,
  },
  {
    id: '04-los-mejores-asientos-de-la-casa',
    title: 'Los mejores asientos de la casa',
    soloTarget: 14,
  },
  {
    id: '05-fronteras-naturales',
    title: 'Fronteras naturales',
    soloTarget: 14,
  },
  {
    id: '06-puentes-sobre-aguas-turbulentas',
    title: 'Puentes sobre aguas turbulentas',
    soloTarget: 15,
  },
  {
    id: '07-un-lugar-sombreado-para-descansar',
    title: 'Un lugar sombreado para descansar',
    soloTarget: 16,
  },
  {
    id: '08-de-pesca',
    title: 'De pesca',
    soloTarget: 18,
  },
  {
    id: '09-centro-de-atencion',
    title: 'Centro de atencion',
    soloTarget: 16,
  },
  {
    id: '10-un-poco-de-todo',
    title: 'Un poco de todo',
    soloTarget: 14,
  },
  {
    id: '11-un-paseo-para-recordar',
    title: 'Un paseo para recordar',
    soloTarget: 12,
  },
  {
    id: '12-paradas-frecuentes',
    title: 'Paradas frecuentes',
    soloTarget: 20,
  },
];

// selecciona cartas distintas para una partida nueva
export function selectRandomScoringCards(random = Math.random) {
  const availableCards = [...SCORING_CARDS];
  const selectedCards: ScoringCardDefinition[] = [];

  while (selectedCards.length < 3 && availableCards.length > 0) {
    const randomIndex = Math.floor(random() * availableCards.length);
    const [selectedCard] = availableCards.splice(randomIndex, 1);

    selectedCards.push(selectedCard);
  }

  return selectedCards;
}
