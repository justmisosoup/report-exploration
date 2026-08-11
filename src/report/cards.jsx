// Card chrome shared by the Report page — ported verbatim from the app repo's
// src/containers/BusinessHome/Report/cards.ts (styled-components, old-core
// theme palette), minus TypeScript types.
import styled from 'styled-components'
import { colors, spacing, typography } from '@/core/theme'

export const Serif = styled.span`
  font-family: 'Suisse Intl', sans-serif;
  font-weight: ${typography.weights.light};
  letter-spacing: -0.02em;
`

export const Card = styled.section`
  background: ${colors.white};
  border: 1px solid ${colors.midnightLight2};
  border-radius: 10px;
  overflow: hidden;
`

export const CardHead = styled.div`
  align-items: baseline;
  border-bottom: 1px solid ${colors.midnightLight2};
  display: flex;
  justify-content: space-between;
  padding: 18px 22px;
`

export const CardTitle = styled(Serif)`
  color: var(--core-color-text-primary);
  font-size: 20px;
  font-weight: ${typography.weights.bold};
`

export const SummaryText = styled.p`
  color: ${colors.karl};
  font-size: ${typography.sizes.medium};
  line-height: 1.6;
  margin: 0;
  padding: 20px 22px 24px;
`
