// Report C: replica of the Report B data mapping, paired with indexC.jsx as
// the new iteration branch while Report B stays put for comparison.
// Maps a real Middesk API business record (see business.json, pulled from the
// Middesk API for KAIROS PHYSIO PLLC) into the Report page's data shape.
// Mirrors the app's Report tab derivations: BV checks from review tasks, risk
// signals from the warning/failure tasks, ranked failures first. Web presence
// values come from the record's website/traffic payloads (SimilarWeb traffic,
// crawl results, profile discovery), connections from the business
// connections endpoint.
const task = (record, key) => record.reviewTasks.find((t) => t.key === key)

const fmtLongDate = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

// Precise age since an ISO date, e.g. "5y 4m".
const ageYM = (iso) => {
  const from = new Date(iso + 'T00:00:00')
  const now = new Date()
  let months = (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth())
  if (now.getDate() < from.getDate()) months -= 1
  return `${Math.floor(months / 12)}y ${months % 12}m`
}

export function reportDataFromBusiness(record, nav = {}) {
  const registrationName = record.names.find((n) => n.type === 'registration')?.name
  const connectionNames = record.connections.map((c) => c.name)
  const googleProfile = record.profiles.find((p) => p.type === 'Google')
  const linkedinProfile = record.profiles.find((p) => p.type === 'LinkedIn')

  // The summary opens with a plain description of what the business is, then
  // previews the insight sections in two labeled groups: verification and
  // risk findings first, online presence second. Group parts are a parts
  // list: strings render as text, { chip } markers render as inline chips
  // that scroll to that section. Each clause states the section's finding,
  // with its chip closing the clause like a citation.
  const summaryDescription =
    'KAIROS PHYSIO PLLC is a concierge physical therapy and personal training practice in Manhattan, ' +
    'delivered one-on-one by a Doctor of Physical Therapy.'

  // Distilled from the section narratives below, same tiered language: what
  // passed, what the risk actually is, which connection matters, and the one
  // open question online.
  const likelyConns = record.connections.filter((c) => c.confidence >= 0.9 && c.sharedAddresses.length > 1)
  const nearbyConns = record.connections.filter((c) => !likelyConns.includes(c))
  const topCountry = record.traffic.topCountries[0]
  const summaryGroups = [
    {
      key: 'verification',
      title: 'Verification',
      parts: [
        'The core identity checks pass: the office address is verified, the New York filing is active, and ' +
          'watchlist screening is clean. Two items keep verification open: the submitted name ' +
          `${record.name} does not match the registered ${registrationName}, most likely a shortened trade name, ` +
          'and no TIN was provided, so the IRS match never ran.',
      ],
    },
    {
      key: 'risk',
      title: 'Risk context',
      parts: [
        'The flags on the file are context rather than conduct. Outpatient healthcare is rated high risk as a ' +
          `category. ${likelyConns.map((c) => c.name).join(' and ')}, filed at the same address with a similar name, ` +
          `is almost certainly the same operation, while ${nearbyConns.map((c) => c.name).join(' and ')} is simply ` +
          'another tenant in the building. The VOIP business phone is a minor contact-quality note.',
      ],
    },
    {
      key: 'online',
      title: 'Online presence',
      parts: [
        `Online, the practice holds up: a ${googleProfile.rating.toFixed(1)} Google rating across ` +
          `${googleProfile.ratingCount} reviews that name the treating doctor, and a website describing exactly ` +
          `this business. The one anomaly is web traffic, ${Math.round(topCountry.share * 100)}% of which ` +
          `originates in ${topCountry.name}, so the site's traffic is not evidence of local demand.`,
      ],
    },
  ]

  // Each summary insight renders as a line with its supporting cards beneath
  // it; card keys map to the card registry in the Report page.
  const identityBlurb =
    'The office address is verified as deliverable and commercial. The name is not verified: the business was ' +
    `submitted as ${record.name}, but New York lists ${registrationName}. This reads as a shortened trade name; ` +
    'a DBA filing or an updated state record would close it. No TIN was submitted, so the IRS match did not run; ' +
    'the EIN should be requested before approval.'

  const visits = record.traffic.monthlyVisits
  const [, prevVisits] = record.traffic.history[record.traffic.history.length - 2]
  const visitsDeltaPct = Math.round(Math.abs((visits - prevVisits) / prevVisits) * 100)

  // Sections mirror the summary's group order: the verification & risk
  // findings first (verification, industry, connections, fraud), online
  // presence after (reputation, web). Each headerKey maps to a section
  // header (bold title + status chip) in the Report page.
  const sections = [
    {
      headerKey: 'verification',
      insight: identityBlurb,
      cards: ['verification'],
    },
    {
      headerKey: 'industry',
      // The classification summary is the regulatory-risk bullet, with the
      // MCC and NAICS code cards beneath it (same shape as the social profile
      // cards under the reputation section).
      insight:
        'The business classifies as outpatient physical therapy, a regulated healthcare category that payment ' +
        'processors treat as high risk and that requires state licensure. The rating reflects the category, not ' +
        'conduct: watchlist screening is clean and the New York filing is active.',
      cards: ['industry'],
    },
    {
      headerKey: 'connections',
      // Combined narrative: the corroboration bullet plus a tiered read of the
      // connections. Only the corroborated match (high confidence, more than
      // the one shared suite) is asserted as the same company; the rest read
      // as nearby businesses.
      insight:
        `${['No', 'One', 'Two', 'Three', 'Four'][record.connections.length] || record.connections.length} other ` +
        `business${record.connections.length === 1 ? ' is' : 'es are'} filed at the same office address, and they do not carry equal weight. ` +
        record.connections
          .map((c) => {
            const pct = Math.round(c.confidence * 100)
            const n = ['no', 'one', 'two', 'three', 'four'][c.sharedAddresses.length] || c.sharedAddresses.length
            return c.confidence >= 0.9 && c.sharedAddresses.length > 1
              ? `${c.name} is likely the same company: it shares ${n} filing addresses and a similar name (${pct}% match)`
              : `${c.name} (${pct}% match) shares only the office suite, common in Manhattan buildings, so it reads as a neighbor rather than a related party`
          })
          .join('. ') +
        '. Independent directory records confirm this address, phone, and website, so the practice does operate here; ' +
        `the ${record.risk.level} rating reflects the shared building and the unverified name.`,
      cards: ['connRisk', 'connections'],
    },
    {
      headerKey: 'fraud',
      // Combined narrative: what the check screens for plus the one finding,
      // with the score and phone cards beneath it.
      insight:
        'The screen covers transaction laundering: signs a business processes payments for someone else or ' +
        'misrepresents what it sells. One flag turned up: the business phone is a VOIP line rather than a fixed ' +
        'line, which is common for small practices on cloud telephony. It reads as a contact-quality issue, not ' +
        'evidence of fraud.',
      cards: ['fraud'],
    },
    {
      headerKey: 'reputation',
      insight:
        `Patient feedback supports a real practice: a ${googleProfile.rating.toFixed(1)} Google rating across ` +
        `${googleProfile.ratingCount} reviews, with reviewers repeatedly naming the treating doctor. The LinkedIn ` +
        `page is thin (${linkedinProfile.followers} followers, listed size ${linkedinProfile.companySize}, no recent ` +
        'posts), but that fits a one-person practice and is not a flag on its own.',
      cards: ['reputation'],
    },
    {
      headerKey: 'web',
      insights: [
        // Combined narrative: what the site is plus the traffic picture, as
        // the summary above the visits/platform/domain cards.
        {
          text:
            `The website supports the identity claim: an active, professionally built ${record.website.platform} site ` +
            'describing this exact practice at 801 Madison Avenue, on a domain registered in ' +
            `${record.website.domainCreated.slice(0, 4)}, before the entity formed, consistent with a practice that renamed. ` +
            `The open item is the traffic: ${Math.round(record.traffic.topCountries[0].share * 100)}% of its ` +
            `roughly ${visits.toLocaleString()} monthly visits originate in ${record.traffic.topCountries[0].name} rather ` +
            'than New York, so the traffic says nothing about local demand. The ' +
            `${visitsDeltaPct}% dip from the prior month is normal for a single-location clinic.`,
        },
      ],
      // Platform and domain age on the top row; monthly visits and the
      // suspicious domain-traffic origin below.
      cards: ['webPlatform', 'webDomain', 'webVisits', 'webTraffic'],
    },
  ]

  const verificationChecks = [
    { label: 'Name', status: task(record, 'name')?.status ?? 'unknown', value: record.name },
    { label: 'Address', status: task(record, 'address_verification')?.status ?? 'unknown', value: record.addresses[0].fullAddress },
  ]

  // Risk signals: the record's warning/failure review tasks, failures first.
  const SEVERITY = { failure: 0, warning: 1 }
  const signals = record.reviewTasks
    .filter((t) => t.status === 'failure' || t.status === 'warning')
    .sort((a, b) => SEVERITY[a.status] - SEVERITY[b.status])
    .slice(0, 5)
    .map((t) => [t.label, t.subLabel])

  return {
    summaryDescription,
    summaryGroups,
    sections,
    // Policy verdict shown above the report: a bold one-sentence read of the
    // business with a muted supporting line, and the verdict seeding the
    // decision control in the card's footer.
    recommendation: {
      verdict: 'Approve',
      detail: 'A legitimate, actively operating boutique physical therapy practice.',
      support:
        'Identity and operations are corroborated across independent sources with no disqualifying fraud signals.',
    },
    verificationChecks,
    identityTitle: 'Name unverified against state filings',
    identityBlurb,
    web: {
      status: { label: 'Moderate', tag: 'inactive' },
      // The narrative lives in the section insight; the cards carry visits,
      // platform, and domain age. Monthly-visits series renders as the visits
      // card's trend graph; one point per month, most recent last, straight
      // from the record's traffic history.
      visits: {
        current: visits,
        series: record.traffic.history,
        delta: { pct: visitsDeltaPct, up: visits >= prevVisits },
      },
      domainAge: `${ageYM(record.website.domainCreated)} old`,
      domainRegistered: `Registered ${fmtLongDate(record.website.domainCreated)}`,
      quality: 'Suspicious',
      qualityDetail:
        `${Math.round(record.traffic.topCountries[0].share * 100)}% of traffic originates in ` +
        `${record.traffic.topCountries[0].name}, but the business claims to operate from New York City`,
      // Top two traffic origins for the Domain traffic card, with each
      // country's slice of the monthly visits.
      trafficTop: record.traffic.topCountries.slice(0, 2).map((c) => ({
        name: c.name,
        sharePct: Math.round(c.share * 100),
        visits: Math.round(c.share * visits),
      })),
      platform: record.website.platform,
      platformDetail: record.website.technologies.ecommerce.join(', '),
    },
    risk: {
      level: record.risk.level,
      score: record.risk.score,
      title:
        `${record.connections.length} connected businesses share the office address: ${connectionNames.join(' and ')}. ` +
        `With moderate tenant frequency and an unverified name, the record carries ${record.risk.level} risk.`,
      signals,
    },
    compliance: {
      status: { label: 'High risk', tag: 'warning' },
      title: 'High-risk industry classification',
      blurb:
        'Kairos classifies as outpatient physical therapy, a regulated healthcare category that payment ' +
        'processors treat as high risk. Watchlist screening is clean and the New York filing is active.',
      // Confident classifications only (MCC + primary NAICS).
      codes: record.industry.filter((i) => i.confidence === 100).map((i) => ({
        label: `${i.system} ${i.code}`,
        category: i.category,
      })),
    },
    // Transaction laundering & fraud signals. The phone/domain risk scores
    // come from phone-intelligence enrichment, not the record payload, so the
    // values are authored here.
    fraud: {
      status: { label: 'Moderate', tag: 'inactive' },
      level: 'moderate',
      score: 53,
      // The narrative lives in the section insight; the cards carry the score
      // and the one detected finding. The clean checks (domain risk score,
      // WooCommerce storefront, web tracker) live on the detail view.
      phone: {
        label: 'Risky phone number',
        finding: 'Detected',
        type: 'VOIP',
        score: 65,
      },
      otherChecks: ['Domain risk', 'WooCommerce storefront'],
    },
    reputation: {
      profiles: record.profiles.map((p) => ({
        name: p.type,
        url: p.url,
        status: p.status,
        detail: p.type === 'Google' ? `${p.rating.toFixed(1)} rating · ${p.ratingCount} reviews` : `${p.followers} followers · ${p.companySize}`,
        activity: p.lastActivity,
      })),
    },
    // The business connections behind the record's "Connections · Found" flag,
    // from the Middesk business connections endpoint: both entities link to
    // this record through shared filing addresses.
    connections: record.connections.map((c) => ({
      name: c.name,
      relationship: 'Shared address',
      strength: c.confidence >= 0.9 ? 'close' : 'possible',
      status: 'Unknown',
      detail: c.sharedAddresses.join('; '),
      how:
        `Shares ${c.sharedAddresses.length === 1 ? 'a filing address' : `${c.sharedAddresses.length} filing addresses`} with this ` +
        `record (${c.sharedAddresses.join('; ')}), matched at ${Math.round(c.confidence * 100)}% confidence.`,
    })),
    ...nav,
  }
}

