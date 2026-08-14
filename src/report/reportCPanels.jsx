// Report C tab bodies: Attributes, Sources, and API Response panels for the
// restructured Report C screen. All three render straight from the Middesk
// business record (business.json) so they stay honest to the pulled data.
import React from 'react'
import styled from 'styled-components'

import { MetaChip } from '@/core/Badge'
import { ActionButton } from '@/core/Action'
import { Attribute } from '@/core/Attribute'
import { Icon } from '@/core/Icon'
import { colors } from '@/core/theme'

import { Card, CardHead, CardTitle } from './cards'

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const Rows = styled.div`
  padding: 4px 22px 10px;
`

const Muted = styled.span`
  color: var(--core-color-text-muted);
`

const fmtDate = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

// --- Attributes tab: DS Attribute grid --------------------------------------
// Groups of core Attribute components (bold label over value, muted detail)
// under uppercase micro-labels, laid out as a grid on the report surface
// instead of nested cards.
const AttrGroup = styled.section`
  border-top: 1px solid var(--core-color-border-divider);
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 20px;

  &:first-child {
    border-top: none;
    padding-top: 0;
  }
`

const AttrGroupLabel = styled.div`
  color: var(--core-color-text-muted);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`

const AttrGrid = styled.div`
  display: grid;
  gap: 10px 24px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
`

// Value row with a supporting figure pinned to the right (e.g. industry
// confidence as a bare number beside the category).
const ValueBetween = styled.span`
  align-items: baseline;
  display: flex;
  gap: 12px;
  justify-content: space-between;
`

const OutLink = styled.a`
  align-items: center;
  color: ${colors.blue};
  display: inline-flex;
  gap: 4px;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

// State corporate-registry search portals for the registration link-outs.
const SOS_PORTAL = {
  NY: 'https://apps.dos.ny.gov/publicInquiry/',
  DE: 'https://icis.corp.delaware.gov/ecorp/entitysearch/NameSearch.aspx',
  CA: 'https://bizfileonline.sos.ca.gov/search/business',
}

export function AttributesPanel({ record }) {
  const humanStatus = record.status === 'in_review' ? 'In review' : record.status
  const group = (title, children) => (
    <AttrGroup key={title}>
      <AttrGroupLabel>{title}</AttrGroupLabel>
      <AttrGrid>{children}</AttrGrid>
    </AttrGroup>
  )
  return (
    <Stack style={{ gap: 24 }}>
      {group('Entity details', (
        <>
          <Attribute label='Legal name' value={record.name} />
          <Attribute label='Entity type' value={record.formation.entityType} />
          <Attribute label='Status' value={humanStatus} />
          <Attribute label='Formation date' value={fmtDate(record.formation.date)} />
          <Attribute label='Formation state' value={record.formation.state} />
          <Attribute label='TIN' value={record.tin} detail={record.tin ? null : 'Not provided'} />
        </>
      ))}
      {group('Names', record.names.map((n) => (
        <Attribute
          key={n.name}
          label={n.type === 'registration' ? 'Registration name' : 'Submitted name'}
          value={n.name}
          detail={n.notes}
        />
      )))}
      {group('Addresses', record.addresses.map((a, i) => (
        <Attribute key={a.fullAddress} label={`Address ${i + 1}`} value={a.fullAddress} />
      )))}
      {group('People', record.people.map((p) => (
        <Attribute
          key={p.name}
          label={p.name}
          value={p.titles?.length ? p.titles.join(', ') : 'No title listed'}
        />
      )))}
      {group('Registrations', record.registrations.map((r) => (
        <Attribute
          key={r.fileNumber}
          label={r.state}
          value={r.status.charAt(0).toUpperCase() + r.status.slice(1)}
          detail={
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              {`File ${r.fileNumber} · Filed ${fmtDate(r.fileDate)}`}
              {SOS_PORTAL[r.state] ? (
                <OutLink href={SOS_PORTAL[r.state]} target='_blank' rel='noreferrer'>
                  Secretary of State portal
                  <Icon name='externalLink' size={11} />
                </OutLink>
              ) : null}
            </span>
          }
        />
      )))}
      {group('Website', (
        <>
          <Attribute label='URL' value={record.website.url} />
          <Attribute label='Platform' value={record.website.platform} />
          <Attribute label='Registrar' value={record.website.registrar} />
          <Attribute label='Domain created' value={fmtDate(record.website.domainCreated)} />
        </>
      ))}
      {group('Industry', record.industry.map((i) => (
        <Attribute
          key={`${i.system}-${i.code}`}
          label={`${i.system} ${i.code}`}
          value={
            <ValueBetween>
              {i.category}
              <Muted>{i.confidence}</Muted>
            </ValueBetween>
          }
        />
      )))}
    </Stack>
  )
}

const SourceRow = styled.div`
  align-items: center;
  border-top: 1px solid var(--core-color-border-divider);
  display: flex;
  gap: 16px;
  justify-content: space-between;
  padding: 12px 0;

  &:first-child {
    border-top: none;
  }
