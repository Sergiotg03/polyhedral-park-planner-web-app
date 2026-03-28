/*
https://chakra-ui.com/docs/components/concepts/overview
https://react.dev/learn/rendering-lists
*/

import { Box, Text } from '@chakra-ui/react'
import type { GameState, ParkCell } from '../types'

type Props = {
  gameState: GameState
}

// decide que texto se pinta dentro de cada celda
function getCellLabel(cell: ParkCell) {
  if (cell.kind === 'INFO_BOOTH') {
    return null
  }

  return cell.printedValue
}

// marca el borde grueso de la zona cercana a la casilla de info
function getVicinityBorder(cell: ParkCell) {
  const isInInfoBoothVicinity =
    cell.row >= 4 && cell.row <= 6 && cell.column >= 4 && cell.column <= 6

  if (!isInInfoBoothVicinity) {
    return {}
  }

  return {
    borderTopWidth: cell.row === 4 ? '3px' : '1px',
    borderRightWidth: cell.column === 6 ? '3px' : '1px',
    borderBottomWidth: cell.row === 6 ? '3px' : '1px',
    borderLeftWidth: cell.column === 4 ? '3px' : '1px',
    borderColor: 'gray.800',
  }
}

// pinta la matriz 9x9 recibida del backend
function ParkSheetBoard({ gameState }: Props) {
  return (
    <Box
      display="grid"
      gridTemplateColumns="repeat(9, minmax(28px, 1fr))"
      gap={0}
      w="100%"
      maxW="620px"
      mx="auto"
      aspectRatio="1"
      border="2px solid"
      borderColor="gray.800"
      bg="white"
    >
      {gameState.board.flat().map((cell) => {
        const isInfoBooth = cell.kind === 'INFO_BOOTH'

        return (
          <Box
            key={`${cell.row}-${cell.column}`}
            display="flex"
            alignItems="center"
            justifyContent="center"
            aspectRatio="1"
            border="1px solid"
            borderColor="blackAlpha.300"
            bg="white"
            color="gray.700"
            fontWeight="medium"
            fontSize={{ base: 'sm', md: 'md' }}
            boxSizing="border-box"
            {...getVicinityBorder(cell)}
          >
            {isInfoBooth ? (
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                w={{ base: '24px', md: '34px' }}
                h={{ base: '24px', md: '34px' }}
                border="3px solid"
                borderColor="gray.900"
                borderRadius="full"
                color="gray.900"
                fontFamily="Georgia, serif"
                fontSize={{ base: 'xl', md: '3xl' }}
                fontWeight="bold"
                lineHeight="1"
              >
                i
              </Box>
            ) : (
              <Text lineHeight="1">{getCellLabel(cell)}</Text>
            )}
          </Box>
        )
      })}
    </Box>
  )
}

export default ParkSheetBoard
