import React from 'react';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import {
  MetaChip, RiskSeverityBadge,
  ActionButton, IconActionButton,
  Menu, MenuTrigger, MenuContent, MenuItem, MenuCheckboxItem, MenuLabel, MenuSeparator,
  Avatar, SegmentedControl, SegmentedControlItem,
  Tabs, TabsList, TabsTrigger, TabsCount,
  PageHeader, PageHeaderBar, PageHeaderTitles, PageHeaderActions,
  PageHeading, PageBreadcrumb, PageBreadcrumbItem,
} from './ds.js';
import ReportPage from './report/index.jsx';
import ReportPageB from './report/indexB.jsx';
import VerificationPage from './report/verification.jsx';
import WebPresencePage from './report/webPresence.jsx';
import { reportDataFromBusiness, webPresenceDataFromBusiness } from './report/fromMiddesk.js';
import { reportDataFromBusiness as reportDataFromBusinessB } from './report/fromMiddeskB.js';
import middeskBusiness from './report/business.json';

/* Identity Intelligence — ported from the Claude Design prototype
   (design/Identity Intelligence.dc.html). The original ran as a DCLogic
   class inside the dc-runtime; this is the same component on plain
   React.Component with the template's wrapper div as render(). */
export default class App extends React.Component {
  state = { direction:'A', view:'identity', timeIdx:5, sel:null, query:'address', expandedQ:0, showPath:true, intelQ:'', intelOpen:false, ingestedDoc:null, policy:null, openSec:null, openQ:null, attnOnly:false, decisionsOpen:false, attrsOpen:false, secOpen:{}, chats:[], activeChat:null, chatSeq:0, chatInput:'', netMode:'graph', asOf:null, activeId:'vela', openTabs:[], theme:'light', envMode:'live' };

  componentDidMount(){
    let s={};
    try{ s = JSON.parse(localStorage.getItem('mid-iv')||'{}'); }catch(e){}
    try{ const ui=JSON.parse(localStorage.getItem('mid-ui')||'{}');
      this.setState({theme:ui.theme||'light', envMode:ui.envMode||'live'});
      if(ui.theme==='dark') document.body.setAttribute('data-theme','dark'); }catch(e){}
    this.setState({
      direction: s.direction || this.props.startDirection || 'C',
      view: s.view || this.props.startView || 'intelligence',
      timeIdx: (s.timeIdx ?? 5),
      query: s.query || 'address',
      showPath: this.props.showRiskPath !== false,
      activeId: (s.activeId && this.PROFILES[s.activeId]) ? s.activeId : 'vela',
      openTabs: Array.isArray(s.openTabs) ? s.openTabs.filter(id=>this.PROFILES[id]) : [],
      navDrawer: s.navDrawer ?? this.state.navDrawer,
    });
    import('./policy.js').then(m=>{ this._statusOf=m.statusOf; this.setState({policy:m.POLICY, openSec:m.POLICY.find(sec=>sec.q.some(q=>m.statusOf(q.tone)!=='pass'&&m.statusOf(q.tone)!=='info'))?.id || m.POLICY[0].id}); }).catch(e=>console.warn('policy load',e));
    this._clearHover=()=>{ if(this.state.itmHover!=null) this.setState({itmHover:null}); };
    const sc=document.getElementById('mid-scroll'); if(sc) sc.addEventListener('scroll',this._clearHover,{passive:true});
    window.addEventListener('scroll',this._clearHover,{passive:true,capture:true});
  }
  componentWillUnmount(){
    const sc=document.getElementById('mid-scroll'); if(sc&&this._clearHover) sc.removeEventListener('scroll',this._clearHover);
    if(this._clearHover) window.removeEventListener('scroll',this._clearHover,{capture:true});
  }
  setS(patch){ this.setState(patch); }
  // Persist navigation so Vite full reloads land back on the same page.
  componentDidUpdate(prevProps,prevState){
    const KEYS=['direction','view','timeIdx','query','activeId','openTabs','navDrawer'];
    if(KEYS.some(k=>prevState[k]!==this.state[k])){
      try{ const o={}; KEYS.forEach(k=>o[k]=this.state[k]);
        localStorage.setItem('mid-iv', JSON.stringify(o)); }catch(e){}
    }
  }
  openIdentity(id){
    this.setState(s=>({ openTabs: s.openTabs.includes(id)?s.openTabs:[...s.openTabs,id], activeId:id, asOf:null, secOpen:{}, openQ:null, attnOnly:false }));
    this.setS({view:'identity',direction:'C'});
  }
  closeTab(id){
    this.setState(s=>{
      const openTabs = s.openTabs.filter(x=>x!==id);
      const patch = {openTabs};
      if(s.view==='identity' && s.activeId===id){
        if(openTabs.length){ patch.activeId = openTabs[openTabs.length-1]; }
        else { patch.view = 'list'; }
      }
      return patch;
    });
  }
  setUI(patch){
    this.setState(patch, ()=>{
      try{ localStorage.setItem('mid-ui', JSON.stringify({theme:this.state.theme, envMode:this.state.envMode})); }catch(e){}
      if(this.state.theme==='dark') document.body.setAttribute('data-theme','dark');
      else document.body.removeAttribute('data-theme');
    });
  }
  get activeChatObj(){ return (this.state.chats||[]).find(c=>c.id===this.state.activeChat)||null; }
  newChat(){ this.setState({activeChat:null}); this.setS({view:'intelligence'}); }
  closeChat(id){
    this.setState(s=>{
      const chats = (s.chats||[]).filter(c=>c.id!==id);
      const patch = {chats};
      if(s.activeChat===id) patch.activeChat = chats.length ? chats[chats.length-1].id : null;
      return patch;
    });
  }

  /* ---------- palette ---------- */
  get RISK(){ return {
    clear:{c:'var(--risk-clear)',label:'Clear'}, low:{c:'var(--risk-low)',label:'Low'},
    watch:{c:'var(--risk-watch)',label:'Watch'}, elev:{c:'var(--risk-elev)',label:'Elevated'},
    high:{c:'var(--risk-high)',label:'High'}, mute:{c:'var(--core-color-text-muted)',label:'Neutral'} }; }

  /* ---------- data ---------- */
  /* ---------- per-identity profiles ---------- */
  get activeId(){ return this.state.activeId || 'vela'; }
  get profile(){ return this.PROFILES[this.activeId] || this.PROFILES.vela; }
  get nameOf(){ return this.profile.name; }
  get facts(){ return this.profile.facts; }
  get versions(){ return this.profile.versions; }
  get decisions(){ return this.profile.decisions; }
  get watch(){ return this.profile.watch; }
  get dataAttrs(){ return this.profile.dataAttrs; }
  get answers(){ return this.profile.answers || {}; }

  get PROFILES(){ return {
    vela:{ id:'vela', name:'Vela Logistics, Inc.',
      facts:[['TIN','38-2049571'],['Entity type','C-Corporation'],['Formed','Mar 12, 2019'],['Home state','California'],['Foreign reg.','Texas'],['Status','Active · Good standing'],['Employees','~210'],['Industry','Trucking & logistics']],
      insightSummary:'On its own record, Vela is clean: active in California and Texas, TIN matched, officers verified, no direct watchlist hits. The exposure is inherited. An April 2026 restructure quietly placed 60% control with Meridian Holdings, never disclosed on the application, pulling Vela into a three-entity cluster whose far edge holds a dissolved importer with an active watchlist hit. Screening adds one adverse-media item held for review against a connected principal.', insightRec:'Hold for manual review until the beneficial-owner change is resolved.',
      versions:[
        {v:'v1',date:'Mar 12, 2019',title:'Entity formed',detail:'Registered as a California C-Corporation with the Secretary of State.',changes:[['Status','None','Active'],['Home state','None','California'],['Entity type','None','Corporation']],matters:false,weight:'Routine'},
        {v:'v2',date:'Jun 02, 2021',title:'Foreign registration · TX',detail:'Registered to do business in Texas, expanding the operating footprint.',changes:[['Foreign registrations','None','Texas (active)']],matters:false,weight:'Routine'},
        {v:'v3',date:'Feb 18, 2023',title:'Officer added · CFO',detail:'Sarah Nguyen appointed CFO and recorded as a 15% beneficial owner.',changes:[['Officers','3','4'],['Beneficial owners','1','2']],matters:true,weight:'Review',why:'A new ≥25%-adjacent owner changes who controls the business you are lending to.'},
        {v:'v4',date:'Oct 04, 2024',title:'Principal address changed',detail:'Moved to 4400 Wilshire Blvd, a shared commercial address used by several unrelated entities.',changes:[['Principal address','1100 Alameda St','4400 Wilshire Blvd']],matters:true,weight:'Watch',why:'The new address is shared with unrelated businesses, a weak signal worth noting but not acting on.'},
        {v:'v5',date:'Aug 22, 2025',title:'UCC lien filed',detail:'A secured financing statement was filed by a commercial lender against equipment and receivables.',changes:[['UCC liens','0','1']],matters:true,weight:'Watch',why:'New secured debt affects collateral position and credit exposure.'},
        {v:'v6',date:'Apr 21, 2026',title:'New beneficial owner detected',detail:'A Meridian Holdings restructure introduced a controlling owner connected to a high-risk entity three hops out.',changes:[['Controlling owner','Marcus Okonkwo','Meridian Holdings LLC'],['Network risk','Low','Elevated']],matters:true,weight:'Act',why:'Control passed to a holding company that links into a high-risk entity you cannot see from this record alone.'},
      ],
      decisions:[
        {date:'Apr 21, 2026',title:'Beneficial owner change',outcome:'Pending',tone:'elev',mode:'Manual review',who:'Assigned · Dana Melas',why:'New controlling owner exposes an indirect link to a high-risk entity. Awaiting analyst decision.',sources:12},
        {date:'Aug 22, 2025',title:'Lien filing review',outcome:'Approved · monitoring',tone:'watch',mode:'Manual',who:'Dana Melas',why:'Single UCC lien consistent with equipment financing. Cleared, flagged for ongoing watch.',sources:9},
        {date:'Oct 04, 2024',title:'Address change review',outcome:'Approved',tone:'clear',mode:'Automatic',who:'Policy · Change Monitoring',why:'New address validated. Shared commercial address noted, below review threshold.',sources:6},
        {date:'Mar 12, 2019',title:'Onboarding decision',outcome:'Approved',tone:'clear',mode:'Automatic',who:'Policy · KYB Standard',why:'Legal name, TIN, and registration verified across 18 sources. No watchlist hits.',sources:18},
      ],
      watch:[
        {label:'Indirect high-risk link',sub:'Stillwater Imports · 3 hops via ownership',tone:'elev'},
        {label:'Shared commercial address',sub:'4400 Wilshire Blvd · 2+ unrelated entities',tone:'watch'},
        {label:'Active UCC lien',sub:'Equipment & receivables · since Aug 2025',tone:'watch'},
      ],
      dataAttrs:[
        {g:'Registration', rows:[
          {k:'Legal name',v:'Vela Logistics, Inc.',src:'CA SoS'},
          {k:'DBA / FBN',v:'None on file',src:'CA SoS',muted:true},
          {k:'Entity type',v:'C-Corporation',src:'CA SoS'},
          {k:'TIN / EIN',v:'38-2049571',src:'IRS',mono:true,unique:true},
          {k:'Formation date',v:'03.12.19',src:'CA SoS'},
          {k:'Home state',v:'California',src:'CA SoS'},
          {k:'Foreign registration',v:'Texas',src:'TX SoS'},
          {k:'SoS status',v:'Active · good standing',src:'CA SoS'},
          {k:'Registered agent',v:'Cogency Global Inc.',src:'CA SoS',excluded:true},
        ]},
        {g:'Locations', rows:[
          {k:'Principal address',v:'4400 Wilshire Blvd, Los Angeles, CA',src:'Utility stmt',shared:3,weight:'weak'},
          {k:'Prior address',v:'1100 Alameda St (until 2024)',src:'Filings',muted:true},
        ]},
        {g:'People & ownership', rows:[
          {k:'Beneficial owner',v:'Meridian Holdings LLC · 60%',src:'FinCEN BOI',shared:2,weight:'strong'},
          {k:'Beneficial owner',v:'Sarah Nguyen · 15%',src:'FinCEN BOI'},
          {k:'Officer',v:'Sarah Nguyen · CFO',src:'CA SoS'},
          {k:'Officer',v:'Marcus Okonkwo · Director',src:'CA SoS',shared:2,weight:'strong'},
        ]},
        {g:'Digital footprint', rows:[
          {k:'Website',v:'velalogistics.com',src:'WHOIS · since 2019'},
          {k:'Email domain',v:'@velalogistics.com',src:'MQ'},
          {k:'Phone',v:'(310) ••• ••42',src:'MQ',mono:true},
          {k:'Last login IP',v:'Los Angeles, CA',src:'ID check'},
        ]},
        {g:'Risk records', rows:[
          {k:'UCC lien',v:'1 active · equipment & receivables',src:'UCC · 2025',weight:'watch'},
          {k:'Adverse media',v:'1 indirect (connected entity)',src:'Network',weight:'watch'},
        ]},
      ],
      connected:{ summary:'Three identities share data attributes with Vela. Ownership reveals who controls it. Risk travels in through connections this record can’t show on its own.',
        note:'Meridian Holdings is itself 75% owned by Marcus Okonkwo',
        own:[{id:'meridian',pct:60,rel:'Controlling owner',risk:'watch',note:'Holding company · added in the Apr 2026 restructure'},{id:'nguyen',pct:15,rel:'Direct owner · CFO',risk:'clear',note:'Individual beneficial owner'}],
        conn:[{id:'harbor',via:'Shared officer · M. Okonkwo',strength:'strong',risk:'watch'},{id:'stillwater',via:'Shared officer · 3 hops out',strength:'moderate',risk:'high',flag:true},{id:'cedar',via:'Shared commercial address',strength:'weak',risk:'clear'}] },
      answers:null },

    anchor:{ id:'anchor', name:'Anchor Drayage Co.',
      facts:[['TIN','82-6647120'],['Entity type','Corporation'],['Formed','Jul 09, 2016'],['Home state','California'],['Status','Active · Good standing'],['Employees','~85'],['Industry','Trucking & logistics']],
      insightSummary:'Every check passes. Registration, ownership, and TIN were re-verified at the March 2026 annual review with no exceptions, and screening surfaces no watchlist, lien, or adverse-media findings. Anchor is wholly controlled by Meridian Holdings, worth noting for relationship limits, but nothing in the network carries risk into the business.', insightRec:'Clear to approve.',
      versions:[
        {v:'v1',date:'Jul 09, 2016',title:'Entity formed',detail:'Registered as a California corporation.',changes:[['Status','None','Active'],['Home state','None','California']],matters:false,weight:'Routine'},
        {v:'v2',date:'May 30, 2023',title:'Acquired by Meridian',detail:'Meridian Holdings LLC acquired 100% of Anchor Drayage.',changes:[['Owner','Founders','Meridian Holdings LLC']],matters:true,weight:'Review',why:'A change of control brings the acquirer’s risk profile into scope.'},
        {v:'v3',date:'Mar 02, 2026',title:'Annual refresh',detail:'Registration and ownership re-verified. No changes.',changes:[['SoS status','None','Confirmed']],matters:false,weight:'Routine'},
      ],
      decisions:[
        {date:'Mar 02, 2026',title:'Annual review',outcome:'Approved',tone:'clear',mode:'Automatic',who:'Policy · KYB Standard',why:'Registration, ownership, and TIN re-verified. No exceptions.',sources:14},
        {date:'May 30, 2023',title:'Ownership change',outcome:'Approved',tone:'clear',mode:'Manual',who:'Dana Melas',why:'Meridian acquisition validated against BOI filing. Common control noted.',sources:8},
      ],
      watch:[{label:'Common ownership',sub:'100% owned by Meridian Holdings',tone:'low'}],
      dataAttrs:[
        {g:'Registration', rows:[
          {k:'Legal name',v:'Anchor Drayage Co.',src:'CA SoS'},
          {k:'Entity type',v:'Corporation',src:'CA SoS'},
          {k:'TIN / EIN',v:'82-6647120',src:'IRS',mono:true,unique:true},
          {k:'Formation date',v:'07.09.16',src:'CA SoS'},
          {k:'SoS status',v:'Active · good standing',src:'CA SoS'},
        ]},
        {g:'People & ownership', rows:[
          {k:'Beneficial owner',v:'Meridian Holdings LLC · 100%',src:'FinCEN BOI',shared:2,weight:'strong'},
        ]},
        {g:'Digital footprint', rows:[
          {k:'Website',v:'anchordrayage.com',src:'WHOIS · since 2016'},
          {k:'Phone',v:'(510) ••• ••18',src:'MQ',mono:true},
        ]},
      ],
      connected:{ summary:'Anchor is wholly owned by Meridian Holdings, placing it in the same control structure as Vela.',
        own:[{id:'meridian',pct:100,rel:'Sole owner',risk:'watch',note:'Wholly owned subsidiary'}],
        conn:[{id:'vela',via:'Common owner · Meridian',strength:'strong',risk:'watch'}] },
      answers:{} },

    harbor:{ id:'harbor', name:'Harbor Freight Partners LLC',
      facts:[['TIN','47-2210934'],['Entity type','LLC'],['Formed','Nov 20, 2018'],['Home state','Nevada'],['Status','Active · Good standing'],['Employees','~40'],['Industry','Freight brokerage']],
      insightSummary:"Harbor's own record is in order, with an active registration, verified ownership, and clean screening. The watch item is relational: a shared officer connects Harbor to a high-risk entity two hops out, a path risk can travel. The February 2026 network review cleared it with monitoring in place.", insightRec:'Approve and keep network monitoring active.',
      versions:[
        {v:'v1',date:'Nov 20, 2018',title:'Entity formed',detail:'Registered as a Nevada LLC.',changes:[['Status','None','Active'],['Home state','None','Nevada']],matters:false,weight:'Routine'},
        {v:'v2',date:'Sep 12, 2024',title:'Officer added',detail:'J. Reyes added as a managing officer.',changes:[['Officers','1','2']],matters:true,weight:'Review',why:'A shared officer connects Harbor into a broader network.'},
        {v:'v3',date:'Feb 14, 2026',title:'Network flag',detail:'A shared officer links Harbor to a high-risk entity two hops out.',changes:[['Network risk','Low','Watch']],matters:true,weight:'Watch',why:'Risk can travel through the shared officer relationship.'},
      ],
      decisions:[
        {date:'Feb 14, 2026',title:'Network review',outcome:'Approved · monitoring',tone:'watch',mode:'Manual',who:'Dana Melas',why:'Shared officer with Vela and an indirect link to a high-risk entity. Cleared with monitoring.',sources:10},
        {date:'Nov 20, 2018',title:'Onboarding decision',outcome:'Approved',tone:'clear',mode:'Automatic',who:'Policy · KYB Standard',why:'Registration and TIN verified. No exceptions.',sources:11},
      ],
      watch:[
        {label:'Shared officer',sub:'M. Okonkwo · also at Vela & Meridian',tone:'watch'},
        {label:'Indirect high-risk link',sub:'Stillwater Imports · 2 hops via J. Reyes',tone:'watch'},
      ],
      dataAttrs:[
        {g:'Registration', rows:[
          {k:'Legal name',v:'Harbor Freight Partners LLC',src:'NV SoS'},
          {k:'Entity type',v:'LLC',src:'NV SoS'},
          {k:'TIN / EIN',v:'47-2210934',src:'IRS',mono:true,unique:true},
          {k:'Formation date',v:'11.20.18',src:'NV SoS'},
          {k:'SoS status',v:'Active · good standing',src:'NV SoS'},
        ]},
        {g:'People & ownership', rows:[
          {k:'Officer',v:'Marcus Okonkwo · Director',src:'NV SoS',shared:2,weight:'strong'},
          {k:'Officer',v:'J. Reyes · Managing officer',src:'NV SoS',shared:2,weight:'strong'},
        ]},
        {g:'Digital footprint', rows:[
          {k:'Website',v:'harborfreightpartners.com',src:'WHOIS'},
        ]},
      ],
      connected:{ summary:'Harbor shares officers with both Vela and a high-risk entity, making it a conduit for network risk.',
        own:[],
        conn:[{id:'okonkwo',via:'Officer · also at Vela',strength:'strong',risk:'watch'},{id:'reyes',via:'Co-officer',strength:'strong',risk:'elev'},{id:'stillwater',via:'2 hops via J. Reyes',strength:'moderate',risk:'high',flag:true}] },
      answers:{
        'What does the UBO structure look like?':{a:'No 25%+ owner',tone:'clear',insight:'Member-managed LLC with no single 25%+ beneficial owner on file.'},
        'Which type best characterizes the org physical address?':{a:'Commercial',tone:'clear',insight:'Registered at a dedicated commercial office in Reno, NV.'},
        'Do the BOs have web hits for negative news?':{a:'1 · indirect',tone:'watch',insight:'Adverse media tied to a connected entity through the shared officer, not Harbor directly.'},
        "What is the org's AML risk rating?":{a:'Medium',tone:'watch',insight:'Elevated by a shared-officer link into a high-risk network; no direct exposure.'},
      } },

    meridian:{ id:'meridian', name:'Meridian Holdings LLC',
      facts:[['TIN','61-1180255'],['Entity type','LLC · Holding co.'],['Formed','Apr 02, 2015'],['Home state','Delaware'],['Status','Active · Good standing'],['Subsidiaries','2'],['Industry','Holding company']],
      insightSummary:'The record itself is unremarkable; the findings are structural. Meridian took a controlling 60% stake in Vela Logistics in April 2026 and now controls two monitored businesses, concentrating portfolio exposure through a single owner.', insightRec:'Review at the relationship level before extending further exposure.',
      versions:[
        {v:'v1',date:'Apr 02, 2015',title:'Entity formed',detail:'Registered as a Delaware holding company.',changes:[['Status','None','Active'],['Home state','None','Delaware']],matters:false,weight:'Routine'},
        {v:'v2',date:'May 30, 2023',title:'Acquired Anchor Drayage',detail:'Acquired 100% of Anchor Drayage Co.',changes:[['Subsidiaries','0','1']],matters:true,weight:'Review',why:'Expanding control footprint across multiple monitored businesses.'},
        {v:'v3',date:'Apr 21, 2026',title:'Took control of Vela',detail:'Acquired a controlling 60% interest in Vela Logistics.',changes:[['Subsidiaries','1','2'],['Controls','Anchor','Anchor · Vela']],matters:true,weight:'Watch',why:'Concentration of control across your portfolio warrants a relationship-level view.'},
      ],
      decisions:[
        {date:'Apr 21, 2026',title:'Control expansion review',outcome:'Approved · monitoring',tone:'watch',mode:'Manual',who:'Dana Melas',why:'Meridian now controls 2 monitored businesses. Concentration noted for relationship limits.',sources:9},
        {date:'Apr 02, 2015',title:'Onboarding decision',outcome:'Approved',tone:'clear',mode:'Automatic',who:'Policy · KYB Standard',why:'Delaware registration and owner verified.',sources:7},
      ],
      watch:[
        {label:'Ownership concentration',sub:'Controls 2 monitored businesses',tone:'watch'},
        {label:'Owner overlap',sub:'75% owned by Marcus Okonkwo',tone:'low'},
      ],
      dataAttrs:[
        {g:'Registration', rows:[
          {k:'Legal name',v:'Meridian Holdings LLC',src:'DE SoS'},
          {k:'Entity type',v:'LLC · Holding company',src:'DE SoS'},
          {k:'TIN / EIN',v:'61-1180255',src:'IRS',mono:true,unique:true},
          {k:'Formation date',v:'04.02.15',src:'DE SoS'},
          {k:'SoS status',v:'Active · good standing',src:'DE SoS'},
        ]},
        {g:'People & ownership', rows:[
          {k:'Beneficial owner',v:'Marcus Okonkwo · 75%',src:'FinCEN BOI',shared:2,weight:'strong'},
          {k:'Subsidiary',v:'Anchor Drayage Co. · 100%',src:'BOI'},
          {k:'Subsidiary',v:'Vela Logistics · 60%',src:'BOI'},
        ]},
      ],
      connected:{ summary:'Meridian is the control hub: it owns Anchor outright and holds a controlling stake in Vela, all traced to a single individual.',
        note:'Both subsidiaries inherit Meridian’s ownership risk',
        own:[{id:'okonkwo',pct:75,rel:'Controlling owner',risk:'low',note:'Individual beneficial owner'}],
        conn:[{id:'vela',via:'Owns 60%',strength:'strong',risk:'watch'},{id:'anchor',via:'Owns 100%',strength:'strong',risk:'low'}] },
      answers:{
        'What does the UBO structure look like?':{a:'1 owner ≥ 75%',tone:'low',insight:'Marcus Okonkwo holds 75% of Meridian; the remainder is held by two minority members.'},
        "What is the org's AML risk rating?":{a:'Medium',tone:'watch',insight:'Rated Medium for control concentration across multiple monitored businesses.'},
        'Reason to believe there are 25%+ owners not on the application?':{a:'No',tone:'clear',insight:'Ownership fully disclosed and matched to BOI filing.'},
      } },

    cedar:{ id:'cedar', name:'Cedar & Vine Café LLC',
      facts:[['TIN','88-4471902'],['Entity type','LLC'],['Formed','Aug 15, 2022'],['Home state','California'],['Status','Active · Good standing'],['Employees','~18'],['Industry','Food service']],
      insightSummary:"All checks pass. Registration and ownership were re-verified at the January 2026 refresh with no changes, and screening is clean. Cedar's only network note is a commercial address shared with other tenants, a weak and non-directional link recorded for context.", insightRec:'Clear to approve.',
      versions:[
        {v:'v1',date:'Aug 15, 2022',title:'Entity formed',detail:'Registered as a California LLC.',changes:[['Status','None','Active'],['Home state','None','California']],matters:false,weight:'Routine'},
        {v:'v2',date:'Jan 09, 2026',title:'Annual refresh',detail:'Registration and ownership re-verified. No changes.',changes:[['SoS status','None','Confirmed']],matters:false,weight:'Routine'},
      ],
      decisions:[
        {date:'Aug 15, 2022',title:'Onboarding decision',outcome:'Approved',tone:'clear',mode:'Automatic',who:'Policy · KYB Standard',why:'Legal name, TIN, and single owner verified. No exceptions.',sources:13},
      ],
      watch:[{label:'Shared commercial address',sub:'4400 Wilshire Blvd · weak signal only',tone:'clear'}],
      dataAttrs:[
        {g:'Registration', rows:[
          {k:'Legal name',v:'Cedar & Vine Café LLC',src:'CA SoS'},
          {k:'Entity type',v:'LLC',src:'CA SoS'},
          {k:'TIN / EIN',v:'88-4471902',src:'IRS',mono:true,unique:true},
          {k:'Formation date',v:'08.15.22',src:'CA SoS'},
          {k:'SoS status',v:'Active · good standing',src:'CA SoS'},
        ]},
        {g:'Locations', rows:[
          {k:'Registered address',v:'4400 Wilshire Blvd, Los Angeles, CA',src:'CA SoS',shared:3,weight:'weak'},
        ]},
        {g:'People & ownership', rows:[
          {k:'Beneficial owner',v:'Elena Cruz · 100%',src:'FinCEN BOI'},
        ]},
      ],
      connected:{ summary:'Cedar & Vine shares only a commercial address with Vela. A weak signal, not a control relationship.',
        own:[],
        conn:[{id:'vela',via:'Shared commercial address',strength:'weak',risk:'clear'}] },
      answers:{} },

    brightpath:{ id:'brightpath', name:'BrightPath Consulting',
      facts:[['TIN','93-2205518'],['Entity type','LLC'],['Formed','Mar 28, 2021'],['Home state','California'],['Status','Active · Good standing'],['Employees','~9'],['Industry','Professional services']],
      versions:[
        {v:'v1',date:'Mar 28, 2021',title:'Entity formed',detail:'Registered as a California LLC.',changes:[['Status','None','Active'],['Home state','None','California']],matters:false,weight:'Routine'},
        {v:'v2',date:'Dec 18, 2025',title:'Annual refresh',detail:'Registration re-verified. No changes.',changes:[['SoS status','None','Confirmed']],matters:false,weight:'Routine'},
      ],
      decisions:[
        {date:'Mar 28, 2021',title:'Onboarding decision',outcome:'Approved',tone:'clear',mode:'Automatic',who:'Policy · KYB Standard',why:'Registration, TIN, and owner verified. No exceptions.',sources:12},
      ],
      watch:[{label:'Shared mailing address',sub:'4400 Wilshire Blvd · weak signal only',tone:'clear'}],
      dataAttrs:[
        {g:'Registration', rows:[
          {k:'Legal name',v:'BrightPath Consulting LLC',src:'CA SoS'},
          {k:'Entity type',v:'LLC',src:'CA SoS'},
          {k:'TIN / EIN',v:'93-2205518',src:'IRS',mono:true,unique:true},
          {k:'Formation date',v:'03.28.21',src:'CA SoS'},
          {k:'SoS status',v:'Active · good standing',src:'CA SoS'},
        ]},
        {g:'Locations', rows:[
          {k:'Mailing address',v:'4400 Wilshire Blvd, Los Angeles, CA',src:'Filings',shared:3,weight:'weak'},
        ]},
        {g:'People & ownership', rows:[
          {k:'Beneficial owner',v:'Priya Anand · 100%',src:'FinCEN BOI'},
        ]},
      ],
      connected:{ summary:'BrightPath shares only a mailing address with Vela. No ownership or officer overlap.',
        own:[],
        conn:[{id:'vela',via:'Shared mailing address',strength:'weak',risk:'clear'}] },
      answers:{} },

    stillwater:{ id:'stillwater', name:'Stillwater Imports LLC',
      facts:[['TIN','59-3387461'],['Entity type','LLC'],['Formed','Jun 11, 2017'],['Home state','Florida'],['Status','Dissolved'],['Industry','Import / export']],
      insightSummary:'Materially adverse. The Florida registration lapsed and the entity was administratively dissolved in April 2026, severing standing agreements, and an active watchlist hit sits on the record. Stillwater is also the high-risk endpoint of the ownership path that reaches Vela Logistics.', insightRec:'Decline and review connected entities.',
      versions:[
        {v:'v1',date:'Jun 11, 2017',title:'Entity formed',detail:'Registered as a Florida LLC.',changes:[['Status','None','Active'],['Home state','None','Florida']],matters:false,weight:'Routine'},
        {v:'v2',date:'Oct 03, 2024',title:'Watchlist hit',detail:'A beneficial owner matched an OFAC-adjacent watchlist entry.',changes:[['Watchlist','Clear','Hit'],['Risk','Low','High']],matters:true,weight:'Act',why:'A direct watchlist hit is a hard stop for onboarding and monitoring.'},
        {v:'v3',date:'Apr 19, 2026',title:'Dissolved',detail:'The Florida registration lapsed and the entity was administratively dissolved.',changes:[['SoS status','Active','Dissolved']],matters:true,weight:'Act',why:'A dissolved counterparty cannot be transacted with and severs standing agreements.'},
      ],
      decisions:[
        {date:'Apr 19, 2026',title:'Dissolution flagged',outcome:'Declined',tone:'high',mode:'Manual review',who:'Assigned · Dana Melas',why:'Entity dissolved and carries an active watchlist hit. Recommended decline and network review.',sources:15},
        {date:'Oct 03, 2024',title:'Watchlist review',outcome:'Escalated',tone:'high',mode:'Manual',who:'Dana Melas',why:'Beneficial owner matched a watchlist entry. Escalated for enhanced due diligence.',sources:11},
      ],
      watch:[
        {label:'Active watchlist hit',sub:'Beneficial owner · OFAC-adjacent',tone:'high'},
        {label:'Entity dissolved',sub:'FL registration lapsed Apr 2026',tone:'high'},
        {label:'Feeds network risk',sub:'Linked to Vela & Harbor via officer',tone:'elev'},
      ],
      dataAttrs:[
        {g:'Registration', rows:[
          {k:'Legal name',v:'Stillwater Imports LLC',src:'FL SoS'},
          {k:'Entity type',v:'LLC',src:'FL SoS'},
          {k:'TIN / EIN',v:'59-3387461',src:'IRS',mono:true,unique:true},
          {k:'Formation date',v:'06.11.17',src:'FL SoS'},
          {k:'SoS status',v:'Dissolved',src:'FL SoS',weight:'watch'},
        ]},
        {g:'People & ownership', rows:[
          {k:'Beneficial owner',v:'J. Reyes · 80%',src:'FinCEN BOI',shared:2,weight:'strong'},
        ]},
        {g:'Risk records', rows:[
          {k:'Watchlist',v:'1 hit · OFAC-adjacent',src:'OFAC',weight:'watch'},
          {k:'Adverse media',v:'3 articles',src:'Media',weight:'watch'},
        ]},
      ],
      connected:{ summary:'Stillwater is the high-risk node your other identities connect back to through a shared officer, two and three hops out.',
        own:[],
        conn:[{id:'reyes',via:'Owner / officer · 80%',strength:'strong',risk:'high'},{id:'harbor',via:'Shared officer · 2 hops',strength:'moderate',risk:'high',flag:true},{id:'vela',via:'Shared officer · 3 hops',strength:'moderate',risk:'high',flag:true}] },
      answers:{
        'Any sanctions or watchlist exposure?':{a:'Watchlist hit',tone:'high',insight:'A beneficial owner matched an OFAC-adjacent watchlist entry (2024). Direct exposure.'},
        "What is the org's AML risk rating?":{a:'High',tone:'high',insight:'Rated High for a direct watchlist hit plus adverse media on a beneficial owner.'},
        'Do the BOs have web hits for negative news?':{a:'3 · direct',tone:'high',insight:'Three adverse-media articles tied directly to the 80% beneficial owner.'},
        'Reason to believe there are 25%+ owners not on the application?':{a:'Yes',tone:'high',insight:'Ownership structure is opaque; the disclosed owner does not reconcile with import records.'},
        'Which type best characterizes the org physical address?':{a:'Vacant',tone:'watch',insight:'The registered Florida address is a vacant unit following dissolution.'},
      } },
  }; }