`

export function SourcesPanel({ record }) {
  const topCountry = record.traffic.topCountries[0]
  const google = record.profiles.find((p) => p.type === 'Google')
  const linkedin = record.profiles.find((p) => p.type === 'LinkedIn')
  const groups = [
    {
      title: 'Authoritative sources',
      rows: [
        ['Secretary of State', `${record.registrations[0].state} filing ${record.registrations[0].fileNumber}, ${record.registrations[0].status} since ${fmtDate(record.registrations[0].fileDate)}`, ['success', '1 record']],
        ['IRS TIN match', 'No TIN submitted', ['neutral', 'Not run']],
        ['USPS address data', `${record.addresses.length} addresses checked, office address deliverable`, ['success', `${record.addresses.length} records`]],
        ['OFAC and watchlists', 'No hits across sanctions and watchlist screening', ['success', 'Clear']],
      ],
    },
    {
      title: 'Alternative sources',
      rows: [
        ['Middesk network', `${record.connections.length} connected entities via shared addresses`, ['warning', `${record.connections.length} matches`]],
        ['Business licenses', 'No license records requested', ['neutral', 'Not run']],
      ],
    },
    {
      title: 'Web analysis sources',
      rows: [
        ['Website and WHOIS', `${record.website.url.replace(/^https?:\/\//, '')}, registered ${fmtDate(record.website.domainCreated)} via ${record.website.registrar}`, ['success', 'Online']],
        ['Web traffic signals', `${record.traffic.monthlyVisits.toLocaleString()} monthly visits, ${Math.round(topCountry.share * 100)}% from ${topCountry.name}`, ['danger', 'Flagged']],
        ['Social and review presence', `Google ${google?.rating?.toFixed(1)} (${google?.ratingCount} reviews), LinkedIn ${linkedin?.followers} followers`, ['success', '2 profiles']],
      ],
    },
  ]
  return (
    <Stack>
      {groups.map((g) => (
        <Card key={g.title}>
          <CardHead>
            <CardTitle style={{ fontSize: 16 }}>{g.title}</CardTitle>
          </CardHead>
          <Rows>
            {g.rows.map(([name, detail, [tone, chip]]) => (
              <SourceRow key={name}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--core-color-text-primary)' }}>{name}</div>
                  <div style={{ fontSize: 12, color: 'var(--core-color-text-muted)', marginTop: 2 }}>{detail}</div>
                </div>
                <MetaChip tone={tone} size='compact'>{chip}</MetaChip>
              </SourceRow>
            ))}
          </Rows>
        </Card>
      ))}
    </Stack>
  )
}

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

export function ApiResponsePanel({ record }) {
  const [copied, setCopied] = React.useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(JSON.stringify(record, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <Card style={{ overflow: 'hidden' }}>
      <div
        style={{
          alignItems: 'center',
          borderBottom: '1px solid var(--core-color-border-divider)',
          display: 'flex',
          gap: 12,
          justifyContent: 'space-between',
          padding: '12px 22px',
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--core-color-text-muted)' }}>
          GET /v1/businesses/{record.id}
        </span>
        <ActionButton variant='secondary' onClick={copy}>
          {copied ? 'Copied' : 'Copy JSON'}
        </ActionButton>
      </div>
      <pre
        style={{
          margin: 0,
          padding: '18px 22px',
          background: 'var(--core-color-surface-inset)',
          fontFamily: MONO,
          fontSize: 12,
          lineHeight: 1.6,
          color: 'var(--core-color-text-primary)',
          overflowX: 'auto',
          whiteSpace: 'pre',
        }}
      >
        {JSON.stringify(record, null, 2)}
      </pre>
    </Card>
  )
}
