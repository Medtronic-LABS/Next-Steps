// @ts-nocheck
import React from 'react';
import {
  TODAY, TODAY_ISO, MON, CAT, LVL, LADDER, FUP, AVA, OPTMETA,
  ROLES, capUsers, INS_LOGINS, MC_LOGINS, FOLDERS, SVC, SVC_KEYS, DATED,
  INS_SCOPES, INS_SC, INS_BASE, INS_SVC, INS_PEOPLE, INS_PEOPLE_SVC, TABMETA,
  MC_SRC, MC_LIB, MC_MODULES, MC_ASK, uid, VILLAGES
} from './data/constants';
import { compileTemplate } from './runtime/renderer';
import templateHtml from './data/template.raw.html?raw';
import { InsightsRagCopilot } from './components/InsightsRagCopilot';

const renderTemplate = compileTemplate(templateHtml);

const getSyncEndpoint = () => {
  if (typeof window !== 'undefined') {
    const custom = window.localStorage.getItem('nextsteps_sync_endpoint');
    if (custom) return custom;
    if (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `${window.location.protocol}//${window.location.host}/api/sync/push`;
    }
  }
  return 'https://nextsteps-api.mdtlabs.org/api/sync/push';
};

export default class App extends React.Component<any, any> {
  state = { screen:'launcher', role:null, folder:null, tab:null, svc:'ANC', selId:null, query:'', filter:'ALL', scopeFilter:'FACILITY', dialog:null, cap:null, toast:null, women:null, acked:null,
    reg:{name:'', phone:'', village:VILLAGES[0].name, abha:'', status:'HIGH', wa:true} };

  componentDidMount(){ if(!this.state.women) this.setState({women:this.seed()}); }

  seed(){
    const mk = (o)=>({ id:uid(), status:'OPEN', rem:null, owner:'anm', ...o });
    const anc = [
      {id:'w1', name:'Sunita Devi', hi:'सुनीता देवी', phone:'+919812345011', village:'Ghurehta', vhi:'घुरेहटा', age:29, lmp:'2026-01-08', g:2, p:1,
        risk:'HRP', sc:'Sub-centre Ghurehta', consent:true,
        steps:[
          mk({cat:'ANC_VISIT', level:'SUBCENTRE', due:'2026-07-24', rem:'delivered'}),
          mk({cat:'REFERRAL', level:'CHC', sent:'2026-07-28', rem:'delivered'}),
          mk({cat:'PMSMA_VISIT', level:'PHC', due:'2026-07-09', status:'DONE', cdate:'2026-07-09', csrc:'AT_CLOSING_FACILITY', cby:'PHC SN · PHC Sirmour'}),
        ]},
      {id:'w2', name:'Lakshmi Bai', hi:'लक्ष्मी बाई', phone:'+919812345022', village:'Sirmour', vhi:'सिरमौर', age:34, lmp:'2026-02-19', g:3, p:2,
        risk:'Normal', sc:'Sub-centre Sirmour', consent:true,
        steps:[
          mk({cat:'ANC_VISIT', level:'SUBCENTRE', due:'2026-06-18', status:'DONE', cdate:'2026-06-18', csrc:'AT_CLOSING_FACILITY', cby:'ANM · Sub-centre Sirmour'}),
          mk({cat:'REFERRAL', level:'DH', sent:'2026-07-02', status:'DONE', cdate:'2026-07-09', csrc:'AT_CLOSING_FACILITY', cby:'DH SN · DH Rewa', owner:'anm'}),
          mk({cat:'LAB', level:'DH', due:'2026-08-04', owner:'dh_sn', rem:'sent'}),
          mk({cat:'ANC_VISIT', level:'SUBCENTRE', due:'2026-08-14'}),
        ]},
      {id:'w3', name:'Rekha Kumari', hi:'रेखा कुमारी', phone:'+919812345033', village:'Amiliya', vhi:'अमिलिया', age:22, lmp:'2025-12-11', g:1, p:0,
        risk:'HRP', sc:'Sub-centre Ghurehta', consent:true,
        steps:[
          mk({cat:'REFERRAL', level:'TERTIARY', sent:'2026-07-20', rem:'failed', unreach:3}),
          mk({cat:'FOLLOW_UP', level:'TERTIARY', due:'2026-09-02', owner:'tert_sn'}),
          mk({cat:'ANC_VISIT', level:'SUBCENTRE', due:'2026-08-06'}),
        ]},
      {id:'w4', name:'Gita Sharma', hi:'गीता शर्मा', phone:'+919812345044', village:'Ghurehta', vhi:'घुरेहटा', age:37, lmp:'2026-04-16', g:4, p:3,
        risk:'Normal', sc:'Sub-centre Ghurehta', consent:true,
        steps:[
          mk({cat:'PMSMA_VISIT', level:'PHC', due:'2026-08-09'}),
          mk({cat:'ANC_VISIT', level:'SUBCENTRE', due:'2026-08-20'}),
        ]},
      {id:'w5', name:'Anita Yadav', hi:'अनीता यादव', phone:'+919812345055', village:'Baghwar', vhi:'बघवार', age:26, lmp:'2026-01-22', g:2, p:0,
        risk:'HRP', sc:'Sub-centre Sirmour', consent:false,
        steps:[
          mk({cat:'REFERRAL', level:'PHC', sent:'2026-07-30', status:'DONE', cdate:'2026-08-01', csrc:'AT_CLOSING_FACILITY', cby:'PHC SN · PHC Sirmour'}),
          mk({cat:'LAB', level:'PHC', due:'2026-08-03', owner:'phc_sn', rem:'failed', unreach:2}),
          mk({cat:'FOLLOW_UP', level:'PHC', due:'2026-08-11', owner:'phc_sn'}),
        ]},
      {id:'w6', name:'Meena Devi', hi:'मीना देवी', phone:'+919812345066', village:'Sirmour', vhi:'सिरमौर', age:31, lmp:'2025-11-27', g:3, p:1,
        risk:'HRP', sc:'Sub-centre Sirmour', consent:true,
        steps:[
          mk({cat:'REFERRAL', level:'DH', sent:'2026-07-14', status:'DONE', cdate:'2026-07-18', csrc:'AT_CLOSING_FACILITY', cby:'DH SN · DH Rewa'}),
          mk({cat:'FOLLOW_UP', level:'DH', due:'2026-08-24', owner:'dh_sn'}),
          mk({cat:'ANC_VISIT', level:'SUBCENTRE', due:'2026-08-08', rem:'sent'}),
        ]},
      {id:'w7', name:'Radha Prasad', hi:'राधा प्रसाद', phone:'+919812345077', village:'Amiliya', vhi:'अमिलिया', age:24, lmp:'2026-03-19', g:1, p:0,
        risk:'HRP', sc:'Sub-centre Ghurehta', consent:true,
        steps:[
          mk({cat:'ANC_VISIT', level:'SUBCENTRE', due:'2026-08-02', rem:'delivered'}),
          mk({cat:'REFERRAL', level:'CHC', sent:'2026-08-04'}),
          mk({cat:'PMSMA_VISIT', level:'CHC', due:'2026-08-09', session:true}),
        ]},
      {id:'w8', name:'Pushpa Bai', hi:'पुष्पा बाई', phone:'+919812345088', village:'Baghwar', vhi:'बघवार', age:20, lmp:'2026-05-14', g:1, p:0,
        risk:'Normal', sc:'Sub-centre Sirmour', consent:true,
        steps:[
          mk({cat:'PMSMA_VISIT', level:'PHC', due:'2026-08-09'}),
          mk({cat:'FOLLOW_UP', level:'CHC', due:'2026-08-18', owner:'chc_sn'}),
        ]},
    ];
    const pnc = [
      {id:'p1', name:'Kamla Yadav', hi:'कमला यादव', phone:'+919812345101', village:'Ghurehta', vhi:'घुरेहटा', dod:'2026-07-30', delPlace:'Institution',
        risk:'Normal', sc:'Sub-centre Ghurehta', consent:true, baby:'Baby girl',
        steps:[
          mk({cat:'PNC_VISIT', level:'PHC', due:'2026-08-03', owner:'phc_nurse'}),
          mk({cat:'NB_CHECK', level:'PHC', due:'2026-08-27', owner:'phc_nurse'}),
        ]},
      {id:'p2', name:'Sarita Kol', hi:'सरिता कोल', phone:'+919812345102', village:'Amiliya', vhi:'अमिलिया', dod:'2026-08-01', delPlace:'Institution',
        risk:'Normal', nbRisk:true, sc:'Sub-centre Ghurehta', consent:true, baby:'Baby boy · low birth weight',
        steps:[
          mk({cat:'REFERRAL', level:'CHC', sent:'2026-08-02', owner:'phc_nurse'}),
          mk({cat:'PNC_VISIT', level:'PHC', due:'2026-08-06', owner:'phc_nurse'}),
        ]},
      {id:'p3', name:'Priya Vishwakarma', hi:'प्रिया विश्वकर्मा', phone:'+919812345103', village:'Sirmour', vhi:'सिरमौर', dod:'2026-07-14', delPlace:'Home',
        risk:'Normal', sc:'Sub-centre Sirmour', consent:false, baby:'Baby boy',
        steps:[
          mk({cat:'PNC_VISIT', level:'PHC', due:'2026-07-21', status:'DONE', cdate:'2026-07-21', csrc:'AT_CLOSING_FACILITY', cby:'PHC Nurse · PHC Sirmour'}),
          mk({cat:'NB_CHECK', level:'PHC', due:'2026-08-11', owner:'phc_nurse'}),
        ]},
      {id:'p4', name:'Anju Saket', hi:'अंजू साकेत', phone:'+919812345104', village:'Baghwar', vhi:'बघवार', dod:'2026-07-24', delPlace:'Home',
        risk:'HRP', sc:'Sub-centre Sirmour', consent:true, baby:'Baby girl',
        steps:[
          mk({cat:'PNC_VISIT', level:'PHC', due:'2026-08-04', owner:'phc_nurse', rem:'failed', unreach:2}),
        ]},
    ];
    const ncd = [
      {id:'x1', name:'Kavita Patel', hi:'कविता पटेल', phone:'+919812345301', village:'Ghurehta', vhi:'घुरेहटा',
        cond:'Hypertension', since:'Feb 2023', risk:'HRP', htnUnc:true, sc:'Sub-centre Ghurehta', consent:true, abha:'12-3456-7890-1234',
        lmp:'2025-09-15', dod:'2026-06-20', baby:'Baby girl', linked:true,
        delPlace:'Institutional delivery',
        steps:[
          mk({reg:'ANC', cat:'ANC_VISIT', level:'PHC', due:'2025-11-02', status:'DONE', cdate:'2025-11-02', csrc:'AT_CLOSING_FACILITY', cby:'PHC Nurse · PHC Sirmour'}),
          mk({reg:'ANC', cat:'LAB', level:'PHC', due:'2026-01-08', status:'DONE', cdate:'2026-01-09', csrc:'AT_CLOSING_FACILITY', cby:'PHC Nurse · PHC Sirmour'}),
          mk({reg:'ANC', cat:'REFERRAL', level:'CHC', sent:'2026-01-12', status:'DONE', cdate:'2026-01-16', csrc:'AT_CLOSING_FACILITY', cby:'CHC SN · CHC Teonthar'}),
          mk({reg:'ANC', cat:'PMSMA_VISIT', level:'PHC', due:'2026-03-09', session:true, status:'DONE', cdate:'2026-03-09', csrc:'AT_CLOSING_FACILITY', cby:'PHC Nurse · PHC Sirmour'}),
          mk({reg:'ANC', cat:'ANC_VISIT', level:'PHC', due:'2026-05-14', status:'DONE', cdate:'2026-05-14', csrc:'AT_CLOSING_FACILITY', cby:'PHC Nurse · PHC Sirmour'}),
          mk({reg:'PNC', cat:'HBNC', level:'SUBCENTRE', hbnc:true, hday:3, due:'2026-06-22', status:'DONE', cdate:'2026-06-22', csrc:'AT_CLOSING_FACILITY', cby:'ASHA · Village Ghurehta'}),
          mk({reg:'PNC', cat:'HBNC', level:'SUBCENTRE', hbnc:true, hday:7, due:'2026-06-26', status:'DONE', cdate:'2026-06-26', csrc:'AT_CLOSING_FACILITY', cby:'ASHA · Village Ghurehta'}),
          mk({reg:'PNC', cat:'HBNC', level:'SUBCENTRE', hbnc:true, hday:14, due:'2026-07-03', status:'DONE', cdate:'2026-07-03', csrc:'AT_CLOSING_FACILITY', cby:'ASHA · Village Ghurehta'}),
          mk({reg:'PNC', cat:'HBNC', level:'SUBCENTRE', hbnc:true, hday:21, due:'2026-07-10', status:'DONE', cdate:'2026-07-10', csrc:'AT_CLOSING_FACILITY', cby:'ASHA · Village Ghurehta'}),
          mk({reg:'PNC', cat:'HBNC', level:'SUBCENTRE', hbnc:true, hday:28, due:'2026-07-17', status:'DONE', cdate:'2026-07-17', csrc:'AT_CLOSING_FACILITY', cby:'ASHA · Village Ghurehta'}),
          mk({reg:'PNC', cat:'PNC_VISIT', level:'PHC', due:'2026-06-27', status:'DONE', cdate:'2026-06-27', csrc:'AT_CLOSING_FACILITY', cby:'PHC Nurse · PHC Sirmour'}),
          mk({reg:'PNC', cat:'PNC_VISIT', level:'PHC', due:'2026-07-18', status:'DONE', cdate:'2026-07-18', csrc:'AT_CLOSING_FACILITY', cby:'PHC Nurse · PHC Sirmour'}),
          mk({reg:'NCD', cat:'FOLLOW_UP', level:'PHC', sent:'2026-07-04', status:'DONE', cdate:'2026-07-08', csrc:'AT_CLOSING_FACILITY', cby:'PHC Nurse · PHC Sirmour'}),
          mk({reg:'NCD', cat:'LAB', level:'PHC', due:'2026-08-05', owner:'phc_nurse'}),
          mk({reg:'NCD', cat:'REFILL', level:'PHC', due:'2026-08-14', owner:'phc_nurse'}),
        ]},
      {id:'n1', name:'Ramesh Tiwari', hi:'रमेश तिवारी', phone:'+919812345201', village:'Ghurehta', vhi:'घुरेहटा',
        cond:'Hypertension', since:'Mar 2024', risk:'HRP', htnUnc:true, sc:'Sub-centre Ghurehta', consent:true,
        steps:[
          mk({cat:'REFILL', level:'PHC', due:'2026-08-04', owner:'phc_nurse'}),
          mk({cat:'FOLLOW_UP', level:'PHC', sent:'2026-08-01', owner:'phc_nurse'}),
        ]},
      {id:'n2', name:'Shanti Devi', hi:'शांति देवी', phone:'+919812345202', village:'Baghwar', vhi:'बघवार',
        cond:'Type 2 diabetes', since:'Jan 2023', risk:'Normal', sc:'Sub-centre Sirmour', consent:true,
        steps:[
          mk({cat:'LAB', level:'PHC', due:'2026-08-06', owner:'phc_nurse'}),
          mk({cat:'FOLLOW_UP', level:'PHC', sent:'2026-08-04', owner:'phc_nurse'}),
        ]},
      {id:'n3', name:'Mohan Lal Kol', hi:'मोहन लाल कोल', phone:'+919812345203', village:'Dihiya', vhi:'दिहिया',
        cond:'Diabetes + hypertension', since:'Nov 2022', risk:'HRP', htnUnc:true, dmUnc:true, sc:'Sub-centre Sirmour', consent:false,
        steps:[
          mk({cat:'REFERRAL', level:'DH', sent:'2026-07-26', owner:'phc_nurse'}),
          mk({cat:'REFILL', level:'PHC', due:'2026-08-09', owner:'phc_nurse'}),
        ]},
      {id:'n4', name:'Sunita Kushwaha', hi:'सुनीता कुशवाहा', phone:'+919812345204', village:'Sirmour', vhi:'सिरमौर',
        cond:'Hypertension', since:'Jun 2025', risk:'Normal', sc:'Sub-centre Sirmour', consent:true,
        steps:[
          mk({cat:'FOLLOW_UP', level:'PHC', sent:'2026-07-28', status:'DONE', cdate:'2026-08-01', csrc:'AT_CLOSING_FACILITY', cby:'PHC Nurse · PHC Sirmour'}),
          mk({cat:'LAB', level:'PHC', due:'2026-08-20', owner:'phc_nurse'}),
        ]},
    ];
    return anc.map(w=>({svc:'ANC', ...w}))
      .concat(pnc.map(w=>({svc:'PNC', ...w})))
      .concat(ncd.map(w=>({svc:'NCD', ...w})))
      .concat([
        {svc:'CANCER', id:'c1', name:'Kamla Bai', hi:'कमला बाई', phone:'+919812345301', village:'Ghurehta', vhi:'घुरेहटा',
          cond:'Cervical screen positive', since:'Jul 2026', risk:'HRP', sc:'Sub-centre Ghurehta', consent:true,
          steps:[ mk({reg:'CANCER', cat:'REFERRAL', level:'DH', sent:'2026-08-02', owner:'anm'}),
                  mk({reg:'CANCER', cat:'FOLLOW_UP', level:'PHC', due:'2026-08-24', owner:'phc_sn'}) ]},
        {svc:'CANCER', id:'c2', name:'Sarita Gupta', hi:'सरिता गुप्ता', phone:'+919812345302', village:'Baghwar', vhi:'बघवार',
          cond:'Breast lump · awaiting biopsy', since:'Jun 2026', risk:'HRP', sc:'Sub-centre Sirmour', consent:true,
          steps:[ mk({reg:'CANCER', cat:'LAB', level:'DH', due:'2026-08-12', owner:'phc_sn'}),
                  mk({reg:'CANCER', cat:'REFERRAL', level:'TERTIARY', sent:'2026-07-30', status:'DONE', cdate:'2026-08-05', csrc:'AT_CLOSING_FACILITY', cby:'Tertiary SN · Medical College, Jabalpur'}) ]},
        {svc:'CANCER', id:'c3', name:'Rukmini Devi', hi:'रुक्मिणी देवी', phone:'+919812345303', village:'Gharonda', vhi:'गरोंडा',
          cond:'Oral screen positive', since:'Aug 2026', risk:'HRP', sc:'Sub-centre Ghurehta', consent:true,
          steps:[ mk({reg:'CANCER', cat:'REFERRAL', level:'CHC', sent:'2026-08-18', owner:'asha'}) ]},
        {svc:'CANCER', id:'c4', name:'Phoolwati Kol', hi:'फूलवती कोल', phone:'+919812345304', village:'Semri', vhi:'सेमरी',
          cond:'Cervical screen positive', since:'Jul 2026', risk:'HRP', sc:'Sub-centre Ghurehta', consent:false,
          steps:[ mk({reg:'CANCER', cat:'IMAGING', level:'CHC', due:'2026-08-14', owner:'anm', rem:'failed', unreach:3}) ]},
        {svc:'CANCER', id:'c5', name:'Shanti Verma', hi:'शांति वर्मा', phone:'+919812345305', village:'Sirmour', vhi:'सिरमौर',
          cond:'Breast screen positive', since:'Aug 2026', risk:'Normal', sc:'Sub-centre Sirmour', consent:true,
          steps:[ mk({reg:'CANCER', cat:'FOLLOW_UP', level:'PHC', due:'2026-08-31', owner:'phc_sn'}),
                  mk({reg:'CANCER', cat:'LAB', level:'PHC', due:'2026-08-10', status:'DONE', cdate:'2026-08-11', csrc:'AT_CLOSING_FACILITY', cby:'PHC SN · PHC Sirmour'}) ]},
        {svc:'CANCER', id:'c6', name:'Lalita Saket', hi:'ललिता साकेत', phone:'+919812345306', village:'Katra', vhi:'कटरा',
          cond:'Diagnosed · on treatment', since:'May 2026', risk:'HRP', sc:'Sub-centre Katra', consent:true,
          steps:[ mk({reg:'CANCER', cat:'FOLLOW_UP', level:'DH', due:'2026-08-20', owner:'dh_sn'}),
                  mk({reg:'CANCER', cat:'REFERRAL', level:'DH', sent:'2026-06-12', status:'DONE', cdate:'2026-06-19', csrc:'AT_CLOSING_FACILITY', cby:'DH SN · District Hospital, Rewa'}) ]},
        {svc:'CANCER', id:'c7', name:'Savitri Lodhi', hi:'सावित्री लोधी', phone:'+919812345307', village:'Dihiya', vhi:'दिहिया',
          cond:'Oral screen positive', since:'Jun 2026', risk:'HRP', sc:'Sub-centre Dihiya', consent:true,
          steps:[ mk({reg:'CANCER', cat:'REFERRAL', level:'TERTIARY', sent:'2026-07-22', status:'DECLINED', cdate:'2026-08-01', cby:'ASHA Samta · Village Dihiya'}) ]},
        {svc:'CANCER', id:'c8', name:'Anita Yadav', hi:'अनीता यादव', phone:'+919812345308', village:'Baghwar', vhi:'बघवार',
          cond:'Cervical screen positive', since:'Aug 2026', risk:'HRP', sc:'Sub-centre Sirmour', consent:true,
          steps:[ mk({reg:'CANCER', cat:'IMAGING', level:'DH', due:'2026-09-02', owner:'phc_sn'}),
                  mk({reg:'CANCER', cat:'REFERRAL', level:'CHC', sent:'2026-08-08', status:'DONE', cdate:'2026-08-13', csrc:'AT_OTHER_PUBLIC', cby:'ANM · Sub-centre Sirmour'}) ]},
      ]);
  }