  get entities(){ return {
    vela:{name:'Vela Logistics, Inc.',type:'Corporation',sub:'CA · Trucking',risk:'watch',kind:'business'},
    meridian:{name:'Meridian Holdings LLC',type:'Holding co.',sub:'DE',risk:'watch',kind:'business'},
    anchor:{name:'Anchor Drayage Co.',type:'Corporation',sub:'CA · Trucking',risk:'low',kind:'business'},
    harbor:{name:'Harbor Freight Partners LLC',type:'LLC',sub:'NV',risk:'watch',kind:'business'},
    stillwater:{name:'Stillwater Imports LLC',type:'LLC',sub:'FL',risk:'high',kind:'business'},
    cedar:{name:'Cedar & Vine Café LLC',type:'LLC',sub:'CA',risk:'clear',kind:'business'},
    brightpath:{name:'BrightPath Consulting',type:'LLC',sub:'CA',risk:'clear',kind:'business'},
    okonkwo:{name:'Marcus Okonkwo',type:'Individual',sub:'UBO',risk:'low',kind:'person'},
    nguyen:{name:'Sarah Nguyen',type:'Individual',sub:'Officer',risk:'clear',kind:'person'},
    reyes:{name:'J. Reyes',type:'Individual',sub:'Officer',risk:'high',kind:'person'},
    lumen:{name:'Lumen Studio LLC',type:'LLC',sub:'CA',risk:'clear',kind:'business'},
  }; }

