/*
https://chakra-ui.com/docs/components/concepts/overview
https://react.dev/learn/rendering-lists
*/

import { Box, Text } from '@chakra-ui/react'
import { DevelopmentIcon } from './GameIcons'
import type { GameState, ParkCell } from '../types'

type Props = {
  gameState: GameState
  highlightedCellKeys?: string[]
  onCellClick?: (cell: ParkCell) => void
}

// marca el borde grueso de la zona cercana a la casilla de info
function getVicinityBorder(cell: ParkCell) {
  // en las hojas esta zona es la matriz 3x3 del centro
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
function ParkSheetBoard({
  gameState,
  highlightedCellKeys = [],
  onCellClick,
}: Props) {
  const highlightedCells = new Set(highlightedCellKeys)

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
        const cellKey = `${cell.row}-${cell.column}`
        const isInfoBooth = cell.kind === 'INFO_BOOTH'
        const isHighlighted = highlightedCells.has(cellKey)
        const canClick = isHighlighted && Boolean(onCellClick)

        return (
          <Box
            key={cellKey}
            as={canClick ? 'button' : 'div'}
            display="flex"
            alignItems="center"
            justifyContent="center"
            aspectRatio="1"
            border="1px solid"
            borderColor="blackAlpha.300"
            bg="white"
            color="gray.700"
            cursor={canClick ? 'pointer' : 'default'}
            fontWeight="medium"
            fontSize={{ base: 'sm', md: 'md' }}
            outline={isHighlighted ? '3px solid' : undefined}
            outlineColor={isHighlighted ? 'green.500' : undefined}
            outlineOffset="-3px"
            boxSizing="border-box"
            onClick={canClick ? () => onCellClick?.(cell) : undefined}
            _hover={canClick ? { bg: 'green.50' } : undefined}
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
            ) : cell.development ? (
              <DevelopmentIcon
                type={cell.development}
                width="88%"
                height="88%"
              />
            ) : (
              <Text lineHeight="1">{cell.printedValue}</Text>
            )}
          </Box>
        )
      })}
    </Box>
  )
}

export default ParkSheetBoard
