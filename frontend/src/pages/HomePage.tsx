/*
https://reactrouter.com/api/hooks/useNavigate
https://chakra-ui.com/docs/components/concepts/overview
https://www.robinwieruch.de/react-function-component/
*/

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Grid,
  Heading,
  HStack,
  Text,
  VStack,
} from '@chakra-ui/react'
import Navbar from '../components/Navbar'
import PageContainer from '../components/PageContainer'
import { API_URL, TOKEN_KEY } from '../config'
import type { DevelopmentType, GameSession, User } from '../types'

const HISTORY_PAGE_SIZE = 5

const DEVELOPMENT_STATS: Array<{ type: DevelopmentType; label: string }> = [
  { type: 'TREE', label: 'Árboles' },
  { type: 'PATH', label: 'Caminos' },
  { type: 'WATER', label: 'Agua' },
  { type: 'BENCH', label: 'Bancos' },
]

// formatea la fecha de creacion para que se lea facil en el historial
function formatSessionDate(date: string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

// texto corto para el resultado de una partida terminada
function getFinishedResult(session: GameSession) {
  if (!session.state.score) {
    return 'Sin puntuación'
  }

  return session.state.score.victoryAchieved ? 'Victoria' : 'Derrota'
}

// puntos que se muestran en el historial
function getScoreText(session: GameSession) {
  if (session.status !== 'COMPLETED' || !session.state.score) {
    return '-'
  }

  return `${session.state.score.total} puntos`
}

// deja los puntos con un solo decimal (solo si hace falta)
function formatStatScore(score: number | null) {
  if (score === null) {
    return '-'
  }

  return Number.isInteger(score) ? `${score}` : score.toFixed(1)
}

// calcula estadisticas sencillas a partir de las partidas cargadas
function getAccountStats(gameSessions: GameSession[]) {
  let wins = 0
  let losses = 0
  let totalScore = 0
  let finishedGames = 0
  let maxScore: number | null = null
  let minScore: number | null = null
  const developmentCounts: Record<DevelopmentType, number> = {
    TREE: 0,
    PATH: 0,
    WATER: 0,
    BENCH: 0,
  }

  gameSessions.forEach((session) => {
    if (session.status === 'COMPLETED' && session.state.score) {
      const score = session.state.score.total

      finishedGames += 1
      totalScore += score

      if (session.state.score.victoryAchieved) {
        wins += 1
      } else {
        losses += 1
      }

      if (maxScore === null || score > maxScore) {
        maxScore = score
      }

      if (minScore === null || score < minScore) {
        minScore = score
      }
    }

    session.state.board.forEach((row) => {
      row.forEach((cell) => {
        if (cell.development) {
          developmentCounts[cell.development] += 1
        }
      })
    })
  })

  return {
    games: gameSessions.length,
    wins,
    losses,
    averageScore: finishedGames > 0 ? totalScore / finishedGames : null,
    maxScore,
    minScore,
    developmentCounts,
  }
}

function HomePage() {
  const navigate = useNavigate()

  const [user, setUser] = useState<User | null>(null)
  const [gameSessions, setGameSessions] = useState<GameSession[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingGame, setCreatingGame] = useState(false)
  const [error, setError] = useState('')

  // paginación
  const [historyPage, setHistoryPage] = useState(1)

  const totalPages = Math.max(
    1,
    Math.ceil(gameSessions.length / HISTORY_PAGE_SIZE),
  )
  const page = Math.min(historyPage, totalPages)
  const start = (page - 1) * HISTORY_PAGE_SIZE
  const end = start + HISTORY_PAGE_SIZE
  const visibleGameSessions = gameSessions.slice(start, end)
  const firstVisibleSession = gameSessions.length === 0 ? 0 : start + 1
  const lastVisibleSession = Math.min(end, gameSessions.length)
  const accountStats = getAccountStats(gameSessions)

  useEffect(() => {
    // se comprueba si hay token antes de pedir datos
    const token = localStorage.getItem(TOKEN_KEY)

    if (!token) {
      navigate('/login')
      return
    }

    // carga el usuario y sus partidas para mostrar el home completo
    const fetchHomeData = async () => {
      try {
        const userResponse = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!userResponse.ok) {
          throw new Error('No se pudo obtener el usuario autenticado')
        }

        const userData: User = await userResponse.json()
        setUser(userData)

        try {
          const sessionsResponse = await fetch(`${API_URL}/game-sessions`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (!sessionsResponse.ok) {
            throw new Error('No se pudo cargar el historial de partidas')
          }

          const sessionsData: GameSession[] = await sessionsResponse.json()
          setGameSessions(sessionsData)
        } catch {
          setError('No se pudo cargar el historial de partidas')
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchHomeData()
  }, [navigate])

  // cierra sesion borrando el token
  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY)
    navigate('/login')
  }

  // crea una partida nueva y abre su ruta con el id
  const handleCreateGame = async () => {
    const token = localStorage.getItem(TOKEN_KEY)

    if (!token) {
      navigate('/login')
      return
    }

    setCreatingGame(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/game-sessions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('No se pudo crear la partida')
      }

      const createdSession: GameSession = await response.json()
      // se navega a la pagina propia de la partida
      navigate(`/game-sessions/${createdSession.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setCreatingGame(false)
    }
  }

  if (loading) {
    return (
      <Box minH="100vh" bg="gray.50">
        <Navbar />
        <PageContainer py={{ base: 16, md: 24 }}>
          <Text>Cargando usuario...</Text>
        </PageContainer>
      </Box>
    )
  }

  // pagina con bienvenida, crear partida e historial
  return (
    <Box minH="100vh" bg="gray.50">
      <Navbar username={user?.username} onLogout={handleLogout} />

      <PageContainer py={{ base: 10, md: 14 }}>
        <Box
          w="100%"
          bg="white"
          border="1px solid"
          borderColor="blackAlpha.200"
          borderRadius="md"
          p={{ base: 6, md: 10 }}
        >
          <VStack gap={6} textAlign="center">
            <Heading size="2xl" color="green.700">
              ¡Bienvenido {user?.username}!
            </Heading>

            <Text color="gray.600" fontSize="lg">
              Crea una nueva partida para empezar a jugar.
            </Text>

            {error && (
              <Box bg="red.50" color="red.700" p={3} borderRadius="md">
                {error}
              </Box>
            )}

            <Button
              size="lg"
              bg="green.600"
              color="white"
              _hover={{ bg: 'green.700' }}
              loading={creatingGame}
              onClick={handleCreateGame}
            >
              Crear nueva partida
            </Button>
          </VStack>
        </Box>

        <Box
          w="100%"
          mt={8}
          bg="white"
          border="1px solid"
          borderColor="blackAlpha.200"
          borderRadius="md"
          p={{ base: 5, md: 7 }}
        >
          <Box mb={5}>
            <Heading size="lg" color="green.700">
              Estadísticas generales
            </Heading>
          </Box>

          <Grid
            templateColumns={{
              base: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(6, minmax(0, 1fr))',
            }}
            gap={3}
          >
            <Box bg="gray.50" borderRadius="md" p={4}>
              <Text color="gray.600" fontSize="sm">
                Partidas totales
              </Text>
              <Text fontSize="2xl" fontWeight="bold">
                {accountStats.games}
              </Text>
            </Box>

            <Box bg="green.50" borderRadius="md" p={4}>
              <Text color="green.700" fontSize="sm">
                Victorias
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="green.700">
                {accountStats.wins}
              </Text>
            </Box>

            <Box bg="red.50" borderRadius="md" p={4}>
              <Text color="red.700" fontSize="sm">
                Derrotas
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="red.700">
                {accountStats.losses}
              </Text>
            </Box>

            <Box bg="gray.50" borderRadius="md" p={4}>
              <Text color="gray.600" fontSize="sm">
                Puntuación Media
              </Text>
              <Text fontSize="2xl" fontWeight="bold">
                {formatStatScore(accountStats.averageScore)}
              </Text>
            </Box>

            <Box bg="gray.50" borderRadius="md" p={4}>
              <Text color="gray.600" fontSize="sm">
                Puntuación Máxima
              </Text>
              <Text fontSize="2xl" fontWeight="bold">
                {formatStatScore(accountStats.maxScore)}
              </Text>
            </Box>

            <Box bg="gray.50" borderRadius="md" p={4}>
              <Text color="gray.600" fontSize="sm">
                Puntuación Mínima
              </Text>
              <Text fontSize="2xl" fontWeight="bold">
                {formatStatScore(accountStats.minScore)}
              </Text>
            </Box>
          </Grid>

          <Box mt={5}>
            <Text fontWeight="bold" color="gray.800" mb={3}>
              Elementos colocados
            </Text>

            <Grid
              templateColumns={{
                base: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(4, minmax(0, 1fr))',
              }}
              gap={3}
            >
              {DEVELOPMENT_STATS.map((development) => (
                <Box
                  key={development.type}
                  border="1px solid"
                  borderColor="blackAlpha.200"
                  borderRadius="md"
                  p={4}
                >
                  <Text color="gray.600" fontSize="sm">
                    {development.label}
                  </Text>
                  <Text fontSize="2xl" fontWeight="bold">
                    {accountStats.developmentCounts[development.type]}
                  </Text>
                </Box>
              ))}
            </Grid>
          </Box>
        </Box>

        <Box
          w="100%"
          mt={8}
          bg="white"
          border="1px solid"
          borderColor="blackAlpha.200"
          borderRadius="md"
          p={{ base: 5, md: 7 }}
        >
          <HStack justify="space-between" align="center" gap={4} mb={5}>
            <Box>
              <Heading size="lg" color="green.700">
                Historial de partidas
              </Heading>
            </Box>

            <Text fontWeight="bold" color="gray.700" flexShrink={0}>
              {gameSessions.length}{' '}
              {gameSessions.length === 1 ? 'partida' : 'partidas'}
            </Text>
          </HStack>

          {gameSessions.length === 0 ? (
            <Box
              border="1px dashed"
              borderColor="blackAlpha.300"
              borderRadius="md"
              p={6}
              textAlign="center"
              color="gray.600"
            >
              Todavía no hay partidas guardadas.
            </Box>
          ) : (
            <VStack align="stretch" gap={3}>
              {visibleGameSessions.map((session) => {
                const isCompleted = session.status === 'COMPLETED'
                const roundNumber =
                  session.state?.currentRound ?? session.currentRound
                const totalRounds = session.state?.totalRounds ?? 10

                return (
                  <Box
                    key={session.id}
                    border="1px solid"
                    borderColor="blackAlpha.200"
                    borderRadius="md"
                    p={4}
                  >
                    <Grid
                      templateColumns={{
                        base: '1fr',
                        md: '320px minmax(280px, 1fr) 128px',
                      }}
                      gap={4}
                      alignItems="center"
                    >
                      <Box>
                        <Grid
                          templateColumns={{
                            base: '1fr',
                            sm: '150px 110px',
                          }}
                          gap={2}
                          alignItems="center"
                          mb={1}
                        >
                          <Text fontWeight="bold" color="gray.900">
                            Partida {session.id.slice(0, 8)}
                          </Text>

                          <Box
                            px={2}
                            py={1}
                            borderRadius="md"
                            bg={isCompleted ? 'gray.100' : 'green.50'}
                            color={isCompleted ? 'gray.700' : 'green.700'}
                            fontWeight="bold"
                            fontSize="sm"
                            textAlign="center"
                            w="fit-content"
                            minW="86px"
                          >
                            {isCompleted ? 'Finalizada' : 'En curso'}
                          </Box>
                        </Grid>

                        <Text color="gray.600" fontSize="sm">
                          Creada el {formatSessionDate(session.createdAt)}
                        </Text>
                      </Box>

                      <Box>
                        {isCompleted ? (
                          <>
                            <Text color="gray.700">
                              Puntuación: <b>{getScoreText(session)}</b>
                            </Text>
                            <Text
                              color={
                                session.state.score?.victoryAchieved
                                  ? 'green.700'
                                  : 'red.700'
                              }
                              fontWeight="bold"
                            >
                              {getFinishedResult(session)}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Text color="gray.700">
                              Ronda actual: <b>{roundNumber}</b> de{' '}
                              {totalRounds}
                            </Text>
                            <Text color="gray.600" fontSize="sm">
                              Puedes continuar desde donde lo dejaste.
                            </Text>
                          </>
                        )}
                      </Box>

                      <Button
                        bg={isCompleted ? 'gray.700' : 'green.600'}
                        color="white"
                        _hover={{ bg: isCompleted ? 'gray.800' : 'green.700' }}
                        justifySelf={{ base: 'stretch', md: 'end' }}
                        w={{ base: '100%', md: '116px' }}
                        onClick={() => navigate(`/game-sessions/${session.id}`)}
                      >
                        {isCompleted ? 'Ver partida' : 'Cargar'}
                      </Button>
                    </Grid>
                  </Box>
                )
              })}

              {gameSessions.length > HISTORY_PAGE_SIZE && (
                <HStack
                  justify="space-between"
                  align="center"
                  gap={4}
                  pt={2}
                  flexWrap="wrap"
                >
                  <Text color="gray.600" fontSize="sm">
                    Mostrando {firstVisibleSession}-{lastVisibleSession} de{' '}
                    {gameSessions.length}
                  </Text>

                  <HStack gap={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page === 1}
                      onClick={() => setHistoryPage(Math.max(1, page - 1))}
                    >
                      Anterior
                    </Button>

                    <Text
                      minW="100px"
                      textAlign="center"
                      color="gray.700"
                      fontWeight="medium"
                    >
                      Página {page} de {totalPages}
                    </Text>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page === totalPages}
                      onClick={() =>
                        setHistoryPage(Math.min(totalPages, page + 1))
                      }
                    >
                      Siguiente
                    </Button>
                  </HStack>
                </HStack>
              )}
            </VStack>
          )}
        </Box>
      </PageContainer>
    </Box>
  )
}

export default HomePage
