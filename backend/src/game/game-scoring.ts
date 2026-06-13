import { INFO_BOOTH_COLUMN, INFO_BOOTH_ROW } from './data/park-sheets';
import type {
  DevelopmentType,
  GameState,
  ParkCellState,
  ScoreState,
  ScoringCardScoreState,
  VictoryRequirementState,
} from './game-state';

type Direction = {
  row: number;
  column: number;
};

const ORTHOGONAL_DIRECTIONS: Direction[] = [
  { row: -1, column: 0 },
  { row: 1, column: 0 },
  { row: 0, column: -1 },
  { row: 0, column: 1 },
];

const DIAGONAL_DIRECTIONS: Direction[] = [
  { row: -1, column: -1 },
  { row: -1, column: 1 },
  { row: 1, column: -1 },
  { row: 1, column: 1 },
];

const ALL_DIRECTIONS = [...ORTHOGONAL_DIRECTIONS, ...DIAGONAL_DIRECTIONS];

// crea una clave sencilla para guardar casillas en sets
function getCellKey(cell: Pick<ParkCellState, 'row' | 'column'>) {
  return `${cell.row}-${cell.column}`;
}

// devuelve todas las casillas en una lista plana
function getAllCells(state: GameState) {
  return state.board.flat();
}

// busca una casilla por fila y columna
function getCell(state: GameState, row: number, column: number) {
  return state.board[row - 1]?.[column - 1] ?? null;
}

// mira si la casilla tiene un elemento concreto
function hasDevelopment(
  state: GameState,
  row: number,
  column: number,
  developmentType: DevelopmentType,
) {
  return getCell(state, row, column)?.development === developmentType;
}

// devuelve las casillas vecinas segun las direcciones que se indiquen
function getNeighborCells(
  state: GameState,
  cell: ParkCellState,
  directions = ORTHOGONAL_DIRECTIONS,
) {
  return directions
    .map((direction) =>
      getCell(state, cell.row + direction.row, cell.column + direction.column),
    )
    .filter((neighbor): neighbor is ParkCellState => Boolean(neighbor));
}

// comprueba si la casilla esta en el borde del tablero
function isBorderCell(cell: ParkCellState) {
  return (
    cell.row === 1 || cell.row === 9 || cell.column === 1 || cell.column === 9
  );
}

// comprueba si la casilla es una de las cuatro esquinas
function isCornerCell(cell: ParkCellState) {
  const isTopOrBottom = cell.row === 1 || cell.row === 9;
  const isLeftOrRight = cell.column === 1 || cell.column === 9;

  return isTopOrBottom && isLeftOrRight;
}

// comprueba si una casilla toca ortogonalmente el puesto de informacion
function isOrthogonallyAdjacentToInfoBooth(cell: ParkCellState) {
  const distance =
    Math.abs(cell.row - INFO_BOOTH_ROW) +
    Math.abs(cell.column - INFO_BOOTH_COLUMN);

  return distance === 1;
}

// cuenta elementos colocados de un tipo
function countDevelopment(state: GameState, developmentType: DevelopmentType) {
  return getAllCells(state).filter(
    (cell) => cell.development === developmentType,
  ).length;
}

// comprueba si hay algo construido en la casilla
function isDevelopedCell(cell: ParkCellState) {
  return Boolean(cell.development);
}

// la vecindad del puesto son las 8 casillas alrededor de la i
function isInInfoBoothVicinity(cell: ParkCellState) {
  const isNearInfoBooth =
    Math.abs(cell.row - INFO_BOOTH_ROW) <= 1 &&
    Math.abs(cell.column - INFO_BOOTH_COLUMN) <= 1;
  const isInfoBooth =
    cell.row === INFO_BOOTH_ROW && cell.column === INFO_BOOTH_COLUMN;

  return isNearInfoBooth && !isInfoBooth;
}

