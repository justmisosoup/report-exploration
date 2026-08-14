// Report C chat rail: a report-scoped assistant docked on the right edge of
// the Report C screen, with a drag-adjustable divider against the report
// panel. Prototype behavior: fresh conversation per visit (the screen
// remounts on view change), canned answers about the loaded business.
import React from 'react'
import { GripVertical } from 'lucide-react'

import { ChatComposer, ChatLog, ChatMessage, ChatSuggestions, MetaChip, SegmentedControl, SegmentedControlItem } from '../ds.js'

// Canned assistant answers, first match wins against the lowercased
// question. Figures come from the record where trivial so the copy stays
// honest if the fixture changes.
const answerFor = (text, business) => {
  const q = text.toLowerCase()
  const visits = business.traffic.monthlyVisits.toLocaleString()
  const topCountry = business.traffic.topCountries[0]
  const rules = [
    [
      /traffic|vietnam|visit|similarweb|keyword/,
      `The traffic profile does not match a New York physical therapy clinic. Of roughly ${visits} monthly visits, ` +
        `${Math.round(topCountry.share * 100)}% originate from ${topCountry.name}, and the top search keywords point at a generic ` +
        'fitness tool page rather than local patients. Treat the site as weak evidence of real operations.',
    ],
    [
      /name|mismatch|physical therapy|legal/,
      `The submitted name ${business.name} does not match the Secretary of State registration, which is filed as ` +
        `${business.names.find((n) => n.type === 'registration')?.name} (NY file ${business.registrations[0].fileNumber}, ` +
        'active). This is likely a shortened trade name, but it is currently unverified. A DBA filing or an updated ' +
        'state record would resolve it.',
    ],
    [
      /connect|related|shared address|801|network/,
      (() => {
        // Tiered read: assert only the corroborated match, and demote the
        // rest to nearby businesses so the analyst knows what to ignore.
        const conns = tieredConnections(business)
        const likely = conns.filter((c) => c.likely)
        const nearby = conns.filter((c) => !c.likely)
        const likelyTxt = likely.map((c) =>
          `${c.name} is likely the same company: it shares ${c.sharedAddresses.length} filing addresses with this record` +
          `${c.nameMatch ? ' and the name closely matches' : ''} (${c.pct}% confidence).`).join(' ')
        const nearbyTxt = nearby.map((c) =>
          `${c.name} (${c.pct}%) shares only the office suite, which is common in Manhattan commercial buildings: ` +
          'treat it as a nearby business, not a related party.').join(' ')
        return `${conns.length} entities surfaced through shared addresses, and they are not equally meaningful. ${likelyTxt} ${nearbyTxt}`.trim()
      })(),
    ],
    [
      /people|officer|joshua|gee|person/,
      `One individual is on record: ${business.people[0]?.name ?? 'none listed'}, with no listed title. The only other ` +
        'party is the registered entity itself, listed for service of process.',
    ],
    [
      /tin|ein|tax/,
      'No TIN was submitted, so the IRS match could not run. That leaves tax identity unverified; request the EIN before approval.',
    ],
    [
      /approve|decision|recommend|risk|review|score/,
      `Risk sits at ${business.risk.score}, ${business.risk.level}. Strong signals: the state filing is active and domestic, ` +
        'the office address is verified, deliverable, and commercial, and watchlists are clear. Open items: the business ' +
        'name and people checks are unverified, the TIN is missing, and web traffic looks synthetic. I would hold ' +
        'approval until the name mismatch and TIN are resolved.',
    ],
    [
      /website|domain|online|squarespace|whois/,
      `${business.website.url.replace(/^https?:\/\//, '')} is online, built on ${business.website.platform}. The domain was ` +
        `created in ${business.website.domainCreated.slice(0, 4)}, before the entity formed, which is plausible for a ` +
        'practice that renamed. Content matches a concierge physical therapy business.',
    ],
  ]
  const hit = rules.find(([re]) => re.test(q))
  return hit
    ? hit[1]
    : 'I can answer questions about this report. Try the business name mismatch, the web traffic pattern, the address connections, or whether this file is ready to approve.'
}

const SUGGESTIONS = [
  { id: 'traffic', label: 'Why is the web traffic suspicious?' },
  { id: 'name', label: 'Explain the business name mismatch' },
  { id: 'connections', label: 'What is connected to this business?' },
]

const WELCOME =
  'I have the full report for this business loaded. Ask me about anything in it: verification results, web traffic, connections, or what to do next.'

