/*
https://reactrouter.com/api/hooks/useNavigate
https://chakra-ui.com/docs/components/concepts/overview
https://chakra-ui.com/docs/get-started/installation
https://www.robinwieruch.de/react-function-component/
*/

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Heading, Input, Text, VStack } from '@chakra-ui/react'
import Navbar from '../components/Navbar'
import PageContainer from '../components/PageContainer'
import { API_URL } from '../config'

function RegisterPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          username,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const message = Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message || 'Error al registrar el usuario'

        throw new Error(message)
      }

      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <Navbar showAuthLinks />

      <PageContainer>
        <Box
          w="full"
          maxW="460px"
          bg="white"
          p={8}
          borderRadius="xl"
          boxShadow="lg"
          mx="auto"
        >
          <VStack gap={5} align="stretch">
            <Box textAlign="center">
              <Heading 
                size="lg" 
                mb={2}
              >
                Registro
              </Heading>

              <Text color="gray.600">
                ¡Crea tu cuenta para empezar a jugar a Polyhedral Park Planner!
              </Text>
            </Box>

            {error && (
              <Box 
                bg="red.50" 
                color="red.700" 
                p={3} 
                borderRadius="md"
                >
                {error}
              </Box>
            )}

            <form onSubmit={handleSubmit}>
              <VStack gap={4} align="stretch">
                <Box>
                  <Text mb={2} fontWeight="medium">
                    Email
                  </Text>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="correo@ejemplo.com"
                    bg="white"
                    required
                  />
                </Box>

                <Box>
                  <Text mb={2} fontWeight="medium">
                    Username
                  </Text>
                  <Input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="example123"
                    bg="white"
                    required
                  />
                </Box>

                <Box>
                  <Text mb={2} fontWeight="medium">
                    Contraseña
                  </Text>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="******"
                    bg="white"
                    required
                  />
                </Box>

                <Button 
                  type="submit" 
                  bg="green.600" 
                  color="white" 
                  _hover={{ bg: 'green.700' }}
                >
                  {loading ? 'Registrando...' : 'Registrarse'}
                </Button>
              </VStack>
            </form>
          </VStack>
        </Box>
      </PageContainer>
    </Box>
  )
}

export default RegisterPage
