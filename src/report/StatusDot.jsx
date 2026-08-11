// StatusDot + StatusDotLabel — ported from the app repo's
// src/components/StatusDot/. The app reads intent colors from
// tailwindcss/colors (a JS export Tailwind v4 no longer ships), so the same
// palette values are inlined here.
import React from 'react'
import { Circle, CircleAlert, CircleCheck, CircleX } from 'lucide-react'
import styled from 'styled-components'
import { colors, spacing, typography } from '@/core/theme'

export const INTENT_COLOR = {
  success: '#16a34a', // green-600
  warning: '#d97706', // amber-600
  failure: '#dc2626', // red-600
  unknown: '#94a3b8', // slate-400
  pending: '#cbd5e1', // slate-300
}

const INTENT_ICON = {
  success: CircleCheck,
  warning: CircleAlert,
  failure: CircleX,
  unknown: Circle,
  pending: Circle,
}

const IconWrapper = styled.span`
  display: inline-block;
  flex: 0 0 auto;
  line-height: 0;
  vertical-align: middle;
`

export const StatusDot = ({ color, intent = 'unknown', size = 16, className }) => {
  const IconComponent = INTENT_ICON[intent] || Circle
  return (
    <IconWrapper className={className}>
      <IconComponent size={size} color={color || INTENT_COLOR[intent]} strokeWidth={2.5} />
    </IconWrapper>
  )
}

const StyledStatusDotLabel = styled.div`
  display: flex;
  font-size: ${({ labelSize = 'medium' }) => typography.sizes[labelSize]};
  gap: 0.5em;

  ${({ outlined }) =>
    outlined
      ? `border: 1px solid ${colors.frost}; border-radius: 4px; padding: ${spacing.xxsmall} ${spacing.small};`
      : ''}

  ${({ labelPosition }) => {
    switch (labelPosition) {
      case 'bottom':
        return 'flex-direction: column; text-align: center;'
      case 'top':
        return 'flex-direction: column-reverse; text-align: center;'
      case 'left':
        return 'flex-direction: row-reverse;'
      case 'right':
      default:
        return 'flex-direction: row;'
    }
  }}
`

const Label = styled.span`
  vertical-align: middle;
  ${({ labelColor }) => (labelColor ? `color: ${labelColor};` : '')}
`

export const StatusDotLabel = ({
  children,
  className,
  label,
  labelColor,
  labelPosition = 'right',
  labelSize = 'medium',
  outlined,
  ...dotProps
}) => (
  <StyledStatusDotLabel
    className={className}
    labelPosition={labelPosition}
    labelSize={labelSize}
    outlined={outlined}
  >
    <span>
      <StatusDot {...dotProps} />
    </span>
    <span>
      <Label labelColor={labelColor}>{label || children}</Label>
    </span>
  </StyledStatusDotLabel>
)
