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
  Heading,
  HStack,
  Grid,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { DevelopmentIcon, DiceIcon } from '../components/GameIcons'
import Navbar from '../components/Navbar'
import PageContainer from '../components/PageContainer'
import ParkSheetBoard from '../components/ParkSheetBoard'
import { API_URL, TOKEN_KEY } from '../config'
import type { DevelopmentType, DiceType, GameSession, User } from '../types'

const DEVELOPMENT_REFERENCE: Array<{
  type: DevelopmentType
  label: string
  range: string
}> = [
  { type: 'TREE', label: 'Arbol', range: '1-4' },
  { type: 'PATH', label: 'Camino', range: '5-8' },
  { type: 'WATER', label: 'Agua', range: '9-12' },
  { type: 'BENCH', label: 'Banco', range: '13+' },
]

const DICE_REFERENCE: DiceType[] = ['D4', 'D6', 'D8', 'D10', 'D12', 'D20']

type VisibleDice = {
  type: DiceType
  value: number | null
  used: boolean
}

function GameSessionPage() {
  // id que viene en la url
  const { id } = useParams()
  const navigate = useNavigate()

  const [user, setUser] = useState<User | null>(null)
  const [gameSession, setGameSession] = useState<GameSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [rollingDice, setRollingDice] = useState(false)
  const [error, setError] = useState('')

  const activeRound =
    gameSession?.state.rounds.find(
      (round) => round.roundNumber === gameSession.state.currentRound,
    ) ?? null

  // si aun no se han tirado dados, se pintan los dados vacios en gris
  let visibleDice: VisibleDice[] = []

  if (activeRound?.dice) {
    visibleDice = activeRound.dice
  } else {
    visibleDice = DICE_REFERENCE.map((type) => ({
      type,
      value: null,
      used: false,
    }))
  }

  useEffect(() => {
    // si no hay token no se puede abrir la partida
    const token = localStorage.getItem(TOKEN_KEY)

    if (!token) {
      navigate('/login')
      return
    }

    // si la url no trae id no hay partida que cargar
    if (!id) {
      setError('No se ha indicado la partida')
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
        setError(message)

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

  // tira los dados de la ronda actual
  const handleRollDice = async () => {
    const token = localStorage.getItem(TOKEN_KEY)

    if (!token || !id) {
      navigate('/login')
      return
    }

    setRollingDice(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/game-sessions/${id}/roll-dice`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('No se pudieron tirar los dados')
      }

      const updatedSession: GameSession = await response.json()
      setGameSession(updatedSession)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setRollingDice(false)
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
        {error || !gameSession ? (
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
              <Text color="gray.600">{error}</Text>
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
                <Text color="gray.600">
                  ID: {gameSession.id}
                </Text>
                <Text color="gray.600">
                  Ronda {gameSession.currentRound} de {gameSession.state.totalRounds}
                </Text>
              </Box>

              <Text
                color="green.700"
                fontWeight="medium"
                bg="green.50"
                px={3}
                py={1}
                borderRadius="md"
              >
                {gameSession.status}
              </Text>
            </HStack>

            <Grid
              templateColumns={{ base: '1fr', xl: 'minmax(0, 1fr) 620px' }}
              gap={6}
              alignItems="start"
            >
              <Box>
                <ParkSheetBoard gameState={gameSession.state} />
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
                      loading={rollingDice}
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
                    {visibleDice.map((dice) => (
                      <Box
                        key={dice.type}
                        minW={0}
                        bg={dice.used ? 'gray.100' : 'white'}
                        textAlign="center"
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                      >
                        <DiceIcon
                          type={dice.type}
                          value={dice.value}
                          width="88px"
                          height="88px"
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
                    ))}
                  </Grid>
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
                    {DEVELOPMENT_REFERENCE.map((development) => (
                      <Box
                        key={development.type}
                        minW={0}
                        textAlign="center"
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                      >
                        <DevelopmentIcon
                          type={development.type}
                          width="78px"
                          height="78px"
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
                      </Box>
                    ))}
                  </Grid>
                </Box>
              </VStack>
            </Grid>
          </Box>
        )}
      </PageContainer>
    </Box>
  )
}

export default GameSessionPage
