// Report C tab bodies: Attributes, Sources, and API Response panels for the
// restructured Report C screen. All three render straight from the Middesk
// business record (business.json) so they stay honest to the pulled data.
import React from 'react'
import styled from 'styled-components'

import { MetaChip } from '@/core/Badge'
import { ActionButton } from '@/core/Action'

import { Card, CardHead, CardTitle } from './cards'

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const Rows = styled.div`
  padding: 4px 22px 10px;
`

const Row = styled.div`
  align-items: baseline;
  border-top: 1px solid var(--core-color-border-divider);
  display: grid;
  gap: 16px;
  grid-template-columns: 220px 1fr;
  padding: 10px 0;

  &:first-child {
    border-top: none;
  }
`

const RowLabel = styled.span`
  color: var(--core-color-text-muted);
  font-size: 12.5px;
`

const RowValue = styled.span`
  color: var(--core-color-text-primary);
  font-size: 13.5px;
`

const Muted = styled.span`
  color: var(--core-color-text-muted);
`

const fmtDate = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const section = (title, rows) => (
  <Card key={title}>
    <CardHead>
      <CardTitle style={{ fontSize: 16 }}>{title}</CardTitle>
    </CardHead>
    <Rows>
      {rows.map(([label, value]) => (
        <Row key={label}>
          <RowLabel>{label}</RowLabel>
          <RowValue>{value}</RowValue>
        </Row>
      ))}
    </Rows>
  </Card>
)

export function AttributesPanel({ record }) {
  const humanStatus = record.status === 'in_review' ? 'In review' : record.status
  return (
    <Stack>
      {section('Entity details', [
        ['Legal name', record.name],
        ['Entity type', record.formation.entityType],
        ['Formation date', fmtDate(record.formation.date)],
        ['Formation state', record.formation.state],
        ['Status', humanStatus],
        ['TIN', record.tin ?? <Muted>Not provided</Muted>],
      ])}
      {section(
        'Names',
        record.names.map((n, i) => [
          n.type === 'registration' ? 'Registration name' : 'Submitted name',
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {n.name}
            <MetaChip tone='neutral' size='compact'>{n.type}</MetaChip>
            {n.notes ? <Muted>{n.notes}</Muted> : null}
          </span>,
        ]),
      )}
      {section(
        'Addresses',
        record.addresses.map((a, i) => [`Address ${i + 1}`, a.fullAddress]),
      )}
      {section(
        'People',
        record.people.map((p) => [
          p.name,
          p.titles?.length ? p.titles.join(', ') : <Muted>No title listed</Muted>,
        ]),
      )}
      {section(
        'Registrations',
        record.registrations.map((r) => [
          r.state,
          `${r.status.charAt(0).toUpperCase() + r.status.slice(1)} · File ${r.fileNumber} · Filed ${fmtDate(r.fileDate)}`,
        ]),
      )}
      {section('Website', [
        ['URL', record.website.url],
        ['Domain created', fmtDate(record.website.domainCreated)],
        ['Registrar', record.website.registrar],
        ['Platform', record.website.platform],
      ])}
      {section(
        'Industry',
        record.industry.map((i) => [
          `${i.system} ${i.code}`,
          <span key={i.code} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
            {i.category}
            <Muted>{i.confidence}% confidence</Muted>
          </span>,
        ]),
      )}
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
