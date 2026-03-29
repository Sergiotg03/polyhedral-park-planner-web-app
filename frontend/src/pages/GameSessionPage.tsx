/*
https://reactrouter.com/api/hooks/useParams
https://reactrouter.com/api/hooks/useNavigate
https://chakra-ui.com/docs/components/concepts/overview
*/

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Box, Button, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import Navbar from '../components/Navbar'
import PageContainer from '../components/PageContainer'
import ParkSheetBoard from '../components/ParkSheetBoard'
import { API_URL, TOKEN_KEY } from '../config'
import type { GameSession, User } from '../types'

function GameSessionPage() {
  // id que viene en la url
  const { id } = useParams()
  const navigate = useNavigate()

  const [user, setUser] = useState<User | null>(null)
  const [gameSession, setGameSession] = useState<GameSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  // pagina con la partida
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

            <ParkSheetBoard gameState={gameSession.state} />
          </Box>
        )}
      </PageContainer>
    </Box>
  )
}

export default GameSessionPage