// agrupa casillas conectadas ortogonalmente
function getConnectedComponents(cells: ParkCellState[]) {
  const cellMap = new Map(cells.map((cell) => [getCellKey(cell), cell]));
  const visited = new Set<string>();
  const components: ParkCellState[][] = [];

  cells.forEach((cell) => {
    const startKey = getCellKey(cell);

    if (visited.has(startKey)) {
      return;
    }

    const component: ParkCellState[] = [];
    const pendingCells = [cell];
    visited.add(startKey);

    while (pendingCells.length > 0) {
      const currentCell = pendingCells.pop();

      if (!currentCell) {
        continue;
      }

      component.push(currentCell);

      ORTHOGONAL_DIRECTIONS.forEach((direction) => {
        const nextKey = `${currentCell.row + direction.row}-${
          currentCell.column + direction.column
        }`;
        const nextCell = cellMap.get(nextKey);

        if (nextCell && !visited.has(nextKey)) {
          visited.add(nextKey);
          pendingCells.push(nextCell);
        }
      });
    }

    components.push(component);
  });

  return components;
}

// regiones conectadas de cualquier tipo de elemento
function getDevelopmentRegions(state: GameState) {
  return getConnectedComponents(getAllCells(state).filter(isDevelopedCell));
}

// una region solo puntua si toca la vecindad del puesto de informacion
function isScoringRegion(region: ParkCellState[]) {
  return region.some(isInInfoBoothVicinity);
}

// elimina del tablero las regiones que no pueden puntuar
function getStateForScoringCards(state: GameState): GameState {
  const scoringCellKeys = new Set(
    getDevelopmentRegions(state)
      .filter(isScoringRegion)
      .flat()
      .map(getCellKey),
  );

  return {
    ...state,
    board: state.board.map((row) =>
      row.map((cell) => {
        if (!cell.development || scoringCellKeys.has(getCellKey(cell))) {
          return cell;
        }

        return {
          ...cell,
          development: null,
        };
      }),
    ),
  };
}

// obtiene todas las casillas de un elemento
function getCellsByDevelopment(
  state: GameState,
  developmentType: DevelopmentType,
) {
  return getAllCells(state).filter(
    (cell) => cell.development === developmentType,
  );
}

// devuelve cuantos puentes hay de cada tipo
function getBridgeCounts(state: GameState) {
  let total = 0;
  let vertical = 0;
  let horizontal = 0;

  getCellsByDevelopment(state, 'PATH').forEach((cell) => {
    const hasWaterLeftAndRight =
      hasDevelopment(state, cell.row, cell.column - 1, 'WATER') &&
      hasDevelopment(state, cell.row, cell.column + 1, 'WATER');
    const hasWaterTopAndBottom =
      hasDevelopment(state, cell.row - 1, cell.column, 'WATER') &&
      hasDevelopment(state, cell.row + 1, cell.column, 'WATER');

    if (hasWaterLeftAndRight || hasWaterTopAndBottom) {
      total += 1;
    }

    if (hasWaterLeftAndRight) {
      vertical += 1;
    }

    if (hasWaterTopAndBottom) {
      horizontal += 1;
    }
  });

  return {
    total,
    vertical,
    horizontal,
  };
}

// calcula cuanto puntua cada banco en la carta de pesca
function getFishingBenchScores(state: GameState) {
  return getCellsByDevelopment(state, 'BENCH').map((cell) => {
    return getNeighborCells(state, cell, ALL_DIRECTIONS).filter(
      (neighbor) => neighbor.development === 'WATER',
    ).length;
  });
}

// mira si un segmento de camino esta sombreado por un arbol
function isShadedPathCell(state: GameState, cell: ParkCellState) {
  return getNeighborCells(state, cell).some(
    (neighbor) => neighbor.development === 'TREE',
  );
}

// cuenta cuantos bancos toca cada camino conectado
function getPathStopCounts(state: GameState) {
  const pathComponents = getConnectedComponents(
    getCellsByDevelopment(state, 'PATH'),
  );

  return pathComponents.map((component) => {
    const benchKeys = new Set<string>();

    component.forEach((cell) => {
      getNeighborCells(state, cell).forEach((neighbor) => {
        if (neighbor.development === 'BENCH') {
          benchKeys.add(getCellKey(neighbor));
        }
      });
    });

    return benchKeys.size;
  });
}

// cuenta la penalizacion de regiones que no tocan la vecindad del puesto
function countRegionsOutsideInfoBooth(state: GameState) {
  return getDevelopmentRegions(state).filter(
    (region) => !isScoringRegion(region),
  ).length;
}

