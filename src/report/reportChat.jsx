// Report C chat rail: a report-scoped assistant docked on the right edge of
// the Report C screen, with a drag-adjustable divider against the report
// panel. Prototype behavior: fresh conversation per visit (the screen
// remounts on view change), canned answers about the loaded business.
import React from 'react'
import { GripVertical } from 'lucide-react'

import { ChatComposer, ChatLog, ChatMessage, ChatSuggestions } from '../ds.js'

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
      /connect|related|shared address|801/,
      `${business.connections.length} entities are connected through shared addresses: ` +
        business.connections
          .map((c) => `${c.name} (${Math.round(c.confidence * 100)}% confidence)`)
          .join(' and ') +
        '. Shared commercial suites are common in Manhattan, so review the office-address entity first.',
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

// --- Mini relationship network (transit-map style) -------------------------
// Rendered inside an assistant turn when the analyst asks what the entity is
// connected to. Same visual language as the app's Relationship network
// transit map (octilinear lines, tile marks with initials, nameplate cards,
// faint cross grid), scaled to the chat rail and fed from the loaded record:
// the shared office address is the hub between the two connected entities,
// with the one person on record tied to the business directly.
const KIND_COLOR = {
  business: 'var(--core-color-brand-primary)',
  person: 'var(--core-color-avatar-8-fg)',
  address: 'var(--core-color-avatar-2-fg)',
}

// Octilinear edge path: diagonal leaves A first, then orthogonal into B,
// with a rounded bend — same routing as the app's transit map.
const octPath = (A, B, rA, rB, bendR = 12) => {
  const dx = B.x - A.x, dy = B.y - A.y
  const adx = Math.abs(dx), ady = Math.abs(dy)
  const sx = Math.sign(dx), sy = Math.sign(dy)
  if (adx < 2 || ady < 2 || Math.abs(adx - ady) < 2) {
    const len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len
    const p0 = { x: A.x + ux * rA, y: A.y + uy * rA }, p2 = { x: B.x - ux * rB, y: B.y - uy * rB }
    return { d: `M${p0.x} ${p0.y} L${p2.x} ${p2.y}`, bend: null }
  }
  let bend
  if (adx > ady) bend = { x: A.x + sx * ady, y: B.y }
  else bend = { x: B.x, y: A.y + sy * adx }
  const l1 = Math.hypot(bend.x - A.x, bend.y - A.y) || 1
  const u1 = { x: (bend.x - A.x) / l1, y: (bend.y - A.y) / l1 }
  const l2 = Math.hypot(B.x - bend.x, B.y - bend.y) || 1
  const u2 = { x: (B.x - bend.x) / l2, y: (B.y - bend.y) / l2 }
  const p0 = { x: A.x + u1.x * rA, y: A.y + u1.y * rA }
  const p2 = { x: B.x - u2.x * rB, y: B.y - u2.y * rB }
  const rr = Math.max(0, Math.min(bendR, l1 * 0.5 - rA * 0.5, l2 * 0.5 - rB * 0.5))
  const c1 = { x: bend.x - u1.x * rr, y: bend.y - u1.y * rr }
  const c2 = { x: bend.x + u2.x * rr, y: bend.y + u2.y * rr }
  return { d: `M${p0.x} ${p0.y} L${c1.x} ${c1.y} Q${bend.x} ${bend.y} ${c2.x} ${c2.y} L${p2.x} ${p2.y}`, bend }
}

const initialsOf = (name) => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('')

