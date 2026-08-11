// Web presence tab — ported from the app repo:
//   containers/BusinessHome/WebPresence.tsx           (card stack + sidebar)
//   containers/BusinessHome/WebPresenceSidebarNav.tsx (sticky section nav)
//   containers/BusinessHome/DiveCards/*               (Website, Visits,
//     TrafficSources, TopCountries, TopKeywords, Technology, Storefront,
//     RiskyKeywords, ThirdPartyProfiles)
//   containers/BusinessHome/HighCards/IndustryClassificationCard.tsx
// Same shells and CSS; redux plumbing replaced by a static dataset computed in
// fromMiddesk.js. The app's visx donut and world map are redrawn as plain SVG
// (donut) and the bar list the app itself falls back to on small screens.
import React from 'react'
import styled from 'styled-components'

import { Icon } from '@/core/Icon'
import { colors, typography } from '@/core/theme'

import { StatusDotLabel } from './StatusDot'

const FROST = colors.frost
const KARL = colors.karl
const SPACING = '1.5rem'

// Shared categorical palette for the traffic charts (sources donut + bars,
// top-countries bars) — the app's cyan/emerald/teal analogous ramp.
const TRAFFIC_PALETTE = [
  '#164e63', '#115e59', '#0e7490', '#047857', '#0d9488',
  '#06b6d4', '#10b981', '#2dd4bf', '#064e3b', '#a7f3d0',
]
const TRAFFIC_PRIMARY = TRAFFIC_PALETTE[0]

const formatVisits = (n) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return `${Math.round(n)}`
}

/* ---------- Dive: sidebar nav + card column ---------- */

const Dive = styled.div`
  column-gap: 24px;
  display: grid;
  grid-template-columns: minmax(290px, 340px) minmax(0, 1fr);

  @media (max-width: 767px) {
    grid-template-columns: 1fr;
    row-gap: 24px;
  }
`

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: fit-content;
`

const Nav = styled.div`
  background-color: #fff;
  border: 1px solid ${FROST};
  border-radius: 10px;
  color: var(--core-color-text-primary);
  font-size: ${typography.sizes.large};
  height: fit-content;
  overflow: hidden;
  position: sticky;
  top: 16px;
`

const NavRow = styled.button`
  align-items: center;
  background: none;
  border: none;
  color: var(--core-color-text-primary);
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: inherit;
  justify-content: space-between;
  padding: 18px 20px;
  position: relative;
  text-align: left;
  width: 100%;

  &:not(:first-child)::after {
    border-top: 1px solid ${FROST};
    content: '';
    left: 10px;
    position: absolute;
    right: 10px;
    top: 0;
  }

  &:hover {
    background-color: ${colors.dawn};
  }

  &:hover::after,
  &:hover + &::after {
    border-color: transparent;
  }
`

const NAV_ITEMS = [
  { label: 'Website', targetId: 'web-presence-website' },
  { label: 'Visits', targetId: 'web-presence-traffic' },
  { label: 'Traffic sources', targetId: 'web-presence-traffic-sources' },
  { label: 'Top countries', targetId: 'web-presence-top-countries' },
  { label: 'Top keywords', targetId: 'web-presence-top-keywords' },
  { label: 'Technology & infrastructure', targetId: 'web-presence-technology' },
  { label: 'Storefront', targetId: 'web-presence-storefront' },
  { label: 'Risky keywords', targetId: 'web-presence-risky-keywords' },
  { label: 'Third-party profiles', targetId: 'web-presence-profiles' },
  { label: 'Industry classification', targetId: 'industry-classification' },
]

const scrollToSection = (targetId) => {
  document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/* ---------- OrderCard shell (same shells as verification.jsx) ---------- */

const StyledCard = styled.section`
  background-color: #fff;
  border: 1px solid ${FROST};
  border-radius: 10px;
  color: var(--core-color-text-primary);
  display: flex;
  flex-direction: column;
  font-size: ${typography.sizes.medium};
  height: fit-content;
  overflow: hidden;
