/*
https://reactrouter.com/api/hooks/useParams
https://reactrouter.com/api/hooks/useNavigate
https://chakra-ui.com/docs/components/concepts/overview
*/

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Button,
  Grid,
  Heading,
  HStack,
  Image,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { DevelopmentIcon, DiceIcon } from '../components/GameIcons'
import Navbar from '../components/Navbar'
import PageContainer from '../components/PageContainer'
import ParkSheetBoard from '../components/ParkSheetBoard'
import { SCORING_CARD_IMAGES } from '../assets/scoring-card-images'
import { API_URL, TOKEN_KEY } from '../config'
import type {
  DevelopmentType,
  Dice,
  DiceType,
  GameSession,
  GameState,
  ParkCell,
  User,
} from '../types'

type DevelopmentReference = {
  type: DevelopmentType
  label: string
  range: string
  min: number
  max: number | null
}

// elementos y rangos que se pueden desbloquear con los dados
const DEVELOPMENT_REFERENCE: DevelopmentReference[] = [
  { type: 'TREE', label: 'Árbol', range: '1-4', min: 1, max: 4 },
  { type: 'PATH', label: 'Camino', range: '5-8', min: 5, max: 8 },
  { type: 'WATER', label: 'Agua', range: '9-12', min: 9, max: 12 },
  { type: 'BENCH', label: 'Banco', range: '13+', min: 13, max: null },
]

// dados oficiales que se muestran aunque aun no se hayan tirado
const DICE_REFERENCE: DiceType[] = ['D4', 'D6', 'D8', 'D10', 'D12', 'D20']
const MAX_DICE_MODIFICATIONS = 12

type VisibleDice = {
  type: DiceType
  value: number | null
  used: boolean
}

type ActionLoading =
  | 'roll'
  | 'modify'
  | 'reroll'
  | 'unlock'
  | 'place'
  | 'advance'
  | null

// crea una clave unica para poder marcar casillas del tablero
function getCellKey(cell: Pick<ParkCell, 'row' | 'column'>) {
  return `${cell.row}-${cell.column}`
}

// suma todos los dados que hay seleccionados
function getDiceSum(dice: Array<{ value: number }>) {
  let total = 0

  dice.forEach((diceItem) => {
    total += diceItem.value
  })

  return total
}

// calcula todas las combinaciones posibles de los dados recibidos
function getDiceSubsets(dice: Dice[]) {
  const subsets: Dice[][] = []

  dice.forEach((diceItem) => {
    const subsetsWithDiceItem = subsets.map((subset) => [
      ...subset,
      diceItem,
    ])
    subsets.push([diceItem], ...subsetsWithDiceItem)
  })

  return subsets
}

// devuelve que elemento corresponde a una suma concreta
function getDevelopmentForSum(value: number) {
  for (const development of DEVELOPMENT_REFERENCE) {
    const fitsMin = value >= development.min
    const fitsMax = development.max === null || value <= development.max

    if (fitsMin && fitsMax) {
      return development.type
    }
  }

  return null
}

// mira si existe alguna casilla libre con el valor exacto
function hasEmptyParkCellWithValue(gameState: GameState, value: number) {
  return gameState.board.some((row) =>
    row.some(
      (cell) =>
        cell.kind === 'PARK' && !cell.development && cell.printedValue === value,
    ),
  )
}

// comprueba si alguna combinacion podria colocarse en el tablero
function hasPlacementOption(gameState: GameState, dice: Dice[]) {
  return getDiceSubsets(dice).some((subset) =>
    hasEmptyParkCellWithValue(gameState, getDiceSum(subset)),
  )
}

// intenta sacar el mensaje real que devuelve el backend
async function getResponseError(response: Response, fallback: string) {
  const data = await response.json().catch(() => null)
  const message = data?.message

  if (Array.isArray(message)) {
    return message.join(', ')
  }

  if (typeof message === 'string') {
    return message
  }

  return fallback
}

