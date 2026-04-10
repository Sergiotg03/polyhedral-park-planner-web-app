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
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { DevelopmentIcon, DiceIcon } from '../components/GameIcons'
import Navbar from '../components/Navbar'
import PageContainer from '../components/PageContainer'
import ParkSheetBoard from '../components/ParkSheetBoard'
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
  { type: 'TREE', label: 'Arbol', range: '1-4', min: 1, max: 4 },
  { type: 'PATH', label: 'Camino', range: '5-8', min: 5, max: 8 },
  { type: 'WATER', label: 'Agua', range: '9-12', min: 9, max: 12 },
  { type: 'BENCH', label: 'Banco', range: '13+', min: 13, max: null },
]

// dados oficiales que se muestran aunque aun no se hayan tirado
const DICE_REFERENCE: DiceType[] = ['D4', 'D6', 'D8', 'D10', 'D12', 'D20']

type VisibleDice = {
  type: DiceType
  value: number | null
  used: boolean
}

type ActionLoading = 'roll' | 'unlock' | 'place' | 'advance' | null

// crea una clave unica para poder marcar casillas del tablero
function getCellKey(cell: Pick<ParkCell, 'row' | 'column'>) {
  return `${cell.row}-${cell.column}`
}

// suma todos los dados que hay seleccionados
function getDiceSum(dice: Array<{ value: number }>) {
  return dice.reduce((total, diceItem) => total + diceItem.value, 0)
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
  return (
    DEVELOPMENT_REFERENCE.find((development) => {
      const isGreaterThanMinimum = value >= development.min
      const isLessThanMaximum =
        development.max === null || value <= development.max

      return isGreaterThanMinimum && isLessThanMaximum
    })?.type ?? null
  )
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

  // elemento que se podria desbloquear con esa suma
  const unlockableDevelopmentType =
    selectedDiceSum > 0 ? getDevelopmentForSum(selectedDiceSum) : null

  // ayuda para saber si un elemento ya esta disponible esta ronda
  const isDevelopmentUnlocked = (type: DevelopmentType) =>
    unlockedDevelopments.some((development) => development.type === type)

  // valida en cliente si la seleccion puede desbloquear algo
  const canUnlockSelectedDevelopment =
    Boolean(activeRound?.dice) &&
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
    Boolean(selectedDevelopmentType) &&
    selectedDice.length > 0 &&
    unlockedDevelopments.some(
      (development) => development.type === selectedDevelopmentType,
    )

  // casillas que se iluminan porque coinciden con la suma seleccionada
  const highlightedCellKeys =
    gameSession && canPlaceSelectedDevelopment
      ? gameSession.state.board
          .flat()
          .filter(
            (cell) =>
              cell.kind === 'PARK' &&
              !cell.development &&
              cell.printedValue === selectedDiceSum,
          )
          .map(getCellKey)
      : []

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
    const updatedSession = await sendGameAction(
      'advance-round',
      'advance',
      'No se pudo avanzar la ronda',
    )

    if (updatedSession) {
      setSelectedDiceTypes([])
      setSelectedDevelopmentType(null)
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

  // pagina con tooda la partida -_-
  return (
    <Box minH="100vh" bg="gray.50">
      <Navbar username={user?.username} onLogout={handleLogout} />

      <PageContainer py={{ base: 8, md: 10 }}>
        {pageError || !gameSession ? (
          <Box
            bg="white"
            border="1px solid"
            borderColor="blackAlpha.200"
            borderRadius="md"
            p={{ base: 5, md: 8 }}
          >
            <VStack gap={4}>
              <Heading size="md" color="gray.800">
                No se puede abrir esta partida
              </Heading>
              <Text color="gray.600">{pageError}</Text>
              <Button onClick={() => navigate('/')}>Volver al menu</Button>
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
                <Text color="gray.600">
                  Ronda {gameSession.state.currentRound} de{' '}
                  {gameSession.state.totalRounds}
                </Text>
              </Box>

              <HStack gap={2} flexWrap="wrap">
                {gameSession.state.rounds.map((round) => {
                  // color de cada casilla del contador de rondas
                  const isCurrent =
                    round.roundNumber === gameSession.state.currentRound
                  const isCompleted = round.completed

                  return (
                    <Box
                      key={round.roundNumber}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      minW="36px"
                      h="34px"
                      border="1px solid"
                      borderColor={
                        isCurrent
                          ? 'green.700'
                          : isCompleted
                            ? 'gray.300'
                            : 'blackAlpha.300'
                      }
                      bg={
                        isCurrent
                          ? 'green.600'
                          : isCompleted
                            ? 'gray.200'
                            : 'white'
                      }
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

            <Grid
              templateColumns={{ base: '1fr', xl: 'minmax(0, 1fr) 620px' }}
              gap={6}
              alignItems="start"
            >
              <Box>
                <ParkSheetBoard
                  gameState={gameSession.state}
                  highlightedCellKeys={highlightedCellKeys}
                  onCellClick={handlePlaceDevelopment}
                />
              </Box>

              <VStack align="stretch" gap={4}>
                <Box
                  border="1px solid"
                  borderColor="blackAlpha.200"
                  borderRadius="md"
                  p={4}
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
                          : 'Todavia no se han tirado los dados.'}
                      </Text>
                    </Box>

                    <Button
                      w={{ base: '100%', md: 'auto' }}
                      bg="green.600"
                      color="white"
                      _hover={{ bg: 'green.700' }}
                      loading={actionLoading === 'roll'}
                      disabled={Boolean(activeRound?.dice)}
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
                          cursor={canSelect ? 'pointer' : 'default'}
                          p={1}
                          onClick={() => handleToggleDice(dice)}
                        >
                          <DiceIcon
                            type={dice.type}
                            value={dice.value}
                            used={dice.used}
                            width="82px"
                            height="82px"
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

                    {canAdvanceRound && (
                      <Button
                        size="sm"
                        bg="green.600"
                        color="white"
                        _hover={{ bg: 'green.700' }}
                        loading={actionLoading === 'advance'}
                        onClick={handleAdvanceRound}
                      >
                        Avanzar ronda
                      </Button>
                    )}
                  </HStack>
                </Box>

                <Box
                  border="1px solid"
                  borderColor="blackAlpha.200"
                  borderRadius="md"
                  p={4}
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
                    alignItems="start"
                    w="full"
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
                      const borderColor = canUnlockThis
                        ? 'orange.500'
                        : isSelected
                          ? 'green.600'
                          : isSelectable
                            ? 'green.300'
                            : 'transparent'
                      const bgColor = canUnlockThis
                        ? 'orange.50'
                        : isSelected
                          ? 'green.100'
                          : isSelectable
                            ? 'green.50'
                            : 'white'
                      const statusText = canUnlockThis
                        ? 'Desbloquear'
                        : isSelected
                          ? 'Seleccionado'
                          : ''

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
                            canUnlockThis || isUnlocked ? 'pointer' : 'default'
                          }
                          p={2}
                          onClick={() => {
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
                            width="86px"
                            height="86px"
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
                          {isUnlocked && (
                            <Text color="green.700" fontSize="xs" mt={1}>
                              Colocados: {roundDevelopment?.placedCount ?? 0}
                            </Text>
                          )}
                          {statusText && (
                            <Text
                              color={canUnlockThis ? 'orange.700' : 'green.700'}
                              fontSize="xs"
                              fontWeight="bold"
                              mt={1}
                            >
                              {statusText}
                            </Text>
                          )}
                        </Box>
                      )
                    })}
                  </Grid>
                </Box>

                {actionError && (
                  <Box
                    border="1px solid"
                    borderColor="red.200"
                    bg="red.50"
                    borderRadius="md"
                    p={3}
                  >
                    <Text color="red.700" fontSize="sm">
                      {actionError}
                    </Text>
                  </Box>
                )}
              </VStack>
            </Grid>
          </Box>
        )}
      </PageContainer>
    </Box>
  )
}

export default GameSessionPage
