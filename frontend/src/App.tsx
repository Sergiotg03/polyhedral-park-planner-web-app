import { Box, Heading, Text, VStack } from '@chakra-ui/react'

function App() {
  return (
    <Box minH="100vh" bg="gray.50" py={10}>
      <VStack gap={4}>
        <Heading>Polyhedral Park Planner Web App</Heading>
        <Text>Frontend funcionando con React, Vite y Chakra UI.</Text>
      </VStack>
    </Box>
  )
}

export default App