`

const CardSection = styled.div`
  align-items: center;
  column-gap: 8px;
  display: flex;
  flex-direction: row;
  margin: ${SPACING} ${SPACING} 0;
  padding-bottom: ${SPACING};
`

const CardH3 = styled.h3`
  font-size: 20px;
  font-weight: ${typography.weights.bold};
  letter-spacing: -0.02em;
  margin: 0;
`

const RightAligned = styled.div`
  align-items: center;
  column-gap: 8px;
  display: flex;
  font-size: 0.75rem;
  margin-left: auto;
`

const LastUpdated = styled.div`
  color: ${KARL};
`

const StyledTable = styled.table`
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;

  col:first-of-type,
  col:last-of-type {
    width: ${SPACING};
  }

  th {
    border-top: 1px solid ${FROST};
    color: ${KARL};
    font-size: 0.75rem;
    font-weight: normal;
    padding: 20px 8px 4px;
    text-align: left;
  }

  tbody td {
    border-top: 1px solid ${FROST};
    font-size: ${typography.sizes.medium};
    padding: 16px 8px;
    vertical-align: top;
  }

  tbody tr:first-child td {
    border-top: none;
  }

  tbody td,
  thead th {
    &:first-child,
    &:last-child {
      border-top: 1px solid ${FROST};
      padding: 0;
    }
    &:nth-of-type(2) {
      padding-left: 0;
    }
    &:nth-last-of-type(2) {
      padding-right: 0;
    }
  }

  tbody tr:first-child td:first-child,
  tbody tr:first-child td:last-child {
    border-top: none;
  }
`

const CardBottomPad = styled.div`
  padding-bottom: 20px;
`

const NoHitBanner = styled.div`
  align-items: center;
  border: 1px solid ${FROST};
  border-radius: 4px;
  display: flex;
  gap: 8px;
  margin: 0 ${SPACING} 24px;
  padding: 14px 16px;
`

const OrderCard = ({ title, updatedAt, id, children }) => (
  <StyledCard id={id}>
    <CardSection>
      <CardH3>{title}</CardH3>
      {updatedAt && (
        <RightAligned>
          <LastUpdated>Updated {updatedAt}</LastUpdated>
        </RightAligned>
      )}
    </CardSection>
    {children}
  </StyledCard>
)

const DataTable = ({ headers, rows }) => (
  <StyledTable>
    <colgroup>
      {Array(headers.length + 2).fill(0).map((_, i) => <col key={i} />)}
    </colgroup>
    <thead>
      <tr>
        <th />
        {headers.map(([label, width, align]) => (
          <th key={typeof label === 'string' ? label : width} style={{ ...(width ? { width } : null), ...(align ? { textAlign: align } : null) }}>{label}</th>
        ))}
        <th />
      </tr>
    </thead>
    <tbody>
      {rows.map((row, ri) => (
        <tr key={ri}>
          <td />
          {row.map((cell, ci) => <td key={ci} style={headers[ci]?.[2] ? { textAlign: headers[ci][2], color: KARL } : undefined}>{cell}</td>)}
          <td />
        </tr>
      ))}
    </tbody>
  </StyledTable>
)

/* ---------- Website card ---------- */

const StatsGrid3 = styled.div`
  border-top: 1px solid ${FROST};
  display: grid;
  grid-template-columns: repeat(3, 1fr);
`

const StatCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 20px ${SPACING};
`

const StatCellLabel = styled.div`
  color: ${KARL};
  font-size: ${typography.sizes.small};
`

const StatCellValue = styled.div`
  font-weight: ${typography.weights.bold};
`

const DescriptionSection = styled.div`
  border-top: 1px solid ${FROST};
  line-height: 1.5;
  padding: 20px ${SPACING};
`

const MetadataRow = styled.div`
  border-top: 1px solid ${FROST};
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 20px ${SPACING};
`

const MetadataItem = styled.div`
  align-items: center;
  display: flex;
  gap: 6px;
`

