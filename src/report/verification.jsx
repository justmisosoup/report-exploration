// Business verification tab — ported from the app repo:
//   containers/BusinessHome/BusinessOverview.tsx  (card stack)
//   components/Dive/index.tsx                     (two-column grid + tasks rail)
//   components/BusinessHome/OrderCard.tsx         (card shell + table)
//   containers/BusinessHome/Tasks/Tasks.tsx       (review-tasks rail)
//   containers/BusinessHome/BusinessSummaryCard   (Business details card)
// Same shells and CSS; redux plumbing replaced by the business.json record.
import React from 'react'
import styled from 'styled-components'

import { ActionButton } from '@/core/Action'
import { MetaChip } from '@/core/Badge'
import { TextTooltip } from '@/core/Tooltip'
import { colors, typography } from '@/core/theme'

import { StatusDotLabel } from './StatusDot'

const FROST = colors.frost
const KARL = colors.karl
const SPACING = '1.5rem'

/* ---------- Dive: two-column grid, tasks rail first ---------- */

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

/* ---------- Tasks rail ---------- */

const TaskGroup = styled.div`
  border: 1px solid ${FROST};
  border-radius: 4px;
  color: var(--core-color-text-primary);
  font-size: ${typography.sizes.medium};
  margin: 8px 0;
  overflow: hidden;
  background: ${({ $secondary }) => ($secondary ? 'transparent' : '#fff')};

  &:first-child {
    margin-top: 0;
  }

  > div:last-child {
    border: none;
  }
`

const TaskRow = styled.div`
  display: flex;
  flex-direction: row;
  gap: 20px;
  justify-content: space-between;
  font-size: ${typography.sizes.medium};
  padding: 20px;
  width: 100%;

  &:hover {
    background-color: ${colors.dawn};
    border-radius: 2px;
  }

  > div:first-child {
    color: ${KARL};
    font-weight: 400;
    align-items: center;
    display: flex;
  }

  > div:nth-child(2) {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    gap: 10px;
  }
`

const TaskRowDivider = styled.div`
  border-bottom: 1px solid ${FROST};
  margin: 0 20px;
`

/* ---------- OrderCard shell ---------- */

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
  padding-bottom: 0;
`

const CardSection = styled.div`
  align-items: center;
  column-gap: 8px;
  display: flex;
  flex-direction: row;
  margin: ${SPACING} ${SPACING} 0;
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

// The app's edge-to-edge table: leading/trailing spacer columns keep row
// separators inset-free while content sits at 1.5rem.
const StyledTable = styled.table`
  border-collapse: collapse;
  margin-top: 8px;
  table-layout: fixed;
  width: 100%;

  col:first-of-type,
  col:last-of-type {
    width: ${SPACING};
  }

  th {
    color: ${KARL};
    font-size: 0.75rem;
    font-weight: normal;
    padding: 24px 8px 4px;
    text-align: left;
  }

  tbody td {
    border-top: 1px solid ${FROST};
    font-size: ${typography.sizes.medium};
    padding: 16px 8px;
    vertical-align: top;
  }

  tbody td,
  thead th {
    &:first-child,
    &:last-child {
      border: 0;
      padding: 0;
    }
    &:nth-of-type(2) {
      padding-left: 0;
    }
    &:nth-last-of-type(2) {
      padding-right: 0;
    }
  }
`

const NoHitBanner = styled.div`
  align-items: center;
  border: 1px solid ${FROST};
  border-radius: 4px;
  display: flex;
  gap: 8px;
  margin: 20px ${SPACING} 24px;
  padding: 14px 16px;
`

const CardBottomPad = styled.div`
  padding-bottom: 20px;
`

/* ---------- Business details summary grid ---------- */

const SummaryHeadRow = styled(CardSection)`
  border-bottom: 1px solid ${FROST};
  margin: 0;
  padding: ${SPACING} ${SPACING} 16px;
  margin-bottom: ${SPACING};
`