// --- Mini relationship network card -----------------------------------------
// Rendered inside an assistant turn when the analyst asks what the entity is
// connected to. Two views behind a toggle: Map keeps the app's transit-map
// language (orthogonal lines, tile marks with initials, faint cross grid) on
// a layout where no label band crosses an edge; Line lays the same
// relationships out as a single vertical route, one station per row.
// Connections are tiered so the card only asserts what the evidence supports:
// a high-confidence match backed by multiple shared addresses or a similar
// name reads as the same company, anything else is presented as a nearby
// business and drawn muted.
const KIND_COLOR = {
  business: 'var(--core-color-brand-primary)',
  person: 'var(--core-color-avatar-8-fg)',
  address: 'var(--core-color-avatar-2-fg)',
}

const initialsOf = (name) => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('')

const STOP_TOKENS = new Set(['LLC', 'PLLC', 'LTD', 'INC', 'CORP', 'CO', 'LP', 'LLP', 'PC', 'THE', 'OF', 'AND'])
const nameTokens = (name) => name.toUpperCase().split(/[^A-Z0-9]+/).filter((w) => w.length > 1 && !STOP_TOKENS.has(w))

// Connections tiered by what we can actually claim, strongest first. A match
// is "likely the same company" only when the confidence is high and it is
// corroborated by more than the one shared suite (a second address or a
// similar name); everything else is a nearby business at the same address.
const tieredConnections = (business) => {
  const own = nameTokens(business.name)
  return (business.connections || [])
    .map((c) => {
      const nameMatch = nameTokens(c.name).some((t) => own.includes(t))
      return {
        ...c,
        nameMatch,
        pct: Math.round(c.confidence * 100),
        likely: c.confidence >= 0.9 && (c.sharedAddresses.length > 1 || nameMatch),
      }
    })
    .sort((a, b) => (b.likely ? 1 : 0) - (a.likely ? 1 : 0) || b.confidence - a.confidence)
}

// Map view geometry (viewBox 400x296): the business and the person on the
// left column, the shared address as the interchange on the main line, and
// the connected entities on one vertical line to the right. Label positions
// are fixed per node (right / below / above) so text never sits on a line.
const MapLabel = ({ x, y, anchor = 'middle', name, sub, muted }) => (
  <g>
    <text x={x} y={y} textAnchor={anchor} fontSize='13' fontFamily='var(--app-font)' fontWeight='600' letterSpacing='-0.01em' fill={muted ? 'var(--core-color-text-secondary)' : 'var(--core-color-text-primary)'}>
      {name.length > 24 ? name.slice(0, 22) + '…' : name}
    </text>
    <text x={x} y={y + 14} textAnchor={anchor} fontSize='11.5' fontFamily='var(--app-font)' fill='var(--core-color-text-muted)'>{sub}</text>
  </g>
)

const MapTile = ({ x, y, r, kind, name, focus, muted }) => (
  <g transform={`translate(${x},${y})`} opacity={muted ? 0.55 : 1}>
    {focus ? <rect x={-(r + 5)} y={-(r + 5)} width={(r + 5) * 2} height={(r + 5) * 2} rx='10' fill='none' stroke='var(--core-color-border-bold)' strokeWidth='1.5' opacity='.35' /> : null}
    {kind === 'person'
      ? <circle r={r} fill={KIND_COLOR.person} />
      : <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={focus ? 9 : 7} fill={KIND_COLOR[kind]} />}
    <text y={focus ? 5.5 : 5} textAnchor='middle' fontSize={focus ? 14 : 12.5} fontFamily='var(--app-font)' fontWeight='600' fill='var(--core-color-text-inverse)'>{initialsOf(name)}</text>
  </g>
)

const tierSub = (c) => `${c.pct}% · ${c.likely ? 'likely same company' : 'nearby business'}`