// carta 1: camino cerrado mas largo
function scoreLongClosedPath(state: GameState) {
  const pathCells = getCellsByDevelopment(state, 'PATH');
  const components = getConnectedComponents(pathCells);
  let bestLength = 0;

  components.forEach((component) => {
    const componentKeys = new Set(component.map(getCellKey));
    const ends = component.filter((cell) => {
      const pathNeighbors = getNeighborCells(state, cell).filter((neighbor) =>
        componentKeys.has(getCellKey(neighbor)),
      );

      return pathNeighbors.length <= 1;
    });

    const isClosed = ends.every((cell) => {
      const isNearInfo = isOrthogonallyAdjacentToInfoBooth(cell);
      const isNearOtherPath = getNeighborCells(state, cell).some(
        (neighbor) =>
          neighbor.development === 'PATH' &&
          !componentKeys.has(getCellKey(neighbor)),
      );

      return isBorderCell(cell) || isNearInfo || isNearOtherPath;
    });

    if (isClosed) {
      bestLength = Math.max(bestLength, component.length);
    }
  });

  return {
    points: bestLength,
    detail: `Camino cerrado más largo: ${bestLength} segmentos`,
  };
}

// carta 2: rectangulo de arboles mas grande
function scoreLargestTreeRectangle(state: GameState) {
  let bestArea = 0;

  for (let topRow = 1; topRow <= 9; topRow += 1) {
    for (let leftColumn = 1; leftColumn <= 9; leftColumn += 1) {
      for (let bottomRow = topRow; bottomRow <= 9; bottomRow += 1) {
        for (let rightColumn = leftColumn; rightColumn <= 9; rightColumn += 1) {
          let allTrees = true;

          for (let row = topRow; row <= bottomRow; row += 1) {
            for (let column = leftColumn; column <= rightColumn; column += 1) {
              if (!hasDevelopment(state, row, column, 'TREE')) {
                allTrees = false;
              }
            }
          }

          if (allTrees) {
            const area =
              (bottomRow - topRow + 1) * (rightColumn - leftColumn + 1);
            bestArea = Math.max(bestArea, area);
          }
        }
      }
    }
  }

  return {
    points: bestArea,
    detail: `Bosque rectangular más grande: ${bestArea} árboles`,
  };
}

// carta 3: lago conectado mas grande
function scoreLargestLake(state: GameState) {
  const waterCells = getCellsByDevelopment(state, 'WATER');
  const largestLake = Math.max(
    0,
    ...getConnectedComponents(waterCells).map((component) => component.length),
  );

  return {
    points: largestLake,
    detail: `Lago conectado más grande: ${largestLake} casillas`,
  };
}

// carta 5: parejas arbol-agua en el borde
function scoreNaturalBorders(state: GameState) {
  const borderCells = [
    ...state.board[0],
    ...state.board.slice(1, 8).map((row) => row[8]),
    ...[...state.board[8]].reverse(),
    ...state.board
      .slice(1, 8)
      .map((row) => row[0])
      .reverse(),
  ];
  const pairableEdges = borderCells.map((cell, index) => {
    const nextCell = borderCells[(index + 1) % borderCells.length];
    const currentType = cell.development;
    const nextType = nextCell.development;

    return (
      (currentType === 'TREE' && nextType === 'WATER') ||
      (currentType === 'WATER' && nextType === 'TREE')
    );
  });

  const countPairsInPath = (edges: boolean[]) => {
    const dp = Array.from({ length: edges.length + 2 }, () => 0);

    for (let index = 0; index < edges.length; index += 1) {
      dp[index + 2] = Math.max(
        dp[index + 1],
        dp[index] + (edges[index] ? 1 : 0),
      );
    }

    return dp[edges.length + 1];
  };

  const withoutLastEdge = countPairsInPath(pairableEdges.slice(0, -1));
  const withLastEdge =
    pairableEdges[pairableEdges.length - 1] === true
      ? 1 + countPairsInPath(pairableEdges.slice(1, -2))
      : 0;
  const pairs = Math.max(withoutLastEdge, withLastEdge);

  return {
    points: pairs * 2,
    detail: `${pairs} parejas árbol-agua en el borde`,
  };
}

// carta 6: caminos con agua a ambos lados
function scoreBridges(state: GameState) {
  const bridges = getBridgeCounts(state);

  return {
    points: bridges.total * 3,
    detail: `${bridges.total} puentes (${bridges.vertical} verticales y ${bridges.horizontal} horizontales)`,
  };
}

