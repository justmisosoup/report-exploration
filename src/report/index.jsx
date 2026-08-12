// Report page — ported from the app repo's
// src/containers/BusinessHome/Report/index.tsx. Same component tree, styled
// shells, and @/core primitives (Icon, Link, MetaTag, theme); the app's
// redux/hooks data plumbing is replaced by a `data` prop computed by the
// prototype from the active identity profile.
import React from 'react'
import { Sparkle } from 'lucide-react'
import styled from 'styled-components'

import { ActionButton } from '@/core/Action'
import { MetaChip } from '@/core/Badge'
import { Icon } from '@/core/Icon'
import { TextTooltip } from '@/core/Tooltip'
import { colors, spacing, typography } from '@/core/theme'

import { Card, CardTitle, Serif, SummaryText } from './cards'
import { StatusDot } from './StatusDot'

const EM_DASH = '—'

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const SummaryHead = styled.div`
  align-items: baseline;
  display: flex;
  gap: 10px;
  padding: 18px 22px 0;
`

const AiNote = styled.span`
  align-items: center;
  color: var(--core-color-text-muted);
  display: inline-flex;
  font-size: 12px;
  gap: 4px;
`

const CardGrid = styled.div`
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
`

const MiniCard = styled(Card)`
  display: flex;
  flex-direction: column;
`

// Summary body: each insight bullet is followed by the cards that back it,
// all inside the Summary card.
const SummarySections = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0 22px 24px;
`

// Inline heading in the summary card: bold default-size title.
const SectionHeadTitle = styled.span`
  align-items: center;
  color: var(--core-color-text-primary);
  display: flex;
  font-size: ${typography.sizes.medium};
  font-weight: ${typography.weights.bold};
  gap: 8px;
`

const InsightBullet = styled.div`
  color: ${colors.karl};
  display: flex;
  font-size: ${typography.sizes.medium};
  gap: 8px;
  line-height: 1.6;
`

// Bullet marker: a plain dot, or a status icon when the section is flagged.
// The icon box matches the text's 1.6 line height so it centers on the first
// line of the insight.
const InsightMarker = ({ flag }) =>
  flag ? (
    <span style={{ alignItems: 'center', display: 'inline-flex', flexShrink: 0, height: '1.6em' }}>
      <StatusDot intent={flag} size={14} />
    </span>
  ) : (
    <span aria-hidden='true'>•</span>
  )

// Anchor chip after each insight bullet: names the card that backs the
// insight and scrolls to it in the grid below on click.
const AnchorChip = styled.button`
  align-items: center;
  background: none;
  border: 1px solid ${colors.midnightLight2};
  border-radius: 999px;
  color: var(--core-color-text-muted);
  cursor: pointer;
  display: inline-flex;
  font-family: inherit;
  font-size: 11px;
  gap: 4px;
  line-height: 1;
  margin-left: 8px;
  padding: 3px 8px;
  vertical-align: 2px;
  white-space: nowrap;

  &:hover {
    border-color: ${colors.karl};
    color: var(--core-color-text-primary);
  }
`

// Grid cell wrapper: the anchor target the summary chips scroll to; the
// child card stretches to fill the cell.
const CardAnchor = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  scroll-margin-top: 16px;

  & > * {
    flex: 1;
  }
`

// Chip labels per card key, matching each card's title.
const CARD_LABELS = {
  reputation: 'Online reputation',
  industry: 'Industry risk',
  fraud: 'Transaction laundering & fraud',
  web: 'Web presence',
  verification: 'Entity verification',
  connections: 'Connection risk',
}
const MiniHead = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding: 18px 20px 0;
`

const MiniTitle = styled.div`
  color: var(--core-color-text-primary);
  font-size: ${typography.sizes.medium};
  font-weight: ${typography.weights.bold};
  padding: ${spacing.medium} 20px 0;
`

const MiniBlurb = styled.p`
  color: ${colors.karl};
  display: -webkit-box;
  font-size: ${typography.sizes.medium};
  line-height: 1.5;
  margin: 6px 0 0;
  overflow: hidden;
  padding: 0 20px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
`

// flex: 1 so the footer pins to the card bottom, aligning footers across cards.
const Rows = styled.div`
  flex: 1;
  padding: 14px 20px 4px;
