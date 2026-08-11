// Middesk — the two questions that matter, translated into evaluated Questions.
// Each question carries an evaluated answer (Insight): { t: question, a: answer,
// tone, attrs: [relevant Data Attributes], insight, ev: [sources] }.
// tone ∈ clear|low|watch|elev|high|data|na. Questions with asOf + history are
// re-evaluated over time and drive the time-machine risk profile.
// Evaluations describe one business — Vela Logistics, Inc.
//
// The entity itself checks out (Section 1, all clear); the risk lives in the
// network it doesn't disclose on its own (Section 2).

export const POLICY = [
  { id:'operating', name:'Is the business operating as claimed?',
    real:'Does a real, active entity exist behind this application, and does every claimed attribute check out against an authoritative source?',
    summary:'Every claimed attribute checks out against an authoritative source. The entity is registered and active in California, foreign-registered in Texas, its TIN matches the IRS, both named officers are confirmed, and no sanctions or watchlist hits surface. The one nuance: the principal address is a real commercial building shared by other tenants, so it carries little relational weight on its own.',
    attr:'Entity record', relAttrs:[{k:'Legal name',v:'Vela Logistics, Inc.'},{k:'SoS status',v:'Active · good standing'},{k:'TIN',v:'38-2049571'}], q:[
    {t:'Is the legal entity actually registered, and does the name match Secretary of State filings?', a:'Exact match', tone:'clear',
      attrs:[{k:'Submitted name',v:'Vela Logistics, Inc.'},{k:'CA SoS (domestic)',v:'Exact match'},{k:'TX SoS (foreign)',v:'Exact match'},{k:'DBA / FBN',v:'None on file'}],
      insight:'Submitted name matches the California domestic filing and the Texas foreign registration verbatim. No DBA/FBN in use.', ev:['CA SoS','TX SoS']},
    {t:'Is it the entity type it claims to be (LLC, corp, sole prop)?', a:'C-Corporation', tone:'data',
      attrs:[{k:'Submitted entity_type',v:'C-Corporation'},{k:'CA SoS entity type',v:'C-Corporation'}],
      insight:'Submitted entity_type matches the domestic Secretary of State record.', ev:['CA SoS']},
    {t:'Is it actually operating, not dormant, suspended, or dissolved?', a:'Active · good standing', tone:'clear',
      attrs:[{k:'CA SoS status',v:'Active'},{k:'Sub-status',v:'Good standing'},{k:'TX SoS status',v:'Active'}],
      insight:'Domestic status is Active with a Good Standing sub-status; the Texas foreign registration is also active.', ev:['CA SoS','TX SoS'], asOf:'04.21.26', history:[
        {date:'03.12.19', a:'Active', tone:'clear', insight:'Registered and active from formation; no suspension or delinquency on record.'},
      ]},
    {t:'Does the tax ID match IRS records?', a:'Match', tone:'clear',
      attrs:[{k:'Submitted tin',v:'38-2049571'},{k:'IRS name match',v:'Match'}],
      insight:'Submitted tin matches the name returned from the IRS.', ev:['IRS']},
    {t:'Is the address a real, deliverable place of business, or a virtual office, mail drop, or shared address?', a:'Commercial · shared', tone:'clear',
      attrs:[{k:'Principal address',v:'4400 Wilshire Blvd, LA'},{k:'Address type',v:'Commercial · multi-tenant'},{k:'Deliverable',v:'Yes'},{k:'Virtual / CMRA',v:'No'}],
      insight:'A real, deliverable commercial address, but a multi-tenant building shared by several unrelated entities, so it carries little relational weight on its own.', ev:['USPS','Maps'], asOf:'10.04.24', history:[
        {date:'03.12.19', a:'Commercial · dedicated', tone:'clear', insight:'1100 Alameda St, a single-tenant warehouse occupied only by Vela.'},
      ]},
    {t:'Are the named people real, senior, and genuinely associated with the entity?', a:'Confirmed · 2 of 2', tone:'clear',
      attrs:[{k:'Submitted people',v:'2'},{k:'Matched to source',v:'2 of 2'},{k:'Source',v:'SoS officers · web'}],
      insight:'Both named people match authoritative sources as senior officers of the entity.', ev:['CA SoS','Web']},
    {t:'Is the business or any principal on a sanctions or watchlist?', a:'No hits', tone:'clear',
      attrs:[{k:'Entities screened',v:'3'},{k:'People screened',v:'2'},{k:'Watchlist result',v:'No hits'}],
      insight:'No submitted name or people entry returns a watchlist hit.', ev:['Sanctions']},
    {t:'Does the stated industry match the actual one?', a:'Match', tone:'clear',
      attrs:[{k:'Submitted industry',v:'Trucking & logistics'},{k:'NAICS',v:'484110'},{k:'High-risk category',v:'No'}],
      insight:'Stated industry matches the NAICS classification and web presence; not on the deny list.', ev:['NAICS','Web']},
  ]},
  { id:'network', name:'Is it connected to other risky businesses?',
    real:"Does the network behind this entity carry risk it isn't disclosing on its own, and is the structure built to reveal those ties or bury them?",
    summary:'The entity itself checks out, but its network does not. An Apr 2026 restructure placed 60% control with Meridian Holdings, never disclosed on the application, pulling Vela into a three-entity ownership cluster. One connected business three hops out is dissolved and carries a watchlist hit, and a shared private secured party (UCC) links the entities financially. Risk travels into Vela through the ownership edge.',
    attr:'Network & ownership', relAttrs:[{k:'Disclosed owners',v:'Nguyen 15%'},{k:'Implied control',v:'Meridian 60%'},{k:'Connected entities',v:'3'}], q:[
    {t:'Beneficial ownership breakdown', a:'Incomplete · undisclosed control', tone:'high',
      attrs:[{k:'Disclosed owners',v:'Nguyen 15%'},{k:'Implied control',v:'Meridian Holdings 60%'},{k:'Structure',v:'Complex · 3 hops'},{k:'Basis',v:'Secretary of State filing',s:['California Secretary of State','Texas Secretary of State']}],
      insight:'An Apr 2026 Meridian restructure placed 60% control with Meridian Holdings LLC, implied by Secretary of State filings but never disclosed on the application. Ownership is now a complex, 3-hop structure.', ev:['CA SoS','Network'], asOf:'04.21.26',
      viz:{type:'ubo', applicant:'Sarah Nguyen, 15%', owners:[
        {name:'Meridian Holdings LLC', pct:60, kind:'entity', status:'undisclosed', note:'Controlling owner, surfaced via the Apr 2026 SoS restructure, never on the application'},
        {name:'Sarah Nguyen', pct:15, kind:'individual', status:'disclosed', note:'CFO, declared on the application'},
      ], gap:{pct:25, label:'Unaccounted', note:'No owner named for the remaining stake. Possible 25%+ owner off the application'}},
      history:[
        {date:'03.12.19', a:'Complete', tone:'clear', insight:'Sole owner Marcus Okonkwo, a natural person holding 100%, fully disclosed.',
          viz:{type:'ubo', applicant:'Marcus Okonkwo, 100%', owners:[{name:'Marcus Okonkwo', pct:100, kind:'individual', status:'disclosed', note:'Sole owner, natural person, declared on the application'}]}},
        {date:'02.18.23', a:'Complete', tone:'clear', insight:'CFO Sarah Nguyen added at 15%; both beneficial owners disclosed and individuals.',
          viz:{type:'ubo', applicant:'Okonkwo 85% · Nguyen 15%', owners:[{name:'Marcus Okonkwo', pct:85, kind:'individual', status:'disclosed', note:'Founder, natural person'},{name:'Sarah Nguyen', pct:15, kind:'individual', status:'disclosed', note:'CFO, added Feb 2023, declared'}]}},
      ]},
    {t:'What other businesses do those owners control or sit behind?', a:'3 connected', tone:'data',
      attrs:[{k:'Entities via shared owner',v:'3'},{k:'Strongest link',v:'Shared UBO'},{k:'Controller',v:'Meridian Holdings'}],
      insight:'Meridian controls Anchor Drayage outright and holds a controlling stake in Vela. Three entities resolve into one ownership cluster.', ev:['CA SoS','Network']},
    {t:'Entity network risk', a:'1 elevated · 1 watch', tone:'watch',
      attrs:[{k:'Elevated',v:'1'},{k:'Watch',v:'1'},{k:'Clear',v:'1'},{k:'Signal types',v:'Fraud · SoS status'}],
      insight:'One connected entity three hops out carries elevated fraud/adverse risk; a second sits on watch. Risk travels through the ownership edge into Vela.', ev:['Network'], asOf:'04.21.26', history:[
        {date:'03.12.19', a:'None connected', tone:'clear', insight:'No controlling network at onboarding, just a single natural-person owner.'},
      ]},
    {t:'Adverse statuses and flags', a:'1 material flag', tone:'high',
      attrs:[{k:'Material flags',v:'1 (watchlist)',s:'Sanctions screening'},{k:'Neutral lifecycle',v:'1 (dissolved)',s:'State records'},{k:'Application jurisdiction',v:'California',s:'Application'},{k:'Hops to flag',v:'3',s:'Middesk network'}],
      insight:'One connected entity three hops out carries an OFAC-adjacent watchlist hit against a beneficial owner, the material flag. The same entity is dissolved in Delaware, which reads as a routine closure and is not treated as adverse on its own; no connected entity is suspended or revoked in California, the jurisdiction this application was made in.', ev:['SoS status','Sanctions','Network'], asOf:'04.21.26',
      viz:{type:'statusflags', jurisdiction:'California', rows:[
        {name:'Meridian Holdings LLC', rel:'Controlling owner · 60%', state:'Active', reg:'DE · CA foreign', severity:'none', flags:[]},
        {name:'Anchor Drayage LLC', rel:'Sister entity · common owner', state:'Active', reg:'CA', severity:'none', flags:[]},
        {name:'Stillwater Import/Export', rel:'3 hops · via Meridian', state:'Dissolved', reg:'DE', severity:'material', flags:[
          {label:'Watchlist hit · beneficial owner', kind:'material', note:'OFAC-adjacent match, resolved as material'},
          {label:'Dissolved (DE)', kind:'neutral', note:'Routine closure, outside the application jurisdiction, not adverse on its own'}]},
      ]},
      history:[
        {date:'03.12.19', a:'No connected entities', tone:'clear', insight:'A single natural-person owner at onboarding. No connected entities to screen for adverse status.',
          viz:{type:'statusflags', jurisdiction:'California', rows:[]}},
      ]},
    {t:'Risky business structures', a:'Some signals', tone:'watch',
      attrs:[{k:'Layered ownership',v:'3 hops'},{k:'Shared address',v:'Commercial (not virtual)'},{k:'Virtual / CMRA',v:'No'}],
      insight:'Layered ownership adds hops between Vela and the risky entity, but the shared addresses are physical commercial space, a partial concealment signal rather than a clean shell pattern.', ev:['Network','Maps'], asOf:'04.21.26', history:[
        {date:'03.12.19', a:'None', tone:'clear', insight:'Flat, single-owner structure with a dedicated address. No concealment signals.'},
      ]},
    {t:'UCC filing entity relationships', a:'Shared secured party', tone:'watch',
      attrs:[{k:'Shared secured party',v:'Acme Capital Partners'},{k:'Lender type',v:'Private (stronger link)'},{k:'Liens tied',v:'2'}],
      insight:'Vela and a connected entity both list the same private secured party. A shared private lender is a stronger link than a large traditional lender would be.', ev:['UCC'], asOf:'08.22.25', history:[
        {date:'03.12.19', a:'None', tone:'clear', insight:'No secured financing statements on file, so no creditor ties.'},
      ]},
    {t:'What industries do the connected entities operate in?', a:'Mostly logistics · 1 high-risk', tone:'data',
      attrs:[{k:'Common category',v:'Freight & logistics'},{k:'High-risk flagged',v:'1 (import/export)'},{k:'Categories',v:'3'}],
      insight:'Most of the cluster shares the freight & logistics category; one connected entity carries a high-risk import/export classification.', ev:['NAICS','Network']},
  ]},
  { id:'reputation', name:'What do reputation signals reveal?',
    real:'Could any negative and material information be found about this business or its principals, and once found, is it real, and does it matter?',
    attr:'Reputation & adverse media',
    summary:"Screening surfaced four adverse-media candidates. Middesk resolved them rather than queuing them: two were automatic false positives (same-name confusion, thrown out and not shown), one clean-name article resolved to a true positive against a connected principal, and one is held for review. No tax liens or bankruptcies against Vela itself; the material signal, like the rest of Vela's risk, sits on the network side, on a controlling owner.", q:[
    {t:'What do news and media surface: regulatory actions, enforcement, or reputational flags?', a:'1 material hit', tone:'watch',
      attrs:[{k:'Candidates screened',v:'4'},{k:'Risk flags',v:'Enforcement · regulatory',s:'Adverse-media screening'},{k:'Sentiment',v:'Negative (2 flags)',s:'Adverse-media screening'},{k:'Subject',v:'Meridian principal',s:'Middesk network'}],
      insight:'One clean-name article ties a regulatory enforcement action to a principal behind the controlling owner (Meridian). Sentiment is negative with two sentiment flags; the risk flags are enforcement and regulatory. No adverse media attaches to Vela directly.', ev:['Adverse media','Network'], asOf:'04.21.26',
      viz:{type:'media', items:[
        {outlet:'Reuters', date:'02.11.26', url:'https://www.reuters.com', title:'Regulator fines logistics holding group over freight-billing practices', quote:'The order names a principal of Meridian Holdings among the controlling parties subject to the enforcement action.', match:'Meridian Holdings', matchType:'Connected owner', risks:['Enforcement','Regulatory'], sentiment:'Negative', resolution:'true_positive', score:88},
        {outlet:'Regional Business Journal', date:'11.30.25', url:'https://www.example.com', title:'Freight operator disputes state audit findings', quote:'A Meridian-linked entity is referenced as a respondent in the ongoing state review.', match:'Meridian-linked entity', matchType:'Connected owner', risks:['Regulatory'], sentiment:'Negative', resolution:'needs_review', score:64},
      ]}, history:[
        {date:'03.12.19', a:'No hits', tone:'clear', insight:'No adverse media on the entity or its sole owner at onboarding.'},
      ]},
    {t:'Is a given hit material, or a false positive or same-name confusion?', a:'2 thrown out · 1 true · 1 review', tone:'watch',
      attrs:[{k:'Match ≥31 (progressed)',v:'2 of 4',s:'Adverse-media screening'},{k:'True positive',v:'1',s:'Adverse-media resolution'},{k:'Needs review',v:'1',s:'Adverse-media resolution'},{k:'False positive',v:'2 (score ≤30)',s:'Adverse-media resolution'}],
      insight:'Two candidates scored at or below 30: automatic same-name false positives, thrown out and never shown. Of the two that progressed, resolution returned one true_positive (the enforcement article, confirmed against the matched principal) and one needs_review. This is resolution, not a queue: the noise is cut before a human sees it.', ev:['Adverse media'],
      viz:{type:'resolution', total:4, bands:[
        {label:'False positive · thrown out', count:2, band:'0–30', status:'fp', note:'Same-name confusion, never surfaced'},
        {label:'True positive · confirmed', count:1, band:'31–100', status:'tp', note:'Regulatory enforcement, matched principal'},
        {label:'Needs review', count:1, band:'31–100', status:'review', note:'Match progressed; materiality pending'},
      ]}, asOf:'02.11.26', history:[
        {date:'03.12.19', a:'No hits to resolve', tone:'clear', insight:'No adverse-media candidates at onboarding. Nothing to resolve.'},
      ]},
    {t:'What does the litigation history show, active and historical, and how serious is each case?', a:'TBD', tone:'na',
      attrs:[{k:'Coverage',v:'Not yet wired'}],
      insight:'Litigation history is planned for this view: active and historical cases with a per-case severity read.', ev:[]},
    {t:'Are there federal or state tax liens against the business or its principals?', a:'None on Vela', tone:'clear',
      attrs:[{k:'Federal liens',v:'None',s:'IRS · state records'},{k:'State liens',v:'None',s:'State records'},{k:'Principals',v:'Screened · clear',s:'Middesk network'}],
      insight:'No federal or state tax liens against Vela or its named principals.', ev:['Tax records'], asOf:'04.21.26'},
    {t:'Any bankruptcy filings, and how recent and relevant are they?', a:'None on Vela', tone:'clear',
      attrs:[{k:'Filings',v:'None',s:'PACER'},{k:'Connected entities',v:'1 historical (dissolved)',s:'Middesk network'}],
      insight:'No bankruptcy filings for Vela. A connected, now-dissolved entity has a historical filing, surfaced through the network rather than against Vela itself.', ev:['PACER','Network']},
    {t:"What's the industry baseline that says whether a signal is routine or alarming for this kind of business?", a:'TBD', tone:'na',
      attrs:[{k:'Coverage',v:'Not yet wired'}],
      insight:'Industry baselining is planned: calibrating each signal against what is routine for freight & logistics so a normal filing rate does not read as alarming.', ev:[]},
  ]},
];

// Status bucket from tone.
export function statusOf(tone){
  if(tone==='high'||tone==='elev') return 'flag';
  if(tone==='watch') return 'review';
  if(tone==='clear'||tone==='low') return 'pass';
  return 'info'; // data / na
}