const MapView = ({ business, conns }) => {
  const person = (business.people || []).find((p) => !(p.titles || []).length)
  const office = (business.addresses?.[0]?.fullAddress || '').split(',')[0]
  const [c1, c2] = conns
  const edge = (likely) => ({
    stroke: KIND_COLOR.address,
    strokeWidth: 2,
    strokeLinecap: 'round',
    opacity: likely ? 0.8 : 0.45,
    strokeDasharray: likely ? undefined : '5 4',
  })
  const legendKey = (kind, shape, label) => (
    <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--core-color-text-secondary)' }}>
      <svg width='12' height='12' aria-hidden>
        {shape === 'circle'
          ? <circle cx='6' cy='6' r='5' fill={KIND_COLOR[kind]} />
          : <rect x='1' y='1' width='10' height='10' rx='2.5' fill={KIND_COLOR[kind]} />}
      </svg>
      {label}
    </span>
  )
  return (
    <>
      <svg viewBox='0 0 400 296' preserveAspectRatio='xMidYMid meet' role='img' aria-label={`Relationship network for ${business.name}`} style={{ display: 'block', width: '100%', height: 'auto' }}>
        <defs>
          <pattern id='chatcross' width='60' height='60' patternUnits='userSpaceOnUse'>
            <path d='M30 26 V34 M26 30 H34' stroke='var(--core-color-text-secondary)' strokeWidth='1' opacity='.09' />
          </pattern>
        </defs>
        <rect x='0' y='0' width='400' height='296' fill='url(#chatcross)' />
        {/* Main line: person above the business, the shared address to its right. */}
        {person ? <line x1='88' y1='70' x2='88' y2='140' stroke={KIND_COLOR.person} strokeWidth='2.5' strokeLinecap='round' opacity='.8' /> : null}
        <line x1='112' y1='164' x2='212' y2='164' stroke={KIND_COLOR.address} strokeWidth='2.5' strokeLinecap='round' opacity='.8' />
        {/* Interchange trunk out of the address, then one vertical line
            through the connected entities. */}
        {c1 || c2 ? <line x1='252' y1='164' x2='300' y2='164' stroke={KIND_COLOR.address} strokeWidth='2' strokeLinecap='round' opacity='.8' /> : null}
        {c1 ? <line x1='300' y1='116' x2='300' y2='164' {...edge(c1.likely)} /> : null}
        {c2 ? <line x1='300' y1='164' x2='300' y2='212' {...edge(c2.likely)} /> : null}
        {person ? <MapTile x={88} y={52} r={15} kind='person' name={person.name} /> : null}
        <MapTile x={88} y={164} r={21} kind='business' name={business.name} focus />
        <MapTile x={232} y={164} r={17} kind='address' name={office} />
        {c1 ? <MapTile x={300} y={96} r={17} kind='business' name={c1.name} muted={!c1.likely} /> : null}
        {c2 ? <MapTile x={300} y={232} r={17} kind='business' name={c2.name} muted={!c2.likely} /> : null}
        {person ? <MapLabel x={113} y={50} anchor='start' name={person.name} sub='On record' /> : null}
        <MapLabel x={88} y={203} name={business.name} sub='This business' />
        <MapLabel x={232} y={199} name={office} sub='Shared office address' />
        {c1 ? <MapLabel x={300} y={50} name={c1.name} sub={tierSub(c1)} muted={!c1.likely} /> : null}
        {c2 ? <MapLabel x={300} y={265} name={c2.name} sub={tierSub(c2)} muted={!c2.likely} /> : null}
      </svg>
      <div style={{ display: 'flex', gap: 14, padding: '8px 14px', borderTop: '1px solid var(--core-color-border-divider)' }}>
        {legendKey('business', 'rect', 'Business')}
        {legendKey('person', 'circle', 'Person')}
        {legendKey('address', 'rect', 'Address')}
      </div>
    </>
  )
}

// Line view: the same network as one vertical route. The main line runs
// person → business → shared address; connected entities branch off the
// address, each with its evidence line and confidence chip.
const MAIN_X = 20
const BRANCH_X = 46