const ConnectionsMap = ({ business }) => {
  const [c1, c2] = business.connections || []
  const person = (business.people || []).find((p) => !(p.titles || []).length)
  const office = (business.addresses?.[0]?.fullAddress || '').split(',')[0]
  const nodes = [
    { id: 'self', kind: 'business', x: 80, y: 150, r: 24, name: business.name, sub: `${business.formation.entityType} · ${business.formation.state}` },
    person ? { id: 'person', kind: 'person', x: 80, y: 44, r: 20, name: person.name, sub: 'On record · no title' } : null,
    { id: 'addr', kind: 'address', x: 252, y: 150, r: 20, name: office, sub: 'Shared office address' },
    c1 ? { id: 'c1', kind: 'business', x: 332, y: 64, r: 20, name: c1.name, sub: `${Math.round(c1.confidence * 100)}% match · ${c1.sharedAddresses.length} shared address${c1.sharedAddresses.length > 1 ? 'es' : ''}` } : null,
    c2 ? { id: 'c2', kind: 'business', x: 332, y: 236, r: 20, name: c2.name, sub: `${Math.round(c2.confidence * 100)}% match · ${c2.sharedAddresses.length} shared address${c2.sharedAddresses.length > 1 ? 'es' : ''}` } : null,
  ].filter(Boolean)
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const edges = [
    person ? { a: 'self', b: 'person', color: KIND_COLOR.person, w: 2.5 } : null,
    { a: 'self', b: 'addr', color: KIND_COLOR.address, w: 2.5 },
    c1 ? { a: 'addr', b: 'c1', color: KIND_COLOR.address, w: 1.75 } : null,
    c2 ? { a: 'addr', b: 'c2', color: KIND_COLOR.address, w: 1.75 } : null,
  ].filter((e) => e && byId[e.a] && byId[e.b])
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
    <div style={{ marginTop: 10, border: '1px solid var(--core-color-border-default)', borderRadius: 12, overflow: 'hidden', background: 'var(--core-color-surface-card)' }}>
      <svg viewBox='0 0 440 312' preserveAspectRatio='xMidYMid meet' role='img' aria-label={`Relationship network for ${business.name}`} style={{ display: 'block', width: '100%', height: 'auto' }}>
        <defs>
          <pattern id='chatcross' width='60' height='60' patternUnits='userSpaceOnUse'>
            <path d='M30 26 V34 M26 30 H34' stroke='var(--core-color-text-secondary)' strokeWidth='1' opacity='.09' />
          </pattern>
        </defs>
        <rect x='0' y='0' width='440' height='312' fill='url(#chatcross)' />
        {edges.map((e, i) => {
          const A = byId[e.a], B = byId[e.b]
          const g = octPath(A, B, A.r + 3, B.r + 3)
          return <path key={i} d={g.d} fill='none' stroke={e.color} strokeWidth={e.w} strokeLinecap='round' strokeLinejoin='round' opacity='.8' />
        })}
        {nodes.map((n) => {
          const focus = n.id === 'self'
          const nm = n.name.length > 24 ? n.name.slice(0, 22) + '…' : n.name
          const cw = Math.min(210, Math.max(70, Math.max(nm.length, n.sub.length) * 7 + 24))
          return (
            <g key={n.id} transform={`translate(${n.x},${n.y})`}>
              {focus ? <rect x={-(n.r + 6)} y={-(n.r + 6)} width={(n.r + 6) * 2} height={(n.r + 6) * 2} rx='11' fill='none' stroke='var(--core-color-border-bold)' strokeWidth='1.5' opacity='.35' /> : null}
              {n.kind === 'person'
                ? <circle r={n.r} fill={KIND_COLOR.person} />
                : <rect x={-n.r} y={-n.r} width={n.r * 2} height={n.r * 2} rx={focus ? 9 : 7} fill={KIND_COLOR[n.kind]} />}
              <text y={focus ? 6 : 5.5} textAnchor='middle' fontSize={focus ? 16 : 14} fontFamily='var(--app-font)' fontWeight='600' fill='var(--core-color-text-inverse)'>{initialsOf(n.name)}</text>
              <g transform={`translate(0,${n.r + 9})`}>
                <rect x={-cw / 2} y='0' width={cw} height='36' rx='5' fill='var(--core-color-surface-card)' stroke='var(--core-color-border-default)' />
                <text x='0' y='15' textAnchor='middle' fontSize='13.5' fontFamily='var(--app-font)' fontWeight='600' letterSpacing='-0.01em' fill='var(--core-color-text-primary)'>{nm}</text>
                <text x='0' y='29' textAnchor='middle' fontSize='10.5' fontFamily='var(--app-font)' fill='var(--core-color-text-muted)'>{n.sub.length > 30 ? n.sub.slice(0, 29) + '…' : n.sub}</text>
              </g>
            </g>
          )
        })}
      </svg>
      <div style={{ display: 'flex', gap: 14, padding: '8px 12px', borderTop: '1px solid var(--core-color-border-divider)' }}>
        {legendKey('business', 'rect', 'Business')}
        {legendKey('person', 'circle', 'Person')}
        {legendKey('address', 'rect', 'Address')}
      </div>
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
              {m.graph ? <ConnectionsMap business={business} /> : null}
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