const SummaryGrid = styled.div`
  column-gap: 12px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 0 ${SPACING} 1.8rem;
  row-gap: 1.25rem;

  @media (max-width: 767px) {
    grid-template-columns: 1fr;
    row-gap: 20px;
  }
`

const Field = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  row-gap: 4px;
`

const FieldLabel = styled.div`
  color: ${KARL};
  font-size: 0.75rem;
`

/* ---------- helpers ---------- */

const sentence = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s)
const fmtDate = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const STATE_NAMES = { NY: 'New York', DE: 'Delaware', CA: 'California', IL: 'Illinois', NJ: 'New Jersey', ID: 'Idaho' }
const REG_TAG = { active: 'green', inactive: 'inactive', unknown: 'unknown' }
const TAG_TONE = { green: 'success', inactive: 'warning', warning: 'danger', unknown: 'neutral' }
const Chip = ({ type, children }) => (
  <MetaChip tone={TAG_TONE[type] || 'neutral'} size='compact'>{children}</MetaChip>
)

// Review tasks the rail treats as primary; the rest render in the secondary group.
const PRIMARY_TASKS = ['name', 'address_verification', 'address_deliverability', 'sos_active', 'watchlist', 'business_connections']

const OrderCard = ({ title, task, updatedAt, headerExtra, children }) => (
  <StyledCard>
    <CardSection>
      <CardH3>{title}</CardH3>
      {task && (
        <TextTooltip
          placement='top'
          content={task.label}
          trigger={<StatusDotLabel intent={task.status} label={sentence(task.subLabel)} labelPosition='left' outlined />}
        />
      )}
      {headerExtra}
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
        {headers.map(([label, width]) => (
          <th key={label} style={width ? { width } : undefined}>{label}</th>
        ))}
        <th />
      </tr>
    </thead>
    <tbody>
      {rows.map((row, ri) => (
        <tr key={ri}>
          <td />
          {row.map((cell, ci) => <td key={ci}>{cell}</td>)}
          <td />
        </tr>
      ))}
    </tbody>
  </StyledTable>
)

/* ---------- the tab ---------- */

export const VerificationPage = ({ record, updatedAt = 'Aug 9, 2026' }) => {
  const tasks = record.reviewTasks
  const byKey = (k) => tasks.find((t) => t.key === k)
  const primary = tasks.filter((t) => PRIMARY_TASKS.includes(t.key))
  const secondary = tasks.filter((t) => !PRIMARY_TASKS.includes(t.key))

  const rail = (group, isSecondary) => (
    <TaskGroup $secondary={isSecondary}>
      {group.map((t, i) => (
        <React.Fragment key={t.key}>
          <TaskRow>
            <div>{t.label}</div>
            <div>
              <StatusDotLabel intent={t.status} label={sentence(t.subLabel)} labelPosition='left' size={16} />
            </div>
          </TaskRow>
          {i < group.length - 1 && <TaskRowDivider />}
        </React.Fragment>
      ))}
    </TaskGroup>
  )

  const regs = [...record.registrations].sort((a, b) => {
    const rank = (r) => (r.state === record.formation.state ? 0 : 1)
    return rank(a) - rank(b) || STATE_NAMES[a.state].localeCompare(STATE_NAMES[b.state])
  })

  return (
    <Dive>
      <div>
        {rail(primary, false)}
        {rail(secondary, true)}
      </div>

      <Column>
        <StyledCard>
          <SummaryHeadRow>
            <CardH3>Business details</CardH3>
            <RightAligned style={{ marginRight: 0 }}>
              <ActionButton variant='secondary'>Download PDF</ActionButton>
            </RightAligned>
          </SummaryHeadRow>
          <SummaryGrid>
            <Field>
              <FieldLabel>Business name</FieldLabel>
              <div>{record.name}</div>
              <StatusDotLabel intent={byKey('name')?.status} label={sentence(byKey('name')?.subLabel)} labelPosition='right' size={14} labelSize='small' />
            </Field>
            <Field>
              <FieldLabel>Office address</FieldLabel>
              <div>{record.addresses[0].fullAddress}</div>
              <StatusDotLabel intent={byKey('address_verification')?.status} label={sentence(byKey('address_verification')?.subLabel)} labelPosition='right' size={14} labelSize='small' />
            </Field>
            <Field>
              <FieldLabel>TIN</FieldLabel>
              <div>{record.tin || 'Not provided'}</div>
            </Field>
            <Field>
              <FieldLabel>Formation state</FieldLabel>
              <div>{STATE_NAMES[record.formation.state]}</div>
            </Field>
            <Field>
              <FieldLabel>Entity type</FieldLabel>
              <div>{sentence(record.formation.entityType)}</div>
            </Field>
            <Field>
              <FieldLabel>Formation date</FieldLabel>
              <div>{fmtDate(record.formation.date)}</div>
            </Field>
          </SummaryGrid>
        </StyledCard>

        <OrderCard title='Business name' task={byKey('name')} updatedAt={updatedAt}>
          <CardBottomPad>
            <DataTable
              headers={[['Business name'], ['Submitted', '18%'], ['Notes', '32%']]}
              rows={record.names.map((n) => [
                n.type === 'legal'
                  ? <StatusDotLabel intent={byKey('name')?.status} label={n.name} />
                  : n.name,
                n.submitted,
                n.notes || '',
              ])}
            />
          </CardBottomPad>
        </OrderCard>

        <OrderCard title='Office address' task={byKey('address_verification')} updatedAt={updatedAt}>
          <CardBottomPad>
            <DataTable
              headers={[['Address'], ['Type', '22%'], ['Notes', '28%']]}
              rows={record.addresses.slice(0, 3).map((a, i) => [
                i === 0
                  ? <StatusDotLabel intent={byKey('address_verification')?.status} label={a.fullAddress} />
                  : a.fullAddress,
                i === 0 ? 'Commercial' : 'Registration',
                i === 0 ? 'Submitted office address' : 'From state filings',
              ])}
            />
          </CardBottomPad>
        </OrderCard>

        <OrderCard title='SOS filings' task={byKey('sos_match')} updatedAt={updatedAt}>
          <CardBottomPad>
            <DataTable
              headers={[['File date', '20%'], ['State', '22%'], ['Status', '24%'], ['Sub-status']]}
              rows={regs.map((r) => [
                fmtDate(r.fileDate),
                STATE_NAMES[r.state],
                <Chip type={REG_TAG[r.status]}>{r.state === record.formation.state ? `Domestic ${r.status}` : sentence(r.status)}</Chip>,
                <StatusDotLabel
                  intent={r.subStatus ? 'success' : 'unknown'}
                  label={r.subStatus || 'Not provided by state'}
                  size={14}
                />,
              ])}
            />
          </CardBottomPad>
        </OrderCard>

        <OrderCard title='TIN' updatedAt={updatedAt}>
          <NoHitBanner>
            <StatusDotLabel intent='unknown' label='No TIN submitted, so the IRS match has not run' />
          </NoHitBanner>
        </OrderCard>

        <OrderCard title='People' task={byKey('person_verification') || undefined} updatedAt={updatedAt}>
          <CardBottomPad>
            <DataTable
              headers={[['Name'], ['Titles', '46%']]}
              rows={record.people.map((p) => [p.name, p.titles.join(', ')])}
            />
          </CardBottomPad>
        </OrderCard>

        <OrderCard title='Watchlist' task={byKey('watchlist')} updatedAt={updatedAt}>
          <NoHitBanner>
            <StatusDotLabel intent='success' label='No watchlist hits found across sanctions and enforcement sources' />
          </NoHitBanner>
        </OrderCard>
      </Column>
    </Dive>
  )
}

export default VerificationPage
