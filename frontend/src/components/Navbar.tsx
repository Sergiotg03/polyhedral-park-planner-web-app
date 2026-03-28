/*
https://reactrouter.com/api/hooks/useNavigate
https://chakra-ui.com/docs/components/concepts/overview
https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/function_components/
https://legacy.reactjs.org/docs/components-and-props.html
https://react.dev/learn/passing-props-to-a-component
https://www.robinwieruch.de/react-function-component/
*/

import { Box, Button, HStack, Image, Link, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import logo from '../assets/ppp-full-logo.png'
import PageContainer from './PageContainer'

type Props = {
  username?: string
  showAuthLinks?: boolean
  onLogout?: () => void
}

function Navbar({ username, showAuthLinks = false, onLogout }: Props) {
  return (
    <Box
      as="header"
      bg="white"
      borderBottom="1px solid"
      borderColor="blackAlpha.100"
      boxShadow="sm"
      position="relative"
      zIndex={10}
    >
      <PageContainer py={4}>
        <HStack justify="space-between" align="center" gap={4}>
          <HStack gap={3} minW={0}>
            <Link asChild aria-label="Volver al menu principal">
              <RouterLink to="/">
                <Image
                  src={logo}
                  alt="Polyhedral Park Planner"
                  h={{ base: '36px', md: '44px' }}
                  w="auto"
                  objectFit="contain"
                  flexShrink={0}
                />
              </RouterLink>
            </Link>
          </HStack>

          {showAuthLinks ? (
            <HStack gap={5} flexShrink={0}>
              <Link asChild color="green.700" fontWeight="medium">
                <RouterLink to="/login">Iniciar sesión</RouterLink>
              </Link>

              <Link asChild color="green.600" fontWeight="medium">
                <RouterLink to="/register">Registrarse</RouterLink>
              </Link>
            </HStack>
          ) : (
            <HStack gap={4} flexShrink={0}>
              <Text color="green.700" fontWeight="medium">
                {username}
              </Text>

              <Button
                size="sm"
                bg="green.600"
                color="white"
                _hover={{ bg: 'green.700' }}
                onClick={onLogout}
              >
                Cerrar sesión
              </Button>
            </HStack>
          )}
        </HStack>
      </PageContainer>
    </Box>
  )
}

export default Navbar