const MetadataLink = styled.a`
  color: ${colors.blue};
  font-size: 14px;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const MetadataText = styled.div`
  color: ${KARL};
  font-size: 14px;
`

const WebsiteCard = ({ website }) => (
  <StyledCard>
    <CardSection>
      <CardH3>Website</CardH3>
    </CardSection>
    <StatsGrid3>
      <StatCell>
        <StatCellLabel>Status</StatCellLabel>
        <StatCellValue>
          <StatusDotLabel intent={website.statusIntent} label={website.statusLabel} size={16} />
        </StatCellValue>
      </StatCell>
      <StatCell>
        <StatCellLabel>Domain age</StatCellLabel>
        <StatCellValue>{website.domainAge}</StatCellValue>
      </StatCell>
      <StatCell>
        <StatCellLabel>Platform</StatCellLabel>
        <StatCellValue>{website.platform}</StatCellValue>
      </StatCell>
    </StatsGrid3>
    {website.description && <DescriptionSection>{website.description}</DescriptionSection>}
    <MetadataRow>
      <MetadataItem>
        <Icon name='globe' color={colors.karlLight1} size={15} />
        <MetadataLink href={website.url} target='_blank' rel='noreferrer'>{website.url}</MetadataLink>
      </MetadataItem>
      <MetadataItem>
        <Icon name='envelopeClosed' color={colors.karlLight1} size={15} />
        <MetadataText>{website.industry}</MetadataText>
      </MetadataItem>
    </MetadataRow>
  </StyledCard>
)

/* ---------- Visits card ---------- */

const CardBody = styled.div`
  border-top: 1px solid ${FROST};
  padding-top: 20px;
`

const TilesGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  margin: 0 ${SPACING} 16px;
`

const TileBox = styled.div`
  border: 1px solid ${FROST};
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 20px;
`

const TileLabel = styled.div`
  color: ${KARL};
  font-size: ${typography.sizes.small};
`

const TileValue = styled.div`
  align-items: baseline;
  display: flex;
  font-size: ${typography.sizes.display?.small || '1.375rem'};
  font-weight: ${typography.weights.bold};
  gap: 4px;
`

const TileDelta = styled.span`
  color: ${({ $up }) => ($up ? colors.silas : colors.red)};
  font-size: ${typography.sizes.small};
  font-weight: ${typography.weights.normal};
`

const StatTile = ({ label, value, delta }) => (
  <TileBox>
    <TileLabel>{label}</TileLabel>
    <TileValue>
      {value}
      {delta && (
        <TileDelta $up={delta.up}>
          {delta.up ? '▲' : '▼'} {Math.abs(delta.pct)}%
        </TileDelta>
      )}
    </TileValue>
  </TileBox>
)

const ChartWrap = styled.div`
  margin: 0 ${SPACING} 20px;
`

const ChartLabel = styled.div`
  color: ${KARL};
  font-size: ${typography.sizes.xsmall};
  letter-spacing: 0.5px;
  margin-bottom: 16px;
  text-transform: uppercase;
`

const ChartFrame = styled.div`
  border: 1px solid ${FROST};
  border-radius: 8px;
  padding: 20px;
`

const AxisLabels = styled.div`
  color: ${KARL};
  display: flex;
  font-size: ${typography.sizes.small};
  justify-content: space-between;
  margin-top: 16px;
`