const LineView = ({ business, conns }) => {
  const person = (business.people || []).find((p) => !(p.titles || []).length)
  const office = (business.addresses?.[0]?.fullAddress || '').split(',')[0]
  const rows = [
    person ? { id: 'person', kind: 'person', name: person.name, sub: 'On record · no title' } : null,
    { id: 'self', kind: 'business', focus: true, name: business.name, sub: 'This business' },
    { id: 'addr', kind: 'address', name: office, sub: 'Shared office address' },
    ...conns.map((c) => ({
      id: c.name,
      kind: 'business',
      branch: true,
      muted: !c.likely,
      name: c.name,
      sub: c.likely
        ? `Likely the same company · ${c.sharedAddresses.length} addresses${c.nameMatch ? ' · similar name' : ''}`
        : 'Nearby business · shares this suite only',
      chip: `${c.pct}%`,
      chipTone: c.likely ? 'info' : 'neutral',
    })),
  ].filter(Boolean)
  const seg = (color) => ({ position: 'absolute', left: MAIN_X - 1, width: 2, background: color, opacity: 0.8 })
  return (
    <div style={{ padding: '6px 0' }} role='list' aria-label={`Relationship network for ${business.name}`}>
      {rows.map((row, i) => {
        const isLast = i === rows.length - 1
        const laneX = row.branch ? BRANCH_X : MAIN_X
        // Main-line segment colors: person to business draws in the person
        // hue, everything from the business down in the address hue.
        const topColor = rows[i - 1]?.kind === 'person' ? KIND_COLOR.person : KIND_COLOR.address
        return (
          <div key={row.id} role='listitem' style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: 50, padding: '7px 14px 7px 0' }}>
            {!row.branch && i > 0 ? <div style={{ ...seg(topColor), top: 0, height: '50%' }} /> : null}
            {!row.branch && rows[i + 1] ? <div style={{ ...seg(rows[i + 1].kind === 'person' ? KIND_COLOR.person : KIND_COLOR.address), top: '50%', bottom: 0 }} /> : null}
            {row.branch && !isLast ? (
              <div style={{ opacity: row.muted ? 0.45 : 0.8 }}>
                <div style={{ position: 'absolute', left: MAIN_X - 1, top: 0, bottom: 0, width: 2, background: KIND_COLOR.address }} />
                <div style={{ position: 'absolute', left: MAIN_X + 1, top: 'calc(50% - 1px)', width: BRANCH_X - 13 - MAIN_X - 1, height: 2, background: KIND_COLOR.address }} />
              </div>
            ) : null}
            {row.branch && isLast ? (
              <div
                style={{
                  position: 'absolute',
                  left: MAIN_X - 1,
                  top: 0,
                  width: BRANCH_X - 13 - (MAIN_X - 1),
                  height: '50%',
                  borderLeft: `2px solid ${KIND_COLOR.address}`,
                  borderBottom: `2px solid ${KIND_COLOR.address}`,
                  borderBottomLeftRadius: 10,
                  opacity: row.muted ? 0.45 : 0.8,
                }}
              />
            ) : null}
            <div
              style={{
                position: 'absolute',
                left: laneX - 13,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 26,
                height: 26,
                borderRadius: row.kind === 'person' ? '50%' : 8,
                background: KIND_COLOR[row.kind],
                opacity: row.muted ? 0.55 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10.5,
                fontWeight: 600,
                color: 'var(--core-color-text-inverse)',
                boxShadow: row.focus ? '0 0 0 2px var(--core-color-surface-card), 0 0 0 3.5px var(--core-color-border-bold)' : undefined,
              }}
            >
              {initialsOf(row.name)}
            </div>
            <div style={{ width: BRANCH_X + 22, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: row.muted ? 'var(--core-color-text-secondary)' : 'var(--core-color-text-primary)' }}>{row.name}</span>
                {row.chip ? <MetaChip tone={row.chipTone} size='compact'>{row.chip}</MetaChip> : null}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--core-color-text-muted)', marginTop: 1 }}>{row.sub}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const ConnectionsCard = ({ business }) => {
  const [view, setView] = React.useState('map')
  const conns = tieredConnections(business)
  return (
    <div style={{ marginTop: 10, border: '1px solid var(--core-color-border-default)', borderRadius: 12, overflow: 'hidden', background: 'var(--core-color-surface-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 8px 8px 14px', borderBottom: '1px solid var(--core-color-border-divider)' }}>
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--core-color-text-muted)' }}>
          Relationship network
        </span>
        <SegmentedControl size='sm' value={view} onValueChange={(v) => { if (v) setView(v) }} aria-label='Network view'>
          <SegmentedControlItem value='map'>Map</SegmentedControlItem>
          <SegmentedControlItem value='line'>Line</SegmentedControlItem>
        </SegmentedControl>
      </div>
      {view === 'map' ? <MapView business={business} conns={conns} /> : <LineView business={business} conns={conns} />}
    </div>
  )
}

// Renders as two flex siblings: the resize handle (a hoverable hairline) and
// the chat rail itself. The rail is chromeless so the app canvas shows
// through, seamless against the report panel beside it.
// Fixed pixel width: the rail holds its width through window resizes and
// only changes when the customer drags the divider (or uses its keys).
const MIN_W = 400
const MAX_W = 620
const DEFAULT_W = 404

export default function ReportChatPanel({ business }) {
  const [width, setWidth] = React.useState(DEFAULT_W)
  const [isResizing, setResizing] = React.useState(false)
  const clampW = (w) => Math.min(MAX_W, Math.max(MIN_W, w))
  const widthFromPointer = (e) => {
    const row = e.currentTarget.parentElement.getBoundingClientRect()
    return clampW(row.right - e.clientX)
  }
  const handleProps = {
    role: 'separator',
    tabIndex: 0,
    'aria-orientation': 'vertical',
    'aria-valuemin': MIN_W,
    'aria-valuemax': MAX_W,
    'aria-valuenow': Math.round(width),
    onPointerDown: (e) => {
      if (e.button !== 0) return
      e.currentTarget.setPointerCapture(e.pointerId)
      setResizing(true)
    },
    onPointerMove: (e) => {
      if (!e.currentTarget.hasPointerCapture?.(e.pointerId)) return
      setWidth(widthFromPointer(e))
    },
    onPointerUp: () => setResizing(false),
    onPointerCancel: () => setResizing(false),
    onKeyDown: (e) => {
      const step = e.shiftKey ? 64 : 16
      let next = null
      if (e.key === 'ArrowLeft') next = width + step
      else if (e.key === 'ArrowRight') next = width - step
      else if (e.key === 'Home') next = MIN_W
      else if (e.key === 'End') next = MAX_W
      if (next === null) return
      e.preventDefault()
      setWidth(clampW(next))
    },
    onDoubleClick: () => setWidth(DEFAULT_W),
  }
  const [hover, setHover] = React.useState(false)

  const [messages, setMessages] = React.useState([{ id: 0, role: 'assistant', text: WELCOME }])
  const [input, setInput] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const timerRef = React.useRef(null)
  React.useEffect(() => () => clearTimeout(timerRef.current), [])

  const send = (raw) => {
    const text = (raw ?? input).trim()
    if (!text || busy) return
    setInput('')
    setBusy(true)
    setMessages((m) => [...m, { id: m.length, role: 'user', text }])
    // Connection questions get the mini network map alongside the answer.
    const graph = /connect|related|shared address|801|network/.test(text.toLowerCase())
    timerRef.current = setTimeout(() => {
      setMessages((m) => [...m, { id: m.length, role: 'assistant', text: answerFor(text, business), graph }])
      setBusy(false)
    }, 700)
  }

  const active = hover || isResizing
  return (
    <>
      <div
        {...handleProps}
        aria-label='Resize chat panel'
        style={{
          width: 10,
          flexShrink: 0,
          cursor: 'col-resize',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'center',
          touchAction: 'none',
          outline: 'none',
          position: 'relative',
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {/* Standing hairline marks the chat's edge; it thickens into the
            grab highlight on hover/drag. */}
        <div
          style={{
            width: active ? 3 : 1,
            borderRadius: 2,
            background: active ? 'var(--core-color-interactive-default)' : 'var(--core-color-border-divider)',
          }}
        />
        {/* Drag affordance: a grip chip centered on the hairline, shown on
            hover/drag so the divider clearly reads as draggable. */}
        {active && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 16,
              height: 34,
              borderRadius: 8,
              background: 'var(--core-color-surface-card)',
              border: '1px solid var(--core-color-border-default)',
              boxShadow: 'var(--core-color-elevation-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--core-color-text-muted)',
              pointerEvents: 'none',
            }}
          >
            <GripVertical size={12} strokeWidth={1.5} aria-hidden />
          </div>
        )}
      </div>
      <aside
        style={{ width, flexShrink: 0, minWidth: MIN_W, display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ padding: '18px 18px 6px' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '.05em',
              textTransform: 'uppercase',
              color: 'var(--core-color-text-muted)',
            }}
          >
            Report assistant
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--core-color-text-secondary)', marginTop: 2 }}>
            {business.name}
          </div>
        </div>
        <ChatLog label='Report assistant conversation'>
          {messages.map((m) => (
            <ChatMessage key={m.id} role={m.role}>
              {m.text}
              {m.graph ? <ConnectionsCard business={business} /> : null}
            </ChatMessage>
          ))}
          {messages.length === 1 ? (
            <ChatSuggestions suggestions={SUGGESTIONS} onSelect={(s) => send(s.label)} disabled={busy} />
          ) : null}
          {busy ? <ChatMessage role='assistant' pending /> : null}
        </ChatLog>
        <div style={{ padding: '0 14px 8px' }}>
          <ChatComposer
            value={input}
            onChange={setInput}
            onSubmit={send}
            isStreaming={busy}
            placeholder='Ask about this business'
            label='Report chat'
          />
          <div
            style={{
              fontSize: 11,
              color: 'var(--core-color-text-muted)',
              textAlign: 'center',
              padding: '8px 4px 6px',
            }}
          >
            AI-generated. Verify important details in the report.
          </div>
        </div>
      </aside>
    </>
  )
}
