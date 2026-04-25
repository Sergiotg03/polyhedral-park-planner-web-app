export type ScoringCardDefinition = {
  id: string;
  title: string;
  imageFile: string;
};

// cartas de puntuacion
export const SCORING_CARDS: ReadonlyArray<ScoringCardDefinition> = [
  {
    id: '01-un-camino-largo-y-sinuoso',
    title: 'Un camino largo y sinuoso',
    imageFile: '01-un-camino-largo-y-sinuoso.png',
  },
  {
    id: '02-el-bosque-de-los-cien-acres',
    title: 'El bosque de los cien acres',
    imageFile: '02-el-bosque-de-los-cien-acres.png',
  },
  {
    id: '03-de-mar-a-mar',
    title: 'De mar a mar',
    imageFile: '03-de-mar-a-mar.png',
  },
  {
    id: '04-los-mejores-asientos-de-la-casa',
    title: 'Los mejores asientos de la casa',
    imageFile: '04-los-mejores-asientos-de-la-casa.png',
  },
  {
    id: '05-fronteras-naturales',
    title: 'Fronteras naturales',
    imageFile: '05-fronteras-naturales.png',
  },
  {
    id: '06-puentes-sobre-aguas-turbulentas',
    title: 'Puentes sobre aguas turbulentas',
    imageFile: '06-puentes-sobre-aguas-turbulentas.png',
  },
  {
    id: '07-un-lugar-sombreado-para-descansar',
    title: 'Un lugar sombreado para descansar',
    imageFile: '07-un-lugar-sombreado-para-descansar.png',
  },
  {
    id: '08-de-pesca',
    title: 'De pesca',
    imageFile: '08-de-pesca.png',
  },
  {
    id: '09-centro-de-atencion',
    title: 'Centro de atencion',
    imageFile: '09-centro-de-atencion.png',
  },
  {
    id: '10-un-poco-de-todo',
    title: 'Un poco de todo',
    imageFile: '10-un-poco-de-todo.png',
  },
  {
    id: '11-un-paseo-para-recordar',
    title: 'Un paseo para recordar',
    imageFile: '11-un-paseo-para-recordar.png',
  },
  {
    id: '12-paradas-frecuentes',
    title: 'Paradas frecuentes',
    imageFile: '12-paradas-frecuentes.png',
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