// carta 7: bancos junto a al menos dos arboles
function scoreShadedBenches(state: GameState) {
  const shadedBenches = getCellsByDevelopment(state, 'BENCH').filter((cell) => {
    const treesAround = getNeighborCells(state, cell).filter(
      (neighbor) => neighbor.development === 'TREE',
    );

    return treesAround.length >= 2;
  }).length;

  return {
    points: shadedBenches * 2,
    detail: `${shadedBenches} bancos con al menos dos árboles cerca`,
  };
}

// carta 8: bancos con agua alrededor
function scoreFishing(state: GameState) {
  const benchScores = getFishingBenchScores(state);
  let points = 0;

  benchScores.forEach((value) => {
    points += value;
  });

  return {
    points,
    detail: `Agua alrededor de bancos: ${benchScores.join(' + ') || 0}`,
  };
}

// carta 9: elementos en las inmediaciones del puesto de informacion
function scoreInformationCenter(state: GameState) {
  const builtCells = getAllCells(state).filter((cell) => {
    return isInInfoBoothVicinity(cell) && Boolean(cell.development);
  }).length;

  return {
    points: builtCells * 4,
    detail: `${builtCells} elementos junto al puesto de información`,
  };
}

// carta 10: conjuntos completos de los cuatro elementos
function scoreOneOfEverything(state: GameState) {
  const treeCount = countDevelopment(state, 'TREE');
  const pathCount = countDevelopment(state, 'PATH');
  const waterCount = countDevelopment(state, 'WATER');
  const benchCount = countDevelopment(state, 'BENCH');
  const fullSets = Math.min(treeCount, pathCount, waterCount, benchCount);

  return {
    points: fullSets * 2,
    detail: `${fullSets} conjuntos completos de elementos`,
  };
}

// carta 11: camino sombreado mas largo
function scoreShadedPath(state: GameState) {
  const shadedPathCells = getCellsByDevelopment(state, 'PATH').filter(
    (cell) => isShadedPathCell(state, cell),
  );
  const longestPath = Math.max(
    0,
    ...getConnectedComponents(shadedPathCells).map(
      (component) => component.length,
    ),
  );

  return {
    points: longestPath * 2,
    detail: `Camino sombreado más largo: ${longestPath} segmentos`,
  };
}

// carta 12: caminos con bancos adyacentes
function scoreFrequentStops(state: GameState) {
  const stopCounts = getPathStopCounts(state);
  const componentScores: number[] = [];

  stopCounts.forEach((benchCount) => {
    if (benchCount >= 7) {
      componentScores.push(20);
      return;
    }

    if (benchCount >= 3) {
      componentScores.push((benchCount - 2) * 4);
      return;
    }

    componentScores.push(0);
  });

  let points = 0;

  componentScores.forEach((value) => {
    points += value;
  });

  return {
    points,
    detail: `Puntos por caminos con paradas: ${componentScores.join(' + ') || 0}`,
  };
}

type VictoryRequirementResult = Pick<
  VictoryRequirementState,
  'requirement' | 'fulfilled' | 'detail'
>;

// para cartas que solo tienen requisito de puntuacion
function noExtraVictoryRequirement(): VictoryRequirementResult {
  return {
    requirement: 'Sin requisito adicional.',
    fulfilled: true,
    detail: 'Solo cuenta para la suma mínima de puntos.',
  };
}


// requisito carta 1
function checkLongPathRequirement(state: GameState): VictoryRequirementResult {
  const pathComponents = getConnectedComponents(
    getCellsByDevelopment(state, 'PATH'),
  );
  const validPath = pathComponents.find((component) => {
    return (
      component.length >= 5 &&
      component.some((cell) => isOrthogonallyAdjacentToInfoBooth(cell))
    );
  });

  return {
    requirement:
      'Debe contener un camino adyacente a la i y de al menos 5 segmentos.',
    fulfilled: Boolean(validPath),
    detail: validPath
      ? `Camino valido de ${validPath.length} segmentos`
      : 'No hay un camino valido junto a la i',
  };
}

// requisito carta 2
function checkCornerForestRequirement(
  state: GameState,
): VictoryRequirementResult {
  const treeComponents = getConnectedComponents(
    getCellsByDevelopment(state, 'TREE'),
  );
  const validForest = treeComponents.find((component) => {
    return component.some(isInInfoBoothVicinity) && component.some(isCornerCell);
  });

  return {
    requirement:
      'Debe construir un bosque en las inmediaciones de la i que incluya una esquina.',
    fulfilled: Boolean(validForest),
    detail: validForest
      ? `Bosque valido de ${validForest.length} árboles`
      : 'No hay bosque conectado entre la i y una esquina',
  };
}

