import type { ReactElement, SVGProps } from 'react'
import type { DevelopmentType, DiceType } from '../types'

type IconProps = SVGProps<SVGSVGElement>
type DiceIconProps = {
  type: DiceType
  value?: number | null
  used?: boolean
  width?: string | number
  height?: string | number
  numberFontSize?: string | number
  numberFontWeight?: string | number
}

export function TreeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="Árbol" {...props}>
      <g transform="translate(50 50) scale(1.12) translate(-50 -50)">
      <path
        d="M48 78 L54 78 L57 46 L45 46 Z"
        fill="#5c8f1f"
        stroke="#1f2f12"
        strokeWidth="2"
      />
      <path
        d="M25 68 C15 63 18 50 27 48 C18 40 24 29 35 31 C38 18 55 20 58 31 C70 25 82 35 75 47 C88 51 85 70 70 68 C60 75 48 69 42 70 C36 75 28 73 25 68 Z"
        fill="#5a9d20"
        stroke="#1f2f12"
        strokeWidth="3"
      />
      {[32, 41, 53, 64, 71, 25, 45, 59].map((x, index) => (
        <circle
          key={x}
          cx={x}
          cy={[54, 35, 27, 43, 58, 64, 57, 55][index]}
          r="3"
          fill="#e7e7e7"
          stroke="#333"
          strokeWidth="1"
        />
      ))}
      <path d="M31 82 L72 82 L52 76 Z" fill="#5c8f1f" stroke="#1f2f12" />
      </g>
    </svg>
  )
}

export function PathIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="Camino" {...props}>
      {[50, 22, 78, 50, 50].map((cx, index) => (
        <circle
          key={`${cx}-${index}`}
          cx={cx}
          cy={[20, 50, 50, 50, 80][index]}
          r="8"
          fill="none"
          stroke="#666"
          strokeWidth="4"
        />
      ))}
    </svg>
  )
}

export function WaterIcon(props: IconProps) {
  return (
    <svg viewBox="9 15 86 74" role="img" aria-label="Agua" {...props}>
      <path
        d="M15 38 L38 22 L46 36 L61 25 L69 38 L81 27 L90 41 L73 56 L65 43 L48 57 L40 44 L24 56 L15 50 Z"
        fill="#455be8"
        stroke="#1b267b"
        strokeWidth="2"
      />
      <path
        d="M15 66 L38 50 L46 64 L61 53 L69 66 L81 55 L90 69 L73 84 L65 71 L48 85 L40 72 L24 84 L15 78 Z"
        fill="#455be8"
        stroke="#1b267b"
        strokeWidth="2"
      />
    </svg>
  )
}

export function BenchIcon(props: IconProps) {
  return (
    <svg viewBox="10 24 80 62" role="img" aria-label="Banco" {...props}>
      <rect x="20" y="32" width="60" height="13" fill="#8b5a2b" stroke="#222" />
      <rect x="16" y="58" width="68" height="7" fill="#8b5a2b" stroke="#222" />
      <rect x="25" y="68" width="7" height="12" fill="#8b5a2b" stroke="#222" />
      <rect x="69" y="68" width="7" height="12" fill="#8b5a2b" stroke="#222" />
      <rect x="34" y="49" width="4" height="5" fill="#8b5a2b" stroke="#222" />
      <rect x="62" y="49" width="4" height="5" fill="#8b5a2b" stroke="#222" />
    </svg>
  )
}

const developmentIcons: Record<
  DevelopmentType,
  (props: IconProps) => ReactElement
> = {
  TREE: TreeIcon,
  PATH: PathIcon,
  WATER: WaterIcon,
  BENCH: BenchIcon,
}

export function DevelopmentIcon({
  type,
  ...props
}: IconProps & { type: DevelopmentType }) {
  const Icon = developmentIcons[type]

  return <Icon {...props} />
}

const diceShapes: Record<DiceType, string> = {
  D4: '50,6 94,86 6,86',
  D6: '16,16 84,16 84,84 16,84',
  D8: '50,5 94,50 50,95 6,50',
  D10: '50,4 88,26 77,77 50,97 23,77 12,26',
  D12: '50,5 78,15 94,39 89,69 66,90 34,90 11,69 6,39 22,15',
  D20: '50,4 89,24 89,77 50,97 11,77 11,24',
}