// Area sparkline for the monthly-traffic chart. Width tracks the container
// (same ResizeObserver approach as the Report card's sparkline) so the plot
// runs edge to edge without letterboxing.
const TrafficAreaChart = ({ points }) => {
  const wrapRef = React.useRef(null)
  const [W, setW] = React.useState(560)
  React.useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => setW(el.clientWidth || 560)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const H = 220
  const PX = 6
  const PY = 14
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const x = (i) => PX + (i / (values.length - 1)) * (W - PX * 2)
  const y = (v) => H - PY - ((v - min) / span) * (H - PY * 2)
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(v)}`).join(' ')
  const area = `${line} L${x(values.length - 1)} ${H - 2} L${x(0)} ${H - 2} Z`

  return (
    <div ref={wrapRef}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        <path d={area} fill={TRAFFIC_PRIMARY} opacity={0.08} />
        <path d={line} fill='none' stroke={TRAFFIC_PRIMARY} strokeWidth={2} strokeLinecap='round' strokeLinejoin='round' />
        {values.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={3.5} fill='#fff' stroke={TRAFFIC_PRIMARY} strokeWidth={2} />
        ))}
      </svg>
      <AxisLabels>
        {points.map((p) => <span key={p.label}>{p.label}</span>)}
      </AxisLabels>
    </div>
  )
}

const VisitsCard = ({ visits, updatedAt }) => (
  <StyledCard>
    <CardSection style={{ paddingBottom: 0, marginBottom: SPACING }}>
      <CardH3>Visits</CardH3>
      <RightAligned>
        <LastUpdated>Updated {updatedAt}</LastUpdated>
      </RightAligned>
    </CardSection>
    <CardBody>
      <TilesGrid>
        {visits.tiles.map((tile) => <StatTile key={tile.label} {...tile} />)}
      </TilesGrid>
      <ChartWrap>
        <ChartLabel>Monthly traffic</ChartLabel>
        <ChartFrame>
          <TrafficAreaChart points={visits.history} />
        </ChartFrame>
      </ChartWrap>
    </CardBody>
  </StyledCard>
)

/* ---------- Traffic bar (shared by sources + countries) ---------- */

const BarTrack = styled.div`
  background: ${FROST};
  border-radius: 999px;
  height: 4px;
  overflow: hidden;
`

const BarFill = styled.div`
  background: ${({ $color }) => $color};
  border-radius: 999px;
  height: 100%;
  width: ${({ $width }) => $width}%;
`

const TrafficBar = ({ width, color = TRAFFIC_PRIMARY }) => (
  <BarTrack>
    <BarFill $width={width} $color={color} />
  </BarTrack>
)

/* ---------- Traffic sources card ---------- */

const SourcesGrid = styled.div`
  align-items: center;
  border-top: 1px solid ${FROST};
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr auto;
  padding: 20px ${SPACING};

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const SourceRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const SourceRow = styled.div`
  align-items: center;
  display: grid;
  gap: 16px;
  grid-template-columns: 110px 1fr 92px;
`

const SourceLabel = styled.div`
  align-items: center;
  color: var(--core-color-text-primary);
  display: flex;
  font-size: ${typography.sizes.small};
  gap: 4px;
  padding-left: ${({ $depth }) => $depth * 40}px;
`

const Toggle = styled.button`
  align-items: center;
  background: none;
  border: none;
  color: ${KARL};
  cursor: pointer;
  display: flex;
  height: 16px;
  justify-content: center;
  padding: 0;
  width: 16px;
`

const ToggleSpacer = styled.span`
  display: inline-block;
  width: 16px;
`

const SourceValue = styled.div`
  color: ${KARL};
  font-size: ${typography.sizes.small};
  text-align: right;
`

const DonutWrap = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
`

const DonutCenter = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  inset: 0;
  justify-content: center;
  position: absolute;
`

const DonutTotal = styled.div`
  font-size: ${typography.sizes.display?.small || '1.375rem'};
  font-weight: ${typography.weights.bold};
  line-height: 1.1;
`

const DonutLabel = styled.div`
  color: ${KARL};
  font-size: ${typography.sizes.small};
`

// Donut ring as plain SVG arcs (the app draws this with visx Pie). Angles run
// clockwise from 12 o'clock in the caller's descending-share order.
const arcPath = (cx, cy, rOuter, rInner, a0, a1) => {
  const p = (r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)]
  const large = a1 - a0 > Math.PI ? 1 : 0
  const [x0, y0] = p(rOuter, a0)
  const [x1, y1] = p(rOuter, a1)
  const [x2, y2] = p(rInner, a1)
  const [x3, y3] = p(rInner, a0)
  return `M${x0} ${y0} A${rOuter} ${rOuter} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${rInner} ${rInner} 0 ${large} 0 ${x3} ${y3} Z`
}