// requisito carta 3
function checkOneLakeRequirement(state: GameState): VictoryRequirementResult {
  const lakeCount = getConnectedComponents(
    getCellsByDevelopment(state, 'WATER'),
  ).length;

  return {
    requirement: 'Debe contener exactamente un lago.',
    fulfilled: lakeCount === 1,
    detail: `${lakeCount} lagos conectados en el parque`,
  };
}

// requisito carta 5
function checkFullBorderRequirement(
  state: GameState,
): VictoryRequirementResult {
  const topSide = state.board[0];
  const bottomSide = state.board[8];
  const leftSide = state.board.map((row) => row[0]);
  const rightSide = state.board.map((row) => row[8]);
  const coveredSides = [topSide, bottomSide, leftSide, rightSide].filter(
    (side) => side.every((cell) => Boolean(cell.development)),
  ).length;

  return {
    requirement: 'Debe tener un lado del borde completamente cubierto.',
    fulfilled: coveredSides > 0,
    detail: `${coveredSides} lados del borde cubiertos`,
  };
}

// requisito carta 6
function checkBridgeRequirement(state: GameState): VictoryRequirementResult {
  const bridges = getBridgeCounts(state);

  return {
    requirement:
      'Debe contener al menos un puente vertical y un puente horizontal.',
    fulfilled: bridges.vertical > 0 && bridges.horizontal > 0,
    detail: `${bridges.vertical} verticales y ${bridges.horizontal} horizontales`,
  };
}

// requisito carta 8
function checkFishingRequirement(state: GameState): VictoryRequirementResult {
  const benchScores = getFishingBenchScores(state);
  const bestBench = Math.max(0, ...benchScores);

  return {
    requirement:
      'Debe tener un banco que puntúe al menos 6 puntos para esta carta.',
    fulfilled: bestBench >= 6,
    detail: `Mejor banco: ${bestBench} puntos`,
  };
}

// requisito carta 9
function checkInformationCenterRequirement(
  state: GameState,
): VictoryRequirementResult {
  const developmentTypes = new Set(
    getAllCells(state)
      .filter(isInInfoBoothVicinity)
      .map((cell) => cell.development)
      .filter(Boolean),
  );

  return {
    requirement:
      'Las inmediaciones de la i deben contener al menos 2 tipos de elemento.',
    fulfilled: developmentTypes.size >= 2,
    detail: `${developmentTypes.size} tipos diferentes junto a la i`,
  };
}

// requisito carta 10
function checkOneOfEverythingRequirement(
  state: GameState,
): VictoryRequirementResult {
  const treeCount = countDevelopment(state, 'TREE');
  const pathCount = countDevelopment(state, 'PATH');
  const waterCount = countDevelopment(state, 'WATER');
  const benchCount = countDevelopment(state, 'BENCH');
  const minimumCount = Math.min(treeCount, pathCount, waterCount, benchCount);

  return {
    requirement: 'Debe contener al menos 5 de cada tipo de construcción.',
    fulfilled: minimumCount >= 5,
    detail: `${treeCount} árboles, ${pathCount} caminos, ${waterCount} aguas y ${benchCount} bancos`,
  };
}

// requisito carta 11
function checkShadedPathRequirement(
  state: GameState,
): VictoryRequirementResult {
  const shadedPathInVicinity = getCellsByDevelopment(state, 'PATH').some(
    (cell) => isInInfoBoothVicinity(cell) && isShadedPathCell(state, cell),
  );

  return {
    requirement:
      'Las inmediaciones de la i deben contener al menos un camino sombreado.',
    fulfilled: shadedPathInVicinity,
    detail: shadedPathInVicinity
      ? 'Hay un camino sombreado junto a la i'
      : 'No hay camino sombreado junto a la i',
  };
}

// requisito carta 12
function checkFrequentStopsRequirement(
  state: GameState,
): VictoryRequirementResult {
  const validPathCount = getPathStopCounts(state).filter(
    (benchCount) => benchCount >= 3,
  ).length;

  return {
    requirement:
      'Debe tener 2 caminos distintos, cada uno adyacente a 3 o más bancos.',
    fulfilled: validPathCount >= 2,
    detail: `${validPathCount} caminos con 3 o más bancos adyacentes`,
  };
}

