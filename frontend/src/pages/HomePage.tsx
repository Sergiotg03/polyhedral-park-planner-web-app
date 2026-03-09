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
import type { User } from '../types'

function HomePage() {
  const navigate = useNavigate()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)

    if (!token) {
      navigate('/login')
      return
    }

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
      } catch (err) {
        localStorage.removeItem(TOKEN_KEY)
        setError(err instanceof Error ? err.message : 'Error inesperado')
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY)
    navigate('/login')
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

  return (
    <Box minH="100vh" bg="gray.50">
      <Navbar username={user?.username} onLogout={handleLogout} />

      <PageContainer py={{ base: 16, md: 24 }}>
        <Box display="flex" alignItems="center" justifyContent="center">
          <VStack gap={6} textAlign="center">
            <Heading size="2xl" color="green.600">
              ¡Bienvenido {user?.username}!
            </Heading>

            <Text color="gray.600" fontSize="lg">
              Bienvenido a la versión web de Polyhedral Park Planner.
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
              onClick={handleLogout}
            >
              Cerrar sesión
            </Button>
          </VStack>
        </Box>
      </PageContainer>
    </Box>
  )
}

export default HomePage