`

const Row = styled.div`
  align-items: center;
  border-top: 1px solid ${colors.midnightLight2};
  display: flex;
  justify-content: space-between;
  padding: 11px 0;

  &:first-child {
    border-top: none;
  }
`

const RowLabel = styled.span`
  color: var(--core-color-text-muted);
  font-size: ${typography.sizes.medium};
`

const RowValue = styled.span`
  color: var(--core-color-text-primary);
  font-size: ${typography.sizes.medium};
  font-weight: ${typography.weights.bold};
  text-align: right;
`

const Bars = styled.div`
  display: flex;
  gap: 4px;
  padding: 12px 20px 4px;
  width: 100%;
`

const Bar = styled.div`
  background-color: ${({ $color }) => $color};
  border-radius: 20px;
  height: 8px;
  width: 100%;
`

const CardFooter = styled.div`
  margin-top: auto;
  padding: 14px 20px;
`

// Nested connection card inside the Connection risk card.
const ConnCard = styled.div`
  border: 1px solid ${colors.midnightLight2};
  border-radius: 8px;
  padding: 12px 14px;

  & + & {
    margin-top: 10px;
  }
`

// Rating bars (RatingCard.getRatingBars, 'risk' type) + the Report tab's
// amber moderate override.
const AMBER_600 = '#D97706'
const AMBER_100 = '#FEF3C7'
const negativeColors = [colors.red, colors.redLight, colors.redLight]
const positiveColors = [colors.greenLight, colors.greenLight, colors.green]
const notSupportedColors = [colors.dawn, colors.dawn, colors.dawn]

const miniBarColors = (level) =>
  level === 'moderate'
    ? [AMBER_100, AMBER_600, AMBER_100]
    : level === 'high'
      ? [...negativeColors].reverse()
      : level === 'low'
        ? [...positiveColors].reverse()
        : notSupportedColors

const RATING_LABEL = { low: 'Low', moderate: 'Moderate', high: 'High', not_available: 'N/A' }
const RATING_TAG = { low: 'green', moderate: 'inactive', high: 'warning', not_available: 'unknown' }
// Verification-check chip: MetaTag intent + label per review-task status.
const CHECK_CHIP = {
  success: ['green', 'Verified'],
  warning: ['inactive', 'Review'],
  failure: ['warning', 'Failed'],
  unknown: ['unknown', 'Not provided'],
}

const bvVerificationStatus = (checks) => {
  const present = checks.filter((c) => c.status !== 'unknown')
  if (present.length === 0) return null
  const verified = present.filter((c) => c.status === 'success').length
  if (verified === present.length) return 'verified'
  if (verified === 0) return 'unverified'
  return 'partial'
}

// Status chips use the new-core Badge (MetaChip); old MetaTag intents map to
// MetaChip tones.
const TAG_TONE = { green: 'success', inactive: 'warning', warning: 'danger', unknown: 'neutral' }
const Chip = ({ type, children }) => (
  <MetaChip tone={TAG_TONE[type] || 'neutral'} size='compact'>{children}</MetaChip>
)

// Monthly-visits trend — a single-series sparkline in midnight (midnightDark1).
// Low-chroma by design: fine for a lone series whose identity comes from the
// label, and it clears the 3:1 contrast check on the light surface.
const CHART_HUE = colors.midnightDark1

// Compact count for stat headlines: 950 → 950, 1,500 → 1.5k, 48,000 → 48k,
// 100,000 → 100k, 2,400,000 → 2.4M.
const compactCount = (n) => {
  if (n < 1000) return String(n)
  if (n < 1e6) {
    const k = n / 1000
    return `${k < 10 ? Math.round(k * 10) / 10 : Math.round(k)}k`
  }
  const m = n / 1e6
  return `${m < 10 ? Math.round(m * 10) / 10 : Math.round(m)}M`
}

const VisitsBlock = styled.div`
  display: flex;
  flex-direction: column;
  padding: 22px 20px 0;
`

const VisitsDelta = styled.span`
  color: ${({ $up }) => ($up ? colors.silas : colors.red)};
  font-size: ${typography.sizes.small};
  font-weight: ${typography.weights.normal};
`

const VisitsValue = styled.div`
  align-items: baseline;
  color: var(--core-color-text-primary);
  display: flex;
  font-size: ${typography.sizes.medium};
  font-weight: ${typography.weights.bold};
  gap: 8px;