const diceFacets: Record<DiceType, string[]> = {
  D4: ['50,6 50,60 6,86', '50,6 94,86 50,60', '6,86 50,60 94,86'],
  D6: [
    '16,16 50,16 50,50 16,50',
    '50,16 84,16 84,50 50,50',
    '16,50 50,50 84,84 16,84',
  ],
  D8: [
    '50,5 50,50 6,50',
    '50,5 94,50 50,50',
    '6,50 50,50 50,95',
    '50,50 94,50 50,95',
  ],
  D10: [
    '50,4 88,26 50,54 12,26',
    '12,26 50,54 23,77',
    '88,26 77,77 50,54',
    '23,77 50,54 50,97',
    '50,54 77,77 50,97',
  ],
  D12: [
    '50,5 78,15 50,52 22,15',
    '22,15 50,52 11,69 6,39',
    '78,15 94,39 89,69 50,52',
    '11,69 34,90 50,52',
    '50,52 66,90 89,69',
    '34,90 50,52 66,90',
  ],
  D20: [
    '50,4 89,24 50,52 11,24',
    '11,24 50,52 11,77',
    '89,24 89,77 50,52',
    '11,77 50,52 50,97',
    '50,52 89,77 50,97',
  ],
}

const facetColors = ['#7ee36d', '#59cf58', '#33b94c', '#69da63', '#249b3e']
const disabledFacetColors = ['#d1d5db', '#c4c9d0', '#aeb4bd', '#d8dce1']

const diceNumberTop: Record<DiceType, string> = {
  D4: '58%',
  D6: '51%',
  D8: '52%',
  D10: '53%',
  D12: '53%',
  D20: '53%',
}

export function DiceIcon({
  type,
  value,
  used = false,
  width,
  height,
  numberFontSize,
  numberFontWeight,
}: DiceIconProps) {
  const size = width ?? '88px'
  const hasValue = typeof value === 'number' && !used
  const numberSize = numberFontSize ?? (hasValue && value >= 10 ? '24px' : '28px')
  const currentFacetColors = hasValue ? facetColors : disabledFacetColors
  const fillColor = hasValue ? '#38b84c' : '#b8bec7'
  const strokeColor = hasValue ? '#23412b' : '#6b7280'
  let diceLabel = `${type}: pendiente`

  if (used) {
    diceLabel = `${type}: usado`
  } else if (hasValue) {
    diceLabel = `${type}: ${value}`
  }

  return (
    <span
      aria-label={diceLabel}
      role="img"
      style={{
        alignItems: 'center',
        display: 'inline-flex',
        height: height ?? size,
        justifyContent: 'center',
        position: 'relative',
        width: size,
      }}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
      >
        <polygon
          points={diceShapes[type]}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="5"
          strokeLinejoin="round"
        />
        {diceFacets[type].map((points, index) => (
          <polygon
            key={points}
            points={points}
            fill={currentFacetColors[index % currentFacetColors.length]}
            opacity="0.94"
          />
        ))}
        <polygon
          points={diceShapes[type]}
          fill="none"
          stroke={strokeColor}
          strokeWidth="5"
          strokeLinejoin="round"
        />
      </svg>

      {hasValue && (
        <span
          aria-hidden="true"
          style={{
            color: '#ffffff',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: numberSize,
            fontWeight: numberFontWeight ?? 800,
            left: '50%',
            lineHeight: 1,
            position: 'absolute',
            textShadow: '0 2px 2px rgba(0, 0, 0, 0.7)',
            top: diceNumberTop[type],
            transform: 'translate(-50%, -50%)',
          }}
        >
          {value}
        </span>
      )}

      {used && (
        <span
          aria-hidden="true"
          style={{
            color: '#333333',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '40px',
            fontWeight: 900,
            left: '50%',
            lineHeight: 1,
            position: 'absolute',
            top: '52%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          X
        </span>
      )}
    </span>
  )
}