  // ---------- helpers ----------
  fmt(iso){ if(!iso) return ''; const d=new Date(iso+'T00:00:00'); return d.getDate()+' '+MON[d.getMonth()]; }
  fmtLong(iso){ if(!iso) return ''; const d=new Date(iso+'T00:00:00'); return d.getDate()+' '+MON[d.getMonth()]+' '+d.getFullYear(); }
  iso(d){ const p=n=>(n<10?'0':'')+n; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }
  diff(iso){ return Math.round((TODAY - new Date(iso+'T00:00:00'))/86400000); }
  weeks(w){ return w.lmp ? Math.floor(this.diff(w.lmp)/7) : null; }
  edd(w){ return w.lmp ? this.iso(new Date(new Date(w.lmp+'T00:00:00').getTime()+280*86400000)) : null; }
  gestText(w){ const k=this.weeks(w); return k===null?'Not recorded':(k+' weeks'); }
  mask(p){ return '+91 '+p.slice(3,5)+'•••• •'+p.slice(-3); }
  initials(n){ const a=n.split(' '); return (a[0][0]+(a[1]?a[1][0]:'')).toUpperCase(); }
  avatarFor(id){ return AVA[parseInt(id.slice(1))%AVA.length]; }
  byId(id){ return (this.state.women||[]).find(w=>w.id===id); }
  allSteps(){ const k=this.svc(); const out=[]; this.clients().forEach(w=>w.steps.forEach(s=>{ if((s.reg||w.svc||'ANC')===k) out.push({s,w}); })); return out; }
  hasSvc(){ const r=ROLES[this.state.role]; return !!(r && r.services); }
  svc(){ return this.state.svc||'ANC'; }
  svcMeta(){ return SVC[this.svc()]; }
  bySvc(k){ return (this.state.women||[]).filter(w=>(w.svc||'ANC')===k); }
  clients(){ return this.bySvc(this.svc()); }
  optionsFor(){ const r=ROLES[this.state.role]||{};
    if(this.svc()==='PNC' && this.state.role==='asha') return ['HBNC','REF_NB','REF_PW'];
    let opts = this.hasSvc() ? this.svcMeta().options
      : (!(r.options||[]).length ? [] : (this.svc()==='ANC' ? r.options : this.svcMeta().options));
    if(this.svc()==='CANCER' && this.state.role==='anm') opts=opts.filter(k=>k!=='LAB' && k!=='IMAGING');
    return opts; }
  ppDay(w){ return w.dod ? this.diff(w.dod) : null; }
  metaA(w){ const s=w.svc||'ANC';
    if(s==='ANC') return this.weeks(w)===null?'Newly registered':(this.weeks(w)+' wks');
    if(s==='PNC') return this.ppDay(w)===null?'Newly registered':('Day '+this.ppDay(w)+' PP');
    return ''; }
  metaBLabel(w){ const s=w.svc||'ANC'; return s==='ANC'?'EDD':(s==='PNC'?'Born':'Since'); }
  metaB(w){ const s=w.svc||'ANC';
    if(s==='ANC') return this.edd(w)?this.fmt(this.edd(w)):'';
    if(s==='PNC') return w.dod?this.fmt(w.dod):'';
    return w.since||''; }
  riskTag(w){ const s=w.svc||'ANC';
    const HI={bg:'var(--ml-peach)', fg:'#8A3D14'}, OK={bg:'#D9F7E8', fg:'#1B6B47'},
          NEU={bg:'var(--surface-brand-soft)', fg:'var(--ml-blue)'}, CA={bg:'#F6EBEB', fg:'#8A3436'};
    if(s==='PNC'){ const m=w.risk==='HRP', n=!!w.nbRisk;
      if(m&&n) return {label:'High risk mother + newborn', ...HI};
      if(m) return {label:'High risk mother', ...HI};
      if(n) return {label:'High risk newborn', ...HI};
      return {label:'Both normal', ...OK}; }
    if(s==='NCD'){ const c=(w.cond||'').toLowerCase();
      const dm=/diab/.test(c), htn=/hyperten/.test(c);
      return {label: dm&&htn ? 'HTN & DM' : dm ? 'DM' : htn ? 'HTN' : (w.cond||'—'), ...NEU}; }
    if(s==='CANCER'){ const c=(w.cond||'').toLowerCase();
      return {label: /oral/.test(c)?'Oral' : /breast/.test(c)?'Breast' : /cervic/.test(c)?'Cervical' : 'Other', ...CA}; }
    return this.isHigh(w) ? {label:'HRP', ...HI} : {label:'Normal', ...OK};
  }
  flagShort(w){ const s=w.svc||'ANC';
    if(s==='PNC'){ const m=w.risk==='HRP', n=!!w.nbRisk;
      return m&&n ? 'HR mother + newborn' : m ? 'High risk mother' : n ? 'High risk newborn' : 'Both well'; }
    if(s==='NCD'){ const c=(w.cond||''), d=/diabet/i.test(c), h=/hyperten/i.test(c);
      return d&&h ? 'Diabetes + hypertension' : d ? 'Diabetes' : 'Hypertension'; }
    const f=SVC[s].flag; return f[w.risk==='HRP'?'HRP':'Normal']; }
  isHigh(w){ return w.risk==='HRP' || !!w.nbRisk || !!w.htnUnc || !!w.dmUnc; }
  openCount(w){ return w.steps.filter(s=>s.status==='OPEN').length; }
  abhaOf(w){ if(w.abha) return w.abha; const d=(w.phone||'').replace(/\D/g,'').slice(-10);
    return '12-34'+d.slice(0,2)+'-'+d.slice(2,6)+'-'+d.slice(6,10); }
  hasOverdue(w){ return w.steps.some(s=>s.status==='OPEN'&&s.due&&this.diff(s.due)>0); }
  pmsmaDay(){ const d=this.props.pmsmaDay||9; return Math.min(28,Math.max(1,d)); }
  nextPmsma(){ const day=this.pmsmaDay(); let d=new Date(TODAY.getFullYear(), TODAY.getMonth(), day);
    if(d < TODAY) d=new Date(TODAY.getFullYear(), TODAY.getMonth()+1, day); return this.iso(d); }
  catLabel(cat, level){
    if(cat==='FOLLOW_UP'||cat==='TREATMENT') return 'Follow up at '+(FUP[level]||'facility');
    if(cat==='HBNC') return 'HBNC visit';
    if(cat==='PNC_VISIT') return 'PNC follow up at '+(FUP[level]||'facility');
    if(cat==='NB_CHECK') return 'Newborn follow up at '+(FUP[level]||'facility');
    if(cat==='IMAGING' && this.svc()==='CANCER') return 'Imaging';
    return CAT[cat].label;
  }
  ord(n){ const s=['th','st','nd','rd'], v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); }
  toast(t){ this.setState({toast:t}); clearTimeout(this._tt); this._tt=setTimeout(()=>this.setState({toast:null}),2600); }

  // ---------- insights (PHC MO) ----------
  insScopeDef(){ return INS_SCOPES[this.state.role] || {mul:1, list:INS_SC}; }
  insScList(){ return this.insScopeDef().list; }
  insMul(){ return this.insScopeDef().mul; }
  insSc(){ const L=this.insScList(); return L.find(s=>s.id===(this.state.insSc||'all')) || L[0]; }
  insFactors(){
    const sc=this.insSc(); let f=sc.f, q=sc.q;
    if(this.state.insVil && sc.villages.length){
      const i=sc.villages.indexOf(this.state.insVil);
      f=f/sc.villages.length; q=q*[1.05,.93,1.0][Math.max(0,i)%3];
    }
    return {f:f*this.insMul(), q, sc};
  }
  insN(v){ return Math.max(0, Math.round(v*this.insFactors().f)); }
  insPair(num,den){
    const {f,q}=this.insFactors();
    const d=Math.max(1, Math.round(den*f));
    const n=Math.min(d, Math.max(0, Math.round(num*f*q)));
    const pct=Math.round(n/d*100);
    return {num:n, den:d, pct, frac:n+'/'+d, w:pct+'%', color: pct>=85?'#2E9E6B':(pct>=65?'#C35721':'#994242')};
  }
  insMix(base, target){
    const sum=base.reduce((a,m)=>a+m.n,0)||1;
    const out=base.map(m=>({...m, n:Math.round(m.n/sum*target)}));
    let d=target-out.reduce((a,m)=>a+m.n,0);
    for(let i=0; d!==0 && i<out.length; i++){ const s=Math.sign(d); if(out[i].n+s>=0){ out[i].n+=s; d-=s; } }
    return out.filter(m=>m.n>0);
  }
  insightsVM(){
    const st=this.state, sc=this.insSc();
    const svcKey=this.svc(); let S=INS_SVC[svcKey]||INS_SVC.ANC;
    if(['ins_asha','ins_aam','ins_phc','ins_chc'].indexOf(st.role)>-1 && svcKey==='PNC'){
      S={...S,
        actions:(()=>{ const by={}; S.actions.forEach(a=>by[a.key]=a);
          const hb={key:'hbnc', label:'HBNC visits overdue', n:14, color:'#2E9E6B', soft:'#D9F7E8',
            sub:'A scheduled home-based newborn care visit is past its due date'};
          const rename={pnc:'Facility PNC visits overdue', nb:'NB facility visits overdue'};
          return ['ref','hbnc','pnc','nb','drop','lost']
            .map(k=>k==='hbnc'?hb:(by[k]&&{...by[k], label:rename[k]||by[k].label}))
            .filter(Boolean)
            .concat(S.actions.filter(a=>['ref','pnc','nb','drop','lost'].indexOf(a.key)<0)); })(),
        secs:S.secs.map(x=>x.title==='PNC compliance'
          ? {title:'HBNC compliance', sub:'Home visits made as per the HBNC schedule',
              rows:[{label:'Day 1 (home delivery)', num:9, den:11},{label:'Day 3', num:44, den:52},{label:'Day 7', num:38, den:50},
                    {label:'Day 14', num:31, den:47},{label:'Day 21', num:26, den:44},{label:'Day 28', num:22, den:41},{label:'Day 42', num:17, den:38}]}
          : x)};
    }
    if(['ins_dh','ins_tert'].indexOf(st.role)>-1 && svcKey==='PNC'){
      const rn={pnc:'PNC facility visits overdue', nb:'NB facility visits overdue'};
      S={...S, actions:S.actions.map(a=>rn[a.key]?{...a, label:rn[a.key]}:a),
        secs:S.secs.map(x=>x.title==='PNC compliance'
          ? {...x, title:'PNC facility visit compliance', sub:'Facility postnatal visits as per schedule'} : x)};
    }
    const k = S.hrp / INS_SVC.ANC.hrp;
    const B={registered:S.registered, hrp:S.hrp, actions:S.actions,
      ref: INS_BASE.ref.map(x=>({...x, n:Math.max(1, Math.round(x.n*k))})),
      lowerMix: INS_BASE.lowerMix.map(x=>({...x, n:Math.max(1, Math.round(x.n*k))})),
      track:{num:Math.round(INS_BASE.track.num*k), den:S.hrp}};
    const PEOPLE=(INS_PEOPLE_SVC[svcKey]||{});
    const chip=(on,ac)=>on?{bg:ac, fg:'#fff', bd:ac}:{bg:'var(--surface-card)', fg:'var(--text-body)', bd:'var(--border-default)'};
    const ac='#1E14BE';
    const facilityOnly=['ins_dh','ins_tert'].indexOf(st.role)>-1;
    const registered=this.insN(B.registered), hrp=this.insN(B.hrp);
    const hrpPct = registered ? Math.round(hrp/registered*1000)/10 : 0;

    const rows=B.actions.map(a=>{
      const n=this.insN(a.n), open=st.insOpen===a.key;
      let people=(PEOPLE[a.key]||[]);
      if(st.insSc && st.insSc!=='all') people=people.filter(p=>p.sc===sc.id);
      people=people.slice(0,3).map(p=>({name:p.name, meta:p.meta, pill:p.pill, initials:this.initials(p.name), avatarBg:AVA[p.name.length%AVA.length]}));
      const more=Math.max(0, n-people.length);
      return {key:a.key, label:a.label, sub:a.sub, color:a.color, soft:a.soft, value:n+'',
        w:(hrp?Math.min(100,Math.round(n/hrp*100)):0)+'%', share:hrp?Math.round(n/hrp*100)+'% of '+S.cohort:'—',
        open, chev:open?'M6 15l6-6 6 6':'M6 9l6 6 6-6',
        people, hasPeople:open&&people.length>0, noPeople:open&&people.length===0,
        moreLabel: more? ('+'+more+' more in worklist') : 'Full list shown',
        onTap:()=>this.setState({insOpen: open?null:a.key}),
        onWork:()=>this.setTab('worklist')};
    });

    const segs=B.ref.map(s=>({...s, n:this.insN(s.n)}));
    const total=segs.reduce((a,s)=>a+s.n,0)||1;
    const lowerNum=segs[1].n, lowerDen=total;
    const mix=this.insMix(B.lowerMix, lowerNum);
    const mixMax=Math.max(1, ...mix.map(m=>m.n));
    const bars=(l)=>l.map(x=>{ const p=this.insPair(x.num,x.den); return {label:x.label, pct:p.pct+'%', frac:p.frac, w:p.w, color:p.color}; });
    const track=this.insPair(B.track.num, B.track.den);

    const roleObj = ROLES[st.role] || ROLES.ins_aam;
    const copilotData = {
      roleName: roleObj.name || 'Staff',
      facilityName: roleObj.facility || 'Facility',
      roleLevel: roleObj.level || 'SUBCENTRE',
      service: S.name || svcKey,
      scope: (sc.id==='all' ? sc.label : (INS_SCOPES[st.role] ? sc.label : 'SC-HWC '+sc.label)),
      village: st.insVil || 'All villages',
      registered,
      hrp,
      hrpPct,
      actionRows: rows.map(r=>({key:r.key, label:r.label, value:r.value, color:r.color, sub:r.sub})),
      trackingRate: track.pct,
      lowerTierRate: Math.round(lowerNum/lowerDen*100)+'%',
      women: st.women || [],
    };
    const copilotNode = React.createElement(InsightsRagCopilot, {
      key: `copilot-${st.role}-${sc.id}-${st.insVil||'all'}-${st.svc||'ANC'}`,
      data: copilotData
    });

    return {
      hasScopes: this.insScList().length>1,
      scChips: this.insScList().map(s=>({label:s.label, ...chip((st.insSc||'all')===s.id, ac), onTap:()=>this.setState({insSc:s.id, insVil:null, insOpen:null})})),
      hasVillages: sc.villages.length>0,
      vilChips: sc.villages.length? [{label:'All villages', ...chip(!st.insVil, '#655AD0'), onTap:()=>this.setState({insVil:null})}].concat(
        sc.villages.map(v=>({label:v, ...chip(st.insVil===v, '#655AD0'), onTap:()=>this.setState({insVil:v})}))) : [],
      scopeLine: (sc.id==='all' ? sc.label : (INS_SCOPES[st.role] ? sc.label : 'SC-HWC '+sc.label)) + (st.insVil?(' · '+st.insVil):'')
        + (['ins_dh','ins_tert'].indexOf(st.role)>-1 ? ' · services at this facility' : ''),
      hrpPct: hrpPct+'%', hrp:hrp+'', registered:registered+'',
      hrpBar: Math.min(100, Math.round(hrpPct*3))+'%',
      seg:[
        {label:'Needs action', k:'actions'},
        {label:'Quality', k:'quality'},
        {label:'✦ Copilot', k:'copilot'}
      ].map(s=>({label:s.label,
        bg:(st.insSeg||'actions')===s.k?'#fff':'transparent', fg:(st.insSeg||'actions')===s.k?ac:'#70706E',
        sh:(st.insSeg||'actions')===s.k?'0 1px 3px rgba(30,20,190,.14)':'none',
        onTap:()=>this.setState({insSeg:s.k})})),
      isActions:(st.insSeg||'actions')==='actions',
      isQuality:(st.insSeg||'actions')==='quality',
      isCopilot:(st.insSeg||'actions')==='copilot',
      copilotNode,
      metricLabel: facilityOnly? S.metricFac : S.metric,
      headLine: facilityOnly? S.denLineFac(hrp, registered) : S.denLine(hrp, registered), unit:S.unit, refTitle:S.refTitle,
      secs:S.secs.map(x=>{
        const mx=(x.durs||[]).reduce((a,d)=>Math.max(a,d.days),0)||1;
        return {title:x.title, sub:x.sub, hasBars:!!x.rows, bars:bars(x.rows||[]),
          hasDur:!!x.durs, durs:(x.durs||[]).map(d=>({label:d.label, days:d.days+'', note:d.note,
            w:Math.round(d.days/mx*100)+'%', color:d.days>7?'#C35721':'#2E9E6B'}))};
      }),
      rows, actionTotal: rows.reduce((a,r)=>a+parseInt(r.value,10),0)+' '+S.cohort+' need an action',
      ref:{total:total+' '+S.cohort+' referred', segs:segs.map(s=>({label:s.label, color:s.color, n:s.n+'', w:(s.n/total*100)+'%', pct:Math.round(s.n/total*100)+'%'}))},
      lower:{pct:Math.round(lowerNum/lowerDen*100)+'%', frac:lowerNum+' of '+lowerDen+' '+S.cohort+' referred',
        open:!!st.insLowerOpen, chev: st.insLowerOpen?'M6 15l6-6 6 6':'M6 9l6 6 6-6',
        onToggle:()=>this.setState({insLowerOpen:!st.insLowerOpen}),
        mix:mix.map(m=>({label:m.label, n:m.n+'', w:(m.n/mixMax*100)+'%'}))},
      track:{pct:track.pct+'%', deg:track.pct+'%', line:track.num+' of '+track.den+' '+S.cohort+' '+S.trackLine},
    };
  }

  // ---------- nav ----------
  pickRole(r){ const t=(ROLES[r].tabs||['lookup','worklist','alerts','insights'])[0]; this.setState({role:r, screen:t, tab:t, selId:null, query:'', dialog:null, filter:'ALL'}); }
  switchRole(){ this.setState({screen:'launcher', role:null, dialog:null, cap:null}); }
  pickUser(u){
    const r=ROLES[u.k];
    const scr=u.screen||(r.tabs||['lookup','worklist','alerts','insights'])[0];
    this.setState({role:u.k, screen:scr, tab:scr, svc:u.svc||'ANC', selId:null, query:'', dialog:null,
      filter:'ALL', riskFilter:'ALL', insSeg:'actions'});
  }
  setTab(t){ this.setState({screen:t, tab:t, selId:null, dialog:null}); }
  openWoman(id){ this.setState({screen:'journey', selId:id, dialog:null}); }
  openRegister(){ this.setState({screen:'register', dialog:null, reg:{name:'', phone:'', village:'', abha:'', lmp:'', status:'normal', nbStatus:'normal', delPlace:'INST', bp:'normal', bg:'normal', consent:true, cond:'HTN', scr:[], dx:[]}}); }
  setReg(patch){ this.setState({reg:{...(this.state.reg||{}), ...patch}}); }
  regGroups(r, pair){
    const k=this.svc(), out=[];
    if(k==='NCD'){
      out.push({title:'Condition', note:'Sets the register he or she is followed up in — no readings are stored here.',
        opts:pair(r.cond||'HTN', [{k:'HTN',label:'Hypertension'},{k:'DM',label:'Diabetes'},{k:'BOTH',label:'Both'}], (x)=>this.setReg({cond:x}))});
      out.push({title:'BP control', note:'Routing label only — taken from the last clinic visit.',
        opts:pair(r.bp||'normal', [{k:'normal',label:'Controlled'},{k:'high',label:'Uncontrolled',danger:true}], (x)=>this.setReg({bp:x}))});
      out.push({title:'Blood sugar control', note:'Leave as controlled if she is not on diabetes treatment.',
        opts:pair(r.bg||'normal', [{k:'normal',label:'Controlled'},{k:'high',label:'Uncontrolled',danger:true}], (x)=>this.setReg({bg:x}))});
    } else if(k==='PNC'){
      out.push({title:'Place of delivery', note:'Sets the HBNC schedule (home delivery adds a day-1 visit) and the 42-day PNC eligibility window from the delivery date.',
        opts:pair(r.delPlace||'INST', [{k:'INST',label:'Institution'},{k:'HOME',label:'Home'}], (x)=>this.setReg({delPlace:x}))});
      out.push({title:'Mother status', note:'Routing label only — no danger-sign detail is collected (NS-12).',
        opts:pair(r.status, [{k:'normal',label:'Normal'},{k:'high',label:'High risk',danger:true}], (x)=>this.setReg({status:x}))});
      out.push({title:'Newborn status', note:'Flags the baby separately — low birth weight, preterm or referred.',
        opts:pair(r.nbStatus||'normal', [{k:'normal',label:'Normal'},{k:'high',label:'High risk',danger:true}], (x)=>this.setReg({nbStatus:x}))});
    } else if(k==='CANCER'){
      const SITES=[{k:'ORAL',label:'Oral'},{k:'BREAST',label:'Breast'},{k:'CERVICAL',label:'Cervical'},{k:'OTHER',label:'Other'}];
      const multi=(cur,key)=>SITES.map(v=>{ const on=(cur||[]).includes(v.k);
        return {label:v.label, on, ...(on?{bg:'#F7E3E3',fg:'#994242',bd:'#DFA6A6'}:{bg:'var(--surface-card)',fg:'var(--text-body)',bd:'var(--border-default)'}),
          onTap:()=>{ const set=new Set(this.state.reg[key]||[]); if(set.has(v.k)) set.delete(v.k); else set.add(v.k); this.setReg({[key]:[...set]}); }}; });
      out.push({title:'Screening positive for', wrap:true, note:'Select every site that screened positive. Sites only — no findings or grades are stored here.',
        opts:multi(r.scr, 'scr')});
      out.push({title:'Diagnosed for', wrap:true, note:'Select only after a confirmed diagnosis at a higher facility. Leave blank if awaiting confirmation.',
        opts:multi(r.dx, 'dx')});
    } else {
      out.push({title:'Pregnancy status', note:'Routing label only — no reason, threshold or danger-sign detail is collected (NS-12).',
        opts:pair(r.status, [{k:'normal',label:'Normal'},{k:'high',label:'High risk',danger:true}], (x)=>this.setReg({status:x}))});
    }
    out.push({title:'WhatsApp reminders', note:'Consent is required before any reminder is sent to this number.',
      opts:pair(r.consent?'yes':'no', [{k:'yes',label:'Yes, consented'},{k:'no',label:'No',danger:true}], (x)=>this.setReg({consent:x==='yes'}))});
    return out;
  }
  homeVM(){
    return {
      hint:'Pick the register you are working in. Worklists, next steps and closures all stay inside that service.',
      folders: SVC_KEYS.map(k=>{ const m=SVC[k], ws=this.bySvc(k);
        let open=0, today=0, over=0;
        ws.forEach(w=>w.steps.forEach(s=>{ if(s.status!=='OPEN') return; open++;
          if(s.due){ const d=this.diff(s.due); if(d>0) over++; else if(d===0) today++; } }));
        return {label:m.label, full:m.full, line:m.line, ac:m.ac, sf:m.sf, icon:m.icon,
          people:ws.length+' registered', open:open+'', today:today+'', over:over+'',
          overFg: over? '#994242' : 'var(--text-muted)', todayFg: today? '#C35721' : 'var(--text-muted)',
          onTap:()=>this.setState({svc:k, screen:'worklist', tab:'worklist', filter:'ALL', riskFilter:'ALL', selId:null, dialog:null})}; })};
  }
  profileVM(){
    const w=this.byId(this.state.selId); if(!w) return null;
    const grp=(k)=>w.steps.filter(s=>(s.reg||w.svc)===k);
    const item=(s)=>{ const done=s.status==='DONE'; const d=s.due?this.diff(s.due):null;
      return {title:(s.cat==='REFERRAL'?('Referral → '+this.facShort(s.level)):this.catLabel(s.cat, s.level)),
        line: done ? (this.fmt(s.cdate)+' · '+this.facShort(s.clevel||s.level))
          : (s.due ? ((d>0? (d+' day'+(d>1?'s':'')+' overdue') : (d===0?'Due today':('Due '+this.fmt(s.due))))+' · '+this.facShort(s.level))
                   : ('Awaiting '+this.facShort(s.level))),
        icon:CAT[s.cat].icon, done, open:!done,
        fg: done ? '#1B6B47' : (d!==null && d>0 ? '#994242' : '#6165DE'),
        bg: done ? '#D9F7E8' : (d!==null && d>0 ? '#F7E3E3' : '#E7E7FB')}; };
    const openAll=w.steps.filter(s=>s.status==='OPEN');
    const overdue=openAll.filter(s=>s.due&&this.diff(s.due)>0);
    const ppDay=this.ppDay(w);
    const po=this.state.profOpen||{};
    const nDone=(reg, cats)=>grp(reg).filter(s=>s.status==='DONE' && cats.indexOf(s.cat)>-1).length;
    const phase=(label, when, key, ac, sf, items, countText)=>{
      const dn=items.filter(x=>x.done).length, op=items.length-dn;
      const open = (key in po) ? !!po[key] : key==='NOW';
      return {label, when, ac, sf, items, hasItems:items.length>0 && open, hasCount:items.length>0,
        count: items.length ? (countText || (op? (dn+' done · '+op+' open') : (dn+' done'))) : '',
        chev: items.length ? (open?'M6 15l6-6 6 6':'M6 9l6 6 6-6') : '',
        showChev: items.length>0,
        onToggle: items.length ? ()=>this.setState({profOpen:{...po, [key]: !open}}) : ()=>{}};
    };
    const phases=[
      phase('Hypertension diagnosed', w.since, 'DX', SVC.NCD.ac, SVC.NCD.sf, []),
      phase('Antenatal care', this.fmt(w.lmp)+' → '+this.fmt(this.edd(w)), 'ANC', SVC.ANC.ac, SVC.ANC.sf, grp('ANC').map(item),
        nDone('ANC',['ANC_VISIT'])+' ANC · '+nDone('ANC',['PMSMA_VISIT'])+' PMSMA done'),
      phase('Delivered', this.fmtLong(w.dod)+' · '+w.delPlace, 'DEL', '#994242', '#F7E3E3', []),
      phase('Postnatal & newborn', 'Jun – Jul 2026', 'PNC', SVC.PNC.ac, SVC.PNC.sf, grp('PNC').map(item),
        nDone('PNC',['HBNC'])+' HBNC · '+nDone('PNC',['PNC_VISIT','NB_CHECK'])+' facility PNC'),
      phase('Hypertension care · now', 'Since Jul 2026', 'NOW', SVC.NCD.ac, SVC.NCD.sf, grp('NCD').map(item)),
    ];
    return {
      name:w.name, nameHi:w.hi, initials:this.initials(w.name), sub:w.village+' ('+w.vhi+')',
      phone:this.mask(w.phone), abha:w.abha?('•••• '+w.abha.slice(-4)):'—', onCall:()=>this.toast('Dialling '+w.name+' · '+this.mask(w.phone)),
      status:[
        {label:'NCD', value:'HTN', note:w.since, ac:SVC.NCD.ac, sf:SVC.NCD.sf},
        {label:'Inst delivery', value:this.fmt(w.dod), note:'PNC period complete', ac:SVC.PNC.ac, sf:SVC.PNC.sf},
        {label:'HTN follow up', value:'Open '+openAll.length, note:overdue.length?(overdue.length+' overdue'):'On time', ac:overdue.length?'#994242':'#1E14BE', sf:overdue.length?'#F7E3E3':'#EFEDFF'},
      ],
      chain:['ANC','PNC','NCD'].map((k)=>({label:SVC[k].label, ac:SVC[k].ac, sf:SVC[k].sf, cur:k==='NCD'})),
      phases, onBack:()=>this.setState({screen:'journey'}),
      closedCount:w.steps.filter(s=>s.status==='DONE').length+' closed',
    };
  }
  ashaFor(v){ const f=VILLAGES.find(x=>x.name===v); return f?f.asha:'—'; }
  saveReg(){
    const r=this.state.reg||{};
    const digits=(r.phone||'').replace(/\D/g,'').slice(-10);
    if(!r.name.trim() || digits.length<10 || !r.village){ this.toast('Name, mobile and village are required'); return; }
    const asha=this.ashaFor(r.village);
    const k=this.svc();
    const CONDL={HTN:'Hypertension', DM:'Type 2 diabetes', BOTH:'Diabetes + hypertension'};
    const id='w'+(this.state.women.length+1)+'n';
    const woman={id, svc:k, name:r.name.trim(), hi:'', phone:'+91'+digits, village:r.village, vhi:'', age:null,
      lmp:(k==='ANC'?(r.lmp||null):null), dod:(k==='PNC'?(r.lmp||null):null),
      delPlace:(k==='PNC'?((r.delPlace||'INST')==='HOME'?'Home':'Institution'):null),
      cond:(k==='NCD'?CONDL[r.cond||'HTN']:(k==='CANCER'?this.cancerCond(r):null)), since:(k==='NCD'?'Aug 2026':(k==='CANCER'?'Aug 2026':null)), g:null, p:null,
      risk: (r.status==='high' || (k==='NCD' && (r.bp==='high'||r.bg==='high')) || (k==='CANCER' && ((r.scr||[]).length || (r.dx||[]).length)))?'HRP':'Normal',
      htnUnc:(k==='NCD' && r.bp==='high'), dmUnc:(k==='NCD' && r.bg==='high'),
      nbRisk:(k==='PNC' && r.nbStatus==='high'), sc:ROLES[this.state.role].facility, asha, abha:r.abha||'', consent:!!r.consent, steps:[]};
    this.setState({women:[woman, ...this.state.women], screen:'journey', selId:id, reg:null});
    this.toast(woman.name+' registered · linked ASHA '+asha);
    try {
      fetch(getSyncEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patients: [woman], actorId: this.state.role, actorName: ROLES[this.state.role]?.name || this.state.role })
      }).catch(e => console.log('Sync offline:', e));
    } catch(e) {}
  }
  cancerCond(r){
    const L={ORAL:'Oral', BREAST:'Breast', CERVICAL:'Cervical', OTHER:'Other'};
    const dx=(r.dx||[]).map(x=>L[x]), scr=(r.scr||[]).map(x=>L[x]);
    if(dx.length) return dx.join(' + ')+' cancer diagnosed';
    if(scr.length) return scr.join(' + ')+' screen positive';
    return 'Under follow-up';
  }
  back(){ this.setState({screen:this.state.tab||'lookup', cap:null, dialog:null}); }

  // ---------- close ----------
  openClose(stepId){
    this.setState({dialog:{type:'act', stepId, exp:null}});
  }
  facShort(lv){ return {SUBCENTRE:'AAM', PHC:'PHC', CHC:'CHC', DH:'DH', TERTIARY:'Tert Facility'}[lv] || (LVL[lv]&&LVL[lv].short) || lv; }
  stepById(id){ let f=null; this.allSteps().forEach(({s,w})=>{ if(s.id===id) f={s,w}; }); return f; }
  patchStep(id, patch){ const ws=this.state.women.map(w=>({...w, steps:w.steps.map(s=> s.id!==id ? s : {...s, ...patch})})); this.setState({women:ws}); }
  actMarkComplete(id){ this.setState({dialog:{type:'close', stepId:id, outcome:null, src:null}}); }
  actCall(id){ const f=this.stepById(id); this.toast('Dialling '+(f?f.w.name:'her')+'…'); }
  actLogAttempt(id){ const f=this.stepById(id); this.patchStep(id,{rem:'failed', unreach:((f&&f.s.unreach)||0)+1}); this.setState({dialog:null}); this.toast('Contact attempt logged'); }
  actResched(id){ const f=this.stepById(id); this.setState({dialog:{type:'resched', stepId:id, date:(f&&f.s.due)||TODAY_ISO}}); }
  confirmResched(){ const d=this.state.dialog; if(!d.date) return; this.patchStep(d.stepId,{due:d.date}); this.setState({dialog:null}); this.toast('Due date moved to '+this.fmt(d.date)); }
  actCancelStep(id){ const role=ROLES[this.state.role];
    this.patchStep(id,{status:'CANCELLED', cdate:TODAY_ISO, cby:role.short+' · '+role.facility});
    this.setState({dialog:null}); this.toast('Step cancelled · reminders stopped'); }
  actDeclined(id){ const role=ROLES[this.state.role];
    this.patchStep(id,{outcome:'NOT_COMPLETED', csrc:'DECLINED', cby:role.short+' · '+role.facility});
    this.setState({dialog:null}); this.toast('She declined · recorded, step stays open'); }
  confirmClose(){
    const d=this.state.dialog;
    let stepLevel=null; this.allSteps().forEach(({s})=>{ if(s.id===d.stepId) stepLevel=s.level; });
    const isOwnFacility = (this.state.role!=='asha') && (stepLevel===ROLES[this.state.role]?.level);
    const ready = isOwnFacility ? !!d.outcome : (d.outcome==='NO_CONTACT' || (d.outcome && d.src));
    if(!ready) return;
    this.applyClose(d.stepId, d.outcome, d.src);
  }
  applyClose(stepId, outcome, src){
    const d={stepId, outcome, src};
    const role=ROLES[this.state.role];
    const done=d.outcome==='COMPLETED';
    // Care recorded on someone else's behalf (elsewhere) — the closer's own level is not where care happened
    const elsewhere = ['AT_REFERRED_FACILITY','OTHER_PUBLIC_FACILITY','PRIVATE_PROVIDER'].indexOf(d.src)>-1;
    const clev = done && !elsewhere ? role.level : (d.src === 'DELIVERED_ON_SITE' ? role.level : null);
    const ws=this.state.women.map(w=>({...w, steps:w.steps.map(s=> s.id!==d.stepId ? s
      : {...s, status:done?'DONE':'OPEN', outcome:d.outcome, cdate:done?TODAY_ISO:null, csrc:d.src||d.outcome, clevel:clev, cby:role.short+' · '+role.facility})}));
    let lower=false;
    this.allSteps().forEach(({s})=>{ if(s.id===d.stepId && done && clev && LADDER.indexOf(clev)<LADDER.indexOf(s.level)) lower=true; });
    this.setState({women:ws, dialog:null});
    this.toast(done?(lower?'Closed below the referred level · flagged':'Step closed · visible to every level'):'Outcome recorded · step stays open');
    try {
      const stepFound = this.stepById(d.stepId);
      fetch(getSyncEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steps: [{
            id: d.stepId,
            patient_id: stepFound ? stepFound.w.id : 'Patient/w1',
            cat: stepFound?.s?.cat || 'REFERRAL',
            level: stepFound?.s?.level || (clev || 'CHC'),
            status: done ? 'DONE' : 'OPEN',
            closed_at: done ? TODAY_ISO : null,
            closed_source: d.src || d.outcome,
            closed_level: clev,
            closed_by: role.short + ' · ' + role.facility,
            downgraded: lower ? 1 : 0
          }],
          actorId: this.state.role,
          actorName: role.name
        })
      }).catch(e => console.log('Sync offline:', e));
    } catch(e) {}
  }

  openSms(stepId){ this.setState({dialog:{type:'sms', stepId}}); }
  openScan(){ this.setState({dialog:{type:'scan'}}); }
  confirmScan(){ this.setState({dialog:null, query:'9812345022'}); this.toast('ABHA matched · Lakshmi Bai'); }

  // ---------- capture ----------
  openCapture(id){ this.setState({screen:'capture', dialog:null, cap:{womanId:id, steps:[]}}); }
  setCap(patch){ this.setState({cap:{...this.state.cap, ...patch}}); }
  addStaged(st){ const c=this.state.cap; this.setCap({steps:[...c.steps, {sid:uid(), ...st}]}); }
  removeStaged(sid){ const c=this.state.cap; this.setCap({steps:this.state.cap.steps.filter(s=>s.sid!==sid)}); }

  openOption(cat){
    const role=ROLES[this.state.role];
    if(cat==='REFERRAL') return this.setState({dialog:{type:'referral', sel:[]}});
    if(cat==='PMSMA_VISIT') return this.setState({dialog:{type:'pmsma'}});
    if(cat==='REF_PW'||cat==='REF_NB') return this.setState({dialog:{type:'ashaRef', who:[cat==='REF_PW'?'PW':'NB'], lvl:'SUBCENTRE'}});
    if(cat==='HBNC'){ const w=this.byId(this.state.cap?this.state.cap.womanId:null);
      return this.setState({dialog:{type:'hbnc', sel:this.hbncDefault(w)}}); }
    if(cat==='IMAGING' && role.level==='PHC'){ const d=new Date(TODAY.getTime()+86400000); return this.setState({dialog:{type:'usg', date:this.iso(d)}}); }
    if(DATED.indexOf(cat)>-1){ const d=new Date(TODAY.getTime()+(cat==='ANC_VISIT'?14:7)*86400000); return this.setState({dialog:{type:'anc', cat, date:this.iso(d)}}); }
    this.addStaged({cat, level:role.level, sent:TODAY_ISO});
    this.toast(this.catLabel(cat, role.level)+' added · '+role.facility);
  }
  refMax(){ const lv=ROLES[this.state.role].level; return (lv==='PHC'||lv==='CHC'||lv==='DH')?2:1; }
  toggleRefLevel(k){
    const d=this.state.dialog, max=this.refMax();
    let sel=(d.sel||[]).slice();
    if(sel.includes(k)) sel=sel.filter(x=>x!==k);
    else if(max===1) sel=[k];
    else if(sel.length<max) sel.push(k);
    else { sel=[sel[1],k]; }
    this.setState({dialog:{...d, sel}});
  }
  confirmReferral(){
    const d=this.state.dialog; const sel=d.sel||[]; if(!sel.length) return;
    sel.forEach(k=>this.addStaged({cat:'REFERRAL', level:k, sent:TODAY_ISO}));
    this.setState({dialog:null});
    this.toast(sel.length>1
      ? ('Referrals to '+sel.map(k=>LVL[k].label).join(' & ')+' ready to send')
      : ('Referral to '+LVL[sel[0]].label+' ready to send'));
  }
  confirmDated(){
    const d=this.state.dialog; if(!d.date) return;
    const role=ROLES[this.state.role];
    this.addStaged({cat:d.cat, level:role.level, due:d.date});
    this.setState({dialog:null});
    this.toast(CAT[d.cat].label+' set for '+this.fmt(d.date));
  }
  nextUsg(){ let d=new Date(TODAY.getTime()); do { d=new Date(d.getTime()+86400000); } while(d.getDay()!==3); return this.iso(d); }
  confirmUsg(){
    const date=(this.state.dialog||{}).date; if(!date) return;
    this.addStaged({cat:'IMAGING', level:'CHC', due:date, usg:true});
    this.setState({dialog:null});
    this.toast('Referred to CHC for ultrasound · '+this.fmt(date));
  }
  pmsmaLevel(){ const role=ROLES[this.state.role]; return role && role.level==='CHC' ? 'CHC' : 'PHC'; }
  confirmPmsma(){
    const date=this.nextPmsma();
    this.addStaged({cat:'PMSMA_VISIT', level:this.pmsmaLevel(), due:date, session:true});
    this.setState({dialog:null});
    this.toast('Added to PMSMA session · '+this.fmt(date));
  }
  toggleRefWho(k){ const d=this.state.dialog, who=(d.who||[]).slice();
    const i=who.indexOf(k); if(i>-1) who.splice(i,1); else who.push(k);
    this.setState({dialog:{...d, who}}); }
  confirmAshaRef(){
    const d=this.state.dialog, who=d.who||[]; if(!who.length||!d.lvl) return;
    ['PW','NB'].filter(k=>who.indexOf(k)>-1).forEach(k=>this.addStaged({cat:'REFERRAL', level:d.lvl, sent:TODAY_ISO, who:k}));
    this.setState({dialog:null});
    this.toast(who.length>1 ? ('Mother and newborn referred to '+LVL[d.lvl].label) : ((who[0]==='PW'?'Mother':'Newborn')+' referred to '+LVL[d.lvl].label));
  }
  // PNC & newborn eligibility: 42 days from date of delivery (set when the delivery date is recorded)
  pncEnd(w){ if(!w||!w.dod) return null; return this.iso(new Date(new Date(w.dod+'T00:00:00').getTime()+42*86400000)); }
  pncOpen(w){ const e=this.pncEnd(w); return !e || this.diff(e)<=0; }
  hbncDays(w){ return (w && w.delPlace==='Home') ? [1,3,7,14,21,28,42] : [3,7,14,21,28,42]; }
  hbncPlan(w){ if(!w||!w.dod) return [];
    const b=new Date(w.dod+'T00:00:00');
    const has=new Set((w.steps||[]).filter(s=>s.cat==='HBNC').map(s=>s.hday)
      .concat((((this.state.cap||{}).steps)||[]).filter(s=>s.cat==='HBNC').map(s=>s.hday)));
    return this.hbncDays(w).map(d=>{ const iso=this.iso(new Date(b.getTime()+d*86400000));
      return {day:d, date:iso, past:this.diff(iso)>0, done:has.has(d)}; }); }
  hbncDefault(w){ return this.hbncPlan(w).filter(p=>!p.done&&!p.past).map(p=>p.day); }
  toggleHbnc(day){ const d=this.state.dialog, sel=(d.sel||[]).slice();
    const i=sel.indexOf(day); if(i>-1) sel.splice(i,1); else sel.push(day);
    this.setState({dialog:{...d, sel}}); }
  confirmHbnc(){
    const d=this.state.dialog, sel=d.sel||[]; if(!sel.length) return;
    const w=this.byId(this.state.cap?this.state.cap.womanId:null), role=ROLES[this.state.role];
    this.hbncPlan(w).filter(p=>sel.indexOf(p.day)>-1)
      .forEach(p=>this.addStaged({cat:'HBNC', level:role.level, due:p.date, hday:p.day, hbnc:true}));
    this.setState({dialog:null});
    this.toast(sel.length+' HBNC visit'+(sel.length>1?'s':'')+' added');
  }
  saveCapture(){
    const c=this.state.cap; if(!c.steps.length) return;
    const role=this.state.role;
    const fresh=c.steps.map(s=>({id:uid(), cat:s.cat, level:s.level, due:s.due||null, sent:s.sent||null, status:'OPEN', rem:null, owner:role, session:!!s.session, usg:!!s.usg, hbnc:!!s.hbnc, hday:s.hday||null, who:s.who||null}));
    const ws=this.state.women.map(w=> w.id!==c.womanId ? w : {...w, steps:[...w.steps, ...fresh]});
    this.setState({women:ws, screen:'journey', cap:null});
    this.toast(fresh.length+' step'+(fresh.length>1?'s':'')+' saved · reminders scheduled');
    try {
      fetch(getSyncEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steps: fresh.map(f => ({ ...f, patient_id: c.womanId })),
          actorId: role,
          actorName: ROLES[role]?.name || role
        })
      }).catch(e => console.log('Sync offline:', e));
    } catch(e) {}
  }

  chip(active, tone){ return active ? {bg:tone||'#1E14BE', fg:'#fff', bd:tone||'#1E14BE'} : {bg:'#fff', fg:'#2A2826', bd:'#DEDDD8'}; }

  stepVM(s, w){
    const role = ROLES[this.state.role] || {};
    const cm=CAT[s.cat], lm=LVL[s.level];
    const open=s.status==='OPEN';
    const isRef=s.cat==='REFERRAL';
    let title=this.catLabel(s.cat, s.level), dueColor='#70706E', dueLabel='';
    if(isRef) title='Referral to '+lm.label;
    if(isRef && s.who) title='Referral · '+(s.who==='PW'?'PN woman':'Newborn')+' → '+lm.label;
    if(s.session) title='PMSMA session · '+lm.facility;
    if(s.hbnc) title='HBNC visit · Day '+s.hday;
    if(!open){
      dueLabel='Completed '+this.fmt(s.cdate);
      dueColor='#1B6B47';
    } else if(isRef){
      const isTarget = s.level === role.level && s.owner !== this.state.role;
      const d = this.diff(s.sent);
      if(isTarget){
        const fromRole = s.owner ? (ROLES[s.owner]?.short || this.facShort(ROLES[s.owner]?.level) || 'frontline') : 'frontline';
        dueLabel = 'Referred from ' + fromRole + (d>0 ? (' · ' + d + 'd ago') : ' · today');
        dueColor = '#1E14BE';
      } else {
        dueLabel = d>=7 ? ('Awaiting '+lm.label+' · '+d+' days') : ('Sent '+this.fmt(s.sent)+' · awaiting '+lm.label);
        dueColor = d>=7 ? '#994242' : '#6165DE';
      }
    } else if(!s.due){
      const d=this.diff(s.sent||TODAY_ISO);
      dueLabel = d>=7 ? ('Not done yet · '+d+' days at '+lm.label) : ('Added '+this.fmt(s.sent||TODAY_ISO)+' · at '+lm.label);
      dueColor = d>=7 ? '#994242' : '#6165DE';
    } else {
      const d=this.diff(s.due);
      if(d>0){ dueColor='#994242'; dueLabel=d+' day'+(d>1?'s':'')+' overdue'; }
      else if(d===0){ dueColor='#C35721'; dueLabel='Due today'; }
      else { dueColor='#2E9E6B'; dueLabel='Due '+this.fmt(s.due); }
      if(s.rem==='failed') dueLabel+=' · unreachable';
    }
    const cl = s.clevel || null;
    const downgraded = !open && !!cl && LADDER.indexOf(cl) < LADDER.indexOf(s.level);
    return {icon:cm.icon, title, catLabel:this.catLabel(s.cat, s.level), lc:lm.c, lsoft:lm.s, levelLabel:lm.label, open, dueColor, dueLabel,
      downgraded, downNote:downgraded?('Closed at '+this.facShort(cl)+' in place of '+this.facShort(s.level)):''};
  }

  hasScope(){ return ['anm','phc_sn','chc_sn','phc_mo','chc_mo','dh_mo'].indexOf(this.state.role)>-1; }
  scope(){ return this.hasScope() ? (this.state.scopeFilter||'FACILITY') : 'FACILITY'; }
  inCatchment(w){
    const role=ROLES[this.state.role];
    if(role.level==='SUBCENTRE') return w.sc===role.facility;
    return true; // one PHC / CHC block in this deployment — every registered woman resides in it
  }
  worklistVM(){
    const role=ROLES[this.state.role]; const f=this.state.filter;
    const rf=this.state.riskFilter||'ALL';
    const isAsha=this.state.role==='asha';
    const sc=this.scope();
    const hiOnly=['dh_sn','tert_sn','dh_mo'].indexOf(this.state.role)>-1;
    const mine=this.allSteps().filter(({s,w})=> (sc==='CATCHMENT'
        ? this.inCatchment(w)
        : hiOnly
          ? s.level===role.level
          : isAsha
            ? true
            : (s.level===role.level || s.owner===this.state.role)) && (f==='ALL'||s.cat===f)
      && (rf==='ALL' || (this.svc()==='PNC'
            ? (rf==='MOTHER' ? w.risk==='HRP' : rf==='NEWBORN' ? !!w.nbRisk : true)
            : this.svc()==='NCD'
              ? (rf==='DM' ? /diabet/i.test(w.cond||'') : rf==='HTN' ? /hyperten/i.test(w.cond||'') : true)
              : (rf==='HRP' ? w.risk==='HRP' : w.risk!=='HRP'))));
    const b={overdue:[],today:[],incoming:[],outbound:[],pending:[],soon:[],unreach:[],closed:[]};
    mine.forEach(({s,w})=>{
      if(s.status==='DONE'){ if(s.cdate===TODAY_ISO) b.closed.push({s,w}); return; }
      if(s.cat==='REFERRAL'){
        const isIncoming = (s.level===role.level && s.owner!==this.state.role);
        if(isIncoming) b.incoming.push({s,w});
        else b.outbound.push({s,w});
        return;
      }
      if(!s.due){ b.pending.push({s,w}); return; }
      const d=this.diff(s.due);
      if(s.rem==='failed'){ b.unreach.push({s,w}); return; }
      if(d>0) b.overdue.push({s,w});
      else if(d===0) b.today.push({s,w});
      else if(d>=-7) b.soon.push({s,w});
    });
    const row=({s,w})=>{ const vm=this.stepVM(s,w); return {icon:vm.icon, lc:vm.lc, lsoft:vm.lsoft,
      womanName:w.name, stepLine:vm.title+' · '+w.village+(this.scope()==='CATCHMENT'?(' · '+LVL[s.level].short):''), dueColor:vm.dueColor, dueLabel:vm.dueLabel,
      gestLabel:this.metaA(w)+' · '+this.flagShort(w),
      gestFg:this.isHigh(w)?'var(--ml-burnt-orange)':'#1B6B47', gestBg:this.isHigh(w)?'var(--ml-peach)':'#D9F7E8',
      downgraded:vm.downgraded, downNote:vm.downNote,
      onOpen:()=>this.openWoman(w.id)}; };
    const defs=[
      {key:'overdue', title:'Overdue', dot:'#994242', pillBg:'#F7E3E3'},
      {key:'today', title:'Due today', dot:'#C35721', pillBg:'#FBE7DC'},
      {key:'incoming', title:'Incoming referrals to act on', dot:'#1E14BE', pillBg:'#EFEDFF'},
      {key:'outbound', title:'Referrals sent · awaiting confirmation', dot:'#6165DE', pillBg:'#E7E7FB'},
      {key:'pending', title:this.scope()==='CATCHMENT'?'No date needed':'To be done here', dot:'#2E9E6B', pillBg:'#D9F7E8'},
      {key:'unreach', title:'Unreachable', dot:'#909090', pillBg:'#ECEBE7'},
      {key:'soon', title:'Due soon · 7 days', dot:'#6165DE', pillBg:'#E7E7FB'},
      {key:'closed', title:'Closed today', dot:'#2E9E6B', pillBg:'#D9F7E8'},
    ];
    return defs.filter(x=>b[x.key].length).map(x=>({title:x.title, dot:x.dot, pillBg:x.pillBg, count:b[x.key].length+'', rows:b[x.key].map(row)}));
  }

  alertsVM(){
    const role=ROLES[this.state.role];
    const out=[];
    const isCatchment = this.scope() === 'CATCHMENT';
    this.allSteps().forEach(({s,w})=>{
      if(s.status!=='OPEN') return;
      const mine = isCatchment ? this.inCatchment(w) : (s.level===role.level || s.owner===this.state.role);
      if(!mine) return;
      if(s.cat==='REFERRAL'){ const d=this.diff(s.sent); if(d>=7) out.push({s,w,type:'REFERRAL_STALE',d}); return; }
      if(!s.due){ const d=this.diff(s.sent||TODAY_ISO); if(d>=7) out.push({s,w,type:'NOT_DONE',d}); return; }
      const d=this.diff(s.due);
      if(s.rem==='failed'){ out.push({s,w,type:'UNREACHABLE',d}); return; }
      if(d>=3) out.push({s,w,type:'STEP_OVERDUE',d});
    });
    return out.map(({s,w,type,d})=>{
      const vm=this.stepVM(s,w);
      const LBL={REFERRAL_STALE:'Referral not acted on', UNREACHABLE:'Cannot reach her', STEP_OVERDUE:'Step overdue', NOT_DONE:'Still not done'};
      const TONE={REFERRAL_STALE:'#1E14BE', UNREACHABLE:'#909090', STEP_OVERDUE:'#994242', NOT_DONE:'#C35721'};
      const msg = type==='REFERRAL_STALE' ? ('Referral to '+vm.levelLabel+' sent '+d+' days ago — still no visit recorded. '+this.metaA(w)+'.')
        : type==='NOT_DONE' ? (vm.catLabel+' added '+d+' days ago at '+vm.levelLabel+' — still not recorded as done.')
        : type==='UNREACHABLE' ? (vm.catLabel+' due '+this.fmt(s.due)+' · '+(s.unreach||3)+' failed reminder attempts. Try a home visit.')
        : (vm.catLabel+' at '+vm.levelLabel+' is '+d+' days overdue · '+w.risk+'.');
      return {womanName:w.name, village:w.village, tone:TONE[type], typeLabel:LBL[type], message:msg,
        acked:!!(this.state.acked||{})[s.id],
        onOpen:()=>this.openWoman(w.id), onCall:()=>this.toast('Dialling '+w.name+'…'),
        onAck:()=>{ const a={...(this.state.acked||{})}; a[s.id]=true; this.setState({acked:a}); this.toast('Marked — working on it'); }};
    });
  }

  // ---------- micro-coach ----------
  mcRole(){ return (ROLES[this.state.role]||{}).mcRole || 'asha'; }
  mcAccent(){ return (ROLES[this.state.role]||{}).accent || '#655AD0'; }
  mcDone(){ if(this.state.mcDone) return this.state.mcDone;
    return this.mcRole()==='asha'
      ? {t1:{s:3,t:3}, t2:{s:2,t:2}, m1:{s:1,t:1}, m2:{s:1,t:1}, m3:{s:1,t:1}}
      : {t1:{s:3,t:3}, m1:{s:1,t:1}}; }
  mcPct(m){ const d=this.mcDone()[m.id]; if(d) return 100; return ({m2:40, t3:0})[m.id]||0; }
  // m4 is a fresh refresher card set — starts at 0
  mcOpen(id){ this.setState({screen:'mc_mod', mc:{id, phase:'intro', i:0, ans:[], sel:null}, dialog:null}); }
  mcMod(){ const mc=this.state.mc; return mc ? MC_MODULES.find(m=>m.id===mc.id) : null; }
  mcSetMc(p){ this.setState({mc:{...(this.state.mc||{}), ...p}}); }
  mcStart(){ const m=this.mcMod(); this.mcSetMc({phase:(m.cards.length?'card':'quiz'), i:0, ans:[], sel:null}); }
  mcNextCard(){ const m=this.mcMod(), mc=this.state.mc;
    if(mc.i+1 < m.cards.length) this.mcSetMc({i:mc.i+1});
    else this.mcSetMc({phase:'quiz', i:0, sel:null}); }
  mcAnswer(k){ const mc=this.state.mc; if(mc.sel!==null && mc.sel!==undefined) return; this.mcSetMc({sel:k}); }
  mcNextQ(){ const m=this.mcMod(), mc=this.state.mc;
    const ans=[...(mc.ans||[]), mc.sel];
    if(mc.i+1 < m.quiz.length) this.mcSetMc({i:mc.i+1, sel:null, ans});
    else { const score=ans.filter((a,i)=>a===m.quiz[i].correct).length;
      this.setState({mc:{...mc, phase:'done', ans, sel:null},
        mcDone:{...this.mcDone(), [m.id]:{s:score, t:m.quiz.length}}}); } }
  mcFinish(){ const m=this.mcMod(); const t=m.track==='coach'?'coach':'training'; this.setState({screen:t, tab:t, mc:null}); }
  mcCard(m){ const ac=this.mcAccent(), pct=this.mcPct(m), d=this.mcDone()[m.id], bare=m.track==='coach';
    return {title:m.title, hi:m.hi, cat:m.cat, kind:m.kind, mins:m.mins+' min',
      meta:(m.cards.length? m.cards.length+(m.cards.length>1?' cards · ':' card · '):'')+m.quiz.length+(m.quiz.length>1?' questions':' question'),
      why:(m.why||{})[this.mcRole()]||'', hasWhy:!!(m.why&&m.why[this.mcRole()]),
      pushed:m.pushed||'', hasPushed:!!m.pushed,
      crit:m.crit, critLabel:m.crit?'Critical':'', pct:pct, pctLabel:'',
      dot: pct===100?'#2E9E6B':pct>0?'#C35721':'#B23B3B',
      dotLabel: pct===100?'Completed':pct>0?'Started':'Not started',
      barW:pct+'%', barBg:pct===100?'#2E9E6B':ac, ac,
      statusLabel: pct===100 ? (bare?'Done':('Passed '+(d?d.s+'/'+d.t:''))) : pct>0 ? 'Continue' : 'Start',
      isDone:pct===100, sf: pct===100?'#D9F7E8':'var(--surface-page)',
      onTap:()=>this.mcOpen(m.id)}; }
  mcVoice(){ return this.state.mcVoice || {phase:'idle', qi:0, lang:'hi', playing:false}; }
  mcVoiceSet(p){ this.setState({mcVoice:{...this.mcVoice(), ...p}}); }
  mcListen(){
    const v=this.mcVoice();
    if(v.phase==='listening'){ this.mcVoiceSet({phase:'idle'}); return; }
    const qi = v.phase==='answer' ? (v.qi+1)%MC_ASK.length : v.qi;
    this.mcVoiceSet({phase:'listening', qi, playing:false});
    clearTimeout(this._mcT1); clearTimeout(this._mcT2);
    this._mcT1=setTimeout(()=>{ this.mcVoiceSet({phase:'thinking'});
      this._mcT2=setTimeout(()=>this.mcVoiceSet({phase:'answer', playing:true}), 900); }, 2000);
  }
  mcVoiceVM(){
    const v=this.mcVoice(), hi=v.lang==='hi', a=MC_ASK[v.qi];
    const ON={bg:'var(--ml-blue)', fg:'#fff', bd:'var(--ml-blue)'};
    const OFF={bg:'var(--surface-card)', fg:'var(--text-body)', bd:'var(--border-default)'};
    return {
      isIdle:v.phase==='idle', isListening:v.phase==='listening', isThinking:v.phase==='thinking', isAnswer:v.phase==='answer',
      langs:[{k:'hi',label:'हिन्दी'},{k:'en',label:'English'}].map(l=>({label:l.label, ...(v.lang===l.k?ON:OFF),
        onTap:()=>this.mcVoiceSet({lang:l.k, playing:false})})),
      title: hi ? 'बोलकर पूछें' : 'Ask by voice',
      idleLine: hi ? 'माइक दबाकर अपना सवाल बोलें — जवाब भी सुनाई देगा।' : 'Tap the mic and speak your question — the answer is read out to you.',
      listenLine: hi ? 'सुन रहा हूँ… बोलते रहें' : 'Listening… keep speaking',
      thinkLine: hi ? 'मॉड्यूल में जवाब खोज रहा हूँ…' : 'Finding the answer in the modules…',
      micLabel: v.phase==='listening' ? (hi?'रोकें':'Stop') : v.phase==='answer' ? (hi?'नया सवाल पूछें':'Ask another question') : (hi?'बोलकर पूछें':'Tap to speak'),
      micBg: v.phase==='listening' ? '#994242' : 'var(--ml-blue)',
      onMic:()=>this.mcListen(),
      heardLabel: hi ? 'आपने पूछा' : 'You asked',
      heard: hi ? a.hiQ : a.q,
      answerLabel: hi ? 'कोच का जवाब' : 'Coach says',
      lines: hi ? a.hiA : a.a,
      srcNote:a.srcNote, url:a.src.url,
      playing:v.playing,
      playLabel: v.playing ? (hi?'सुनाया जा रहा है — रोकें':'Playing — tap to stop') : (hi?'जवाब सुनें':'Play the answer'),
      onPlay:()=>this.mcVoiceSet({playing:!v.playing}),
      bars:[0,1,2,3,4,5,6,7,8].map(i=>({delay:(i*0.09)+'s', h:(14+((i*37)%26))+'px'})),
    };
  }
  mcTier(pct){ return pct>=80?'gold':pct>=50?'silver':pct>=1?'bronze':'none'; }
  mcBadge(pct){ const t=this.mcTier(pct);
    const M={gold:{label:'Gold badge', bg:'#F4C64A', fg:'#6B4A05', next:'Keep it above 80% to hold your gold'},
      silver:{label:'Silver badge', bg:'#D8DBE2', fg:'#4A5058', next:'Reach 80% for the gold badge'},
      bronze:{label:'Bronze badge', bg:'#E0A87A', fg:'#5E3413', next:'Reach 50% for the silver badge'},
      none:{label:'No badge yet', bg:'rgba(255,255,255,.18)', fg:'#C6C2F2', next:'Finish one module to earn bronze'}};
    return M[t]; }
  mcShelf(pct){ const t=this.mcTier(pct), rank={none:0,bronze:1,silver:2,gold:3}[t];
    return [{name:'Bronze', need:1, bg:'#E0A87A', fg:'#5E3413'},
      {name:'Silver', need:50, bg:'#D8DBE2', fg:'#4A5058'},
      {name:'Gold', need:80, bg:'#F4C64A', fg:'#6B4A05'}]
      .map((b,i)=>{ const on=rank>=i+1;
        return {name:b.name, bg:on?b.bg:'var(--surface-page)', fg:on?b.fg:'#B9B7B1',
          bd:on?b.bg:'var(--border-subtle)', tone:on?'var(--text-strong)':'var(--text-muted)',
          sub:on?'Earned':b.need+'%+'}; }); }
  mcRank(myPct){
    const asha = this.mcRole()==='asha';
    const peers = asha
      ? [{name:'Kamla, Barhi', pct:57},{name:'Sunita, Sohagi', pct:50},{name:'Rekha, Deora', pct:38},{name:'Anita, Pipri', pct:25}]
      : [{name:'ANM Shalini, Barhi', pct:88},{name:'ANM Kiran, Sohagi', pct:63},{name:'ANM Pushpa, Deora', pct:50},{name:'ANM Usha, Pipri', pct:38}];
    const meName = asha ? 'You — Samta' : 'You — ANM Meera';
    const rows=[...peers, {name:meName, pct:myPct, me:true}].sort((a,b)=>b.pct-a.pct);
    const size = asha ? 30 : 6;
    const mePos = rows.findIndex(r=>r.me)+1;
    const MED=[{bg:'#F4C64A', fg:'#6B4A05'},{bg:'#D8DBE2', fg:'#4A5058'},{bg:'#E0A87A', fg:'#5E3413'}];
    return {
      peerLine: asha ? 'Among 30 ASHAs · PHC Sirmour' : 'Among 6 ANMs · PHC Sirmour',
      top: rows.slice(0,3).map((r,i)=>({pos:(i+1)+'', name:r.name, pct:r.pct+'%',
        medalBg:MED[i].bg, medalFg:MED[i].fg,
        rowBg: r.me?'var(--surface-brand-soft)':'var(--surface-card)',
        rowBd: r.me?'var(--ml-blue-30)':'var(--border-subtle)'})),
      isTop: mePos===1,
      congrats: asha ? 'Shabash Samta! You are number 1 among the 30 ASHAs at PHC Sirmour.'
                     : 'Shabash! You are number 1 among the 6 ANMs at PHC Sirmour.',
      showMe: mePos>3, mePos:mePos+'', meRank:'Rank '+mePos+' of '+size, meName, mePct:myPct+'%'};
  }
  mcVM(){
    const st=this.state, ac=this.mcAccent(), role=ROLES[st.role], mr=this.mcRole();
    const coach=MC_MODULES.filter(m=>m.track==='coach'), train=MC_MODULES.filter(m=>m.track==='training');
    const all=[...coach,...train], doneN=all.filter(m=>this.mcPct(m)===100).length;
    const vm={ac,
      hello: mr==='asha' ? 'Namaste Samta' : 'Namaste ANM Meera',
      sub: role.facility,
      doneN:doneN+'', totalN:all.length+'', barW:Math.round(doneN/all.length*100)+'%',
      streak: mr==='asha' ? 'active 4 weeks running · 6 min this week' : 'active 3 weeks running · 9 min this week',
      coachIntro:'Short cards you can read in two minutes, then one check to confirm.',
      trainIntro:'Pushed to every ASHA and ANM by the state training cell.',
      coachMods:coach.map(m=>this.mcCard(m)), trainMods:train.map(m=>this.mcCard(m)),
      trends:(mr==='asha'
        ? [{label:'HRP visits on time', v:'62%', tone:'#C35721'},{label:'Referrals closed', v:'8 of 11', tone:'#2E9E6B'},{label:'PMSMA attended', v:'5 of 9', tone:'#C35721'}]
        : [{label:'HRP visits on time', v:'71%', tone:'#2E9E6B'},{label:'PMSMA attendance', v:'61%', tone:'#C35721'},{label:'NB referrals closed', v:'4 of 7', tone:'#C35721'}]),
      lib:MC_LIB.map(l=>({...l, coverImg: React.createElement('img', {src:l.cover, alt:l.title+' cover',
        style:{display:'block', width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center'}})})),
      ask:MC_ASK.map((a,i)=>({q:a.q, lines:a.a, srcNote:a.srcNote, url:a.src.url,
        open:st.mcAsk===i, onTap:()=>this.setState({mcAsk: st.mcAsk===i?null:i})})),
      voice:this.mcVoiceVM(),
      askHint:'Answers come only from the national modules in My library — nothing else.',
      onAskTab:()=>this.setState({screen:'ask', tab:'ask'}),
    };
    // ---- dashboard ----
    const cDone=coach.filter(x=>this.mcPct(x)===100).length, tDone=train.filter(x=>this.mcPct(x)===100).length;
    const D = mr==='asha'
      ? {days:[{d:'M',k:'mod'},{d:'T',k:'none'},{d:'W',k:'chat'},{d:'T',k:'mod'},{d:'F',k:'chat'},{d:'S',k:'chat'},{d:'S',k:'chat'}],
         streak:5, chat:[2,0,3,1,4,2,1], chatPrev:6, avgCoach:'2 min 40 s', avgTrain:'6 min 10 s',
         medCoach:'Target 3 min', medTrain:'Target 5 min', points:180, level:'Level 2 · Consistent'}
      : {days:[{d:'M',k:'chat'},{d:'T',k:'mod'},{d:'W',k:'chat'},{d:'T',k:'none'},{d:'F',k:'none'},{d:'S',k:'mod'},{d:'S',k:'chat'}],
         streak:2, chat:[1,3,2,0,0,2,1], chatPrev:11, avgCoach:'3 min 05 s', avgTrain:'7 min 25 s',
         medCoach:'Target 3 min', medTrain:'Target 5 min', points:145, level:'Level 2 · Steady'};
    const engaged=D.days.filter(x=>x.k!=='none').length;
    const chatN=D.chat.reduce((a,b)=>a+b,0), chatMax=Math.max(...D.chat,1);
    const compPct=Math.round(doneN/all.length*100);
    const KIND={chat:{ic:'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z', bg:'var(--ml-mark-seafoam)'},
      mod:{ic:'M5 13l4 4 10-10', bg:'var(--ml-mark-seafoam)'}, none:{ic:'', bg:'rgba(255,255,255,.18)'}};
    const pend=all.filter(x=>this.mcPct(x)<100).map(x=>{ const c=this.mcCard(x);
      return {...c, trackLabel: x.track==='coach'?'Refresher':'Training',
        note: x.track==='coach' ? ((x.why||{})[mr]||'') : (x.pushed||'')}; });
    vm.db={
      engaged:engaged+'', engagedOf:'of 7 days', streak:D.streak+' days in a row',
      dayDots:D.days.map(x=>({d:x.d, on:x.k!=='none', ic:KIND[x.k].ic, bg:KIND[x.k].bg})),
      compPct:compPct+'%', compBar:compPct+'%',
      points:D.points+'', level:D.level,
      badge:this.mcBadge(compPct), shelf:this.mcShelf(compPct), rank:this.mcRank(compPct),
      cards:[
        {label:'Refresher modules', v:cDone+' of '+coach.length, sub:'Completed against expected this month',
          pct:Math.round(cDone/coach.length*100)+'%', ac:ac, tone: cDone===coach.length?'#2E9E6B':'#C35721'},
        {label:'Training modules', v:tDone+' of '+train.length, sub:'Pushed by the state training cell',
          pct:Math.round(tDone/train.length*100)+'%', ac:'#1E14BE', tone: tDone===train.length?'#2E9E6B':'#C35721'},
      ],
      durs:[
        {label:'Average time · refresher module', v:D.avgCoach, sub:D.medCoach},
        {label:'Average time · training module', v:D.avgTrain, sub:D.medTrain},
      ],
      chatTotal:chatN+'', chatLabel:'questions asked last week',
      chatBars:D.chat.map((n,i)=>({h:Math.max(6,Math.round(n/chatMax*54))+'px', n:n+'', d:['M','T','W','T','F','S','S'][i],
        bg: n? 'var(--ml-blue)' : 'var(--border-default)'})),
      pend, hasPend:pend.length>0, pendLine:pend.length+' module'+(pend.length>1?'s':'')+' still open',
    };
    const m=this.mcMod();
    if(m){
      const mc=st.mc, pct=this.mcPct(m);
      const curric=[...m.cards.map((c,i)=>({n:(i+1<10?'0':'')+(i+1), label:c.h, meta:'1 min', quiz:false})),
        {n:(m.cards.length+1<10?'0':'')+(m.cards.length+1), label:'Knowledge check', meta:m.quiz.length+(m.quiz.length>1?' questions':' question'), quiz:true}];
      vm.mod={title:m.title, hi:m.hi, cat:m.cat, kind:m.kind, ac,
        mins:m.mins+' min', nCards:m.cards.length+'', nQ:m.quiz.length+'', hasCards:m.cards.length>0,
        srcLabel:m.src.label, srcUrl:m.src.url, curric,
        why:(m.why||{})[mr]||'', hasWhy:!!(m.why&&m.why[mr]),
        startLabel: pct===100 ? 'Take it again' : pct>0 ? 'Continue' : 'Start',
        onStart:()=>this.mcStart(),
        isIntro:mc.phase==='intro', isCard:mc.phase==='card', isQuiz:mc.phase==='quiz', isDone:mc.phase==='done'};
      if(mc.phase==='card'){ const c=m.cards[mc.i];
        vm.mod.card={h:c.h, bullets:c.b, step:'Card '+(mc.i+1)+' of '+m.cards.length,
          barW:Math.round((mc.i+1)/m.cards.length*100)+'%',
          nextLabel: mc.i+1<m.cards.length ? 'Next' : 'Take the quiz', onNext:()=>this.mcNextCard()}; }
      if(mc.phase==='quiz'){ const q=m.quiz[mc.i], sel=mc.sel;
        const answered = sel!==null && sel!==undefined;
        vm.mod.quiz={q:q.q, step:'Question '+(mc.i+1)+' of '+m.quiz.length,
          barW:Math.round((mc.i+1)/m.quiz.length*100)+'%',
          answered, correct:answered&&sel===q.correct, wrong:answered&&sel!==q.correct,
          keyLine:q.key, feedbackTitle: sel===q.correct?'Correct':'Not quite',
          feedBg: sel===q.correct?'#D9F7E8':'#F7E3E3', feedFg: sel===q.correct?'#1B6B47':'#994242',
          nextLabel: mc.i+1<m.quiz.length ? 'Next question' : 'See result', onNext:()=>this.mcNextQ(),
          opts:q.opts.map((o,i)=>{ const isC=i===q.correct, on=sel===i;
            let bg='var(--surface-card)', fg='var(--text-strong)', bd='var(--border-default)';
            if(answered && isC){ bg='#D9F7E8'; fg='#1B6B47'; bd='#8FD3B2'; }
            else if(answered && on){ bg='#F7E3E3'; fg='#994242'; bd='#DFA6A6'; }
            else if(answered){ bg='var(--surface-card)'; fg='var(--text-muted)'; bd='var(--border-subtle)'; }
            return {label:o, bg, fg, bd, mark: answered&&isC?'✓':(answered&&on?'✕':''),
              onTap:()=>this.mcAnswer(i)}; })}; }
      if(mc.phase==='done'){ const d=this.mcDone()[m.id]||{s:0,t:m.quiz.length};
        const pass=d.s===d.t;
        vm.mod.result={score:d.s+' of '+d.t, pass, pct:Math.round(d.s/d.t*100)+'%',
          title: pass?'Well done':'Close — read the key learnings',
          ac: pass?'#2E9E6B':'#C35721', sf: pass?'#D9F7E8':'#FBE7DC',
          keys:m.quiz.map((q,i)=>({q:q.q, key:q.key, right:q.opts[q.correct], ok:(mc.ans||[])[i]===q.correct})),
          onDone:()=>this.mcFinish(), onRetry:()=>this.mcStart(),
          srcLabel:m.src.label, srcUrl:m.src.url}; }
    }
    return vm;
  }

  goHome(){ this.setState({screen:'launcher', role:null, folder:null, sub:null, dialog:null, cap:null, selId:null, query:''}); }
  jumpFolder(fk, sk){ this.setState({screen:'launcher', role:null, folder:fk, sub:sk||null, dialog:null, cap:null, selId:null, query:''}); }
  quickNavVM(){
    const st=this.state, keys=['ANC','PNC','NCD','CANCER'];
    const insMode = st.screen==='insights' || st.folder==='insights';
    const subs = FOLDERS.capture.subs;
    return keys.map(k=>{
      const M=SVC[k], on = (st.svc||'ANC')===k;
      const label = subs[k]?.name || M.label, accent = subs[k]?.accent || M.ac;
      return {label, ac:accent, on,
        onTap: insMode
          ? ()=>this.setState({svc:k, selId:null, dialog:null, cap:null, filter:'ALL', riskFilter:'ALL', insOpen:null, insLowerOpen:false})
          : ()=>this.setState({svc:k, selId:null, dialog:null, cap:null, filter:'ALL', riskFilter:'ALL'}),
        bg:on?accent:'var(--surface-card)', fg:on?'#fff':'var(--text-body)', bd:on?accent:'var(--border-default)'};
    });
  }

  renderVals(){
    const st=this.state;
    const isLauncher = st.screen==='launcher' || !st.role;
    const base={ isLauncher, isApp:!isLauncher, statusInk: isLauncher?'#fff':'#010101', toast:st.toast,
      onDismiss:()=>this.setState({dialog:null}), stop:(e)=>{ if(e&&e.stopPropagation)e.stopPropagation(); },
      onHome:()=>this.goHome(), quickNav:this.quickNavVM() };

    if(isLauncher){
      const fk=st.folder, sk=st.sub, F=fk?FOLDERS[fk]:null;
      const node = F && F.subs ? (sk?F.subs[sk]:null) : F;
      base.showFolders=!fk;
      base.showSubs=!!(F && F.subs && !sk);
      base.showUsers=!!node;
      const newN = MC_MODULES.filter(m=>this.mcPct(m)===0).length;
      base.folders=Object.keys(FOLDERS).map(k=>({name:FOLDERS[k].name, hi:FOLDERS[k].hi, sub:FOLDERS[k].sub,
        accent:FOLDERS[k].accent, icon:FOLDERS[k].icon,
        hasNew: k==='coach' && newN>0, newN:newN+'',
        newLabel: newN+' new '+(newN>1?'modules':'module'),
        onPick:()=>this.setState({folder:k, sub:null})}));
      base.subFolders = (F && F.subs && !sk) ? Object.keys(F.subs).map(k=>({name:F.subs[k].name, hi:F.subs[k].hi,
        sub:F.subs[k].sub, accent:F.subs[k].accent, icon:F.subs[k].icon, onPick:()=>this.setState({sub:k})})) : [];
      base.backLabel = sk ? FOLDERS[fk].name : 'All folders';
      base.onFolderBack=()=>this.setState(sk?{sub:null}:{folder:null});
      base.folderTitle = node?node.title:(F?F.title:'');
      base.folderSub = node?node.tagline:(F?F.tagline:'');
      base.roleCards = node ? node.users.map(u=>({
        name:u.label||ROLES[u.k].name, facility:u.facility||ROLES[u.k].sub||ROLES[u.k].facility,
        accent:ROLES[u.k].accent, icon:ROLES[u.k].icon, onPick:()=>this.pickUser(u)})) : [];
      return base;
    }

    const role=ROLES[st.role]; const scr=st.screen;
    base.roleAccent=role.accent; base.roleInitials=role.short;
    base.onSwitchRole=()=>this.switchRole();
    base.showBack = scr==='journey'||scr==='capture'||scr==='register'||scr==='profile';
    base.isProfile = scr==='profile';
    if(scr==='profile') base.profile=this.profileVM();
    base.isRegister = scr==='register';
    base.onBack=()=>{ if(scr==='profile') this.setState({screen:'journey', dialog:null}); else this.back(); };
    base.isLookup=scr==='lookup'; base.isWorklist=scr==='worklist'; base.isAlerts=scr==='alerts';
    base.isJourney=scr==='journey'; base.isCapture=scr==='capture'; base.isInsights=scr==='insights';
    base.isHome=scr==='home';
    base.isCoach=scr==='coach'; base.isTraining=scr==='training'; base.isLibrary=scr==='library';
    base.isAsk=scr==='ask'; base.isMcMod=scr==='mc_mod'; base.isMcDash=scr==='mcdash';
    base.showQuickNav=!role.coach;
    if(role.coach){
      base.mc=this.mcVM();
      base.showTabs=['mcdash','coach','training','library','ask'].includes(scr);
      base.showBack=scr==='mc_mod';
      base.onBack=()=>{ const m=this.mcMod(); const t=(m&&m.track==='coach')?'coach':'training'; this.setState({screen:t, tab:t, mc:null}); };
      const mt={mcdash:['My progress', role.name+' · '+role.facility],
        coach:['Refresher','Picked from your data · '+role.facility], training:['Training','State modules · '+role.name],
        library:['My library','National modules and handbooks'], ask:['Ask the coach','Answers from the national modules'],
        mc_mod:[(this.mcMod()||{}).title||'Module', (this.mcMod()||{}).cat||'']};
      base.headerTitle=(mt[scr]||['Refresher',''])[0]; base.headerSub=(mt[scr]||['',''])[1];
      base.canAddSteps=false; base.closeOnly=false;
      base.tabs=role.tabs.map(k=>({label:TABMETA[k].label, icon:TABMETA[k].icon,
        color: st.tab===k?role.accent:'#909090', badge:'', onTap:()=>this.setState({screen:k, tab:k, mc:null, dialog:null})}));
      return base;
    }
    base.showTabs=['home','lookup','worklist','alerts','insights'].includes(scr);
    if(scr==='home') base.home=this.homeVM();
    if(scr==='insights') base.ins=this.insightsVM();

    const svcSub = this.hasSvc() ? (this.svcMeta().full+' · '+ROLES[st.role].name.split(' — ')[0]) : (role.name+' · '+role.facility);
    const titles={home:['Services', role.name+' · PHC Sirmour'], lookup:[this.svcMeta().findTitle, this.hasSvc()?this.svcMeta().full:role.facility], worklist:['Worklist', svcSub], alerts:['Alerts', svcSub], register:['Register', role.facility], insights:['Insights', role.name+' · '+role.facility]};
    if(titles[scr]){ base.headerTitle=titles[scr][0]; base.headerSub=titles[scr][1]; }
    else if(scr==='journey'){ const w=this.byId(st.selId); base.headerTitle=w?w.name:'Journey'; base.headerSub=SVC[(w&&w.svc)||this.svc()].journey; }
    else if(scr==='profile'){ const w=this.byId(st.selId); base.headerTitle='Primary health profile'; base.headerSub=w?(w.name+' · one person, three registers'):''; }
    else if(scr==='capture'){ base.headerTitle='Next steps'; base.headerSub='Coordination only — no clinical data'; }
    else if(scr==='register'){ base.headerTitle='Register'; base.headerSub=role.name+' · '+role.facility; }
    base.canAddSteps=this.optionsFor().length>0; base.closeOnly=!base.canAddSteps;

    if(scr==='register'){
      const r=st.reg||{name:'',phone:'',village:'',abha:'',status:'normal',consent:true};
      const ON={bg:'var(--ml-peppermint)', fg:'#1B6B47', bd:'#8FD3B2'};
      const OFF={bg:'var(--surface-card)', fg:'var(--text-body)', bd:'var(--border-default)'};
      const DANGER={bg:'#F7E3E3', fg:'#994242', bd:'#DFA6A6'};
      const pair=(cur,vals,set)=>vals.map(v=>({label:v.label, on:cur===v.k, ...(cur===v.k?(v.danger?DANGER:ON):OFF), onTap:()=>set(v.k)}));
      base.reg={
        title:this.svcMeta().enrol, note:this.svcMeta().regNote,
        showDate:this.svcMeta().hasDate, dateLabel:this.svcMeta().dateLabel,
        name:r.name, phone:r.phone, abha:r.abha, village:r.village,
        villages:VILLAGES.map(v=>({value:v.name, label:v.name})),
        hasVillage:!!r.village, noVillage:!r.village,
        ashaName:(VILLAGES.find(v=>v.name===r.village)||{}).asha||'',
        onName:(e)=>this.setReg({name:e.target.value}),
        onPhone:(e)=>this.setReg({phone:e.target.value}),
        onAbha:(e)=>this.setReg({abha:e.target.value}),
        onVillage:(e)=>this.setReg({village:e.target.value}),
        lmp:r.lmp||'',
        lmpNote: this.svc()==='CANCER'
          ? (r.lmp ? ('Screened on '+this.fmtLong(r.lmp)+' · follow-up is tracked from this date.') : 'If known — the date she screened positive.')
          : this.svc()==='PNC'
          ? (r.lmp ? ('Day '+Math.max(0,this.diff(r.lmp))+' postpartum today · PNC schedule starts from this date.') : 'Used to schedule the PNC and newborn visit series.')
          : (r.lmp ? ('Gestation today ≈ '+Math.max(0,Math.floor(this.diff(r.lmp)/7))+' weeks · EDD '+this.fmtLong(this.iso(new Date(new Date(r.lmp+'T00:00:00').getTime()+280*86400000)))) : 'If known — used to estimate gestation and EDD.'),
        onLmp:(e)=>this.setReg({lmp:e.target.value}),
        groups:this.regGroups(r, pair),
        saveOpacity:(r.name.trim() && r.phone.replace(/\D/g,'').length>=10 && r.village)?'1':'.45',
        onSave:()=>this.saveReg(),
      };
    }

    const alertCount=this.alertsVM().length;
    base.tabs=(role.tabs||['lookup','worklist','alerts','insights']).map(k=>({label:TABMETA[k].label, icon:TABMETA[k].icon,
      color: st.tab===k?role.accent:'#909090', badge:(k==='alerts'&&alertCount)?(alertCount+''):'', onTap:()=>this.setTab(k)}));

    if(scr==='lookup'){
      const mode=st.searchMode||'NAME';
      base.query=st.query; base.onQuery=(e)=>this.setState({query:e.target.value});
      base.searchModes=[{k:'NAME',label:'Name'},{k:'PHONE',label:'Mobile no.'},{k:'ABHA',label:'ABHA ID'}].map(m=>({
        label:m.label, ...this.chip(mode===m.k, role.accent), onTap:()=>this.setState({searchMode:m.k, query:''})}));
      base.searchPlaceholder = mode==='NAME' ? 'Type first 3 letters of the name' : mode==='PHONE' ? 'Type first 4 digits of the mobile' : 'ABHA / RCH ID';
      base.searchInputMode = mode==='NAME' ? 'text' : 'numeric';
      base.searchHint = mode==='NAME' ? 'Matches start showing after 3 letters.' : mode==='PHONE' ? 'Matches start showing after 4 digits.' : 'Enter any 4 digits of the ABHA / RCH ID, or scan the QR.';
      base.onScan=()=>this.openScan(); base.onEnrol=()=>this.openRegister();
      base.enrolLabel=this.svcMeta().enrol;
      const q=st.query||'';
      let list=this.clients(), active=false;
      if(mode==='NAME'){
        if(q.length>=3){ const t=q.toLowerCase(); active=true;
          list=list.filter(w=>w.name.toLowerCase().includes(t) || (w.hi||'').includes(q)); }
      } else if(mode==='PHONE'){
        const d=q.replace(/\D/g,'');
        if(d.length>=4){ active=true; list=list.filter(w=>w.phone.replace(/\D/g,'').includes(d)); }
      } else {
        const d=q.replace(/\D/g,'');
        if(d.length>=4){ active=true; list=list.filter(w=>this.abhaOf(w).replace(/\D/g,'').includes(d)); }
      }
      base.resultsLabel = active ? (list.length+' match'+(list.length===1?'':'es')) : 'Recently seen';
      base.results=list.map(w=>({name:w.name, nameHi:w.hi, initials:this.initials(w.name), avatarBg:this.avatarFor(w.id),
        village:w.village, riskLabel:this.riskTag(w).label, riskBg:this.riskTag(w).bg, riskFg:this.riskTag(w).fg,
        contactLine:[this.mask(w.phone), 'ABHA '+this.abhaOf(w)].filter(Boolean).join(' · '),
        hasOpen:this.openCount(w)>0, openCount:this.openCount(w)+'',
        openTone:this.hasOverdue(w)?'#994242':'#6165DE', onOpen:()=>this.openWoman(w.id)}));
    }

    if(scr==='worklist'){
      base.worklistSections=this.worklistVM();
      base.worklistEmpty=base.worklistSections.length===0;
      const ashaCats = this.svc()==='ANC' ? ['ALL','ANC_VISIT','PMSMA_VISIT','REFERRAL','FOLLOW_UP','LAB','IMAGING']
        : (this.svc()==='PNC' ? ['ALL','HBNC'].concat(SVC.PNC.options) : ['ALL'].concat(SVC[this.svc()].options));
      const fromSteps=Object.keys(CAT).filter(c=>this.allSteps().some(({s})=>s.cat===c && (s.level===role.level||s.owner===st.role||(st.role==='asha'&&s.cat==='PMSMA_VISIT'))));
      const present=['ALL'].concat(Object.keys(CAT).filter(c=>fromSteps.indexOf(c)>=0 || this.optionsFor().indexOf(c)>=0));
      const catchCats=(st.role==='anm' && this.scope()==='CATCHMENT') ? ashaCats : null;
      base.filterChips=(st.role==='asha'?ashaCats:(catchCats||present)).map(c=>({label:c==='ALL'?'All':((c==='IMAGING'&&this.svc()==='CANCER')?'Imaging':CAT[c].label), ...this.chip(st.filter===c, role.accent), onTap:()=>this.setState({filter:c})}));
      base.hasScopeChips=this.hasScope(); base.noScopeChips=!this.hasScope();
      base.hiScopeNote = ['dh_sn','tert_sn'].indexOf(st.role)>-1
        ? ('Only women with a next step created at, or pending at, '+role.facility+' — including referrals sent up from '+(st.role==='dh_sn'?'PHC and CHC':'CHC and DH')+'.') : '';
      base.showHiScopeNote = !!base.hiScopeNote;
      const sc=this.scope();
      base.scopeLabel = role.level==='SUBCENTRE' ? 'AAM' : LVL[role.level].short;
      base.scopeChips=[['FACILITY','At my facility'],['CATCHMENT','In my catchment']].map(([k,l])=>({label:l, ...this.chip(sc===k, role.accent), onTap:()=>this.setState({scopeFilter:k, filter:'ALL'})}));
      base.scopeNote = sc==='CATCHMENT'
        ? 'Every next step for women residing in this catchment — whoever created it, wherever it is pending.'
        : 'Next steps created at, or pending at, '+role.facility+'.';
      const rf=st.riskFilter||'ALL';
      const fl=this.svcMeta().flag;
      const riskOpts = this.svc()==='PNC'
        ? [['ALL','All'],['MOTHER','High risk mother'],['NEWBORN','High risk newborn']]
        : this.svc()==='NCD'
          ? [['ALL','All'],['DM','Diabetes'],['HTN','Hypertension']]
          : [['ALL','All'],['HRP',fl.HRP],['NORMAL',fl.Normal]];
      base.riskChips=riskOpts.map(([k,l])=>({label:l, ...this.chip(rf===k, role.accent), onTap:()=>this.setState({riskFilter:k})}));
    }

    if(scr==='alerts'){ base.alerts=this.alertsVM(); base.alertsEmpty=base.alerts.length===0; }

    if(scr==='journey'){
      const w=this.byId(st.selId);
      if(w){
        const inReg=(s)=>(s.reg||w.svc||'ANC')===(this.hasSvc()?this.svc():(w.svc||'ANC'));
        const open=w.steps.filter(s=>s.status==='OPEN'&&inReg(s)).slice().sort((a,b)=>{
          const ka=a.due||a.sent, kb=b.due||b.sent; return ka<kb?-1:(ka>kb?1:0); });
        const done=w.steps.filter(s=>s.status!=='OPEN'&&inReg(s));
        base.selWoman={
          name:w.name, nameHi:w.hi, initials:this.initials(w.name), avatarBg:this.avatarFor(w.id),
          subLine:[w.vhi?(w.village+' ('+w.vhi+')'):w.village, w.asha?('ASHA '+w.asha):w.sc].filter(Boolean).join(' · '),
          gestLabel:this.metaA(w), eddLabel:this.metaB(w), metaBLabel:this.metaBLabel(w), hasMetaB:!!this.metaB(w),
          riskBg:this.isHigh(w)?'var(--ml-peach)':'#D9F7E8', riskFg:this.isHigh(w)?'#8A3D14':'#1B6B47',
          riskIcon:this.isHigh(w)?'M12 3L2 20h20L12 3zM12 10v4M12 17h.01':'M20 6L9 17l-5-5',
          phone:this.mask(w.phone), consent:w.consent, noConsent:!w.consent,
          smsLabel:w.consent?'SMS on':'SMS off', smsColor:w.consent?'#1B6B47':'#994242',
          riskShort:this.flagShort(w),
          onCall:()=>this.toast('Dialling '+w.name+' · '+this.mask(w.phone)),
          openCount:open.length+'', noOpen:open.length===0,
          doneCount:done.length+'', noDone:done.length===0,
          onEnter:()=>this.openCapture(w.id),
          hasProfile:!!w.linked, onProfile:()=>this.setState({screen:'profile', dialog:null}),
          openSteps:open.map(s=>{ const vm=this.stepVM(s,w); return {icon:vm.icon, lc:vm.lc, lsoft:vm.lsoft, title:vm.title, dueColor:vm.dueColor, dueLabel:vm.dueLabel, onOpen:()=>this.openClose(s.id)}; }),
          doneSteps:done.map(s=>{ const vm=this.stepVM(s,w); return {title:vm.title, line:(s.status==='CANCELLED'?'Cancelled · ':'')+this.fmt(s.cdate)+' · '+s.cby, downgraded:vm.downgraded, downNote:vm.downNote}; }),
        };
      }
    }

    if(scr==='capture' && st.cap){
      const c=st.cap; const w=this.byId(c.womanId);
      const TINT={'#1E14BE':'#EFEDFF','#6165DE':'#E7E7FB','#2E9E6B':'#D9F7E8','#994242':'#F7E3E3','#C35721':'#FBE7DC'};
      const n=c.steps.length;
      base.cap={
        womanName:w?w.name:'', gestLabel:w?(this.metaA(w)+' · '+this.flagShort(w)):'',
        optionsHint: (this.svc()==='PNC' && w && !this.pncOpen(w))
          ? ('PNC & newborn window closed — day 42 after delivery ('+this.fmtLong(this.pncEnd(w))+') has passed. No new PNC or newborn steps can be scheduled.')
          : ((this.svc()==='PNC' && w && this.pncEnd(w))
              ? ('Options available to you as '+role.name+'. PNC & newborn steps can be scheduled up to '+this.fmtLong(this.pncEnd(w))+' (day 42).')
              : ('Options available to you as '+role.name+' at '+role.facility+'.')),
        options:((this.svc()==='PNC' && w && !this.pncOpen(w)) ? [] : this.optionsFor()).map(k=>{ const OPTAC={REFERRAL:'#1E14BE', ANC_VISIT:'#6165DE', PMSMA_VISIT:'#6165DE', FOLLOW_UP:'#994242', LAB:'#2E9E6B', IMAGING:'#6165DE', TREATMENT:'#C35721', PNC_VISIT:'#2E9E6B', NB_CHECK:'#2E9E6B', IMMUNISATION:'#6165DE', BP_CHECK:'#C35721', SUGAR_TEST:'#994242', REFILL:'#1E14BE', HOME_VISIT:'#2E9E6B', HBNC:'#2E9E6B'};
          const ac=OPTAC[k]||'#1E14BE';
          return {label:(k==='FOLLOW_UP'||k==='TREATMENT'||k==='IMAGING'||k==='PNC_VISIT'||k==='NB_CHECK')?this.catLabel(k, role.level):OPTMETA[k].label, icon:CAT[k].icon, ac, sf:TINT[ac]||'#EFEDFF', onTap:()=>this.openOption(k)}; }),
        stepCountLabel:n+' step'+(n===1?'':'s'), hasSteps:n>0, noSteps:n===0,
        stepRows:c.steps.map(s=>{ const lm=LVL[s.level]; const cm=CAT[s.cat];
          const detail = s.cat==='REFERRAL' ? ((s.who?((s.who==='PW'?'PN woman':'Newborn')+' · '):'')+'To '+lm.facility+' · sent on save')
            : s.session ? ('PMSMA session · '+this.fmtLong(s.due)+' · '+lm.facility)
            : s.hbnc ? ('Day '+s.hday+' · '+this.fmtLong(s.due)+' · at home')
            : s.usg ? ('Referred to CHC · '+this.fmtLong(s.due))
            : s.due ? (this.fmtLong(s.due)+' · '+lm.facility)
            : ('At '+lm.facility+' · no date needed');
          return {icon:cm.icon, label: s.cat==='REFERRAL'?((s.who?('Referral · '+(s.who==='PW'?'PN woman':'Newborn')+' → '):'Referral to ')+lm.label):this.catLabel(s.cat, s.level), detail, ac:lm.c, sf:lm.s, onRemove:()=>this.removeStaged(s.sid)}; }),
        estTime:'≈ '+(20+n*15)+'s', saveDisabled:n?'1':'0.5', onSave:()=>this.saveCapture(),
      };
    }

    const dl=st.dialog;
    base.dialogOpen=!!dl;
    base.dlgReferral=dl&&dl.type==='referral'; base.dlgAnc=dl&&dl.type==='anc'; base.dlgPmsma=dl&&dl.type==='pmsma'; base.dlgUsg=dl&&dl.type==='usg'; base.dlgHbnc=dl&&dl.type==='hbnc'; base.dlgAshaRef=dl&&dl.type==='ashaRef';
    base.dlgAct=dl&&dl.type==='act'; base.dlgResched=dl&&dl.type==='resched'; base.dlgClose=dl&&dl.type==='close'; base.dlgSms=dl&&dl.type==='sms'; base.dlgScan=dl&&dl.type==='scan';
    if(dl){
      const dlg={};
      if(dl.type==='referral'){
        const opts=role.refUp.map(k=>({k,dir:'Refer up'})).concat(role.refDown.map(k=>({k,dir:'Refer back'})));
        const sel=dl.sel||[], max=this.refMax();
        dlg.levels=opts.map(({k,dir})=>{ const on=sel.includes(k); const lm=LVL[k];
          return {label:lm.label, facility:lm.facility, tag:dir, tone:lm.c, radius:max>1?'6px':'50%',
            bg:on?'#EFEDFF':'#fff', bd:on?'#1E14BE':'#DEDDD8', dot:on?'#1E14BE':'#DEDDD8', fill:on?'#1E14BE':'transparent',
            onTap:()=>this.toggleRefLevel(k)}; });
        base.refHint = max>1
          ? 'Select up to two facilities — she can be referred to both at once. No date needed; each facility schedules her.'
          : 'Choose the level she is referred to. No date needed — the facility schedules her.';
        base.refCount = max>1 ? (sel.length+' of 2 selected') : '';
        base.refMulti = max>1;
        dlg.confirmLabel = sel.length>1 ? 'Send 2 referrals' : 'Send referral';
        dlg.confirmDisabled=sel.length?'1':'0.5'; dlg.onConfirm=()=>this.confirmReferral();
      }
      if(dl.type==='anc'){
        dlg.dateTitle='Schedule '+CAT[dl.cat].label.toLowerCase();
        dlg.dateSub='Pick the date '+(dl.cat==='NB_CHECK'?'the baby':'she')+' should come to '+role.facility+'.';
        const capW=this.byId(st.cap?st.cap.womanId:null);
        const pncCap=(this.svc()==='PNC' && capW) ? this.pncEnd(capW) : null;
        if(pncCap){ dlg.dateSub+=' PNC & newborn steps close on '+this.fmtLong(pncCap)+' (day 42).';
          if(dl.date>pncCap) dl.date=pncCap; }
        dlg.date=dl.date; dlg.minDate=TODAY_ISO; dlg.maxDate=pncCap||'';
        dlg.onDate=(e)=>this.setState({dialog:{...dl, date:(pncCap&&e.target.value>pncCap)?pncCap:e.target.value}});
        dlg.quick=[7,14,28].filter(d=>!pncCap || this.iso(new Date(TODAY.getTime()+d*86400000))<=pncCap)
          .map(d=>{ const val=this.iso(new Date(TODAY.getTime()+d*86400000)); const on=dl.date===val;
          return {label:d===7?'In 1 week':(d===14?'In 2 weeks':'In 4 weeks'), ...this.chip(on, role.accent), onTap:()=>this.setState({dialog:{...dl, date:val}})}; });
        const wsel=this.byId(st.cap?st.cap.womanId:null);
        dlg.summary = dl.date ? (CAT[dl.cat].label+' at '+role.facility+' on '+this.fmtLong(dl.date)+((wsel && wsel.lmp && dl.cat==='ANC_VISIT')?(' — she will be '+Math.floor((new Date(dl.date+'T00:00:00')-new Date(wsel.lmp+'T00:00:00'))/604800000)+' weeks then.'):'.')) : 'Pick a date to continue.';
        dlg.confirmDisabled=dl.date?'1':'0.5'; dlg.onConfirm=()=>this.confirmDated();
      }
      if(dl.type==='ashaRef'){
        const who=dl.who||[];
        dlg.whoRows=[{k:'PW',label:'Postnatal woman',sub:'Mother needs care at a facility'},{k:'NB',label:'Newborn',sub:'Baby needs care at a facility'}].map(o=>{
          const on=who.indexOf(o.k)>-1;
          return {label:o.label, sub:o.sub, bg:on?'#EFEDFF':'#fff', bd:on?'#1E14BE':'var(--border-default)', dot:on?'#1E14BE':'transparent',
            onTap:()=>this.toggleRefWho(o.k)}; });
        dlg.refLevels=['SUBCENTRE','PHC','CHC','DH','TERTIARY'].map(k=>{ const on=dl.lvl===k, lm2=LVL[k];
          return {label:lm2.label, facility:lm2.facility, bg:on?'#EFEDFF':'#fff', bd:on?'#1E14BE':'var(--border-default)', dot:on?'#1E14BE':'transparent',
            onTap:()=>this.setState({dialog:{...dl, lvl:k}})}; });
        dlg.refSummary = who.length===2 ? ('Two referrals — mother and newborn — to '+LVL[dl.lvl].facility+'.')
          : who.length===1 ? (((who[0]==='PW')?'Postnatal woman':'Newborn')+' referred to '+LVL[dl.lvl].facility+'.')
          : 'Select who is being referred.';
        dlg.confirmLabel = who.length===2 ? 'Send 2 referrals' : 'Send referral';
        dlg.confirmDisabled=who.length?'1':'0.5'; dlg.onConfirm=()=>this.confirmAshaRef();
      }
      if(dl.type==='hbnc'){
        const wh=this.byId(st.cap?st.cap.womanId:null), home=!!(wh&&wh.delPlace==='Home');
        dlg.hbncPlace = home?'Home delivery':'Institutional delivery';
        dlg.hbncBorn = (wh&&wh.dod)?('Delivered '+this.fmtLong(wh.dod)):'';
        dlg.hbncNote = home ? 'Day 1, 3, 7, 14, 21, 28 and 42 — filled in for you.' : 'Day 3, 7, 14, 21, 28 and 42 — filled in for you.';
        const sel=dl.sel||[];
        dlg.hbncRows=this.hbncPlan(wh).map(p=>{ const on=sel.indexOf(p.day)>-1 && !p.done;
          return {label:'Day '+p.day, date:this.fmtLong(p.date),
            status: p.done?'Already scheduled':(p.past?'Date has passed':(on?'Will be scheduled':'Not scheduled')),
            bg: p.done?'var(--surface-page)':(on?'#EFEDFF':'#fff'),
            bd: on?'#1E14BE':'var(--border-default)',
            dot: on?'#1E14BE':'transparent',
            fg: p.done?'var(--text-muted)':'var(--text-strong)',
            onTap:()=>{ if(!p.done) this.toggleHbnc(p.day); }}; });
        const n=dlg.hbncRows.filter(r=>r.dot!=='transparent').length;
        dlg.hbncCount=n?(n+' visit'+(n===1?'':'s')+' will be added to her worklist'):'Tap a day to include it.';
        dlg.confirmDisabled=n?'1':'0.5'; dlg.onConfirm=()=>this.confirmHbnc();
      }
      if(dl.type==='usg'){
        dlg.date=dl.date||''; dlg.minDate=TODAY_ISO;
        dlg.onDate=(e)=>this.setState({dialog:{...dl, date:e.target.value}});
        dlg.quick=[1,7,14].map(d=>{ const val=this.iso(new Date(TODAY.getTime()+d*86400000)); const on=dl.date===val;
          return {label:d===1?'Tomorrow':(d===7?'In 1 week':'In 2 weeks'), ...this.chip(on, role.accent), onTap:()=>this.setState({dialog:{...dl, date:val}})}; });
        dlg.confirmDisabled=dl.date?'1':'0.5';
        dlg.onConfirm=()=>this.confirmUsg();
      }
      if(dl.type==='pmsma'){
        const d=this.nextPmsma();
        dlg.sessionDate=this.fmtLong(d); dlg.sessionPlace=LVL[this.pmsmaLevel()].facility;
        dlg.sessionNote='PMSMA runs on the '+this.ord(this.pmsmaDay())+' of every month. She gets an SMS three days before and on the morning of the session.';
        dlg.onConfirm=()=>this.confirmPmsma();
      }
      if(dl.type==='scan'){ dlg.onConfirm=()=>this.confirmScan(); }
      if(dl.type==='close'||dl.type==='sms'||dl.type==='act'||dl.type==='resched'){
        let found=null; this.allSteps().forEach(({s,w})=>{ if(s.id===dl.stepId) found={s,w}; });
        if(found){ const s=found.s, w=found.w, cm=CAT[s.cat], lm=LVL[s.level]; const vm=this.stepVM(s,w);
          dlg.womanName=w.name; dlg.stepTitle=vm.title; dlg.icon=cm.icon; dlg.lc=lm.c; dlg.lsoft=lm.s;
          dlg.dueColor=vm.dueColor; dlg.dueLabel=vm.dueLabel;
          if(dl.type==='act'){
            dlg.onBack=()=>this.setState({dialog:null});
            const exp=dl.exp||null;
            const tog=(k)=>()=>this.setState({dialog:{...dl, exp: exp===k?null:k}});
            const CH_OPEN='M6 15l6-6 6 6', CH_SHUT='M9 6l6 6-6 6';
            const dueTxt=this.fmt(s.due||s.sent);
            const NOUN={PMSMA_VISIT:'पीएमएसएमए जाँच', REFERRAL:'रेफ़रल जाँच', REFILL:'दवा लेने की तारीख', FOLLOW_UP:'फ़ॉलो-अप जाँच', TREATMENT:'फ़ॉलो-अप जाँच', LAB:'लैब जाँच', IMAGING:'सोनोग्राफ़ी', ANC_VISIT:'एएनसी जाँच', PNC_VISIT:'प्रसवोत्तर जाँच', NB_CHECK:'शिशु जाँच', REF_PW:'रेफ़रल जाँच', REF_NB:'शिशु रेफ़रल जाँच'};
            const msg='नमस्ते '+w.name+' जी। आपकी अगली '+(NOUN[s.cat]||'जाँच')+' '+lm.label+' पर '+dueTxt+' को निर्धारित है। कृपया समय पर पहुँचें। — स्वास्थ्य विभाग';
            const rowShell=(k,label,hint,ac,sf,icon)=>({label, hint, ac, sf, icon, onTap:tog(k),
              chev: exp===k?CH_OPEN:CH_SHUT, rbg: exp===k?'var(--surface-brand-soft)':'transparent'});
            const isHbnc = s.cat==='HBNC';
            const isOwnFacility = (st.role!=='asha') && (s.level===ROLES[st.role]?.level);
            const isMo = ['phc_mo','chc_mo','dh_mo'].indexOf(st.role)>-1;
            const askWhere = !isHbnc && !isOwnFacility && !isMo;
            const ownFac = LVL[ROLES[st.role].level] || {short:'Facility'};
            const myLvl = ROLES[st.role].level;
            const nudgeOk = !isHbnc && !isOwnFacility;
            const facWord = ownFac.short==='TER' ? 'Tertiary care' : ownFac.short==='SC' ? 'the AAM' : ownFac.short;
            const isLower = !isOwnFacility && myLvl && LADDER.indexOf(myLvl) < LADDER.indexOf(s.level);

            const whereOpts = [
              {k:'AT_REFERRED_FACILITY', l:'At recommended facility (' + (LVL[s.level]?.short || s.level) + ')'},
              {k:'OTHER_PUBLIC_FACILITY', l:'At another public health facility'},
              {k:'PRIVATE_PROVIDER', l:'At a private provider'},
            ];
            if(isLower && st.role !== 'asha') {
              whereOpts.push({k:'DELIVERED_ON_SITE', l:'Delivered here at ' + facWord + ' (below referred level)'});
            }

            const completeRow = isMo
              ? {...rowShell('supervisory','Supervisory view','Frontline steps are closed by facility staff / ANM','#70706E','#EDECE8','M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'), chev:CH_SHUT, rbg:'transparent'}
              : askWhere
                ? {...rowShell('complete','Mark complete','One tap — where did care happen?','#1B6B47','#D9F7E8','M20 6L9 17l-5-5'),
                    openComplete:exp==='complete',
                    opts:whereOpts.map(o=>({label:o.l, onTap:()=>this.applyClose(s.id,'COMPLETED',o.k)}))}
                : {...rowShell('complete', isHbnc?'Mark complete':('Mark complete at '+facWord), isHbnc?'Home visit done':'Care was delivered here on-site','#1B6B47','#D9F7E8','M20 6L9 17l-5-5'),
                    chev:CH_SHUT, rbg:'transparent', onTap:()=>this.applyClose(s.id,'COMPLETED',null)};

            dlg.rows=[
              completeRow,
              ...(nudgeOk ? [{...rowShell('wa','Send WhatsApp nudge', w.consent?'Reminder in Hindi — one tap':'No consent on record','#1B6B47','#D9F7E8','M21 11.5a8.4 8.4 0 0 1-12.2 7.5L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z'),
                openWa:exp==='wa', hasConsent:!!w.consent, noConsent:!w.consent, msg, phone:w.phone,
                onSend:()=>{ this.setState({dialog:null}); this.toast('WhatsApp nudge sent to '+w.name); },
                onDial:()=>{ this.setState({dialog:null}); this.toast('Dialling '+w.name+' · '+w.phone); }}] : []),
              {...rowShell('call','Call '+w.name.split(' ')[0],'Opens the dialler','#C35721','#FBE7DC','M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z'),
                openCall:exp==='call', phone:w.phone,
                onDial:()=>{ this.setState({dialog:null}); this.toast('Dialling '+w.name+' · '+w.phone); }},
              {...rowShell('log','Log contact attempt','Marks her unreachable','#70706E','#EDECE8','M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3.5 2'),
                chev:CH_SHUT, rbg:'transparent', onTap:()=>this.actLogAttempt(s.id)},
            ].slice(0, isHbnc?1:99);
            dlg.onClose=()=>this.setState({dialog:null});
            dlg.onDeclined=()=>this.actDeclined(s.id);
          }
          if(dl.type==='resched'){
            dlg.date=dl.date||''; dlg.minDate=TODAY_ISO;
            dlg.onDate=(e)=>this.setState({dialog:{...dl, date:e.target.value}});
            dlg.quick=[7,14,28].map(d=>{ const val=this.iso(new Date(TODAY.getTime()+d*86400000)); const on=dl.date===val;
              return {label:d===7?'In 1 week':(d===14?'In 2 weeks':'In 4 weeks'), ...this.chip(on, role.accent), onTap:()=>this.setState({dialog:{...dl, date:val}})}; });
            dlg.confirmDisabled=dl.date?'1':'0.5'; dlg.onConfirm=()=>this.confirmResched();
          }
          if(dl.type==='close'){
            const isOwnFacility = (st.role!=='asha') && (s.level===ROLES[st.role]?.level);
            const outs = isOwnFacility
              ? [{k:'COMPLETED',l:'Mark as done',h:'The step was carried out on-site at this facility'}]
              : [{k:'COMPLETED',l:'Completed',h:'The step was carried out'},
                 {k:'NOT_COMPLETED',l:'Not completed',h:'She did not receive the service'},
                 {k:'NO_CONTACT',l:'Could not be contacted',h:'No response after repeated attempts'}];
            const SUB= isOwnFacility ? {} : {
              COMPLETED:{heading:'Where did care actually happen?', items:[
                {k:'AT_REFERRED_FACILITY',l:'At the recommended facility',h:'Service delivered at the facility she was sent to'},
                {k:'OTHER_PUBLIC_FACILITY',l:'At another public facility',h:'A different government facility'},
                {k:'PRIVATE_PROVIDER',l:'At a private provider',h:'She used private care'}]},
              NOT_COMPLETED:{heading:'Why was it not completed?', items:[
                {k:'PLANS_LATER',l:'Plans to visit later',h:'She intends to go — keep the step open'},
                {k:'DECLINED',l:'Declined',h:'She chose not to go'}]}};
            const sub=SUB[dl.outcome];
            dlg.outcomes=outs.map(x=>{ const on=dl.outcome===x.k; return {label:x.l, hint:x.h, bg:on?'#EFEDFF':'#fff', bd:on?'#1E14BE':'#DEDDD8',
              dot:on?'#1E14BE':'#DEDDD8', fill:on?'#1E14BE':'transparent', onTap:()=>this.setState({dialog:{...dl, outcome:x.k, src:null}})}; });
            dlg.hasOutcomes=!dl.asha; dlg.closeTitle=dl.asha?'Mark complete':'Close step';
            if(dl.asha){ dlg.lc='#1B6B47'; dlg.lsoft='#D9F7E8'; dlg.icon='M20 6L9 17l-5-5'; }
            dlg.hasSub=!!sub; dlg.subHeading=sub?sub.heading:'';
            dlg.sources=(sub?sub.items:[]).map(x=>{ const on=dl.src===x.k; return {label:x.l, hint:x.h, bg:on?'#EFEDFF':'#fff', bd:on?'#1E14BE':'#DEDDD8',
              dot:on?'#1E14BE':'#DEDDD8', fill:on?'#1E14BE':'transparent', onTap:()=>this.setState({dialog:{...dl, src:x.k}})}; });
            const ready = isOwnFacility ? !!dl.outcome : (dl.outcome==='NO_CONTACT' ? true : !!(dl.outcome && dl.src));
            dlg.confirmDisabled=ready?'1':'0.5';
            dlg.confirmLabel = dl.asha ? 'Confirm complete' : isOwnFacility ? 'Mark as done' : (dl.outcome==='COMPLETED' ? 'Mark completed' : (dl.outcome ? 'Save outcome' : 'Choose an outcome'));
            dlg.confirmBg = dl.outcome==='COMPLETED'||!dl.outcome ? 'var(--status-success)' : 'var(--ml-blue)';
            dlg.onConfirm=()=>this.confirmClose();
          }
          if(dl.type==='sms'){
            dlg.langLabel='Hindi';
            dlg.smsHi='नमस्ते '+w.name+' जी। आपकी अगली '+(s.cat==='PMSMA_VISIT'?'पीएमएसएमए जाँच':'जाँच')+' '+lm.label+' पर '+this.fmt(s.due)+' को निर्धारित है। कृपया समय पर पहुँचें। — स्वास्थ्य विभाग';
            dlg.smsEn='“Hello '+w.name+'. Your next visit at '+lm.label+' is due on '+this.fmt(s.due)+'. Please attend on time. — Health Dept.”';
            dlg.onConfirm=()=>{ this.setState({dialog:null}); this.toast('SMS nudge queued'); };
          }
        }
      }
      base.dlg=dlg;
    }
    return base;
  }

  render() {
    const vals = this.renderVals();
    return (
      <div className="mobile-app-shell">
        {renderTemplate(vals, this)}
      </div>
    );
  }
}