`

const VisitsLabel = styled.span`
  color: var(--core-color-text-muted);
  font-size: 12px;
  font-weight: ${typography.weights.normal};
`

const VisitsFootRow = styled.div`
  align-items: baseline;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-top: 8px;
`

// External profile link (Google/LinkedIn) — mirrors the Web Presence tab's
// ProfileLink idiom.
const ProfileLink = styled.a`
  align-items: center;
  color: ${colors.blue};
  display: inline-flex;
  font-size: ${typography.sizes.medium};
  font-weight: ${typography.weights.bold};
  gap: 4px;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const GoogleMark = ({ title, size = 18 }) => (
  <svg viewBox='0 0 24 24' width={size} height={size} role='img' aria-label={title} style={{ display: 'block', alignSelf: 'center' }}>
    <path fill='#4285F4' d='M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z' />
    <path fill='#34A853' d='M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z' />
    <path fill='#FBBC05' d='M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z' />
    <path fill='#EA4335' d='M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z' />
  </svg>
)

const LinkedInMark = ({ title = 'LinkedIn', size = 14 }) => (
  <svg viewBox='0 0 24 24' width={size} height={size} role='img' aria-label={title} style={{ display: 'block', alignSelf: 'center' }}>
    <path fill='#0A66C2' d='M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z' />
  </svg>
)

const SquarespaceMark = ({ title }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--core-color-text-primary)" role="img" aria-label={title} style={{ display: 'block' }}>
    <path d="M22.655 8.719c-1.802-1.801-4.726-1.801-6.564 0l-7.351 7.35c-.45.45-.45 1.2 0 1.65.45.449 1.2.449 1.65 0l7.351-7.351c.899-.899 2.362-.899 3.264 0 .9.9.9 2.364 0 3.264l-7.239 7.239c.9.899 2.362.899 3.263 0l5.589-5.589c1.836-1.838 1.836-4.763.037-6.563zm-2.475 2.437c-.451-.45-1.201-.45-1.65 0l-7.354 7.389c-.9.899-2.361.899-3.262 0-.45-.45-1.2-.45-1.65 0s-.45 1.2 0 1.649c1.801 1.801 4.726 1.801 6.564 0l7.351-7.35c.449-.487.449-1.239.001-1.688zm-2.439-7.35c-1.801-1.801-4.726-1.801-6.564 0l-7.351 7.351c-.45.449-.45 1.199 0 1.649s1.2.45 1.65 0l7.395-7.351c.9-.899 2.371-.899 3.27 0 .451.45 1.201.45 1.65 0 .421-.487.421-1.199-.029-1.649h-.021zm-2.475 2.437c-.45-.45-1.2-.45-1.65 0l-7.351 7.389c-.899.9-2.363.9-3.265 0-.9-.899-.9-2.363 0-3.264l7.239-7.239c-.9-.9-2.362-.9-3.263 0L1.35 8.719c-1.8 1.8-1.8 4.725 0 6.563 1.801 1.801 4.725 1.801 6.564 0l7.35-7.351c.451-.488.451-1.238 0-1.688h.002z" />
  </svg>
)