const Donut = ({ segments, total }) => {
  const size = 140
  const stroke = 17
  const r = size / 2
  const sum = segments.reduce((acc, s) => acc + s.value, 0) || 1
  let angle = 0

  return (
    <DonutWrap>
      <svg width={size} height={size}>
        {segments.map((seg) => {
          const a0 = angle
          const a1 = angle + (seg.value / sum) * Math.PI * 2
          angle = a1
          return <path key={seg.key} d={arcPath(r, r, r, r - stroke, a0, a1)} fill={seg.color} />
        })}
      </svg>
      <DonutCenter>
        <DonutTotal>{formatVisits(total)}</DonutTotal>
        <DonutLabel>Total</DonutLabel>
      </DonutCenter>
    </DonutWrap>
  )
}

const TrafficSourcesCard = ({ sources, monthlyVisits, updatedAt }) => {
  // Channels start collapsed; expanding one reveals its organic/paid sub-rows.
  const [open, setOpen] = React.useState({})

  const channels = [...sources].sort((a, b) => b.share - a.share)
  const colorByKey = new Map(channels.map((c, i) => [c.key, TRAFFIC_PALETTE[i % TRAFFIC_PALETTE.length]]))
  const maxShare = Math.max(...channels.map((c) => c.share))

  const rows = channels.flatMap((c) => [
    { ...c, depth: 0, hasChildren: (c.children?.length ?? 0) > 0 },
    ...(open[c.key]
      ? [...(c.children || [])].sort((a, b) => b.share - a.share).map((child) => ({ ...child, depth: 1, parentKey: c.key }))
      : []),
  ])

  const fmt = (share) => `${formatVisits(share * monthlyVisits)} (${Math.round(share * 100)}%)`

  return (
    <StyledCard>
      <CardSection style={{ paddingBottom: 0, marginBottom: SPACING }}>
        <CardH3>Traffic sources</CardH3>
        <RightAligned>
          <LastUpdated>Updated {updatedAt}</LastUpdated>
        </RightAligned>
      </CardSection>
      <SourcesGrid>
        <SourceRows>
          {rows.map((row) => (
            <SourceRow key={row.key}>
              <SourceLabel $depth={row.depth}>
                {row.hasChildren ? (
                  <Toggle
                    type='button'
                    onClick={() => setOpen((prev) => ({ ...prev, [row.key]: !prev[row.key] }))}
                    aria-expanded={!!open[row.key]}
                    aria-label={`${open[row.key] ? 'Collapse' : 'Expand'} ${row.label}`}
                  >
                    <Icon name={open[row.key] ? 'chevronDown' : 'chevronRight'} size={16} />
                  </Toggle>
                ) : (
                  row.depth === 0 && <ToggleSpacer />
                )}
                {row.label}
              </SourceLabel>
              <TrafficBar
                width={maxShare > 0 ? (row.share / maxShare) * 100 : 0}
                color={colorByKey.get(row.depth === 0 ? row.key : row.parentKey)}
              />
              <SourceValue>{fmt(row.share)}</SourceValue>
            </SourceRow>
          ))}
        </SourceRows>
        <Donut
          segments={channels.map((c) => ({ key: c.key, value: c.share, color: colorByKey.get(c.key) }))}
          total={monthlyVisits}
        />
      </SourcesGrid>
    </StyledCard>
  )
}

/* ---------- Top countries card ---------- */

const CountriesList = styled.div`
  border-top: 1px solid ${FROST};
  display: flex;
  flex-direction: column;
  padding: 20px ${SPACING};
`

const CountryRow = styled.div`
  align-items: center;
  border-radius: 4px;
  display: grid;
  gap: 10px;
  grid-template-columns: 130px 1fr 92px;
  padding: 10px;

  &:hover {
    background: ${colors.frostLight};
  }
`

const CountryLabel = styled.div`
  font-size: ${typography.sizes.small};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CountryValue = styled.div`
  color: ${KARL};
  font-size: ${typography.sizes.small};
  text-align: right;
  white-space: nowrap;