const scoringFunctions: Record<
  string,
  (state: GameState) => { points: number; detail: string }
> = {
  '01-un-camino-largo-y-sinuoso': scoreLongClosedPath,
  '02-el-bosque-de-los-cien-acres': scoreLargestTreeRectangle,
  '03-de-mar-a-mar': scoreLargestLake,
  '04-los-mejores-asientos-de-la-casa': (state) => {
    const benches = countDevelopment(state, 'BENCH');

    return {
      points: benches,
      detail: `${benches} bancos colocados en el parque`,
    };
  },
  '05-fronteras-naturales': scoreNaturalBorders,
  '06-puentes-sobre-aguas-turbulentas': scoreBridges,
  '07-un-lugar-sombreado-para-descansar': scoreShadedBenches,
  '08-de-pesca': scoreFishing,
  '09-centro-de-atencion': scoreInformationCenter,
  '10-un-poco-de-todo': scoreOneOfEverything,
  '11-un-paseo-para-recordar': scoreShadedPath,
  '12-paradas-frecuentes': scoreFrequentStops,
};

const victoryRequirementFunctions: Record<
  string,
  (state: GameState) => VictoryRequirementResult
> = {
  '01-un-camino-largo-y-sinuoso': checkLongPathRequirement,
  '02-el-bosque-de-los-cien-acres': checkCornerForestRequirement,
  '03-de-mar-a-mar': checkOneLakeRequirement,
  '04-los-mejores-asientos-de-la-casa': noExtraVictoryRequirement,
  '05-fronteras-naturales': checkFullBorderRequirement,
  '06-puentes-sobre-aguas-turbulentas': checkBridgeRequirement,
  '07-un-lugar-sombreado-para-descansar': noExtraVictoryRequirement,
  '08-de-pesca': checkFishingRequirement,
  '09-centro-de-atencion': checkInformationCenterRequirement,
  '10-un-poco-de-todo': checkOneOfEverythingRequirement,
  '11-un-paseo-para-recordar': checkShadedPathRequirement,
  '12-paradas-frecuentes': checkFrequentStopsRequirement,
};

// calcula cada carta y resta las penalizaciones finales
export function calculateFinalScore(state: GameState): ScoreState {
  const scoringState = getStateForScoringCards(state);
  const cards: ScoringCardScoreState[] = [];
  const victoryRequirements: VictoryRequirementState[] = [];
  const soloTargetParts: string[] = [];
  let cardTotal = 0;
  let soloTarget = 0;
  let allRequirementsMet = true;

  state.scoringCards.forEach((card) => {
    const scoreCard = scoringFunctions[card.id];
    const result = scoreCard
      ? scoreCard(scoringState)
      : { points: 0, detail: 'Carta sin cálculo implementado' };

    cards.push({
      cardId: card.id,
      title: card.title,
      points: result.points,
      detail: result.detail,
    });

    cardTotal += result.points;
    soloTarget += card.soloTarget;
    soloTargetParts.push(String(card.soloTarget));
  });

  const diceModificationPenalty = state.penalties.diceModifications;
  const isolatedRegionCount = countRegionsOutsideInfoBooth(state);
  const isolatedRegionPenalty = isolatedRegionCount * 3;
  const penaltyTotal = diceModificationPenalty + isolatedRegionPenalty;
  const soloTargetBreakdown = soloTargetParts.join(' + ');
  const total = cardTotal - penaltyTotal;

  state.scoringCards.forEach((card) => {
    const checkRequirement =
      victoryRequirementFunctions[card.id] ?? noExtraVictoryRequirement;
    const result = checkRequirement(state);

    if (!result.fulfilled) {
      allRequirementsMet = false;
    }

    victoryRequirements.push({
      cardId: card.id,
      title: card.title,
      requirement: result.requirement,
      fulfilled: result.fulfilled,
      detail: result.detail,
    });
  });

  const soloTargetReached = total >= soloTarget;

  return {
    cards,
    penalties: {
      diceModifications: diceModificationPenalty,
      isolatedRegions: isolatedRegionPenalty,
      isolatedRegionCount,
    },
    soloTarget,
    soloTargetBreakdown,
    soloTargetReached,
    victoryRequirements,
    victoryAchieved: soloTargetReached && allRequirementsMet,
    total,
  };
}