const VisitsSparkline = ({ series }) => {
  // Match the viewBox to the rendered width so preserveAspectRatio never
  // letterboxes the chart with side gutters — it must run edge to edge.
  const wrapRef = React.useRef(null)
  const [W, setW] = React.useState(280)
  const [H, setH] = React.useState(56)
  React.useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => { setW(el.clientWidth || 280); setH(el.clientHeight || 56) }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const [hover, setHover] = React.useState(null)
  const PX = 6
  const PY = 12
  const vals = series.map(([, v]) => v)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const x = (i) => PX + (i * (W - 2 * PX)) / (series.length - 1)
  const y = (v) => H - PY - ((v - min) * (H - 2 * PY)) / (max - min || 1)
  // Catmull-Rom smoothing: monthly points render as one continuous curve
  // instead of hard segment corners.
  const pts = series.map(([, v], i) => [x(i), y(v)])
  let line = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    line += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`
  }
  const area = `${line} L${x(series.length - 1)},${H - 2} L${x(0)},${H - 2} Z`
  const last = series.length - 1
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: 8, minHeight: 72 }}>
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, minHeight: 56 }}>
      {hover != null && (
        <div style={{
          position: 'absolute', left: x(hover), top: y(series[hover][1]) - 8, zIndex: 1,
          transform: `translate(${hover === 0 ? '0' : hover === last ? '-100%' : '-50%'}, -100%)`,
          background: 'var(--core-color-surface-inverse, #1f2a2e)', color: 'var(--core-color-text-inverse, #fff)',
          borderRadius: 6, padding: '4px 8px', fontSize: 11, whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          {series[hover][0]} · {series[hover][1].toLocaleString()} visits
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        onMouseLeave={() => setHover(null)} role='img' aria-label='Monthly visits over time'>
        <path d={area} fill={CHART_HUE} opacity='0.08' />
        <path d={line} fill='none' stroke={CHART_HUE} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
        {series.map(([, v], i) => (
          <circle key={'dot' + i} cx={x(i)} cy={y(v)} r={hover === i ? 4.5 : 3} fill={CHART_HUE} stroke='#fff' strokeWidth='2' />
        ))}
        {series.map((_, i) => (
          <rect key={'hit' + i} x={x(i) - (W / series.length) / 2} y='0' width={W / series.length} height={H}
            fill='transparent' onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
    </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--core-color-text-muted)', marginTop: 2 }}>
        <span>{series[0][0]}</span>
        <span>{series[last][0]}</span>
      </div>
    </div>
  )
}

const SHOW_CONNECTION_RISK = true

const footerLink = (label, onNavigate) => (
  <ActionButton variant='secondary' onClick={() => onNavigate && onNavigate()}>
    {label}
    <Icon name='arrowRight' size={13} />
  </ActionButton>
)

// data: { summary, verificationChecks: [{label, status}], identityBlurb,
//         web: { status: {label, tag}, blurb, rows: [[label, value]] },
//         risk: { level, score, title, signals: [[label, value]] },
//         onViewVerification, onViewWeb, onViewRisk }
export const ReportPage = ({ data }) => {
  const { web, risk, compliance, reputation, fraud } = data
  const verificationStatus = bvVerificationStatus(data.verificationChecks)
  const barColors = miniBarColors(risk.level)

  // Card registry: summary sections reference these by key to place each
  // card under the insight bullet it supports.
  const cardsByKey = {
    industry: compliance ? (
      <MiniCard>
        <MiniHead>
          <CardTitle>Industry risk</CardTitle>
          <Chip type={compliance.status.tag}>{compliance.status.label}</Chip>
        </MiniHead>
        <MiniTitle>{compliance.title}</MiniTitle>
        <MiniBlurb>{compliance.blurb}</MiniBlurb>
        <Rows>
          {compliance.codes.map((c) => (
            <ConnCard key={c.label}>
              <div style={{ fontSize: typography.sizes.medium, fontWeight: typography.weights.bold, color: 'var(--core-color-text-primary)' }}>{c.label}</div>
              <div style={{ fontSize: typography.sizes.medium, color: 'var(--core-color-text-primary)', marginTop: 6 }}>{c.category}</div>
            </ConnCard>
          ))}
        </Rows>
        <CardFooter>{footerLink('Learn more', data.onViewCompliance)}</CardFooter>
      </MiniCard>
    ) : null,
    fraud: fraud ? (
          <MiniCard>
            <MiniHead>
              <CardTitle>Transaction laundering & fraud</CardTitle>
              <Chip type={fraud.status.tag}>{fraud.status.label}</Chip>
            </MiniHead>
            <MiniTitle>{fraud.title}</MiniTitle>
            <MiniBlurb>{fraud.blurb}</MiniBlurb>
            {fraud.score != null ? (
              <MiniTitle style={{ paddingTop: 14, fontSize: 24, lineHeight: 1, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <span>
                  {fraud.score}
                  <span style={{ fontWeight: typography.weights.normal, color: colors.karl, fontSize: typography.sizes.medium }}> / 100</span>
                </span>
                <span style={{ fontSize: typography.sizes.medium }}>{RATING_LABEL[fraud.level]} risk</span>
              </MiniTitle>
            ) : null}
            <Bars>
              {miniBarColors(fraud.level).map((color, i) => (
                <Bar key={i} $color={color} />
              ))}
            </Bars>
            <Rows>
              <ConnCard>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: typography.sizes.medium, fontWeight: typography.weights.bold, color: 'var(--core-color-text-primary)' }}>{fraud.phone.label}</span>
                  <Chip type='warning'>{fraud.phone.finding}</Chip>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, fontSize: typography.sizes.medium, marginTop: 6 }}>
                  <span style={{ color: 'var(--core-color-text-muted)' }}>
                    Type: <span style={{ color: 'var(--core-color-text-primary)' }}>{fraud.phone.type}</span>
                  </span>
                  <span style={{ color: 'var(--core-color-text-muted)' }}>
                    Risk score: <span style={{ color: 'var(--core-color-text-primary)' }}>{fraud.phone.score} / 100</span>
                  </span>
                </div>
              </ConnCard>
              {fraud.otherChecks?.length ? (
                <div style={{ color: 'var(--core-color-text-muted)', fontSize: typography.sizes.medium, marginTop: 12 }}>
                  {fraud.otherChecks.length} more insights available
                </div>
              ) : null}
            </Rows>
            <CardFooter>{footerLink('Learn more', data.onViewFraud)}</CardFooter>
          </MiniCard>
    ) : null,
    connections: SHOW_CONNECTION_RISK ? (
        <MiniCard>
          <MiniHead>
            <CardTitle>Connection risk</CardTitle>
            <Chip type={RATING_TAG[risk.level]}>{RATING_LABEL[risk.level]}</Chip>
          </MiniHead>
          <MiniTitle>Connections found</MiniTitle>
          <MiniBlurb>{risk.title}</MiniBlurb>
          {risk.score != null ? (
            <MiniTitle style={{ paddingTop: 14, fontSize: 24, lineHeight: 1, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
              <span>
                {risk.score}
                <span style={{ fontWeight: typography.weights.normal, color: colors.karl, fontSize: typography.sizes.medium }}> / 100</span>
              </span>
              <span style={{ fontSize: typography.sizes.medium }}>{RATING_LABEL[risk.level]} risk</span>
            </MiniTitle>
          ) : null}
          <Bars>
            {barColors.map((color, i) => (
              <Bar key={i} $color={color} />
            ))}
          </Bars>
          <Rows>
            {(() => {
              // Shared officer/address connections only, close ranked above
              // possible; show the top two and state how many more were found.
              const ranked = (data.connections || [])
                .filter((c) => c.relationship === 'Shared officer' || c.relationship === 'Shared address')
                .sort((a, b) => (a.strength === 'close' ? 0 : 1) - (b.strength === 'close' ? 0 : 1))
              const shown = ranked.slice(0, 2)
              const more = ranked.length - shown.length
              return (
                <>
                  {shown.map((c) => (
                    <ConnCard key={c.name}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: typography.sizes.medium, fontWeight: typography.weights.bold, color: 'var(--core-color-text-primary)' }}>{c.name}</span>
                        <Chip type={c.strength === 'close' ? 'warning' : 'unknown'}>
                          {c.strength === 'close' ? 'Close' : 'Possible'}
                        </Chip>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, fontSize: typography.sizes.medium, marginTop: 6 }}>
                        <span style={{ color: 'var(--core-color-text-muted)' }}>
                          Status: <span style={{ color: 'var(--core-color-text-primary)' }}>{c.status}</span>
                        </span>
                        <span style={{ color: 'var(--core-color-text-muted)' }}>
                          <TextTooltip placement='top' content={c.detail} trigger={c.relationship} />
                        </span>
                      </div>
                    </ConnCard>
                  ))}
                  {more > 0 && (
                    <div style={{ color: 'var(--core-color-text-muted)', fontSize: typography.sizes.medium, marginTop: 12 }}>
                      {more} more possible connection{more === 1 ? '' : 's'} found
                    </div>
                  )}
                </>
              )
            })()}
          </Rows>
          <CardFooter>{footerLink('Learn more', data.onViewRisk)}</CardFooter>
        </MiniCard>
    ) : null,
    verification: (
        <MiniCard>
          <MiniHead>
            <CardTitle>Entity verification</CardTitle>
            {verificationStatus === 'verified' ? (
              <Chip type='green'>Verified</Chip>
            ) : verificationStatus === 'partial' ? (
              <Chip type='inactive'>Partially verified</Chip>
            ) : verificationStatus === 'unverified' ? (
              <Chip type='inactive'>Unverified</Chip>
            ) : (
              <Chip type='unknown'>Not ordered</Chip>
            )}
          </MiniHead>
          <MiniTitle>{data.identityTitle}</MiniTitle>
          <MiniBlurb>{data.identityBlurb}</MiniBlurb>
          <Rows>
            {data.verificationChecks.map(({ label, status, value }) => {
              // Unknown checks (e.g. no TIN submitted) render muted so they
              // read as absent rather than a finding.
              const muted = status === 'unknown'
              return (
                <ConnCard key={label} style={muted ? { background: colors.frostLight, borderColor: colors.dawn } : undefined}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: typography.sizes.medium, fontWeight: muted ? typography.weights.normal : typography.weights.bold, color: muted ? colors.karl : 'var(--core-color-text-primary)' }}>{label}</span>
                    <StatusDot intent={status} size={16} />
                  </div>
                  <div style={{ fontSize: typography.sizes.medium, color: muted ? colors.karl : 'var(--core-color-text-primary)', marginTop: 6 }}>{value}</div>
                </ConnCard>
              )
            })}
          </Rows>
          <CardFooter>{footerLink('Learn more', data.onViewVerification)}</CardFooter>
        </MiniCard>
    ),
    web: (
        <MiniCard>
          <MiniHead>
            <CardTitle>Web presence</CardTitle>
            <Chip type={web.status.tag}>{web.status.label}</Chip>
          </MiniHead>
          <MiniTitle>{web.title}</MiniTitle>
          <MiniBlurb>{web.blurb}</MiniBlurb>
          {web.visits ? (
            <VisitsBlock style={{ flex: 1 }}>
              <VisitsFootRow style={{ marginTop: 0, flexWrap: 'wrap', rowGap: 8 }}>
                <VisitsValue>
                  <span style={{ fontSize: 24, lineHeight: 1 }}>{compactCount(web.visits.current)}</span>
                  <VisitsLabel style={{ fontSize: typography.sizes.medium, color: colors.karl }}>monthly visits</VisitsLabel>
                  {web.visits.delta ? (
                    <VisitsDelta $up={web.visits.delta.up}>
                      {web.visits.delta.up ? '▲' : '▼'} {web.visits.delta.pct}%
                    </VisitsDelta>
                  ) : null}
                </VisitsValue>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: typography.sizes.medium, fontWeight: typography.weights.bold, color: 'var(--core-color-text-primary)' }}>
                  <SquarespaceMark title={web.platform} />
                  <TextTooltip placement='top' content={web.platformDetail} trigger={web.platform} />
                </span>
              </VisitsFootRow>
              <VisitsSparkline series={web.visits.series} />
              <VisitsFootRow style={{ alignItems: 'center' }}>
                <span style={{ fontSize: typography.sizes.medium, color: 'var(--core-color-text-primary)' }}>
                  <TextTooltip
                    placement='top'
                    content={web.domainRegistered}
                    trigger={<span style={{ fontWeight: typography.weights.bold }}>{web.domainAge}</span>}
                  />
                  {' '}domain
                </span>
              </VisitsFootRow>
            </VisitsBlock>
          ) : null}
          <CardFooter>{footerLink('Learn more', data.onViewWeb)}</CardFooter>
        </MiniCard>
    ),
    reputation: reputation ? (
          <MiniCard>
            <MiniHead>
              <CardTitle>Online reputation</CardTitle>
              <Chip type={reputation.status.tag}>{reputation.status.label}</Chip>
            </MiniHead>
            <MiniTitle>{reputation.title}</MiniTitle>
            <MiniBlurb>{reputation.blurb}</MiniBlurb>
            <Rows>
              {reputation.profiles.map((p) => (
                <ConnCard key={p.name}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    {p.url ? (
                      <ProfileLink href={p.url} target='_blank' rel='noreferrer'>
                        {p.name === 'Google' ? <GoogleMark title='Google' size={14} /> : null}
                        {p.name === 'LinkedIn' ? <LinkedInMark /> : null}
                        {p.name}
                        <Icon name='externalLink' size={12} />
                      </ProfileLink>
                    ) : (
                      <span style={{ fontSize: typography.sizes.medium, fontWeight: typography.weights.bold, color: 'var(--core-color-text-primary)' }}>{p.name}</span>
                    )}
                    <StatusDot intent={p.status === 'online' ? 'success' : 'warning'} size={16} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, fontSize: typography.sizes.medium, marginTop: 6 }}>
                    <span style={{ color: 'var(--core-color-text-primary)' }}>{p.detail}</span>
                    <span style={{ color: 'var(--core-color-text-muted)' }}>{p.activity}</span>
                  </div>
                </ConnCard>
              ))}
            </Rows>
            <CardFooter>{footerLink('Learn more', data.onViewReputation)}</CardFooter>
          </MiniCard>
    ) : null,
  }

  const sections = data.sections || []

  // Status tone per section, rendered as the insight bullet's icon:
  // success = check, warning = exclamation, failure = red X.
  const sectionTones = {
    reputation: 'success',
    industry: compliance ? (compliance.status.tag === 'warning' ? 'failure' : compliance.status.tag === 'green' ? 'success' : 'warning') : undefined,
    fraud: fraud ? (fraud.status.tag === 'warning' ? 'failure' : fraud.status.tag === 'green' ? 'success' : 'warning') : undefined,
    web: web.status.tag === 'warning' ? 'failure' : web.status.tag === 'green' ? 'success' : 'warning',
    verification: verificationStatus === 'verified' ? 'success' : verificationStatus ? 'warning' : 'unknown',
    connections: risk.level === 'high' ? 'failure' : risk.level === 'low' ? 'success' : 'warning',
  }

  // Clicking a summary chip anchors to the card that backs the insight, with
  // a brief ring so the eye lands on the right card.
  const scrollToCard = (key) => {
    const el = document.getElementById(`report-card-${key}`)
    if (!el) return
    // Scroll only the nearest scrollable ancestor. scrollIntoView also
    // scrolls overflow:hidden ancestors (the app shell), shifting the whole
    // page up with no scrollbar to bring it back.
    let sc = el.parentElement
    while (sc && !(sc.scrollHeight > sc.clientHeight && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement
    if (sc) {
      const r = el.getBoundingClientRect()
      const sr = sc.getBoundingClientRect()
      sc.scrollTo({ top: sc.scrollTop + (r.top - sr.top) - 16, behavior: 'smooth' })
    }
    el.animate(
      [{ boxShadow: `0 0 0 3px ${colors.blue}66` }, { boxShadow: `0 0 0 3px ${colors.blue}00` }],
      { duration: 1600, easing: 'ease-out' },
    )
  }

  return (
    <Page>
      <Card>
        <SummaryHead>
          <CardTitle>Report</CardTitle>
          <AiNote>
            <Sparkle size={12} strokeWidth={1.5} />
            AI-generated
          </AiNote>
        </SummaryHead>
        <div style={{ padding: '14px 22px 0' }}>
          <SectionHeadTitle>Summary</SectionHeadTitle>
        </div>
        <SummaryText style={{ paddingTop: 6, whiteSpace: 'pre-line', paddingBottom: sections.some((s) => s.insight) ? 18 : undefined }}>
          {data.summary || 'No summary available.'}
        </SummaryText>
        {sections.some((s) => s.insight) ? (
          <SummarySections>
            {sections.filter((s) => s.insight).map((section, i) => (
              <InsightBullet key={section.headerKey || i}>
                {section.noMarker ? null : <InsightMarker flag={section.flag || sectionTones[section.headerKey]} />}
                <span>
                  {section.insight}
                  {(section.cards || []).filter((k) => cardsByKey[k]).map((k) => (
                    <AnchorChip key={k} type='button' onClick={() => scrollToCard(k)}>
                      {CARD_LABELS[k] || k}
                    </AnchorChip>
                  ))}
                </span>
              </InsightBullet>
            ))}
          </SummarySections>
        ) : null}
      </Card>

      {/* Cards: outside the summary in a two-column grid, in section order.
          Each card carries its own header (title + status chip) and footer. */}
      <CardGrid>
        {(sections.length ? sections.flatMap((s) => s.cards || []) : Object.keys(cardsByKey))
          .filter((k) => cardsByKey[k])
          .map((k) => (
            <CardAnchor key={k} id={`report-card-${k}`}>{cardsByKey[k]}</CardAnchor>
          ))}
      </CardGrid>
    </Page>
  )
}

export default ReportPage