`

const formatSharePct = (share) => {
  const pct = share * 100
  if (pct > 0 && pct < 0.5) return '<1%'
  return `${Math.round(pct)}%`
}

const TopCountriesCard = ({ countries, monthlyVisits, updatedAt }) => {
  const maxShare = Math.max(...countries.map((c) => c.share))
  return (
    <OrderCard title='Top countries' updatedAt={updatedAt}>
      <CountriesList>
        {countries.map(({ code, name, share }) => (
          <CountryRow key={code}>
            <CountryLabel>{name}</CountryLabel>
            <TrafficBar width={maxShare > 0 ? (share / maxShare) * 100 : 0} />
            <CountryValue>{`${formatVisits(share * monthlyVisits)} (${formatSharePct(share)})`}</CountryValue>
          </CountryRow>
        ))}
      </CountriesList>
    </OrderCard>
  )
}

/* ---------- Storefront card ---------- */

const PillsSection = styled.div`
  border-top: 1px solid ${FROST};
  margin: 20px ${SPACING} 0;
  padding: 20px 0;
`

const PillsSectionLabel = styled.div`
  color: ${KARL};
  font-size: ${typography.sizes.small};
  margin-bottom: 10px;
`

const PillsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

const Pill = styled.span`
  border: 1px solid ${FROST};
  border-radius: 16px;
  font-size: ${typography.sizes.small};
  padding: 2px 16px;
`

const StorefrontCard = ({ storefront, updatedAt }) => (
  <StyledCard>
    <CardSection style={{ paddingBottom: 0, marginBottom: SPACING }}>
      <CardH3>Storefront</CardH3>
      <RightAligned>
        <LastUpdated>Updated {updatedAt}</LastUpdated>
      </RightAligned>
    </CardSection>
    <CardBody style={{ paddingBottom: 4 }}>
      <TilesGrid>
        <StatTile label='Platform' value={storefront.platform} />
        <StatTile label='Products' value={storefront.products.toLocaleString()} />
        <StatTile label='Avg price' value={storefront.avgPrice} />
        <StatTile label='Price range' value={storefront.priceRange} />
      </TilesGrid>
      <PillsSection>
        <PillsSectionLabel>Payment processors</PillsSectionLabel>
        <PillsRow>
          {storefront.processors.map((p) => <Pill key={p}>{p}</Pill>)}
        </PillsRow>
      </PillsSection>
    </CardBody>
  </StyledCard>
)

/* ---------- Third-party profiles card ---------- */

const SummarySection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 ${SPACING} ${SPACING};
`

const SummaryTitle = styled.div`
  color: ${KARL};
`

const ProfileLink = styled.a`
  color: ${colors.blue};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const RatingRow = styled.div`
  align-items: center;
  column-gap: 4px;
  display: flex;
  margin-bottom: 8px;
