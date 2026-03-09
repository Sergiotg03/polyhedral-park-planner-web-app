/*
https://chakra-ui.com/docs/components/concepts/overview
https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/function_components/
https://legacy.reactjs.org/docs/components-and-props.html
https://react.dev/learn/passing-props-to-a-component
https://www.robinwieruch.de/react-function-component/
*/

import type { ReactNode } from 'react'
import { Box } from '@chakra-ui/react'

type Props = {
  children: ReactNode
  py?: number | { base?: number; md?: number }
}

function PageContainer({ children, py = { base: 12, md: 20 } }: Props) {
  return (
    <Box
      maxW="1400px"
      mx="auto"
      px={{ base: 4, md: 8 }}
      py={py}
      w="100%"
    >
      {children}
    </Box>
  )
}

export default PageContainer