// Web Presence tab dataset, built from the record's website/traffic payloads
// (SimilarWeb traffic, crawl technology results, profile discovery, industry
// classification) so the tab reflects the pulled record's actual numbers.
export function webPresenceDataFromBusiness(record) {
  const domainYear = Number(record.website.domainCreated.slice(0, 4))
  const t = record.traffic
  const [, prevVisits] = t.history[t.history.length - 2]
  const deltaPct = Math.round(Math.abs((t.monthlyVisits - prevVisits) / prevVisits) * 100)
  const google = record.profiles.find((p) => p.type === 'Google')

  return {
    updatedAt: 'Aug 11, 2026',
    website: {
      url: record.website.url,
      statusLabel: record.website.status === 'online' ? 'Online' : 'Offline',
      statusIntent: record.website.status === 'online' ? 'success' : 'warning',
      domainAge: `Since ${domainYear} · ${ageYM(record.website.domainCreated)}`,
      platform: record.website.platform,
      description: record.website.description,
      industry: google?.categories?.[0] || 'Health services',
    },
    visits: {
      tiles: [
        { label: 'Monthly visits', value: `${(t.monthlyVisits / 1000).toFixed(1)}K`, delta: { pct: deltaPct, up: t.monthlyVisits >= prevVisits } },
        { label: 'Bounce rate', value: `${Math.round(t.bounceRate * 100)}%` },
        { label: 'Avg. duration', value: `${t.avgVisitDurationSeconds}s` },
        { label: 'Pages / visit', value: t.pagesPerVisit.toFixed(1) },
      ],
      history: t.history.map(([month, value]) => ({ label: `${month.toUpperCase()} '26`, value })),
      monthlyVisits: t.monthlyVisits,
    },
    // Channel shares straight from the traffic payload. SimilarWeb reports no
    // source breakdown for this low-traffic domain, so shares are zero.
    sources: t.sources,
    countries: t.topCountries,
    keywords: t.topKeywords,
    technology: [
      { label: 'E-commerce', value: record.website.technologies.ecommerce.join(', ') },
      { label: 'Payments', value: 'None detected' },
      { label: 'Anti-fraud', value: 'None detected' },
      { label: 'Trust signals', value: 'None detected' },
    ],
    // The crawl found no storefront on this site; the card renders a no-hit
    // banner when this is null.
    storefront: null,
    riskyKeywords: { hits: [], message: 'No risky keywords hits found' },
    profiles: {
      postsSummary:
        'The LinkedIn page has no recent posts, so activity shows up mainly through the Google Business profile, where new patient reviews continue to land.',
      reviewsSummary:
        'All 10 Google reviews are 5 stars. Patients cite one-on-one sessions with Dr. Josh Gee, clear explanations, and individualized programs, with several noting recoveries from knee and orthopedic injuries.',
      rows: record.profiles.map((p) => ({
        name: p.name,
        type: p.type,
        url: p.url,
        submitted: p.submitted,
        statusIntent: p.status === 'online' ? 'success' : 'warning',
        statusLabel: p.status === 'online' ? 'Online' : 'Offline',
        rating: p.rating ?? null,
        ratingCount: p.ratingCount,
        details: p.followers != null ? `${p.followers} followers | ${p.companySize}` : p.categories?.join(', '),
        activity: p.lastActivity,
      })),
    },
    industry: record.industry,
  }
}