function GameSessionPage() {
  // id que viene en la url
  const { id } = useParams()
  const navigate = useNavigate()

  // estados principales de la pantalla
  const [user, setUser] = useState<User | null>(null)
  const [gameSession, setGameSession] = useState<GameSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<ActionLoading>(null)
  const [pageError, setPageError] = useState('')
  const [actionError, setActionError] = useState('')
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false)
  const [selectedDiceTypes, setSelectedDiceTypes] = useState<DiceType[]>([])
  const [selectedDevelopmentType, setSelectedDevelopmentType] =
    useState<DevelopmentType | null>(null)

  // ronda actual segun lo que llega del backend
  const activeRound =
    gameSession?.state.rounds.find(
      (round) => round.roundNumber === gameSession.state.currentRound,
    ) ?? null

  // datos utiles ya separados de la ronda
  const unlockedDevelopments = activeRound?.unlockedDevelopments ?? []
  
  const activeDice = activeRound?.dice ?? []

  const unusedDice = activeDice.filter((dice) => !dice.used)

  const isGameCompleted =
    gameSession?.status === 'COMPLETED' ||
    gameSession?.state.status === 'COMPLETED'

  const isFinalRound =
    (gameSession?.state.currentRound ?? 0) >=
    (gameSession?.state.totalRounds ?? 1)

  const finalScore = gameSession?.state.score ?? null

  // si aun no se han tirado dados, se pintan los dados vacios en gris
  const visibleDice: VisibleDice[] =
    activeRound?.dice ??
    DICE_REFERENCE.map((type) => ({
      type,
      value: null,
      used: false,
    }))

  // dados que el jugador tiene marcados en este momento
  const selectedDice = visibleDice.filter(
    (dice): dice is VisibleDice & { value: number } =>
      selectedDiceTypes.includes(dice.type) &&
      typeof dice.value === 'number' &&
      !dice.used,
  )

  // suma que se usa para desbloquear o colocar
  const selectedDiceSum = getDiceSum(selectedDice)
  const selectedSingleDice = selectedDice.length === 1 ? selectedDice[0] : null
  const diceModificationsUsed =
    gameSession?.state.penalties.diceModifications ?? 0

  // solo se puede modificar un dado cada vez y como maximo 12 veces
  const canModifySelectedDice =
    selectedSingleDice !== null &&
    Boolean(activeRound?.dice) &&
    !isGameCompleted &&
    diceModificationsUsed < MAX_DICE_MODIFICATIONS

  const canDecreaseSelectedDice =
    selectedSingleDice !== null &&
    canModifySelectedDice &&
    selectedSingleDice.value > 1

  const canIncreaseSelectedDice =
    selectedSingleDice !== null &&
    canModifySelectedDice

  const canRerollSelectedDice =
    selectedDice.length > 0 &&
    Boolean(activeRound?.dice) &&
    !isGameCompleted &&
    diceModificationsUsed + selectedDice.length <= MAX_DICE_MODIFICATIONS

  // elemento que se podria desbloquear con esa suma
  const unlockableDevelopmentType =
    selectedDiceSum > 0 ? getDevelopmentForSum(selectedDiceSum) : null

  // ayuda para saber si un elemento ya esta disponible esta ronda
  const isDevelopmentUnlocked = (type: DevelopmentType) =>
    unlockedDevelopments.some((development) => development.type === type)

  // valida en cliente si la seleccion puede desbloquear algo
  const canUnlockSelectedDevelopment =
    Boolean(activeRound?.dice) &&
    !isGameCompleted &&
    Boolean(unlockableDevelopmentType) &&
    !unlockedDevelopments.some(
      (development) => development.type === unlockableDevelopmentType,
    ) &&
    selectedDice.length > 0

  // elemento que se marca en verde en la parte derecha
  const highlightedDevelopmentType = canUnlockSelectedDevelopment
    ? unlockableDevelopmentType
    : null

  // valida en cliente si hay elemento y dados para colocar
  const canPlaceSelectedDevelopment =
    Boolean(gameSession) &&
    !isGameCompleted &&
    Boolean(selectedDevelopmentType) &&
    selectedDice.length > 0 &&
    unlockedDevelopments.some(
      (development) => development.type === selectedDevelopmentType,
    )

  // casillas que se iluminan porque coinciden con la suma seleccionada
  const highlightedCellKeys: string[] = []

  if (gameSession && canPlaceSelectedDevelopment) {
    gameSession.state.board.forEach((row) => {
      row.forEach((cell) => {
        const canUseCell =
          cell.kind === 'PARK' &&
          !cell.development &&
          cell.printedValue === selectedDiceSum

        if (canUseCell) {
          highlightedCellKeys.push(getCellKey(cell))
        }
      })
    })
  }

  // mira si aun se podria colocar algo con los dados restantes
  const hasPlaceActionAvailable =
    Boolean(gameSession) &&
    unlockedDevelopments.length > 0 &&
    (gameSession ? hasPlacementOption(gameSession.state, unusedDice) : false)

  // mira si aun se podria desbloquear algo con los dados restantes
  const hasUnlockActionAvailable =
    getDiceSubsets(unusedDice).some((subset) => {
      const developmentType = getDevelopmentForSum(getDiceSum(subset))

      return Boolean(developmentType && !isDevelopmentUnlocked(developmentType))
    })

  // muestra el boton cuando se puede cerrar la ronda
  const canAdvanceRound =
    Boolean(activeRound?.dice) &&
    !isGameCompleted &&
    (unusedDice.length === 0 ||
      (!hasPlaceActionAvailable && !hasUnlockActionAvailable))

  useEffect(() => {
    // si no hay token no se puede abrir la partida
    const token = localStorage.getItem(TOKEN_KEY)

    if (!token) {
      navigate('/login')
      return
    }

    // si la url no trae id no hay partida que cargar
    if (!id) {
      setPageError('No se ha indicado la partida')
      setLoading(false)
      return
    }

    // carga usuario y partida desde el backend
    const fetchGameSession = async () => {
      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        }

        const userResponse = await fetch(`${API_URL}/auth/me`, { headers })

        if (!userResponse.ok) {
          throw new Error('No se pudo obtener el usuario autenticado')
        }

        const userData: User = await userResponse.json()
        setUser(userData)

        const sessionResponse = await fetch(`${API_URL}/game-sessions/${id}`, {
          headers,
        })

        if (sessionResponse.status === 404) {
          throw new Error('No se ha encontrado la partida')
        }

        if (!sessionResponse.ok) {
          throw new Error('No se pudo cargar la partida')
        }

        const sessionData: GameSession = await sessionResponse.json()
        setGameSession(sessionData)
      } catch (err) {
        // si hay error se queda en esta pagina mostrando el mensaje
        const message = err instanceof Error ? err.message : 'Error inesperado'
        setPageError(message)

        if (message === 'No se pudo obtener el usuario autenticado') {
          localStorage.removeItem(TOKEN_KEY)
          navigate('/login')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchGameSession()
  }, [id, navigate])

  useEffect(() => {
    if (!activeRound || isGameCompleted) {
      setSelectedDevelopmentType(null)
      return
    }

    if (activeRound.unlockedDevelopments.length === 0) {
      setSelectedDevelopmentType(null)
      return
    }

    const selectedDevelopmentStillExists =
      selectedDevelopmentType !== null &&
      activeRound.unlockedDevelopments.some(
        (development) => development.type === selectedDevelopmentType,
      )

    if (!selectedDevelopmentStillExists) {
      setSelectedDevelopmentType(activeRound.unlockedDevelopments[0].type)
    }
  }, [activeRound, isGameCompleted, selectedDevelopmentType])

  // cierra sesion desde la partida
  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY)
    navigate('/login')
  }

  // funcion comun para mandar acciones al backend
  const sendGameAction = async (
    endpoint: string,
    loadingAction: Exclude<ActionLoading, null>,
    fallbackError: string,
    body?: object,
  ) => {
    const token = localStorage.getItem(TOKEN_KEY)

    if (!token || !id) {
      navigate('/login')
      return null
    }

    setActionLoading(loadingAction)
    setActionError('')

    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      }

      if (body) {
        headers['Content-Type'] = 'application/json'
      }

      const response = await fetch(`${API_URL}/game-sessions/${id}/${endpoint}`, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        throw new Error(await getResponseError(response, fallbackError))
      }

      const updatedSession: GameSession = await response.json()
      setGameSession(updatedSession)

      return updatedSession
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error inesperado')
      return null
    } finally {
      setActionLoading(null)
    }
  }

  // tira los dados de la ronda actual
  const handleRollDice = async () => {
    const updatedSession = await sendGameAction(
      'roll-dice',
      'roll',
      'No se pudieron tirar los dados',
    )

    if (updatedSession) {
      setSelectedDiceTypes([])
      setSelectedDevelopmentType(null)
    }
  }

  // marca o desmarca un dado en la tirada
  const handleToggleDice = (dice: VisibleDice) => {
    if (typeof dice.value !== 'number' || dice.used) {
      return
    }

    setSelectedDiceTypes((currentDiceTypes) => {
      if (currentDiceTypes.includes(dice.type)) {
        return currentDiceTypes.filter((type) => type !== dice.type)
      }

      return [...currentDiceTypes, dice.type]
    })
  }

  // cambia el valor de un dado y apunta la penalizacion en el servidor
  const handleModifyDice = async (delta: -1 | 1) => {
    if (!selectedSingleDice) {
      return
    }

    const updatedSession = await sendGameAction(
      'modify-dice',
      'modify',
      'No se pudo modificar el dado',
      {
        diceType: selectedSingleDice.type,
        delta,
      },
    )

    if (updatedSession) {
      setSelectedDiceTypes([selectedSingleDice.type])
    }
  }

  // relanza los dados seleccionados y apunta una penalizacion por cada dado
  const handleRerollDice = async () => {
    if (!canRerollSelectedDice) {
      return
    }

    const diceTypes = selectedDice.map((dice) => dice.type)
    const updatedSession = await sendGameAction(
      'reroll-dice',
      'reroll',
      'No se pudieron relanzar los dados',
      {
        diceTypes,
      },
    )

    if (updatedSession) {
      setSelectedDiceTypes(diceTypes)
    }
  }

  // usa los dados seleccionados para desbloquear el elemento marcado en verde
  const handleUnlockDevelopment = async (developmentType: DevelopmentType) => {
    if (!canUnlockSelectedDevelopment || developmentType !== highlightedDevelopmentType) {
      return
    }

    const updatedSession = await sendGameAction(
      'unlock-development',
      'unlock',
      'No se pudo desbloquear el elemento',
      {
        developmentType,
        diceTypes: selectedDice.map((dice) => dice.type),
      },
    )

    if (updatedSession) {
      setSelectedDiceTypes([])
      setSelectedDevelopmentType(developmentType)
    }
  }

  // coloca el elemento seleccionado en una casilla resaltada
  const handlePlaceDevelopment = async (cell: ParkCell) => {
    if (!selectedDevelopmentType || highlightedCellKeys.length === 0) {
      return
    }

    const updatedSession = await sendGameAction(
      'place-development',
      'place',
      'No se pudo colocar el elemento',
      {
        developmentType: selectedDevelopmentType,
        diceTypes: selectedDice.map((dice) => dice.type),
        row: cell.row,
        column: cell.column,
      },
    )

    if (updatedSession) {
      setSelectedDiceTypes([])
    }
  }

  // pasa a la siguiente ronda cuando ya no queda nada util
  const handleAdvanceRound = async () => {
    if (isGameCompleted) {
      return
    }

    const updatedSession = await sendGameAction(
      'advance-round',
      'advance',
      'No se pudo avanzar la ronda',
    )

    if (updatedSession) {
      setSelectedDiceTypes([])
      setSelectedDevelopmentType(null)

      if (updatedSession.state.score) {
        setIsScoreModalOpen(true)
      }
    }
  }

  // mientras carga se muestra un estado de cargando
  if (loading) {
    return (
      <Box minH="100vh" bg="gray.50">
        <Navbar username={user?.username} onLogout={handleLogout} />
        <PageContainer py={{ base: 12, md: 16 }}>
          <HStack color="gray.600" gap={3}>
            <Spinner size="sm" />
            <Text>Cargando partida...</Text>
          </HStack>
        </PageContainer>
      </Box>
    )
  }

  // pagina con tooooda la partida
  return (
    <Box minH="100vh" bg="gray.50">
      {/* barra superior con el logo, usuario y cerrar sesion */}
      <Navbar username={user?.username} onLogout={handleLogout} />

      {/* contenedor general de la pantalla */}
      <PageContainer py={{ base: 8, md: 10 }}>
        {pageError || !gameSession ? (
          <Box
            bg="white"
            border="1px solid"
            borderColor="blackAlpha.200"
            borderRadius="md"
            p={{ base: 5, md: 8 }}
          >
            {/* mensaje cuando la partida no se puede cargar */}
            <VStack gap={4}>
              <Heading size="md" color="gray.800">
                No se puede abrir esta partida
              </Heading>
              <Text color="gray.600">{pageError}</Text>
              <Button onClick={() => navigate('/')}>Volver al menú</Button>
            </VStack>
          </Box>
        ) : (
          <Box
            bg="white"
            border="1px solid"
            borderColor="blackAlpha.200"
            borderRadius="md"
            p={{ base: 4, md: 6 }}
          >
            {/* cabecera con datos de partida y rondas */}
            <HStack
              justify="space-between"
              align={{ base: 'flex-start', md: 'center' }}
              gap={4}
              mb={5}
              flexDirection={{ base: 'column', md: 'row' }}
            >
              <Box>
                <Heading size="lg" color="green.700">
                  Partida
                </Heading>
                <Text color="gray.600">ID: {gameSession.id}</Text>
              </Box>

              <HStack gap={2} flexWrap="wrap">
                {gameSession.state.rounds.map((round) => {
                  // color de cada casilla del contador de rondas
                  const isCurrent =
                    round.roundNumber === gameSession.state.currentRound
                  const isCompleted = round.completed
                  let roundBorderColor = 'blackAlpha.300'
                  let roundBgColor = 'white'

                  if (isCurrent) {
                    roundBorderColor = 'green.700'
                    roundBgColor = 'green.600'
                  } else if (isCompleted) {
                    roundBorderColor = 'gray.300'
                    roundBgColor = 'gray.200'
                  }

                  return (
                    <Box
                      key={round.roundNumber}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      minW="36px"
                      h="34px"
                      border="1px solid"
                      borderColor={roundBorderColor}
                      bg={roundBgColor}
                      color={isCurrent ? 'white' : 'gray.700'}
                      borderRadius="sm"
                      fontWeight="bold"
                    >
                      {round.roundNumber}
                    </Box>
                  )
                })}
              </HStack>
            </HStack>

            {/* mensaje de error de alguna accion */}
            {actionError && (
              <Box
                border="1px solid"
                borderColor="red.200"
                bg="red.50"
                borderRadius="md"
                p={3}
                mb={4}
              >
                <Text color="red.700" fontSize="sm">
                  {actionError}
                </Text>
              </Box>
            )}

            {/* zona principal con tablero y paneles de acciones */}
            <Grid
              templateColumns={{ base: '1fr', xl: 'minmax(0, 1fr) 620px' }}
              gap={6}
              alignItems="stretch"
            >
              {/* tablero de la hoja actual */}
              <Box>
                <ParkSheetBoard
                  gameState={gameSession.state}
                  highlightedCellKeys={highlightedCellKeys}
                  onCellClick={handlePlaceDevelopment}
                />
              </Box>

              {/* columna derecha de controles de la ronda */}
              <VStack
                align="stretch"
                alignSelf="start"
                gap={3}
                maxH={{ xl: '620px' }}
                w="full"
              >
                {/* ventana de dados y suma seleccionada */}
                <Box
                  border="1px solid"
                  borderColor="blackAlpha.200"
                  borderRadius="md"
                  p={3}
                >
                  <HStack
                    justify="space-between"
                    align={{ base: 'flex-start', md: 'center' }}
                    gap={4}
                    mb={4}
                    flexDirection={{ base: 'column', md: 'row' }}
                  >
                    <Box>
                      <Heading size="sm" color="gray.800">
                        Dados de la ronda
                      </Heading>
                      <Text color="gray.600" fontSize="sm">
                        {activeRound?.dice
                          ? 'Dados registrados para esta ronda.'
                          : 'Todavía no se han tirado los dados.'}
                      </Text>
                    </Box>

                    <Button
                      w={{ base: '100%', md: 'auto' }}
                      bg="green.600"
                      color="white"
                      _hover={{ bg: 'green.700' }}
                      loading={actionLoading === 'roll'}
                      disabled={Boolean(activeRound?.dice) || isGameCompleted}
                      onClick={handleRollDice}
                    >
                      Tirar dados
                    </Button>
                  </HStack>

                  <Grid
                    templateColumns={{
                      base: 'repeat(3, minmax(0, 1fr))',
                      md: 'repeat(6, minmax(0, 1fr))',
                    }}
                    gap={2}
                    alignItems="end"
                    w="full"
                  >
                    {visibleDice.map((dice) => {
                      // estado visual de cada dado de la ronda
                      const canSelect =
                        typeof dice.value === 'number' && !dice.used
                      const isSelected = selectedDiceTypes.includes(dice.type)

                      return (
                        <Box
                          key={dice.type}
                          as="button"
                          aria-disabled={!canSelect}
                          aria-pressed={isSelected}
                          minW={0}
                          textAlign="center"
                          display="flex"
                          flexDirection="column"
                          alignItems="center"
                          border="2px solid"
                          borderColor={isSelected ? 'green.600' : 'transparent'}
                          borderRadius="md"
                          bg={isSelected ? 'green.50' : 'white'}
                          cursor={
                            canSelect && !isGameCompleted
                              ? 'pointer'
                              : 'default'
                          }
                          p={1}
                          onClick={() => {
                            if (!isGameCompleted) {
                              handleToggleDice(dice)
                            }
                          }}
                        >
                          <DiceIcon
                            type={dice.type}
                            value={dice.value}
                            used={dice.used}
                            width="78px"
                            height="78px"
                            numberFontSize="30px"
                          />
                          <Text
                            color="gray.500"
                            fontSize="xs"
                            fontWeight="medium"
                            lineHeight="1"
                          >
                            {dice.type}
                          </Text>
                        </Box>
                      )
                    })}
                  </Grid>

                  <HStack justify="space-between" gap={3} mt={4}>
                    <Text color="gray.700" fontSize="sm" fontWeight="medium">
                      Suma seleccionada: {selectedDiceSum || '-'}
                    </Text>

                    <HStack gap={2}>
                      {gameSession.state.score && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsScoreModalOpen(true)}
                        >
                          Ver puntuación
                        </Button>
                      )}

                      {(canAdvanceRound || isGameCompleted) && (
                        <Button
                          size="sm"
                          bg={isGameCompleted ? 'gray.300' : 'green.600'}
                          color={isGameCompleted ? 'gray.700' : 'white'}
                          _hover={{
                            bg: isGameCompleted ? 'gray.300' : 'green.700',
                          }}
                          disabled={
                            isGameCompleted || actionLoading === 'advance'
                          }
                          loading={actionLoading === 'advance'}
                          onClick={handleAdvanceRound}
                        >
                          {isGameCompleted
                            ? 'Partida finalizada'
                            : isFinalRound
                              ? 'Finalizar partida'
                              : 'Avanzar ronda'}
                        </Button>
                      )}
                    </HStack>
                  </HStack>
                </Box>

                {/* ventana de modificadores y penalizaciones */}
                <Box
                  border="1px solid"
                  borderColor="blackAlpha.200"
                  borderRadius="md"
                  p={3}
                >
                  <HStack
                    justify="space-between"
                    gap={3}
                    flexWrap="wrap"
                    align="center"
                    mb={3}
                  >
                    <Heading size="sm" color="gray.800">
                      Penalizaciones
                    </Heading>

                    <Text color="gray.700" fontSize="sm" fontWeight="medium">
                      {diceModificationsUsed}/{MAX_DICE_MODIFICATIONS}
                    </Text>
                  </HStack>

                  <HStack gap={2} mb={3}>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canDecreaseSelectedDice}
                      loading={actionLoading === 'modify'}
                      onClick={() => handleModifyDice(-1)}
                    >
                      -1
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canIncreaseSelectedDice}
                      loading={actionLoading === 'modify'}
                      onClick={() => handleModifyDice(1)}
                    >
                      +1
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canRerollSelectedDice}
                      loading={actionLoading === 'reroll'}
                      onClick={handleRerollDice}
                    >
                      Relanzar
                    </Button>
                  </HStack>

                  <Grid
                    templateColumns={`repeat(${MAX_DICE_MODIFICATIONS}, minmax(0, 1fr))`}
                    gap={1}
                    w="full"
                  >
                    {Array.from(
                      { length: MAX_DICE_MODIFICATIONS },
                      (_, index) => {
                        // cada X representa una modificacion de dado usada
                        const isMarked = index < diceModificationsUsed

                        return (
                          <Box
                            key={index}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            w="full"
                            h="22px"
                            border="1px solid"
                            borderColor={isMarked ? 'red.600' : 'gray.300'}
                            bg={isMarked ? 'red.100' : 'white'}
                            color={isMarked ? 'red.700' : 'transparent'}
                            borderRadius="sm"
                            fontSize="sm"
                            fontWeight="bold"
                          >
                            X
                          </Box>
                        )
                      },
                    )}
                  </Grid>
                </Box>

                {/* ventana de elementos disponibles */}
                <Box
                  border="1px solid"
                  borderColor="blackAlpha.200"
                  borderRadius="md"
                  p={3}
                  flex="1"
                  display="flex"
                  flexDirection="column"
                >
                  <Heading size="sm" color="gray.800" mb={3}>
                    Elementos disponibles
                  </Heading>

                  <Grid
                    templateColumns={{
                      base: 'repeat(2, minmax(0, 1fr))',
                      md: 'repeat(4, minmax(0, 1fr))',
                    }}
                    gap={3}
                    alignItems="center"
                    w="full"
                    flex="1"
                  >
                    {DEVELOPMENT_REFERENCE.map((development) => {
                      // estado visual de cada elemento desbloqueable
                      const roundDevelopment = unlockedDevelopments.find(
                        (unlockedDevelopment) =>
                          unlockedDevelopment.type === development.type,
                      )
                      const isUnlocked = Boolean(roundDevelopment)
                      const canUnlockThis =
                        highlightedDevelopmentType === development.type
                      const isSelected =
                        selectedDevelopmentType === development.type
                      const isSelectable = isUnlocked && !isSelected
                      let borderColor = 'transparent'
                      let bgColor = 'white'
                      let statusText = ''

                      if (canUnlockThis) {
                        borderColor = 'orange.500'
                        bgColor = 'orange.50'
                        statusText = 'Desbloquear'
                      } else if (isSelected) {
                        borderColor = 'green.600'
                        bgColor = 'green.100'
                        statusText = 'Seleccionado'
                      } else if (isSelectable) {
                        borderColor = 'green.300'
                        bgColor = 'green.50'
                      }

                      return (
                        <Box
                          key={development.type}
                          as="button"
                          minW={0}
                          textAlign="center"
                          display="flex"
                          flexDirection="column"
                          alignItems="center"
                          border="3px solid"
                          borderColor={borderColor}
                          borderRadius="md"
                          bg={bgColor}
                          cursor={
                            !isGameCompleted && (canUnlockThis || isUnlocked)
                              ? 'pointer'
                              : 'default'
                          }
                          p={2}
                          onClick={() => {
                            if (isGameCompleted) {
                              return
                            }

                            if (canUnlockThis) {
                              handleUnlockDevelopment(development.type)
                              return
                            }

                            if (isUnlocked) {
                              setSelectedDevelopmentType(development.type)
                            }
                          }}
                        >
                          <DevelopmentIcon
                            type={development.type}
                            width="80px"
                            height="80px"
                          />
                          <Text
                            color="gray.900"
                            fontSize="2xl"
                            fontWeight="bold"
                            lineHeight="1"
                            mt={2}
                          >
                            {development.range}
                          </Text>
                          <Text
                            color="gray.600"
                            fontSize="xs"
                            lineHeight="1.2"
                            mt={1}
                          >
                            {development.label}
                          </Text>
                          <Text
                            color="green.700"
                            fontSize="xs"
                            mt={1}
                            h="16px"
                            lineHeight="16px"
                          >
                            {isUnlocked
                              ? `Colocados: ${roundDevelopment?.placedCount ?? 0}`
                              : ' '}
                          </Text>
                          <Text
                            color={canUnlockThis ? 'orange.700' : 'green.700'}
                            fontSize="xs"
                            fontWeight="bold"
                            mt={1}
                            h="16px"
                            lineHeight="16px"
                          >
                            {statusText || ' '}
                          </Text>
                        </Box>
                      )
                    })}
                  </Grid>
                </Box>

              </VStack>
            </Grid>

            {/* cartas de puntuacion elegidas para esta partida */}
            <Box mt={6}>
              <Heading size="md" color="green.700" mb={3}>
                Cartas de puntuación
              </Heading>

              <Grid
                templateColumns={{
                  base: '1fr',
                  md: 'repeat(3, minmax(0, 1fr))',
                }}
                gap={4}
              >
                {gameSession.state.scoringCards.map((scoringCard) => {
                  // imagen que corresponde con el id guardado en la partida
                  const imageSrc = SCORING_CARD_IMAGES[scoringCard.id]

                  return (
                    <Box
                      key={scoringCard.id}
                      border="1px solid"
                      borderColor="blackAlpha.200"
                      borderRadius="md"
                      bg="white"
                      p={2}
                    >
                      <Image
                        src={imageSrc}
                        alt={scoringCard.title}
                        w="full"
                        borderRadius="sm"
                      />
                    </Box>
                  )
                })}
              </Grid>

              {!gameSession.state.score && (
                <Text color="gray.600" fontSize="sm" mt={3}>
                  La puntuación se calculará al terminar la partida.
                </Text>
              )}
            </Box>
          </Box>
        )}
      </PageContainer>

      {/* modal con el desglose final de la partida */}
      {isScoreModalOpen && finalScore && (
        <Box
          position="fixed"
          inset={0}
          zIndex={20}
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="blackAlpha.500"
          p={4}
        >
          <Box
            bg="white"
            borderRadius="md"
            boxShadow="xl"
            maxW="720px"
            w="full"
            maxH="90vh"
            overflowY="auto"
            p={{ base: 4, md: 6 }}
          >
            <HStack justify="space-between" align="flex-start" gap={4} mb={4}>
              <Box>
                <Heading size="md" color="green.700">
                  Desglose de puntuación
                </Heading>
                <Text color="gray.600" fontSize="sm">
                  Resultado final de la partida
                </Text>
              </Box>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsScoreModalOpen(false)}
              >
                Cerrar
              </Button>
            </HStack>

            <VStack align="stretch" gap={3}>
              {finalScore.cards.map((cardScore) => (
                <HStack
                  key={cardScore.cardId}
                  justify="space-between"
                  align="flex-start"
                  gap={4}
                >
                  <Box>
                    <Text color="gray.800" fontWeight="bold">
                      {cardScore.title}
                    </Text>
                    <Text color="gray.600" fontSize="sm">
                      {cardScore.detail}
                    </Text>
                  </Box>
                  <Text color="green.700" fontWeight="bold">
                    {cardScore.points}
                  </Text>
                </HStack>
              ))}

              <Box borderTop="1px solid" borderColor="blackAlpha.200" />

              <HStack justify="space-between">
                <Text color="gray.700">Penalización por modificar dados</Text>
                <Text color="red.700" fontWeight="bold">
                  -{finalScore.penalties.diceModifications}
                </Text>
              </HStack>

              <HStack justify="space-between">
                <Box>
                  <Text color="gray.700">
                    Penalización por regiones fuera de la vecindad
                  </Text>
                  <Text color="gray.500" fontSize="xs">
                    {finalScore.penalties.isolatedRegionCount}{' '}
                    regiones x 3 puntos
                  </Text>
                </Box>
                <Text color="red.700" fontWeight="bold">
                  -{finalScore.penalties.isolatedRegions}
                </Text>
              </HStack>

              <Box>
                <Heading size="sm" color="gray.800" mb={2}>
                  Requisitos de victoria
                </Heading>

                <VStack align="stretch" gap={2}>
                  <Box
                    border="1px solid"
                    borderColor="blackAlpha.200"
                    borderRadius="md"
                    p={3}
                  >
                    <HStack justify="space-between" align="flex-start" gap={4}>
                      <Box>
                        <Text color="gray.800" fontWeight="bold">
                          Suma mínima de puntos
                        </Text>
                        <Text color="gray.700" fontSize="sm">
                          La puntuación final debe alcanzar la suma de las tres
                          cartas.
                        </Text>
                        <Text color="gray.500" fontSize="xs">
                          {finalScore.soloTargetBreakdown} ={' '}
                          {finalScore.soloTarget}
                        </Text>
                      </Box>

                      <Box
                        px={2}
                        py={1}
                        borderRadius="sm"
                        bg={
                          finalScore.soloTargetReached
                            ? 'green.100'
                            : 'red.100'
                        }
                        color={
                          finalScore.soloTargetReached
                            ? 'green.700'
                            : 'red.700'
                        }
                        fontSize="xs"
                        fontWeight="bold"
                        flexShrink={0}
                      >
                        {finalScore.soloTargetReached
                          ? 'Cumplido'
                          : 'No cumplido'}
                      </Box>
                    </HStack>
                  </Box>

                  {finalScore.victoryRequirements.map((requirement) => (
                    <Box
                      key={requirement.cardId}
                      border="1px solid"
                      borderColor="blackAlpha.200"
                      borderRadius="md"
                      p={3}
                    >
                      <HStack justify="space-between" align="flex-start" gap={4}>
                        <Box>
                          <Text color="gray.800" fontWeight="bold">
                            {requirement.title}
                          </Text>
                          <Text color="gray.700" fontSize="sm">
                            {requirement.requirement}
                          </Text>
                          <Text color="gray.500" fontSize="xs">
                            {requirement.detail}
                          </Text>
                        </Box>

                        <Box
                          px={2}
                          py={1}
                          borderRadius="sm"
                          bg={
                            requirement.fulfilled ? 'green.100' : 'red.100'
                          }
                          color={
                            requirement.fulfilled ? 'green.700' : 'red.700'
                          }
                          fontSize="xs"
                          fontWeight="bold"
                          flexShrink={0}
                        >
                          {requirement.fulfilled ? 'Cumplido' : 'No cumplido'}
                        </Box>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </Box>

              <HStack
                justify="space-between"
                borderTop="1px solid"
                borderColor="blackAlpha.200"
                pt={3}
              >
                <Text color="gray.900" fontWeight="bold">
                  Total
                </Text>
                <Text color="green.700" fontSize="2xl" fontWeight="bold">
                  {finalScore.total}
                </Text>
              </HStack>

              <Box
                border="1px solid"
                borderColor={
                  finalScore.victoryAchieved
                    ? 'green.200'
                    : 'orange.200'
                }
                bg={
                  finalScore.victoryAchieved
                    ? 'green.50'
                    : 'orange.50'
                }
                borderRadius="md"
                p={3}
              >
                <Text
                  color={
                    finalScore.victoryAchieved
                      ? 'green.700'
                      : 'orange.700'
                  }
                  fontSize="sm"
                  fontWeight="bold"
                >
                  {finalScore.victoryAchieved
                    ? 'Has ganado la partida.'
                    : 'No has cumplido todos los requisitos de victoria.'}
                </Text>
                <Text color="gray.600" fontSize="xs" mt={1}>
                  Para ganar hay que alcanzar la suma de puntos y cumplir los
                  requisitos de las tres cartas.
                </Text>
              </Box>
            </VStack>
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default GameSessionPage
