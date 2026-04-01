/*
https://reactrouter.com/api/hooks/useNavigate
https://chakra-ui.com/docs/components/concepts/overview
https://www.robinwieruch.de/react-function-component/
*/

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react'
import Navbar from '../components/Navbar'
import PageContainer from '../components/PageContainer'
import { API_URL, TOKEN_KEY } from '../config'
import type { GameSession, User } from '../types'

function HomePage() {
  const navigate = useNavigate()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [creatingGame, setCreatingGame] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // se comprueba si hay token antes de pedir datos
    const token = localStorage.getItem(TOKEN_KEY)

    if (!token) {
      navigate('/login')
      return
    }

    // carga el usuario para mostrar el nombre en la pantalla
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('No se pudo obtener el usuario autenticado')
        }

        const data: User = await response.json()
        setUser(data)
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
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

  // pagina con bienvenida y boton de crear partida
  return (
    <Box minH="100vh" bg="gray.50">
      <Navbar username={user?.username} onLogout={handleLogout} />

      <PageContainer py={{ base: 14, md: 20 }}>
        <Box
          maxW="720px"
          mx="auto"
          bg="white"
          border="1px solid"
          borderColor="blackAlpha.200"
          borderRadius="md"
          p={{ base: 6, md: 10 }}
        >
          <VStack gap={6} textAlign="center">
            <Heading size="2xl" color="green.700">
              Bienvenido {user?.username}!
            </Heading>

            <Text color="gray.600" fontSize="lg">
              Crea una nueva partida para empezar con una hoja oficial aleatoria.
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
      </PageContainer>
    </Box>
  )
}

export default HomePage
