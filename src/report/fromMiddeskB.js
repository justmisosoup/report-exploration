// Report B: frozen copy of the in-progress report data mapping, paired with
// indexB.jsx while Report A moves on.
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

  // The summary previews each insight section below it. It is a parts list:
  // strings render as text, { chip } markers render as inline chips that
  // scroll to that section. Each clause states the section's finding, with
  // its chip closing the clause like a citation.
  const summary = [
    'Kairos Physio is a concierge physical therapy and personal training practice at 801 Madison Avenue in Manhattan, ' +
      'delivered one-on-one by a Doctor of Physical Therapy. Patients rate it strongly, with reviews naming the treating doctor',
    { chip: 'reputation' },
    '. The website is active and professionally built, though nearly all of its traffic originates in Vietnam',
    { chip: 'web' },
    '. The practice classifies into a regulated healthcare category that payment processors treat as high risk',
    { chip: 'industry' },
    ', and its business phone is a VOIP line, a mild contact-quality flag',
    { chip: 'fraud' },
    '. The submitted name does not match state filings',
    { chip: 'verification' },
    ', and two businesses share the office address',
    { chip: 'connections' },
    '.',
  ]

  // Each summary insight renders as a line with its supporting cards beneath
  // it; card keys map to the card registry in the Report page.
  const identityBlurb =
    `The submitted name did not match state filings, which list the entity as ${registrationName}. ` +
    `The address is verified and deliverable; no TIN was submitted for IRS matching.`

  const visits = record.traffic.monthlyVisits
  const [, prevVisits] = record.traffic.history[record.traffic.history.length - 2]
  const visitsDeltaPct = Math.round(Math.abs((visits - prevVisits) / prevVisits) * 100)

  // The reputation block leads, directly below the summary text; after it the
  // sections run highest risk first, positives last. Each headerKey maps to a
  // section header (bold title + status chip) in the Report page.
  const sections = [
    {
      headerKey: 'reputation',
      insight:
        'The business has a strong online reputation for the type of business it is, holding a ' +
        `${googleProfile.rating.toFixed(1)} Google rating across ${googleProfile.ratingCount} reviews ` +
        'with consistent positive patient feedback naming the treating doctor. The LinkedIn presence is thin, with ' +
        `${linkedinProfile.followers} followers, a listed size of ${linkedinProfile.companySize}, and no recent posts, ` +
        'suggesting the practice may operate as a sole proprietorship.',
      cards: ['reputation'],
    },
    {
      headerKey: 'industry',
      // The classification summary is the regulatory-risk bullet, with the
      // MCC and NAICS code cards beneath it (same shape as the social profile
      // cards under the reputation section).
      insight:
        'Kairos classifies as outpatient physical therapy, a regulated healthcare category that payment processors ' +
        'treat as high risk and that carries state licensure and healthcare compliance obligations. Watchlist ' +
        'screening is clean and the New York filing is active.',
      cards: ['industry'],
    },
    {
      headerKey: 'fraud',
      // Combined narrative: what the check screens for plus the one finding,
      // with the score and phone cards beneath it.
      insight:
        'Signals the business may process payments for undisclosed third parties or misrepresent what it sells. ' +
        'The business phone is a VOIP line, which is common for small practices using cloud telephony but is a mild contact-quality flag.',
      cards: ['fraud'],
    },
    {
      headerKey: 'web',
      insights: [
        // Combined narrative: what the site is plus the traffic picture, as
        // the summary above the visits/platform/domain cards.
        {
          text:
            'The website is active, professionally built, and describes a specific concierge physical therapy practice ' +
            'at 801 Madison Avenue, New York, NY 10065. ' +
            `A ${record.website.platform} site on a domain registered in ${record.website.domainCreated.slice(0, 4)}, ` +
            `drawing about ${visits.toLocaleString()} monthly visits. Traffic dipped ${visitsDeltaPct}% from the prior ` +
            'month, in the range expected for a single-location clinic.',
        },
      ],
      // Platform and domain age on the top row; monthly visits and the
      // suspicious domain-traffic origin below.
      cards: ['webPlatform', 'webDomain', 'webVisits', 'webTraffic'],
    },
    {
      headerKey: 'verification',
      insight: identityBlurb,
      cards: ['verification'],
    },
    {
      headerKey: 'connections',
      // Combined narrative: the corroboration bullet plus the connections-found
      // summary that used to live inside the card.
      insight:
        'Multiple third-party directory and point-of-interest records independently confirm the same address, phone number, and website, corroborating operational presence. ' +
        `${record.connections.length} connected businesses share the office address: ${connectionNames.join(' and ')}. ` +
        `With moderate tenant frequency and an unverified name, the record carries ${record.risk.level} risk.`,
      cards: ['connRisk', 'connections'],
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
    summary,
    sections,
    // Decision verdict shown beneath the summary: approve or reject, with the
    // signals that drive it.
    recommendation: {
      verdict: 'Approve',
      // The rationale weighs each flagged signal against the policy: the
      // industry classification is regulated healthcare rather than prohibited
      // activity, the VOIP line fits the sole-proprietor read, the connections
      // rest on shared addresses alone, and the filing name is a similar
      // match rather than a conflicting identity.
      detail:
        'Identity and operations are corroborated across independent sources with no disqualifying fraud signals. ' +
        'The high-risk industry classification reflects regulated healthcare rather than prohibited activity, so it ' +
        'does not weigh against the policy, though it is worth considering. The VOIP line is consistent with a likely ' +
        'sole-proprietor practice using cloud telephony rather than a fraud indicator, and the connection findings are ' +
        `thin, resting on shared addresses alone. The submitted name is a similar match to the state filing (${record.name} ` +
        `against ${registrationName}), not a conflicting identity. Monitor the offshore traffic concentration.`,
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