`

const ProfilesCard = ({ profiles, updatedAt }) => (
  <StyledCard>
    <CardSection>
      <CardH3>Third-party profiles</CardH3>
      <RightAligned>
        <LastUpdated>Updated {updatedAt}</LastUpdated>
      </RightAligned>
    </CardSection>
    <SummarySection>
      <div>
        <SummaryTitle>Latest post summary - AI-generated</SummaryTitle>
        <div>{profiles.postsSummary}</div>
      </div>
      <div>
        <SummaryTitle>Reviews summary - AI-generated</SummaryTitle>
        <div>{profiles.reviewsSummary}</div>
      </div>
    </SummarySection>
    <CardBottomPad>
      <DataTable
        headers={[['Profile', '30%'], ['Submitted', '18%'], ['Insights', '22%'], ['Page details']]}
        rows={profiles.rows.map((p) => [
          <div>
            <ProfileLink href={p.url} target='_blank' rel='noreferrer'>{p.name}</ProfileLink>
            <div style={{ color: KARL, fontSize: typography.sizes.small }}>{p.type}</div>
          </div>,
          p.submitted ? 'Yes' : 'No',
          <StatusDotLabel intent={p.statusIntent} label={p.statusLabel} size={14} />,
          <div>
            {p.rating != null && (
              <RatingRow>
                <span style={{ fontWeight: typography.weights.bold }}>{p.rating}</span>
                <Icon name='starFilled' size={16} color={colors.yellow} />
                <span>({p.ratingCount} reviews)</span>
              </RatingRow>
            )}
            {p.details && <div>{p.details}</div>}
            {p.activity && <div>{p.activity}</div>}
          </div>,
        ])}
      />
    </CardBottomPad>
  </StyledCard>
)

/* ---------- the tab ---------- */

export const WebPresencePage = ({ data }) => {
  const { updatedAt } = data
  const rightCell = (v) => <div style={{ textAlign: 'right', color: KARL }}>{v}</div>

  return (
    <Dive>
      <div>
        <Nav>
          {NAV_ITEMS.map((item) => (
            <NavRow key={item.targetId} type='button' onClick={() => scrollToSection(item.targetId)}>
              {item.label}
            </NavRow>
          ))}
        </Nav>
      </div>

      <Column>
        <div id='web-presence-website'>
          <WebsiteCard website={data.website} />
        </div>

        <div id='web-presence-traffic'>
          <VisitsCard visits={data.visits} updatedAt={updatedAt} />
        </div>

        <div id='web-presence-traffic-sources'>
          <TrafficSourcesCard sources={data.sources} monthlyVisits={data.visits.monthlyVisits} updatedAt={updatedAt} />
        </div>

        <div id='web-presence-top-countries'>
          <TopCountriesCard countries={data.countries} monthlyVisits={data.visits.monthlyVisits} updatedAt={updatedAt} />
        </div>

        <div id='web-presence-top-keywords'>
          <OrderCard title='Keywords' updatedAt={updatedAt}>
            <CardBottomPad>
              <DataTable
                headers={[['Keyword'], [rightCell('Traffic'), '20%', 'right'], [rightCell('Cost-per-Click'), '24%', 'right']]}
                rows={data.keywords.map((k) => [k.name, formatVisits(k.volume), k.cpc != null ? `$${k.cpc.toFixed(2)}` : 'N/A'])}
              />
            </CardBottomPad>
          </OrderCard>
        </div>

        <div id='web-presence-technology'>
          <OrderCard title='Technology & infrastructure' updatedAt={updatedAt}>
            <CardBottomPad>
              <DataTable
                headers={[['Category'], [rightCell('Detected'), '55%', 'right']]}
                rows={data.technology.map((t) => [t.label, t.value])}
              />
            </CardBottomPad>
          </OrderCard>
        </div>

        <div id='web-presence-storefront'>
          {data.storefront ? (
            <StorefrontCard storefront={data.storefront} updatedAt={updatedAt} />
          ) : (
            <OrderCard title='Storefront' updatedAt={updatedAt}>
              <NoHitBanner>
                <StatusDotLabel intent='unknown' label='No storefront detected on this site' />
              </NoHitBanner>
            </OrderCard>
          )}
        </div>

        <div id='web-presence-risky-keywords'>
          <OrderCard title='Risky keywords' updatedAt={updatedAt}>
            <NoHitBanner>
              <StatusDotLabel intent='success' label={data.riskyKeywords.message} />
            </NoHitBanner>
          </OrderCard>
        </div>

        <div id='web-presence-profiles'>
          <ProfilesCard profiles={data.profiles} updatedAt={updatedAt} />
        </div>

        <div id='industry-classification'>
          <OrderCard title='Industry classification' updatedAt={updatedAt}>
            <CardBottomPad>
              <DataTable
                headers={[['Classification system', '26%'], ['Code', '16%'], ['Category'], [rightCell('Confidence'), '18%', 'right']]}
                rows={data.industry.map((row) => [row.system, row.code, row.category, row.confidence])}
              />
            </CardBottomPad>
          </OrderCard>
        </div>
      </Column>
    </Dive>
  )
}

export default WebPresencePage
