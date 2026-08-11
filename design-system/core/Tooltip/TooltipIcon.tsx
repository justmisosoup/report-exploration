import React from 'react'

import { InfoCircledIcon } from '@radix-ui/react-icons'

import { colors } from '../theme'
import { navigateWithTurbo } from '../utils/navigation'

import { Tooltip } from './Tooltip'

export const TooltipIcon = ({
  content,
  text,
  url
}: {
  content?: string
  text?: string
  url?: string
}) => {
  const icon = (
    <InfoCircledIcon
      height='18px'
      width='18px'
      color={colors.graphite}
      onClick={e => {
        e.preventDefault()
        url && navigateWithTurbo(url, '_blank')
      }}
    />
  )

  return <Tooltip content={content || text} trigger={icon} />
}