  /* ---------- atoms ---------- */
  /* Badge tone map — core status/risk family tokens (cf. @/core Badge). */
  get TONES(){ return {
    clear:{bg:'var(--core-color-status-success-bg)',fg:'var(--core-color-status-success-fg)',border:'var(--core-color-status-success-border)'},
    low:{bg:'var(--core-color-risk-low-bg)',fg:'var(--core-color-risk-low-fg)',border:'var(--core-color-risk-low-border)'},
    watch:{bg:'var(--core-color-risk-moderate-bg)',fg:'var(--core-color-risk-moderate-fg)',border:'var(--core-color-risk-moderate-border)'},
    elev:{bg:'var(--core-color-risk-high-bg)',fg:'var(--core-color-risk-high-fg)',border:'var(--core-color-risk-high-border)'},
    high:{bg:'var(--core-color-risk-critical-bg)',fg:'var(--core-color-risk-critical-fg)',border:'var(--core-color-risk-critical-border)'},
    mute:{bg:'var(--core-color-status-neutral-bg)',fg:'var(--core-color-status-neutral-fg)',border:'var(--core-color-status-neutral-border)'} }; }
  mono(t,extra){ return React.createElement('span',{style:{fontFamily:'var(--app-font)',fontSize:11,fontWeight:600,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--core-color-text-secondary)',...(extra||{})}},t); }
  // Real @core Badge components (design-system/core/Badge.tsx)
  coreBadge(text,family,tone,extra,size){
    const h=React.createElement;
    if(family==='risk') return h(RiskSeverityBadge,{severity:tone,size:size==='compact'?'standard':'compact',style:extra},text);
    return h(MetaChip,{tone,size:size||'xs',style:extra},text);
  }
  // statusOf() result → @core status tone (MetaChip vocabulary)
  STATUS_TONE(st){ return ({pass:'success',review:'warning',flag:'danger'})[st]||'neutral'; }
  // App tone vocabulary → @core Badge (family, tone) token pair
  BADGE_FAMILY(tone){ return ({
    clear:['status','success'], low:['risk','low'], watch:['risk','moderate'],
    elev:['risk','high'], high:['risk','critical'], mute:['status','neutral']})[tone]||['status','neutral']; }
  pill(t,tone,extra){
    const [family,tn]=this.BADGE_FAMILY(tone);
    return this.coreBadge(t,family,tn,extra);
  }
  panel(style,...kids){ return React.createElement('div',{style:{background:'var(--core-color-surface-card)',border:'1px solid var(--core-color-border-default)',borderRadius:'var(--core-radius-card)',boxShadow:'var(--core-color-elevation-card)',overflow:'hidden',...(style||{})}},...kids); }
  panelHead(title,right){ return React.createElement('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'14px 20px',borderBottom:'1px solid var(--core-color-border-divider)'}},
    React.createElement('span',{style:{fontSize:14,fontWeight:600,color:'var(--core-color-text-primary)'}},title), right||null); }

  /* ---------- shell ---------- */
  /* Lucide-style 16px glyphs (stroke 1.5) matching the /app nav icon set. */
  navIcon(name,size){ const h=React.createElement; const s=size||16;
    const P={
      home:['M3 11 12 4l9 7','M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10'],
      building:['M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z','M2 22h20','M9 6h1','M14 6h1','M9 10h1','M14 10h1','M9 14h1','M14 14h1','M9 18h1','M14 18h1'],
      fileText:['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z','M14 2v4a2 2 0 0 0 2 2h4','M10 9H8','M16 13H8','M16 17H8'],
      sparkles:['M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z','M19 17l.9 2.1L22 20l-2.1.9L19 23l-.9-2.1L16 20l2.1-.9L19 17z'],
      search:['M21 21l-4.3-4.3','M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z'],
      panelLeft:['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z','M9 3v18'],
      settings:['M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z','M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
      chevronUp:['m18 15-6-6-6 6'],
      chevronDown:['m6 9 6 6 6-6'],
      chevronsUpDown:['m7 15 5 5 5-5','m7 9 5-5 5 5'],
      paperclip:['m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48'],
      arrowUp:['M12 19V5','m5 12 7-7 7 7'],
      layers:['M12 2 2 7l10 5 10-5-10-5z','m2 17 10 5 10-5','m2 12 10 5 10-5'],
      bot:['M12 8V4H8','M4 8h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z','M2 14h2','M20 14h2','M15 13v2','M9 13v2'],
      sun:['M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z','M12 1v2','M12 21v2','m4.22 4.22 1.42 1.42','m18.36 18.36 1.42 1.42','M1 12h2','M21 12h2','m4.22 19.78 1.42-1.42','m18.36 5.64 1.42-1.42'],
      moon:['M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'],
      logout:['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4','m16 17 5-5-5-5','M21 12H9'],
    }[name]||[];
    return h('svg',{width:s,height:s,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.5,strokeLinecap:'round',strokeLinejoin:'round',style:{flexShrink:0}}, ...P.map((d,i)=>h('path',{key:i,d})));
  }
  Sidebar(){
    const h=React.createElement; const {view}=this.state;
    const icon=(name)=>h('span',{style:{display:'grid',placeItems:'center',width:16,height:16,flexShrink:0}}, this.navIcon(name));
    const item=(label,ic,active,onClick)=> h('button',{className:'app-nav-item',onClick,'data-active':active?'true':undefined},
      icon(ic), h('span',{style:{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis'}},label));
    return h('aside',{style:{width:224,flexShrink:0,background:'var(--core-color-nav-bg)',color:'var(--core-color-nav-item-text)',borderRight:'1px solid var(--core-color-nav-border)',display:'flex',flexDirection:'column',overflow:'hidden'}},
      // header — brand lockup lives here now that the top bar carries the nav toggle
      h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',height:58,padding:'0 8px',flexShrink:0}},
        h('div',{style:{display:'flex',alignItems:'center',gap:10,height:32,padding:'0 8px',color:'var(--core-color-text-primary)'}},
          h('svg',{width:25,height:14,viewBox:'0 0 30 16',fill:'currentColor',style:{flexShrink:0}}, h('path',{d:'M14.868 15.99V15.995H17.8334V13.2048V13.2011H17.8294L4.14417 0H1.18008V2.79517L14.868 15.99ZM0 15.995H4.48643V11.7661H0V15.995ZM26.7415 15.99V15.995H29.7069V13.2048V13.2011H29.7029L22.8603 6.60055L16.0177 0H13.0536V2.79517L26.7415 15.99Z'})),
          h('span',{style:{fontSize:15,fontWeight:600,letterSpacing:'-.01em'}},'Middesk')),
        h('div',{style:{display:'flex',alignItems:'center',gap:2}},
          h(IconActionButton,{variant:'quiet','aria-label':'Search (⌘K)',title:'Search (⌘K)',onClick:()=>this.newChat()}, this.navIcon('search')),
          h(IconActionButton,{variant:'quiet','aria-label':'Hide navigation',title:'Hide navigation',onClick:()=>this.setState({navDrawer:false})}, this.navIcon('panelLeft')))),
      h('nav',{style:{display:'flex',flexDirection:'column',gap:4,padding:'8px 8px 16px',flex:1,minHeight:0,overflowY:'auto'}},
        item('Intelligence','sparkles', view==='intelligence', ()=>this.newChat()),
        item('Identities','building', view==='list'||view==='identity', ()=>this.setS({view:'list'})),
        item('Report A','fileText', view==='report', ()=>this.setS({view:'report'})),
        item('Report B','fileText', view==='reportB', ()=>this.setS({view:'reportB'}))),
      // footer — account row (mt-auto, border-t divider, p-2) with a popover user menu
      h('div',{style:{marginTop:'auto',borderTop:'1px solid var(--core-color-border-divider)',padding:8,flexShrink:0}},
        (function(self){
          const h=React.createElement;
          const segRow=(label,control)=> h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,minHeight:40,padding:'4px 12px',fontSize:13,color:'var(--core-color-text-primary)'}},
            h('span',null,label), control);
          return h(Menu,{open:!!self.state.userMenu,onOpenChange:(o)=>self.setState({userMenu:o})},
            h(MenuTrigger,{asChild:true},
              h('button',{className:'app-nav-item',style:{minHeight:44}},
                h(Avatar,{name:'Dana Melas',size:'sm',alt:''}),
                h('span',{style:{display:'flex',flexDirection:'column',lineHeight:1.3,flex:1,minWidth:0,gap:1}},
                  h('span',{style:{fontSize:13,color:'var(--core-color-text-primary)',overflow:'hidden',textOverflow:'ellipsis'}},'Dana Melas'),
                  h('span',{style:{fontSize:11,fontWeight:400,color:'var(--core-color-text-muted)',overflow:'hidden',textOverflow:'ellipsis'}},self.state.envMode==='sandbox'?'Sandbox':'Live')),
                h('span',{style:{display:'grid',placeItems:'center',width:16,height:16,color:'var(--core-color-text-muted)',flexShrink:0}}, self.navIcon('chevronsUpDown',14)))),
            h(MenuContent,{side:'top',align:'start',sideOffset:8,themeMode:self.state.theme==='dark'?'dark':'light',style:{width:300}},
              // identity header — name + email, settings cog to the right
              h('div',{style:{display:'flex',alignItems:'center',gap:10,padding:'10px 12px'}},
                h('div',{style:{flex:1,minWidth:0}},
                  h('div',{style:{fontSize:13.5,fontWeight:600,color:'var(--core-color-text-primary)'}},'Dana Melas'),
                  h('div',{style:{fontSize:12,marginTop:2,color:'var(--core-color-text-muted)',overflow:'hidden',textOverflow:'ellipsis'}},'dana.melas@middesk.com')),
                h(IconActionButton,{variant:'quiet','aria-label':'Profile & settings',title:'Profile & settings',onClick:()=>self.setState({userMenu:false})}, self.navIcon('settings',15))),
              h(MenuSeparator),
              segRow('Theme', h(SegmentedControl,{size:'sm',value:self.state.theme==='dark'?'dark':'light',onValueChange:(v)=>self.setUI({theme:v})},
                h(SegmentedControlItem,{value:'light','aria-label':'Light theme',icon:self.navIcon('sun',13)}),
                h(SegmentedControlItem,{value:'dark','aria-label':'Dark theme',icon:self.navIcon('moon',13)}))),
              segRow('Environment', h(SegmentedControl,{size:'sm',value:self.state.envMode==='sandbox'?'sandbox':'live',onValueChange:(v)=>self.setUI({envMode:v})},
                h(SegmentedControlItem,{value:'live'},'Live'),
                h(SegmentedControlItem,{value:'sandbox'},'Sandbox'))),
              h(MenuSeparator),
              h(MenuItem,{style:{justifyContent:'space-between',minHeight:40,padding:'8px 12px',fontSize:13}},'Log out',
                h('span',{style:{display:'inline-flex',alignItems:'center',color:'var(--core-color-text-muted)'}},self.navIcon('logout',15)))));
        })(this)));
  }
  Topbar(){
    const h=React.createElement; const self=this; const {view,direction}=this.state;
    const isIntel = view==='intelligence'; const isList = view==='list'; const isIdent = view==='identity';
    const openTabs = this.state.openTabs||[]; const chats = this.state.chats||[];
    const tab=(k,label,active,onClick,onClose)=> h('div',{key:k,onClick,style:{display:'inline-flex',alignItems:'center',gap:6,padding:'5px 10px',minHeight:28,borderRadius:8,cursor:'pointer',fontSize:12.5,fontWeight:active?600:400,whiteSpace:'nowrap',color:active?'var(--core-color-text-primary)':'var(--core-color-text-muted)',background:active?'var(--core-color-state-selected-bg)':'transparent',border:'1px solid '+(active?'var(--core-color-border-default)':'transparent'),flexShrink:0}},
      h('span',{style:{maxWidth:160,overflow:'hidden',textOverflow:'ellipsis'}},label),
      onClose ? h('span',{onClick:(e)=>{e.stopPropagation(); onClose();},'aria-label':'Close '+label,style:{display:'grid',placeItems:'center',width:14,height:14,borderRadius:4,fontSize:12,lineHeight:1,color:'var(--core-color-text-muted)'}},'×') : null);
    // root dropdown — switch between the two workspaces (Intelligence / Identities)
    const rootLabel = isIntel ? 'Intelligence' : 'Identities';
    const rootActive = isList || (isIntel && !this.state.activeChat);
    const rootDrop = h(Menu,{open:!!this.state.rootMenu,onOpenChange:(o)=>this.setState({rootMenu:o})},
      h(MenuTrigger,{asChild:true},
        h('button',{style:{display:'inline-flex',alignItems:'center',gap:6,padding:'5px 10px',minHeight:28,borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontSize:12.5,fontWeight:rootActive?600:400,whiteSpace:'nowrap',color:rootActive?'var(--core-color-text-primary)':'var(--core-color-text-muted)',background:rootActive?'var(--core-color-state-selected-bg)':'transparent',border:'1px solid '+(rootActive?'var(--core-color-border-default)':'transparent'),flexShrink:0}},
          h('span',null,rootLabel),
          h('span',{style:{display:'grid',placeItems:'center',width:14,height:14,transform:'rotate(180deg)',color:'var(--core-color-text-muted)'}}, this.navIcon('chevronUp')))),
      h(MenuContent,{align:'start',themeMode:this.state.theme==='dark'?'dark':'light',style:{minWidth:170}},
        h(MenuItem,{onSelect:()=>self.newChat()},'Intelligence'),
        h(MenuItem,{onSelect:()=>self.setS({view:'list'})},'Identities')));
    const navToggle = this.state.navDrawer ? null : h(IconActionButton,{variant:'quiet','aria-label':'Show navigation',title:'Show navigation',onClick:()=>this.setState({navDrawer:true}),style:{flexShrink:0,marginRight:10}},
      this.navIcon('panelLeft'));
    return h('header',{style:{position:'sticky',top:0,zIndex:5,background:'color-mix(in srgb, var(--core-color-surface-canvas) 88%, transparent)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',borderBottom:'1px solid var(--core-color-border-default)',padding:'9px 28px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:20}},
      h('div',{style:{display:'flex',alignItems:'center',gap:4,minWidth:0,flex:1}},
        navToggle,
        this.state.navDrawer ? null : rootDrop,
        h('div',{style:{display:'flex',alignItems:'center',gap:4,minWidth:0,overflowX:'auto'}},
          ...openTabs.map(id=> tab('id-'+id, self.PROFILES[id].name, isIdent&&self.activeId===id, ()=>self.openIdentity(id), ()=>self.closeTab(id))),
          ...chats.map(c=> tab(c.id, c.title, isIntel&&self.state.activeChat===c.id, ()=>{ self.setState({activeChat:c.id}); self.setS({view:'intelligence'}); }, ()=>self.closeChat(c.id))))),
      h('div',{style:{display:'flex',alignItems:'center',gap:14,flexShrink:0}},
        isIntel && this.state.activeChat
          ? h(ActionButton,{variant:'quiet',onClick:()=>self.newChat(),style:{flexShrink:0}},
              h('span',{style:{fontSize:14,lineHeight:1}},'+'),'Ask something else')
          : null));
  }

  /* ---------- shared hero ---------- */
  identityHero(){
    const h=React.createElement;
    return this.panel({padding:'24px 28px',display:'flex',justifyContent:'space-between',gap:30,position:'relative'},
      h('div',{style:{minWidth:0,flex:1}},
        this.mono('Identity · Verified'),
        h('h1',{style:{fontFamily:'var(--app-font)',fontWeight:600,fontSize:'var(--core-font-size-display-lg)',letterSpacing:'-.02em',lineHeight:1.2,margin:'6px 0 4px',color:'var(--core-color-text-primary)'}},'Vela Logistics, Inc.'),
        h('p',{style:{margin:0,color:'var(--core-color-text-secondary)',fontSize:13.5}},'California · Formed Mar 12, 2019 · ~210 employees · Trucking & logistics'),
        h('div',{style:{display:'flex',flexWrap:'wrap',gap:'16px 32px',marginTop:22,maxWidth:560}},
          ...this.facts.map(([k,v])=> h('div',{key:k,style:{display:'flex',flexDirection:'column',gap:3}}, this.mono(k,{fontSize:10,color:'var(--core-color-text-muted)'}), h('span',{style:{fontSize:13,color:'var(--core-color-text-primary)',fontFamily:'inherit'}},v))))),
      h('div',{style:{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:10,flexShrink:0}},
        this.pill('Active','clear'),
        h('div',{style:{textAlign:'right',marginTop:6}}, this.mono('Network risk',{fontSize:10,color:'var(--core-color-text-muted)'}), h('div',{style:{fontFamily:'var(--app-font)',fontWeight:600,fontSize:'var(--core-font-size-display-md)',lineHeight:1.1,color:'var(--risk-elev)',marginTop:4}},'Elevated')),
        h('div',{style:{textAlign:'right'}}, this.mono('Last decision',{fontSize:10,color:'var(--core-color-text-muted)'}), h('div',{style:{fontSize:12,color:'var(--core-color-text-secondary)',marginTop:3}},'Pending · manual review'))));
  }

  /* =====================================================
     DIRECTION A — LEDGER (time-first)
  ===================================================== */
  timeEvent(v,origIdx,isLast){
    const h=React.createElement; const sel=this.state.timeIdx===origIdx;
    const wt={Routine:'mute',Review:'low',Watch:'watch',Act:'elev'}[v.weight];
    const c=this.RISK[wt].c;
    return h('div',{key:v.v,onClick:()=>this.setS({timeIdx:origIdx}),style:{position:'relative',display:'grid',gridTemplateColumns:'24px 1fr',gap:14,cursor:'pointer',padding:'6px 0'}},
      h('div',{style:{position:'relative',display:'flex',justifyContent:'center'}},
        isLast?null:h('div',{style:{position:'absolute',top:8,bottom:-12,left:'50%',width:1,background:'var(--core-color-border-default)',transform:'translateX(-.5px)'}}),
        h('div',{style:{position:'relative',zIndex:1,width:sel?14:10,height:sel?14:10,borderRadius:'50%',marginTop:5,background:sel?c:'var(--core-color-surface-card)',border:'2px solid '+c,transition:'all .2s var(--core-ease-standard)'}})),
      h('div',{style:{paddingBottom:14}},
        h('div',{style:{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}},
          this.mono(v.date), this.pill(v.weight,wt)),
        h('div',{style:{fontSize:15,marginTop:5,fontWeight:sel?500:400}},v.title),
        sel?h('div',{style:{marginTop:10,animation:'mdFade .25s var(--core-ease-standard)'}},
          h('p',{style:{margin:'0 0 12px',fontSize:13,lineHeight:1.5,color:'var(--core-color-text-secondary)',maxWidth:560}},v.detail),
          h('div',{style:{display:'flex',flexDirection:'column',gap:7,marginBottom:v.matters?12:0}},
            ...v.changes.map((ch,j)=> h('div',{key:j,style:{display:'flex',alignItems:'center',gap:10,fontSize:12.5}},
              h('span',{style:{minWidth:140,color:'var(--core-color-text-muted)',fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.04em',textTransform:'uppercase'}},ch[0]),
              h('span',{style:{color:'var(--core-color-text-muted)',textDecoration:ch[1]==='None'?'none':'line-through'}},ch[1]),
              h('span',{style:{color:'var(--core-color-text-muted)'}},'→'),
              h('span',{style:{color:'var(--core-color-text-primary)',fontWeight:500}},ch[2])))),
          v.matters?h('div',{style:{display:'flex',gap:9,alignItems:'flex-start',padding:'10px 12px',borderRadius:10,background:'color-mix(in srgb, '+c+' 8%, var(--core-color-surface-card))',border:'1px solid color-mix(in srgb, '+c+' 20%, var(--core-color-surface-card))'}},
            h('span',{style:{width:6,height:6,borderRadius:'50%',background:c,marginTop:6,flexShrink:0}}),
            h('div',null, this.mono('Why it matters to you',{color:c,display:'block',marginBottom:3}), h('span',{style:{fontSize:12.5,lineHeight:1.45,color:'var(--core-color-text-secondary)'}},v.why))):null
        ):null));
  }
  /* ---------- policy (Insights) ---------- */
  get STAT(){ return { pass:{c:'var(--risk-clear)',label:'Pass'}, review:{c:'var(--risk-watch)',label:'Review'}, flag:{c:'var(--risk-high)',label:'Flag'}, info:{c:'var(--core-color-text-muted)',label:'Info'} }; }
  statusOf(t){ return this._statusOf ? this._statusOf(t) : (t==='high'||t==='elev'?'flag':t==='watch'?'review':(t==='clear'||t==='low'?'pass':'info')); }
  /* ----- time travel: resolve the answer effective at a point in time ----- */
  parseDate(s){ if(!s) return 0; if(/^\d{2}\.\d{2}\.\d{2}$/.test(s)){ const p=s.split('.').map(Number); return new Date(2000+p[2],p[0]-1,p[1]).getTime(); } const t=Date.parse(s); return isNaN(t)?0:t; }
  get asOfIdx(){ return this.state.asOf==null ? this.versions.length-1 : this.state.asOf; }
  get isLive(){ return this.asOfIdx >= this.versions.length-1; }
  get asOfMs(){ return this.parseDate(this.versions[this.asOfIdx].date); }
  qEffectiveAt(q, asMs){ if(!q.history||!q.history.length) return q;
    const tl=[...q.history.map(x=>({a:x.a,tone:x.tone,insight:x.insight,viz:x.viz,date:x.date})), {a:q.a,tone:q.tone,insight:q.insight,viz:q.viz,date:q.asOf||this.versions[this.versions.length-1].date}];
    tl.sort((x,y)=>this.parseDate(x.date)-this.parseDate(y.date));
    let eff=tl[0]; for(const e of tl){ if(this.parseDate(e.date)<=asMs) eff=e; }
    return Object.assign({}, q, {a:eff.a, tone:eff.tone, insight:eff.insight, viz:eff.viz, _asOfDate:eff.date}); }
  qEffective(q){
    if(this.activeId!=='vela'){ const ov=this.answers[q.t]; if(ov) return Object.assign({}, q, ov);
      if(q.tone==='na'||q.tone==='data') return q;
      return Object.assign({}, q, {a:'Verified', tone:'clear', insight:'Verified against authoritative sources. No exceptions for '+this.nameOf+'.'}); }
    return this.isLive ? q : this.qEffectiveAt(q, this.asOfMs); }
  riskAt(idx){ const P=this.state.policy||[];
    if(this.activeId!=='vela'){ let flag=false,review=false; P.forEach(s=>s.q.forEach(q=>{const st=this.statusOf(this.qEffective(q).tone); if(st==='flag')flag=true; else if(st==='review')review=true;})); return flag?'elev':review?'watch':'clear'; }
    const asMs=this.parseDate(this.versions[idx].date); let flag=false,review=false;
    P.forEach(s=>s.q.forEach(q=>{const st=this.statusOf(this.qEffectiveAt(q,asMs).tone); if(st==='flag')flag=true; else if(st==='review')review=true;})); return flag?'elev':review?'watch':'clear'; }
  secWorst(sec){ let s='pass'; sec.q.forEach(q=>{const st=this.statusOf(this.qEffective(q).tone); if(st==='flag')s='flag'; else if(st==='review'&&s!=='flag')s='review';}); return s; }
  policyStats(){ const P=this.state.policy||[]; let pass=0,review=0,flag=0,total=0; P.forEach(sec=>sec.q.forEach(q=>{const st=this.statusOf(this.qEffective(q).tone); if(st==='info')return; total++; if(st==='pass')pass++; else if(st==='review')review++; else flag++;})); return {pass,review,flag,total,all:P.reduce((n,s)=>n+s.q.length,0)}; }
  policyAttention(){ const P=this.state.policy||[]; const out=[]; P.forEach(sec=>sec.q.forEach((q,i)=>{const st=this.statusOf(this.qEffective(q).tone); if(st==='review'||st==='flag') out.push({sec,q:this.qEffective(q),i,st});})); return out.sort((a,b)=> (a.st==='flag'?0:1)-(b.st==='flag'?0:1)); }

  ansPill(q){ const h=React.createElement;
    if(q.tone==='data') return this.coreBadge(q.a,'status','neutral',null,'compact');
    if(q.tone==='na') return this.coreBadge(q.a,'status','neutral',{background:'transparent',borderStyle:'dashed',color:'var(--core-color-text-muted)'},'compact');
    return this.coreBadge(q.a,'status',this.STATUS_TONE(this.statusOf(q.tone)),null,'compact'); }
  pTone(t){ return (t==='data'||t==='na')?'mute':t; }
  qVersionThread(q,bare){ const h=React.createElement; const hist=q.history; if(!hist||!hist.length) return null;
    const latest=q.asOf||this.versions[this.versions.length-1].date;
    const activeDate = this.isLive ? latest : this.qEffectiveAt(q,this.asOfMs)._asOfDate;
    const cur={date:latest, a:q.a, tone:q.tone, insight:q.insight};
    const rows=[cur, ...hist.slice().reverse()];
    return h('div',{style:bare?null:{borderTop:'1px dashed var(--core-color-border-default)',paddingTop:12,marginTop:2}},
      bare?null:h('div',{style:{display:'flex',alignItems:'center',gap:9,marginBottom:11}},
        this.mono('Answer history',{color:'var(--core-color-text-muted)'}),
        this.pill((hist.length+1)+' versions','mute')),
      h('div',{style:{display:'flex',flexDirection:'column'}}, ...rows.map((r,i)=>{ const rc=this.STAT[this.statusOf(r.tone)].c; const lastr=i===rows.length-1; const active=r.date===activeDate;
        return h('div',{key:i,style:{display:'grid',gridTemplateColumns:'14px 1fr',gap:11,opacity:active?1:.62}},
          h('div',{style:{display:'flex',flexDirection:'column',alignItems:'center'}},
            h('span',{style:{width:9,height:9,borderRadius:'50%',marginTop:4,background:active?rc:'var(--core-color-surface-card)',border:'2px solid '+rc,flexShrink:0}}),
            lastr?null:h('div',{style:{flex:1,width:1,background:'var(--core-color-border-default)',marginTop:4}})),
          h('div',{style:{paddingBottom:lastr?0:13}},
            h('div',{style:{display:'flex',alignItems:'center',gap:9,flexWrap:'wrap'}}, this.mono(r.date), active?this.mono(this.isLive?'Current':'Viewing',{color:rc}):null, this.coreBadge(r.a,'status',this.STATUS_TONE(this.statusOf(r.tone)))),
            h('div',{style:{fontSize:12,lineHeight:1.45,color:'var(--core-color-text-secondary)',marginTop:5}}, r.insight))); })));
  }

  qRow(sec,q,i,last){ const h=React.createElement; const eff=this.qEffective(q); const st=this.statusOf(eff.tone); const sc=this.STAT[st].c;
    const key=sec.id+':'+i; const open=this.state.openQ===key; const force=st==='flag'||st==='review';
    const show=open||force;
    return h('div',{key:i,style:{borderBottom:last?'none':'1px solid var(--core-color-border-default)',paddingLeft:14}},
      h('div',{onClick:()=>this.setState({openQ:open?null:key}),style:{display:'flex',alignItems:'center',gap:14,padding:'12px 16px 12px 0',cursor:'pointer'}},
        h('span',{style:{flex:1,fontSize:13,color:'var(--core-color-text-secondary)',lineHeight:1.4}},q.t),
        q.history?h('span',{title:'Answer changed over time',style:{display:'inline-flex',alignItems:'center',gap:4,fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--core-color-text-muted)'}},'↻ '+(q.history.length+1)):null,
        this.ansPill(eff),
        h('span',{style:{color:'var(--core-color-text-muted)',fontSize:11,width:12,textAlign:'center',transform:open?'rotate(180deg)':'none',transition:'transform .2s'}},'⌄')),
      show?this.qDetail(sec,q,key,eff,sc,force):null);
  }

  attrSource(k){ const s=(k||'').toLowerCase();
    if(/sos|secretary of state|domestic|foreign|registered|good standing|status|entity type|officers/.test(s)) return 'CA / TX SoS';
    if(/irs|tin|tax/.test(s)) return 'IRS';
    if(/address|deliverable|virtual|cmra/.test(s)) return 'USPS · Maps';
    if(/watchlist|sanction|ofac/.test(s)) return 'Sanctions screening';
    if(/naics|industry|category/.test(s)) return 'NAICS · web';
    if(/ucc|secured|lien|lender|collateral/.test(s)) return 'UCC filings';
    if(/owner|ubo|control|beneficial|nguyen|meridian|structure|hops?|undisclosed/.test(s)) return 'BOI · SoS · network';
    if(/network|connected|entities|cluster|elevated|watch|clear|dissolved/.test(s)) return 'Middesk network';
    if(/dob|birth|id |ssn|verification|fraud|sentilink|sigma|people|matched/.test(s)) return 'Identity screening';
    if(/submitted|dba|fbn|application/.test(s)) return 'Application';
    return 'Middesk';
  }
  statusFlagsViz(v,sc,force){ const h=React.createElement;
    const mat=v.rows.filter(r=>r.severity==='material').length;
    const neutralOnly=v.rows.filter(r=>r.severity!=='material'&&r.flags.length).length;
    const clean=v.rows.filter(r=>!r.flags.length).length;
    const row=(r,i)=>{ const nMat=r.flags.filter(f=>f.kind==='material').length; const nNeu=r.flags.filter(f=>f.kind!=='material').length;
      return h('div',{key:i,style:{padding:'12px 14px',borderTop:i===0?'none':'1px solid var(--core-color-border-default)',background:r.severity==='material'?'color-mix(in srgb, var(--risk-high) 5%, transparent)':'transparent'}},
      h('div',{style:{display:'flex',alignItems:'flex-start',gap:12}},
        h('div',{style:{display:'flex',alignItems:'flex-start',gap:10,flex:1,minWidth:0}},
          h('div',{style:{minWidth:0}},
            h('div',{style:{fontSize:13,fontWeight:600,color:'var(--core-color-text-primary)'}},r.name),
            h('div',{style:{fontSize:11.5,color:'var(--core-color-text-muted)',marginTop:2}},r.rel+' · '+r.reg))),
        h('div',{style:{display:'flex',alignItems:'center',gap:6,flexShrink:0}},
          nMat?this.pill(nMat+' flag'+(nMat===1?'':'s'),'high'):null,
          nNeu?this.pill(nNeu+' neutral','mute'):null,
          r.flags.length?null:this.pill('No flags','clear'))),
      r.flags.length?h('div',{style:{display:'flex',flexDirection:'column',gap:6,marginTop:9}}, ...r.flags.map((f,j)=>
        h('div',{key:j,style:{display:'flex',alignItems:'flex-start',gap:8}},
          h('div',{style:{flex:1,minWidth:0}},
            h('div',{style:{fontSize:12,fontWeight:500,color:f.kind==='material'?'var(--core-color-text-primary)':'var(--core-color-text-muted)'}},f.label),
            h('div',{style:{fontSize:11,color:'var(--core-color-text-muted)',lineHeight:1.45,marginTop:1}},f.note)),
          this.pill(f.kind==='material'?'Flag':'Neutral', f.kind==='material'?'high':'mute')))):null); };
    const stat=(n,label,col)=>h('div',{style:{flex:1}}, h('div',{style:{fontFamily:'var(--app-font)',fontWeight:600,fontSize:26,lineHeight:1,color:col}},n), h('div',{style:{fontSize:10.5,color:'var(--core-color-text-muted)',marginTop:4,lineHeight:1.3}},label));
    return h('div',{style:{border:'1px solid var(--core-color-border-default)',borderRadius:'var(--core-radius-card)',background:'var(--core-color-surface-card)',alignSelf:'stretch',overflow:'hidden'}},
      h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,padding:'12px 14px',borderBottom:'1px solid var(--core-color-border-default)',background:'var(--core-color-surface-inset)'}}, this.mono('Adverse status',{color:'var(--core-color-text-muted)'}), h('span',{style:{fontSize:11,color:'var(--core-color-text-muted)'}}, h('span',{style:{fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--core-color-text-muted)',marginRight:6}},'Applied in'), v.jurisdiction)),
      v.rows.length?h('div',{style:{display:'flex',gap:14,padding:'13px 14px',borderBottom:'1px solid var(--core-color-border-default)'}}, stat(mat,'Material flags','var(--risk-high)'), stat(neutralOnly,'Neutral lifecycle only','var(--core-color-text-muted)'), stat(clean,'No flags','var(--core-color-text-primary)')):null,
      v.rows.length?h('div',null, ...v.rows.map(row)):h('div',{style:{padding:'18px 14px',fontSize:12,color:'var(--core-color-text-muted)'}},'No connected entities to screen at this point in time.'));
  }
  mediaViz(v,sc,force){ const h=React.createElement;
    const RES={true_positive:{lab:'True positive',tone:'high'},needs_review:{lab:'Needs review',tone:'watch'},false_positive:{lab:'False positive',tone:'mute'}};
    const quoteEl=(m)=>{ const h=React.createElement; if(!m.match||m.quote.indexOf(m.match)<0) return ['“'+m.quote+'”'];
      const parts=m.quote.split(m.match);
      const out=['“'+parts[0]]; parts.slice(1).forEach((p,j)=>{ out.push(h('mark',{key:j,style:{background:'color-mix(in srgb, var(--risk-high) 18%, var(--core-color-surface-card))',color:'var(--core-color-text-primary)',fontWeight:600,fontStyle:'normal',padding:'0 2px',borderRadius:3}},m.match)); out.push(p); });
      out[out.length-1]=out[out.length-1]+'”'; return out; };
    const item=(m,i)=>h('a',{key:i,href:m.url,target:'_blank',rel:'noopener',style:{display:'block',textDecoration:'none',padding:'13px 14px',borderTop:i===0?'none':'1px solid var(--core-color-border-default)'}},
      h('div',{style:{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:6}},
        h('span',{style:{fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--core-color-text-primary)',fontWeight:600}},m.outlet),
        h('span',{style:{fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.04em',color:'var(--core-color-text-muted)'}},m.date),
        h('span',{style:{marginLeft:'auto'}}), this.pill(RES[m.resolution].lab, RES[m.resolution].tone)),
      h('div',{style:{display:'flex',gap:9,alignItems:'flex-start'}},
        h('div',{style:{flex:1,minWidth:0}},
          h('div',{style:{fontSize:13,fontWeight:600,color:'var(--core-color-text-primary)',lineHeight:1.35,marginBottom:5}}, m.title, h('span',{style:{color:'var(--core-color-text-muted)',marginLeft:6,fontSize:11,fontWeight:400}},'↗')),
          h('div',{style:{fontSize:12,lineHeight:1.5,color:'var(--core-color-text-secondary)',fontStyle:'italic',paddingLeft:9,borderLeft:'2px solid var(--core-color-border-default)'}}, ...quoteEl(m)),
          m.match?h('div',{style:{display:'flex',alignItems:'center',gap:6,marginTop:8,fontSize:11,color:'var(--core-color-text-muted)'}}, h('span',{style:{fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--core-color-text-muted)'}},'Linked via'), h('span',{style:{width:8,height:8,borderRadius:'50%',background:'var(--risk-high)',flexShrink:0}}), h('span',{style:{fontWeight:600,color:'var(--core-color-text-primary)'}},m.match), m.matchType?h('span',{style:{color:'var(--core-color-text-muted)'}},'· '+m.matchType):null):null,
          h('div',{style:{display:'flex',gap:6,flexWrap:'wrap',marginTop:9,alignItems:'center'}},
            ...m.risks.map(r=>h('span',{key:r,style:{fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.03em',textTransform:'uppercase',color:'var(--core-color-text-muted)',background:'var(--core-color-surface-card)',border:'1px solid var(--core-color-border-default)',padding:'2px 7px',borderRadius:5}},r)),
            h('span',{style:{fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.03em',textTransform:'uppercase',color:'var(--risk-high)'}},'● '+m.sentiment),
            h('span',{style:{marginLeft:'auto',fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.03em',textTransform:'uppercase',color:'var(--core-color-text-muted)'}},'Match '+m.score)))));
    return h('div',{style:{border:'1px solid var(--core-color-border-default)',borderRadius:'var(--core-radius-card)',background:'var(--core-color-surface-card)',alignSelf:'stretch',overflow:'hidden'}},
      h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,padding:'12px 14px',borderBottom:'1px solid var(--core-color-border-default)',background:'var(--core-color-surface-inset)'}}, this.mono('Adverse media',{color:'var(--core-color-text-muted)'}), h('span',{style:{fontSize:11,color:'var(--core-color-text-muted)'}}, v.items.length+' article'+(v.items.length===1?'':'s')+' shown')),
      ...v.items.map(item));
  }
  resolutionViz(v,sc,force){ const h=React.createElement;
    const COL={fp:'var(--core-color-border-default)', tp:'var(--risk-high)', review:'var(--risk-watch)'};
    const stripe='repeating-linear-gradient(45deg,var(--core-color-surface-sunken),var(--core-color-surface-sunken) 5px,var(--core-color-surface-card) 5px,var(--core-color-surface-card) 10px)';
    const bar=h('div',{style:{display:'flex',height:26,borderRadius:7,overflow:'hidden',border:'1px solid var(--core-color-border-default)'}}, ...v.bands.map((b,i)=>
      h('div',{key:i,title:b.label+' · '+b.count,style:{flex:b.count,background:b.status==='fp'?stripe:COL[b.status],display:'flex',alignItems:'center',justifyContent:'center',borderRight:i<v.bands.length-1?'1px solid var(--core-color-surface-card)':'none'}},
        h('span',{style:{fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,fontWeight:600,color:b.status==='fp'?'var(--core-color-text-muted)':'var(--core-color-text-inverse)'}},b.count))));
    const row=(b,i)=>h('div',{key:i,style:{display:'flex',alignItems:'flex-start',gap:12,padding:'11px 0',borderTop:i===0?'none':'1px solid var(--core-color-border-default)'}},
      h('span',{style:{width:9,height:9,borderRadius:'50%',flexShrink:0,marginTop:5,background:b.status==='fp'?'var(--core-color-border-default)':COL[b.status]}}),
      h('div',{style:{flex:1,minWidth:0}},
        h('div',{style:{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}, h('span',{style:{fontSize:13,fontWeight:600,color:b.status==='fp'?'var(--core-color-text-muted)':'var(--core-color-text-primary)'}},b.label), b.band?h('span',{style:{fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--core-color-text-muted)',background:'var(--core-color-surface-card)',border:'1px solid var(--core-color-border-default)',padding:'2px 6px',borderRadius:5}},'Score '+b.band):null),
        h('div',{style:{fontSize:11.5,color:'var(--core-color-text-muted)',marginTop:2,lineHeight:1.45}},b.note)),
      h('div',{style:{fontFamily:'var(--app-font)',fontWeight:600,fontSize:27,color:b.status==='fp'?'var(--core-color-text-muted)':'var(--core-color-text-primary)',lineHeight:1}},b.count));
    return h('div',{style:{border:'1px solid var(--core-color-border-default)',borderRadius:'var(--core-radius-card)',background:'var(--core-color-surface-card)',padding:'14px 16px',alignSelf:'stretch'}},
      h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginBottom:11}}, this.mono('Match resolution',{color:'var(--core-color-text-muted)'}), h('span',{style:{fontSize:11,color:'var(--core-color-text-muted)'}}, h('span',{style:{fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--core-color-text-muted)',marginRight:6}},'Screened'), v.total+' candidates')),
      bar,
      h('div',{style:{marginTop:6}}, ...v.bands.map(row)));
  }
  uboViz(v,sc,force){ const h=React.createElement;
    const COL={disclosed:'var(--core-color-brand-primary)', undisclosed:'var(--risk-high)', unaccounted:'var(--core-color-border-default)'};
    const stripe='repeating-linear-gradient(45deg,var(--core-color-surface-sunken),var(--core-color-surface-sunken) 5px,var(--core-color-surface-card) 5px,var(--core-color-surface-card) 10px)';
    const segs=[...v.owners.map(o=>({pct:o.pct,status:o.status,name:o.name})), ...(v.gap?[{pct:v.gap.pct,status:'unaccounted',name:v.gap.label}]:[])];
    const bar=h('div',{style:{display:'flex',height:26,borderRadius:7,overflow:'hidden',border:'1px solid var(--core-color-border-default)'}}, ...segs.map((s,i)=>
      h('div',{key:i,title:s.name+' · '+s.pct+'%',style:{width:s.pct+'%',minWidth:s.pct<6?18:0,background:s.status==='unaccounted'?stripe:COL[s.status],display:'flex',alignItems:'center',justifyContent:'center',borderRight:i<segs.length-1?'1px solid var(--core-color-surface-card)':'none'}},
        h('span',{style:{fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,fontWeight:600,color:s.status==='unaccounted'?'var(--core-color-text-muted)':'var(--core-color-text-inverse)'}}, s.pct>=9?s.pct+'%':''))));
    const ownerRow=(o,i,first)=>h('div',{key:'o'+i,style:{display:'flex',alignItems:'flex-start',gap:12,padding:'11px 10px',margin:'0 -10px',borderRadius:o.status==='undisclosed'?8:0,borderTop:first?'none':'1px solid var(--core-color-border-default)',background:o.status==='undisclosed'?'color-mix(in srgb, var(--risk-high) 7%, var(--core-color-surface-card))':'transparent'}},
      h('div',{style:{fontFamily:'var(--app-font)',fontWeight:600,fontSize:27,color:o.status==='unaccounted'?'var(--core-color-text-muted)':'var(--core-color-text-primary)',lineHeight:1,width:56,flexShrink:0}}, o.pct+'%'),
      h('div',{style:{flex:1,minWidth:0}},
        h('div',{style:{fontSize:13,fontWeight:600,color:o.status==='unaccounted'?'var(--core-color-text-muted)':'var(--core-color-text-primary)'}},o.name),
        h('div',{style:{fontSize:11.5,color:'var(--core-color-text-muted)',marginTop:2,lineHeight:1.45}}, (o.kind==='entity'?'Business entity':o.kind==='individual'?'Individual':'')+(o.kind&&o.note?' · ':'')+(o.note||''))),
      h('div',{style:{display:'flex',alignItems:'flex-start',justifyContent:'flex-end',gap:10,flexShrink:0}},
        this.pill(o.status==='undisclosed'?'Undisclosed':o.status==='unaccounted'?'No owner named':'Disclosed', o.status==='undisclosed'?'high':o.status==='unaccounted'?'mute':'clear')));
    const rows=v.owners.map((o,i)=>ownerRow(o,i,i===0));
    if(v.gap) rows.push(ownerRow({name:v.gap.label,pct:v.gap.pct,kind:'entity',status:'unaccounted',note:v.gap.note}, 'gap', false));
    return h('div',{style:{border:'1px solid var(--core-color-border-default)',borderRadius:'var(--core-radius-card)',background:'var(--core-color-surface-card)',padding:'14px 16px',alignSelf:'stretch'}},
      h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginBottom:11}}, this.mono('Beneficial ownership',{color:'var(--core-color-text-muted)'}), v.applicant?h('span',{style:{fontSize:11,color:'var(--core-color-text-muted)',textAlign:'right'}}, h('span',{style:{fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--core-color-text-muted)',marginRight:6}},'On the application'), v.applicant):null),
      bar,
      h('div',{style:{marginTop:6}}, ...rows));
  }
  qDetail(sec,q,key,eff,sc,force){ const h=React.createElement;
    const tab=(this.state.qTab||{})[key] || 'attrs';
    const hasHist=!!(q.history&&q.history.length);
    const ra=q.attrs||sec.relAttrs||[];
    const setTab=(v)=>this.setState({qTab:{...(this.state.qTab||{}),[key]:v}});
    // @core SegmentedControl (design-system/core/SegmentedControl.tsx)
    const detailToggle=h(SegmentedControl,{size:'sm',value:tab,onValueChange:(v)=>{ if(v) setTab(v); },'aria-label':'Question detail view'},
      h(SegmentedControlItem,{value:'attrs'},'Attributes'),
      h(SegmentedControlItem,{value:'history',disabled:!hasHist}, hasHist?('History · '+(q.history.length+1)):'No history'));
    const insight=h('div',{style:{display:'flex',gap:9,alignItems:'flex-start',padding:'14px 16px'}},
      h('span',{style:{width:6,height:6,borderRadius:'50%',background:sc,marginTop:6,flexShrink:0}}),
      h('div',{style:{flex:1,minWidth:0}},
        this.mono('Insight',{color:'var(--core-color-text-muted)',display:'block',marginBottom:4}),
        h('div',{style:{fontSize:13,lineHeight:1.55,color:'var(--core-color-text-secondary)'}},eff.insight),
        h('div',{style:{display:'flex',gap:6,flexWrap:'wrap',marginTop:10,alignItems:'center'}}, this.mono('Sources',{color:'var(--core-color-text-muted)'}), ...(q.ev||[]).map(e=>h('span',{key:e,style:{fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--core-color-text-muted)',background:'var(--core-color-surface-card)',border:'1px solid var(--core-color-border-default)',padding:'3px 7px',borderRadius:6}},e)))));
    const attrsView=ra.length?h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(min(210px, 100%), 1fr))',gap:7}}, ...ra.map((a,j)=>
      h('div',{key:j,style:{display:'flex',flexDirection:'column',gap:3,padding:'7px 11px',borderRadius:8,background:'var(--core-color-surface-card)',border:'1px solid var(--core-color-border-default)',minWidth:0,gridColumn:(ra.length%2===1&&j===ra.length-1)?'1 / -1':'auto'}},
        h('div',{style:{display:'flex',flexDirection:'column',gap:2}},
          h('span',{style:{fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--core-color-text-muted)'}},a.k),
          h('span',{style:{fontSize:12,color:'var(--core-color-text-primary)',fontWeight:500}},a.v)),
        h('div',{style:{display:'flex',flexWrap:'wrap',gap:'3px 8px'}}, ...[].concat(a.s||this.attrSource(a.k)).map((src,si)=>h('span',{key:si,style:{display:'inline-flex',alignItems:'center',gap:4,fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.03em',textTransform:'uppercase',color:'var(--core-color-text-muted)'}}, h('span',{style:{width:4,height:4,borderRadius:'50%',background:'var(--core-color-border-default)'}}), src))))))
      :h('div',{style:{fontSize:12,color:'var(--core-color-text-muted)',lineHeight:1.5}},'No specific data attributes recorded for this question.');
    const detailBody=(tab==='history'&&hasHist)?this.qVersionThread(q,true):attrsView;
    const card=h('div',{style:{border:'1px solid var(--core-color-border-default)',borderRadius:'var(--core-radius-card)',overflow:'hidden',background:'var(--core-color-surface-card)'}},
      insight,
      h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,rowGap:6,flexWrap:'wrap',padding:'9px 14px',borderTop:'1px solid var(--core-color-border-default)',background:'var(--core-color-surface-inset)'}},
        detailToggle,
        this.mono((tab==='history'&&hasHist)?'Answer over time':(ra.length+' attribute'+(ra.length===1?'':'s')),{color:'var(--core-color-text-muted)'})),
      h('div',{style:{padding:'14px 16px'}}, detailBody));
    const twoCol='repeat(auto-fit, minmax(340px, 1fr))';
    const wrap=(eff.viz&&eff.viz.type==='ubo')
      ? h('div',{style:{display:'grid',gridTemplateColumns:twoCol,gap:14,alignItems:'start'}}, this.uboViz(eff.viz,sc,force), card)
      : (eff.viz&&eff.viz.type==='resolution')
      ? h('div',{style:{display:'grid',gridTemplateColumns:twoCol,gap:14,alignItems:'start'}}, this.resolutionViz(eff.viz,sc,force), card)
      : (eff.viz&&eff.viz.type==='media')
      ? h('div',{style:{display:'grid',gridTemplateColumns:twoCol,gap:14,alignItems:'start'}}, this.mediaViz(eff.viz,sc,force), card)
      : (eff.viz&&eff.viz.type==='statusflags')
      ? h('div',{style:{display:'grid',gridTemplateColumns:twoCol,gap:14,alignItems:'start'}}, this.statusFlagsViz(eff.viz,sc,force), card)
      : card;
    return h('div',{style:{padding:'0 16px 16px 0',animation:'mdFade .2s var(--core-ease-standard)'}}, wrap);
  }

  relAttrsStrip(sec){ const h=React.createElement; const ra=sec.relAttrs||[]; if(!ra.length) return null;
    return h('div',{style:{margin:'12px 0 6px',padding:'13px 15px',borderRadius:'var(--core-radius-card)',background:'var(--core-color-surface-inset)',border:'1px solid var(--core-color-border-default)'}},
      h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginBottom:11}},
        this.mono('Evaluated against · relevant data attributes',{color:'var(--core-color-text-muted)'}),
        h('button',{onClick:()=>this.setState({attrsOpen:true}),style:{background:'none',border:0,color:'var(--core-color-text-muted)',cursor:'pointer',fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.04em',textTransform:'uppercase'}},'All attributes →')),
      h('div',{style:{display:'flex',flexWrap:'wrap',gap:8}}, ...ra.map((a,i)=>
        h('div',{key:i,style:{display:'inline-flex',alignItems:'baseline',gap:7,padding:'6px 11px',borderRadius:9,background:'var(--core-color-surface-card)',border:'1px solid var(--core-color-border-default)'}},
          h('span',{style:{fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--core-color-text-muted)'}},a.k),
          h('span',{style:{fontSize:12.5,color:'var(--core-color-text-primary)',fontWeight:500}},a.v)))));
  }
  hasFindings(sec){ return sec.q.some(q=>{const s=this.statusOf(this.qEffective(q).tone);return s==='review'||s==='flag';}); }
  get polF(){ return this.state.polFilter || 'all'; }
  polMatch(q,f){ const s=this.statusOf(this.qEffective(q).tone); f=f||this.polF; if(f==='attn')return s==='review'||s==='flag'; if(f==='all')return true; return s===f; }
  secMatches(sec,f){ return sec.q.some(q=>this.polMatch(q,f)); }
  isSecOpen(sec){ const o=this.state.secOpen||{}; if(sec.id in o) return o[sec.id]; const f=this.polF; return f==='all' ? this.hasFindings(sec) : this.secMatches(sec,f); }
  toggleSec(sec){ const o=this.state.secOpen||{}; this.setState({secOpen:{...o,[sec.id]:!this.isSecOpen(sec)}}); }
  secRow(sec){ const h=React.createElement; const worst=this.secWorst(sec); const wc=this.STAT[worst].c; const open=this.isSecOpen(sec);
    const rev=sec.q.filter(q=>this.statusOf(this.qEffective(q).tone)==='review').length; const flg=sec.q.filter(q=>this.statusOf(this.qEffective(q).tone)==='flag').length;
    const clr=sec.q.filter(q=>this.statusOf(this.qEffective(q).tone)==='pass').length;
    const sevRank=(q)=>{const s=this.statusOf(this.qEffective(q).tone);return s==='flag'?0:s==='review'?1:2;};
    const isFilter=this.polF!=='all'; const showAll=(this.state.secAll||{})[sec.id];
    const full=sec.q.map((q,i)=>[q,i]).sort((a,b)=>sevRank(a[0])-sevRank(b[0]));
    const matched=full.filter(([q])=>this.polMatch(q));
    const rows=(!isFilter||showAll)?full:matched;
    const hidden=full.length-matched.length;
    const toggleAll=()=>{ const o=this.state.secAll||{}; this.setState({secAll:{...o,[sec.id]:!showAll}}); };
    return h('div',{key:sec.id,id:'pol-'+sec.id,style:{borderBottom:'1px solid var(--core-color-border-default)'}},
      h('button',{onClick:()=>this.toggleSec(sec),style:{display:'flex',alignItems:'center',gap:14,width:'100%',padding:'16px 22px',border:0,background:open?'var(--core-color-surface-inset)':'var(--core-color-surface-card)',cursor:'pointer',textAlign:'left',fontFamily:'inherit'}},
        h('div',{style:{flex:1,minWidth:0}}, h('div',{style:{fontSize:14,fontWeight:500,color:'var(--core-color-text-primary)'}},sec.name), this.mono(sec.attr+' · '+sec.q.length+' questions')),
        flg?this.coreBadge(flg+' flag','status','danger'):null,
        rev?this.coreBadge(rev+' review','status','warning'):null,
        clr?this.coreBadge(clr+' clear','status','success'):null,
        h('span',{style:{color:'var(--core-color-text-muted)',fontSize:13,marginLeft:4,transform:open?'rotate(180deg)':'none',transition:'transform .2s'}},'⌄')),
      sec.summary?h('div',{style:{padding:'0 22px 16px 22px',background:open?'var(--core-color-surface-inset)':'var(--core-color-surface-card)'}}, h('div',{style:{padding:'14px 16px',background:'color-mix(in srgb, '+wc+' 5%, var(--core-color-surface-card))',borderRadius:'var(--core-radius-card)',border:'1px solid color-mix(in srgb, '+wc+' 22%, var(--core-color-surface-card))'}}, this.mono('Summary',{display:'block',marginBottom:5,color:wc}), h('p',{style:{margin:0,fontSize:13,lineHeight:1.6,color:'var(--core-color-text-secondary)',textWrap:'pretty'}},sec.summary))):null,
      open?h('div',{style:{padding:'2px 22px 8px',animation:'mdFade .2s var(--core-ease-standard)'}}, ...rows.map(([q,i],k)=>this.qRow(sec,q,i,k===rows.length-1)),
        (isFilter&&hidden>0)?h(ActionButton,{variant:'secondary',onClick:toggleAll,style:{marginTop:6}}, showAll?('Show only matches'):('Show all '+full.length+' checks'), h('span',{style:{fontSize:11}}, showAll?'−':'+')):null):null);
  }

  policyHeader(){ const h=React.createElement; const s=this.policyStats();
    const rec = s.flag? {t:'Manual review',tone:'elev'} : s.review? {t:'Review recommended',tone:'watch'} : {t:'Clear to approve',tone:'clear'};
    const stat=(n,label,c)=> h('div',null, h('div',{style:{fontFamily:'var(--app-font)',fontWeight:600,fontSize:38,lineHeight:1,color:c}},n), this.mono(label,{display:'block',marginTop:3}));
    return h('div',{style:{background:'var(--core-color-surface-card)',border:'1px solid var(--core-color-border-default)',borderRadius:'var(--core-radius-card)',padding:'24px 28px',display:'flex',justifyContent:'space-between',gap:30,flexWrap:'wrap',alignItems:'center'}},
      h('div',null,
        h('h2',{style:{fontFamily:'var(--app-font)',fontWeight:600,fontSize:26,letterSpacing:'-.01em',margin:'0 0 6px'}},'Insights'),
        h('div',{style:{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}, this.pill(rec.t,rec.tone))),
      h('div',{style:{display:'flex',gap:32}}, stat(s.pass,'Pass','var(--risk-clear)'), stat(s.review,'Review','var(--risk-watch)'), stat(s.flag,'Flag','var(--risk-high)')));
  }

  scrollToSection(id){ setTimeout(()=>{ const sc=document.getElementById('mid-scroll'); const el=document.getElementById('pol-'+id); if(sc&&el){ const r=el.getBoundingClientRect(), sr=sc.getBoundingClientRect(); sc.scrollTo({top: sc.scrollTop + (r.top - sr.top) - 18, behavior:'smooth'}); } }, 90); }

  attentionPanel(){ const h=React.createElement; const items=this.policyAttention();
    const groups={}, order=[];
    items.forEach(it=>{ if(!groups[it.sec.id]){ groups[it.sec.id]={sec:it.sec,list:[]}; order.push(it.sec.id); } groups[it.sec.id].list.push(it); });
    return this.panel({}, this.panelHead('Needs your attention', this.mono(items.length+' findings · '+order.length+' of '+this.state.policy.length+' sections')),
      h('div',{style:{padding:'4px 0'}}, ...order.map((sid,gi)=>{ const g=groups[sid]; const worst=this.secWorst(g.sec); const wc=this.STAT[worst].c;
        return h('div',{key:sid,style:{borderBottom:gi<order.length-1?'1px solid var(--core-color-border-default)':'none',padding:'4px 0 10px'}},
          h('button',{onClick:()=>{ this.setState({openSec:g.sec.id,openQ:null,attnOnly:false}); this.scrollToSection(g.sec.id); },style:{display:'flex',alignItems:'center',gap:12,width:'100%',padding:'12px 22px 6px',border:0,background:'transparent',cursor:'pointer',textAlign:'left',fontFamily:'inherit'}},
            h('span',{style:{width:8,height:8,borderRadius:'50%',background:wc,flexShrink:0}}),
            h('span',{style:{fontSize:13.5,fontWeight:500,flex:1,color:'var(--core-color-text-primary)'}},g.sec.name),
            this.mono(g.list.length+(g.list.length>1?' findings':' finding'),{color:'var(--core-color-text-muted)'}),
            h('span',{style:{color:'var(--core-color-text-muted)',fontSize:11.5}},'View in policy →')),
          h('div',{style:{padding:'2px 22px 0 42px',display:'flex',flexDirection:'column',gap:7}}, ...g.list.map((it,k)=>{ const sc=this.STAT[it.st].c;
            return h('button',{key:k,onClick:()=>{ this.setState({openSec:g.sec.id,openQ:g.sec.id+':'+it.i,attnOnly:false}); this.scrollToSection(g.sec.id); },style:{display:'flex',alignItems:'center',gap:11,width:'100%',padding:'9px 12px',border:'1px solid var(--core-color-border-default)',borderLeft:'2px solid '+sc,borderRadius:9,background:'var(--core-color-surface-card)',cursor:'pointer',textAlign:'left',fontFamily:'inherit'}},
              h('span',{style:{flex:1,minWidth:0,fontSize:12.5,color:'var(--core-color-text-secondary)',lineHeight:1.35}},it.q.t),
              this.ansPill(it.q)); }))); })));
  }

  policyExperience(){ const h=React.createElement;
    if(!this.state.policy) return h('div',{style:{padding:'60px',textAlign:'center',color:'var(--core-color-text-muted)',fontSize:14}},'Loading policy…');
    const P=this.state.policy; const f=this.polF; const findingsSecs=P.filter(s=>this.hasFindings(s)); const cleanSecs=P.filter(s=>!this.hasFindings(s));
    const s=this.policyStats();
    const rec = s.flag? {t:'Manual review',tone:'elev'} : s.review? {t:'Review recommended',tone:'watch'} : {t:'Clear to approve',tone:'clear'};
    const tg=(label,val,c,n)=>h(SegmentedControlItem,{key:val,value:val,icon:c?h('span',{style:{width:6,height:6,borderRadius:'50%',background:c,flexShrink:0}}):null},
      label, n!=null?h('span',{style:{marginLeft:5,fontWeight:600}},n):null);
    const toggle=h(SegmentedControl,{size:'sm',value:f,onValueChange:(v)=>this.setState({polFilter:v}),'aria-label':'Filter policy checks'},
      tg('All','all',null,P.reduce((n,s)=>n+s.q.length,0)), tg('Pass','pass','var(--risk-clear)',s.pass), tg('Review','review','var(--risk-watch)',s.review), tg('Flag','flag','var(--risk-high)',s.flag));
    return this.panel({},
      this.panelHead('Insights', toggle),
      // sections
      h('div',null,
        ...(f==='attn'
          ? findingsSecs.map(sec=>this.secRow(sec))
          : f==='all'
            ? [...findingsSecs.map(sec=>this.secRow(sec)),
               cleanSecs.length?h('div',{key:'div',style:{padding:'11px 22px',background:'var(--core-color-surface-inset)',borderBottom:'1px solid var(--core-color-border-default)'}}, this.mono('Cleared · '+cleanSecs.length+' sections, no findings',{color:'var(--core-color-text-muted)'})):null,
               ...cleanSecs.map(sec=>this.secRow(sec))]
            : (()=>{ const secs=P.filter(s=>this.secMatches(s,f)); return secs.length?secs.map(sec=>this.secRow(sec)):[h('div',{key:'none',style:{padding:'22px',textAlign:'center',color:'var(--core-color-text-muted)',fontSize:13}},'No '+f+' questions')]; })())));
  }

  policySummaryCard(){ const h=React.createElement; if(!this.state.policy) return this.panel({}, this.panelHead('Onboarding policy'), h('div',{style:{padding:'24px',color:'var(--core-color-text-muted)',fontSize:13}},'Loading…'));
    const s=this.policyStats(); const items=this.policyAttention().slice(0,3);
    const mini=(n,label,c)=> h('div',{style:{display:'flex',alignItems:'baseline',gap:6}}, h('span',{style:{fontFamily:'var(--app-font)',fontWeight:600,fontSize:22,color:c,lineHeight:1}},n), this.mono(label));
    return this.panel({}, this.panelHead('Questions that matter', this.mono('Onboarding policy')),
      h('div',{style:{padding:'16px 22px',borderBottom:'1px solid var(--core-color-border-default)',display:'flex',gap:24,flexWrap:'wrap'}}, mini(s.pass,'pass','var(--risk-clear)'), mini(s.review,'review','var(--risk-watch)'), mini(s.flag,'flag','var(--risk-high)')),
      h('div',{style:{padding:'6px 0'}}, ...items.map((it,i)=>{ const sc=this.STAT[it.st].c;
        return h('button',{key:i,onClick:()=>this.setS({direction:'C',view:'identity'}),style:{display:'flex',alignItems:'flex-start',gap:11,width:'100%',padding:'12px 22px',border:0,borderBottom:'1px solid var(--core-color-border-default)',background:'transparent',cursor:'pointer',textAlign:'left',fontFamily:'inherit'}},
          h('span',{style:{width:7,height:7,borderRadius:'50%',background:sc,marginTop:5,flexShrink:0}}),
          h('div',{style:{flex:1,minWidth:0}}, h('div',{style:{fontSize:12.5,color:'var(--core-color-text-primary)'}},it.q.t), h('div',{style:{fontSize:11.5,color:sc,marginTop:2}},it.q.a))); })),
      h('button',{onClick:()=>this.setS({direction:'C',view:'identity'}),style:{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'13px 22px',border:0,background:'transparent',cursor:'pointer',fontFamily:'inherit',color:'var(--core-color-text-primary)',fontSize:13}},'Open full policy evaluation', h('span',null,'→')));
  }

  questionsCard(){
    const h=React.createElement;
    return this.panel({}, this.panelHead('Questions that matter', this.mono('Policy · KYB')),
      h('div',{style:{padding:'6px 22px 16px'}}, ...this.questions.map((q,i)=>
        h('div',{key:i,style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'11px 0',borderBottom:i<this.questions.length-1?'1px solid var(--core-color-border-default)':'none'}},
          h('span',{style:{fontSize:13,color:'var(--core-color-text-secondary)'}},q.q), this.pill(q.a,q.tone)))));
  }
  watchingCard(){
    const h=React.createElement;
    return this.panel({}, this.panelHead('What to watch'),
      h('div',{style:{padding:'14px 18px 18px',display:'flex',flexDirection:'column',gap:10}}, ...this.watch.map((w,i)=>{
        const c=this.RISK[w.tone].c;
        return h('button',{key:i,onClick:()=>this.setS({view:'intelligence'}),style:{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:'var(--core-radius-card)',border:'1px solid color-mix(in srgb, '+c+' 22%, var(--core-color-surface-card))',background:'color-mix(in srgb, '+c+' 7%, var(--core-color-surface-card))',cursor:'pointer',textAlign:'left',width:'100%'}},
          h('span',{style:{width:8,height:8,borderRadius:'50%',background:c,flexShrink:0}}),
          h('div',{style:{flex:1,minWidth:0}}, h('div',{style:{fontSize:13,fontWeight:500}},w.label), h('div',{style:{fontSize:11.5,color:'var(--core-color-text-muted)',marginTop:2}},w.sub)),
          h('span',{style:{color:c,fontSize:14}},'→'));
      })));
  }
  decisionLedger(){
    const h=React.createElement;
    return this.panel({}, this.panelHead('Decision history', this.mono(this.decisions.length+' decisions · versioned')),
      h('div',{style:{padding:'4px 0'}}, ...this.decisions.map((d,i)=>
        h('div',{key:i,style:{display:'grid',gridTemplateColumns:'120px 1fr auto',gap:18,alignItems:'start',padding:'16px 22px',borderBottom:i<this.decisions.length-1?'1px solid var(--core-color-border-default)':'none'}},
          h('div',null, this.mono(d.date), h('div',{style:{fontSize:11.5,color:'var(--core-color-text-muted)',marginTop:5}},d.mode)),
          h('div',null, h('div',{style:{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}, h('span',{style:{fontSize:14,fontWeight:500}},d.title), this.pill(d.outcome,d.tone)),
            h('p',{style:{margin:'6px 0 0',fontSize:12.5,lineHeight:1.5,color:'var(--core-color-text-secondary)',maxWidth:620}},d.why)),
          h('div',{style:{textAlign:'right',whiteSpace:'nowrap'}}, h('div',{style:{fontSize:12.5,color:'var(--core-color-text-primary)'}},d.who), this.mono(d.sources+' sources',{display:'block',marginTop:4}))))));
  }

  /* ---------- latest decision + history drawer (decisions demoted from first-class) ---------- */
  lastDecisionCard(){ const h=React.createElement; const asMs=this.asOfMs; const avail=this.decisions.filter(d=>this.parseDate(d.date)<=asMs); const d=avail[0]||this.decisions[this.decisions.length-1]; const c=this.RISK[d.tone].c; const older=Math.max(0,avail.length-1);
    return this.panel({}, this.panelHead('Latest decision',
      h('button',{onClick:()=>this.setState({decisionsOpen:true}),style:{display:'inline-flex',alignItems:'center',gap:7,padding:'6px 11px',borderRadius:8,border:'1px solid var(--core-color-border-default)',background:'var(--core-color-surface-card)',cursor:'pointer',fontSize:12,color:'var(--core-color-text-secondary)',fontFamily:'inherit'}}, 'History ('+avail.length+')', h('span',{style:{color:'var(--core-color-text-muted)'}},'→'))),
      h('div',{style:{padding:'18px 22px'}},
        h('div',{style:{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}, this.mono(d.date), this.pill(d.outcome,d.tone)),
        h('div',{style:{fontSize:16,fontWeight:500,margin:'8px 0 6px'}},d.title),
        h('p',{style:{margin:0,fontSize:13,lineHeight:1.55,color:'var(--core-color-text-secondary)'}},d.why),
        h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:14,paddingTop:14,borderTop:'1px solid var(--core-color-border-default)'}},
          h('div',{style:{display:'flex',flexDirection:'column'}}, this.mono(d.mode), h('span',{style:{fontSize:12.5,color:'var(--core-color-text-primary)',marginTop:3}},d.who)),
          this.mono(d.sources+' sources'))));
  }
  decisionDrawer(){ const h=React.createElement; if(!this.state.decisionsOpen) return null;
    return h('div',{style:{position:'fixed',inset:0,zIndex:50,display:'flex',justifyContent:'flex-end'}},
      h('div',{onClick:()=>this.setState({decisionsOpen:false}),style:{position:'absolute',inset:0,background:'var(--core-color-overlay-scrim)',animation:'mdGrow .2s ease'}}),
      h('div',{style:{position:'relative',width:480,maxWidth:'92vw',height:'100%',background:'var(--core-color-surface-card)',boxShadow:'var(--core-color-elevation-drawer)',display:'flex',flexDirection:'column',animation:'mdSlide .28s var(--core-ease-emphasized)'}},
        h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid var(--core-color-border-default)'}},
          h('div',null, this.mono('Persisted & versioned'), h('div',{style:{fontFamily:'var(--app-font)',fontWeight:600,fontSize:22,marginTop:4}},'Decision history')),
          h(IconActionButton,{variant:'secondary',size:'standard','aria-label':'Close',onClick:()=>this.setState({decisionsOpen:false}),style:{fontSize:16,color:'var(--core-color-text-muted)'}},'✕')),
        h('div',{style:{flex:1,overflowY:'auto',padding:'8px 0'}}, ...this.decisions.map((d,i)=>{ const c=this.RISK[d.tone].c; const last=i===this.decisions.length-1;
          return h('div',{key:i,style:{display:'grid',gridTemplateColumns:'18px 1fr',gap:14,padding:'18px 24px',borderBottom:last?'none':'1px solid var(--core-color-border-default)'}},
            h('div',{style:{display:'flex',flexDirection:'column',alignItems:'center'}}, h('span',{style:{width:11,height:11,borderRadius:'50%',background:i===0?c:'var(--core-color-surface-card)',border:'2px solid '+c,marginTop:4}}), last?null:h('div',{style:{flex:1,width:1,background:'var(--core-color-border-default)',marginTop:6}})),
            h('div',null,
              h('div',{style:{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}, this.mono(d.date), this.pill(d.outcome,d.tone)),
              h('div',{style:{fontSize:14.5,fontWeight:500,margin:'6px 0 4px'}},d.title),
              h('p',{style:{margin:'0 0 8px',fontSize:12.5,lineHeight:1.5,color:'var(--core-color-text-secondary)'}},d.why),
              h('div',{style:{display:'flex',gap:14,flexWrap:'wrap'}}, this.mono(d.mode), this.mono(d.who,{color:'var(--core-color-text-primary)'}), this.mono(d.sources+' sources')))); }))));
  }

  /* ---------- embedded Intelligence: connected identities inside the Identity view ---------- */
  connectedIdentitiesPanel(){ const h=React.createElement; const E=this.entities;
    const cfg=this.profile.connected||{own:[],conn:[],summary:'No connected identities on record.'};
    const own=cfg.own||[]; const conn=cfg.conn||[];
    const avatar=(e)=> h('span',{style:{width:30,height:30,borderRadius:e.kind==='person'?'50%':8,background:'var(--core-color-surface-canvas)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,color:'var(--core-color-text-secondary)',flexShrink:0}}, e.name.split(' ').slice(0,2).map(w=>w[0]).join(''));
    return this.panel({}, this.panelHead('Connected identities', this.mono('From the Intelligence view')),
      h('div',{style:{padding:'16px 22px 18px'}},
        h('p',{style:{margin:'0 0 16px',fontSize:13,lineHeight:1.55,color:'var(--core-color-text-secondary)'}},cfg.summary),
        own.length?this.mono('Ownership & control'):null,
        own.length?h('div',{style:{margin:'10px 0 6px',display:'flex',flexDirection:'column',gap:8}}, ...own.map(o=>{ const e=E[o.id]; const c=this.RISK[o.risk].c;
          return h('div',{key:o.id,style:{display:'flex',alignItems:'center',gap:12,padding:'11px 13px',borderRadius:'var(--core-radius-card)',border:'1px solid var(--core-color-border-default)'}},
            avatar(e),
            h('div',{style:{flex:1,minWidth:0}}, h('div',{style:{fontSize:13.5,fontWeight:500}},e.name), h('div',{style:{fontSize:11.5,color:'var(--core-color-text-muted)',marginTop:2}},o.rel+' · '+o.note)),
            h('div',{style:{textAlign:'right'}}, h('div',{style:{fontFamily:'var(--app-font)',fontWeight:600,fontSize:22,lineHeight:1,color:'var(--core-color-text-primary)'}},o.pct+'%'), h('span',{style:{display:'inline-block',width:7,height:7,borderRadius:'50%',background:c,marginTop:5}}))); })):null,
        cfg.note?h('div',{style:{fontSize:11.5,color:'var(--core-color-text-muted)',padding:'2px 2px 0',display:'flex',alignItems:'center',gap:7}}, h('span',{style:{color:'var(--core-color-text-muted)'}},'↳'),cfg.note):null,
        (own.length&&conn.length)?h('div',{style:{height:1,background:'var(--core-color-border-default)',margin:'16px 0'}}):null,
        conn.length?this.mono('Connected through shared attributes'):null,
        conn.length?h('div',{style:{margin:'10px 0 0',display:'flex',flexDirection:'column',gap:8}}, ...conn.map(c=>{ const e=E[c.id]; const rc=this.RISK[c.risk].c;
          return h('div',{key:c.id,style:{display:'flex',alignItems:'center',gap:12,padding:'11px 13px',borderRadius:'var(--core-radius-card)',border:'1px solid '+(c.flag?'color-mix(in srgb, '+rc+' 28%, var(--core-color-surface-card))':'var(--core-color-border-default)'),background:c.flag?'color-mix(in srgb, '+rc+' 6%, var(--core-color-surface-card))':'var(--core-color-surface-card)'}},
            avatar(e),
            h('div',{style:{flex:1,minWidth:0}}, h('div',{style:{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}, h('span',{style:{fontSize:13.5,fontWeight:500}},e.name), c.flag?this.mono('Risk you can\u2019t see alone',{color:rc}):null), h('div',{style:{fontSize:11.5,color:'var(--core-color-text-muted)',marginTop:2}},c.via)),
            this.strengthMeter(c.strength),
            this.pill(this.RISK[c.risk].label,c.risk)); })):null,
        h('div',{style:{display:'flex',gap:10,marginTop:16}},
          h(ActionButton,{variant:'primary',onClick:()=>this.openIntel('What businesses share a common owner with '+this.nameOf+'?')},'Ask Intelligence',h('span',null,'→')),
          h(ActionButton,{variant:'secondary',onClick:()=>this.setS({view:'identity',direction:'B'})},'View network'))));
  }

  /* ---------- data attributes (atomic data behind the questions) — tertiary, collapsible ---------- */
  /* ---------- data attributes (atomic data behind the questions) — tertiary, collapsible ---------- */
  dataAttributesPanel(){ const h=React.createElement; const open=this.state.attrsOpen;
    const count=this.dataAttrs.reduce((n,g)=>n+g.rows.length,0);
    const sharedCount=this.dataAttrs.reduce((n,g)=>n+g.rows.filter(r=>r.shared).length,0);
    return this.panel({},
      h('button',{onClick:()=>this.setState({attrsOpen:!open}),style:{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'15px 22px',border:0,background:'var(--core-color-surface-card)',cursor:'pointer',fontFamily:'inherit',textAlign:'left'}},
        h('div',{style:{display:'flex',alignItems:'baseline',gap:12}}, h('span',{style:{fontSize:13,fontWeight:500}},'Data attributes'), this.mono('Atomic data · '+count+' attributes · '+sharedCount+' shared')),
        h('span',{style:{color:'var(--core-color-text-muted)',fontSize:13,transform:open?'rotate(180deg)':'none',transition:'transform .2s'}},'⌄')),
      open?h('div',{style:{padding:'4px 22px 20px',borderTop:'1px solid var(--core-color-border-default)',animation:'mdFade .2s var(--core-ease-standard)'}},
        h('p',{style:{margin:'14px 0 16px',fontSize:12.5,lineHeight:1.5,color:'var(--core-color-text-muted)',maxWidth:680}},'Every attribute that answers a question, with its source. Attributes shared with other identities are what link Vela into the network \u2014 these power the Intelligence view.'),
        ...this.dataAttrs.map((grp,gi)=>
          h('div',{key:gi,style:{marginBottom:gi<this.dataAttrs.length-1?18:0}},
            this.mono(grp.g,{color:'var(--core-color-text-muted)'}),
            h('div',{style:{marginTop:8,border:'1px solid var(--core-color-border-default)',borderRadius:'var(--core-radius-card)',overflow:'hidden'}}, ...grp.rows.map((r,ri)=>
              h('div',{key:ri,style:{display:'grid',gridTemplateColumns:'180px 1fr auto',gap:14,alignItems:'center',padding:'10px 14px',borderBottom:ri<grp.rows.length-1?'1px solid var(--core-color-border-default)':'none',background:'var(--core-color-surface-card)'}},
                this.mono(r.k),
                h('span',{style:{fontSize:13,color:r.muted?'var(--core-color-text-muted)':'var(--core-color-text-primary)',fontFamily:'inherit'}},r.v),
                h('div',{style:{display:'flex',alignItems:'center',gap:8,justifyContent:'flex-end',flexWrap:'wrap'}},
                  r.shared?h('button',{onClick:()=>this.openIntel(r.weight==='strong'?(r.k==='Officer'?'What businesses share the officer Marcus Okonkwo?':'What businesses share a common owner with Vela Logistics?'):'What businesses share the 4400 Wilshire Blvd address?'),className:'core-badge core-badge-compact',style:{display:'inline-flex',alignItems:'center',gap:4,fontWeight:500,lineHeight:1,border:'1px solid var(--core-color-status-info-border)',background:'var(--core-color-status-info-bg)',color:'var(--core-color-status-info-fg)',cursor:'pointer'}},'Shared · '+r.shared):null,
                  r.unique?this.mono('Unique',{color:'var(--risk-clear)'}):null,
                  r.excluded?this.mono('Excluded',{color:'var(--core-color-text-muted)'}):null,
                  this.mono(r.src,{color:'var(--core-color-text-muted)'}))))))) ):null);
  }
  A_identity(){
    const h=React.createElement; const V=this.versions; const rev=V.map((v,i)=>[v,i]).reverse();
    return h('div',{style:{padding:'26px 32px 44px',maxWidth:1280,margin:'0 auto',display:'flex',flexDirection:'column',gap:18}},
      this.identityHero(),
      h('div',{style:{display:'grid',gridTemplateColumns:'1.5fr 1fr',gap:18,alignItems:'start'}},
        this.panel({}, this.panelHead('How this identity has changed', this.mono(V.length+' versions · since 2019')),
          h('div',{style:{padding:'14px 22px 14px'}}, ...rev.map(([v,i],k)=>this.timeEvent(v,i,k===rev.length-1)))),
        h('div',{style:{display:'flex',flexDirection:'column',gap:18}}, this.policySummaryCard(), this.watchingCard())),
      h('div',{style:{display:'grid',gridTemplateColumns:'1.5fr 1fr',gap:18,alignItems:'start'}},
        this.connectedIdentitiesPanel(),
        this.lastDecisionCard()),
      this.dataAttributesPanel());
  }

  /* ---------- Intelligence (A) : structured list / tree ---------- */
  get queries(){ return {
    address:{label:'Shared address',value:'4400 Wilshire Blvd, Los Angeles, CA',attr:'Address',note:'A commercial address. Sharing it is a weak signal: many unrelated businesses can use the same building.',risk:'low',
      conns:[
        {id:'vela',ctype:'Shared address',strength:'weak',risk:'clear',ev:'Listed as principal address since Oct 2024',self:true},
        {id:'cedar',ctype:'Shared address',strength:'weak',risk:'clear',ev:'Registered agent address on CA SoS filing'},
        {id:'brightpath',ctype:'Shared address',strength:'weak',risk:'clear',ev:'Mailing address on 2 state registrations'}]},
    ubo:{label:'Common owner',value:'Meridian Holdings LLC',attr:'Beneficial owner',note:'A controlling beneficial owner. Sharing one is a strong signal: it implies common control.',risk:'watch',
      conns:[
        {id:'vela',ctype:'Owns 60%',strength:'strong',risk:'watch',ev:'FinCEN BOI filing · controlling interest',self:true,pct:60},
        {id:'anchor',ctype:'Owns 100%',strength:'strong',risk:'low',ev:'FinCEN BOI filing · wholly owned',pct:100},
        {id:'okonkwo',ctype:'Owns Meridian 75%',strength:'strong',risk:'low',ev:'FinCEN BOI filing',pct:75}]},
    officer:{label:'Common officer',value:'Marcus Okonkwo',attr:'Officer',note:'A shared officer is a strong signal of an operating relationship, and the path that carries hidden risk here.',risk:'elev',
      conns:[
        {id:'vela',ctype:'Controls via Meridian',strength:'strong',risk:'watch',ev:'Indirect through Meridian Holdings',self:true},
        {id:'harbor',ctype:'Officer',strength:'strong',risk:'watch',ev:'Director on CA SoS record'},
        {id:'stillwater',ctype:'2 hops · shared officer',strength:'moderate',risk:'high',ev:'Via J. Reyes, co-officer at Harbor Freight'}]},
  }; }
  /* open intelligence input: type a data attribute, or attach a document to ingest */
  get intelSuggest(){ return [
    {k:'address', kind:'Office address', value:'4400 Wilshire Blvd', terms:'address location office building wilshire'},
    {k:'ubo', kind:'Beneficial owner', value:'Meridian Holdings LLC', terms:'owner ubo beneficial meridian holdings parent control'},
    {k:'officer', kind:'Officer name', value:'Marcus Okonkwo', terms:'officer director okonkwo marcus signer'},
  ]; }
  selectAttr(k){ this.setS({query:k}); this.setState({intelQ:'', intelOpen:false, ingestedDoc:null}); }
  onIngest(e){
    const f=e.target&&e.target.files&&e.target.files[0]; if(!f) return;
    // simulate extract → validate → connect: a doc surfaces an officer the user couldn't query alone
    this.setState({ingestedDoc:f.name, intelOpen:false, intelQ:''}); this.setS({query:'officer'});
    e.target.value='';
  }
  intelInputBar(q){
    const h=React.createElement; const txt=this.state.intelQ||''; const open=this.state.intelOpen;
    const filt=this.intelSuggest.filter(s=> !txt || (s.kind+' '+s.value+' '+s.terms).toLowerCase().includes(txt.toLowerCase()));
    const chip=(s)=> h('button',{key:s.k,onMouseDown:(e)=>{e.preventDefault();this.selectAttr(s.k);},style:{display:'inline-flex',alignItems:'center',gap:8,padding:'6px 11px',border:'1px solid '+(this.state.query===s.k&&!this.state.ingestedDoc?'var(--core-color-state-selected-border)':'var(--core-color-border-default)'),background:this.state.query===s.k&&!this.state.ingestedDoc?'var(--core-color-state-selected-bg)':'var(--core-color-surface-card)',color:this.state.query===s.k&&!this.state.ingestedDoc?'var(--core-color-state-selected-fg)':'var(--core-color-text-secondary)',borderRadius:'var(--core-radius-pill)',cursor:'pointer',fontSize:12,transition:'all .15s'}},
      h('span',{style:{fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.04em',textTransform:'uppercase',opacity:.65}},s.kind), s.value);
    return h('div',{style:{background:'var(--core-color-surface-card)',border:'1px solid var(--core-color-border-default)',borderRadius:'var(--core-radius-card)',padding:'22px 26px'}},
      this.mono('Intelligence · Start from a data attribute'),
      h('div',{style:{display:'flex',alignItems:'center',gap:8,margin:'8px 0 14px',flexWrap:'wrap'}},
        h('span',{style:{fontSize:19,fontFamily:'var(--app-font)',fontWeight:600,letterSpacing:'-.01em'}},'What businesses share a data attribute?')),
      // input row
      h('div',{style:{position:'relative'}},
        h('div',{style:{display:'flex',alignItems:'center',gap:12,padding:'13px 16px',border:'1px solid '+(open?'var(--core-color-control-border-focus)':'var(--core-color-control-border)'),borderRadius:'var(--core-radius-card)',background:'var(--core-color-control-bg)',transition:'border-color var(--core-duration-fast) var(--core-ease-standard)',boxShadow:open?'0 0 0 2px var(--core-color-focus-offset), 0 0 0 4px var(--core-color-focus-control)':'none'}},
          h('svg',{width:16,height:16,viewBox:'0 0 24 24',fill:'none',stroke:'var(--core-color-text-muted)',strokeWidth:2,style:{flexShrink:0}}, h('circle',{cx:11,cy:11,r:7}), h('line',{x1:21,y1:21,x2:16.5,y2:16.5})),
          h('input',{value:txt,placeholder:'Type a data attribute: address, owner, officer, phone, TIN, email, IP…',
            onChange:(e)=>this.setState({intelQ:e.target.value,intelOpen:true}),
            onFocus:()=>this.setState({intelOpen:true}),
            onBlur:()=>setTimeout(()=>this.setState({intelOpen:false}),140),
            onKeyDown:(e)=>{ if(e.key==='Enter'&&filt[0]) this.selectAttr(filt[0].k); if(e.key==='Escape') e.target.blur(); },
            style:{flex:1,minWidth:0,border:0,outline:'none',background:'transparent',font:'400 15px var(--app-font)',color:'var(--core-color-text-primary)'}}),
          h('label',{style:{display:'inline-flex',alignItems:'center',gap:7,padding:'8px 12px',borderRadius:9,border:'1px dashed var(--core-color-text-muted)',color:'var(--core-color-text-secondary)',cursor:'pointer',fontSize:12.5,whiteSpace:'nowrap',flexShrink:0}},
            h('svg',{width:14,height:14,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2}, h('path',{d:'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48'})),
            'Attach document',
            h('input',{type:'file',accept:'.pdf,.png,.jpg,.jpeg,.csv,.doc,.docx',onChange:(e)=>this.onIngest(e),style:{display:'none'}}))),
        // suggestion dropdown
        open?h('div',{className:'core-menu-content',style:{position:'absolute',top:'calc(100% + 6px)',left:0,right:0,zIndex:10,borderRadius:'var(--core-radius-popover)',borderWidth:1,borderStyle:'solid',boxShadow:'var(--core-color-elevation-popover)',overflow:'hidden',animation:'mdFade .15s var(--core-ease-standard)'}},
          h('div',{style:{padding:'7px 10px 5px'}}, this.mono(txt?'Matching attributes':'Attributes on this identity')),
          filt.length?filt.map((s)=> h('div',{key:s.k,className:'app-suggest-item',onMouseDown:(e)=>{e.preventDefault();this.selectAttr(s.k);}},
            h('span',{style:{width:26,height:26,borderRadius:7,background:'var(--core-color-surface-canvas)',display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}, h('span',{style:{width:7,height:7,borderRadius:'50%',background:'var(--core-color-text-muted)'}})),
            h('div',{style:{flex:1,minWidth:0}}, h('div',{style:{fontSize:13.5,fontWeight:500}},s.value), this.mono(s.kind)),
            h('span',{style:{fontSize:11,color:'var(--core-color-text-muted)'}},'↵'))):
          h('div',{style:{padding:'14px',fontSize:12.5,color:'var(--core-color-text-muted)'}},'No matching attribute on this identity. Attach a document to add one.')):null),
      // active selection / ingested doc readout
      this.state.ingestedDoc?
        h('div',{style:{display:'flex',alignItems:'center',gap:14,padding:'13px 16px',marginTop:12,background:'var(--core-color-status-success-bg)',border:'1px solid var(--core-color-status-success-border)',borderRadius:'var(--core-radius-card)',flexWrap:'wrap'}},
          this.pill('Document ingested','low'),
          h('span',{style:{fontSize:13.5,fontWeight:500}},this.state.ingestedDoc),
          h('span',{style:{fontSize:12.5,color:'var(--core-color-text-muted)'}},'→ extracted officer “'+q.value+'”, validated, and connected'),
          h('span',{style:{flex:1}}),
          h('button',{onMouseDown:(e)=>{e.preventDefault();this.setState({ingestedDoc:null});},style:{background:'none',border:0,color:'var(--core-color-text-muted)',cursor:'pointer',fontSize:12,textDecoration:'underline'}},'Clear'))
        :h('div',{style:{display:'flex',alignItems:'center',gap:14,padding:'13px 16px',marginTop:12,background:'var(--core-color-surface-canvas)',borderRadius:'var(--core-radius-card)',flexWrap:'wrap'}},
          this.mono('Querying'), this.pill(q.attr,'mute'),
          h('span',{style:{fontSize:15,fontWeight:500}},q.value),
          h('span',{style:{flex:1}}),
          h('div',{style:{textAlign:'right'}}, this.mono('Aggregate network risk'), h('div',{style:{marginTop:4}},this.pill(this.RISK[q.risk].label,q.risk)))),
      // quick-pick chips
      h('div',{style:{display:'flex',alignItems:'center',gap:8,marginTop:14,flexWrap:'wrap'}},
        this.mono('Try',{color:'var(--core-color-text-muted)'}), ...this.intelSuggest.map(chip)));
  }
  /* =====================================================
     INTELLIGENCE VIEW — chat (ask a question → assembled answer)
  ===================================================== */
  get intelPrompts(){ return [
    'Tell me insights about my portfolio',
    'What businesses share the officer Marcus Okonkwo?',
    'What does Vela Logistics\u2019 ownership network look like?',
    'What businesses share the 4400 Wilshire Blvd address?',
  ]; }
  keyFromText(t){ const s=(t||'').toLowerCase();
    if(/portfolio|my businesses|my identities|across (my |all )|all my|trends?|book of business|accounts?|which identities|most .*risk|elevate|standing out/.test(s)) return 'portfolio';
    if(/summar|overview|tell me about|risk on|profile of|snapshot|how old/.test(s)) return 'identity';
    if(/officer|director|okonkwo|reyes|nguyen|signer/.test(s)) return 'officer';
    if(/owner|ubo|ownership|meridian|beneficial|parent|control/.test(s)) return 'ubo';
    if(/address|location|building|wilshire|premise/.test(s)) return 'address';
    return null; }
  chatTitle(t,key){ const s=(t||'').toLowerCase();
    let who=null;
    for(const id of Object.keys(this.PROFILES)){ const n=this.PROFILES[id].name; if(s.indexOf(n.split(' ')[0].toLowerCase())>=0){ who=n.split(',')[0]; break; } }
    const base={portfolio:'Portfolio risk',identity:'Business summary',officer:'Shared officers',ubo:'Ownership & control',address:'Shared address'}[key];
    if(base&&who) return base+' · '+who;
    if(base) return base;
    if(who) return who;
    return t.length>32 ? t.slice(0,32)+'…' : t; }
  askIntel(text){ const t=(text||'').trim(); if(!t) return; const key=this.keyFromText(t);
    this.setState(s=>{
      let chats=s.chats||[]; let id=s.activeChat; let seq=s.chatSeq||0;
      if(!id || !chats.some(c=>c.id===id)){ seq+=1; id='chat-'+seq; chats=[...chats,{id,title:this.chatTitle(t,key),msgs:[]}]; }
      chats=chats.map(c=>c.id===id?{...c,msgs:[...c.msgs,{q:t,key}]}:c);
      return {chats, activeChat:id, chatSeq:seq, chatInput:''};
    }, ()=>{ const el=document.getElementById('intel-msgs'); if(el) setTimeout(()=>el.scrollTo({top:el.scrollHeight,behavior:'smooth'}),60); }); }
  openIntel(text){ this.setState({activeChat:null}); this.setS({view:'intelligence'}); this.askIntel(text); }

  connRows(ranked){ const h=React.createElement; const E=this.entities;
    return h('div',{style:{display:'flex',flexDirection:'column',gap:8}}, ...ranked.map((c,i)=>{ const e=E[c.id]; const rc=this.RISK[c.risk].c;
      return h('div',{key:c.id,style:{display:'grid',gridTemplateColumns:'auto 1fr auto auto',gap:13,alignItems:'center',padding:'11px 13px',borderRadius:11,border:'1px solid '+(c.risk==='high'?'color-mix(in srgb, '+rc+' 28%, var(--core-color-surface-card))':'var(--core-color-border-default)'),background:c.risk==='high'?'color-mix(in srgb, '+rc+' 6%, var(--core-color-surface-card))':(c.self?'var(--core-color-state-selected-bg)':'var(--core-color-surface-card)')}},
        h('span',{style:{width:32,height:32,borderRadius:e.kind==='person'?'50%':8,background:'var(--core-color-surface-canvas)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,color:'var(--core-color-text-secondary)',flexShrink:0}}, e.name.split(' ').slice(0,2).map(w=>w[0]).join('')),
        h('div',{style:{minWidth:0}}, h('div',{style:{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}, h('span',{style:{fontSize:13.5,fontWeight:500}},e.name), c.self?this.pill('This business','low'):null), h('div',{style:{fontSize:11.5,color:'var(--core-color-text-muted)',marginTop:2}}, e.type+' · '+c.ctype+(c.pct?(' · '+c.pct+'%'):'')+' · '+c.ev)),
        this.strengthMeter(c.strength),
        this.pill(this.RISK[c.risk].label,c.risk)); }));
  }
  /* ---------- portfolio-level insights (across many businesses) ---------- */
  get portfolio(){ return {
    total:1284, monitored:1284, dist:[['clear',912],['low',214],['watch',98],['elev',42],['high',18]],
    insights:[
      {tone:'elev',tag:'Emerging risk',title:'3 businesses now link to a high-risk entity',
       body:'Stillwater Imports (High) entered 3 of your portfolios\u2019 networks this quarter through shared officers and a common holding company. None show direct risk on their own.',
       biz:[{id:'vela',via:'3 hops · shared officer'},{id:'harbor',via:'Direct officer'},{id:'anchor',via:'Common owner'}],
       metric:'+3',metricSub:'this quarter',act:'Review the 3 connected files'},
      {tone:'watch',tag:'Concentration',title:'Meridian Holdings controls 4 businesses you monitor',
       body:'A single beneficial owner now sits behind 4 active accounts. That concentration warrants a portfolio-level limit, not just per-file review.',
       biz:[{id:'vela',via:'60%'},{id:'anchor',via:'100%'},{id:'harbor',via:'via officer'}],
       metric:'4',metricSub:'common control',act:'Set a relationship exposure cap'},
      {tone:'watch',tag:'Trend',title:'Address-sharing up 18% in trucking & logistics',
       body:'Across your logistics book, more businesses are registering at shared commercial addresses. Weak on its own, but the rate of change is the signal.',
       biz:[{id:'vela',via:'4400 Wilshire'},{id:'cedar',via:'4400 Wilshire'},{id:'brightpath',via:'4400 Wilshire'}],
       metric:'+18%',metricSub:'vs. last quarter',act:'See the trucking segment'},
      {tone:'low',tag:'Usage',title:'9 accounts have unresolved findings older than 30 days',
       body:'These sat in manual review past your SLA. Clearing them restores monitoring coverage across the portfolio.',
       biz:[{id:'harbor',via:'42 days'},{id:'stillwater',via:'37 days'}],
       metric:'9',metricSub:'past SLA',act:'Open the review queue'},
    ],
  }; }
  portfolioBar(){ const h=React.createElement; const P=this.portfolio; const tot=P.dist.reduce((n,d)=>n+d[1],0);
    return h('div',{style:{display:'flex',flexDirection:'column',gap:8}},
      h('div',{style:{display:'flex',height:12,borderRadius:7,overflow:'hidden',border:'1px solid var(--core-color-border-default)'}},
        ...P.dist.map(([t,n],i)=>h('div',{key:i,title:this.RISK[t].label+': '+n,style:{width:(n/tot*100)+'%',background:this.RISK[t].c}}))),
      h('div',{style:{display:'flex',gap:'8px 16px',flexWrap:'wrap'}}, ...P.dist.map(([t,n],i)=>
        h('div',{key:i,style:{display:'flex',alignItems:'center',gap:6,fontSize:11.5,color:'var(--core-color-text-muted)'}},
          h('span',{style:{width:8,height:8,borderRadius:'50%',background:this.RISK[t].c}}), this.RISK[t].label, h('span',{style:{color:'var(--core-color-text-primary)',fontWeight:500}},n)))));
  }
  portfolioAnswer(){ const h=React.createElement; const P=this.portfolio; const E=this.entities;
    const avatar=(id)=>{ const e=E[id]; return h('span',{key:id,title:e.name,style:{width:26,height:26,borderRadius:e.kind==='person'?'50%':7,background:'var(--core-color-surface-canvas)',border:'1.5px solid var(--core-color-surface-card)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,color:'var(--core-color-text-secondary)',marginLeft:-6}}, e.name.split(' ').slice(0,2).map(w=>w[0]).join('')); };
    return h('div',{style:{background:'var(--core-color-surface-card)',border:'1px solid var(--core-color-border-default)',borderRadius:'var(--core-radius-card)',borderTopLeftRadius:4,padding:'20px 22px',maxWidth:760,display:'flex',flexDirection:'column',gap:16}},
      this.midAttrib(),
      h('div',null,
        h('div',{style:{display:'flex',alignItems:'baseline',gap:10,flexWrap:'wrap'}}, h('span',{style:{fontFamily:'var(--app-font)',fontWeight:600,fontSize:27,lineHeight:1.05}},P.total.toLocaleString()+' businesses'), h('span',{style:{fontSize:14,color:'var(--core-color-text-muted)'}},'monitored across your portfolio'), this.pill('4 insights to elevate','elev')),
        h('p',{style:{margin:'10px 0 14px',fontSize:13,lineHeight:1.55,color:'var(--core-color-text-secondary)'}},'Here\u2019s what stands out right now: patterns that only appear when I look across businesses, not at any single one.'),
        this.portfolioBar()),
      h('div',{style:{display:'flex',flexDirection:'column',gap:11}}, ...P.insights.map((ins,i)=>{ const c=this.RISK[ins.tone].c;
        return h('div',{key:i,style:{border:'1px solid var(--core-color-border-default)',borderLeft:'3px solid '+c,borderRadius:'var(--core-radius-card)',padding:'15px 16px',background:'color-mix(in srgb, '+c+' 4%, var(--core-color-surface-card))'}},
          h('div',{style:{display:'flex',justifyContent:'space-between',gap:14,alignItems:'flex-start'}},
            h('div',{style:{minWidth:0,flex:1}},
              h('div',{style:{display:'flex',alignItems:'center',gap:9,marginBottom:6}}, this.pill(ins.tag,ins.tone)),
              h('div',{style:{fontSize:15,fontWeight:500,lineHeight:1.25}},ins.title),
              h('p',{style:{margin:'6px 0 0',fontSize:12.5,lineHeight:1.5,color:'var(--core-color-text-secondary)'}},ins.body)),
            h('div',{style:{textAlign:'right',flexShrink:0}}, h('div',{style:{fontFamily:'var(--app-font)',fontWeight:600,fontSize:28,lineHeight:1,color:c}},ins.metric), this.mono(ins.metricSub,{display:'block',marginTop:3}))),
          h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginTop:13,flexWrap:'wrap'}},
            h('div',{style:{display:'flex',alignItems:'center',gap:10}},
              h('div',{style:{display:'flex',paddingLeft:6}}, ...ins.biz.map(b=>avatar(b.id))),
              this.mono(ins.biz.length+(ins.biz.length===1?' business':' businesses'),{color:'var(--core-color-text-muted)'})),
            h('button',{onClick:()=>{ const k=ins.tag==='Emerging risk'?'officer':ins.tag==='Concentration'?'ubo':ins.tag==='Trend'?'address':null; if(k) this.askIntel(ins.act); },style:{display:'inline-flex',alignItems:'center',gap:7,padding:'7px 12px',borderRadius:9,border:'1px solid '+c,background:'var(--core-color-surface-card)',color:c,cursor:'pointer',fontSize:12.5,fontFamily:'inherit'}}, ins.act, h('span',null,'\u2192')))); })),
      h('div',{style:{fontSize:11.5,color:'var(--core-color-text-muted)',display:'flex',alignItems:'center',gap:7}}, h('span',{style:{color:'var(--core-color-text-muted)'}},'↳'),'Ask a follow-up, e.g. \u201cwhich businesses link to Stillwater Imports?\u201d or \u201cshow me everything Meridian controls.\u201d'));
  }
  identityAnswer(){ const h=React.createElement;
    const facts=[['Age','7 years · formed 03.12.19'],['Type','C-Corporation · CA'],['Owners','Meridian 60% · Nguyen 15%'],['Standing','Active · good standing']];
    const findings=this.watch;
    return h('div',{style:{background:'var(--core-color-surface-card)',border:'1px solid var(--core-color-border-default)',borderRadius:'var(--core-radius-card)',borderTopLeftRadius:4,padding:'20px 22px',maxWidth:720,display:'flex',flexDirection:'column',gap:15}},
      this.midAttrib(),
      h('div',null,
        h('div',{style:{display:'flex',alignItems:'baseline',gap:10,flexWrap:'wrap'}}, h('span',{style:{fontFamily:'var(--app-font)',fontWeight:600,fontSize:26,lineHeight:1.05}},'Vela Logistics, Inc.'), this.pill('Business identity · Watch','watch'), this.pill('Network · Elevated','elev')),
        h('p',{style:{margin:'9px 0 0',fontSize:13,lineHeight:1.55,color:'var(--core-color-text-secondary)'}},'A 7-year-old California freight carrier in good standing. Clean on its own record. The risk is inherited: an Apr 2026 restructure handed control to a holding company that links, three hops out, to a high-risk entity.')),
      h('div',{style:{display:'grid',gridTemplateColumns:'repeat(2, 1fr)',gap:'9px 20px'}}, ...facts.map(([k,v],i)=>
        h('div',{key:i,style:{display:'flex',flexDirection:'column',gap:2}}, this.mono(k,{color:'var(--core-color-text-muted)'}), h('span',{style:{fontSize:13,color:'var(--core-color-text-primary)'}},v)))),
      h('div',null, this.mono('What to watch',{color:'var(--core-color-text-muted)',display:'block',marginBottom:9}),
        h('div',{style:{display:'flex',flexDirection:'column',gap:8}}, ...findings.map((w,i)=>{ const c=this.RISK[w.tone].c;
          return h('div',{key:i,style:{display:'flex',alignItems:'center',gap:11,padding:'10px 12px',borderRadius:11,border:'1px solid color-mix(in srgb, '+c+' 22%, var(--core-color-surface-card))',background:'color-mix(in srgb, '+c+' 6%, var(--core-color-surface-card))'}},
            h('span',{style:{width:8,height:8,borderRadius:'50%',background:c,flexShrink:0}}),
            h('div',{style:{flex:1,minWidth:0}}, h('div',{style:{fontSize:13,fontWeight:500}},w.label), h('div',{style:{fontSize:11.5,color:'var(--core-color-text-muted)',marginTop:2}},w.sub))); }))),
      h('div',{style:{display:'flex',gap:10}},
        h('button',{onClick:()=>this.setS({view:'identity',direction:'C'}),style:{display:'inline-flex',alignItems:'center',gap:8,padding:'8px 16px',minHeight:32,borderRadius:'var(--core-radius-pill)',border:'1px solid var(--core-color-action-primary-border)',background:'var(--core-color-action-primary-bg)',color:'var(--core-color-action-primary-fg)',cursor:'pointer',fontSize:13,fontWeight:500,fontFamily:'inherit'}},'Open full Identity',h('span',null,'→')),
        h('button',{onClick:()=>this.setS({view:'identity',direction:'B'}),style:{display:'inline-flex',alignItems:'center',gap:8,padding:'10px 15px',borderRadius:10,border:'1px solid var(--core-color-border-default)',background:'var(--core-color-surface-card)',color:'var(--core-color-text-secondary)',cursor:'pointer',fontSize:13,fontFamily:'inherit'}},'View network')));
  }
  assembledAnswer(item){ const h=React.createElement; const key=item.key;
    if(key==='portfolio') return this.portfolioAnswer();
    if(key==='identity') return this.identityAnswer();
    if(!key||!this.queries[key]){
      return h('div',{style:{background:'var(--core-color-surface-card)',border:'1px solid var(--core-color-border-default)',borderRadius:'var(--core-radius-card)',borderTopLeftRadius:4,padding:'18px 20px',maxWidth:680}},
        this.midAttrib(),
        h('p',{style:{margin:'10px 0 12px',fontSize:14,lineHeight:1.55,color:'var(--core-color-text-secondary)'}},'I can assemble connections around a shared data attribute. Try asking about a shared officer, a common owner, or a shared address:'),
        h('div',{style:{display:'flex',flexDirection:'column',gap:8}}, ...this.intelPrompts.map((p,i)=>
          h('button',{key:i,onClick:()=>this.askIntel(p),style:{textAlign:'left',padding:'10px 13px',borderRadius:10,border:'1px solid var(--core-color-border-default)',background:'var(--core-color-surface-inset)',cursor:'pointer',fontSize:13,color:'var(--core-color-text-primary)',fontFamily:'inherit'}},p))));
    }
    const Q=this.queries[key]; const g=this.bIntel(key);
    const ranked=Q.conns.slice().sort((a,b)=>({strong:3,moderate:2,weak:1}[b.strength]-{strong:3,moderate:2,weak:1}[a.strength]));
    const verdict = key==='officer'?{t:'Act',tone:'elev',txt:'This officer is the path that carries hidden risk: a high-risk entity sits three hops out. Escalate Vela to manual review.'}
      : key==='ubo'?{t:'Monitor',tone:'watch',txt:'Common control spans 2 active businesses. Extend the same monitoring policy to both.'}
      : {t:'Note',tone:'low',txt:'A shared commercial address is a weak signal on its own. Record for context; no action needed.'};
    const vc=this.RISK[verdict.tone].c;
    return h('div',{style:{background:'var(--core-color-surface-card)',border:'1px solid var(--core-color-border-default)',borderRadius:'var(--core-radius-card)',borderTopLeftRadius:4,padding:'20px 22px',maxWidth:760,display:'flex',flexDirection:'column',gap:16}},
      this.midAttrib(),
      h('div',null,
        h('div',{style:{display:'flex',alignItems:'baseline',gap:10,flexWrap:'wrap'}}, h('span',{style:{fontFamily:'var(--app-font)',fontWeight:600,fontSize:27,lineHeight:1.05}},Q.conns.length+' businesses'), h('span',{style:{fontSize:14,color:'var(--core-color-text-muted)'}},(key==='address'?'share this address':'share a common '+Q.attr.toLowerCase())), this.pill(this.RISK[Q.risk].label+' network risk',Q.risk)),
        h('div',{style:{fontSize:13,color:'var(--core-color-text-primary)',marginTop:7,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}, this.pill(Q.attr,'mute'), h('span',{style:{fontWeight:500}},Q.value)),
        h('p',{style:{margin:'10px 0 0',fontSize:13,lineHeight:1.55,color:'var(--core-color-text-secondary)'}},Q.note)),
      h('div',null, this.mono('Connected businesses',{color:'var(--core-color-text-muted)',display:'block',marginBottom:9}), this.connRows(ranked)),
      h('div',{className:'core-theme','data-theme':'dark',style:{background:'var(--core-color-surface-card)',borderRadius:'var(--core-radius-card)',overflow:'hidden'}},
        h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid var(--core-color-border-divider)'}}, this.mono('How the connections hold together',{color:'var(--core-color-text-muted)'}), this.pathToggle()),
        h('div',{style:{height:280}}, this.graphCanvas([g.center,...g.nodes],g.edges,{timeIdx:null,showPath:this.state.showPath!==false}))),
      h('div',{style:{background:'color-mix(in srgb, '+vc+' 9%, var(--core-color-surface-card))',border:'1px solid color-mix(in srgb, '+vc+' 26%, var(--core-color-surface-card))',borderRadius:13,padding:'15px 18px'}},
        h('div',{style:{display:'flex',alignItems:'center',gap:10}}, this.mono('What to act on',{color:vc}), this.pill(verdict.t,verdict.tone)),
        h('p',{style:{margin:'9px 0 0',fontSize:13.5,lineHeight:1.5,color:'var(--core-color-text-primary)'}},verdict.txt)));
  }
  midAttrib(){ const h=React.createElement;
    return h('div',{style:{display:'flex',alignItems:'center',gap:8,marginBottom:4}},
      h('span',{style:{width:22,height:22,borderRadius:6,background:'var(--core-color-surface-inverse)',display:'inline-flex',alignItems:'center',justifyContent:'center'}}, h('svg',{width:11,height:6,viewBox:'0 0 30 16',fill:'var(--core-color-brand-accent)'}, h('path',{d:'M14.868 15.99V15.995H17.8334V13.2048V13.2011H17.8294L4.14417 0H1.18008V2.79517L14.868 15.99ZM0 15.995H4.48643V11.7661H0V15.995ZM26.7415 15.99V15.995H29.7069V13.2048V13.2011H29.7029L22.8603 6.60055L16.0177 0H13.0536V2.79517L26.7415 15.99Z'})) ),
      this.mono('Middesk',{color:'var(--core-color-text-muted)'})); }

  get intelSources(){ return [
    {label:'Authoritative sources', items:['Secretary of State','IRS · TIN match','USPS · address data','OFAC · sanctions & watchlists','UCC filings','Court records · PACER']},
    {label:'Alternative sources', items:['Utility statements','Bank & payments data','Business licenses','Middesk network']},
    {label:'Web analysis sources', items:['Website & WHOIS','Adverse media','Social & review presence','Web traffic signals']},
  ]; }
  /* Composer — the "Ask…" pattern: input on top, action row below with a
     Sources dropdown at left and attach + send at right. Chrome mirrors the
     @/core ChatComposer (rounded-card frame on surface-raised, focus ring). */
  get intelAgents(){ return ['Risk summarizer','Network tracer','Ownership mapper','Watchlist screener','Portfolio analyst']; }
  chatComposer(extra){
    const h=React.createElement; const self=this;
    const send=()=>{ this.setState({srcOpen:false,agOpen:false,chatAttach:null}); if(this._chatTa) this._chatTa.style.height='auto'; this.askIntel(this.state.chatInput); };
    // Dropdown menu + trigger, shared by Sources and Agents. Sits under its
    // button; flips upward when the composer is docked at the viewport bottom.
    const dropUp=((this.activeChatObj||{msgs:[]}).msgs).length>0;
    const flyup=(title,groups,openKey,offKey,icon)=>{
      const open=!!this.state[openKey]; const off=this.state[offKey]||{};
      const all=groups.flatMap(g=>g.items);
      const onCount=all.filter(s=>!off[s]).length; const items=all;
      return h(Menu,{open,onOpenChange:(o)=>this.setState({[openKey]:o})},
        h(MenuTrigger,{asChild:true},
          h('button',{style:{display:'inline-flex',alignItems:'center',gap:6,padding:'5px 10px',border:0,borderRadius:'var(--core-radius-pill)',background:open?'var(--core-color-state-selected-bg)':'transparent',boxShadow:open?'0 0 0 1.5px var(--core-color-focus-ring)':'none',color:open?'var(--core-color-state-selected-fg)':'var(--core-color-text-secondary)',cursor:'pointer',font:'500 12px/1 var(--app-font)',transition:'box-shadow var(--core-duration-fast) var(--core-ease-standard), background-color var(--core-duration-fast) var(--core-ease-standard)'}},
            self.navIcon(icon,14),title,
            onCount<items.length?h('span',{style:{fontSize:11,color:'var(--core-color-text-muted)'}},onCount+'/'+items.length):null,
            h('span',{style:{display:'grid',placeItems:'center'}}, self.navIcon('chevronDown',12)))),
        h(MenuContent,{side:dropUp?'top':'bottom',align:'start',themeMode:this.state.theme==='dark'?'dark':'light',style:{width:264,maxHeight:'min(400px, 38vh)',overflowY:'auto'}},
          ...groups.flatMap((g,gi)=>[
            g.label?h(MenuLabel,{key:'l'+gi,style:{fontSize:11,letterSpacing:'.02em',textTransform:'uppercase',color:'var(--core-color-text-muted)'}},g.label):null,
            ...g.items.map(s=>h(MenuCheckboxItem,{key:s,checked:!off[s],onCheckedChange:()=>this.setState({[offKey]:{...off,[s]:!off[s]}}),onSelect:(e)=>e.preventDefault()},s))])));
    };
    const sources=flyup('Sources',this.intelSources,'srcOpen','srcOff','layers');
    const agents=flyup('Agents',[{items:this.intelAgents}],'agOpen','agOff','bot');
    return h('div',{className:'app-composer',style:{position:'relative',...(extra||{})}},
      this.state.chatAttach?h('div',{style:{display:'flex',gap:6,padding:'10px 12px 0'}},
        h('span',{style:{display:'inline-flex',alignItems:'center',gap:6,height:24,maxWidth:'100%',padding:'0 4px 0 8px',border:'1px solid var(--core-color-border-default)',borderRadius:'var(--core-radius-control)',background:'var(--core-color-surface-raised)',fontSize:12,color:'var(--core-color-text-primary)'}},
          self.navIcon('paperclip',12),
          h('span',{style:{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},this.state.chatAttach),
          h('button',{onClick:()=>this.setState({chatAttach:null}),title:'Remove attachment',style:{display:'inline-flex',alignItems:'center',justifyContent:'center',width:16,height:16,padding:0,border:0,borderRadius:3,background:'transparent',color:'var(--core-color-text-muted)',cursor:'pointer',fontSize:12,lineHeight:1}},'\u00d7'))):null,
      h('textarea',{value:this.state.chatInput,placeholder:'Ask Middesk questions about business identities in your portfolio',rows:3,ref:(el)=>{this._chatTa=el;},
        onChange:(e)=>{ const t=e.target; t.style.height='auto'; t.style.height=t.scrollHeight+'px'; this.setState({chatInput:t.value}); },
        onKeyDown:(e)=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } },
        style:{display:'block',width:'100%',minHeight:63,overflow:'hidden',border:0,outline:'none',background:'transparent',resize:'none',padding:'14px 16px 4px',font:'400 15px/1.4 var(--app-font)',color:'var(--core-color-text-primary)'}}),
      h('div',{style:{display:'flex',alignItems:'center',gap:6,padding:'6px 10px 10px 10px'}},
        sources,
        agents,
        h('div',{style:{flex:1}}),
        h('input',{type:'file',accept:'.pdf,.png,.jpg,.jpeg,.csv,.doc,.docx',ref:(el)=>{this._chatFile=el;},style:{display:'none'},
          onChange:(e)=>{ const f=e.target.files&&e.target.files[0]; if(f) this.setState({chatAttach:f.name}); e.target.value=''; }}),
        h(IconActionButton,{variant:'quiet','aria-label':'Attach a document',title:'Attach a document',onClick:()=>{ if(this._chatFile) this._chatFile.click(); }}, self.navIcon('paperclip',15)),
        h(IconActionButton,{variant:'primary','aria-label':'Send',disabled:!(this.state.chatInput||'').trim(),onClick:send,title:'Send'}, self.navIcon('arrowUp',15))));
  }

  intelChat(){ const h=React.createElement; const chat=(this.activeChatObj||{msgs:[]}).msgs; const empty=chat.length===0;
    // Empty state — the ask-first layout: a faint brand watermark with the
    // composer floating in the vertical center; quiet prompt links at the
    // bottom. Once the first entry lands the composer docks to the bottom.
    const MARK='M14.868 15.99V15.995H17.8334V13.2048V13.2011H17.8294L4.14417 0H1.18008V2.79517L14.868 15.99ZM0 15.995H4.48643V11.7661H0V15.995ZM26.7415 15.99V15.995H29.7069V13.2048V13.2011H29.7029L22.8603 6.60055L16.0177 0H13.0536V2.79517L26.7415 15.99Z';
    if(empty){
      return h('div',{style:{height:'calc(100vh - 57px)',position:'relative',display:'flex',flexDirection:'column',overflow:'hidden'}},
        h('div',{style:{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}},
          h('svg',{width:430,height:230,viewBox:'0 0 30 16',fill:'var(--core-color-surface-subtle)',style:{transform:'translateY(-130px)'}}, h('path',{d:MARK}))),
        h('div',{style:{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',padding:'24px',position:'relative'}},
          h('div',{style:{width:'100%',maxWidth:720}}, this.chatComposer())),
        null);
    }
    const composer=h('div',{style:{position:'absolute',left:0,right:0,bottom:16,padding:'0 24px',pointerEvents:'none'}},
      h('div',{style:{maxWidth:820,margin:'0 auto',pointerEvents:'auto'}}, this.chatComposer({boxShadow:'var(--core-color-elevation-raised)'})));
    return h('div',{style:{height:'calc(100vh - 57px)',position:'relative'}},
      h('div',{id:'intel-msgs',style:{height:'100%',overflowY:'auto'}},
        h('div',{style:{maxWidth:820,margin:'0 auto',padding:'26px 24px 130px',display:'flex',flexDirection:'column',gap:18}},
          ...chat.map((it,i)=> h('div',{key:i,style:{display:'flex',flexDirection:'column',gap:14}},
            h('div',{style:{alignSelf:'flex-end',maxWidth:'80%',background:'var(--core-color-surface-subtle)',color:'var(--core-color-text-primary)',padding:'11px 16px',borderRadius:'var(--core-radius-card)',fontSize:14,lineHeight:1.4}},it.q),
            this.assembledAnswer(it))))),
      composer);
  }

  A_intel(){
    const h=React.createElement; const q=this.queries[this.state.query]; const E=this.entities;
    const groups=[['strong','Strong connections'],['moderate','Moderate connections'],['weak','Weak connections']];
    return h('div',{style:{padding:'26px 32px 44px',maxWidth:1280,margin:'0 auto',display:'flex',flexDirection:'column',gap:18}},
      // open query bar — type an attribute or attach a document
      this.intelInputBar(q),
      h('p',{style:{margin:'0 4px',fontSize:13,lineHeight:1.5,color:'var(--core-color-text-secondary)',maxWidth:760}},q.note),
      // connection groups
      ...groups.map(([str,title])=>{
        const rows=q.conns.filter(c=>c.strength===str); if(!rows.length) return null;
        return this.panel({},
          this.panelHead(title, this.mono(rows.length+' '+(rows.length===1?'business':'businesses'))),
          h('div',{style:{padding:'4px 0'}}, ...rows.map((c,i)=>{
            const e=E[c.id]; const rc=this.RISK[c.risk].c;
            return h('div',{key:c.id,style:{display:'grid',gridTemplateColumns:'auto 1fr auto auto',gap:16,alignItems:'center',padding:'15px 22px',borderBottom:i<rows.length-1?'1px solid var(--core-color-border-default)':'none',background:c.self?'var(--core-color-state-selected-bg)':'transparent'}},
              h('span',{style:{width:34,height:34,borderRadius:e.kind==='person'?'50%':9,background:'var(--core-color-surface-canvas)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--app-font)',fontWeight:500,fontSize:11,color:'var(--core-color-text-secondary)',flexShrink:0}}, e.name.split(' ').slice(0,2).map(w=>w[0]).join('')),
              h('div',{style:{minWidth:0}}, h('div',{style:{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}, h('span',{style:{fontSize:14,fontWeight:500}},e.name), c.self?this.pill('This business','low'):null),
                h('div',{style:{fontSize:12,color:'var(--core-color-text-muted)',marginTop:3}}, e.type+' · '+c.ctype+(c.pct?(' · '+c.pct+'%'):'')+' · '+c.ev)),
              this.strengthMeter(c.strength),
              this.pill(this.RISK[c.risk].label,c.risk));
          })));
      }),
      // act on
      h('div',{style:{background:'var(--core-color-surface-card)',color:'var(--core-color-text-primary)',border:'1px solid var(--core-color-border-default)',borderRadius:'var(--core-radius-card)',boxShadow:'var(--core-color-elevation-card)',padding:'22px 26px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:24,flexWrap:'wrap'}},
        h('div',{style:{maxWidth:640}}, this.mono('What to act on',{color:'var(--core-color-text-muted)'}),
          h('div',{style:{fontFamily:'var(--app-font)',fontWeight:600,fontSize:23,lineHeight:1.15,margin:'8px 0 6px',color:'var(--core-color-text-primary)'}},'Risk travels into Vela through ownership it cannot see alone.'),
          h('p',{style:{margin:0,fontSize:13,color:'var(--core-color-text-secondary)',lineHeight:1.5}},'A high-risk entity, Stillwater Imports, sits three hops out via a shared officer and a common holding company. Switch to the Graph exploration to trace the path.')),
        h('button',{onClick:()=>this.setS({direction:'B',view:'intelligence'}),style:{display:'inline-flex',alignItems:'center',gap:10,padding:'8px 8px 8px 16px',minHeight:32,borderRadius:'var(--core-radius-pill)',border:'1px solid var(--core-color-action-secondary-border)',background:'var(--core-color-action-secondary-bg)',color:'var(--core-color-action-secondary-fg)',cursor:'pointer',fontSize:13,fontWeight:500,whiteSpace:'nowrap'}},'Trace in graph',h('span',{style:{width:22,height:22,borderRadius:'var(--core-radius-pill)',background:'var(--core-color-action-primary-bg)',color:'var(--core-color-action-primary-fg)',display:'inline-flex',alignItems:'center',justifyContent:'center'}},'→'))));
  }
  strengthMeter(s){
    const h=React.createElement; const n={weak:1,moderate:2,strong:3}[s]; const c=s==='strong'?'var(--core-color-interactive-default)':s==='moderate'?'var(--core-color-text-muted)':'var(--core-color-text-muted)';
    return h('div',{style:{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:5}},
      h('div',{style:{display:'flex',gap:3}}, ...[0,1,2].map(i=>h('span',{key:i,style:{width:18,height:5,borderRadius:3,background:i<n?c:'var(--core-color-border-default)'}}))),
      this.mono(s));
  }

  /* ---------- placeholders ---------- */
  soon(label){ return React.createElement('div',{style:{padding:'80px 32px',textAlign:'center',color:'var(--core-color-text-muted)',fontSize:14}}, label+': building next'); }
  /* =====================================================
     DIRECTION B — GRAPH (relationship-first)
  ===================================================== */
  bNodes(){ return [
    {id:'vela',x:540,y:376,since:0,center:true},
    {id:'okonkwo',x:300,y:104,since:0},
    {id:'meridian',x:540,y:188,since:5},
    {id:'nguyen',x:224,y:388,since:2},
    {id:'anchor',x:856,y:160,since:5},
    {id:'harbor',x:830,y:392,since:0},
    {id:'reyes',x:1030,y:262,since:0},
    {id:'stillwater',x:952,y:596,since:0},
    {id:'cedar',x:300,y:628,since:3},
    {id:'brightpath',x:580,y:632,since:3},
  ]; }
  bEdges(){ return [
    {a:'okonkwo',b:'vela',type:'Owns 100%',strength:'strong',risk:'low',dir:true,since:0,until:4,ev:'Direct owner of record, 2019–2026'},
    {a:'meridian',b:'vela',type:'Owns 60%',strength:'strong',risk:'watch',dir:true,since:5,path:true,ev:'FinCEN BOI · controlling interest since Apr 2026'},
    {a:'okonkwo',b:'meridian',type:'Owns 75%',strength:'strong',risk:'low',dir:true,since:5,path:true,ev:'FinCEN BOI filing'},
    {a:'nguyen',b:'vela',type:'Owns 15%',strength:'moderate',risk:'clear',dir:true,since:2,ev:'CA SoS officer record + BOI'},
    {a:'meridian',b:'anchor',type:'Owns 100%',strength:'strong',risk:'low',dir:true,since:5,ev:'FinCEN BOI · wholly owned'},
    {a:'okonkwo',b:'harbor',type:'Officer',strength:'strong',risk:'watch',dir:false,since:0,path:true,ev:'Director on both CA SoS records'},
    {a:'reyes',b:'harbor',type:'Officer',strength:'strong',risk:'elev',dir:false,since:0,path:true,ev:'Co-officer at Harbor Freight'},
    {a:'reyes',b:'stillwater',type:'Owns 80%',strength:'strong',risk:'high',dir:true,since:0,path:true,ev:'FinCEN BOI filing'},
    {a:'vela',b:'cedar',type:'Shared address',strength:'weak',risk:'clear',dir:false,since:3,ev:'4400 Wilshire Blvd · commercial'},
    {a:'vela',b:'brightpath',type:'Shared address',strength:'weak',risk:'clear',dir:false,since:3,ev:'4400 Wilshire Blvd · commercial'},
  ]; }

  graphCanvas(nodes,edges,opt){
    const h=React.createElement; const E=this.entities; const sel=this.state.sel; const ti=opt.timeIdx;
    const meta=n=> n.attr?{name:n.label,risk:n.risk,kind:'attr',sub:n.sub}:E[n.id];
    const visN=n=>(ti==null)||(n.since<=ti&&(n.until==null||ti<=n.until));
    const visE=e=>(ti==null)||(e.since<=ti&&(e.until==null||ti<=e.until));
    const pos={},nmap={}; nodes.forEach(n=>{pos[n.id]={x:n.x,y:n.y};nmap[n.id]=n;});
    const rad=n=> n.attr?44:(n.center?30:(E[n.id].kind==='person'?19:23));
    const eEls=[],aEls=[];
    edges.forEach((e,i)=>{ if(!visE(e))return; const A=pos[e.a],B=pos[e.b]; if(!A||!B)return;
      const dx=B.x-A.x,dy=B.y-A.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
      const rA=rad(nmap[e.a]),rB=rad(nmap[e.b]);
      const x1=A.x+ux*rA,y1=A.y+uy*rA,x2=B.x-ux*(rB+(e.dir?6:0)),y2=B.y-uy*(rB+(e.dir?6:0));
      const c=this.RISK[e.risk].c; const w={weak:1.5,moderate:2.5,strong:3.5}[e.strength];
      const hi=opt.showPath&&e.path;
      if(hi) eEls.push(h('line',{key:'g'+i,x1,y1,x2,y2,stroke:'var(--risk-high)',strokeWidth:w+6,strokeLinecap:'round',opacity:.16}));
      eEls.push(h('line',{key:'e'+i,x1,y1,x2,y2,stroke:hi?'var(--risk-high)':'var(--core-color-border-default)',strokeWidth:w,strokeLinecap:'round',strokeDasharray:hi?'7 6':(e.strength==='weak'?'2 6':'none'),style:hi?{animation:'mdDash 1s linear infinite'}:null}));
      if(e.dir){ const bx=x2-ux*8,by=y2-uy*8,px=-uy,py=ux,hw=4.5;
        aEls.push(h('polygon',{key:'a'+i,points:x2+','+y2+' '+(bx+px*hw)+','+(by+py*hw)+' '+(bx-px*hw)+','+(by-py*hw),fill:hi?'var(--risk-high)':'var(--core-color-text-muted)'})); }
      if(e.type&&e.type.indexOf('Owns')===0){ const mx=(x1+x2)/2,my=(y1+y2)/2,pct=e.type.replace('Owns ','');
        aEls.push(h('g',{key:'l'+i,transform:'translate('+mx+','+my+')'}, h('rect',{x:-18,y:-9,width:36,height:18,rx:5,fill:'var(--core-color-surface-raised)',stroke:'var(--core-color-border-default)'}), h('text',{x:0,y:3.5,textAnchor:'middle',fontSize:10,fontFamily:'var(--app-font)',fontWeight:500,fill:'var(--core-color-text-secondary)'},pct))); }
    });
    const nEls=nodes.filter(visN).map(n=>{ const m=meta(n); const r=rad(n); const c=this.RISK[m.risk].c; const isSel=sel===n.id;
      const init=m.name.split(' ').slice(0,2).map(w=>w[0]).join('');
      if(n.attr){ return h('g',{key:n.id,transform:'translate('+n.x+','+n.y+')'},
        h('rect',{x:-78,y:-26,width:156,height:52,rx:12,fill:'color-mix(in srgb, var(--core-color-brand-accent) 12%, var(--core-color-surface-raised))',stroke:'var(--core-color-brand-accent)',strokeWidth:1.5}),
        h('text',{y:-6,textAnchor:'middle',fontSize:10,fontFamily:'var(--app-font)',fontWeight:500,letterSpacing:'.05em',fill:'var(--core-color-brand-accent)'},(m.sub||'Attribute').toUpperCase()),
        h('text',{y:13,textAnchor:'middle',fontSize:13,fontFamily:'var(--app-font)',fill:'var(--core-color-text-primary)'},m.name.length>20?m.name.slice(0,19)+'…':m.name)); }
      return h('g',{key:n.id,transform:'translate('+n.x+','+n.y+')',style:{cursor:'pointer'},onClick:()=>this.setS({sel:isSel?null:n.id})},
        isSel?h('circle',{r:r+8,fill:'none',stroke:'var(--core-color-brand-accent)',strokeWidth:2}):null,
        n.center?h('circle',{r:r+6,fill:'none',stroke:'var(--core-color-brand-accent)',strokeWidth:1.5,opacity:.45}):null,
        h('circle',{r,fill:'var(--core-color-surface-raised)',stroke:c,strokeWidth:n.center?2.5:2,strokeDasharray:m.kind==='person'?'3 3':'none'}),
        h('text',{y:4,textAnchor:'middle',fontSize:n.center?13:11,fontFamily:'var(--app-font)',fontWeight:500,fill:'var(--core-color-text-primary)'},init),
        h('text',{y:r+15,textAnchor:'middle',fontSize:10.5,fontFamily:'var(--app-font)',fill:isSel?'var(--core-color-text-primary)':'var(--core-color-text-secondary)'},m.name.length>22?m.name.slice(0,20)+'…':m.name));
    });
    return h('svg',{viewBox:opt.viewBox||'0 0 880 560',preserveAspectRatio:'xMidYMid meet',style:{width:'100%',height:'100%',display:'block'}}, ...eEls, ...aEls, ...nEls);
  }

  KINDCOL(kind){ return kind==='person'?'var(--core-color-avatar-8-fg)':kind==='address'?'var(--core-color-avatar-2-fg)':kind==='phone'?'var(--core-color-avatar-10-fg)':kind==='website'?'var(--core-color-avatar-6-fg)':'var(--core-color-brand-primary)'; }
  octPath(A,B,rA,rB,bendR){
    const dx=B.x-A.x, dy=B.y-A.y; const adx=Math.abs(dx),ady=Math.abs(dy); const sx=Math.sign(dx),sy=Math.sign(dy);
    // near-straight or pure-diagonal → single segment
    if(adx<2||ady<2||Math.abs(adx-ady)<2){
      const len=Math.hypot(dx,dy)||1, ux=dx/len, uy=dy/len;
      const p0={x:A.x+ux*rA,y:A.y+uy*rA}, p2={x:B.x-ux*rB,y:B.y-uy*rB};
      return {d:'M'+p0.x+' '+p0.y+' L'+p2.x+' '+p2.y, end:p2, bend:null, dir1:{x:ux,y:uy}, dir2:{x:ux,y:uy}};
    }
    // diagonal leaves A first, then orthogonal into B (obtuse bend)
    let bend; if(adx>ady){ bend={x:A.x+sx*ady, y:B.y}; } else { bend={x:B.x, y:A.y+sy*adx}; }
    const d1={x:Math.sign(bend.x-A.x),y:Math.sign(bend.y-A.y)}; const l1=Math.hypot(bend.x-A.x,bend.y-A.y)||1; const u1={x:(bend.x-A.x)/l1,y:(bend.y-A.y)/l1};
    const d2={x:Math.sign(B.x-bend.x),y:Math.sign(B.y-bend.y)}; const l2=Math.hypot(B.x-bend.x,B.y-bend.y)||1; const u2={x:(B.x-bend.x)/l2,y:(B.y-bend.y)/l2};
    const p0={x:A.x+u1.x*rA,y:A.y+u1.y*rA}; const p2={x:B.x-u2.x*rB,y:B.y-u2.y*rB};
    const r=Math.min(bendR, l1*0.5-rA*0.5, l2*0.5-rB*0.5); const rr=Math.max(0,r);
    const c1={x:bend.x-u1.x*rr,y:bend.y-u1.y*rr}; const c2={x:bend.x+u2.x*rr,y:bend.y+u2.y*rr};
    return {d:'M'+p0.x+' '+p0.y+' L'+c1.x+' '+c1.y+' Q'+bend.x+' '+bend.y+' '+c2.x+' '+c2.y+' L'+p2.x+' '+p2.y, end:p2, bend:bend, dir1:u1, dir2:u2};
  }
  transitCanvas(nodes,edges,opt){
    const h=React.createElement; const E=this.entities; const sel=this.state.sel; const ti=opt.timeIdx;
    const meta=n=> n.attr?{name:n.label,risk:n.risk,kind:'address',sub:n.sub}:E[n.id];
    const visN=n=>(ti==null)||(n.since<=ti&&(n.until==null||ti<=n.until));
    const visE=e=>(ti==null)||(e.since<=ti&&(e.until==null||ti<=e.until));
    const pos={},nmap={}; nodes.forEach(n=>{pos[n.id]={x:n.x,y:n.y};nmap[n.id]=n;});
    const centerId=(nodes.find(n=>n.center)||{}).id;
    const firstDeg={}; edges.forEach(e=>{ if(!visE(e))return; if(e.a===centerId)firstDeg[e.b]=1; if(e.b===centerId)firstDeg[e.a]=1; });
    const tier=n=> n.center?'focus':(firstDeg[n.id]?'lit':'world');
    const rad=n=>{ const t=tier(n); return t==='focus'?30:t==='lit'?26:14; };
    const RC={clear:null,low:null,watch:'var(--risk-watch)',elev:'var(--risk-elev)',high:'var(--risk-high)'};
    // edges
    const eEls=[],chipEls=[];
    edges.forEach((e,i)=>{ if(!visE(e))return; const A=pos[e.a],B=pos[e.b]; if(!A||!B)return;
      const g=this.octPath(A,B,rad(nmap[e.a])+3,rad(nmap[e.b])+3,12);
      const kc=this.KINDCOL((meta(nmap[e.a]).kind==='person'||meta(nmap[e.b]).kind==='person')?'person':(meta(nmap[e.a]).kind==='address'||meta(nmap[e.b]).kind==='address'?'address':'business'));
      const hop=e.strength==='weak'; const w={weak:1.25,moderate:1.75,strong:2.5}[e.strength]||1.75;
      const hi=opt.showPath&&e.path;
      const lineLen=Math.hypot(B.x-A.x,B.y-A.y); const op=hop?0.5:Math.max(0.42,1-lineLen/1100);
      if(hi) eEls.push(h('path',{key:'gh'+i,d:g.d,fill:'none',stroke:'var(--risk-high)',strokeWidth:w+7,strokeLinecap:'round',strokeLinejoin:'round',opacity:.14}));
      eEls.push(h('path',{key:'e'+i,d:g.d,fill:'none',stroke:hi?'var(--risk-high)':kc,strokeWidth:w,strokeLinecap:'round',strokeLinejoin:'round',opacity:hi?0.95:op,strokeDasharray:hop?'1 7':(hi?'8 6':'none'),strokeDashoffset:hop?0:undefined,style:hi?{animation:'mdDash 1s linear infinite'}:null}));
      if(e.dir){ const bx=g.end.x-g.dir2.x*8,by=g.end.y-g.dir2.y*8,px=-g.dir2.y,py=g.dir2.x,hw=4.5;
        eEls.push(h('polygon',{key:'a'+i,points:g.end.x+','+g.end.y+' '+(bx+px*hw)+','+(by+py*hw)+' '+(bx-px*hw)+','+(by-py*hw),fill:hi?'var(--risk-high)':kc,opacity:hi?.95:Math.max(.5,op)})); }
      if(e.type&&e.type.indexOf('Owns')===0&&!hop){ const chipP=g.bend||{x:(A.x+B.x)/2,y:(A.y+B.y)/2}; const pct=e.type.replace('Owns ','');
        chipEls.push(h('g',{key:'l'+i,transform:'translate('+chipP.x+','+chipP.y+')'}, h('rect',{x:-19,y:-10,width:38,height:20,rx:6,fill:'var(--core-color-surface-card)',stroke:'var(--core-color-border-default)'}), h('text',{x:0,y:4,textAnchor:'middle',fontSize:10.5,fontFamily:'var(--app-font)',fontWeight:500,fontWeight:600,fill:'var(--core-color-text-secondary)'},pct))); }
    });
    // nodes: mark + nameplate
    const nEls=[]; nodes.filter(visN).forEach(n=>{ const m=meta(n); const t=tier(n); const r=rad(n); const kc=this.KINDCOL(m.kind); const isSel=sel===n.id;
      const rc=RC[m.risk]; const init=m.name.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('');
      const isPerson=m.kind==='person';
      let mark;
      if(t==='world'){
        mark = isPerson
          ? h('circle',{r:r*0.62,fill:'var(--core-color-surface-card)',stroke:kc,strokeWidth:2.5})
          : h('rect',{x:-r*0.55,y:-r*0.55,width:r*1.1,height:r*1.1,rx:3,fill:'var(--core-color-surface-card)',stroke:kc,strokeWidth:2.5});
      } else {
        const tile = isPerson
          ? h('circle',{r,fill:kc})
          : h('rect',{x:-r,y:-r,width:r*2,height:r*2,rx:t==='focus'?9:7,fill:kc});
        mark = h('g',null, tile, h('text',{y:t==='focus'?6:5.5,textAnchor:'middle',fontSize:t==='focus'?16:14,fontFamily:'var(--app-font)',fontWeight:500,fontWeight:600,fill:'var(--core-color-text-inverse)'},init));
      }
      // nameplate card (skip full card for world unless selected; show ring only otherwise)
      const showCard = t!=='world' || isSel;
      const cardY = r + 9;
      const nm = m.name.length>24?m.name.slice(0,22)+'…':m.name;
      const sub = (t==='focus'? (m.type+' · '+m.sub) : m.sub) || '';
      const cw = Math.max(nm.length,(sub||'').length)*7+24; const cwc=Math.min(210,Math.max(70,cw));
      const card = showCard? h('g',{transform:'translate(0,'+cardY+')'},
        h('rect',{x:-cwc/2,y:0,width:cwc,height:sub?36:22,rx:5,fill:'var(--core-color-surface-card)',stroke:'var(--core-color-border-default)'}),
        h('text',{x:0,y:15,textAnchor:'middle',fontSize:13.5,fontFamily:'var(--app-font)',fontWeight:600,letterSpacing:'-0.01em',fill:'var(--core-color-text-primary)'},nm),
        sub?h('text',{x:0,y:29,textAnchor:'middle',fontSize:10.5,fontFamily:'var(--app-font)',fill:'var(--core-color-text-muted)'},sub.length>30?sub.slice(0,29)+'…':sub):null) : null;
      nEls.push(h('g',{key:n.id,transform:'translate('+n.x+','+n.y+')',style:{cursor:'pointer'},onClick:()=>this.setS({sel:isSel?null:n.id})},
        isSel?(isPerson?h('circle',{r:r+7,fill:'none',stroke:'var(--core-color-focus-ring)',strokeWidth:2}):h('rect',{x:-(r+7),y:-(r+7),width:(r+7)*2,height:(r+7)*2,rx:11,fill:'none',stroke:'var(--core-color-focus-ring)',strokeWidth:2})):null,
        (t==='focus'&&!isSel)?h('rect',{x:-(r+6),y:-(r+6),width:(r+6)*2,height:(r+6)*2,rx:11,fill:'none',stroke:'var(--core-color-border-bold)',strokeWidth:1.5,opacity:.35}):null,
        rc?(isPerson?h('circle',{r:r+5,fill:'none',stroke:rc,strokeWidth:2}):h('rect',{x:-(r+5),y:-(r+5),width:(r+5)*2,height:(r+5)*2,rx:9,fill:'none',stroke:rc,strokeWidth:2})):null,
        mark, card));
    });
    return h('svg',{viewBox:opt.viewBox||'0 0 1160 720',preserveAspectRatio:'xMidYMid meet',style:{width:'100%',height:'100%',display:'block'}},
      h('defs',null, h('pattern',{id:'regcross',width:80,height:80,patternUnits:'userSpaceOnUse'}, h('path',{d:'M40 36 V44 M36 40 H44',stroke:'var(--core-color-text-secondary)',strokeWidth:1,opacity:.09}))),
      h('rect',{x:0,y:0,width:1160,height:720,fill:'url(#regcross)'}),
      ...eEls, ...chipEls, ...nEls);
  }
  transitLegend(){ const h=React.createElement;
    const kind=(c,shape,label)=>h('div',{style:{display:'flex',alignItems:'center',gap:8,fontSize:11.5,color:'var(--core-color-text-secondary)'}}, h('svg',{width:16,height:16}, shape==='circle'?h('circle',{cx:8,cy:8,r:6,fill:c}):h('rect',{x:2,y:2,width:12,height:12,rx:2.5,fill:c})),label);
    const risk=(c,label)=>h('div',{style:{display:'flex',alignItems:'center',gap:8,fontSize:11.5,color:'var(--core-color-text-secondary)'}}, h('svg',{width:16,height:16}, h('circle',{cx:8,cy:8,r:6,fill:'none',stroke:c,strokeWidth:2})),label);
    return h('div',{style:{display:'flex',flexDirection:'column',gap:9}},
      kind(this.KINDCOL('business'),'rect','Business'),
      kind(this.KINDCOL('person'),'circle','Person'),
      h('div',{style:{height:1,background:'var(--core-color-border-default)',margin:'3px 0'}}),
      risk('var(--risk-watch)','Watch'), risk('var(--risk-elev)','Elevated'), risk('var(--risk-high)','High'),
      h('div',{style:{display:'flex',alignItems:'center',gap:8,fontSize:11.5,color:'var(--core-color-text-secondary)',marginTop:2}}, h('svg',{width:20,height:8}, h('line',{x1:1,y1:4,x2:19,y2:4,stroke:'var(--risk-high)',strokeWidth:3,strokeDasharray:'5 4'})),'Risk path'));
  }

  pathToggleLight(){ const on=this.state.showPath!==false; const h=React.createElement;
    return h('button',{onClick:()=>this.setState({showPath:!on}),style:{display:'inline-flex',alignItems:'center',gap:8,padding:'7px 12px',borderRadius:9,border:'1px solid '+(on?'var(--risk-high)':'var(--core-color-border-default)'),background:on?'color-mix(in srgb, var(--risk-high) 8%, var(--core-color-surface-card))':'var(--core-color-surface-card)',color:on?'var(--risk-high)':'var(--core-color-text-muted)',cursor:'pointer',fontFamily:'var(--app-font)',fontWeight:500,fontSize:10.5,letterSpacing:'.05em',textTransform:'uppercase'}}, h('span',{style:{width:8,height:8,borderRadius:'50%',background:on?'var(--risk-high)':'var(--core-color-border-default)'}}),'Risk path'); }

  pathToggle(){ const on=this.state.showPath!==false; const h=React.createElement;
    return h('button',{onClick:()=>this.setState({showPath:!on}),style:{display:'inline-flex',alignItems:'center',gap:8,padding:'7px 12px',borderRadius:9,border:'1px solid '+(on?'var(--risk-high)':'var(--core-color-border-default)'),background:on?'color-mix(in srgb, var(--risk-high) 18%, var(--core-color-surface-raised))':'transparent',color:on?'var(--risk-elev)':'var(--core-color-text-secondary)',cursor:'pointer',fontFamily:'var(--app-font)',fontWeight:500,fontSize:10.5,letterSpacing:'.05em',textTransform:'uppercase'}}, h('span',{style:{width:8,height:8,borderRadius:'50%',background:on?'var(--risk-high)':'var(--core-color-border-default)'}}),'Risk path'); }

  legendRow(){ const h=React.createElement;
    const swatch=(c,label)=>h('div',{style:{display:'flex',alignItems:'center',gap:7,fontSize:11,color:'var(--core-color-text-secondary)'}}, h('span',{style:{width:9,height:9,borderRadius:'50%',background:c}}),label);
    return h('div',{style:{display:'flex',flexDirection:'column',gap:8}},
      h('div',{style:{display:'flex',flexWrap:'wrap',gap:'8px 14px'}}, swatch('var(--risk-clear)','Clear'), swatch('var(--risk-watch)','Watch'), swatch('var(--risk-elev)','Elevated'), swatch('var(--risk-high)','High')),
      h('div',{style:{display:'flex',gap:16,marginTop:4}},
        h('div',{style:{display:'flex',alignItems:'center',gap:7,fontSize:11,color:'var(--core-color-text-secondary)'}}, h('span',{style:{width:18,height:3.5,borderRadius:3,background:'var(--core-color-text-muted)'}}),'Strong'),
        h('div',{style:{display:'flex',alignItems:'center',gap:7,fontSize:11,color:'var(--core-color-text-secondary)'}}, h('span',{style:{width:18,height:2,borderRadius:3,background:'var(--core-color-text-muted)'}}),'Weak')),
      h('div',{style:{display:'flex',gap:16,marginTop:2}},
        h('div',{style:{display:'flex',alignItems:'center',gap:7,fontSize:11,color:'var(--core-color-text-secondary)'}}, h('svg',{width:16,height:16}, h('circle',{cx:8,cy:8,r:6,fill:'none',stroke:'var(--core-color-text-muted)',strokeWidth:2})),'Business'),
        h('div',{style:{display:'flex',alignItems:'center',gap:7,fontSize:11,color:'var(--core-color-text-secondary)'}}, h('svg',{width:16,height:16}, h('circle',{cx:8,cy:8,r:6,fill:'none',stroke:'var(--core-color-text-muted)',strokeWidth:2,strokeDasharray:'2.5 2.5'})),'Person')));
  }

  bDrawer(nodes,edges,ti){
    const h=React.createElement; const E=this.entities; const sel=this.state.sel;
    const wrap=(...k)=>h('div',{style:{width:316,flexShrink:0,borderLeft:'1px solid var(--core-color-border-divider)',background:'var(--core-color-surface-raised)',padding:'18px 20px',overflowY:'auto',color:'var(--core-color-text-primary)'}},...k);
    if(sel&&E[sel]){ const e=E[sel];
      const rel=edges.filter(x=>(x.a===sel||x.b===sel)&&((ti==null)||(x.since<=ti&&(x.until==null||ti<=x.until))));
      return wrap(
        h(ActionButton,{variant:'quiet',onClick:()=>this.setS({sel:null}),style:{marginBottom:14,marginLeft:-8}},'← Overview'),
        this.mono(e.kind==='person'?'Person':'Business',{color:'var(--core-color-text-muted)'}),
        h('div',{style:{fontFamily:'var(--app-font)',fontWeight:600,fontSize:23,lineHeight:1.12,margin:'5px 0 4px'}},e.name),
        h('div',{style:{fontSize:12.5,color:'var(--core-color-text-secondary)',marginBottom:12}},e.type+' · '+e.sub),
        this.pill(this.RISK[e.risk].label+' risk',e.risk),
        h('div',{style:{margin:'18px 0 6px'}},this.mono('Relationships',{color:'var(--core-color-text-muted)'})),
        ...rel.map((x,i)=>{ const other=E[x.a===sel?x.b:x.a]; const rc=this.RISK[x.risk].c;
          return h('div',{key:i,style:{padding:'11px 0',borderBottom:i<rel.length-1?'1px solid var(--core-color-border-divider)':'none'}},
            h('div',{style:{display:'flex',justifyContent:'space-between',gap:8,alignItems:'flex-start'}}, h('span',{style:{fontSize:13}},other?other.name:x.b), h('span',{style:{width:8,height:8,borderRadius:'50%',background:rc,marginTop:5,flexShrink:0}})),
            h('div',{style:{fontSize:11.5,color:'var(--core-color-text-secondary)',marginTop:3}}, x.type+' · '+x.strength+' link'),
            h('div',{style:{fontSize:11,color:'var(--core-color-text-muted)',marginTop:3,lineHeight:1.4}}, x.ev)); }));
    }
    const visN=nodes.filter(n=>n.center||((ti==null)||(n.since<=ti&&(n.until==null||ti<=n.until)))).filter(n=>!n.attr);
    const high=visN.filter(n=>E[n.id]&&E[n.id].risk==='high').length;
    return wrap(
      this.mono('Network overview',{color:'var(--core-color-text-muted)'}),
      h('div',{style:{display:'flex',gap:24,margin:'12px 0 18px'}},
        h('div',null, h('div',{style:{fontFamily:'var(--app-font)',fontSize:34,fontWeight:600,lineHeight:1}},visN.length), this.mono('entities',{color:'var(--core-color-text-muted)'})),
        h('div',null, h('div',{style:{fontFamily:'var(--app-font)',fontSize:34,fontWeight:600,lineHeight:1,color:'var(--risk-elev)'}},high), this.mono('high-risk',{color:'var(--core-color-text-muted)'}))),
      (this.state.showPath!==false)?h('div',{style:{padding:'12px 14px',borderRadius:'var(--core-radius-card)',background:'color-mix(in srgb, var(--risk-high) 15%, var(--core-color-surface-raised))',border:'1px solid color-mix(in srgb, var(--risk-high) 38%, var(--core-color-surface-raised))',marginBottom:18}},
        this.mono('Risk path detected',{color:'var(--risk-elev)'}),
        h('div',{style:{fontSize:12.5,lineHeight:1.55,color:'var(--core-color-text-primary)',marginTop:7}},'A high-risk entity links into Vela through ownership and a shared officer, invisible from this record alone:'),
        h('div',{style:{fontSize:12,lineHeight:1.7,color:'var(--core-color-text-secondary)',marginTop:8,fontFamily:'var(--app-font)',fontWeight:500,letterSpacing:'.01em'}},'Stillwater → J. Reyes → Harbor → Okonkwo → Meridian → Vela')):null,
      this.mono('Legend',{color:'var(--core-color-text-muted)'}),
      h('div',{style:{marginTop:10}}, this.legendRow()),
      h('div',{style:{marginTop:18,fontSize:11.5,color:'var(--core-color-text-muted)',lineHeight:1.5}},'Click any node to inspect its relationships. Drag the timeline to watch the network take shape.'));
  }

  bScrubber(){
    const h=React.createElement; const V=this.versions; const idx=this.state.timeIdx;
    return h('div',{style:{padding:'12px 26px 14px',borderTop:'1px solid var(--core-color-border-divider)'}},
      h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:14}},
        h('div',null, this.mono('Identity over time',{color:'var(--core-color-text-muted)'}), h('span',{style:{color:'var(--core-color-text-primary)',fontSize:13,marginLeft:12}},'As of '+V[idx].date+' · '+V[idx].title)),
        this.mono('Version '+(idx+1)+' / '+V.length,{color:'var(--core-color-text-muted)'})),
      h('div',{style:{position:'relative',height:30}},
        h('div',{style:{position:'absolute',top:6,left:7,right:7,height:2,background:'var(--core-color-border-default)'}}),
        h('div',{style:{position:'absolute',top:6,left:7,width:'calc((100% - 14px) * '+(idx/(V.length-1))+')',height:2,background:'var(--core-color-brand-accent)'}}),
        h('div',{style:{position:'absolute',inset:0,display:'flex',justifyContent:'space-between'}},
          ...V.map((v,i)=> h('button',{key:i,onClick:()=>this.setS({timeIdx:i}),title:v.title,style:{background:'none',border:0,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:7,padding:0}},
            h('span',{style:{width:i===idx?14:10,height:i===idx?14:10,borderRadius:'50%',background:i<=idx?'var(--core-color-brand-accent)':'var(--core-color-surface-sunken)',border:'2px solid '+(i<=idx?'var(--core-color-brand-accent)':'var(--core-color-border-default)'),transition:'all .2s'}}),
            h('span',{style:{fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.02em',color:i===idx?'var(--core-color-text-primary)':'var(--core-color-text-muted)'}},v.date.split(', ')[0])))) ));
  }

  bNetworkOverview(nodes,edges,ti){
    const h=React.createElement; const E=this.entities;
    const visN=nodes.filter(n=>n.center||((ti==null)||(n.since<=ti&&(n.until==null||ti<=n.until)))).filter(n=>!n.attr);
    const visE=edges.filter(e=>(ti==null)||(e.since<=ti&&(e.until==null||ti<=e.until)));
    const high=visN.filter(n=>E[n.id]&&E[n.id].risk==='high').length;
    const own=visE.filter(e=>e.type&&e.type.indexOf('Owns')===0).length;
    const stat=(n,label,c)=>h('div',{style:{display:'flex',flexDirection:'column',gap:4}}, h('div',{style:{fontFamily:'var(--app-font)',fontWeight:600,fontSize:34,lineHeight:1,color:c||'var(--core-color-text-primary)'}},n), this.mono(label,{color:'var(--core-color-text-muted)'}));
    return this.panel({}, this.panelHead('Network overview', this.mono('As of '+this.versions[ti].date)),
      h('div',{style:{padding:'18px 22px',display:'flex',flexDirection:'column',gap:18}},
        h('div',{style:{display:'flex',gap:36,flexWrap:'wrap'}}, stat(visN.length,'connected entities'), stat(own,'ownership links'), stat(high,'high-risk',high?'var(--risk-high)':'var(--core-color-text-primary)')),
        (this.state.showPath!==false)?h('div',{style:{display:'flex',gap:12,alignItems:'flex-start',padding:'14px 16px',borderRadius:'var(--core-radius-card)',background:'color-mix(in srgb, var(--risk-high) 7%, var(--core-color-surface-card))',border:'1px solid color-mix(in srgb, var(--risk-high) 24%, var(--core-color-surface-card))'}},
          h('span',{style:{width:8,height:8,borderRadius:'50%',background:'var(--risk-high)',marginTop:5,flexShrink:0}}),
          h('div',{style:{minWidth:0}}, this.mono('Risk path detected',{color:'var(--risk-high)',display:'block',marginBottom:5}),
            h('div',{style:{fontSize:13,lineHeight:1.5,color:'var(--core-color-text-secondary)'}},'A high-risk entity links into Vela through ownership and a shared officer, invisible from this record alone.'),
            h('div',{style:{fontSize:12,lineHeight:1.6,color:'var(--core-color-text-muted)',marginTop:7,fontFamily:'var(--app-font)',fontWeight:500,letterSpacing:'.01em'}},'Stillwater → J. Reyes → Harbor → Okonkwo → Meridian → Vela'))):null));
  }

  bEntityList(nodes,edges,ti){
    const h=React.createElement; const E=this.entities; const sel=this.state.sel;
    const uboIds={meridian:1,okonkwo:1}; // controlling beneficial owners of Vela
    const visN=nodes.filter(n=>n.center||((ti==null)||(n.since<=ti&&(n.until==null||ti<=n.until)))).filter(n=>!n.attr);
    const rank={high:4,elev:3,watch:2,low:1,clear:0};
    const grp=(n)=> uboIds[n.id]?'ubo':(E[n.id].kind==='person'?'person':'business');
    const sortFn=(a,b)=>{ if(a.center) return -1; if(b.center) return 1; return (rank[E[b.id].risk]||0)-(rank[E[a.id].risk]||0); };
    const sections=[
      {key:'ubo',label:'Beneficial owners (UBO)',note:'Controlling owners: who the business answers to'},
      {key:'business',label:'Businesses',note:'Connected business entities'},
      {key:'person',label:'Individuals',note:'Officers and people on record'},
    ].map(s=>({...s,rows:visN.filter(n=>grp(n)===s.key).sort(sortFn)})).filter(s=>s.rows.length);
    const row=(n,i,last)=>{ const e=E[n.id]; const open=sel===n.id;
      const rel=edges.filter(x=>(x.a===n.id||x.b===n.id)&&((ti==null)||(x.since<=ti&&(x.until==null||ti<=x.until)))); const rc=this.RISK[e.risk].c;
      return h('div',{key:n.id,style:{borderBottom:last?'none':'1px solid var(--core-color-border-default)',background:open?'var(--core-color-surface-inset)':(n.center?'var(--core-color-state-selected-bg)':'transparent')}},
        h('button',{onClick:()=>this.setS({sel:open?null:n.id}),style:{display:'grid',gridTemplateColumns:'auto 1fr auto auto',gap:14,alignItems:'center',width:'100%',padding:'14px 22px',border:0,background:'transparent',cursor:'pointer',textAlign:'left',fontFamily:'inherit'}},
          h('span',{style:{width:36,height:36,borderRadius:e.kind==='person'?'50%':9,background:'var(--core-color-surface-canvas)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--app-font)',fontWeight:500,fontSize:11,color:'var(--core-color-text-secondary)',flexShrink:0}}, e.name.split(' ').slice(0,2).map(w=>w[0]).join('')),
          h('div',{style:{minWidth:0}}, h('div',{style:{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}, h('span',{style:{fontSize:14,fontWeight:500}},e.name), n.center?this.pill('This business','low'):null),
            h('div',{style:{fontSize:12,color:'var(--core-color-text-muted)',marginTop:3}}, e.type+' · '+e.sub+' · '+rel.length+(rel.length===1?' connection':' connections'))),
          this.pill(this.RISK[e.risk].label,e.risk),
          h('span',{style:{color:'var(--core-color-text-muted)',fontSize:12,transform:open?'rotate(180deg)':'none',transition:'transform .2s'}},'⌄')),
        open?h('div',{style:{padding:'0 22px 16px 72px',display:'flex',flexDirection:'column',gap:9,animation:'mdFade .2s var(--core-ease-standard)'}}, ...rel.map((x,k)=>{ const other=E[x.a===n.id?x.b:x.a]; const xc=this.RISK[x.risk].c;
          return h('div',{key:k,style:{display:'grid',gridTemplateColumns:'1fr auto auto',gap:12,alignItems:'center',padding:'10px 13px',borderRadius:10,border:'1px solid var(--core-color-border-default)'}},
            h('div',{style:{minWidth:0}}, h('div',{style:{fontSize:13,fontWeight:500}},other?other.name:x.b), h('div',{style:{fontSize:11.5,color:'var(--core-color-text-muted)',marginTop:2}}, x.type+' · '+x.ev)),
            this.strengthMeter(x.strength),
            this.pill(this.RISK[x.risk].label,x.risk)); })):null); };
    return this.panel({}, this.panelHead('Entities in this network', this.mono(visN.length+' total · '+sections.length+' types')),
      h('div',null, ...sections.map((s,si)=>
        h('div',{key:s.key},
          h('div',{style:{display:'flex',alignItems:'baseline',gap:12,padding:'14px 22px 10px',background:'var(--core-color-surface-inset)',borderTop:si>0?'1px solid var(--core-color-border-default)':'none',borderBottom:'1px solid var(--core-color-border-default)'}},
            h('span',{style:{fontSize:12.5,fontWeight:500}},s.label),
            this.mono(s.rows.length+'',{color:'var(--core-color-text-muted)'}),
            h('span',{style:{fontSize:11.5,color:'var(--core-color-text-muted)'}},s.note)),
          ...s.rows.map((n,i)=>row(n,i,i===s.rows.length-1))))));
  }

  bTimeline(){
    const h=React.createElement; const V=this.versions; const idx=this.state.timeIdx;
    return this.panel({}, this.panelHead('Identity over time', this.mono('Version '+(idx+1)+' / '+V.length)),
      h('div',{style:{padding:'18px 26px 20px'}},
        h('div',{style:{display:'flex',alignItems:'baseline',gap:12,marginBottom:18,flexWrap:'wrap'}},
          h('span',{style:{fontFamily:'var(--app-font)',fontWeight:600,fontSize:20,lineHeight:1}},V[idx].title),
          this.mono('As of '+V[idx].date,{color:'var(--core-color-text-muted)'})),
        h('div',{style:{position:'relative',height:34}},
          h('div',{style:{position:'absolute',top:6,left:7,right:7,height:2,background:'var(--core-color-border-default)'}}),
          h('div',{style:{position:'absolute',top:6,left:7,width:'calc((100% - 14px) * '+(idx/(V.length-1))+')',height:2,background:'var(--core-color-tab-indicator)'}}),
          h('div',{style:{position:'absolute',inset:0,display:'flex',justifyContent:'space-between'}},
            ...V.map((v,i)=> h('button',{key:i,onClick:()=>this.setS({timeIdx:i}),title:v.title,style:{background:'none',border:0,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:0}},
              h('span',{style:{width:i===idx?15:11,height:i===idx?15:11,borderRadius:'50%',background:i<=idx?'var(--core-color-tab-indicator)':'var(--core-color-surface-card)',border:'2px solid '+(i<=idx?'var(--core-color-tab-indicator)':'var(--core-color-border-default)'),transition:'all .2s'}}),
              h('span',{style:{fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.02em',color:i===idx?'var(--core-color-tab-fg-active)':'var(--core-color-text-muted)'}},v.date.split(', ')[0])))))));
  }

  bGraphCanvas(nodes,edges,ti){
    const h=React.createElement; const pathMode=this.state.netMode==='path';
    const modeSeg=h(SegmentedControl,{size:'sm',value:this.state.netMode,onValueChange:(v)=>this.setState({netMode:v}),'aria-label':'Network view mode'},
      h(SegmentedControlItem,{value:'graph'},'Graph'),
      h(SegmentedControlItem,{value:'path'},'Risk path'));
    return h('div',{style:{background:'var(--core-color-surface-card)',border:'1px solid var(--core-color-border-default)',borderRadius:'var(--core-radius-card)',overflow:'hidden',display:'flex',flexDirection:'column',height:640}},
      h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'15px 22px',borderBottom:'1px solid var(--core-color-border-default)'}},
        h('div',null, this.mono('Relationship network · transit map',{color:'var(--core-color-text-muted)'}), h('div',{style:{color:'var(--core-color-text-primary)',fontFamily:'var(--app-font)',fontWeight:600,fontSize:21,marginTop:4}}, pathMode?'How risk reaches Vela Logistics':'What shapes Vela Logistics, and what connects to it')),
        h('div',{style:{display:'flex',alignItems:'center',gap:10}},
          modeSeg,
          pathMode?null:this.pathToggleLight())),
      pathMode?this.riskPathBody()
        : h('div',{style:{flex:1,display:'flex',minHeight:0,background:'var(--core-color-surface-card)'}},
        h('div',{style:{flex:1,minHeight:0,padding:'6px',minWidth:0}}, this.transitCanvas(nodes,edges,{timeIdx:ti,showPath:this.state.showPath!==false})),
        h('div',{style:{width:214,flexShrink:0,borderLeft:'1px solid var(--core-color-border-default)',padding:'18px 20px',display:'flex',flexDirection:'column',gap:14,overflowY:'auto',background:'var(--core-color-surface-card)'}},
          this.mono('Legend',{color:'var(--core-color-text-muted)'}), this.transitLegend(),
          h('div',{style:{marginTop:'auto',fontSize:11.5,color:'var(--core-color-text-muted)',lineHeight:1.5}},'Click a station to inspect it below. Every line is a citation; weak links draw dotted. Drag the timeline to watch the network take shape.'))));
  }

  get riskPath(){ return [
    {id:'vela', tag:'Evaluated business'},
    {id:'meridian', edge:'is 60% owned by', erisk:'watch', kind:'Ownership'},
    {id:'okonkwo', edge:'is 75% owned by', erisk:'low', kind:'Ownership'},
    {id:'harbor', edge:'shares an officer with', erisk:'watch', kind:'Officer'},
    {id:'reyes', edge:'is co-officered by', erisk:'elev', kind:'Officer'},
    {id:'stillwater', edge:'is 80% owned by', erisk:'high', kind:'Ownership'},
  ]; }
  riskPathBody(){
    const h=React.createElement; const E=this.entities; const P=this.riskPath;
    const card=(p,i)=>{ const e=E[p.id]; const rc=this.RISK[e.risk].c; const isEnd=i===P.length-1; const isStart=i===0;
      return h('div',{key:'n'+i,style:{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderRadius:'var(--core-radius-card)',background:'var(--core-color-surface-raised)',border:'1px solid '+(isEnd||isStart?rc:'var(--core-color-border-default)'),boxShadow:isEnd?'0 0 0 3px color-mix(in srgb, '+rc+' 20%, transparent)':'none'}},
        h('span',{style:{width:40,height:40,borderRadius:e.kind==='person'?'50%':10,background:'var(--core-color-surface-inverse)',border:'1.5px solid '+rc,borderStyle:e.kind==='person'?'dashed':'solid',display:'inline-flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--app-font)',fontWeight:500,fontSize:12,color:'var(--core-color-text-primary)',flexShrink:0}}, e.name.split(' ').slice(0,2).map(w=>w[0]).join('')),
        h('div',{style:{flex:1,minWidth:0}},
          h('div',{style:{display:'flex',alignItems:'center',gap:9,flexWrap:'wrap'}}, h('span',{style:{fontSize:14.5,fontWeight:500,color:'var(--core-color-text-primary)'}},e.name), isStart?this.mono(p.tag,{color:'var(--core-color-text-muted)'}):null),
          h('div',{style:{fontSize:11.5,color:'var(--core-color-text-muted)',marginTop:2}}, e.type+' · '+e.sub)),
        this.pill(this.RISK[e.risk].label,e.risk)); };
    const connector=(p,i)=>{ const c=this.RISK[p.erisk].c;
      return h('div',{key:'c'+i,style:{display:'flex',alignItems:'center',gap:12,paddingLeft:20,margin:'2px 0'}},
        h('div',{style:{width:2,height:30,borderRadius:2,background:'repeating-linear-gradient(to bottom, '+c+' 0 5px, transparent 5px 10px)'}}),
        h('div',{style:{display:'flex',alignItems:'center',gap:8}},
          this.mono(p.kind,{color:c}),
          h('span',{style:{fontSize:12.5,color:'var(--core-color-text-secondary)'}},p.edge),
          h('span',{style:{fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.04em',textTransform:'uppercase',color:c,border:'1px solid color-mix(in srgb, '+c+' 40%, var(--core-color-surface-raised))',background:'color-mix(in srgb, '+c+' 12%, var(--core-color-surface-raised))',padding:'2px 7px',borderRadius:'var(--core-radius-pill)'}}, this.RISK[p.erisk].label+' carries')));
    };
    const seq=[]; P.forEach((p,i)=>{ if(i>0) seq.push(connector(p,i)); seq.push(card(p,i)); });
    return h('div',{style:{flex:1,minHeight:0,display:'flex'}},
      h('div',{style:{flex:1,minHeight:0,overflowY:'auto',padding:'22px 26px'}},
        h('div',{style:{maxWidth:600,margin:'0 auto'}},
          h('div',{style:{marginBottom:18}}, this.mono('One path · '+(P.length-1)+' hops · all strong links',{color:'var(--core-color-text-muted)'}),
            h('div',{style:{color:'var(--core-color-text-secondary)',fontSize:13,lineHeight:1.55,marginTop:8}},'A single chain of strong connections carries risk into Vela. Every hop is invisible from the business on its own. This is what the standalone Identity view cannot show.')),
          ...seq)),
      h('div',{style:{width:236,flexShrink:0,borderLeft:'1px solid var(--core-color-border-divider)',padding:'18px 18px',display:'flex',flexDirection:'column',gap:12,overflowY:'auto'}},
        this.mono('At the end of the path',{color:'var(--core-color-text-muted)'}),
        h('div',{style:{fontFamily:'var(--app-font)',fontWeight:600,fontSize:26,lineHeight:1.1,color:'var(--core-color-text-primary)'}},'Stillwater Imports'),
        h('div',{style:{marginTop:2}},this.pill('High risk','high')),
        h('div',{style:{fontSize:12,color:'var(--core-color-text-secondary)',lineHeight:1.5,marginTop:6}},'Sanctioned-adjacent importer. No direct tie to Vela. Reachable only by walking 5 strong links out.'),
        h('div',{style:{height:1,background:'var(--core-color-border-divider)',margin:'6px 0'}}),
        this.mono('Why it matters',{color:'var(--core-color-text-muted)'}),
        h('div',{style:{fontSize:12,color:'var(--core-color-text-secondary)',lineHeight:1.5}},'Ownership and shared-officer edges are directed and strong, so risk propagates along them. A shared address would not.'),
        h(ActionButton,{variant:'primary',onClick:()=>this.setState({decisionsOpen:true}),style:{marginTop:'auto'}},'Review pending decision',h('span',null,'→'))));
  }

  B_identity(){
    const h=React.createElement; const nodes=this.bNodes(),edges=this.bEdges(); const ti=this.state.timeIdx;
    return h('div',{style:{padding:'26px 32px 44px',maxWidth:1280,margin:'0 auto',display:'flex',flexDirection:'column',gap:18}},
      this.bGraphCanvas(nodes,edges,ti),
      this.bTimeline(),
      this.bNetworkOverview(nodes,edges,ti),
      this.bEntityList(nodes,edges,ti));
  }

  bIntel(qk){
    const q=qk||this.state.query;
    if(q==='address') return { center:{id:'q',attr:true,x:440,y:285,label:'4400 Wilshire Blvd',sub:'Address',risk:'low'},
      nodes:[{id:'vela',x:195,y:150},{id:'cedar',x:685,y:150},{id:'brightpath',x:685,y:420},{id:'lumen',x:195,y:420}],
      edges:[{a:'q',b:'vela',type:'Address',strength:'weak',risk:'clear',ev:'Principal address since 2024'},{a:'q',b:'cedar',type:'Address',strength:'weak',risk:'clear',ev:'Registered agent address'},{a:'q',b:'brightpath',type:'Address',strength:'weak',risk:'clear',ev:'Mailing address, 2 filings'},{a:'q',b:'lumen',type:'Address',strength:'weak',risk:'clear',ev:'Listed agent address'}] };
    if(q==='ubo') return { center:{id:'q',attr:true,x:440,y:300,label:'Meridian Holdings LLC',sub:'Beneficial owner',risk:'watch'},
      nodes:[{id:'okonkwo',x:440,y:90},{id:'vela',x:215,y:380},{id:'anchor',x:665,y:380}],
      edges:[{a:'okonkwo',b:'q',type:'Owns 75%',strength:'strong',risk:'low',dir:true,ev:'FinCEN BOI filing'},{a:'q',b:'vela',type:'Owns 60%',strength:'strong',risk:'watch',dir:true,ev:'Controlling interest'},{a:'q',b:'anchor',type:'Owns 100%',strength:'strong',risk:'low',dir:true,ev:'Wholly owned'}] };
    return { center:{id:'q',attr:true,x:380,y:290,label:'Marcus Okonkwo',sub:'Officer / owner',risk:'elev'},
      nodes:[{id:'meridian',x:400,y:80},{id:'vela',x:160,y:200},{id:'harbor',x:660,y:170},{id:'reyes',x:760,y:380},{id:'stillwater',x:560,y:470}],
      edges:[{a:'q',b:'meridian',type:'Owns 75%',strength:'strong',risk:'low',dir:true,ev:'FinCEN BOI filing'},{a:'q',b:'vela',type:'Controls via Meridian',strength:'strong',risk:'watch',dir:false,path:true,ev:'Indirect control'},{a:'q',b:'harbor',type:'Officer',strength:'strong',risk:'watch',dir:false,path:true,ev:'Director, CA SoS'},{a:'reyes',b:'harbor',type:'Officer',strength:'strong',risk:'elev',dir:false,path:true,ev:'Co-officer at Harbor'},{a:'reyes',b:'stillwater',type:'Owns 80%',strength:'strong',risk:'high',dir:true,path:true,ev:'FinCEN BOI filing'}] };
  }

  B_intel(){
    const h=React.createElement; const q=this.state.query; const Q=this.queries[q]; const g=this.bIntel();
    const allNodes=[g.center,...g.nodes];
    // @core SegmentedControl (design-system/core/SegmentedControl.tsx)
    const querySeg=h(SegmentedControl,{size:'sm',value:q,onValueChange:(v)=>{ if(v) this.setS({query:v,sel:null}); },'aria-label':'Query attribute'},
      h(SegmentedControlItem,{value:'address'},'Address'),
      h(SegmentedControlItem,{value:'ubo'},'Owner'),
      h(SegmentedControlItem,{value:'officer'},'Officer'));
    return h('div',{style:{padding:'22px 28px 28px'}},
      h('div',{className:'core-theme','data-theme':'dark',style:{background:'var(--core-color-surface-card)',borderRadius:'var(--core-radius-card)',overflow:'hidden',display:'flex',flexDirection:'column',height:'calc(100vh - 116px)',minHeight:600}},
        h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'15px 22px',borderBottom:'1px solid var(--core-color-border-divider)',flexWrap:'wrap'}},
          h('div',null, this.mono('Intelligence · Start from a data attribute',{color:'var(--core-color-text-muted)'}),
            h('div',{style:{color:'var(--core-color-text-primary)',fontFamily:'var(--app-font)',fontWeight:600,fontSize:21,marginTop:4}},'What businesses share this '+Q.attr.toLowerCase()+'?')),
          querySeg),
        h('div',{style:{flex:1,display:'flex',minHeight:0}},
          h('div',{style:{flex:1,minHeight:0,padding:'8px 8px 8px'}}, this.graphCanvas(allNodes,g.edges,{timeIdx:null,showPath:this.state.showPath!==false})),
          this.bIntelDrawer(Q,g))));
  }
  bIntelDrawer(Q,g){
    const h=React.createElement; const E=this.entities;
    const ranked=Q.conns.slice().sort((a,b)=>({strong:3,moderate:2,weak:1}[b.strength]-{strong:3,moderate:2,weak:1}[a.strength]));
    return h('div',{style:{width:316,flexShrink:0,borderLeft:'1px solid var(--core-color-border-divider)',background:'var(--core-color-surface-raised)',padding:'18px 20px',overflowY:'auto',color:'var(--core-color-text-primary)'}},
      this.mono('Connected businesses',{color:'var(--core-color-text-muted)'}),
      h('div',{style:{display:'flex',alignItems:'baseline',gap:8,margin:'10px 0 6px'}}, h('span',{style:{fontFamily:'var(--app-font)',fontSize:34,fontWeight:600,lineHeight:1}},Q.conns.length), h('span',{style:{fontSize:12.5,color:'var(--core-color-text-secondary)'}},'share this '+Q.attr.toLowerCase())),
      h('p',{style:{margin:'4px 0 16px',fontSize:12,lineHeight:1.5,color:'var(--core-color-text-secondary)'}},Q.note),
      ...ranked.map((c,i)=>{ const e=E[c.id]; const rc=this.RISK[c.risk].c;
        return h('div',{key:c.id,style:{padding:'12px 0',borderBottom:i<ranked.length-1?'1px solid var(--core-color-border-divider)':'none'}},
          h('div',{style:{display:'flex',justifyContent:'space-between',gap:8,alignItems:'flex-start'}},
            h('span',{style:{fontSize:13.5,fontWeight:500}},e?e.name:c.id), h('span',{style:{width:8,height:8,borderRadius:'50%',background:rc,marginTop:5,flexShrink:0}})),
          h('div',{style:{display:'flex',alignItems:'center',gap:8,marginTop:6}}, this.strengthMeterDark(c.strength), h('span',{style:{fontSize:11,color:'var(--core-color-text-muted)'}},c.ctype)),
          h('div',{style:{fontSize:11,color:'var(--core-color-text-muted)',marginTop:5,lineHeight:1.4}},c.ev)); }),
      h('div',{style:{marginTop:16,padding:'12px 14px',borderRadius:'var(--core-radius-card)',background:'color-mix(in srgb, var(--core-color-brand-accent) 10%, var(--core-color-surface-raised))',border:'1px solid color-mix(in srgb, var(--core-color-brand-accent) 30%, var(--core-color-surface-raised))'}},
        this.mono('What to act on',{color:'var(--core-color-brand-accent)'}),
        h('div',{style:{fontSize:12.5,lineHeight:1.5,color:'var(--core-color-text-primary)',marginTop:7}}, this.state.query==='officer'?'This officer links Vela to a high-risk entity two hops out. Escalate to manual review.':this.state.query==='ubo'?'Common control across 2 active businesses. Apply the same monitoring policy to both.':'A shared commercial address is a weak signal on its own. No action; note for context.')));
  }
  strengthMeterDark(s){ const h=React.createElement; const n={weak:1,moderate:2,strong:3}[s]; const c=s==='strong'?'var(--core-color-text-primary)':s==='moderate'?'var(--core-color-text-secondary)':'var(--core-color-text-muted)';
    return h('div',{style:{display:'flex',gap:3}}, ...[0,1,2].map(i=>h('span',{key:i,style:{width:14,height:4,borderRadius:2,background:i<n?c:'var(--core-color-border-default)'}}))); }
  /* =====================================================
     DIRECTION C — QUESTIONS (answer-first, scannable)
  ===================================================== */
  exposureMeter(level){
    const h=React.createElement; const order=['clear','low','watch','elev','high']; const idx=order.indexOf(level);
    return h('div',{style:{display:'flex',flexDirection:'column',gap:7,minWidth:200}},
      this.mono('Business identity risk'),
      h('div',{style:{display:'flex',gap:3}}, ...order.map((t,i)=>{ const c=this.RISK[t].c;
        return h('div',{key:t,style:{flex:1,height:8,borderRadius:3,background:i<=idx?c:'var(--core-color-border-default)',opacity:i<=idx?1:.6}}); })),
      h('div',{style:{display:'flex',justifyContent:'space-between'}}, this.mono('Clear'), h('span',{style:{fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.05em',textTransform:'uppercase',color:this.RISK[level].c}},this.RISK[level].label)));
  }
  cIdentityHeaderInner(){
    const h=React.createElement; const f=this.facts.filter(([k])=>['TIN','Entity type','Formed','Home state','Status'].includes(k));
    const dissolved=(this.profile.facts.find(x=>x[0]==='Status')||['','Active'])[1].indexOf('Dissolved')>=0;
    const factsRow=h('div',{style:{display:'flex',flexWrap:'wrap',gap:'6px 18px',marginTop:12}},
      ...f.map(([k,v])=> h('span',{key:k,style:{fontSize:12.5,color:'var(--core-color-text-muted)',whiteSpace:'nowrap'}}, k+': ', h('span',{style:{color:'var(--core-color-text-primary)'}},v))));
    const summary=this.profile.insightSummary?[
      h('p',{key:'p',style:{margin:'18px 0 0',fontSize:'var(--core-font-size-md)',lineHeight:1.6,color:'var(--core-color-text-primary)',maxWidth:820,textWrap:'pretty'}},this.profile.insightSummary),
      // recommendation (left) + review status (right), separated from the summary
      h('div',{key:'d2',style:{height:1,background:'var(--core-color-border-default)',margin:'16px -26px 0'}}),
      h('div',{key:'rec',style:{margin:'16px 0 0',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}},
        this.profile.insightRec?h('div',{style:{flex:1,minWidth:260,display:'flex',flexDirection:'column',gap:5}},
          this.mono('Policy recommendation',{fontSize:10,color:'var(--core-color-text-muted)'}),
          h('p',{style:{margin:0,fontSize:13,lineHeight:1.5,fontWeight:500,color:'var(--core-color-text-primary)'}},this.profile.insightRec)):h('span',null),
        this.reviewDropdown())]:[];
    return h('div',null,
      h('div',{style:{padding:'18px 26px 20px'}},
        h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}},
          this.mono('Identity'),
          this.profile.insightSummary?null:this.reviewDropdown()),
        h('div',{style:{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',marginTop:12}},
          h('h1',{style:{fontFamily:'var(--app-font)',fontWeight:600,fontSize:30,letterSpacing:'-.02em',lineHeight:1,margin:0}},this.nameOf),
          this.pill(dissolved?'Dissolved':'Active',dissolved?'high':'low')),
        factsRow,
        ...summary));
  }
  reviewDropdown(){
    const h=React.createElement; const self=this;
    const OPTS=[{t:'Clear to approve',tone:'clear'},{t:'Review recommended',tone:'watch'},{t:'Manual review',tone:'elev'}];
    const s=this.policyStats?this.policyStats():{flag:0,review:0};
    const cur=this.state.reviewStatus || (s.flag?'Manual review':s.review?'Review recommended':'Clear to approve');
    const tn=this.TONES[(OPTS.find(o=>o.t===cur)||OPTS[2]).tone];
    return h(Menu,{open:!!this.state.reviewMenu,onOpenChange:(o)=>this.setState({reviewMenu:o})},
      h(MenuTrigger,{asChild:true},
        h('button',{style:{display:'inline-flex',alignItems:'center',gap:8,padding:'6px 12px',minHeight:32,borderRadius:'var(--core-radius-pill)',border:'1px solid '+tn.border,background:tn.bg,color:tn.fg,cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:500,whiteSpace:'nowrap',flexShrink:0}},
          h('span',{style:{width:6,height:6,borderRadius:'50%',background:tn.fg,flexShrink:0}}), cur, this.navIcon('chevronDown',14))),
      h(MenuContent,{align:'end',themeMode:this.state.theme==='dark'?'dark':'light',style:{minWidth:214}},
        ...OPTS.map(o=>{ const otn=self.TONES[o.tone];
          return h(MenuItem,{key:o.t,onSelect:()=>self.setState({reviewStatus:o.t}),style:{justifyContent:'space-between',gap:12,minHeight:34}},
            h('span',{style:{display:'inline-flex',alignItems:'center',gap:8}}, h('span',{style:{width:6,height:6,borderRadius:'50%',background:otn.fg,flexShrink:0}}), o.t),
            o.t===cur?h('span',{style:{color:'var(--core-color-text-muted)',fontSize:12}},'✓'):null); })));
  }
  identityTimeMachine(){ const h=React.createElement; const V=this.versions; const idx=this.asOfIdx; const live=this.isLive;
    const line=(()=>{ const W=1040,H=46,cy=18;
      const evs=V.map((v,i)=>({i,t:this.parseDate(v.date)}));
      const fa=evs[0].t, fb=evs[evs.length-1].t, full=(fb-fa)||1;
      const z=this.state.itmZoom||1; const winSpan=full/z;
      const selT=live?fb:evs[idx].t;
      let center=this.state.itmPan!=null?this.state.itmPan:selT;
      let t0=center-winSpan/2,t1=center+winSpan/2;
      if(t0<fa){t0=fa;t1=fa+winSpan;} if(t1>fb){t1=fb;t0=fb-winSpan;} if(t0<fa)t0=fa;
      const span=(t1-t0)||1; const x=(t)=>10+(t-t0)/span*(W-20); const px=x(selT);
      const kf=evs.filter(e=>e.t>=t0&&e.t<=t1).map(e=>{ const cx=x(e.t); const isLast=e.i===evs.length-1; const on=(!live&&e.i===idx)||(live&&isLast); const s=on?6.5:5;
        const rr=this.riskAt(e.i); const hasFinding=(rr==='elev'||rr==='watch'); const inS=s*0.5;
        const findCol=rr==='elev'?'var(--risk-high)':rr==='watch'?'var(--risk-watch)':'var(--risk-clear)';
        let fillCol,strokeCol;
        if(on){ if(hasFinding){fillCol=strokeCol=findCol;} else if(isLast&&live){fillCol=strokeCol='var(--risk-clear)';} else {fillCol=strokeCol='var(--core-color-tab-indicator)';} }
        else { fillCol='var(--core-color-surface-card)'; strokeCol='var(--core-color-text-muted)'; }
        return h('div',{key:e.i,style:{position:'absolute',left:(cx/W*100)+'%',top:cy,width:s*2,height:s*2,marginLeft:-s,marginTop:-s,transform:'rotate(45deg)',background:fillCol,border:(on?2:1.6)+'px solid '+strokeCol,boxSizing:'border-box',cursor:'pointer',zIndex:3},onMouseEnter:()=>this.setState({itmHover:e.i}),onMouseLeave:()=>this.setState({itmHover:null}),onMouseDown:(ev)=>{ev.stopPropagation(); this.setState({asOf:e.i>=evs.length-1?null:e.i,itmPan:e.t});}},
          !on?h('div',{style:{position:'absolute',left:'50%',top:'50%',width:inS*2,height:inS*2,marginLeft:-inS,marginTop:-inS,background:findCol,pointerEvents:'none'}}):null); });
      const hv=this.state.itmHover;
      const dateSel=live?V[V.length-1].date:V[idx].date; const selRisk=this.riskAt(live?V.length-1:idx); const pickerCol=selRisk==='elev'?'var(--risk-high)':selRisk==='watch'?'var(--risk-watch)':(live?'var(--risk-clear)':'var(--core-color-tab-indicator)');
      const pillBase={position:'absolute',top:1,fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.03em',padding:'4px 8px',borderRadius:6,whiteSpace:'nowrap',zIndex:5};
      const anchor=(vx)=>{ const f=vx/W; return f<0.08?'translateX(0)':f>0.92?'translateX(-100%)':'translateX(-50%)'; };
      const clampL=(vx)=>(vx/W*100)+'%';
      const pickerPill=(px>=6&&px<=W-6)?h('div',{key:'pk',style:Object.assign({},pillBase,{left:clampL(px),transform:anchor(px),background:pickerCol,color:'var(--core-color-text-inverse)',cursor:'ew-resize',boxShadow:'var(--core-color-elevation-raised)'}),onMouseDown:(ev)=>{ev.stopPropagation();this.itmScrub(ev,t0,span,evs);}},dateSel):null;
      const selIdx=live?V.length-1:idx; let hoverPill=null; if(hv!=null&&V[hv]&&hv!==selIdx){ const hpx=x(this.parseDate(V[hv].date)); if(hpx>=6&&hpx<=W-6) hoverPill=h('div',{key:'hv',style:Object.assign({},pillBase,{left:clampL(hpx),transform:anchor(hpx),background:'var(--core-color-surface-card)',color:'var(--core-color-text-primary)',border:'1px solid var(--core-color-border-default)',pointerEvents:'none',boxShadow:'var(--core-color-elevation-control)'})},V[hv].date); }
      const yr0=new Date(t0).getFullYear(), yr1=new Date(t1).getFullYear(); const yticks=[];
      const stepY=Math.max(1,Math.ceil((yr1-yr0)/6)); for(let y=Math.ceil(yr0/stepY)*stepY;y<=yr1;y+=stepY){ const tx=x(new Date(y,0,1).getTime()); if(tx>12&&tx<W-12) yticks.push(h('div',{key:'y'+y},
        h('div',{style:{position:'absolute',left:(tx/W*100)+'%',top:cy-11,width:1,height:22,background:'var(--core-color-border-default)'}}),
        h('div',{style:{position:'absolute',left:(tx/W*100)+'%',top:cy+14,transform:'translateX(-50%)',fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.03em',color:'var(--core-color-text-muted)',whiteSpace:'nowrap'}},y))); }
      const zb=(g,fn)=>h('button',{onClick:fn,style:{minWidth:24,height:22,padding:'0 7px',borderRadius:6,border:'1px solid var(--core-color-border-default)',background:'var(--core-color-surface-card)',cursor:'pointer',fontFamily:'var(--app-font)',fontWeight:500,fontSize:11,color:'var(--core-color-text-primary)',lineHeight:1}},g);
      return h('div',{style:{position:'relative',userSelect:'none',paddingTop:26}},
        pickerPill, hoverPill,
        h('div',{style:{position:'relative',height:H,cursor:'grab'},onMouseDown:(ev)=>this.itmPanStart(ev,center,winSpan)},
          h('div',{style:{position:'absolute',left:(10/W*100)+'%',right:(10/W*100)+'%',top:cy,marginTop:-0.75,height:1.5,background:'var(--core-color-border-default)'}}),
          ...yticks,
          h('div',{style:{position:'absolute',left:(10/W*100)+'%',width:(Math.max(0,Math.min(W-10,px)-10)/W*100)+'%',top:cy,marginTop:-0.75,height:1.5,background:live?'var(--risk-clear)':'var(--core-color-tab-indicator)'}}),
          (px>=6&&px<=W-6)?h('div',{style:{position:'absolute',left:(px/W*100)+'%',top:cy-15,width:1.5,height:30,marginLeft:-0.75,background:pickerCol,cursor:'ew-resize',zIndex:2},onMouseDown:(ev)=>{ev.stopPropagation();this.itmScrub(ev,t0,span,evs);}}):null,
          ...kf));
    })();
    return this.panel({},
      this.cIdentityHeaderInner(),
      h('div',{style:{padding:'15px 22px 10px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}},
        h('div',{style:{display:'flex',alignItems:'center',gap:12}},
          h('span',{style:{display:'inline-flex',alignItems:'center',gap:7,fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.05em',textTransform:'uppercase',color:live?'var(--risk-clear)':'var(--core-color-interactive-active)'}}, h('span',{style:{width:7,height:7,borderRadius:'50%',background:live?'var(--risk-clear)':'var(--core-color-interactive-active)'}}), live?'Latest':'Time travel'),
          h('span',{style:{fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.05em',textTransform:'uppercase',color:'var(--core-color-text-muted)',whiteSpace:'nowrap'}}, V.length+' updates on record')),
        this.timeStepper(idx,V,live)),
      h('div',{style:{padding:'0 22px 12px',fontSize:14,color:'var(--core-color-text-primary)'}}, live?'As of latest update · '+V[idx].date : 'Viewing as of '+V[idx].date+' · '+V[idx].title),
      h('div',{style:{padding:'0 22px '+(live?'40px':'40px')}}, line),
      live?null:h('div',{style:{display:'flex',alignItems:'center',gap:10,margin:'0 22px 16px',padding:'11px 14px',borderRadius:'var(--core-radius-card)',background:'color-mix(in srgb, var(--risk-watch) 9%, var(--core-color-surface-card))',border:'1px solid color-mix(in srgb, var(--risk-watch) 24%, var(--core-color-surface-card))'}},
        h('span',{style:{fontSize:14}},'⏱'),
        h('div',{style:{flex:1,minWidth:0,fontSize:12,color:'var(--core-color-text-muted)',lineHeight:1.45}}, h('span',{style:{color:'var(--core-color-text-primary)',fontWeight:500}},'Historical view. '),'Risk profile, answers, and attributes reflect what Middesk knew on '+V[idx].date+'. '+(V.length-1-idx)+' update'+((V.length-1-idx)>1?'s':'')+' have landed since.'),
        h(ActionButton,{variant:'secondary',onClick:()=>this.setState({asOf:null}),style:{flexShrink:0}},'Back to latest')));
  }
  timeStepper(idx,V,live){ const h=React.createElement;
    const selT=live?this.parseDate(V[V.length-1].date):this.parseDate(V[idx].date);
    const zb=(node,fn,lbl)=>h('button',{onClick:fn,title:lbl,style:{minWidth:26,height:26,padding:'0 8px',borderRadius:7,border:'1px solid var(--core-color-border-default)',background:'var(--core-color-surface-card)',cursor:'pointer',color:'var(--core-color-text-primary)',display:'inline-flex',alignItems:'center',justifyContent:'center'}},node);
    const mag=(plus)=>h('svg',{width:14,height:14,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round'}, h('circle',{cx:11,cy:11,r:7}), h('line',{x1:21,y1:21,x2:16.5,y2:16.5}), h('line',{x1:8,y1:11,x2:14,y2:11}), plus?h('line',{x1:11,y1:8,x2:11,y2:14}):null);
    const fitIcon=h('svg',{width:14,height:14,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'}, h('path',{d:'M8 3H5a2 2 0 0 0-2 2v3'}), h('path',{d:'M16 3h3a2 2 0 0 1 2 2v3'}), h('path',{d:'M8 21H5a2 2 0 0 1-2-2v-3'}), h('path',{d:'M16 21h3a2 2 0 0 0 2-2v-3'}));
    return h('div',{style:{display:'flex',alignItems:'center',gap:10}},
      h('div',{style:{display:'flex',alignItems:'center',gap:4}}, zb(mag(true),()=>this.itmSetZoom(1.8,selT),'Zoom in'), zb(mag(false),()=>this.itmSetZoom(1/1.8,selT),'Zoom out'), zb(fitIcon,()=>this.setState({itmZoom:1,itmPan:null}),'Fit all')));
  }
  itmSetZoom(mult,focusT){ const z=Math.min(500,Math.max(1,(this.state.itmZoom||1)*mult)); this.setState({itmZoom:z, itmPan:focusT}); }
  itmPanStart(ev,center,winSpan){ if(!this._itm)return; const r=this._itm.getBoundingClientRect(); const sx=ev.clientX; const c0=this.state.itmPan!=null?this.state.itmPan:center; const move=(e)=>{const dx=(e.clientX-sx)/r.width; this.setState({itmPan:c0-dx*winSpan});}; const up=()=>{window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up);}; window.addEventListener('mousemove',move); window.addEventListener('mouseup',up); }
  itmScrub(ev,t0,span,evs){ if(!this._itm)return; const r=this._itm.getBoundingClientRect(); const pick=(e)=>{ let frac=(e.clientX-r.left-10*(r.width/1040))/(r.width-20*(r.width/1040)); frac=Math.min(1,Math.max(0,frac)); const t=t0+frac*span; let best=evs[0]; evs.forEach(v=>{if(best==null||Math.abs(v.t-t)<Math.abs(best.t-t))best=v;}); this.setState({asOf:best.i>=evs.length-1?null:best.i, itmPan:best.t}); }; const up=()=>{window.removeEventListener('mousemove',pick);window.removeEventListener('mouseup',up);}; window.addEventListener('mousemove',pick); window.addEventListener('mouseup',up); pick(ev); }
  qCards(){
    const h=React.createElement;
    return h('div',{style:{display:'grid',gridTemplateColumns:'repeat(2, 1fr)',gap:14}}, ...this.questions.map((q,i)=>{
      const c=this.RISK[q.tone].c; const open=this.state.expandedQ===i;
      return h('div',{key:i,onClick:()=>this.setState({expandedQ:open?-1:i}),style:{background:'var(--core-color-surface-card)',border:'1px solid var(--core-color-border-default)',borderRadius:'var(--core-radius-card)',padding:'18px 20px',cursor:'pointer',transition:'border-color .18s',borderColor:open?c:'var(--core-color-border-default)'}},
        h('div',{style:{display:'flex',justifyContent:'space-between',gap:10,alignItems:'flex-start'}},
          h('div',{style:{fontSize:13.5,color:'var(--core-color-text-muted)',lineHeight:1.35,flex:1}},q.q),
          h('span',{style:{color:'var(--core-color-text-muted)',fontSize:12,transform:open?'rotate(180deg)':'none',transition:'transform .2s'}},'⌄')),
        h('div',{style:{display:'flex',alignItems:'center',gap:10,margin:'10px 0 0'}},
          h('span',{style:{fontFamily:'var(--app-font)',fontWeight:600,fontSize:25,lineHeight:1,color:'var(--core-color-text-primary)'}},q.a),
          h('span',{style:{width:8,height:8,borderRadius:'50%',background:c}})),
        open?h('div',{style:{marginTop:12,animation:'mdFade .25s var(--core-ease-standard)'}},
          h('p',{style:{margin:'0 0 10px',fontSize:12.5,lineHeight:1.55,color:'var(--core-color-text-secondary)'}},q.insight),
          h('div',{style:{display:'flex',gap:6,flexWrap:'wrap'}}, ...q.ev.map(e=>h('span',{key:e,style:{fontFamily:'var(--app-font)',fontWeight:500,fontSize:10,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--core-color-text-muted)',background:'var(--core-color-surface-canvas)',padding:'4px 8px',borderRadius:6}},e)))):null);
    }));
  }
  changesFeed(){
    const h=React.createElement; const asMs=this.asOfMs; const meaningful=this.versions.filter(v=>v.matters&&this.parseDate(v.date)<=asMs).reverse();
    return this.panel({}, this.panelHead('Meaningful changes', this.mono(this.isLive?'Filtered to what matters to you':'As of '+this.versions[this.asOfIdx].date)),
      meaningful.length?h('div',{style:{padding:'6px 22px 14px'}}, ...meaningful.map((v,i)=>{ const wt={Review:'low',Watch:'watch',Act:'elev'}[v.weight]; const c=this.RISK[wt].c;
        return h('div',{key:i,style:{display:'flex',gap:14,padding:'14px 0',borderBottom:i<meaningful.length-1?'1px solid var(--core-color-border-default)':'none'}},
          h('span',{style:{width:8,height:8,borderRadius:'50%',background:c,marginTop:6,flexShrink:0}}),
          h('div',{style:{flex:1}},
            h('div',{style:{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}, this.mono(v.date), this.pill(v.weight,wt)),
            h('div',{style:{fontSize:14,margin:'5px 0 4px'}},v.title),
            ...v.changes.map((ch,j)=>h('div',{key:j,style:{fontSize:12,color:'var(--core-color-text-muted)',marginTop:2}}, ch[0]+': ', h('span',{style:{textDecoration:ch[1]==='None'?'none':'line-through',color:'var(--core-color-text-muted)'}},ch[1]),' → ',h('span',{style:{color:'var(--core-color-text-primary)',fontWeight:500}},ch[2]))),
            h('div',{style:{fontSize:12,color:c,marginTop:7,lineHeight:1.45}},v.why))); }))
      :h('div',{style:{padding:'22px',fontSize:12.5,color:'var(--core-color-text-muted)'}},'No meaningful changes had occurred yet at this point.'));
  }
  C_identity(){
    const h=React.createElement;
    return h('div',{style:{padding:'26px 32px 44px',maxWidth:1180,margin:'0 auto',display:'flex',flexDirection:'column',gap:18}},
      // timeline (identityTimeMachine) stashed — header panel only
      this.panel({overflow:'visible'}, this.cIdentityHeaderInner()),
      this.policyExperience(),
      h('div',{style:{display:'grid',gridTemplateColumns:'1.1fr 1fr',gap:18,alignItems:'start'}},
        this.connectedIdentitiesPanel(),
        h('div',{style:{display:'flex',flexDirection:'column',gap:18}}, this.lastDecisionCard(), this.changesFeed())),
      this.dataAttributesPanel());
  }
  C_intel(){
    const h=React.createElement; const q=this.state.query; const Q=this.queries[q]; const E=this.entities; const g=this.bIntel();
    const prompts=[['What businesses share this address?','address'],['What does the ownership network look like?','ubo'],['What connects through this officer?','officer']];
    const ranked=Q.conns.slice().sort((a,b)=>({strong:3,moderate:2,weak:1}[b.strength]-{strong:3,moderate:2,weak:1}[a.strength]));
    const verdict = q==='officer'?{t:'Act',tone:'elev',txt:'This officer is the path that carries hidden risk. Escalate Vela to manual review.'}
      : q==='ubo'?{t:'Monitor',tone:'watch',txt:'Common control spans 2 active businesses. Extend the same policy to both.'}
      : {t:'Note',tone:'low',txt:'A shared commercial address is a weak signal on its own. Record for context, no action.'};
    return h('div',{style:{padding:'26px 32px 44px',maxWidth:1180,margin:'0 auto',display:'flex',flexDirection:'column',gap:18}},
      // ask bar
      h('div',{style:{background:'var(--core-color-surface-card)',border:'1px solid var(--core-color-border-default)',borderRadius:'var(--core-radius-card)',padding:'22px 26px'}},
        this.mono('Intelligence · Ask about this business or its network'),
        h('div',{style:{display:'flex',alignItems:'center',gap:14,margin:'12px 0 16px',padding:'14px 18px',border:'1px solid var(--core-color-border-default)',borderRadius:'var(--core-radius-card)',background:'var(--core-color-surface-inset)'}},
          h('span',{style:{width:8,height:8,borderRadius:'50%',background:'var(--core-color-brand-accent)'}}),
          h('span',{style:{fontSize:16,color:'var(--core-color-text-primary)'}}, prompts.find(p=>p[1]===q)[0]),
          h('span',{style:{flex:1}}),
          h('span',{style:{width:30,height:30,borderRadius:'var(--core-radius-pill)',background:'var(--core-color-action-primary-bg)',color:'var(--core-color-action-primary-fg)',display:'inline-flex',alignItems:'center',justifyContent:'center'}},'→')),
        h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}}, ...prompts.map(([label,k])=>
          h('button',{key:k,onClick:()=>this.setS({query:k}),style:{padding:'8px 13px',borderRadius:9,border:'1px solid '+(q===k?'var(--core-color-state-selected-border)':'var(--core-color-border-default)'),background:q===k?'var(--core-color-state-selected-bg)':'var(--core-color-surface-card)',color:q===k?'var(--core-color-state-selected-fg)':'var(--core-color-text-secondary)',cursor:'pointer',fontSize:12.5,transition:'all .18s'}},label)))),
      // assembled answer
      h('div',{style:{display:'grid',gridTemplateColumns:'1.15fr 1fr',gap:18,alignItems:'stretch'}},
        // left: structured answer
        this.panel({display:'flex',flexDirection:'column'},
          h('div',{style:{padding:'20px 24px',borderBottom:'1px solid var(--core-color-border-default)'}},
            this.mono('Answer'),
            h('div',{style:{display:'flex',alignItems:'baseline',gap:10,marginTop:8,flexWrap:'wrap'}},
              h('span',{style:{fontFamily:'var(--app-font)',fontWeight:600,fontSize:30,lineHeight:1}},Q.conns.length+' businesses'),
              h('span',{style:{fontSize:14,color:'var(--core-color-text-muted)'}},(q==='address'?'share this address':'share a common '+Q.attr.toLowerCase()+': '+Q.value))),
            h('p',{style:{margin:'10px 0 0',fontSize:13,lineHeight:1.55,color:'var(--core-color-text-secondary)'}},Q.note)),
          h('div',{style:{padding:'6px 24px 12px',flex:1}}, ...ranked.map((c,i)=>{ const e=E[c.id]; const rc=this.RISK[c.risk].c;
            return h('div',{key:c.id,style:{display:'grid',gridTemplateColumns:'1fr auto auto',gap:14,alignItems:'center',padding:'13px 0',borderBottom:i<ranked.length-1?'1px solid var(--core-color-border-default)':'none',background:c.self?'var(--core-color-state-selected-bg)':'transparent'}},
              h('div',null, h('div',{style:{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}, h('span',{style:{fontSize:13.5,fontWeight:500}},e?e.name:c.id), c.self?this.pill('This business','low'):null),
                h('div',{style:{fontSize:11.5,color:'var(--core-color-text-muted)',marginTop:3}}, c.ctype+' · '+c.ev)),
              this.strengthMeter(c.strength),
              this.pill(this.RISK[c.risk].label,c.risk)); }))),
        // right: evidence (mini graph) + act on
        h('div',{style:{display:'flex',flexDirection:'column',gap:18}},
          h('div',{className:'core-theme','data-theme':'dark',style:{background:'var(--core-color-surface-card)',borderRadius:'var(--core-radius-card)',overflow:'hidden',display:'flex',flexDirection:'column'}},
            h('div',{style:{padding:'14px 18px',borderBottom:'1px solid var(--core-color-border-divider)',display:'flex',justifyContent:'space-between',alignItems:'center'}}, this.mono('How the connections hold together',{color:'var(--core-color-text-muted)'}), h('button',{onClick:()=>this.setS({direction:'B'}),style:{background:'none',border:0,color:'var(--core-color-brand-accent)',cursor:'pointer',fontSize:11.5}},'Open full graph →')),
            h('div',{style:{height:300}}, this.graphCanvas([g.center,...g.nodes],g.edges,{timeIdx:null,showPath:this.state.showPath!==false}))),
          h('div',{style:{background:'color-mix(in srgb, '+this.RISK[verdict.tone].c+' 9%, var(--core-color-surface-card))',border:'1px solid color-mix(in srgb, '+this.RISK[verdict.tone].c+' 26%, var(--core-color-surface-card))',borderRadius:'var(--core-radius-card)',padding:'20px 24px'}},
            h('div',{style:{display:'flex',alignItems:'center',gap:10}}, this.mono('What to act on',{color:this.RISK[verdict.tone].c}), this.pill(verdict.t,verdict.tone)),
            h('p',{style:{margin:'10px 0 0',fontSize:14,lineHeight:1.5,color:'var(--core-color-text-primary)'}},verdict.txt)))));
  }

  /* ---------- Report page (ported from the app's Business Report tab) ----------
     Furnished with a real business record pulled from the Middesk API
     (report/business.json, KAIROS PHYSIO PLLC). */
  reportScreen(variant='A'){
    const h=React.createElement;
    // Report B renders the pre-revision snapshot (indexB/fromMiddeskB) so the
    // two report treatments can be compared from the side nav.
    const isB=variant==='B';
    const Report=isB?ReportPageB:ReportPage;
    const data=(isB?reportDataFromBusinessB:reportDataFromBusiness)(middeskBusiness,{
      onViewVerification:()=>this.setS({view:'identity',direction:'C'}),
      onViewWeb:()=>this.setState({reportTab:'web_presence'}),
      onViewRisk:()=>this.setS({view:'identity',direction:'B'}),
    });
    // Tab bar — @core TabsPrimitive, same tab set as the app's business report
    // view (BusinessTabs): Report + product tabs, with Orders/Monitoring/History
    // living in the built-in More menu (overflow='fixed').
    const tab=this.state.reportTab||'report';
    const TAB_LABELS={business_verification:'Business verification',web_presence:'Web presence',risk_intelligence:'Risk intelligence',timeline:'Timeline',sources:'Sources',api_response:'API Response',orders:'Orders',monitoring:'Monitoring',history:'History'};
    const tabBar=h('div',{style:{position:'relative',minWidth:0}},
      h(Tabs,{value:tab,onValueChange:(v)=>this.setState({reportTab:v})},
        h(TabsList,null,
          h(TabsTrigger,{key:'report',value:'report'},'Report'),
          ...['business_verification','web_presence','risk_intelligence','timeline','sources','api_response'].map(v=>h(TabsTrigger,{key:v,value:v},TAB_LABELS[v])),
          h(TabsTrigger,{key:'orders',overflow:'fixed',value:'orders'},'Orders',h(TabsCount,null,this.decisions.length)),
          h(TabsTrigger,{key:'monitoring',overflow:'fixed',value:'monitoring'},'Monitoring'),
          h(TabsTrigger,{key:'history',overflow:'fixed',value:'history'},'History'))));
    return h('div',{style:{padding:'26px 32px 44px',maxWidth:1280,margin:'0 auto',display:'flex',flexDirection:'column',gap:18}},
      // App business-report chrome: eyebrow breadcrumb + title row with
      // header actions, from the design system's PageChrome primitives.
      h(PageHeader,null,
        // Back link, not a trail: a chevron plus "All businesses" returning to
        // the list; the business name lives in the heading below.
        h(PageBreadcrumb,null,
          h(PageBreadcrumbItem,{asChild:true},
            h('button',{onClick:()=>this.setS({view:'list'}),style:{display:'inline-flex',alignItems:'center',gap:4,cursor:'pointer'}},
              h(ChevronLeft,{size:14,strokeWidth:1.5,'aria-hidden':true}),
              'All businesses'))),
        h(PageHeaderBar,null,
          h(PageHeaderTitles,null,
            h(PageHeading,null,middeskBusiness.name)),
          // Right cluster from the app's business report: order source link,
          // assignee dropdown, and the review-status pill.
          h(PageHeaderActions,{style:{alignSelf:'center',gap:14}},
            h('a',{href:'#',onClick:(e)=>e.preventDefault(),style:{color:'#0637FF',fontSize:13.5,textDecoration:'none'}},'Ordered by Middesk, Inc.'),
            h('button',{style:{display:'inline-flex',alignItems:'center',gap:4,fontSize:13.5,color:'var(--core-color-text-secondary)',cursor:'pointer'}},
              'Assigned to:',
              h(ChevronDown,{size:14,strokeWidth:1.5,'aria-hidden':true})),
            h('button',{style:{display:'inline-flex',alignItems:'center',gap:7,fontSize:13,color:'var(--core-color-text-muted)',border:'1px solid var(--core-color-border-default)',borderRadius:999,padding:'7px 13px',cursor:'pointer',background:'var(--core-color-surface-inset)'}},
              h('span',{style:{width:7,height:7,borderRadius:'50%',background:'var(--core-color-text-muted)',flexShrink:0}}),
              'Needs Review',
              h(ChevronDown,{size:13,strokeWidth:1.5,'aria-hidden':true}))))),
      tabBar,
      tab==='report'?h(Report,{data})
        :tab==='business_verification'?h(VerificationPage,{record:middeskBusiness})
        :tab==='web_presence'?h(WebPresencePage,{data:webPresenceDataFromBusiness(middeskBusiness)})
        :this.soon(TAB_LABELS[tab]));
  }

  screen(){
    const {direction,view}=this.state;
    if(view==='list') return this.identitiesList();
    if(view==='intelligence') return this.intelChat();
    if(view==='report') return this.reportScreen('A');
    if(view==='reportB') return this.reportScreen('B');
    if(direction==='A') return this.A_identity();
    if(direction==='B') return this.B_identity();
    return this.C_identity();
  }
  get portfolioList(){ const cur=this.activeId; const meta={
      vela:{rec:'Manual review',tone:'elev',net:'Elevated',updated:'Apr 21, 2026, 9:14 AM'},
      anchor:{rec:'Clear to approve',tone:'clear',net:'Low',updated:'Mar 02, 2026, 11:32 AM'},
      harbor:{rec:'Review recommended',tone:'watch',net:'Watch',updated:'Feb 14, 2026, 3:45 PM'},
      meridian:{rec:'Review recommended',tone:'watch',net:'Watch',updated:'Apr 21, 2026, 8:07 AM'},
      cedar:{rec:'Clear to approve',tone:'clear',net:'Clear',updated:'Jan 09, 2026, 2:26 PM'},
      brightpath:{rec:'Clear to approve',tone:'clear',net:'Clear',updated:'Dec 18, 2025, 4:02 PM'},
      stillwater:{rec:'Manual review',tone:'high',net:'High',updated:'Apr 19, 2026, 10:51 AM'},
    };
    const derive=(id)=>{ const p=this.PROFILES[id]; const f=(k)=>(p.facts.find(x=>x[0]===k)||['',''])[1];
      return {id, name:p.name, type:f('Entity type')||'Unknown', state:f('Home state')||'Unknown', ind:f('Industry')||'Unknown', status:(f('Status')||'Active').indexOf('Dissolved')>=0?'Dissolved':'Active', current:id===cur, ...meta[id]}; };
    return ['vela','anchor','harbor','meridian','cedar','brightpath','stillwater'].map(derive); }
  identitiesList(){ const h=React.createElement; const rows=this.portfolioList;
    const col=(t)=>this.mono(t,{color:'var(--core-color-text-muted)'});
    return h('div',{style:{padding:'26px 32px 44px',maxWidth:1180,margin:'0 auto',display:'flex',flexDirection:'column',gap:18}},
      h('div',null,
        h('h1',{style:{fontFamily:'var(--app-font)',fontWeight:600,fontSize:32,letterSpacing:'-.02em',margin:0}},'Identities')),
      this.panel({},
        h('div',{style:{display:'grid',gridTemplateColumns:'1.1fr 2fr 0.9fr 1fr 0.8fr',gap:16,padding:'12px 22px',borderBottom:'1px solid var(--core-color-border-default)',background:'var(--core-color-surface-inset)'}},
          col('Status'), col('Business'), col('Entity type'), col('Network risk'), col('Updated')),
        ...rows.map((r,i)=>{ const netTone=({High:'high',Elevated:'elev',Watch:'watch',Low:'low',Clear:'clear'})[r.net]||'mute';
          return h('button',{key:i,onClick:()=>this.openIdentity(r.id),style:{display:'grid',gridTemplateColumns:'1.1fr 2fr 0.9fr 1fr 0.8fr',gap:16,alignItems:'center',width:'100%',padding:'15px 22px',border:0,borderBottom:i<rows.length-1?'1px solid var(--core-color-border-default)':'none',background:r.current?'var(--core-color-state-selected-bg)':'var(--core-color-surface-card)',cursor:'pointer',textAlign:'left',fontFamily:'inherit'}},
            h('div',null, this.pill(r.rec,r.tone)),
            h('div',{style:{minWidth:0}}, h('div',{style:{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}, h('span',{style:{fontSize:14,fontWeight:500}},r.name), r.current?this.pill('Viewing','low'):null), h('div',{style:{fontSize:11.5,color:'var(--core-color-text-muted)',marginTop:2}},r.state+' · '+r.ind)),
            h('span',{style:{fontSize:12.5,color:'var(--core-color-text-secondary)'}}, r.type),
            h('div',null, this.pill(r.net,netTone)),
            h('span',{style:{fontSize:12.5,color:'var(--core-color-text-muted)'}}, r.updated.replace(', '+new Date().getFullYear(),''))); })));
  }
  app(){
    const h=React.createElement; const {direction,view}=this.state;
    return h('div',{style:{display:'flex',height:'100vh',width:'100%',overflow:'hidden',background:'var(--core-color-surface-canvas)',fontFamily:'var(--app-font)',color:'var(--core-color-text-primary)'}},
      this.state.navDrawer ? this.Sidebar() : null,
      h('main',{style:{flex:1,display:'flex',flexDirection:'column',minWidth:0}},
        this.Topbar(),
        h('div',{key:direction+view,id:'mid-scroll',style:{flex:1,overflow:'auto',opacity:1,position:'relative'}}, this.screen())),
      this.decisionDrawer());
  }
  render(){
    return React.createElement('div',
      {style:{height:'100vh',width:'100%',position:'absolute',left:-2,top:-1,fontSize:18}},
      this.app());
  }
}
