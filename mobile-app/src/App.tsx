// @ts-nocheck
// Logic ported from "Next Steps for Maternal Care v4.dc.html" (class Component). Additions for the PWA:
// backend persistence (loadRecords / saveRecords) and the Insights copilot segment.
import React from 'react';
import { TODAY, TODAY_ISO, MON, CAT, LVL, LADDER, FUP, AVA, OPTMETA, ROLES, DFAC, DEL_ROLE, CAP2INS, capUsers, NS_LOGINS, NS2MC, NS_TABS, INS_LOGINS, MC_LOGINS, FOLDERS, SVC, SVC_KEYS, DATED, INS_SCOPES, INS_SC, INS_BASE, INS_SVC, INS_PEOPLE, INS_PEOPLE_SVC, TABMETA, MC_SRC, MC_LIB, MC_MODULES, MC_ASK, SID, uid, VILLAGES, AAM_ASHAS, FBD_WARDS, USN_VILLAGES, MAPPED_DISTRICTS, DISTRICTS, vwList, bumpSid } from './data/constants';
import { compileTemplate } from './runtime/renderer';
import templateHtml from './data/template.raw.html?raw';
import { InsightsRagCopilot } from './components/InsightsRagCopilot';
import { loadRecords, saveRecords } from './data/recordsApi';

const renderTemplate = compileTemplate(templateHtml);

export default class App extends React.Component<any, any> {
  state = { lang:'en', screen:'launcher', role:null, folder:null, tab:null, svc:'ANC', selId:null, query:'', filter:'ALL', scopeFilter:'FACILITY', dialog:null, cap:null, toast:null, women:null, acked:null,
    reg:{name:'', phone:'', village:VILLAGES[0].name, abha:'', status:'HIGH', wa:true} };

  componentDidMount(){ if(!this.state.women) this.setState({women:this.seed()}); this.loadSaved(); }

  // ---------- backend persistence ----------
  // Saved records replace the seed. With nothing saved yet, the seed set is stored once.
  async loadSaved(){
    const saved = await loadRecords();
    // shortcut: backend unreachable at start → this session stays on-device only (saving the seed would overwrite real data); reload to retry
    if(saved === null){ this.toast('Offline · changes on this phone are not being saved'); return; }
    if(!saved.length){ this._persist = true; this._dirty = new Set((this.state.women||[]).map(w=>w.id)); this.flushSaves(); return; }
    let maxSid = 0;
    saved.forEach(w=>(w.steps||[]).forEach(s=>{ const m=/^s(\d+)$/.exec(s.id||''); if(m) maxSid=Math.max(maxSid, +m[1]); }));
    bumpSid(maxSid);
    this.setState({women:saved}, ()=>{ this._persist = true; });
  }
  componentDidUpdate(_p, prev){
    const now=this.state.women;
    if(!this._persist || !now || now===prev.women) return;
    const before=new Map((prev.women||[]).map(w=>[w.id, w]));
    now.forEach(w=>{ if(before.get(w.id)!==w) (this._dirty||(this._dirty=new Set())).add(w.id); });
    clearTimeout(this._saveT); this._saveT=setTimeout(()=>this.flushSaves(), 600);
  }
  async flushSaves(){
    const ids=this._dirty; if(!ids || !ids.size) return;
    this._dirty=new Set();
    const recs=(this.state.women||[]).filter(w=>ids.has(w.id));
    if(recs.length && !(await saveRecords(recs))){
      ids.forEach(id=>this._dirty.add(id));
      clearTimeout(this._saveT); this._saveT=setTimeout(()=>this.flushSaves(), 10000); // retry while the network is down
    }
  }
  componentWillUnmount(){ clearTimeout(this._saveT); }

  seed(){
    const mk = (o)=>({ id:uid(), status:'OPEN', rem:null, owner:'anm', ...o });
    const anc = [
      {id:'w90', pid:'w90', name:'Meera Kushwaha', hi:'मीरा कुशवाहा', phone:'+919812345090', village:'Ghurehta', vhi:'घुरेहटा', lmp:'2025-10-28', dod:'2026-08-02', delivered:true, delPlace:'Institution',
        risk:'HRP', hrpBy:'SUBCENTRE', sc:'Sub-centre Ghurehta', asha:'Samta', consent:true, abha:'91-2345-6789-0090',
        steps:[
          mk({cat:'ANC_VISIT', level:'SUBCENTRE', due:'2026-05-12', status:'DONE', cdate:'2026-05-12', csrc:'AT_CLOSING_FACILITY', cby:'ANM · Sub-centre Ghurehta'}),
          mk({cat:'REFERRAL', level:'CHC', sent:'2026-06-20', status:'DONE', cdate:'2026-06-24', csrc:'AT_CLOSING_FACILITY', clevel:'CHC', cby:'CHC CC · CHC Teonthar'}),
          mk({cat:'ANC_VISIT', level:'SUBCENTRE', due:'2026-08-10', status:'CANCELLED', creason:'Delivered — moved to PNC', cdate:'2026-08-02', cby:'PHC SN · PHC Sirmour'}),
        ]},
      {id:'a93', pid:'n93', name:'Pooja Chauhan', hi:'पूजा चौहान', phone:'+919812345093', village:'Ghurehta', vhi:'घुरेहटा', lmp:'2026-05-12',
        risk:'HRP', sc:'Sub-centre Ghurehta', asha:'Samta', consent:true, abha:'91-2345-6789-0093', since:'01 Aug 2026', addedBy:'ANM · Sub-centre Ghurehta',
        steps:[
          mk({cat:'SPEC', level:'PHC', due:'2026-08-04', owner:'anm'}),
          mk({cat:'LAB', level:'PHC', due:'2026-08-08', owner:'phc_sn'}),
        ]},
      {id:'a94', pid:'n94', name:'Rani Jatav', hi:'रानी जाटव', phone:'+919812345094', village:'Amiliya', vhi:'अमिलिया', lmp:'2025-10-20', dod:'2026-07-28', delivered:true, birthOutcome:'Delivery', delPlace:'Institution',
        risk:'HRP', sc:'Sub-centre Ghurehta', asha:'Samta', consent:true, abha:'91-2345-6789-0094', addedBy:'ANM · Sub-centre Ghurehta',
        steps:[
          mk({cat:'SPEC', level:'CHC', due:'2026-06-15', status:'DONE', cdate:'2026-06-16', csrc:'AT_CLOSING_FACILITY', clevel:'CHC', cby:'CHC CC · CHC Teonthar'}),
          mk({cat:'LAB', level:'PHC', due:'2026-07-10', status:'DONE', cdate:'2026-07-10', csrc:'AT_CLOSING_FACILITY', cby:'PHC SN · PHC Sirmour'}),
          mk({cat:'FOLLOW_UP', level:'PHC', due:'2026-08-04', status:'CANCELLED', creason:'Pregnancy completed', pcOut:'Delivery', cdate:'2026-07-28', cby:'PHC SN · PHC Sirmour'}),
        ]},
      {id:'w1', name:'Sunita Devi', hi:'सुनीता देवी', phone:'+919812345011', village:'Ghurehta', vhi:'घुरेहटा', age:29, lmp:'2026-01-08', g:2, p:1,
        risk:'HRP', sc:'Sub-centre Ghurehta', consent:true,
        steps:[
          mk({cat:'ANC_VISIT', level:'SUBCENTRE', due:'2026-07-24', rem:'delivered'}),
          mk({cat:'REFERRAL', level:'CHC', sent:'2026-07-28', rem:'delivered'}),
        ]},
      {id:'w11', name:'Kiran Verma', hi:'किरण वर्मा', phone:'+919812345111', village:'Ghurehta', vhi:'घुरेहटा', lmp:'2025-10-08', risk:'HRP', sc:'Sub-centre Ghurehta', consent:true, abha:'91-2345-6789-0111', steps:[mk({cat:'ANC_VISIT', level:'SUBCENTRE', due:'2026-08-01'})]},
      {id:'w12', name:'Salma Begum', hi:'सलमा बेगम', phone:'+919812345112', village:'Amiliya', vhi:'अमिलिया', lmp:'2025-10-23', risk:'Normal', sc:'Sub-centre Ghurehta', consent:true, lifeStatus:'Migrated', lifeDate:'2026-08-04', steps:[mk({cat:'ANC_VISIT', level:'SUBCENTRE', due:'2026-08-05', status:'CANCELLED', creason:'Migrated', cdate:'2026-08-04', cby:'ANM · AAM Ghurehta'})]},
      {id:'w13', name:'Priya Saini', hi:'प्रिया सैनी', phone:'+919812345113', village:'Ghurehta', vhi:'घुरेहटा', lmp:'2025-10-24', risk:'Normal', sc:'Sub-centre Ghurehta', consent:false, abha:'91-2345-6789-0113', steps:[mk({cat:'ANC_VISIT', level:'SUBCENTRE', due:'2026-08-06'})]},
      {id:'w15', name:'Sunita Prajapati', hi:'सुनीता प्रजापति', phone:'+919812345115', village:'Ghurehta', vhi:'घुरेहटा', lmp:'2026-02-14', risk:'HRP', sc:'Sub-centre Ghurehta', consent:true, abha:'91-2345-6789-0115', lifeStatus:'Temporarily moved', lifeDate:'2026-08-03',
        steps:[ mk({cat:'LAB', level:'PHC', sent:'2026-07-20', due:'2026-07-27', status:'DONE', cdate:'2026-07-27', csrc:'AT_CLOSING_FACILITY', cby:'PHC SN · PHC Sirmour'}),
                mk({cat:'FOLLOW_UP', level:'PHC', due:'2026-08-06', owner:'phc_sn', status:'CANCELLED', creason:'Temporarily moved', cdate:'2026-08-03', cby:'ASHA Samta'}),
                mk({cat:'IMAGING', level:'SDH', due:'2026-08-10', owner:'phc_sn', status:'CANCELLED', creason:'Temporarily moved', cdate:'2026-08-03', cby:'ASHA Samta'}) ]},
      {id:'w14', name:'Meena Kushwaha', hi:'मीना कुशवाहा', phone:'+919812345114', village:'Ghurehta', vhi:'घुरेहटा', lmp:'2025-10-12', risk:'HRP', sc:'Sub-centre Ghurehta', consent:true, abha:'91-2345-6789-0114', steps:[mk({cat:'FOLLOW_UP', level:'PHC', due:'2026-07-20', owner:'phc_sn'})]},
      {id:'w2', name:'Lakshmi Bai', hi:'लक्ष्मी बाई', phone:'+919812345022', village:'Sirmour', vhi:'सिरमौर', age:34, lmp:'2026-02-19', g:3, p:2,
        risk:'Normal', sc:'Sub-centre Sirmour', consent:true,
        steps:[
          mk({cat:'ANC_VISIT', level:'SUBCENTRE', due:'2026-06-18', status:'DONE', cdate:'2026-06-18', csrc:'AT_CLOSING_FACILITY', cby:'ANM · Sub-centre Sirmour'}),
          mk({cat:'REFERRAL', level:'DH', sent:'2026-07-02', status:'DONE', cdate:'2026-07-09', csrc:'AT_CLOSING_FACILITY', cby:'DH CC · BK DH', owner:'anm'}),
          mk({cat:'LAB', level:'DH', due:'2026-08-04', owner:'dh_sn', rem:'sent'}),
          mk({cat:'ANC_VISIT', level:'SUBCENTRE', due:'2026-08-14'}),
        ]},
      {id:'nr1', name:'Shabnam Khatoon', hi:'शबनम खातून', phone:'+919812345411', village:'Hodal, Palwal', lmp:'2026-02-20',
        risk:'HRP', sc:'Outside Ballabhgarh catchment', consent:true, outside:true, asha:'',
        steps:[
          mk({cat:'REFERRAL', level:'SDH', sent:'2026-08-06', owner:'sdh_sn'}),
          mk({cat:'LAB', level:'SDH', due:'2026-08-10', owner:'sdh_sn'}),
          mk({cat:'IMAGING', level:'SDH', due:'2026-08-08', owner:'sdh_sn'}),
          mk({cat:'FOLLOW_UP', level:'DH', due:'2026-08-20', owner:'dh_sn'}),
        ]},
      {id:'in1', name:'Neha Rawat', hi:'नेहा रावत', phone:'+919812345501', village:'Ghurehta', vhi:'घुरेहटा', lmp:'2025-12-30', risk:'HRP', hrpBy:'PHC', sc:'Sub-centre Ghurehta', asha:'Samta', consent:true, abha:'91-4521-3301-0501',
        steps:[ mk({cat:'IMAGING', level:'SDH', due:'2026-08-03', owner:'phc_sn'}), mk({cat:'ANC_VISIT', level:'SUBCENTRE', due:'2026-08-20'}) ]},
      {id:'in2', name:'Farzana Ali', hi:'फ़रज़ाना अली', phone:'+919812345502', village:'Amiliya', vhi:'अमिलिया', lmp:'2026-01-15', risk:'HRP', hrpBy:'CHC', sc:'Sub-centre Ghurehta', asha:'Samta', consent:true, abha:'91-4521-3301-0502',
        steps:[ mk({cat:'SPEC', level:'SDH', due:'2026-08-06', owner:'chc_sn'}), mk({cat:'LAB', level:'SDH', due:'2026-08-06', owner:'chc_sn'}) ]},
      {id:'in3', name:'Pooja Chauhan', hi:'पूजा चौहान', phone:'+919812345503', village:'Sirmour', vhi:'सिरमौर', lmp:'2026-02-10', risk:'HRP', hrpBy:'PHC', sc:'Sub-centre Sirmour', consent:false, abha:'91-4521-3301-0503',
        steps:[ mk({cat:'BT', level:'SDH', due:'2026-08-09', owner:'phc_sn'}) ]},
      {id:'in4', name:'Reena Tomar', hi:'रीना तोमर', phone:'+919812345504', village:'Baghwar', vhi:'बघवार', lmp:'2025-12-05', risk:'HRP', hrpBy:'CHC', sc:'Sub-centre Sirmour', consent:true, abha:'91-4521-3301-0504',
        steps:[ mk({cat:'BT', level:'DH', due:'2026-07-31', owner:'chc_sn'}), mk({cat:'ANC_VISIT', level:'SUBCENTRE', due:'2026-08-15'}) ]},
      {id:'in5', name:'Kamla Devi', hi:'कमला देवी', phone:'+919812345505', village:'Ghurehta', vhi:'घुरेहटा', lmp:'2026-01-02', risk:'HRP', hrpBy:'SDH', sc:'Sub-centre Ghurehta', asha:'Samta', consent:true, abha:'91-4521-3301-0505',
        steps:[ mk({cat:'SPEC', level:'DH', due:'2026-08-06', owner:'sdh_sn'}), mk({cat:'IMAGING', level:'DH', due:'2026-08-07', owner:'sdh_sn'}) ]},
      {id:'in6', name:'Sapna Bhati', hi:'सपना भाटी', phone:'+919812345506', village:'Amiliya', vhi:'अमिलिया', lmp:'2026-03-01', risk:'HRP', hrpBy:'PHC', sc:'Sub-centre Ghurehta', consent:true, abha:'91-4521-3301-0506',
        steps:[ mk({cat:'LAB', level:'DH', due:'2026-08-11', owner:'phc_sn'}) ]},
      {id:'in7', name:'Asha Nagar', hi:'आशा नागर', phone:'+919812345507', village:'Sirmour', vhi:'सिरमौर', lmp:'2025-11-20', risk:'HRP', hrpBy:'DH', sc:'Sub-centre Sirmour', consent:true, abha:'91-4521-3301-0507',
        steps:[ mk({cat:'SPEC', level:'TERTIARY', due:'2026-08-01', owner:'dh_sn'}), mk({cat:'IMAGING', level:'TERTIARY', due:'2026-08-01', owner:'dh_sn'}) ]},
      {id:'in8', name:'Rubina Khan', hi:'रुबीना ख़ान', phone:'+919812345508', village:'Baghwar', vhi:'बघवार', lmp:'2026-01-08', risk:'HRP', hrpBy:'SDH', sc:'Sub-centre Sirmour', consent:false, abha:'91-4521-3301-0508',
        steps:[ mk({cat:'SPEC', level:'TERTIARY', due:'2026-08-06', owner:'sdh_sn'}) ]},
      {id:'in9', name:'Manju Yadav', hi:'मंजू यादव', phone:'+919812345509', village:'Ghurehta', vhi:'घुरेहटा', lmp:'2026-02-02', risk:'HRP', hrpBy:'DH', sc:'Sub-centre Ghurehta', asha:'Samta', consent:true, abha:'91-4521-3301-0509',
        steps:[ mk({cat:'BT', level:'TERTIARY', due:'2026-08-10', owner:'dh_sn'}) ]},
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
          mk({cat:'REFERRAL', level:'DH', sent:'2026-07-14', status:'DONE', cdate:'2026-07-18', csrc:'AT_CLOSING_FACILITY', cby:'DH CC · BK DH'}),
          mk({cat:'FOLLOW_UP', level:'DH', due:'2026-08-24', owner:'dh_sn'}),
          mk({cat:'ANC_VISIT', level:'SUBCENTRE', due:'2026-08-08', rem:'sent'}),
        ]},
      {id:'w7', name:'Radha Prasad', hi:'राधा प्रसाद', phone:'+919812345077', village:'Amiliya', vhi:'अमिलिया', age:24, lmp:'2026-03-19', g:1, p:0,
        risk:'HRP', sc:'Sub-centre Ghurehta', consent:true,
        steps:[
          mk({cat:'ANC_VISIT', level:'SUBCENTRE', due:'2026-08-02', rem:'delivered'}),
          mk({cat:'REFERRAL', level:'CHC', sent:'2026-08-04'}),
        ]},
      {id:'w8', name:'Pushpa Bai', hi:'पुष्पा बाई', phone:'+919812345088', village:'Baghwar', vhi:'बघवार', age:20, lmp:'2026-05-14', g:1, p:0,
        risk:'Normal', riskPending:true, regBy:'asha', sc:'Sub-centre Sirmour', consent:true,
        steps:[
          mk({cat:'FOLLOW_UP', level:'CHC', due:'2026-08-18', owner:'chc_sn'}),
        ]},
    ];
    const pnc = [
      {id:'p90', pid:'w90', autoFrom:'ANC', name:'Meera Kushwaha', hi:'मीरा कुशवाहा', phone:'+919812345090', village:'Ghurehta', vhi:'घुरेहटा', dod:'2026-08-02', delPlace:'Institution',
        risk:'HRP', nbRisk:false, sc:'Sub-centre Ghurehta', asha:'Samta', consent:true, abha:'91-2345-6789-0090',
        steps:[
          mk({cat:'PNC_VISIT', level:'PHC', due:'2026-08-09', owner:'phc_sn'}),
          mk({cat:'HBNC', level:'SUBCENTRE', due:'2026-08-09', hbnc:true, hday:7, owner:'asha'}),
        ]},
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
        cond:'Hypertension', since:'Feb 2023', risk:'HRP', sc:'Sub-centre Ghurehta', consent:true, abha:'12-3456-7890-1234',
        lmp:'2025-09-15', dod:'2026-06-20', baby:'Baby girl', linked:true,
        delPlace:'Institutional delivery',
        steps:[
          mk({reg:'ANC', cat:'ANC_VISIT', level:'PHC', due:'2025-11-02', status:'DONE', cdate:'2025-11-02', csrc:'AT_CLOSING_FACILITY', cby:'PHC Nurse · PHC Sirmour'}),
          mk({reg:'ANC', cat:'LAB', level:'PHC', due:'2026-01-08', status:'DONE', cdate:'2026-01-09', csrc:'AT_CLOSING_FACILITY', cby:'PHC Nurse · PHC Sirmour'}),
          mk({reg:'ANC', cat:'REFERRAL', level:'CHC', sent:'2026-01-12', status:'DONE', cdate:'2026-01-16', csrc:'AT_CLOSING_FACILITY', cby:'CHC CC · CHC Teonthar'}),
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
      {id:'n90', pid:'w3', name:'Rekha Kumari', hi:'रेखा कुमारी', phone:'+919812345033', village:'Amiliya', vhi:'अमिलिया',
        cond:'Hypertension', since:'Jun 2025', risk:'HRP', sc:'Sub-centre Ghurehta', consent:true,
        steps:[ mk({cat:'FOLLOW_UP', level:'SUBCENTRE', due:'2026-08-04'}), mk({cat:'REFILL', level:'PHC', due:'2026-08-12', owner:'phc_nurse'}) ]},
      {id:'n91', pid:'w5', name:'Anita Yadav', hi:'अनीता यादव', phone:'+919812345055', village:'Baghwar', vhi:'बघवार',
        cond:'Diabetes', since:'Jan 2026', risk:'HRP', sc:'Sub-centre Sirmour', consent:false,
        steps:[ mk({cat:'LAB', level:'PHC', due:'2026-08-05', owner:'phc_nurse'}), mk({cat:'FOLLOW_UP', level:'SUBCENTRE', due:'2026-08-18'}) ]},
      {id:'n95', pid:'n95', sex:'M', name:'Ramesh Kori', hi:'रमेश कोरी', phone:'+919812345095', village:'Ghurehta', vhi:'घुरेहटा',
        cond:'Diabetes + hypertension', since:'Mar 2022', sc:'Sub-centre Ghurehta', asha:'Samta', consent:false, abha:'91-2345-6789-0095', lifeStatus:'Deceased', lifeDate:'2026-08-02',
        steps:[ mk({cat:'REFILL', level:'SUBCENTRE', due:'2026-07-10', status:'DONE', cdate:'2026-07-10', csrc:'AT_CLOSING_FACILITY', cby:'ANM · AAM Ghurehta'}),
                mk({cat:'FOLLOW_UP', level:'PHC', due:'2026-08-08', owner:'phc_sn', status:'CANCELLED', creason:'Deceased', cdate:'2026-08-02', cby:'ANM · AAM Ghurehta'}),
                mk({cat:'REFILL', level:'SUBCENTRE', due:'2026-08-10', status:'CANCELLED', creason:'Deceased', cdate:'2026-08-02', cby:'ANM · AAM Ghurehta'}) ]},
      {id:'nc1', pid:'nc1', sex:'M', name:'Suresh Mali', hi:'सुरेश माली', phone:'+919812346101', village:'Sirmour', vhi:'सिरमौर',
        cond:'Hypertension', since:'Jun 2024', sc:'Sub-centre Sirmour', asha:'Samta', consent:true, abha:'91-2345-6789-6101',
        steps:[ mk({cat:'REFERRAL', level:'CHC', sent:'2026-08-03', due:'2026-08-07', spec:true, owner:'phc_sn'}), mk({cat:'REFILL', level:'SUBCENTRE', due:'2026-08-20'}) ]},
      {id:'nc2', pid:'nc2', name:'Kamla Devi', hi:'कमला देवी', phone:'+919812346102', village:'Ghurehta', vhi:'घुरेहटा',
        cond:'Diabetes', since:'Feb 2025', sc:'Sub-centre Ghurehta', asha:'Samta', consent:true, abha:'91-2345-6789-6102',
        steps:[ mk({cat:'LAB', level:'CHC', due:'2026-08-08', owner:'phc_sn'}), mk({cat:'FOLLOW_UP', level:'CHC', due:'2026-08-14', owner:'chc_sn'}) ]},
      {id:'ns1', pid:'ns1', sex:'M', name:'Harish Yadav', hi:'हरीश यादव', phone:'+919812346201', village:'Baghwar', vhi:'बघवार',
        cond:'Diabetes + hypertension', since:'Sep 2021', sc:'Sub-centre Sirmour', asha:'Samta', consent:true, abha:'91-2345-6789-6201',
        steps:[ mk({cat:'REFERRAL', level:'SDH', fac:'SDH_BGH', sent:'2026-08-01', due:'2026-08-05', spec:true, owner:'chc_sn'}), mk({cat:'LAB', level:'SDH', fac:'SDH_BGH', due:'2026-08-05', owner:'chc_sn'}) ]},
      {id:'ns2', pid:'ns2', name:'Geeta Bairwa', hi:'गीता बैरवा', phone:'+919812346202', village:'Amiliya', vhi:'अमिलिया',
        cond:'Hypertension', since:'Jan 2023', sc:'Sub-centre Ghurehta', asha:'Samta', consent:true, abha:'91-2345-6789-6202',
        steps:[ mk({cat:'FOLLOW_UP', level:'SDH', fac:'SDH_BGH', due:'2026-08-09', owner:'sdh_sn'}) ]},
      {id:'nd1', pid:'nd1', sex:'M', name:'Prakash Saini', hi:'प्रकाश सैनी', phone:'+919812346301', village:'Dihiya', vhi:'दिहिया',
        cond:'Diabetes + hypertension', since:'Mar 2020', sc:'Sub-centre Sirmour', asha:'Samta', consent:true, abha:'91-2345-6789-6301',
        steps:[ mk({cat:'REFERRAL', level:'DH', fac:'BK', sent:'2026-07-30', due:'2026-08-04', spec:true, owner:'sdh_sn'}), mk({cat:'LAB', level:'DH', fac:'BK', due:'2026-08-04', owner:'sdh_sn'}) ]},
      {id:'nd2', pid:'nd2', name:'Shakuntala Meena', hi:'शकुंतला मीणा', phone:'+919812346302', village:'Sirmour', vhi:'सिरमौर',
        cond:'Diabetes', since:'Aug 2022', sc:'Sub-centre Sirmour', asha:'Samta', consent:true, abha:'91-2345-6789-6302',
        steps:[ mk({cat:'REFERRAL', level:'DH', fac:'BK', sent:'2026-08-04', due:'2026-08-10', spec:true, owner:'chc_sn'}) ]},
      {id:'nt1', pid:'nt1', sex:'M', name:'Ramkishan Gupta', hi:'रामकिशन गुप्ता', phone:'+919812346401', village:'Ghurehta', vhi:'घुरेहटा',
        cond:'Diabetes + hypertension', since:'Nov 2019', sc:'Sub-centre Ghurehta', asha:'Samta', consent:true, abha:'91-2345-6789-6401',
        steps:[ mk({cat:'REFERRAL', level:'TERTIARY', sent:'2026-07-28', due:'2026-08-03', spec:true, owner:'dh_sn'}) ]},
      {id:'nt2', pid:'nt2', name:'Usha Rani', hi:'उषा रानी', phone:'+919812346402', village:'Baghwar', vhi:'बघवार',
        cond:'Hypertension', since:'May 2021', sc:'Sub-centre Sirmour', asha:'Samta', consent:true, abha:'91-2345-6789-6402',
        steps:[ mk({cat:'REFERRAL', level:'TERTIARY', sent:'2026-08-02', due:'2026-08-08', spec:true, owner:'sdh_sn'}), mk({cat:'LAB', level:'TERTIARY', due:'2026-08-08', owner:'sdh_sn'}) ]},
      {id:'n94', pid:'n94', name:'Rani Jatav', hi:'रानी जाटव', phone:'+919812345094', village:'Amiliya', vhi:'अमिलिया',
        cond:'Hypertension', since:'Nov 2023', sc:'Sub-centre Ghurehta', asha:'Samta', consent:true, abha:'91-2345-6789-0094',
        steps:[
          mk({cat:'REFILL', level:'SUBCENTRE', due:'2026-07-05', status:'DONE', cdate:'2026-07-05', csrc:'AT_CLOSING_FACILITY', cby:'ANM · Sub-centre Ghurehta'}),
          mk({cat:'FOLLOW_UP', level:'PHC', due:'2026-08-05', owner:'phc_sn'}),
          mk({cat:'REFILL', level:'SUBCENTRE', due:'2026-08-09'}),
        ]},
      {id:'n93', pid:'n93', name:'Pooja Chauhan', hi:'पूजा चौहान', phone:'+919812345093', village:'Ghurehta', vhi:'घुरेहटा',
        cond:'Diabetes', since:'Mar 2024', sc:'Sub-centre Ghurehta', asha:'Samta', consent:true, abha:'91-2345-6789-0093',
        steps:[
          mk({cat:'FOLLOW_UP', level:'SUBCENTRE', due:'2026-06-10', status:'DONE', cdate:'2026-06-10', csrc:'AT_CLOSING_FACILITY', cby:'ANM · Sub-centre Ghurehta'}),
          mk({cat:'REFILL', level:'SUBCENTRE', due:'2026-07-10', status:'DONE', cdate:'2026-07-11', csrc:'AT_CLOSING_FACILITY', cby:'ANM · Sub-centre Ghurehta'}),
          mk({cat:'REFILL', level:'SUBCENTRE', due:'2026-08-10'}),
        ]},
      {id:'n1', sex:'M', name:'Ramesh Tiwari', hi:'रमेश तिवारी', phone:'+919812345201', village:'Ghurehta', vhi:'घुरेहटा',
        cond:'Hypertension', since:'Mar 2024', risk:'HRP', sc:'Sub-centre Ghurehta', consent:true,
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
      {id:'n3', sex:'M', name:'Mohan Lal Kol', hi:'मोहन लाल कोल', phone:'+919812345203', village:'Dihiya', vhi:'दिहिया',
        cond:'Diabetes + hypertension', since:'Nov 2022', risk:'HRP', sc:'Sub-centre Sirmour', consent:false,
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
    return anc.map(w=>({svc:'ANC', ...w, risk:'HRP', riskPending:false, steps:w.steps.filter(s=>s.cat!=='PMSMA_VISIT')}))
      .concat(pnc.map(w=>({svc:'PNC', ...w})))
      .concat(ncd.map(w=>({svc:'NCD', ...w})))
      .concat([
        {svc:'DELIVERY', id:'d1', name:'Pooja Rani', hi:'पूजा रानी', phone:'+919812345401', village:'Ghurehta', vhi:'घुरेहटा', lmp:'2025-11-12', risk:'HRP', sc:'Sub-centre Ghurehta', consent:true,
          steps:[ mk({reg:'DELIVERY', cat:'REFERRAL', level:'DH', fac:'SDH_BGH', sent:'2026-08-04', owner:'anm'}) ]},
        {svc:'DELIVERY', id:'d2', name:'Neha Kumari', hi:'नेहा कुमारी', phone:'+919812345402', village:'Gharonda', vhi:'गरोंडा', lmp:'2025-11-02', risk:'Normal', sc:'Sub-centre Ghurehta', consent:true,
          steps:[ mk({reg:'DELIVERY', cat:'REFERRAL', level:'PHC', fac:'PHC_DAY', sent:'2026-08-05', owner:'anm'}) ]},
        {svc:'DELIVERY', id:'d3', name:'Rekha Devi', hi:'रेखा देवी', phone:'+919812345403', village:'Semri', vhi:'सेमरी', lmp:'2025-10-25', risk:'HRP', sc:'Sub-centre Ghurehta', consent:false,
          steps:[ mk({reg:'DELIVERY', cat:'REFERRAL', level:'SDH', fac:'SDH_BGH', sent:'2026-07-30', status:'DONE', cdate:'2026-07-31', csrc:'AT_CLOSING_FACILITY', clevel:'SDH', cby:'SDH CC · SDH Ballabhgarh'}),
                  mk({reg:'DELIVERY', cat:'REFERRAL', level:'TERTIARY', fac:'BK', sent:'2026-07-31', owner:'del_sdh'}) ]},
        {svc:'DELIVERY', id:'d5', name:'Farzana Bano', hi:'फ़रज़ाना बानो', phone:'+919812345405', village:'Palwal (outside)', lmp:'2025-11-08', risk:'HRP', hrpBy:'DH', hrpByName:'SDH CC · SDH Ballabhgarh', outside:true, sc:'Outside Ballabhgarh catchment', consent:true,
          steps:[ mk({reg:'DELIVERY', cat:'FOLLOW_UP', level:'SDH', due:'2026-08-04', owner:'del_sdh'}) ]},
        {svc:'DELIVERY', id:'d4', name:'Sonia Yadav', hi:'सोनिया यादव', phone:'+919812345404', village:'Ghurehta', vhi:'घुरेहटा', lmp:'2025-10-20', dod:'2026-08-03', delPlace:'Institution', risk:'Normal', sc:'Sub-centre Ghurehta', consent:true,
          steps:[ mk({reg:'DELIVERY', cat:'REFERRAL', level:'PHC', fac:'PHC_DAY', sent:'2026-08-02', status:'DONE', cdate:'2026-08-02', csrc:'AT_CLOSING_FACILITY', clevel:'PHC', cby:'PHC SN · PHC Dayalpur'}),
                  mk({reg:'DELIVERY', cat:'DEL_NORMAL', level:'PHC', ddate:'2026-08-03', disdate:'2026-08-05', status:'DONE', cdate:'2026-08-03', csrc:'AT_CLOSING_FACILITY', clevel:'PHC', cby:'PHC SN · PHC Dayalpur'}) ]},
      ]);
  }

  // ---------- helpers ----------
  fmt(iso){ if(!iso) return ''; const d=new Date(iso+'T00:00:00'); return d.getDate()+' '+MON[d.getMonth()]; }
  fmtLong(iso){ if(!iso) return ''; const d=new Date(iso+'T00:00:00'); return d.getDate()+' '+MON[d.getMonth()]+' '+d.getFullYear(); }
  iso(d){ const p=n=>(n<10?'0':'')+n; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }
  diff(iso){ return Math.round((TODAY - new Date(iso+'T00:00:00'))/86400000); }
  weeks(w){ return w.lmp ? Math.max(0, Math.floor(this.diff(w.lmp)/7)) : null; }
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
  staleAnc(w){ return (w.svc||'ANC')==='ANC' && !w.dod && !w.delivered && !w.pregEnd && !!w.lmp && this.diff(this.edd(w))>30; }
  archived(w){ return ['ANC','DELIVERY'].indexOf(w.svc||'ANC')>-1 && !w.dod && !w.delivered && !w.pregEnd && (this.weeks(w)||0)>42; }
  liveWomen(){ return (this.state.women||[]).filter(w=>!this.staleAnc(w) && w.svc!=='PNC'); }
  comboOn(){ const st=this.state; return st.screen==='lookup' && st.lkAll!==false && !!st.lkCombo; }
  pregOver(x){ return ['ANC','DELIVERY'].indexOf(x.svc||'ANC')>-1 && !!(x.dod||x.delivered||x.pregEnd); }
  isCombo(w){ const h=this.linkedOf(w).filter(x=>!this.staleAnc(x) && !this.pregOver(x)).map(x=>x.svc||'ANC'); return (h.indexOf('ANC')>-1||h.indexOf('DELIVERY')>-1) && h.indexOf('NCD')>-1; }
  bySvc(k){ return this.liveWomen().filter(w=>(w.svc||'ANC')===k); }
  clients(){ return this.bySvc(this.svc()); }
  optionsFor(){ const r=ROLES[this.state.role]||{};
    if(this.svc()==='DELIVERY') return (DEL_ROLE[this.state.role]||{opts:[]}).opts;
    if(this.svc()==='PNC' && this.state.role==='asha') return ['HBNC','REF_NB','REF_PW'];
    let opts = this.hasSvc() ? this.svcMeta().options
      : (!(r.options||[]).length ? [] : (this.svc()==='ANC' ? r.options : this.svcMeta().options));
    if(this.svc()==='CANCER' && this.state.role==='anm') opts=opts.filter(k=>k!=='LAB' && k!=='IMAGING');
    if(this.svc()!=='ANC') opts=opts.filter(k=>['IV_IS','IV_FCM','BT'].indexOf(k)<0);
    if(r.level==='SUBCENTRE') opts=opts.filter(k=>k!=='BT');
    if(r.level==='SUBCENTRE' && this.svc()==='NCD') opts=opts.filter(k=>k!=='LAB');
    if(r.level==='TERTIARY' && this.svc()==='NCD') opts=opts.filter(k=>k!=='REFERRAL');
    if(this.svc()==='NCD' && r.level && r.level!=='SUBCENTRE') opts=['FOLLOW_UP','REFILL','LAB','REFERRAL'].filter(k=>opts.indexOf(k)>-1);
    if(this.svc()==='NCD' && r.level==='SUBCENTRE') opts=['FOLLOW_UP','REFILL','REFERRAL'];
    if(this.svc()==='ANC' && r.level!=='SUBCENTRE') opts=opts.filter(k=>k!=='REFERRAL');
    if(this.svc()==='ANC') opts=opts.filter(k=>k!=='ANC_VISIT' && k!=='PMSMA_VISIT');
    if(this.svc()==='ANC' && ['PHC','CHC','SDH','DH'].indexOf(r.level)>-1 && opts.indexOf('SPEC')<0){ const i=opts.indexOf('FOLLOW_UP'); opts=opts.slice(); opts.splice(i+1,0,'SPEC'); }
    if(this.svc()==='ANC') opts=opts.filter(k=>k!=='ANC_VISIT' && k!=='PMSMA_VISIT');
    return opts; }
  ppDay(w){ return w.dod ? this.diff(w.dod) : null; }
  metaA(w){ if((w.svc==='DELIVERY'||w.delivered) && w.dod) return 'Delivered'; const s=(w.svc==='DELIVERY'?'ANC':w.svc)||'ANC';
    if(s==='ANC') return this.weeks(w)===null?'Newly registered':(this.weeks(w)+' wks');
    if(s==='PNC') return this.ppDay(w)===null?'Newly registered':('Day '+this.ppDay(w)+' PP');
    return ''; }
  metaBLabel(w){ if((w.svc==='DELIVERY'||w.delivered) && w.dod) return 'On'; const s=(w.svc==='DELIVERY'?'ANC':w.svc)||'ANC'; return s==='ANC'?'EDD':(s==='PNC'?'Born':'Since'); }
  metaB(w){ if((w.svc==='DELIVERY'||w.delivered) && w.dod) return this.fmt(w.dod); const s=(w.svc==='DELIVERY'?'ANC':w.svc)||'ANC';
    if(s==='ANC') return this.edd(w)?this.fmt(this.edd(w)):'';
    if(s==='PNC') return w.dod?this.fmt(w.dod):'';
    return w.since||''; }
  riskTag(w){ const s=(w.svc==='DELIVERY'?'ANC':w.svc)||'ANC';
    const HI={bg:'var(--ml-peach)', fg:'#8A3D14'}, OK={bg:'#D9F7E8', fg:'#1B6B47'},
          NEU={bg:'var(--surface-brand-soft)', fg:'var(--ml-blue)'}, CA={bg:'#F6EBEB', fg:'#8A3436'};
    if(s==='PNC'){ const m=w.risk==='HRP', n=!!w.nbRisk;
      if(m&&n) return {label:'HRPNW + HR newborn', ...HI};
      if(m) return {label:'HRPNW', ...HI};
      if(n) return {label:'High risk newborn', ...HI};
      return {label:'Both normal', ...OK}; }
    if(s==='NCD'){ const c=(w.cond||'').toLowerCase();
      const dm=/diab/.test(c), htn=/hyperten/.test(c);
      return {label: dm&&htn ? 'HTN & DM' : dm ? 'DM' : htn ? 'HTN' : (w.cond||'—'), ...NEU}; }
    if(s==='CANCER'){ const c=(w.cond||'').toLowerCase();
      return {label: /oral/.test(c)?'Oral' : /breast/.test(c)?'Breast' : /cervic/.test(c)?'Cervical' : 'Other', ...CA}; }
    return {label:'', bg:'transparent', fg:'transparent'};
  }
  flagShort(w){ const s=(w.svc==='DELIVERY'?'ANC':w.svc)||'ANC';
    if(s==='ANC') return '';
    if(s==='PNC'){ const m=w.risk==='HRP', n=!!w.nbRisk;
      return m&&n ? 'HRPNW + HR newborn' : m ? 'HRPNW' : n ? 'High risk newborn' : 'Both well'; }
    if(s==='NCD'){ const c=(w.cond||''), d=/diabet/i.test(c), h=/hyperten/i.test(c);
      return d&&h ? 'Diabetes + hypertension' : d ? 'Diabetes' : 'Hypertension'; }
    const f=SVC[s].flag; return f[w.risk==='HRP'?'HRP':'Normal']; }
  cardFacts(w){
    const k=(w.svc==='DELIVERY'?'ANC':w.svc)||'ANC', HI={bg:'#FDE7DA',fg:'#8A3D14',lc:'#A3542A'}, OK={bg:'#D9F7E8',fg:'#1B6B47',lc:'#2E7D57'},
      NEU={bg:'#fff',fg:'#16161D',lc:'#6B6B78'}, GR={bg:'#ECEBE7',fg:'#5C5B57',lc:'#5C5B57'}, DX={bg:'#EFEDFF',fg:'#1E14BE',lc:'#4A42C9'};
    const canEdit=!this.staleAnc(w) && ((this.isPhcUp() && (['ANC','DELIVERY'].indexOf(w.svc||'ANC')<0 || this.canSetHrp(w))) || this.anmEsc(w) || this.pncEdit(w));
    const onRisk=()=>(this.staleAnc(w)?this.toast('Past EDD + 30 days · record pregnancy outcome only'):(!this.isPhcUp() && !this.anmEsc(w) && !this.pncEdit(w))?this.toast(this.isHigh(w)?'HRP to normal · PHC and above only':'Status can be changed at PHC and above'):this.setState({dialog:{type:'hrp', wid:w.id}}));
    const F=(label,value,t,risk)=>({label, value, bg:t.bg, fg:t.fg, lc:t.lc, edit:!!risk && canEdit, onTap:risk?onRisk:(()=>{}), cur:risk?'pointer':'default'});
    if(k==='PNC'){ const d=this.ppDay(w);
      return [F('Since delivery', d===null?'—':('Day '+d), NEU), F('Woman', w.risk==='HRP'?'High risk':'Normal', w.risk==='HRP'?HI:OK, true), F('Newborn', w.nbRisk?'High risk':'Normal', w.nbRisk?HI:OK, true)]; }
    if(k==='NCD'){ const c=w.cond||'', dm=/diabet/i.test(c), ht=/hyperten/i.test(c);
      return [F('Registered since', w.since||'—', NEU), F('Condition', dm&&ht?'HTN + DM':dm?'DM':'HTN', DX, true)]; }
    if(k==='CANCER') return [F('Registered since', w.since||'—', NEU), F('Status', this.flagShort(w), w.risk==='HRP'?HI:NEU)];
    const st=w.riskPending?F('Status','Not set',GR,true):F('Status', w.risk==='HRP'?'HRP':'Normal', w.risk==='HRP'?HI:OK, true);
    if(w.dod) return [F('Delivered on', this.fmt(w.dod), NEU)];
    const wk=this.weeks(w), e=this.edd(w);
    return [F('Gestation', wk===null?'—':(wk+' wks'), NEU), F('EDD', e?this.fmt(e):'—', NEU)]; }
  isHigh(w){ return w.risk==='HRP' || !!w.nbRisk || !!w.htnUnc || !!w.dmUnc; }
  svcIcons(w){
    const IC={PW:'M12 2.5a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM10 21v-5.5l-1.5-.5V10a2.5 2.5 0 0 1 2.5-2.5h1.2c1.6 0 2.8 1.3 2.8 2.9 0 .9-.3 1.4-.3 1.4 1.2.6 1.8 1.8 1.8 3 0 1.6-1.2 2.7-2.5 2.7V21',
      PNC:'M9 2.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM6.5 21v-6L5 14v-4a2.5 2.5 0 0 1 2.5-2.5h3A2.5 2.5 0 0 1 13 10v1M11.5 21v-6M17 11.5a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6zM14 21c0-2 1.3-3.6 3-3.6s3 1.6 3 3.6z',
      HTN:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8zM3.5 12h4l2-3 3 6 2-3h6',
      DM:'M9 3S4 9.2 4 12.5a5 5 0 0 0 10 0C14 9.2 9 3 9 3zM15.5 13h4.5a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-4.5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1zM16.5 15.5h2.5M17.7 21v-2.5',
      CA:'M12 3a3.5 3.5 0 0 0-3.5 3.5c0 2.6 3.5 6.5 3.5 6.5s3.5-3.9 3.5-6.5A3.5 3.5 0 0 0 12 3zM12 13l-5 8M12 13l5 8'};
    const TONE={red:{c:'#B42318',s:'#FDE8E6'}, yellow:{c:'#A87800',s:'#FFF4CC'}, grey:{c:'#6B6B68',s:'#ECEBE7'}, orange:{c:'#C35721',s:'#FBE7DC'}, green:{c:'#17834F',s:'#E3F6EC'}};
    const out=[];
    this.linkedOf(w).forEach(x=>{ const k=x.svc||'ANC';
      const ts=x.steps.map(s=>this.stepTone(s));
      const pend=x.steps.some(s=>s.status==='OPEN' && !this.stepTone(s) && (()=>{ const d=this.diff(s.due||s.sent||TODAY_ISO); return d>=0&&d<=2; })());
      let t=ts.includes('overdue')?'red':ts.includes('unreach')?'yellow':ts.includes('lost')?'grey':pend?'orange':'green';
      let sub='', delSt='';
      if(k==='ANC' && !x.dod && !x.delivered && !x.pregEnd && x.lmp){ const dd=this.diff(this.edd(x));
        if(dd>=16 && dd<=30){ sub='Del. pending'; delSt='Pending delivery'; t='red'; }
        else if(dd>=0 && dd<=15){ sub='Exp. delivery'; delSt='Expected delivery'; if(t==='green') t='orange'; } }
      const st=t==='red'?'Overdue':t==='yellow'?'Unreachable':t==='grey'?'Lost to follow-up':t==='orange'?'Pending':'On track';
      const push=(ic,lab)=>out.push({icon:IC[ic], ac:TONE[t].c, sf:TONE[t].s, title:lab+' · '+(delSt||st), sub, hasSub:!!sub});
      if(k==='ANC') push('PW','Pregnant woman');
      else if(k==='PNC'||k==='DELIVERY') push('PNC','Mother & newborn');
      else if(k==='NCD'){ const c=x.cond||''; const d=/diabet/i.test(c), hy=/hyperten/i.test(c)||!d;
        if(hy) push('HTN','Hypertension'); if(d) push('DM','Diabetes'); }
      else if(k==='CANCER') push('CA','Cancer');
    });
    return out.sort((a,b)=>(b.hasSub?1:0)-(a.hasSub?1:0)); }
  abbr(t){ return (t||'').replace(/Sub-District Hospital/g,'SDH').replace(/District Hospital/g,'DH').replace(/Community Health Centre/g,'CHC').replace(/Primary Health Centre/g,'PHC')
    .replace(/Tertiary Care( Centre)?/g,'TC').replace(/Medical College, Jabalpur/g,'TC').replace(/Sub-centre/g,'AAM').replace(/Tertiary/g,'TC'); }
  stepTone(s){ if(s.status==='DONE'||s.status==='CANCELLED') return '';
    const att = s.rem==='failed' ? (s.unreach||3) : (s.unreach||0);
    if(s.status==='DECLINED' || s.csrc==='DECLINED' || att>3) return 'lost';
    if(att>=3) return 'unreach';
    if(s.status==='OPEN' && this.diff(s.due||s.sent||TODAY_ISO)>=this.odDays(s).od) return 'overdue';
    return ''; }
  ownerOf(s){ return (this.state.women||[]).find(w=>(w.steps||[]).indexOf(s)>-1)||null; }
  odDays(s, w0){ const w=w0||this.ownerOf(s)||{}; const k=s.reg||w.svc||'ANC';
    if(k==='NCD') return {od:3, pend:2, min:0};
    if(['ANC','DELIVERY','PNC'].indexOf(k)>-1 && (w.risk==='HRP' || (k==='PNC' && w.nbRisk)) && !w.riskPending) return {od:2, pend:1, min:0};
    return {od:2, pend:2}; }
  openCount(w){ return w.steps.filter(s=>s.status==='OPEN').length; }
  abhaOf(w){ if(w.abha) return w.abha; const d=(w.phone||'').replace(/\D/g,'').slice(-10);
    return '12-34'+d.slice(0,2)+'-'+d.slice(2,6)+'-'+d.slice(6,10); }
  hasOverdue(w){ return w.steps.some(s=>s.status==='OPEN'&&s.due&&this.diff(s.due)>0); }
  pmsmaDay(){ const d=this.props.pmsmaDay||9; return Math.min(28,Math.max(1,d)); }
  nextPmsma(){ const day=this.pmsmaDay(); let d=new Date(TODAY.getFullYear(), TODAY.getMonth(), day);
    if(d < TODAY) d=new Date(TODAY.getFullYear(), TODAY.getMonth()+1, day); return this.iso(d); }
  ncdSpec(){ const r=ROLES[this.state.role]||{}; return this.svc()==='NCD' && !!r.level && r.level!=='SUBCENTRE'; }
  ncdDoc(){ const r=ROLES[this.state.role]||{}; return (this.svc()==='NCD'||this.svc()==='ANC') && r.level==='SUBCENTRE' && this.state.role!=='ASHA'; }
  catLabel(cat, level){
    if(cat==='DEL_NORMAL'||cat==='DEL_CSEC'){ const k=Object.keys(DEL_ROLE).find(x=>DEL_ROLE[x].lab[cat] && ROLES[x].level===level); return k?DEL_ROLE[k].lab[cat]:CAT[cat].label; }
    if(cat==='FOLLOW_UP'||cat==='TREATMENT') return 'Follow up at '+(FUP[level]||'facility');
    if(cat==='REFILL' && level==='SUBCENTRE') return 'Medicine refill at AAM';
    if(cat==='HBNC') return 'HBNC / ASHA visit';
    if(cat==='HOME_PNC') return 'Home PNC · ANM visit';
    if(cat==='PNC_VISIT') return 'PNC follow up at '+(FUP[level]||'facility');
    if(cat==='NB_CHECK') return 'Newborn follow up at '+(FUP[level]||'facility');
    if(cat==='IMAGING' && this.svc()==='CANCER') return 'Imaging';
    return CAT[cat].label;
  }
  ord(n){ const s=['th','st','nd','rd'], v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); }
  toast(t){ this.setState({toast:t}); clearTimeout(this._tt); this._tt=setTimeout(()=>this.setState({toast:null}),2600); }

  // ---------- insights (PHC MO) ----------
  insKey(){ return CAP2INS[this.state.role]||this.state.role; }
  insViewKind(){ const k=this.insKey(); return {ins_aam:'AAM', ins_phc:'PHC', phc_mo:'PHC', ins_chc:'CHC', ins_sdh:'SDH'}[k]||null; }
  insFacView(){ return !!this.insViewKind() && this.state.insView!=='catch'; }
  insScopeDef(){
    if(this.insFacView()){ const k=this.insKey(), r=ROLES[k]||{};
      return {mul:{AAM:.14, PHC:.42, CHC:1.05, SDH:.45}[this.insViewKind()], list:[{id:'all', label:(r.facility||'')+' · facility', f:1, q:1, villages:[]}]}; }
    return INS_SCOPES[this.insKey()] || {mul:1, list:INS_SC}; }
  insScList(){ return this.insScopeDef().list; }
  insMul(){ return this.insScopeDef().mul; }
  insSc(){ const L=this.insScList(); return L.find(s=>s.id===(this.state.insSc||'all')) || L[0]; }
  insFactors(){
    const sc=this.insSc(); let f=sc.f, q=sc.q;
    if(this.state.insVil && sc.villages.length){
      const i=sc.villages.indexOf(this.state.insVil);
      f=f/sc.villages.length; q=q*[1.05,.93,1.0][Math.max(0,i)%3];
    }
    const d=this.insRangeDays(); f=f*Math.min(2.4, Math.max(.08, d/90)); q=q*(d<=7?.94:d<=30?.97:1);
    return {f:f*this.insMul(), q, sc};
  }
  insRangeDates(){
    const st=this.state, r=st.insRange||'30d', to=new Date(2026,10,9);
    if(r==='custom' && st.insFrom && st.insTo) return [new Date(st.insFrom), new Date(st.insTo)];
    const days={'7d':7,'30d':30,'60d':60}[r]||30;
    return [new Date(to.getTime()-(days-1)*864e5), to];
  }
  insRangeDays(){ const [a,b]=this.insRangeDates(); return Math.max(1, Math.round((b-a)/864e5)+1); }
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
  // Insights copilot (keyword answers over the figures on screen, no AI model) — kept from the earlier app.
  copilotNode({S, svcKey, sc, insK, registered, hrp, hrpPct, rows, track, lowerNum, lowerDen}){
    const st=this.state, R=ROLES[insK]||ROLES.ins_aam;
    const scope=sc.id==='all' ? sc.label : (INS_SCOPES[insK] ? sc.label : 'SC-HWC '+sc.label);
    return React.createElement(InsightsRagCopilot, {
      key:'copilot-'+insK+'-'+sc.id+'-'+(st.insVil||'all')+'-'+svcKey+'-'+(st.lang||'en'),
      lang:st.lang||'en',
      data:{roleName:R.name||'Staff', facilityName:R.facility||'Facility', roleLevel:R.level||'SUBCENTRE',
        service:S.name||svcKey, scope, village:st.insVil||'All villages', registered, hrp, hrpPct,
        actionRows:rows.map(r=>({key:r.key, label:r.label, value:r.value, color:r.color, sub:r.sub})),
        trackingRate:track.pct, lowerTierRate:Math.round(lowerNum/lowerDen*100)+'%', women:st.women||[]}});
  }

  insightsVM(){
    const st=this.state, sc=this.insSc(), insK=this.insKey();
    const svcKey=this.svc(); let S=INS_SVC[svcKey]||INS_SVC.ANC;
    if(['ins_asha','ins_aam','ins_phc','ins_chc'].indexOf(insK)>-1 && svcKey==='PNC'){
      S={...S,
        actions:(()=>{ const by={}; S.actions.forEach(a=>by[a.key]=a); if(!by.pnc) return S.actions;
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
    if(['ins_sdh','ins_dh','ins_tert'].indexOf(insK)>-1 && svcKey==='PNC'){
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
    const facilityOnly=['ins_dh','ins_tert'].indexOf(insK)>-1 || this.insFacView();
    const vk=this.insViewKind(), fv=this.insFacView();
    const registered=this.insN(B.registered), hrp=this.insN(B.hrp);
    const hrpPct = registered ? Math.round(hrp/registered*1000)/10 : 0;

    const nrmDen=Math.max(1, registered-hrp);
    const rows=B.actions.map(a=>{
      const ancOnly=svcKey==='ANC' && a.nrm!=null;
      const split=!ancOnly && (a.nrm!=null||a.dm!=null||a.hnb!=null), nN=(a.nrm!=null&&!ancOnly)?this.insN(a.nrm):0, hN=a.nrm!=null?this.insN(a.hrp):0;
      const parts=ancOnly ? [] : a.nrm!=null
        ? [{label:'HRP', n:hN, bar:'#B83A3A', bg:'#F8ECEC', fg:'#8F2B2B'},{label:'Normal', n:nN, bar:'#2E9E6B', bg:'#E6F4EC', fg:'#1F7A50'}]
        : a.hnb!=null ? [{label:'Normal', n:this.insN(a.nrmP), bar:'#2E9E6B', bg:'#E6F4EC', fg:'#1F7A50'},{label:'High-risk NB', n:this.insN(a.hnb), bar:'#6165DE', bg:'#EFEDFF', fg:'#3B3BA8'},{label:'High-risk PNW', n:this.insN(a.hpw), bar:'#994242', bg:'#F6EBEB', fg:'#7A2E2E'}]
        : a.dm!=null ? [{label:'DM', n:this.insN(a.dm), bar:'#6165DE', bg:'#EFEDFF', fg:'#3B3BA8'},{label:'HTN', n:this.insN(a.htn), bar:'#C35721', bg:'#FBEDE4', fg:'#9A4418'},{label:'Both', n:this.insN(a.both), bar:'#994242', bg:'#F6EBEB', fg:'#7A2E2E'}] : [];
      const n=ancOnly?hN:(a.dm!=null||a.hnb!=null)?parts.reduce((s,p)=>s+p.n,0):(split?nN+hN:this.insN(a.n)), open=st.insOpen===a.key;
      const rbars=split
        ? [{label:'Normal PW', n:nN+'', w:Math.min(100,Math.round(nN/nrmDen*100*4))+'%', color:'#2E9E6B', hasLabel:true},
           {label:'HRP', n:hN+'', w:(hrp?Math.min(100,Math.round(hN/hrp*100*4)):0)+'%', color:'#994242', hasLabel:true}]
        : [{label:'', n:'', w:(hrp?Math.min(100,Math.round(n/hrp*100)):0)+'%', color:a.color, hasLabel:false}];
      let people=(PEOPLE[a.pk||a.key]||[]);
      if(st.insSc && st.insSc!=='all') people=people.filter(p=>p.sc===sc.id);
      people=people.slice(0,3).map(p=>({name:p.name, meta:p.meta, pill:p.pill, initials:this.initials(p.name), avatarBg:AVA[p.name.length%AVA.length]}));
      const more=Math.max(0, n-people.length);
      return {key:a.key, label:a.label, sub:a.sub, color:a.color, soft:a.soft, value:n+'',
        isSplit:split, isSingle:!split, hN:hN+'', nN:nN+'', unit:S.unit||'PW',
        parts:parts.map(p=>({...p, n:p.n+'', grow:Math.max(p.n,0.0001)+''})), partCols:'repeat('+(parts.length||2)+',minmax(0,1fr))', hW:(n?Math.round(hN/n*100):0)+'%',
        w:(hrp?Math.min(100,Math.round(n/hrp*100)):0)+'%', bars:rbars,
        share: split ? ('Normal '+nN+' · HRP '+hN+' PW') : ancOnly ? (hrp?Math.round(n/hrp*100)+'% of HRPs':'—') : (hrp?Math.round(n/hrp*100)+'% of '+S.cohort:'—'),
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
    const sub=(lbl,o)=>{ const p=this.insPair(o.num,o.den); return {label:lbl, pct:p.pct+'%', frac:p.frac, w:p.w, color:p.color, soft:p.pct>=85?'#E4F5EC':(p.pct>=65?'#FBEDE4':'#F6EBEB')}; };
    const bars=(l)=>l.map(x=>{
      if(x.hrp){ const p=this.insPair(x.hrp.num,x.hrp.den); return {label:x.label, isPair:false, isSingle:true, subs:[], pct:p.pct+'%', frac:p.frac+' HRPs', w:p.w, color:p.color}; }
      if(x.dm) return {label:x.label, isTri:true, isPair:false, isSingle:false, subs:[['HTN',x.htn,'#C35721','#FBEDE4','#9A4418'],['DM',x.dm,'#6165DE','#EFEDFF','#3B3BA8'],['Both',x.both,'#994242','#F6EBEB','#7A2E2E']]
        .map(([l,o,bar,bg,fg])=>({...sub(l,o), bar, bg, fg}))};
      const p=this.insPair(x.num,x.den); return {label:x.label, isPair:false, isSingle:true, subs:[], pct:p.pct+'%', frac:p.frac+(x.unit?' '+x.unit:(x.num!=null&&S.trackSplit?' HRPs':'')), w:p.w, color:p.color}; });
    let track=this.insPair(B.track.num, B.track.den), trackSplit=null, trackLine=null;
    if(S.trackSplit){
      const TS=S.trackSplit, keys=TS.hrp?[['hrp','HRP']]:[['htn','HTN'],['dm','DM'],['both','Both']];
      const ps=keys.map(([k,l])=>({l, p:this.insPair(TS[k].num, TS[k].den)}));
      const num=ps.reduce((s,x)=>s+x.p.num,0), den=ps.reduce((s,x)=>s+x.p.den,0);
      track={num, den, pct:Math.round(num/den*100)};
      trackSplit=TS.hrp?null:ps.map(x=>({label:x.l, pct:x.p.pct+'%', frac:x.p.frac}));
      trackLine=num+' of '+den+' '+(TS.hrp?'HRPs':S.unit)+' had all their next steps closed';
    }

    const fmtD=d=>d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
    const isoD=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const [rA,rB]=this.insRangeDates(), rk=st.insRange||'30d';
    const RP=[['7d','7D'],['30d','30D'],['60d','60D']];
    return {
      rangeLabel: fmtD(rA)+' – '+fmtD(rB), calBg: rk==='custom'?'#fff':'transparent', calFg: rk==='custom'?ac:'#70706E', calSh: rk==='custom'?'0 1px 3px rgba(30,20,190,.14)':'none',
      rangeOpen: !!st.insRangeOpen, rangeChev: st.insRangeOpen?'M6 15l6-6 6 6':'M6 9l6 6 6-6',
      toggleRange: ()=>this.setState(st.insRangeOpen?{insRangeOpen:false}:{insRangeOpen:true, insRange:'custom', insFrom:st.insFrom||isoD(rA), insTo:st.insTo||isoD(rB)}),
      rangeChips: RP.map(([k,l])=>({label:l, bg:rk===k?'#fff':'transparent', fg:rk===k?ac:'#70706E', sh:rk===k?'0 1px 3px rgba(30,20,190,.14)':'none', onTap:()=>this.setState({insRange:k, insRangeOpen:false, insOpen:null})})),
      isCustom: rk==='custom', fromVal: isoD(rA), toVal: isoD(rB), maxDate:'2026-11-09',
      onFrom: e=>{ const v=e.target.value; if(v) this.setState({insRange:'custom', insFrom:v, insTo:(st.insTo&&st.insTo>=v)?st.insTo:isoD(rB)}); },
      onTo: e=>{ const v=e.target.value; if(v) this.setState({insRange:'custom', insTo:v, insFrom:(st.insFrom&&st.insFrom<=v)?st.insFrom:isoD(rA)}); },
      closeRange: ()=>this.setState({insRangeOpen:false}),
      hasView: !!vk,
      viewSegs: vk ? [{k:'fac', label:'My '+vk, sub:'Steps initiated or due here'}, {k:'catch', label:vk+' catchment', sub:'Women living in the area'}].map(v=>{
        const on=(v.k==='fac')===fv; return {label:v.label, sub:v.sub, bg:on?'#fff':'transparent', fg:on?'var(--ml-blue)':'var(--text-muted)', sfg:on?'var(--text-muted)':'#909090', sh:on?'0 1px 3px rgba(30,20,190,.14)':'none',
          onTap:()=>this.setState({insView:v.k, insSc:'all', insVil:null, insOpen:null, insLowerOpen:false})}; }) : [],
      hasScopes: this.insScList().length>1,
      scChips: this.insScList().map(s=>({label:s.label, ...chip((st.insSc||'all')===s.id, ac), onTap:()=>this.setState({insSc:s.id, insVil:null, insOpen:null})})),
      hasVillages: sc.villages.length>0 && this.insViewKind()!=='PHC',
      vilChips: sc.villages.length? [{label:'All villages', ...chip(!st.insVil, '#655AD0'), onTap:()=>this.setState({insVil:null})}].concat(
        sc.villages.map(v=>({label:v, ...chip(st.insVil===v, '#655AD0'), onTap:()=>this.setState({insVil:v})}))) : [],
      scopeLine: (sc.id==='all' ? sc.label : (INS_SCOPES[insK] ? sc.label : 'SC-HWC '+sc.label)) + (st.insVil?(' · '+st.insVil):'')
        + (['ins_dh','ins_tert'].indexOf(insK)>-1 ? ' · services at this facility' : '') + (fv ? ' · initiated or pending here' : ''),
      hrpPct: hrpPct+'%', hrp:hrp+'', registered:registered+'',
      hrpBar: Math.min(100, Math.round(hrpPct*3))+'%',
      seg:[{label:'Needs action', k:'actions'},{label:'Quality', k:'quality'},{label:'✦ Copilot', k:'copilot'}].map(s=>({label:s.label,
        bg:(st.insSeg||'actions')===s.k?'#fff':'transparent', fg:(st.insSeg||'actions')===s.k?ac:'#70706E',
        sh:(st.insSeg||'actions')===s.k?'0 1px 3px rgba(30,20,190,.14)':'none',
        onTap:()=>this.setState({insSeg:s.k})})),
      isActions:(st.insSeg||'actions')==='actions', isQuality:(st.insSeg||'actions')==='quality',
      isCopilot:st.insSeg==='copilot',
      copilotNode: st.insSeg==='copilot' ? this.copilotNode({S, svcKey, sc, insK, registered, hrp, hrpPct, rows, track, lowerNum, lowerDen}) : null,
      metricLabel: facilityOnly? S.metricFac : S.metric,
      headLine: facilityOnly? S.denLineFac(hrp, registered) : S.denLine(hrp, registered), unit:S.unit, refTitle:S.refTitle,
      secs:S.secs.map(x=>{
        const mx=(x.durs||[]).reduce((a,d)=>Math.max(a,d.days),0)||1;
        return {title:x.hrpTitle?(x.title+' · '+hrp+' HRPs'):x.title, sub:x.sub, hasPair:(x.rows||[]).some(r=>r.hrp),
          gridCols:(x.rows||[]).some(r=>r.dm)?'minmax(0,1fr) 62px 62px 62px':'minmax(0,1fr) 72px 72px',
          cols:(x.rows||[]).some(r=>r.dm)?[{label:'HTN',c:'#9A4418'},{label:'DM',c:'#3B3BA8'},{label:'Both',c:'#7A2E2E'}]:[{label:'HRP',c:'#994242'},{label:'Normal',c:'#1B6B47'}],
          colHead:(x.rows||[]).some(r=>r.dm)?'Step':'Visit', hasBars:!!x.rows, bars:bars(x.rows||[]),
          hasDur:!!x.durs, durs:(x.durs||[]).map(d=>({label:d.label, days:d.days+'', note:d.note,
            w:Math.round(d.days/mx*100)+'%', color:d.days>7?'#C35721':'#2E9E6B'}))};
      }),
      attnN:(svcKey==='ANC'? rows.reduce((a,r)=>a+parseInt(r.hN,10),0) : rows.reduce((a,r)=>a+parseInt(r.value,10),0))+'',
      attnLbl: svcKey==='ANC'?'HRPs need attention':svcKey==='NCD'?'NCD patients need attention':(S.cohort+' need attention'),
      rows, actionTotal: rows.reduce((a,r)=>a+parseInt(r.value,10),0)+' '+(S.trackSplit?'PW':S.cohort)+' need an action',
      ref:{total:total+' '+S.cohort+' referred', segs:segs.map(s=>({label:s.label, color:s.color, n:s.n+'', w:(s.n/total*100)+'%', pct:Math.round(s.n/total*100)+'%'}))},
      lower:{pct:Math.round(lowerNum/lowerDen*100)+'%', frac:lowerNum+' of '+lowerDen+' '+S.cohort+' referred',
        open:!!st.insLowerOpen, chev: st.insLowerOpen?'M6 15l6-6 6 6':'M6 9l6 6 6-6',
        onToggle:()=>this.setState({insLowerOpen:!st.insLowerOpen}),
        mix:mix.map(m=>({label:m.label, n:m.n+'', w:(m.n/mixMax*100)+'%'}))},
      showRef: !S.hideRef,
      track:{pct:track.pct+'%', deg:track.pct+'%', line:trackLine||(track.num+' of '+track.den+' '+S.cohort+' '+S.trackLine),
        hasSplit:!!trackSplit, split:trackSplit||[]},
      ...(()=>{ const isNcd=svcKey==='NCD', N=Math.max(1, rows.reduce((a,r)=>a+parseInt(r.value,10),0));
        const active=isNcd?registered:hrp, u=isNcd?'NCD patients':'HRPs';
        const st=[['Needing attention',N,'#E5322D'],['Tracked by ASHAs / ANMs',Math.round(N*.88),'#F59E0B'],['Tracked by Care Coordinators',Math.round(N*.75),'#1E6BF5'],['Steps closed',Math.round(N*.65),'#22B45E']];
        return {showOutreach: svcKey==='ANC'||isNcd,
          kpiTurn:(isNcd?'5.6':'4.2')+' days', kpiActive:active+'', kpiActiveLbl:isNcd?'Active NCD patients':'Active HRPs',
          outRate:Math.round(st[3][1]/N*100)+'% success rate', outDone:st[3][1]+' '+u+' completed',
          funnel:st.map(([l,n,c],i)=>({label:(i+1)+'. '+l, val:n+' ('+Math.round(n/N*100)+'%)', w:Math.round(n/N*100)+'%', c}))}; })(),
    };
  }

  // ---------- nav ----------
  pickRole(r){ const t=(ROLES[r].tabs||['lookup','worklist','alerts'])[0]; this.setState({role:r, screen:t, tab:t, selId:null, query:'', dialog:null, filter:'ALL'}); }
  switchRole(){ this.setState({screen:'launcher', role:null, folder:null, sub:null, dialog:null, cap:null, selId:null}); }
  pickUser(u){ this.setState({signIn:u}); }
  doSignIn(){
    const u=this.state.signIn; if(!u) return;
    this.setState({signIn:null, nsRole:u.k, lkAll:true});
    const r=ROLES[u.k];
    const scr=u.screen||(r.tabs||['lookup','worklist','alerts'])[0];
    this.setState({role:u.k, screen:scr, tab:scr, svc:u.svc||'ANC', selId:null, query:'', dialog:null,
      filter:'ALL', riskFilter:'ALL', insSeg:'actions'});
  }
  setTab(t){
    const st=this.state, ns=st.nsRole;
    if(t==='microcoach'){ const mk=NS2MC[ns]; if(!mk) return; this.setState({role:mk, screen:'mcdash', tab:'mcdash', mc:null, selId:null, dialog:null}); return; }
    if(ROLES[st.role] && ROLES[st.role].coach && ns){ this.setState({role:ns, screen:t, tab:t, selId:null, dialog:null, cap:null, mc:null, ...(t==='lookup'?{lkAll:true, query:''}:{})}); return; }
    this.setState({screen:t, tab:t, selId:null, dialog:null, ...(t==='lookup'?{lkAll:true, query:''}:{})}); }
  primaryRec(w){ if(!w) return w; const L=this.linkedOf(w), ncd=L.find(x=>x.svc==='NCD');
    if(this.isCombo(w)){ const a=L.find(x=>['ANC','DELIVERY'].indexOf(x.svc||'ANC')>-1 && !this.staleAnc(x) && !this.pregOver(x)); return a||w; }
    if(ncd && this.pregOver(w)) return ncd; return w; }
  openWoman(id){ const w=this.primaryRec(this.byId(id)); if(w && w.id!==id){ const k=w.svc||'ANC'; this.setState({svc:k, sub:k, screen:'journey', selId:w.id, dialog:null}); return; } this.setState({screen:'journey', selId:id, dialog:null}); }
  openRegister(){ if(this.state.role==='asha'){ this.toast('ASHAs cannot register beneficiaries. Send her to the AAM.'); return; } const pre=Array.isArray(arguments[0])?arguments[0]:[this.svc()];
    this.setState({screen:'register', dialog:null, reg:{svcs:pre.filter(k=>SVC[k] && !(this.state.role==='asha' && (k==='NCD'||k==='CANCER'))), dod:'', name:'', phone:'', district:'', village:'', abha:'', lmp:'', status:'normal', nbStatus:'normal', delPlace:'INST', birthOut:'LIVE', bp:'normal', bg:'normal', consent:true, cond:'HTN', scr:[], dx:[]}}); }
  setReg(patch){ this.setState({reg:{...(this.state.reg||{}), ...patch}}); }
  regGroups(r, pair, k){
    const out=[];
    if(k==='NCD'){
      out.push({title:'Condition', note:'Sets the register he or she is followed up in — no readings are stored here.',
        opts:pair(r.cond||'HTN', [{k:'HTN',label:'Hypertension'},{k:'DM',label:'Diabetes'},{k:'BOTH',label:'Both'}], (x)=>this.setReg({cond:x}))});
    } else if(k==='PNC'){
      out.push({title:'Birth outcome', note:'Same fields as recording a delivery.',
        opts:pair(r.birthOut||'LIVE', [{k:'LIVE',label:'Live birth'},{k:'STILL',label:'Still birth',danger:true}], (x)=>this.setReg({birthOut:x, ...(x==='STILL'?{nbStatus:'normal'}:{})}))});
      out.push({title:'Place of delivery', note:'Home or transit adds a day-1 HBNC visit. PNC runs 42 days from the delivery date.',
        opts:pair(r.delPlace||'INST', [{k:'INST',label:'Institution'},{k:'HOME',label:'Home'},{k:'TRANSIT',label:'Transit'}], (x)=>this.setReg({delPlace:x}))});
      {
      out.push({title:'Woman status', note:'Routing label only — no danger-sign detail is collected (NS-12).',
        opts:pair(r.status, [{k:'normal',label:'Normal'},{k:'high',label:'High risk',danger:true}], (x)=>this.setReg({status:x}))});
      if((r.birthOut||'LIVE')!=='STILL') out.push({title:'Newborn status', note:'Flags the baby separately — low birth weight, preterm or referred.',
        opts:pair(r.nbStatus||'normal', [{k:'normal',label:'Normal'},{k:'high',label:'High risk',danger:true}], (x)=>this.setReg({nbStatus:x}))});
      }
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
      if(this.state.role!=='asha')
      if(false) out.push({title:'Pregnancy status', note:'Routing label only — no reason or threshold is collected. PHC and above can override an AAM marking; SDH / DH / tertiary can override a PHC marking.',
        opts:pair(r.status, [{k:'normal',label:'Normal'},{k:'high',label:'High risk',danger:true}], (x)=>this.setReg({status:x}))});
    }
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
        nDone('ANC',['ANC_VISIT'])+' ANC done'),
      phase('Delivered', this.fmtLong(w.dod)+' · '+w.delPlace, 'DEL', '#994242', '#F7E3E3', []),
      phase('Postnatal & newborn', 'Jun – Jul 2026', 'PNC', SVC.PNC.ac, SVC.PNC.sf, grp('PNC').map(item),
        nDone('PNC',['HBNC'])+' HBNC · '+nDone('PNC',['PNC_VISIT','NB_CHECK'])+' facility PNC'),
      phase('Hypertension care · now', 'Since Jul 2026', 'NOW', SVC.NCD.ac, SVC.NCD.sf, grp('NCD').map(item)),
    ];
    return {
      name:this.lname(w), nameHi:'', initials:this.initials(w.name), sub:this.vl(w),
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
  ashaFor(v){ const f=VILLAGES.concat(FBD_WARDS, USN_VILLAGES).find(x=>x.name===v); return f?f.asha:'—'; }
  saveReg(){
    const r=this.state.reg||{}, role=this.state.role, R=ROLES[role];
    const svcs=(r.svcs||[]).filter(k=>!(role==='asha' && (k==='NCD'||k==='CANCER')));
    if(svcs.filter(k=>['ANC','DELIVERY','PNC'].includes(k)).length>1){ this.toast('HRP and PNC cannot be selected together'); return; }
    if(svcs.includes('NCD') && svcs.some(k=>['ANC','DELIVERY','PNC'].includes(k))){ this.toast('Select only one — HRP or NCD — at registration.'); return; }
    const digits=(r.phone||'').replace(/\D/g,'').slice(-10);
    const mappedD=MAPPED_DISTRICTS.includes(r.district);
    if(!r.name.trim() || digits.length<10 || !r.district || (r.district==='Faridabad' && !r.village)){ this.toast('Name, mobile, Faridabad stay and village / ward are required'); return; }
    if(!svcs.length){ this.toast('Pick at least one service'); return; }
    const preg=svcs.some(k=>k==='ANC'||k==='DELIVERY');
    if(preg && !r.lmp){ this.toast('LMP is required for ANC'); return; }
    if(preg && this.diff(r.lmp)<0){ this.toast('LMP cannot be after today'); return; }
    if(preg && this.diff(r.lmp)>300){ this.toast('Over 42 weeks · confirm LMP and gestational age, or register under PNW/NB with delivery details'); return; }
    if(svcs.includes('PNC') && !r.dod){ this.toast('Date of delivery is required for PNC'); return; }
    if(svcs.includes('PNC') && this.diff(r.dod)<0){ this.toast('Date of delivery cannot be after today'); return; }
    const outside=!mappedD;
    if(outside && role==='asha' && svcs.includes('CANCER')){ this.toast('You cannot register her for cancer care. Send her to the AAM.'); return; }
    const mat=svcs.some(k=>['ANC','DELIVERY','PNC'].includes(k));
    const nrAsha=(outside && !r.vFree && r.village)?this.ashaFor(r.village):'';
    const asha=(r.vFree||!r.village)?null:this.ashaFor(r.village);
    const CONDL={HTN:'Hypertension', DM:'Type 2 diabetes', BOTH:'Diabetes + hypertension'};
    const n=this.state.women.length, pid='w'+(n+1)+'n';
    const recs=svcs.map((k,i)=>({id:i===0?pid:(pid+k.toLowerCase()), pid, svc:k, name:r.name.trim(), hi:'', phone:'+91'+digits, district:r.district,
      village:!mappedD?'Outside Faridabad (NR)':r.village, vhi:'', age:null,
      lmp:((k==='ANC'||k==='DELIVERY')?(r.lmp||null):null), dod:(k==='PNC'?(r.dod||null):null),
      delPlace:(k==='PNC'?({HOME:'Home',TRANSIT:'Transit'}[r.delPlace]||'Institution'):null), birthOutcome:(k==='PNC'?((r.birthOut||'LIVE')==='STILL'?'Still birth':'Live birth'):undefined),
      cond:(k==='NCD'?CONDL[r.cond||'HTN']:(k==='CANCER'?this.cancerCond(r):null)), since:(k==='NCD'||k==='CANCER')?this.fmt(TODAY_ISO):null, g:null, p:null,
      risk: ((k==='ANC'||k==='DELIVERY') || (k==='PNC' && r.status==='high') || (k==='CANCER' && ((r.scr||[]).length || (r.dx||[]).length)))?'HRP':'Normal',
      htnUnc:false, dmUnc:false, nbRisk:(k==='PNC' && r.nbStatus==='high'),
      sc:r.vFree?'No ASHA mapping · '+R.facility:(outside?'Outside mapped catchment':R.facility), asha, nrAsha, outside, regBy:role, regFac:R.facility, regName:R.name,
      hrpBy:null, riskPending:false,
      abha:r.abha||'', consent:!!r.consent, steps:[]}));
    if(outside && (role==='asha'||role==='anm')) recs.forEach((x,i)=>{
      const base={status:'OPEN', rem:null, owner:role, by:R.short+' · '+R.facility, created:TODAY_ISO};
      const in7=this.iso(new Date(TODAY.getTime()+7*86400000));
      if(x.svc==='ANC') x.steps=[{...base, id:'s'+Date.now()+i, reg:'ANC', cat:'ANC_VISIT', level:'SUBCENTRE', due:in7}];
      else if(x.svc==='PNC'){ const nx=(this.hbncPlan(x)||[]).find(p=>this.diff(p.date)<=0);
        x.steps=nx?[{...base, id:'s'+Date.now()+i, reg:'PNC', cat:'HBNC', level:'SUBCENTRE', due:nx.date, hday:nx.day, hbnc:true, owner:'asha'}]
          :[{...base, id:'s'+Date.now()+i, reg:'PNC', cat:'PNC_VISIT', level:'SUBCENTRE', due:in7}]; } });
    const k0=svcs[0];
    this.setState({women:[...recs, ...this.state.women], svc:k0, sub:k0, screen:'journey', selId:pid, reg:null});
    this.toast(recs[0].name+' registered · '+svcs.map(k=>SVC[k].label).join(' + ')+' · '+(outside?(this.nrTag(recs[0])+' · added to your worklist'):('linked ASHA '+asha)));
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
    this.setState({dialog:{type:'act', stepId, exp:'complete'}});
  }
  isHiLang(){ return this.state.lang==='hi'; }
  lname(w){ return (this.isHiLang()&&w.hi)?w.hi:w.name; }
  vl(w){ return (this.isHiLang()&&w.vhi)?w.vhi:w.village; }
  nm(w){ return this.lname(w)+(w.outside?' · '+this.nrTag(w):''); }
  facShort(lv){ return {SUBCENTRE:'AAM', PHC:'PHC', CHC:'CHC', SDH:'SDH', DH:'DH', TERTIARY:'TC'}[lv] || (LVL[lv]&&LVL[lv].short) || lv; }
  stepById(id){ let f=null; this.allSteps().forEach(({s,w})=>{ if(s.id===id) f={s,w}; });
    if(!f) this.state.women.forEach(w=>(w.steps||[]).forEach(s=>{ if(s.id===id) f={s,w}; })); return f; }
  patchStep(id, patch){ const ws=this.state.women.map(w=>({...w, steps:w.steps.map(s=> s.id!==id ? s : {...s, ...patch})})); this.setState({women:ws}); }
  actMarkComplete(id){ this.setState({dialog:{type:'close', stepId:id, outcome:null, src:null}}); }
  actCall(id){ const f=this.stepById(id); this.toast('Dialling '+(f?f.w.name:'her')+'…'); }
  actIncomplete(id, why){ const role=ROLES[this.state.role];
    this.patchStep(id,{incomplete:why, idate:TODAY_ISO, iby:role.short+' · '+role.facility});
    this.setState({dialog:null}); this.toast('Marked incomplete · step stays open until marked complete'); }
  actLogAttempt(id, why){ const f=this.stepById(id); if(!f) return; const role=ROLES[this.state.role], by=role.short+' · '+role.facility;
    if(why==='NO_ANSWER'){ this.patchStep(id,{rem:'failed', unreach:(f.s.unreach||0)+1}); this.setState({dialog:null}); this.toast('No answer · step stays open'); return; }
    const label = why==='DIED' ? 'Deceased' : why==='AWAY' ? 'Temporarily away' : 'Migrated';
    this.setState(st=>({dialog:null, women:st.women.map(w=>w.id!==f.w.id?w:{...w, exitReason:label,
      steps:w.steps.map(x=>x.status==='OPEN'?{...x, status:'CANCELLED', creason:label, cdate:TODAY_ISO, cby:by}:x)})}));
    this.toast(label+' · all open steps for '+f.w.name+' closed'); }
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
    const ownAam = this.state.role==='anm' && stepLevel==='SUBCENTRE';
    const facility = (this.state.role!=='asha' && this.state.role!=='anm') || ownAam;
    const ready = facility ? !!d.outcome : (d.outcome==='NO_CONTACT' || (d.outcome && d.src));
    if(!ready) return;
    this.applyClose(d.stepId, d.outcome, d.src);
  }
  facDoneOpts(s){
    const st=this.state, role=ROLES[st.role], myL=role.level;
    if(st.role==='asha' || myL==='TERTIARY' || myL==='DH' || s.cat==='HBNC') return [];
    if(['SUBCENTRE','PHC','CHC','SDH','DH'].indexOf(myL)<0) return [];
    const me=(role.facility||this.facShort(myL)).replace('Sub-centre','AAM');
    const recName=(s.fac && DFAC[s.fac]) ? DFAC[s.fac].label : (((LVL[s.level]||{}).facility||this.facShort(s.level))+'').replace('Sub-centre','AAM');
    const other=[{k:'OTHER_PUBLIC_FACILITY',l:'At another public facility'},{k:'PRIVATE_PROVIDER',l:'At a private facility'}];
    if(this.atMyFac(s, role)) return [{k:'AT_THIS_FACILITY',l:me},{k:'OTHER_PUBLIC_FACILITY',l:'Govt'},{k:'PRIVATE_PROVIDER',l:'Private'}];
    const warn=LADDER.indexOf(myL)<LADDER.indexOf(s.level) ? ('Closed at '+this.facShort(myL)+' in place of '+this.facShort(s.level)) : '';
    return [{k:'AT_THIS_FACILITY',l:me, warn},{k:'AT_REFERRED_FACILITY',l:recName},{k:'OTHER_PUBLIC_FACILITY',l:'Govt'},{k:'PRIVATE_PROVIDER',l:'Private'}];
  }
  applyClose(stepId, outcome, src, care){
    const d={stepId, outcome, src};
    const role=ROLES[this.state.role];
    const done=d.outcome==='COMPLETED';
    // Care recorded on someone else's behalf (elsewhere) — the closer's own level is not where care happened
    const elsewhere = ['AT_REFERRED_FACILITY','OTHER_PUBLIC_FACILITY','PRIVATE_PROVIDER'].indexOf(d.src)>-1;
    const clev = done && !elsewhere ? role.level : null;
    const ws=this.state.women.map(w=>({...w, steps:w.steps.map(s=> s.id!==d.stepId ? s
      : {...s, status:done?'DONE':'OPEN', outcome:d.outcome, care:done?(care||null):null, cdate:done?TODAY_ISO:null, csrc:d.src||d.outcome, clevel:clev, cby:role.short+' · '+role.facility})}));
    let lower='';
    this.state.women.forEach(w=>w.steps.forEach(s=>{ if(s.id===d.stepId && done && clev && LADDER.indexOf(clev)<LADDER.indexOf(s.level)) lower='Closed at '+this.facShort(clev)+' in place of '+this.facShort(s.level); }));
    this.setState({women:ws, dialog:null});
    this.toast(done?(lower?(lower+' · flagged'):'Step closed · visible to every level'):'Outcome recorded · step stays open');
  }

  openSms(stepId){ this.setState({dialog:{type:'sms', stepId}}); }
  openScan(){ this.setState({dialog:{type:'scan'}}); }
  confirmScan(){ this.setState({dialog:null, query:'9812345022'}); this.toast('ABHA matched · Lakshmi Bai'); }

  // ---------- capture ----------
  overTerm(w){ if(['ANC','DELIVERY'].indexOf(w.svc||'ANC')<0 || w.dod || w.delivered || w.pregEnd || !w.lmp) return false; const g=this.weeks(w); return g!==null && g>42; }
  lifeOf(w){ const l=w&&(w.lifeStatus||w.exitReason); return l==='Temporarily away'?'Temporarily moved':(l==='Died'||l==='Death')?'Deceased':(l||null); }
  lifeVM(w){ const l=this.lifeOf(w), T=({'Temporarily moved':{bg:'#FFF4CC',fg:'#7A5600'}, 'Migrated':{bg:'#EFEDFF',fg:'#3B3BA8'}, 'Deceased':{bg:'#E4E4E7',fg:'#2A2A33'}})[l]||{};
    return {hasLife:!!l, lifeLabel:l||'', lifeBg:T.bg||'transparent', lifeFg:T.fg||'inherit', lifeRowBg:l?'#ECEBE7':'#fff', lifeOp:l?'0.62':'1', heroBg:l?'#77767F':'var(--ml-blue)',
      lifeNote:l?(l==='Deceased'?'Open steps closed · no new steps':'Open steps closed · new steps can still be added'):''}; }
  openLife(id){ this.setState({dialog:{type:'life', wid:id}}); }
  setLife(id, label){ const w=this.byId(id); if(!w) return; const pid=w.pid||w.id, role=ROLES[this.state.role]||{}, by=(role.short||'')+' · '+(role.facility||'');
    let n=0;
    const ws=this.state.women.map(x=>{ if((x.pid||x.id)!==pid) return x;
      if(!label){ const y={...x}; delete y.lifeStatus; delete y.exitReason; delete y.lifeDate; return y; }
      return {...x, lifeStatus:label, exitReason:undefined, lifeDate:TODAY_ISO, steps:x.steps.map(s=>{ if(s.status!=='OPEN') return s; n++; return {...s, status:'CANCELLED', creason:label, cdate:TODAY_ISO, cby:by}; })}; });
    this.setState({women:ws, dialog:null});
    this.toast(label ? (label+' · '+n+' open step'+(n===1?'':'s')+' closed') : 'Status cleared · active'); }
  openCapture(id){ const w=this.byId(id); if(w && this.lifeOf(w)==='Deceased'){ this.toast('Marked deceased · no new steps'); return; } if(w && this.svc()==='ANC' && (w.dod||w.delivered||w.pregEnd)){ this.toast('Pregnancy outcome recorded · no further HRP next steps'); return; } if(w && this.svc()==='ANC' && this.overTerm(w)){ this.toast('Over 42 weeks · confirm LMP and gestational age, or record pregnancy outcome'); return; } this.setState({screen:'capture', dialog:null, cap:{womanId:id, steps:[]}}); }
  setCap(patch){ this.setState({cap:{...this.state.cap, ...patch}}); }
  addStaged(st){ const c=this.state.cap; this.setCap({steps:[...c.steps, {sid:uid(), ...st}]}); }
  removeStaged(sid){ const c=this.state.cap; this.setCap({steps:this.state.cap.steps.filter(s=>s.sid!==sid)}); }

  openOption(cat){
    const role=ROLES[this.state.role];
    if(cat==='REFERRAL' && this.svc()==='DELIVERY') return this.setState({dialog:{type:'referral', sel:[], del:true}});
    if(cat==='IV_IS'||cat==='IV_FCM'){ const d=new Date(TODAY.getTime()+86400000); return this.setState({dialog:{type:'iv', cat, doses:cat==='IV_IS'?4:1, first:this.iso(d)}}); }
    if(cat==='DEL_NORMAL'||cat==='DEL_CSEC') return this.setState({dialog:{type:'deliv', cat, ddate:TODAY_ISO, disdate:''}});
    if(cat==='REFERRAL') return this.setState({dialog:{type:'referral', sel:[]}});
    if(cat==='PMSMA_VISIT') return this.setState({dialog:{type:'pmsma'}});
    if(cat==='REF_PW'||cat==='REF_NB') return this.setState({dialog:{type:'ashaRef', who:[cat==='REF_PW'?'PW':'NB'], lvl:'SUBCENTRE'}});
    if(cat==='HBNC'){ const w=this.byId(this.state.cap?this.state.cap.womanId:null);
      return this.setState({dialog:{type:'hbnc', sel:this.hbncDefault(w)}}); }
    if(cat==='IMAGING' && ((role.level==='PHC' && this.svc()!=='ANC') || (role.level==='CHC' && this.svc()==='CANCER'))){ const d=new Date(TODAY.getTime()+86400000); return this.setState({dialog:{type:'usg', date:this.iso(d), to:this.svc()==='CANCER'?'DH':'SDH', what:this.svc()==='CANCER'?'imaging':'ultrasound'}}); }
    if(DATED.indexOf(cat)>-1 || cat==='LAB' || cat==='IMAGING' || cat==='SPEC' || (cat==='FOLLOW_UP' && (this.svc()==='ANC'||this.svc()==='NCD'))){ const d=new Date(TODAY.getTime()+((this.svc()==='ANC')?(cat==='FOLLOW_UP'?7:1):(this.svc()==='NCD')?(cat==='FOLLOW_UP'?28:cat==='REFILL'?14:1):cat==='LAB'?0:cat==='ANC_VISIT'?14:cat==='BT'?1:cat==='HOME_PNC'?3:7)*86400000); const atd=this.atDefault(cat);
      if((cat==='LAB'||(cat==='FOLLOW_UP'&&(this.svc()==='ANC'||this.svc()==='NCD'))) && atd) return this.setState({dialog:{type:'anc', cat, date:this.iso(d), labSel:[atd], labDates:{[atd]:this.iso(d)}}});
      return this.setState({dialog:{type:'anc', cat, date:this.iso(d), at:atd}}); }
    this.addStaged({cat, level:role.level, sent:TODAY_ISO});
    this.toast(this.catLabel(cat, role.level)+' added · '+role.facility);
  }
  refMax(){ if(this.svc()==='DELIVERY') return 1; const lv=ROLES[this.state.role].level; return (lv==='PHC'||lv==='CHC'||lv==='SDH'||lv==='DH')?2:1; }
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
    const urg=this.urgOf(d);
    if(d.del){ sel.forEach(k=>this.addStaged({cat:'REFERRAL', level:DFAC[k].level, fac:k, sent:TODAY_ISO, urg})); this.setState({dialog:null}); return this.toast('Referral to '+DFAC[sel[0]].label+' ready to send'); }
    const due=(this.ncdDoc()||this.ncdSpec()) ? (d.date||this.iso(new Date(TODAY.getTime()+86400000))) : null;
    sel.forEach(k=>{ const t=this.refT(k); this.addStaged({cat:'REFERRAL', level:t.level, fac:t.fac, sent:TODAY_ISO, urg, ...(due?(this.ncdSpec()?{due, spec:true}:{due, doc:true}):{})}); });
    if(due){ this.setState({dialog:null}); return this.toast((this.ncdSpec()?'Specialist':'Doctor')+' consultation at '+sel.map(k=>this.refT(k).label).join(' & ')+' on '+this.fmtLong(due)+' ready to send'); }
    this.setState({dialog:null});
    this.toast(sel.length>1
      ? ('Referrals to '+sel.map(k=>this.refT(k).label).join(' & ')+' ready to send')
      : ('Referral to '+this.refT(sel[0]).label+' ready to send'));
  }
  atKeys(cat){ const r=ROLES[this.state.role]; if(!r.level || r.level==='SUBCENTRE') return null;
    if(this.svc()==='NCD'){
      if(cat==='LAB') return ['HERE'].concat(['PHC_DAY','PHC_CHI','CHC','SDH','DH','TERTIARY'].filter(k=>k!==r.level && !(DFAC[k] && DFAC[k].label===r.facility)));
      if(cat==='FOLLOW_UP') return ({PHC:['HERE','SUBCENTRE'], CHC:['HERE','PHC','SUBCENTRE'], SDH:['HERE','PHC','SUBCENTRE'], DH:['HERE','SDH','CHC','PHC'], TERTIARY:['HERE','DH','SDH','CHC']})[r.level]||null;
      return null; }
    if(this.svc()!=='ANC') return null;
    if(cat==='LAB') return ['HERE'].concat(['PHC_DAY','PHC_CHI','CHC','SDH','DH','TERTIARY'].filter(k=>k!==r.level && !(DFAC[k] && DFAC[k].label===r.facility)));
    if(cat==='IMAGING'||cat==='BT') return ['SDH','DH','TERTIARY'].map(k=>k===r.level?'HERE':k);
    if(cat==='SPEC'){ const up=['CHC','SDH','DH','TERTIARY'], i=up.indexOf(r.level); return up.slice(i+1); }
    if(cat==='FOLLOW_UP'){ const FU={PHC:['SUBCENTRE'], CHC:['PHC'], SDH:['PHC'], DH:['SDH','CHC','PHC'], TERTIARY:['DH','SDH','CHC']}[r.level]; return FU?['HERE'].concat(FU):null; }
    return null; }
  atDefault(cat){ const ks=this.atKeys(cat); if(!ks) return null; if(cat==='LAB'||cat==='FOLLOW_UP') return ks.indexOf('HERE')>-1?'HERE':ks[0]; if(cat==='SPEC') return ks[0]||null;
    if(ks.indexOf('HERE')>-1) return 'HERE'; return cat==='BT'?'DH':'SDH'; }
  atShort(k){ const r=ROLES[this.state.role]; if(k==='HERE') return 'This '+(r.level==='TERTIARY'?'TC':r.level);
    if(DFAC[k]) return DFAC[k].label; return k==='TERTIARY'?'TC':k==='SUBCENTRE'?'AAM':k; }
  atTarget(k){ const r=ROLES[this.state.role]; if(!k||k==='HERE') return {level:r.level, fac:null, name:r.facility, here:true};
    if(DFAC[k]) return {level:DFAC[k].level, fac:k, name:DFAC[k].label};
    return {level:k, fac:null, name:LVL[k].facility}; }
  toggleLabFac(k){ const d=this.state.dialog; let sel=(d.labSel||[]).slice(); const dates={...(d.labDates||{})};
    if(sel.indexOf(k)>-1){ if(sel.length===1) return; sel=sel.filter(x=>x!==k); delete dates[k]; }
    else { if(sel.length>=2){ const drop=sel.shift(); delete dates[drop]; } sel.push(k); dates[k]=dates[k]||d.date||TODAY_ISO; }
    this.setState({dialog:{...d, labSel:sel, labDates:dates}}); }
  confirmLab(){ const d=this.state.dialog, role=ROLES[this.state.role], sel=d.labSel||[], dates=d.labDates||{};
    if(!sel.length || sel.some(k=>!dates[k])) return;
    sel.forEach(k=>{ const t=this.atTarget(k);
      this.addStaged({cat:d.cat||'LAB', level:t.level, ...(t.fac?{fac:t.fac}:{}), due:dates[k], ...(t.here?{}:{autoRef:true, fromLevel:role.level, fromFac:role.facility})}); });
    this.setState({dialog:null});
    this.toast((d.cat==='FOLLOW_UP'?'Follow up':'Lab')+' scheduled · '+sel.map(k=>this.atTarget(k).name+' '+this.fmt(dates[k])).join(' & ')); }
  confirmDated(){
    const d=this.state.dialog; if(d.labSel) return this.confirmLab(); if(!d.date) return;
    const role=ROLES[this.state.role];
    if(d.at){ const t=this.atTarget(d.at);
      this.addStaged({cat:d.cat, level:t.level, ...(t.fac?{fac:t.fac}:{}), due:d.date, ...(t.here?{}:{autoRef:true, fromLevel:role.level, fromFac:role.facility})});
      this.setState({dialog:null});
      return this.toast(CAT[d.cat].label+(t.here?' at '+t.name:' referred to '+t.name+' · notified')+' · '+this.fmt(d.date)); }
    const btRef=d.cat==='BT' && ['PHC','CHC'].indexOf(role.level)>-1;
    this.addStaged({cat:d.cat, level:d.cat==='HOME_PNC'?'SUBCENTRE':btRef?'DH':role.level, due:d.date, ...(btRef?{autoRef:true, fromLevel:role.level, fromFac:role.facility}:{})});
    this.setState({dialog:null});
    this.toast(btRef?('Blood transfusion referred to DH · '+this.fmt(d.date)+' · DH notified'):(CAT[d.cat].label+' set for '+this.fmt(d.date)));
  }
  nextUsg(){ let d=new Date(TODAY.getTime()); do { d=new Date(d.getTime()+86400000); } while(d.getDay()!==3); return this.iso(d); }
  confirmUsg(){
    const date=(this.state.dialog||{}).date; if(!date) return;
    const d2=this.state.dialog||{}; const to=d2.to||'SDH', what=d2.what||'ultrasound';
    this.addStaged({cat:'IMAGING', level:to, due:date, usg:true, usgTo:to, usgWhat:what});
    this.setState({dialog:null});
    this.toast('Referred to '+to+' for '+what+' · '+this.fmt(date));
  }
  pmsmaLevel(){ const role=ROLES[this.state.role]; return role && role.level && role.level!=='SUBCENTRE' && LVL[role.level] ? role.level : 'PHC'; }
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
    ['PW','NB'].filter(k=>who.indexOf(k)>-1).forEach(k=>{ const t=this.refT(d.lvl); this.addStaged({cat:'REFERRAL', level:t.level, fac:t.fac, sent:TODAY_ISO, who:k, urg:this.urgOf(d)}); });
    this.setState({dialog:null});
    const tl=this.refT(d.lvl).label;
    this.toast(who.length>1 ? ('Mother and newborn referred to '+tl) : ((who[0]==='PW'?'Mother':'Newborn')+' referred to '+tl));
  }
  // PNW/NB eligibility: 42 days from date of delivery (set when the delivery date is recorded)
  pncEnd(w){ if(!w||!w.dod) return null; return this.iso(new Date(new Date(w.dod+'T00:00:00').getTime()+42*86400000)); }
  pncOpen(w){ const e=this.pncEnd(w); return !e || this.diff(e)<=0; }
  hbncDays(w){ return (w && (w.delPlace==='Home'||w.delPlace==='Transit')) ? [1,3,7,14,21,28,42] : [3,7,14,21,28,42]; }
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
      .forEach(p=>this.addStaged({cat:'HBNC', level:'SUBCENTRE', due:p.date, hday:p.day, hbnc:true}));
    this.setState({dialog:null});
    this.toast(sel.length+' HBNC visit'+(sel.length>1?'s':'')+' added · shown to ASHA of her village');
  }
  refT(k){ if(DFAC[k]) return {level:DFAC[k].level, fac:k, label:DFAC[k].label, facility:DFAC[k].sub};
    const lm=LVL[k]; return {level:k, fac:null, label:lm.label, facility:lm.facility}; }
  expandPhc(keys){ const out=[]; keys.forEach(k=>{ if(k==='PHC'){ out.push('PHC_DAY','PHC_CHI'); } else out.push(k); }); return out; }
  ivGap(cat){ return cat==='IV_IS'?2:7; }
  ivPlan(d){ const b=new Date((d.first||TODAY_ISO)+'T00:00:00'), g=this.ivGap(d.cat);
    return Array.from({length:d.doses||1},(_,i)=>({dose:i+1, date:this.iso(new Date(b.getTime()+i*g*86400000))})); }
  confirmIv(){ const d=this.state.dialog; if(!d.first) return; const role=ROLES[this.state.role];
    const plan=this.ivPlan(d);
    plan.forEach(p=>this.addStaged({cat:d.cat, level:role.level, due:p.date, dose:p.dose, doses:plan.length}));
    this.setState({dialog:null}); this.toast(CAT[d.cat].label+' · '+plan.length+' dose'+(plan.length>1?'s':'')+' scheduled'); }
  autoPnc(ws, wid, dod, place){
    const src=ws.find(x=>x.id===wid); if(!src) return ws;
    const pid=src.pid||src.id, role=ROLES[this.state.role]||{};
    const by=(role.short||'')+' · '+(role.facility||'');
    const has=ws.some(x=>(x.pid||x.id)===pid && x.svc==='PNC');
    let out=ws.map(x=>{ if((x.pid||x.id)!==pid || ['ANC','DELIVERY'].indexOf(x.svc||'ANC')<0) return x;
      return {...x, pid, dod, delivered:true, delPlace:place,
        steps:x.steps.map(s=>(s.status==='OPEN' && (s.reg||x.svc||'ANC')==='ANC')?{...s, status:'CANCELLED', creason:'Delivered — moved to PNC', cdate:TODAY_ISO, cby:by}:s)}; });
    if(!has){
      const keep=['name','hi','phone','village','vhi','abha','sc','asha','consent','outside','regBy','regFac','regName','district','nrAsha'];
      const nw={svc:'PNC', id:'p'+(9000+Math.floor(Math.random()*900)), pid, dod, delPlace:place, risk:src.risk==='HRP'?'HRP':'Normal', nbRisk:false, steps:[], autoFrom:src.svc||'ANC'};
      keep.forEach(f=>{ if(src[f]!==undefined) nw[f]=src[f]; });
      out=out.concat([nw]);
    } else out=out.map(x=>((x.pid||x.id)===pid && x.svc==='PNC')?{...x, dod, delPlace:place}:x);
    return out; }
  confirmDelivered(){ const d=this.state.dialog, w=this.byId(d.wid); if(!w || !d.out) return;
    if(d.out==='Abortion' || d.out==='Maternal death'){ const role=ROLES[this.state.role]||{}, by=(role.short||'')+' · '+(role.facility||''), pid=w.pid||w.id, death=d.out==='Maternal death';
      this.setState(st=>({dialog:null, screen:'lookup', women:st.women.map(x=>(x.pid||x.id)!==pid ? x : (death || ['ANC','DELIVERY'].indexOf(x.svc||'ANC')>-1)
        ? {...x, pregEnd:d.out, pregEndDate:TODAY_ISO, ...(death?{exitReason:'Deceased'}:{}),
           steps:x.steps.map(s=>s.status==='OPEN' && (death || (s.reg||x.svc||'ANC')==='ANC') ? {...s, status:'CANCELLED', creason:'Pregnancy completed', pcOut:d.out, cdate:TODAY_ISO, cby:by} : s)} : x)}));
      return this.toast(d.out+' recorded for '+w.name+' · open steps closed · Pregnancy completed'); }
    if(!d.date) d.date=TODAY_ISO;
    if(this.diff(d.date)<0) return this.toast('Date of delivery cannot be after today');
    const pid0=w.pid||w.id;
    const role=ROLES[this.state.role]||{}, by=(role.short||'')+' · '+(role.facility||'');
    const ws=this.state.women.map(x=>(x.pid||x.id)!==pid0 || ['ANC','DELIVERY'].indexOf(x.svc||'ANC')<0 ? x : {...x, dod:d.date, birthOutcome:'Delivery', delivered:true,
      steps:x.steps.map(s=>s.status==='OPEN' && (s.reg||x.svc||'ANC')==='ANC' ? {...s, status:'CANCELLED', creason:'Pregnancy completed', pcOut:'Delivery', cdate:TODAY_ISO, cby:by} : s)});
    const ncd=ws.find(x=>(x.pid||x.id)===pid0 && x.svc==='NCD');
    if(ncd){ this.setState({women:ws, dialog:null, selId:ncd.id, svc:'NCD', sub:'NCD', screen:'journey'}); return this.toast('Delivered · HRP closed · continuing NCD care for '+w.name); }
    this.setState({women:ws, dialog:null, selId:w.id, screen:'journey'});
    this.toast('Delivery recorded for '+w.name+' · open steps closed · Pregnancy completed'); }
  linkedOf(w){ const p=w.pid||w.id; return (this.state.women||[]).filter(x=>(x.pid||x.id)===p); }
  addableSvcs(w){ const recs=this.linkedOf(w), have=recs.map(x=>x.svc||'ANC');
    const matRecs=recs.filter(x=>['ANC','DELIVERY','PNC'].indexOf(x.svc||'ANC')>-1);
    const activeMat=matRecs.some(x=>!this.pregOver(x)), hasNcd=have.indexOf('NCD')>-1;
    const out=[];
    if(!hasNcd && matRecs.length) out.push('NCD');
    if(hasNcd && !activeMat && w.sex!=='M') out.push('ANC');
    return out; }
  canAddSvc(w){ const k=this.state.role; if(!k || k==='asha' || /^mc_/.test(k) || /^ins_/.test(k)) return false; return this.addableSvcs(w).length>0; }
  addSvc(w, dl){ const k=dl.pick, pid=w.pid||w.id, role=ROLES[this.state.role];
    const id={ANC:'a',PNC:'p',NCD:'n',CANCER:'c'}[k]+(9000+Math.floor(Math.random()*900));
    const keep=['name','hi','phone','village','vhi','abha','sc','asha','consent','outside','regBy','regFac','regName','district','sex'];
    const nw={svc:k, id, pid, steps:[], since:this.fmt(TODAY_ISO), addedBy:role.short+' · '+role.facility};
    keep.forEach(f=>{ if(w[f]!==undefined) nw[f]=w[f]; });
    if(k==='ANC'){ nw.lmp=dl.date; nw.risk='HRP'; nw.riskPending=false; }
    if(k==='PNC'){ nw.dod=dl.date; nw.delPlace=dl.cond==='Home'?'Home delivery':'Institutional delivery'; nw.risk='Normal'; }
    if(k==='NCD'){ nw.cond=dl.cond==='HTN & DM'?'Diabetes + hypertension':dl.cond==='Diabetes'?'Type 2 diabetes':'Hypertension'; nw.risk='Normal'; }
    if(k==='CANCER'){ nw.cond=dl.cond+' screen positive'; nw.risk='HRP'; }
    const ws=this.state.women.map(x=>(x.id===w.id && !x.pid)?{...x, pid}:x).concat([nw]);
    this.setState({women:ws, dialog:null, svc:k, sub:k, selId:id, screen:'journey'});
    this.toast(w.name+' added to '+SVC[k].label+' · same profile'); }
  hrpRank(l){ return {SUBCENTRE:1,PHC:2,CHC:2,SDH:3,DH:3,TERTIARY:4}[l]||0; }
  isPhcUp(){ const k=this.state.role; if(!k || k==='asha' || k==='anm' || /^mc_|^ins_/.test(k)) return false; return this.hrpRank((ROLES[k]||{}).level)>=2; }
  setCat(id, patch, msg){ const role=ROLES[this.state.role];
    const ws=this.state.women.map(w=>w.id!==id?w:{...w, ...patch, catBy:role.short+' · '+role.facility, catDate:TODAY_ISO});
    this.setState({women:ws, dialog:null}); this.toast(msg+' · visible to every level'); }
  pncEdit(w){ const k=this.state.role; if(!k || /^mc_|^ins_/.test(k) || (w.svc||'ANC')!=='PNC') return false; return k!=='asha' || w.risk!=='HRP' || !w.nbRisk; }
  anmEsc(w){ const k=this.state.role; return false && !!k && k!=='asha' && !/^mc_|^ins_/.test(k) && (ROLES[k]||{}).level==='SUBCENTRE' && ['ANC','DELIVERY'].indexOf(w.svc||'ANC')>-1 && (w.risk!=='HRP'||!!w.riskPending); }
  canSetHrp(w){ const k=this.state.role; if(true || !k || k==='asha' || /^mc_/.test(k)) return false;
    const my=ROLES[k].level, by=w.hrpBy||(w.risk==='HRP'?'SUBCENTRE':null);
    return !by || my===by || this.hrpRank(my)>this.hrpRank(by); }
  hrpOverriders(by){ const r=this.hrpRank(by), N={PHC:'PHC',CHC:'CHC',DH:'SDH / DH',TERTIARY:'tertiary care'};
    return ['PHC','CHC','DH','TERTIARY'].filter(l=>this.hrpRank(l)>r).map(l=>N[l]).filter((v,i,a)=>a.indexOf(v)===i).join(', '); }
  setHrp(id, val){ const role=ROLES[this.state.role];
    const ws=this.state.women.map(w=>w.id!==id?w:{...w, risk:val, riskPending:false, hrpBy:role.level, hrpByName:role.short+' · '+role.facility, hrpDate:TODAY_ISO});
    this.setState({women:ws, dialog:null}); this.toast(val==='HRP'?'Marked HRP · visible to every level':'Marked normal'); }
  capSvc(){ const w=this.byId(this.state.cap?this.state.cap.womanId:null); return (this.state.svc)||(w&&w.svc)||'ANC'; }
  urgOf(d){ return (['ANC','DELIVERY'].indexOf(this.capSvc())>-1 && !(this.state.role==='anm'&&this.capSvc()==='ANC')) ? ((d&&d.urg)||'ROUTINE') : null; }
  confirmDeliv(){
    const d=this.state.dialog; if(!d.ddate) return; const role=ROLES[this.state.role];
    if(d.disdate && d.disdate<d.ddate) return this.toast('Discharge date cannot be before the delivery date');
    this.addStaged({cat:d.cat, level:role.level, ddate:d.ddate, disdate:d.disdate||null});
    this.setState({dialog:null}); this.toast(this.catLabel(d.cat, role.level)+' · '+this.fmt(d.ddate));
  }
  saveCapture(){
    const c=this.state.cap; if(!c.steps.length) return;
    const role=this.state.role;
    const fresh=c.steps.map(s=>({id:uid(), cat:s.cat, level:s.level, due:s.due||null, sent:s.sent||null, status:'OPEN', rem:null, owner:role, session:!!s.session, usg:!!s.usg, usgTo:s.usgTo||null, usgWhat:s.usgWhat||null, hbnc:!!s.hbnc, hday:s.hday||null, who:s.who||null, fac:s.fac||null, autoRef:!!s.autoRef, fromLevel:s.fromLevel||null, fromFac:s.fromFac||null, urg:s.urg||null, doc:!!s.doc, dose:s.dose||null, doses:s.doses||null, ddate:s.ddate||null, disdate:s.disdate||null}));
    const R=ROLES[role];
    fresh.forEach(s=>{ if(s.cat==='DEL_NORMAL'||s.cat==='DEL_CSEC') Object.assign(s,{status:'DONE', cdate:s.ddate, csrc:'AT_CLOSING_FACILITY', clevel:s.level, cby:R.short+' · '+R.facility}); });
    const del=fresh.find(s=>s.ddate);
    let ws=this.state.women.map(w=> w.id!==c.womanId ? w : {...w, ...(del?{dod:del.ddate, delPlace:'Institution'}:{}), steps:[...w.steps, ...fresh]});

    this.setState({women:ws, screen:'journey', cap:null});

    this.toast(fresh.length+' step'+(fresh.length>1?'s':'')+' saved · reminders scheduled');
  }

  lvShort(level, fac){ if(fac && DFAC[fac]) return DFAC[fac].label; return ({SUBCENTRE:'AAM',PHC:'PHC',CHC:'CHC',SDH:'SDH',DH:'DH',TERTIARY:'TC'})[level]||level; }
  route(s){ const name=(s.fac && DFAC[s.fac]) ? DFAC[s.fac].label : ((LVL[s.level]||{}).facility||this.lvShort(s.level));
    return '· Due at '+name; }
  atMyFac(s, role){ return (s.fac && DFAC[s.fac]) ? DFAC[s.fac].label===role.facility : s.level===role.level; }
  initByMe(s, role){ const o=ROLES[s.owner]; return !!o && o.level===role.level && o.facility===role.facility; }
  chip(active, tone){ return active ? {bg:tone||'#1E14BE', fg:'#fff', bd:tone||'#1E14BE'} : {bg:'#fff', fg:'#2A2826', bd:'#DEDDD8'}; }

  stepVM(s, w){
    const urg=((s.reg||(w&&w.svc)||this.state.svc)==='PNC')?null:s.urg;
    const cm=CAT[s.cat], lm=s.fac?{...LVL[s.level], label:DFAC[s.fac].label, facility:DFAC[s.fac].label}:LVL[s.level];
    const open=s.status==='OPEN';
    const isRef=s.cat==='REFERRAL';
    let title=this.catLabel(s.cat, s.level), dueColor='#70706E', dueLabel='';
    if(isRef) title=(this.ncdDoc()?'Doctor consultation at ':(s.reg||this.svc())==='NCD' && this.ncdSpec()?'Specialist consultation at ':'Referral to ')+lm.label;
    if(isRef && s.who) title='Referral · '+(s.who==='PW'?'PN woman':'Newborn')+' → '+lm.label;
    if(s.session) title='PMSMA session · '+lm.facility;
    if(s.hbnc) title='HBNC visit · Day '+s.hday;
    if(s.doses) title=CAT[s.cat].label+' · Dose '+s.dose+' of '+s.doses;
    if(isRef && !s.who) title=s.doc?'Doctor consultation':(s.spec||((s.reg||this.svc())==='NCD' && this.ncdSpec()))?'Specialist consultation':'Referral';
    if(isRef && urg) title=(urg==='EMERGENCY'?'Emergency · ':'Routine · ')+title;
    if(s.who) title=title.replace(/ → .*$/,'');
    if(!s.session) title+=' '+this.route(s);
    if(!open){
      dueLabel=(s.ddate?('Delivered '+this.fmt(s.ddate)+(s.disdate?(' · discharged '+this.fmt(s.disdate)):'')):('Completed '+this.fmt(s.cdate)));
      dueColor='#1B6B47';
    } else if(isRef && !s.due){
      const d=this.diff(s.sent);
      dueLabel = d>=7 ? ('Awaiting '+lm.label+' · '+d+' days') : ('Sent '+this.fmt(s.sent)+' · awaiting '+lm.label);
      dueColor = d>=7 ? '#994242' : '#6165DE';
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
      if(s.incomplete) { dueLabel+=' · incomplete'; dueColor='#C35721'; }
    }
    const cl = s.clevel || null;
    const downgraded = !open && !!cl && LADDER.indexOf(cl) < LADDER.indexOf(s.level);
    const em = open && urg==='EMERGENCY';
    if(em) dueColor='#994242';
    return {icon:cm.icon, title, catLabel:this.catLabel(s.cat, s.level), lc:em?'#994242':lm.c, lsoft:em?'#F7E3E3':lm.s, levelLabel:lm.label, open, dueColor, dueLabel,
      careTxt:s.care==='FULL'?'Full care':s.care==='PARTIAL'?'Partial care':'', em, tc:em?'#994242':'var(--text-strong)', tcm:em?'#994242':'var(--text-muted)', cbg:em?'#FCF1F1':'var(--surface-card)', cbd:em?'#E8B4B4':'var(--border-subtle)',
      downgraded, downNote:downgraded?('Closed at '+this.facShort(cl)+' in place of '+this.facShort(s.level)):''};
  }

  hasScope(){ return ['anm','phc_sn','chc_sn','sdh_sn','del_phc','del_chc','del_sdh'].indexOf(this.state.role)>-1; }
  scope(){ return this.hasScope() ? (this.state.scopeFilter||'FACILITY') : 'FACILITY'; }
  isMat(w){ return ['ANC','DELIVERY','PNC'].indexOf(w.svc||'ANC')>-1; }
  nrTag(w){ if(!w.outside) return ''; if(this.isMat(w)){ if(w.regBy==='asha' || w.regBy==='anm') return 'NR (A)'; } return 'NR'; }
  nrVisible(w){
    const r=this.state.role, lv=(ROLES[r]||{}).level, mat=this.isMat(w);
    if(r==='asha') return mat && (w.regBy==='asha' || (w.regBy==='anm' && w.nrAsha===ROLES.asha.name));
    if(r==='anm'){ const ownAsha=w.regBy==='asha' && (!w.regName || AAM_ASHAS.indexOf(w.regName)>-1), ownAnm=w.regBy==='anm' && (!w.regFac || w.regFac===ROLES.anm.facility);
      return mat ? (ownAsha || ownAnm) : (ownAnm || (w.steps||[]).some(s=>s.level==='SUBCENTRE')); }
    return this.nrReg(w) || (w.steps||[]).some(s=>s.status==='OPEN' && this.atMyFac(s, ROLES[r]));
  }
  nrReg(w){ const r=this.state.role; return !!w.regBy && (w.regBy===r || w.regFac===(ROLES[r]||{}).facility); }
  hidesNR(){ const r=this.state.role, lv=(ROLES[r]||{}).level; return r==='asha' || lv==='SUBCENTRE' || lv==='PHC'; }
  inCatchment(w){
    const role=ROLES[this.state.role];
    if(w.outside) return this.nrVisible(w);
    if(role.level==='SUBCENTRE') return w.sc===role.facility;
    return true; // one PHC / CHC block in this deployment — every registered woman resides in it
  }
  combinedVM(grp){
    const st=this.state, role=ROLES[st.role];
    const sc=grp==='village' ? 'CATCHMENT' : 'FACILITY';
    const hiOnly=['sdh_sn','dh_sn','tert_sn','del_sdh','del_bk'].indexOf(st.role)>-1, isAsha=st.role==='asha';
    const rank=(s)=>{ if(s.status==='DONE') return 7; if(s.cat==='REFERRAL') return 2; if(!s.due) return 4; if(s.rem==='failed') return 3; const d=this.diff(s.due); return d>0?0:d===0?1:d>=-7?5:6; };
    const items=[];
    this.liveWomen().forEach(w=>w.steps.forEach(s=>{
      if(s.status!=='OPEN') return;
      if(w.outside && !this.nrVisible(w)) return;
      const k=s.reg||w.svc||'ANC';
      const ok = sc==='CATCHMENT' ? this.inCatchment(w) : hiOnly ? (this.atMyFac(s,role) || this.initByMe(s,role) || (w.outside && (w.regBy===this.state.role || w.regFac===role.facility))) : ((!w.outside || this.nrVisible(w)) && (isAsha || this.atMyFac(s,role) || s.owner===st.role || (w.outside && this.nrVisible(w))));
      if(ok) items.push({s,w,k,r:rank(s)});
    }));
    const tag=(k)=>({label:SVC[k].label, ac:SVC[k].ac, sf:SVC[k].sf});
    const open=(it)=>()=>this.setState({svc:it.k, sub:it.k, selId:it.w.id, screen:'journey', dialog:null});
    const line=(it)=>{ const vm=this.stepVM(it.s,it.w); const title=it.k==='CANCER'?vm.title.replace(/Ultrasound/g,'Imaging'):vm.title; return {svc:SVC[it.k].label, ac:SVC[it.k].ac, sf:SVC[it.k].sf, title, tc:vm.em?'#994242':'var(--text-body)', tcm:vm.em?'#994242':'var(--text-muted)', dueLabel:vm.dueLabel, dueColor:vm.dueColor, onOpen:open(it)}; };
    const STAT={overdue:{o:0,t:'Overdue',c:'#B42318',s:'#FDE8E6'}, unreach:{o:1,t:'Unreachable',c:'#A87800',s:'#FFF4CC'}, lost:{o:2,t:'Lost to follow-up',c:'#6B6B68',s:'#ECEBE7'},
      pending:{o:3,t:'Pending · 0–2 days',c:'#C35721',s:'#FBE7DC'}, upcoming:{o:4,t:'Upcoming',c:'#17834F',s:'#E3F6EC'}};
    const statOf=(s)=>{ const tn=this.stepTone(s); if(tn) return tn; return this.diff(s.due||s.sent||TODAY_ISO)>=0?'pending':'upcoming'; };
    const people={};
    items.forEach(it=>{ it.st=statOf(it.s); const key=it.w.pid||it.w.phone||it.w.name; (people[key]=people[key]||{w:it.w, name:this.nm(it.w), village:it.w.village||'—', items:[]}).items.push(it); });
    const P=Object.values(people).map(p=>{ p.items.sort((a,b)=>STAT[a.st].o-STAT[b.st].o || a.r-b.r);
      const f=p.items[0], st0=f.st, vm=this.stepVM(f.s,f.w), ics=this.svcIcons(f.w), rt=this.riskTag(f.w);
      const dueText=st0==='lost'?((f.s.status==='DECLINED'||f.s.csrc==='DECLINED')?'Declined':'No reply'):this.abbr(vm.dueLabel);
      return {name:p.name, village:p.village+(this.archived(f.w)?' · Archived':''), rowBg:this.archived(f.w)?'#ECEBE7':'#fff', stat:st0, ord:STAT[st0].o, n:p.items.length, onOpen:open(f), initials:this.initials(p.name),
        hasIcons:ics.length>0, noIcons:!ics.length, mainIc:ics[0]||{}, extraIcs:ics.slice(1),
        riskLabel:rt.label, riskBg:rt.bg, riskFg:rt.fg, phoneMask:this.mask(f.w.phone),
        dueText, dueFg:STAT[st0].c, stepTitle:this.abbr(f.k==='CANCER'?vm.title.replace(/Ultrasound/g,'Imaging'):vm.title),
        more:p.items.length>1?('+'+(p.items.length-1)+' more'):'', hasMore:p.items.length>1}; })
      .sort((a,b)=>a.ord-b.ord || b.n-a.n);
    const secs=Object.keys(STAT).map(k=>{ const rows=P.filter(p=>p.stat===k); return {title:STAT[k].t, dot:STAT[k].c, pill:STAT[k].s, count:rows.length+'', rows}; }).filter(x=>x.rows.length);
    const vil={};
    P.forEach(p=>{ (vil[p.village]=vil[p.village]||[]).push(p); });
    const vKeys=Object.keys(vil).sort((a,b)=>vil[b].filter(p=>p.ord===0).length-vil[a].filter(p=>p.ord===0).length || a.localeCompare(b));
    const openV=st.wlVil===undefined ? (vKeys[0]||null) : st.wlVil;
    const V=vKeys.map(v=>{ const ps=vil[v], isOpen=openV===v;
      const cnt=['overdue','unreach','lost'].map(k=>({n:ps.filter(p=>p.stat===k).length, c:STAT[k].c, s:STAT[k].s, t:STAT[k].t})).filter(x=>x.n).map(x=>({label:x.n+' '+x.t.toLowerCase(), ac:x.c, sf:x.s}));
      return {name:v, count:ps.length+(ps.length>1?' beneficiaries':' beneficiary'), stats:cnt, isOpen, chev:isOpen?'M6 15l6-6 6 6':'M6 9l6 6 6-6',
        onToggle:()=>this.setState({wlVil:isOpen?null:v}), people:ps}; });
    return {people:P, sections:secs, villages:V, empty:P.length===0};
  }
  worklistVM(allSvc, raw, keepF){
    const role=ROLES[this.state.role]; const f=(allSvc||(raw&&!keepF)||['ANC','PNC','NCD'].indexOf(this.svc())>-1)?'ALL':this.state.filter;
    const rf=(allSvc||(raw&&!keepF))?'ALL':(this.state.riskFilter||'ALL');
    const isAsha=this.state.role==='asha';
    const sc=this.scope();
    const hiOnly=['sdh_sn','dh_sn','tert_sn','del_sdh','del_bk'].indexOf(this.state.role)>-1;
    const cmb=allSvc && this.comboOn();
    const src=allSvc ? (()=>{ const o=[]; this.liveWomen().forEach(w=>{ if(cmb && !this.isCombo(w)) return; w.steps.forEach(s=>o.push({s,w})); }); return o; })() : this.allSteps();
    const mine=src.filter(({s,w})=> !(w.outside && !this.nrVisible(w)) && (sc==='CATCHMENT'
        ? this.inCatchment(w)
        : hiOnly
          ? (this.atMyFac(s,role) || this.initByMe(s,role) || (w.outside && (w.regBy===this.state.role || w.regFac===role.facility)))
          : (!w.outside || this.nrVisible(w)) && (isAsha || this.atMyFac(s,role) || s.owner===this.state.role || (w.outside && this.nrReg(w)))) && (f==='ALL'||(f==='INCOMPLETE'?!!s.incomplete:s.cat===f))
      && (rf==='ALL' || (this.svc()==='PNC'
            ? (rf==='MOTHER' ? w.risk==='HRP' : rf==='NEWBORN' ? !!w.nbRisk : true)
            : this.svc()==='NCD'
              ? ((()=>{const d=/diabet/i.test(w.cond||''), hy=/hyperten/i.test(w.cond||''); return rf==='DM' ? (d&&!hy) : rf==='HTN' ? (hy&&!d) : rf==='BOTH' ? (d&&hy) : true;})())
              : (rf==='HRP' ? (w.risk==='HRP' && !w.riskPending) : (w.risk!=='HRP' && !w.riskPending)))));
    const b={overdue:[],today:[],incoming:[],pending:[],soon:[],unreach:[],partial:[],closed:[],lost:[],od1:[],unr3:[],pend2:[],up7:[]};
    const ancWl=keepF && !allSvc && this.svc()==='ANC';
    mine.forEach(({s,w})=>{
      if(ancWl && s.cat==='REFERRAL') return;
      if(s.status==='DONE'){ if(s.cdate===TODAY_ISO) b.closed.push({s,w}); return; }
      const tn=this.stepTone(s);
      if(tn==='lost') b.lost.push({s,w}); else if(tn==='unreach') b.unr3.push({s,w}); else if(tn==='overdue') b.od1.push({s,w});
      if(s.status==='DECLINED'||s.status==='CANCELLED'||tn==='lost') return;
      if(s.rem==='failed'){ b.unreach.push({s,w}); return; }
      const d=this.diff(s.due||s.sent||TODAY_ISO);
      const T=this.odDays(s,w);
      if(d>=1&&d<=T.pend&&d<T.od) b.pend2.push({s,w}); else if(d<=0&&d>=-7) b.up7.push({s,w});
      if(d>3) b.overdue.push({s,w});
      else if(d>=1) b.pending.push({s,w});
      else if(d===0) b.today.push({s,w});
      else if(d>=-3) b.soon.push({s,w});
    });
    if(raw) return b;
    const row=({s,w})=>{ const vm=this.stepVM(s,w); return {icon:vm.icon, lc:vm.lc, lsoft:vm.lsoft, tcm:vm.tcm, cbg:vm.cbg, cbd:vm.cbd,
      womanName:this.nm(w), stepLine:vm.title+' · '+w.village+(this.scope()==='CATCHMENT'?(' · '+LVL[s.level].short):''), dueColor:vm.dueColor, dueLabel:vm.dueLabel,
      gestLabel:[this.metaA(w),this.flagShort(w)].filter(Boolean).join(' · '),
      gestFg:w.riskPending?'#5C5B57':(this.isHigh(w)?'var(--ml-burnt-orange)':'#1B6B47'), gestBg:w.riskPending?'#ECEBE7':(this.isHigh(w)?'var(--ml-peach)':'#D9F7E8'),
      downgraded:vm.downgraded, downNote:vm.downNote,
      onOpen:()=>this.openWoman(w.id)}; };
    const defs=[
      {key:'overdue', title:'Overdue · open more than 3 days', dot:'#994242', pillBg:'#F7E3E3'},
      {key:'pending', title:'Pending actions · open 1–3 days', dot:'#1E14BE', pillBg:'#EFEDFF'},
      {key:'today', title:'Due today', dot:'#C35721', pillBg:'#FBE7DC'},
      {key:'soon', title:'Due soon · next 3 days', dot:'#6165DE', pillBg:'#E7E7FB'},
      {key:'unreach', title:'Unreachable', dot:'#909090', pillBg:'#ECEBE7'},
    ];
    const late=({s})=>this.diff(s.due||s.sent||TODAY_ISO);
    Object.keys(b).forEach(k=>b[k].sort((x,y)=>late(y)-late(x)));
    return defs.filter(x=>b[x.key].length).map(x=>({title:x.title, dot:x.dot, pillBg:x.pillBg, count:b[x.key].length+'', rows:b[x.key].map(row)}));
  }

  takeActionVM(allSvc, mode){
    const st=this.state, role=ROLES[st.role], myL=role.level, b=this.worklistVM(allSvc, true, mode==='wl');
    const hiFac=myL==='TERTIARY'||myL==='DH', facLvl=['PHC','CHC','SDH','DH','TERTIARY'].indexOf(myL)>-1;
    const expId=st.taExp, doneId=st.taDone, showAll=st.taAll||{};
    const I={call:'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
      wa:'M21 11.5a8.4 8.4 0 0 1-12.2 7.5L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z', done:'M20 6L9 17l-5-5',
      res:'M12 7v5l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z', nr:'M3 3l18 18M10.7 5.1A16 16 0 0 1 21 6M5 9a11 11 0 0 1 3-2M8.5 12.5a6 6 0 0 1 7 0M12 17h.01',
      dec:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17 8l5 5M22 8l-5 5', inc:'M18 6L6 18M6 6l12 12', more:'M5 12h.01M12 12h.01M19 12h.01'};
    const B=(label,icon,bg,fg,bd,onTap)=>({label,icon,bg,fg,bd,onTap});
    const shut=()=>this.setState({taExp:null, taDone:null});
    const row=({s,w})=>{ const vm=this.stepVM(s,w), isH=s.cat==='HBNC', ex=expId===s.id;
      const nudge=!isH && !hiFac;
      const askWhere=!isH && st.role==='asha';
      const phcTrack=!isH && (myL==='PHC'||myL==='CHC') && s.level!==myL;
      const lowerWarn=facLvl && LADDER.indexOf(myL)<LADDER.indexOf(s.level) ? ('Closed at '+this.facShort(myL)+' in place of '+this.facShort(s.level)) : '';
      const facOpts=this.facDoneOpts(s);
      const doneOpts = askWhere ? [{k:'AT_REFERRED_FACILITY',l:((s.fac&&DFAC[s.fac])?DFAC[s.fac].label:(((LVL[s.level]||{}).facility||this.facShort(s.level))+'').replace('Sub-centre','AAM'))},{k:'OTHER_PUBLIC_FACILITY',l:'Govt'},{k:'PRIVATE_PROVIDER',l:'Private'}] : facOpts;
      const onDone = doneOpts.length ? ()=>this.setState({taDone:doneId===s.id?null:s.id}) : ()=>{ shut(); this.applyClose(s.id,'COMPLETED',hiFac?'AT_THIS_FACILITY':null); };
      const doneLbl = 'Done';
      const acts = (hiFac||isH)
        ? [B(doneLbl,I.done,'#E6F8EE','#17834F','#BFE8D2',onDone),
           ...(hiFac && s.level===myL ? [B('Yet to arrive',I.res,'#FBE7DC','#8A3D14','#EDC2A8',()=>{ shut(); this.toast('Yet to arrive · step stays open'); })] : [])]
        : [ B(doneLbl,I.done,'#E6F8EE','#17834F','#BFE8D2',onDone),
            B('No reply',I.nr,'#FFF5E6','#B8650E','#F6D7A8',()=>{ shut(); this.actLogAttempt(s.id,'NO_ANSWER'); }),
            B('Declined',I.dec,'#FDECEC','#C62F2F','#F3BDBD',()=>{ shut(); this.actDeclined(s.id); }) ];
      const ics=this.svcIcons(w);
      return {hasIcons:ics.length>0, noIcons:!ics.length, mainIc:ics[0]||{}, extraIcs:ics.slice(1), icon:vm.icon, lc:vm.lc, womanName:this.nm(w), initials:this.initials(w.name), phoneMask:this.mask(w.phone),
        stepLine:vm.title+' · '+vm.dueLabel, stepTitle:this.abbr(vm.title), ...(()=>{ const tn=this.stepTone(s), att=s.rem==='failed'?(s.unreach||3):(s.unreach||0);
          const dd=this.diff(s.due||s.sent||TODAY_ISO), days=dd>0?(dd+(dd===1?' day':' days')):dd===0?'Today':('In '+(-dd)+(dd===-1?' day':' days'));
          if(tn==='lost') return {dueText:days, dueFg:'#6B6B68'};
          if(tn==='unreach') return {dueText:days, dueFg:'#A87800'};
          return {dueText:days, dueFg:vm.dueColor||'#4A4A55'}; })(), onEdit:()=>this.openLife(w.id), tagLine:w.village+(this.lifeOf(w)?' · '+this.lifeOf(w):'')+(this.archived(w)?' · Archived':''), riskLabel:this.riskTag(w).label, riskBg:this.riskTag(w).bg, riskFg:this.riskTag(w).fg,
        isIncomplete:!!s.incomplete, downgraded:vm.downgraded, downNote:vm.downNote,
        isExp:ex, isArch:this.archived(w), xBg:ex?'#F1F6FF':(this.archived(w)?'#ECEBE7':'#fff'), xLine:ex?'#1E6BF5':(this.archived(w)?'#B5B3AD':'transparent'), avBg:ex?'#fff':'#F0F0F5', avFg:ex?'#1E6BF5':'#2A2A33',
        chBg:ex?'#1E6BF5':'#EEF0F6', chFg:ex?'#fff':'#1E6BF5', chev:ex?'M6 15l6-6 6 6':'M6 9l6 6 6-6',
        onToggle:()=>this.setState({taExp:ex?null:s.id, taDone:null}), actions:acts, doneAct:acts[0], restActs:acts.slice(1), hasRest:acts.length>1, inlineActs:hiFac, stackActs:!hiFac, restStack:!hiFac && acts.length>1, actCount:acts.length+'', doneCols:doneOpts.length===4?2:Math.max(1,doneOpts.length),
        hasLowWarn:false, lowWarn:'Done will close as: '+lowerWarn,
        showDone:ex && doneId===s.id, showPend:ex && doneId===s.id+'#p',
        pendOpts:[{k:'AWAY',l:'Temporarily moved'},{k:'MIGRATED',l:'Migrated'},{k:'DIED',l:'Deceased'}].map(o=>({label:o.l, onTap:()=>{ shut(); this.actLogAttempt(s.id,o.k); }})),
        doneOpts:doneOpts.map(o=>({label:o.l, warn:'', hasWarn:false, onTap:()=>{ shut(); this.applyClose(s.id,'COMPLETED',o.k); if(o.warn) setTimeout(()=>this.toast(o.warn),1600); }})),
        onOpen:()=>this.openWoman(w.id)}; };
    const defs=mode==='wl' ? [
      {key:'pend2', title:'Pending · 0–2 days', fg:'#A87800', bg:'#FFF4CC'},
      {key:'up7', title:'Upcoming · next 7 days', fg:'#17834F', bg:'#E3F6EC'},
    ] : [
      {key:'od1', title:'Overdue', fg:'#B42318', bg:'#FFF5F5', icon:'M12 7v5l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z'},
      {key:'pend2', title:'Pending', fg:'#A87800', bg:'#FFF4CC'},
      {key:'up7', title:'Due soon · next 7 days', fg:'#17834F', bg:'#E3F6EC'},
      {key:'unr3', title:'Unreachable', fg:'#A87800', bg:'#FFF8E1', icon:'M3 3l18 18M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4'},
      {key:'lost', title:'Lost to follow-up', fg:'#6B6B68', bg:'#F3F3F1', icon:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17 8l5 5M22 8l-5 5'},
    ];
    const late=({s})=>this.diff(s.due||s.sent||TODAY_ISO);
    Object.keys(b).forEach(k=>b[k].sort((x,y)=>late(y)-late(x)));
    const secs=defs.filter(x=>b[x.key].length).map(x=>{ const all=b[x.key], open=!!showAll[x.key], more=all.length>1;
      return {title:x.title, countLabel:all.length+'', count:all.length, fg:x.fg, bg:x.bg, icon:x.icon, hasMore:more, viewLabel:open?'Show less':'Expand all',
        onViewAll:()=>this.setState(s2=>({taAll:{...(s2.taAll||{}), [x.key]:!open}})),
        rows:(open||!more?all:all.slice(0,1)).map(row)}; });
    const ds=this.delivSection(allSvc, mode, B, I, shut);
    if(ds) secs.push(ds);
    return secs;
  }
  delivSection(allSvc, mode, B, I, shut){
    const st=this.state, role=ROLES[st.role]; if(!role || /^mc_|^ins_/.test(st.role||'')) return null;
    if(!allSvc && this.svc()!=='ANC') return null;
    const hiOnly=['sdh_sn','dh_sn','tert_sn','del_sdh','del_bk'].indexOf(st.role)>-1, wl=mode==='wl';
    const list=(st.women||[]).filter(w=>(w.svc||'ANC')==='ANC' && !w.dod && !w.delivered && !w.pregEnd && w.lmp && !(w.outside && !this.nrVisible(w)) && (!this.comboOn() || this.isCombo(w))
      && ((hiOnly && this.scope()!=='CATCHMENT') ? (w.steps.some(s=>this.atMyFac(s,role)) || (w.outside && this.nrVisible(w))) : this.inCatchment(w)))
      .map(w=>({w, dd:this.diff(this.edd(w))})).filter(({dd})=> wl ? (dd>=0 && dd<=15) : (dd>=15 && dd<=30)).sort((a,b2)=>b2.dd-a.dd);
    if(!list.length) return null;
    const key=wl?'delExp':'delPend', open=!!(st.taAll||{})[key], more=list.length>1;
    const row=({w,dd})=>{ const id='del:'+w.id, ex=st.taExp===id, rt=this.riskTag(w);
      const dIcs=this.svcIcons(w);
      return {hasIcons:dIcs.length>0, noIcons:!dIcs.length, mainIc:dIcs[0]||{}, extraIcs:dIcs.slice(1), womanName:this.nm(w), initials:this.initials(w.name), phoneMask:this.mask(w.phone),
        dueText: dd>0?('EDD +'+dd+' days'):dd===0?'EDD today':('EDD in '+(-dd)+' days'), dueFg: wl?(dd>0?'#A87800':'#17834F'):'#B42318',
        onEdit:()=>this.openLife(w.id), stepTitle: wl?'Expected delivery':'Delivery not recorded', tagLine:w.village+' · EDD '+this.fmt(this.edd(w))+(this.archived(w)?' · Archived':''),
        riskLabel:rt.label, riskBg:rt.bg, riskFg:rt.fg, isIncomplete:false, downgraded:false, downNote:'',
        isExp:ex, isArch:this.archived(w), xBg:ex?'#F1F6FF':(this.archived(w)?'#ECEBE7':'#fff'), xLine:ex?'#1E6BF5':(this.archived(w)?'#B5B3AD':'transparent'), avBg:ex?'#fff':'#F0F0F5', avFg:ex?'#1E6BF5':'#2A2A33',
        chBg:ex?'#1E6BF5':'#EEF0F6', chFg:ex?'#fff':'#1E6BF5', chev:ex?'M6 15l6-6 6 6':'M6 9l6 6 6-6',
        onToggle:()=>this.setState({taExp:ex?null:id, taDone:null}),
        actions:[B('Record pregnancy outcome',I.done,'#E6F8EE','#17834F','#BFE8D2',()=>{ shut(); this.setState({dialog:{type:'delivered', wid:w.id, date:'', cond:null, out:null}}); })],
        hasLowWarn:false, lowWarn:'', showDone:false, showPend:false, pendOpts:[], doneOpts:[], restActs:[], hasRest:false, doneCols:1, doneAct:B('Record pregnancy outcome',I.done,'#E6F8EE','#17834F','#BFE8D2',()=>{ shut(); this.setState({dialog:{type:'delivered', wid:w.id, date:'', cond:null, out:null}}); }), onOpen:()=>this.openWoman(w.id)}; };
    return {title: wl?'Expected delivery · EDD to EDD + 15 days':'Pending delivery', countLabel:list.length+'', count:list.length,
      fg: wl?'#994242':'#B42318', bg: wl?'#F7E3E3':'#FFF5F5', icon:'M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z',
      hasMore:more, viewLabel:open?'Show less':'Expand all', onViewAll:()=>this.setState(s2=>({taAll:{...(s2.taAll||{}), [key]:!open}})),
      rows:(open||!more?list:list.slice(0,1)).map(row)};
  }

  alertTier(){ const r=this.state.role, lv=(ROLES[r]||{}).level;
    if(r==='asha') return 0; if(lv==='SUBCENTRE') return 1; if(lv==='PHC') return 2;
    if(lv==='CHC'||lv==='SDH') return 3; return 4; }
  alertRules(){ const t=this.alertTier();
    return ({0:['HRP PW — next step missed by 2 days','HTN / DM — next step missed by 3 days'],
      1:['HRP PW — next step missed by 1 day','HTN / DM — next step missed by 3 days','HRP PW — missed by 2 days and no update by ASHA / ANM'],
      2:['HRP PW — missed by 3 days and no update by ASHAs / ANMs','HTN / DM — missed by 5 days and no update by ASHA / ANM'],
      3:['HRP PW — missed by 5 days and no update by ASHAs / ANMs','HTN / DM — missed by 7 days and no update by ASHA / ANM'],
      4:['HRP PW — next step missed by 3 days','HTN / DM — next step missed by 5 days']})[t]; }
  alertSubject(w,s){ const k=s.reg||w.svc||'ANC';
    if(k==='ANC'||k==='DELIVERY') return (w.risk==='HRP' && !w.riskPending)?{who:'HRP PW',T:1,hi:true}:null;
    if(k==='NCD'){ const c=w.cond||'', d=/diabet/i.test(c), h=/hyperten/i.test(c);
      return {who:d&&h?'HTN + DM':d?'DM':'HTN',T:3,hi:false,ncd:true}; }
    return null; }
  alertsVM(){
    const st=this.state, role=ROLES[st.role], t=this.alertTier(), out=[];
    const svcOn=st.lkAll===false ? this.svc() : null;
    const WHO=['','ASHA / ANM','ASHAs / ANMs','ASHAs / ANMs',''][t]||'';
    this.liveWomen().forEach(w=>w.steps.forEach(s=>{
      if(s.status!=='OPEN') return;
      const k=s.reg||w.svc||'ANC';
      if(k==='CANCER') return;
      if(svcOn && !(k===svcOn || (svcOn==='ANC'&&k==='DELIVERY'))) return;
      const sub=this.alertSubject(w,s); if(!sub) return;
      const d=this.diff(s.due||s.sent||TODAY_ISO), mine=this.atMyFac(s,role);
      const ALERT_T={0:{hrp:[['MISSED',2]], ncd:[['MISSED',3]]},
      1:{hrp:[['MISSED',1],['NO_UPDATE',2]], ncd:[['MISSED',3]]},
      2:{hrp:[['NO_UPDATE',3]], ncd:[['NO_UPDATE',5]]},
      3:{hrp:[['NO_UPDATE',5]], ncd:[['NO_UPDATE',7]]},
      4:{hrp:[['MISSED',3]], ncd:[['MISSED',5]]}};
      if(t===4){ if(!mine) return; }
      else {
        if(w.outside && !this.nrVisible(w) && !(t===3&&mine)) return;
        const inScope = t===0 ? true : t===3 ? (this.inCatchment(w)||mine) : this.inCatchment(w);
        if(!inScope) return; }
      const rules=ALERT_T[t][sub.ncd?'ncd':'hrp']; let hit=null;
      rules.forEach(([type,T])=>{ if(d>=T) hit={type,T}; });
      if(!hit) return;
      out.push({s,w,sub,d,type:hit.type,g:hit.T});
    }));
    const rank={INC_HR:0,NO_UPDATE:1,MISSED:2,INC_NCD:3};
    out.sort((a,b)=>(b.sub.hi-a.sub.hi)||(rank[a.type]-rank[b.type])||(b.d-a.d));
    return out.map(({s,w,sub,d,type,g})=>{
      const vm=this.stepVM(s,w), at=/ at /i.test(vm.catLabel||'') ? vm.catLabel : (vm.catLabel+' at '+vm.levelLabel);
      const LBL={MISSED:'Missed', NO_UPDATE:'No update', INC_HR:'Incoming · no update', INC_NCD:'Incoming NCD'};
      const tone = type==='INC_NCD' ? '#B7791F' : type==='INC_HR' ? '#994242' : type==='NO_UPDATE' ? '#655AD0' : (sub.hi?'#994242':'#C35721');
      const msg = type==='MISSED' ? (at+' missed by '+d+(d===1?' day':' days')+'.')
        : type==='NO_UPDATE' ? (at+' missed by '+d+(d===1?' day':' days')+' · no update by '+(sub.ncd?'ASHA / ANM':WHO)+'.')
        : type==='INC_HR' ? (at+' · due '+this.fmt(s.due||s.sent)+' · no update for '+d+' days.')
        : (at+' missed by '+d+' days · no update at any level.');
      return {womanName:this.nm(w), village:w.village, tone, typeLabel:LBL[type], who:sub.who, message:msg,
        acked:!!(this.state.acked||{})[s.id],
        onOpen:()=>this.openWoman(w.id), onCall:()=>{ if(w.phone) window.location.href='tel:'+w.phone; this.toast('Dialling '+w.name+'…'); },
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
    return {title:(this.isHiLang()&&m.hi)?m.hi:m.title, hi:'', cat:m.cat, kind:m.kind, mins:m.mins+' min',
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
  mcVoice(){ return this.state.mcVoice || {phase:'idle', qi:0, lang:this.state.lang==='hi'?'hi':'en', playing:false}; }
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
      vm.mod={title:(this.isHiLang()&&m.hi)?m.hi:m.title, hi:'', cat:m.cat, kind:m.kind, ac,
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
    const st=this.state, keys=['ANC','NCD'];
    if(st.role && ROLES[st.role] && ROLES[st.role].coach){
      const R=ROLES[st.role];
      return ['mcdash','coach','training','library','ask'].map(k=>{ const on=st.tab===k;
        return {label:TABMETA[k].label, ac:R.accent, on, onTap:()=>this.setState({screen:k, tab:k, mc:null, dialog:null}),
          bg:on?'var(--ml-blue)':'var(--surface-card)', fg:on?'#fff':'var(--text-body)', bd:on?'var(--ml-blue)':'var(--border-default)'}; });
    }
    const insMode = st.folder==='insights' || st.screen==='insights';
    const subs = FOLDERS.capture.subs;
    const inApp = st.role && st.screen!=='launcher' && !insMode;
    const lkAllOn = inApp && st.screen==='lookup' && st.lkAll!==false;
    const comboOn = lkAllOn && !!st.lkCombo;
    const allOn = inApp && ((st.screen==='worklist' && st.wlMode==='all') || (lkAllOn && !comboOn));
    const allChip = inApp ? [{label:'All', ac:'#010101', on:allOn,
      onTap:()=>st.screen==='lookup' ? this.setState({lkAll:true, lkCombo:false, selId:null, dialog:null, cap:null, query:''}) : this.setState({wlMode:'all', screen:'worklist', tab:'worklist', selId:null, dialog:null, cap:null, query:''}),
      bg:allOn?'var(--ml-blue)':'var(--surface-card)', fg:allOn?'#fff':'var(--text-body)', bd:allOn?'var(--ml-blue)':'var(--border-default)'}] : [];
    const comboChip = inApp ? [{label:'HRP + NCD', ac:'#8A3D14', on:comboOn,
      onTap:()=>this.setState({screen:'lookup', tab:'lookup', lkAll:true, lkCombo:true, selId:null, dialog:null, cap:null, query:''}),
      bg:comboOn?'#8A3D14':'var(--surface-card)', fg:comboOn?'#fff':'var(--text-body)', bd:comboOn?'#8A3D14':'var(--border-default)'}] : [];
    return allChip.concat(keys.map(k=>{
      const M=SVC[k], on = !allOn && !comboOn && (insMode ? (st.svc||'ANC')===k : (st.nsRole ? (st.svc||'ANC')===k : (st.folder==='capture' && st.sub===k)));
      const label = ({ANC:'HRP',PNC:'PNW/NB',NCD:'NCDs'})[k] || (insMode ? M.label : subs[k].name), accent = insMode ? M.ac : subs[k].accent;
      return {label, ac:accent, on,
        onTap: insMode
          ? ()=>this.setState({svc:k, sub:st.folder==='capture'?k:st.sub, selId:null, dialog:null, cap:null, filter:'ALL', riskFilter:'ALL', insOpen:null, insLowerOpen:false})
          : (st.role && st.screen!=='launcher')
            ? ()=>{ const keep=['lookup','worklist','alerts','insights'].indexOf(st.screen)>-1 ? st.screen : 'worklist';
                this.setState({svc:k, sub:k, wlMode:'svc', lkAll:false, lkCombo:false, screen:keep, tab:keep, selId:null, dialog:null, cap:null, query:'', filter:'ALL', riskFilter:'ALL', insOpen:null, insLowerOpen:false}); }
            : ()=>this.jumpFolder('capture',k),
        bg:on?accent:'var(--surface-card)', fg:on?'#fff':'var(--text-body)', bd:on?accent:'var(--border-default)'};
    })).concat(comboChip);
  }

  renderVals(){
    const st=this.state;
    const isLauncher = st.screen==='launcher' || !st.role;
    const base={ isLauncher, isApp:!isLauncher, statusInk: (isLauncher&&!st.signIn)?'#fff':'#010101', toast:st.toast,
      onDismiss:()=>this.setState({dialog:null}), stop:(e)=>{ if(e&&e.stopPropagation)e.stopPropagation(); },
      onHome:()=>this.goHome(), quickNav:this.quickNavVM() };
    { const su=st.signIn; base.isSignIn=!!su;
      if(su){ const R=ROLES[su.k]||{}; const nm=su.label||R.name||'User';
        base.signName=nm; base.signRole=R.sub||R.facility||'';
        base.signFacility=su.facility||R.facility||R.sub||'Next Steps';
        base.signAccent=R.accent||'var(--ml-blue)';
        base.signInitial=(nm.replace(/^(ASHA|ANM|SN|MO|CHO|Dr\.?)\s+/i,'').trim()[0]||'U').toUpperCase();
        base.signId=nm.toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.|\.$/g,'')+'@openphc.org'; }
      base.onSignIn=()=>this.doSignIn(); base.onSignBack=()=>this.setState({signIn:null}); }

    if(isLauncher){
      const fk=st.folder, sk=st.sub, F=fk?FOLDERS[fk]:null;
      const node = F && F.subs ? (sk?F.subs[sk]:null) : F;
      base.showFolders=!fk;
      base.showSubs=!!(F && F.subs && !sk);
      base.showUsers=!!node;
      const newN = MC_MODULES.filter(m=>this.mcPct(m)===0).length;
      const HI = st.lang==='hi';
      base.onLangEn=()=>this.setState({lang:'en'});
      base.onLangHi=()=>this.setState({lang:'hi'});
      base.enBg = HI?'transparent':'#fff'; base.enInk = HI?'#D7D4FA':'#1E14BE';
      base.hiBg = HI?'#fff':'transparent'; base.hiInk = HI?'#1E14BE':'#D7D4FA';
      base.homeTitle = HI?'नेक्स्ट स्टेप्स':'Next Steps';
      base.homeLine1 = HI?'अपना फ़ोल्डर चुनें':'Choose your work folder.';
      base.homeLine2 = HI?'Choose your work folder':'अपना फ़ोल्डर चुनें';
      base.homeLine1 = HI?'अपना लॉगिन चुनें':'Choose your login.';
      base.homeLine2 = HI?'Choose your login':'अपना लॉगिन चुनें';
      base.folders=NS_LOGINS.map(u=>{ const R=ROLES[u.k]; const mc=!!NS2MC[u.k];
        return {name:HI?u.hi:u.label, hi:'', sub:u.facility, accent:R.accent, icon:R.icon,
          hasNew: mc && newN>0, newN:newN+'', newLabel: newN+' new '+(newN>1?'modules':'module')+' in Microcoach',
          onPick:()=>this.pickUser(u)}; });
      base.subFolders = (F && F.subs && !sk) ? Object.keys(F.subs).filter(k=>k!=='PNC').map(k=>({name:HI?F.subs[k].hi:F.subs[k].name, hi:'',
        sub:F.subs[k].sub, accent:F.subs[k].accent, icon:F.subs[k].icon, onPick:()=>this.setState({sub:k})})) : [];
      base.backLabel = sk ? FOLDERS[fk].name : 'All folders';
      base.onFolderBack=()=>this.setState(sk?{sub:null}:{folder:null});
      base.folderTitle = node?node.title:(F?F.title:'');
      base.folderSub = node?node.tagline:(F?F.tagline:'');
      base.roleCards = node ? (node.users||[]).filter(u=>ROLES[u.k]).map(u=>({
        name:u.label||ROLES[u.k].name, facility:u.facility||ROLES[u.k].sub||ROLES[u.k].facility,
        accent:ROLES[u.k].accent, icon:ROLES[u.k].icon, onPick:()=>this.pickUser(u)})) : [];
      return base;
    }

    const role=ROLES[st.role]; const scr=st.screen==='worklist'?'lookup':st.screen;
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
    base.showQuickNav=true;
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
      base.tabs=NS_TABS.concat(['microcoach']).map(k=>({label:TABMETA[k].label, icon:TABMETA[k].icon,
        color: k==='microcoach'?role.accent:'#909090', badge:'', onTap:()=>this.setTab(k)}));
      return base;
    }
    base.showTabs=['home','lookup','worklist','alerts','insights'].includes(scr);
    if(scr==='home') base.home=this.homeVM();
    if(scr==='insights') base.ins=this.insightsVM();

    const svcSub = this.hasSvc() ? (this.svcMeta().full+' · '+ROLES[st.role].name.split(' — ')[0]) : (role.name+' · '+role.facility);
    const titles={home:['Services', role.name+' · PHC Sirmour'], lookup:st.lkAll!==false?['Find a beneficiary','All services · '+role.facility]:[this.svcMeta().findTitle, this.hasSvc()?this.svcMeta().full:role.facility], worklist:['Worklist', svcSub], alerts:['Alerts', svcSub], register:['Register', role.facility], insights:['Insights', role.name+' · '+role.facility]};
    if(titles[scr]){ base.headerTitle=titles[scr][0]; base.headerSub=titles[scr][1]; }
    else if(scr==='journey'){ const w=this.byId(st.selId); base.headerTitle=w?w.name:'Journey'; base.headerSub=SVC[(w&&w.svc)||this.svc()].journey; }
    else if(scr==='profile'){ const w=this.byId(st.selId); base.headerTitle='Primary health profile'; base.headerSub=w?(w.name+' · one person, three registers'):''; }
    else if(scr==='capture'){ base.headerTitle='Next steps'; base.headerSub='Coordination only — no clinical data'; }
    else if(scr==='register'){ base.headerTitle='Register'; base.headerSub=role.name+' · '+role.facility; }
    { const sw=(this.state.women||[]).find(x=>x.id===this.state.selId); base.isStale=!!(sw && this.staleAnc(sw) && this.svc()==='ANC'); }
    { const sw=(this.state.women||[]).find(x=>x.id===this.state.selId); base.isOverTerm=!!(sw && !base.isStale && this.svc()==='ANC' && this.overTerm(sw)); base.overTermWk=sw&&base.isOverTerm?this.weeks(sw)+'':''; }
    { const sw=(this.state.women||[]).find(x=>x.id===this.state.selId); base.pregDone=!!(sw && this.svc()==='ANC' && (sw.dod||sw.delivered||sw.pregEnd)); }
    base.canAddSteps=this.optionsFor().length>0 && !base.isStale && !base.isOverTerm && !base.pregDone; base.closeOnly=!base.canAddSteps && !base.isStale && !base.isOverTerm;

    if(scr==='register'){
      const r=st.reg||{name:'',phone:'',village:'',abha:'',status:'normal',consent:true};
      const ON={bg:'var(--ml-peppermint)', fg:'#1B6B47', bd:'#8FD3B2'};
      const OFF={bg:'var(--surface-card)', fg:'var(--text-body)', bd:'var(--border-default)'};
      const DANGER={bg:'#F7E3E3', fg:'#994242', bd:'#DFA6A6'};
      const pair=(cur,vals,set)=>vals.map(v=>({label:v.label, on:cur===v.k, ...(cur===v.k?(v.danger?DANGER:ON):OFF), onTap:()=>set(v.k)}));
      const svcs=r.svcs||[], MATK=['ANC','DELIVERY','PNC'], regMat=svcs.some(k=>MATK.includes(k));
      const chipKeys=(svcs.includes('DELIVERY')||this.svc()==='DELIVERY'?['ANC','DELIVERY','NCD']:['ANC','NCD']).filter(k=>!(st.role==='asha' && (k==='NCD'||k==='CANCER')));
      const toggleSvc=(k)=>{ let s=svcs.slice(); if(s.includes(k)) s=s.filter(x=>x!==k); else { const isM=MATK.includes(k), clash=isM?s.some(x=>x==='NCD'):(k==='NCD'&&s.some(x=>MATK.includes(x))); if(clash){ this.toast('Select only one — HRP or NCD — at registration. Add the other later from her profile.'); return; } if(isM) s=s.filter(x=>!MATK.includes(x)); s.push(k); } this.setReg({svcs:s}); };
      const BT={ANC:'HRP · pregnancy', DELIVERY:'Delivery care', PNC:'PNW/NB', NCD:'NCD · HTN / diabetes', CANCER:'Cancer'};
      base.reg={
        title:'Register a beneficiary', note:'Register the person once, then pick the services she or he needs. No clinical details — ever.',
        svcChips:chipKeys.map(k=>{ const on=svcs.includes(k), m=SVC[k]; return {label:m.label, on, bg:on?m.sf:'var(--surface-card)', fg:on?m.ac:'var(--text-body)', bd:on?m.ac:'var(--border-default)', onTap:()=>toggleSvc(k)}; }),
        blocks:svcs.map(k=>{ const m=SVC[k], isP=k==='PNC', d=isP?(r.dod||''):(r.lmp||'');
          return {title:BT[k]||m.label, ac:m.ac, hasDate:MATK.includes(k), dateLabel:isP?'Date of delivery':'LMP (last menstrual period)', date:d,
            onDate:(e)=>this.setReg(isP?{dod:e.target.value}:{lmp:e.target.value}),
            overTerm:!isP && !!d && Math.floor(this.diff(d)/7)>42, overWk:!isP && d?Math.floor(this.diff(d)/7)+'':'',
            dateNote:isP?(d?('Day '+Math.max(0,this.diff(d))+' postpartum today · PNC schedule starts from this date.'):'Used to schedule the PNC and newborn visits.')
              :(d?('≈ '+Math.max(0,Math.floor(this.diff(d)/7))+' weeks today · EDD '+this.fmtLong(this.iso(new Date(new Date(d+'T00:00:00').getTime()+280*86400000)))):'Used to calculate gestation and EDD.'),
            groups:this.regGroups(r, pair, k).map(g=>({title:g.title, opts:g.opts}))}; }),
        name:r.name, phone:r.phone, abha:r.abha, village:r.village,
        district:r.district||'', districts:DISTRICTS.map(d=>({value:d, label:d})),
        addrOpts:[{k:'Faridabad',label:'Faridabad'},{k:'Other district',label:'Other dt.',nr:true}].map(o=>{ const on=r.district===o.k;
          return {label:o.label, nr:!!o.nr, bg:on?'#EFEDFF':'#fff', fg:on?'#1E14BE':'var(--text-strong)', bd:on?'#1E14BE':'var(--border-default)', onTap:()=>this.setReg({district:o.k, village:'', vq:'', vFree:false, stayFbd:null})}; }),
        onDistrict:(e)=>this.setReg({district:e.target.value, village:'', vq:'', vFree:false}),
        mapped:!r.district || MAPPED_DISTRICTS.includes(r.district), unmapped:!!r.district && !MAPPED_DISTRICTS.includes(r.district),
        noDistrict:!r.district, vwPlaceholder: r.district ? 'Search village / ward' : 'Select district first',
        vq:r.vq||'', vFree:!!r.vFree,
        vRes:(()=>{ const q=(r.vq||'').trim().toLowerCase(); if(r.village&&!r.vOpen) return []; if(!q&&!r.vOpen) return []; const qq=(r.village&&q===r.village.toLowerCase())?'':q; return FBD_WARDS.filter(v=>v.name.toLowerCase().includes(qq)).map(v=>({...v, pick:()=>this.setReg({village:v.name, vq:v.name, vFree:false, vOpen:false, district:'Faridabad', stayFbd:true})})); })(),
        showVFree: false,
        vSearch:true, showVRes: (r.vOpen || (!!(r.vq||'').trim() && !r.village)), onVOpen:()=>this.setReg({vOpen:true}), onVToggle:()=>this.setReg({vOpen:!r.vOpen}),
        nrTag: (()=>{ const m=regMat; return m&&(this.state.role==='asha'||this.state.role==='anm')?'NR (A)':'NR'; })(),
        nrNote: (()=>{ const m=regMat, ro=this.state.role;
          if(m && ro==='asha') return 'She will be in your worklist. You track her.';
          if(m && ro==='anm') return 'She will be in your worklist. Assign an ASHA below to share tracking.';
          if(ro==='asha') return 'You cannot register her. Send her to the AAM.';
          return 'Your facility tracks her. ASHA'+(m?' / ANM':'')+' will not see her.'; })(),
        vwNote: MAPPED_DISTRICTS.includes(r.district) ? 'Mapped villages / wards only — the linked ASHA fills in automatically.' : 'Faridabad village / ward where she stays or seeks care.',
        villages:FBD_WARDS.map(v=>({value:v.name, label:v.name})), showVw:true, showStay:false, onNotHere:()=>this.setReg({district:r.district==='Other district'?'':'Other district', stayFbd:false, village:'', vq:'', vFree:false}),
        nhBg:r.district==='Other district'?'#EFEDFF':'#fff', nhFg:r.district==='Other district'?'#1E14BE':'var(--text-strong)', nhBd:r.district==='Other district'?'#1E14BE':'var(--border-default)', stayNo:r.district==='Other district',
        stayOpts:[{k:'Faridabad',label:'Yes'},{k:'Other district',label:'No',nr:true}].map(o=>{ const on=r.district===o.k;
          return {label:o.label, nr:!!o.nr, bg:on?'#EFEDFF':'#fff', fg:on?'#1E14BE':'var(--text-strong)', bd:on?'#1E14BE':'var(--border-default)', onTap:()=>this.setReg({district:o.k, stayFbd:o.k==='Faridabad', village:'', vq:'', vFree:false})}; }),
        hasVillage:!!r.village && !r.vFree, noVillage:false,
        ashaName:(r.vFree?'':(FBD_WARDS.find(v=>v.name===r.village)||{}).asha)||'',
        onName:(e)=>this.setReg({name:e.target.value}),
        onPhone:(e)=>this.setReg({phone:e.target.value}),
        onAbha:(e)=>this.setReg({abha:e.target.value}),
        vSel:(r.vFree||r.district==='Other district')?'':(r.village||''), onVillageSel:(e)=>this.setReg({village:e.target.value, vq:e.target.value, vFree:false, district:e.target.value?'Faridabad':'', stayFbd:!!e.target.value}),
        onVq:(e)=>this.setReg({vq:e.target.value, vOpen:true, village:'', vFree:false, district:'Faridabad', stayFbd:true}),
        pickFree:()=>this.setReg({village:(r.vq||'').trim(), vFree:true, district:'Faridabad', stayFbd:true}), onVillage:(e)=>this.setReg({village:e.target.value, vq:e.target.value, vFree:false}),
        lmp:r.lmp||'',
        lmpNote: this.svc()==='CANCER'
          ? (r.lmp ? ('Screened on '+this.fmtLong(r.lmp)+' · follow-up is tracked from this date.') : 'If known — the date she screened positive.')
          : this.svc()==='PNC'
          ? (r.lmp ? ('Day '+Math.max(0,this.diff(r.lmp))+' postpartum today · PNC schedule starts from this date.') : 'Used to schedule the PNC and newborn visit series.')
          : (r.lmp ? ('Gestation today ≈ '+Math.max(0,Math.floor(this.diff(r.lmp)/7))+' weeks · EDD '+this.fmtLong(this.iso(new Date(new Date(r.lmp+'T00:00:00').getTime()+280*86400000)))) : 'If known — used to estimate gestation and EDD.'),
        onLmp:(e)=>this.setReg({lmp:e.target.value}), lmpMax:TODAY_ISO,
        groups:[{title:'WhatsApp reminders', opts:pair(r.consent?'yes':'no', [{k:'yes',label:'Yes, consented'},{k:'no',label:'No',danger:true}], (x)=>this.setReg({consent:x==='yes'}))}],
        saveOpacity:(r.name.trim() && r.phone.replace(/\D/g,'').length>=10 && r.district && (r.district!=='Faridabad' || r.village) && svcs.length && (!svcs.some(k=>k==='ANC'||k==='DELIVERY') || r.lmp) && (!svcs.includes('PNC') || r.dod) && !(this.state.role==='asha' && svcs.includes('CANCER') && (!MAPPED_DISTRICTS.includes(r.district) || r.vFree)))?'1':'.45',
        showNrAsha: false,
        nrAsha:r.nrAsha||'', aamAshas:AAM_ASHAS.map(a=>({value:a, label:a})),
        onNrAsha:(e)=>this.setReg({nrAsha:e.target.value}),
        onSave:()=>this.saveReg(),
      };
    }

    const alertCount=this.alertsVM().length;
    const newMc = MC_MODULES.filter(m=>this.mcPct(m)===0).length;
    base.tabs=(st.nsRole?NS_TABS.concat(NS2MC[st.nsRole]?['microcoach']:[]):(role.tabs||NS_TABS)).map(k=>({label:TABMETA[k].label, icon:TABMETA[k].icon,
      color: st.tab===k?role.accent:'#909090', badge:(k==='alerts'&&alertCount)?(alertCount+''):(k==='microcoach'&&newMc?(newMc+''):''), onTap:()=>this.setTab(k)}));

    if(scr==='lookup'){
      const q0=st.query||'', digits=q0.replace(/\D/g,'');
      const mode=/[a-zA-Z\u0900-\u097F]/.test(q0)||!q0 ? 'NAME' : 'NUM';
      base.query=st.query; base.onQuery=(e)=>this.setState({query:e.target.value});
      base.searchModes=[{k:'NAME',label:'Name'},{k:'PHONE',label:'Mobile no.'},{k:'ABHA',label:'ABHA ID'}].map(m=>({
        label:m.label, ...this.chip(mode===m.k, role.accent), onTap:()=>this.setState({searchMode:m.k, query:''})}));
      base.searchPlaceholder = 'Name, mobile or ABHA ID';
      base.searchInputMode = 'text';
      base.searchHint = mode==='NAME' ? 'Matches start showing after 3 letters.' : mode==='PHONE' ? 'Matches start showing after 4 digits.' : 'Enter any 4 digits of the ABHA / RCH ID, or scan the QR.';
      const lkAll=st.lkAll!==false;
      base.onScan=()=>this.openScan(); base.onEnrol=lkAll?(()=>this.openRegister([])):(()=>this.openRegister());
      base.enrolLabel=lkAll?'Register a beneficiary':this.svcMeta().enrol; base.canEnrol=st.role!=='asha';
      const q=st.query||'';
      let list=this.clients(), active=false;
      if(lkAll){ const seen={}, cmb=this.comboOn(); list=this.liveWomen().filter(w=>{ const p=w.pid||w.id; if(seen[p]) return false; if(cmb && !this.isCombo(w)) return false; seen[p]=1; return true; }); }
      const sv=this.svc(), stale=(st.women||[]).filter(w=>this.staleAnc(w) && (lkAll||sv==='ANC') && !this.comboOn());
      if(mode==='NAME'){
        if(q.length>=3){ const t=q.toLowerCase(); active=true; list=list.concat(stale);
          list=list.filter(w=>w.name.toLowerCase().includes(t) || (w.hi||'').includes(q)); }
      } else if(digits.length>=4){ active=true; list=list.concat(stale);
        list=list.filter(w=>w.phone.replace(/\D/g,'').includes(digits) || this.abhaOf(w).replace(/\D/g,'').includes(digits)); }
      base.resultsLabel = list.length+' match'+(list.length===1?'':'es');
      base.showResults=active; base.showTake=!active; base.lkAllView=true;
      base.hasScopeChips=this.hasScope();
      { const sc0=this.scope(); base.lkScope=[['FACILITY','My '+((ROLES[st.role]||{}).level==='SUBCENTRE'?'AAM':((LVL[(ROLES[st.role]||{}).level]||{}).short||'facility'))],['CATCHMENT',((ROLES[st.role]||{}).level==='SUBCENTRE'?'AAM':((LVL[(ROLES[st.role]||{}).level]||{}).short||''))+' catchment']].map(([k,l])=>({label:l, bg:sc0===k?'#fff':'transparent', fg:sc0===k?'#1E14BE':'#5C5B66', onTap:()=>this.setState({scopeFilter:k})})); }
      if(!active){ base.take=this.takeActionVM(lkAll); const n=base.take.reduce((a,x)=>a+x.count,0); base.takeCount=n+''; base.takeEmpty=n===0; base.hasTake=n>0; }
      base.results=list.map(w=>({name:this.nm(w), nameHi:'', initials:this.initials(w.name), avatarBg:this.avatarFor(w.id),
        village:this.vl(w), ...this.lifeVM(w), onEdit:(e)=>{ if(e&&e.stopPropagation) e.stopPropagation(); this.openLife(w.id); }, ...(()=>{ const ics=this.svcIcons(w); return {svcIcons:ics, mainIc:ics[0]||{}, extraIcs:ics.slice(1), hasIcons:ics.length>0, noIcons:!ics.length}; })(), riskLabel:this.staleAnc(w)?'Record pregnancy outcome':this.riskTag(w).label, riskBg:this.staleAnc(w)?'#FFF5F5':this.riskTag(w).bg, riskFg:this.staleAnc(w)?'#B42318':this.riskTag(w).fg,
        contactLine:[this.mask(w.phone), 'ABHA '+this.abhaOf(w)].filter(Boolean).join(' · '),
        hasOpen:this.openCount(w)>0, openCount:this.openCount(w)+'',
        openTone:this.hasOverdue(w)?'#994242':'#6165DE', onOpen:lkAll?(()=>{ const pw=this.primaryRec(w), k=pw.svc||'ANC'; this.setState({svc:k, sub:k, screen:'journey', selId:pw.id, dialog:null}); }):(()=>this.openWoman(w.id))}));
    }

    if(scr==='worklist'){
      const allMode=st.wlMode==='all', noVil=st.role!=='asha'&&st.role!=='anm', grp=noVil?'facility':(st.wlGroup==='facility'?'facility':'village');
      const ashaAll=allMode && st.role==='asha';
      base.wlAll=allMode && !ashaAll; base.wlSvc=!allMode || ashaAll; base.showSvcFilters=!ashaAll;
      base.wlModes=[['svc',this.svcMeta().label+' only'],['all','All services']].map(([k,l])=>{ const on=(k==='all')===allMode; return {label:l, bg:on?'#fff':'transparent', fg:on?'var(--ml-blue)':'var(--text-muted)', sh:on?'0 1px 3px rgba(30,20,190,.14)':'none', onTap:()=>this.setState({wlMode:k})}; });
      if(allMode && !ashaAll){ const cv=this.combinedVM(grp); base.cmb=cv; base.byPerson=grp!=='village'; base.byVillage=grp==='village'; base.showGrp=!noVil;
        base.grpChips=(noVil?[]:[['village','By village'],['facility','At my facility']]).map(([k,l])=>({label:l, ...this.chip(grp===k, role.accent), onTap:()=>this.setState({wlGroup:k})})); }
      base.worklistSections=this.takeActionVM(ashaAll,'wl');
      base.worklistEmpty=base.worklistSections.length===0;
      const ashaCats = this.svc()==='ANC' ? ['ALL','FOLLOW_UP','ANC_VISIT','PMSMA_VISIT','LAB','IMAGING','BT']
        : (this.svc()==='PNC' ? ['ALL','HBNC'].concat(SVC.PNC.options) : ['ALL'].concat(SVC[this.svc()].options));
      const fromSteps=Object.keys(CAT).filter(c=>this.allSteps().some(({s})=>s.cat===c && (this.atMyFac(s,role)||s.owner===st.role||(st.role==='asha'&&s.cat==='PMSMA_VISIT'))));
      const present=['ALL'].concat(Object.keys(CAT).filter(c=>c.indexOf('DEL_')!==0 && (fromSteps.indexOf(c)>=0 || this.optionsFor().indexOf(c)>=0)));
      const catchCats=(st.role==='anm' && this.scope()==='CATCHMENT') ? ashaCats : null;
      const ancCats=['ALL'].concat(ROLES[st.role]&&ROLES[st.role].level==='SUBCENTRE'?['REFERRAL']:[]).concat(['FOLLOW_UP']).concat(ROLES[st.role]&&['PHC','CHC','SDH','DH','TERTIARY'].indexOf(ROLES[st.role].level)>-1?['SPEC']:[]).concat(['ANC_VISIT','PMSMA_VISIT','LAB','IMAGING','BT']);
      base.filterChips=(this.svc()==='ANC'?ancCats:(st.role==='asha'?ashaCats:(catchCats||present))).map(c=>({label:c==='ALL'?'All':c==='INCOMPLETE'?'Incomplete care':((c==='IMAGING'&&this.svc()==='CANCER')?'Imaging':CAT[c].label), ...this.chip(st.filter===c, role.accent), onTap:()=>this.setState({filter:c})}));
      base.showCatChips=['ANC','PNC','NCD'].indexOf(this.svc())<0;
      base.hasScopeChips=this.hasScope(); base.noScopeChips=!this.hasScope();
      base.hiScopeNote = ['dh_sn','tert_sn','del_bk'].indexOf(st.role)>-1
        ? ('Only women with a next step created at, or pending at, '+role.facility+' — including referrals sent up from '+(st.role==='dh_sn'?'PHC and CHC':'CHC and DH')+'.') : '';
      base.showHiScopeNote = !!base.hiScopeNote;
      const sc=this.scope();
      base.scopeLabel = role.level==='SUBCENTRE' ? 'AAM' : LVL[role.level].short;
      base.scopeChips=[['FACILITY','My '+base.scopeLabel],['CATCHMENT',base.scopeLabel+' catchment']].map(([k,l])=>({label:l, ...this.chip(sc===k, role.accent), onTap:()=>this.setState({scopeFilter:k, filter:'ALL'})}));
      base.scopeNote = sc==='CATCHMENT'
        ? 'Every next step for women residing in this catchment — whoever created it, wherever it is pending.'
        : 'Next steps created at, or pending at, '+role.facility+'.';
      const rf=st.riskFilter||'ALL';
      const fl=this.svcMeta().flag;
      const riskOpts = this.svc()==='PNC'
        ? [['ALL','All'],['MOTHER','HRPNW'],['NEWBORN','High risk newborn']]
        : this.svc()==='NCD'
          ? [['ALL','All'],['DM','DM'],['HTN','HTN'],['BOTH','DM/HTN']]
          : [];
      base.showRiskRow=this.svc()!=='ANC'; base.riskChips=riskOpts.map(([k,l])=>({label:l, ...this.chip(rf===k, role.accent), onTap:()=>this.setState({riskFilter:k})}));
    }

    if(scr==='alerts'){ base.alerts=this.alertsVM(); base.alertsEmpty=base.alerts.length===0; base.alertRules=this.alertRules().map(r=>({r})); }

    if(scr==='journey'){
      const w=this.byId(st.selId);
      if(w){
        const inReg=(s)=>(s.reg||w.svc||'ANC')===(this.hasSvc()?this.svc():(w.svc||'ANC'));
        const comboW=this.isCombo(w);
        const openPairs=comboW ? this.linkedOf(w).filter(x=>!this.staleAnc(x)&&!this.pregOver(x)).flatMap(x=>(x.steps||[]).filter(s=>s.status==='OPEN'&&(s.reg||x.svc||'ANC')===(x.svc||'ANC')).map(s=>({s,x}))) : w.steps.filter(s=>s.status==='OPEN'&&inReg(s)).map(s=>({s,x:w}));
        const ownerOf=new Map(openPairs.map(o=>[o.s,o.x]));
        const open=openPairs.map(o=>o.s).sort((a,b)=>{
          const ka=a.due||a.sent, kb=b.due||b.sent; return ka<kb?-1:(ka>kb?1:0); });
        const done=w.steps.filter(s=>s.status!=='OPEN'&&inReg(s));
        base.selWoman={
          ...this.lifeVM(w), onEdit:()=>this.openLife(w.id),
          name:this.nm(w), nameHi:'', initials:this.initials(w.name), avatarBg:this.avatarFor(w.id),
          subLine:w.outside ? [this.vl(w), (w.regFac?(this.nrTag(w)+' · registered by '+(w.regBy==='asha'?'ASHA':w.regBy==='anm'?'ANM':'')+(w.regBy==='asha'||w.regBy==='anm'?' · ':'')+w.regFac+' · '+((this.isMat(w)&&(w.regBy==='asha'||w.regBy==='anm'))?'tracked by ASHA / ANM + facilities where care is due':'tracked by facilities where care is initiated or due')):'NR · no ASHA / AAM / PHC / CHC mapping · tracked at SDH, DH & tertiary')].filter(Boolean).join(' · ') : [w.vhi?(w.village+' ('+w.vhi+')'):w.village, w.asha?('ASHA '+w.asha):w.sc].filter(Boolean).join(' · '),
          hrpEditable:['ANC','DELIVERY'].indexOf(w.svc||'ANC')>-1,
          svcChips:(st.role==='asha'?[]:this.linkedOf(w)).slice().sort((a,b)=>{ const r=x=>this.pregOver(x)?2:['ANC','DELIVERY'].indexOf(x.svc||'ANC')>-1?0:1; return r(a)-r(b); }).map(x=>{ const k=x.svc||'ANC', m=SVC[k]||{label:k, ac:'#1E14BE', sf:'#EFEDFF'}, on=x.id===w.id, prim=this.isCombo(w) && ['ANC','DELIVERY'].indexOf(k)>-1, over=this.pregOver(x);
            return {label:over?(m.label+' closed · '+this.fmt(x.pregEndDate||x.dod||TODAY_ISO)):(m.label+''), bg:over?(on?'#8A8985':'#ECEBE7'):(on?m.ac:m.sf), fg:over?(on?'#fff':'#6B6B68'):(on?'#fff':m.ac), bd:over?'#B5B4AF':m.ac, onTap:on?(()=>{}):(()=>this.setState({svc:k, sub:k, selId:x.id, screen:'journey', dialog:null}))}; }),
          catSub:w.addedBy?('Added to '+((SVC[w.svc]||{}).label||'ANC')+' by '+w.addedBy+' · not categorised yet'):'Registered by ASHA · not categorised yet',
          canAddSvc:this.canAddSvc(w) && !this.staleAnc(w), riskEditable:!this.staleAnc(w),
          canDeliver:['ANC','DELIVERY'].indexOf(w.svc||'ANC')>-1 && !w.dod && !w.pregEnd && !/^mc_|^ins_/.test(st.role||''),
          ...(()=>{ const dr=this.linkedOf(w).find(x=>this.pregOver(x)); return {delDone:false, delDoneLabel:dr?(dr.pregEnd?(dr.pregEnd+' · '+this.fmt(dr.pregEndDate||TODAY_ISO)):('Delivered · '+this.fmt(dr.dod))):''}; })(),
          onDeliver:()=>this.setState({dialog:{type:'delivered', wid:w.id, date:'', cond:null}}), onAddSvc:()=>this.setState({dialog:{type:'addsvc', wid:w.id, pick:null, date:'', cond:null}}),
          needsCat:!!w.riskPending && ['ANC','DELIVERY'].indexOf(w.svc||'ANC')>-1 && this.canSetHrp(w),
          ashaWait:!!w.riskPending && this.state.role==='asha',
          onMarkNormal:()=>this.setHrp(w.id,'Normal'), onMarkHrp:()=>this.setHrp(w.id,'HRP'), onHrp:()=>(this.staleAnc(w)?this.toast('Past EDD + 30 days · record pregnancy outcome only'):(!this.isPhcUp() && !this.anmEsc(w) && !this.pncEdit(w))?this.toast(this.isHigh(w)?'HRP to normal · PHC and above only':'Status can be changed at PHC and above'):this.setState({dialog:{type:'hrp', wid:w.id}})),
          catEditable:!this.staleAnc(w) && ['PNC','NCD'].indexOf(w.svc||'ANC')>-1 && ((this.isPhcUp() && (['ANC','DELIVERY'].indexOf(w.svc||'ANC')<0 || this.canSetHrp(w))) || this.anmEsc(w) || this.pncEdit(w)),
          gestLabel:this.metaA(w), eddLabel:this.metaB(w), metaBLabel:this.metaBLabel(w), hasMetaB:!!this.metaB(w),
          riskBg:w.riskPending?'#ECEBE7':(this.isHigh(w)?'var(--ml-peach)':'#D9F7E8'), riskFg:w.riskPending?'#5C5B57':(this.isHigh(w)?'#8A3D14':'#1B6B47'),
          riskIcon:w.riskPending?'M12 8v4M12 16h.01':(this.isHigh(w)?'M12 3L2 20h20L12 3zM12 10v4M12 17h.01':'M20 6L9 17l-5-5'),
          phone:'•••• '+(w.phone||'').replace(/\D/g,'').slice(-4), consent:w.consent, noConsent:!w.consent,
          waOpacity:w.consent?'1':'0.6', waBg:w.consent?'#fff':'#D9D8D3', waFg:w.consent?'#1B8A4C':'#8A8985',
          onWa:()=>this.toast(w.consent?('WhatsApp opened · '+w.name):'No consent available for sending Whatsapp messages'),
          smsLabel:w.consent?'SMS on':'SMS off', smsColor:w.consent?'#1B6B47':'#994242',
          riskShort:this.flagShort(w),
          facts:this.cardFacts(w), villageLine:(st.lang==='hi'&&w.vhi)?w.vhi:w.village, isNr:!!w.outside, nrLabel:w.outside?this.nrTag(w):'',
          onCall:()=>this.toast('Dialling '+w.name+' · '+this.mask(w.phone)),
          openCount:open.length+'', noOpen:open.length===0,
          doneCount:done.length+'', noDone:done.length===0,
          onEnter:()=>this.openCapture(w.id),
          hasProfile:!!w.linked, onProfile:()=>this.setState({screen:'profile', dialog:null}),
          openSteps:open.map(s=>{ const ow=ownerOf.get(s)||w, vm=this.stepVM(s,ow), sk=ow.svc||'ANC', sm=SVC[sk]||{}; const sa=sm.ac||'#1E14BE', ss=sm.sf||'#EFEDFF'; return {svcTag:comboW?(sm.label||sk):'', svcAc:comboW?'#fff':sa, svcSf:comboW?sa:ss, icon:vm.icon, lc:comboW?sa:vm.lc, lsoft:comboW?ss:vm.lsoft, tc:vm.tc, cbg:comboW?ss:vm.cbg, cbd:comboW?sa+'40':vm.cbd, title:vm.title, dueColor:vm.dueColor, dueLabel:vm.dueLabel, onOpen:()=>(this.staleAnc(w)?this.toast('Past EDD + 30 days · record pregnancy outcome only'):this.openClose(s.id))}; }),
          onRecordDelivery:()=>this.setState({dialog:{type:'delivered', wid:w.id, date:'', cond:null, out:null}}),
          doneSteps:done.map(s=>{ const vm=this.stepVM(s,w); return {isPc:s.creason==='Pregnancy completed', title:vm.title, line:(s.status==='CANCELLED'?((s.creason==='Pregnancy completed'?(s.pcOut||''):(s.creason||'Cancelled'))+' · '):'')+(vm.careTxt?(vm.careTxt+' · '):'')+this.fmt(s.cdate)+(s.cby?(' · '+s.cby):''), downgraded:vm.downgraded, downNote:vm.downNote}; }),
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
          ? ('PNW/NB window closed — day 42 after delivery ('+this.fmtLong(this.pncEnd(w))+') has passed. No new PNC or newborn steps can be scheduled.')
          : ((this.svc()==='PNC' && w && this.pncEnd(w))
              ? ('Options available to you as '+role.name+'. PNW/NB steps can be scheduled up to '+this.fmtLong(this.pncEnd(w))+' (day 42).')
              : ('Options available to you as '+role.name+' at '+role.facility+'.')),
        options:((this.svc()==='PNC' && w && !this.pncOpen(w)) ? [] : this.optionsFor()).map(k=>{ const OPTAC={REFERRAL:'#1E14BE', ANC_VISIT:'#6165DE', PMSMA_VISIT:'#6165DE', FOLLOW_UP:'#994242', LAB:'#2E9E6B', IMAGING:'#6165DE', TREATMENT:'#C35721', PNC_VISIT:'#2E9E6B', NB_CHECK:'#2E9E6B', IMMUNISATION:'#6165DE', BP_CHECK:'#C35721', SUGAR_TEST:'#994242', REFILL:'#1E14BE', HOME_VISIT:'#2E9E6B', HBNC:'#2E9E6B', HOME_PNC:'#6165DE', IV_IS:'#994242', IV_FCM:'#994242', BT:'#994242', DEL_NORMAL:'#2E9E6B', DEL_CSEC:'#994242'};
          const ac=OPTAC[k]||'#1E14BE';
          return {label:(k==='REFILL'&&this.svc()==='NCD'&&(ROLES[st.role]||{}).level==='SUBCENTRE')?'Medicine refill at AAM':(k==='REFERRAL'&&this.ncdDoc())?'Doctor consultation':(k==='REFERRAL'&&this.ncdSpec())?'Specialist consultation':(k==='FOLLOW_UP'&&this.atKeys('FOLLOW_UP'))?'Follow up':(k==='DEL_NORMAL'||k==='DEL_CSEC'||k==='FOLLOW_UP'||k==='TREATMENT'||k==='IMAGING'||k==='PNC_VISIT'||k==='NB_CHECK')?this.catLabel(k, role.level):OPTMETA[k].label, icon:CAT[k].icon, ac, sf:TINT[ac]||'#EFEDFF', onTap:()=>this.openOption(k)}; }),
        stepCountLabel:n+' step'+(n===1?'':'s'), hasSteps:n>0, noSteps:n===0,
        stepRows:c.steps.map(s=>{ const lm=LVL[s.level]; const cm=CAT[s.cat];
          const detail = s.doses ? ('Dose '+s.dose+' of '+s.doses+' · '+this.fmtLong(s.due)+' · '+lm.facility) : s.ddate ? ('Delivered '+this.fmtLong(s.ddate)+(s.disdate?(' · discharge '+this.fmtLong(s.disdate)):' · still admitted'))
            : (s.cat==='REFERRAL' && s.due) ? (this.fmtLong(s.due)+' · '+(s.fac&&DFAC[s.fac]?DFAC[s.fac].label:lm.facility))
            : (s.cat==='REFERRAL' && s.fac) ? ('To '+DFAC[s.fac].label+' · sent on save')
            : s.cat==='REFERRAL' ? ((s.who?((s.who==='PW'?'PN woman':'Newborn')+' · '):'')+'To '+lm.facility+' · sent on save')
            : s.session ? ('PMSMA session · '+this.fmtLong(s.due)+' · '+lm.facility)
            : s.hbnc ? ('Day '+s.hday+' · '+this.fmtLong(s.due)+' · at home')
            : s.usg ? ('Referred to '+(s.usgTo||'CHC')+' · '+this.fmtLong(s.due))
            : s.due ? (this.fmtLong(s.due)+' · '+(s.fac&&DFAC[s.fac]?DFAC[s.fac].label:lm.facility)+(s.autoRef?' · referred':''))
            : ('At '+lm.facility+' · no date needed');
          return {icon:cm.icon, label: ((s.urg&&this.capSvc()!=='PNC')?(s.urg==='EMERGENCY'?'Emergency · ':'Routine · '):'')+((s.cat==='REFERRAL'&&s.fac)?(((s.doc||this.ncdDoc())?'Doctor consultation at ':this.ncdSpec()?'Specialist consultation at ':'Referral to ')+DFAC[s.fac].label):s.cat==='REFERRAL'?((s.who?('Referral · '+(s.who==='PW'?'PN woman':'Newborn')+' → '):(s.doc||this.ncdDoc())?'Doctor consultation at ':(s.spec||this.ncdSpec())?'Specialist consultation at ':'Referral to ')+lm.label):(this.catLabel(s.cat, s.level)+(s.doses?(' · Dose '+s.dose+'/'+s.doses):''))), detail, ac:s.urg==='EMERGENCY'?'#994242':lm.c, sf:lm.s, onRemove:()=>this.removeStaged(s.sid)}; }),
        estTime:'≈ '+(20+n*15)+'s', saveDisabled:n?'1':'0.5', onSave:()=>this.saveCapture(),
      };
    }

    const dl=st.dialog;
    base.dialogOpen=!!dl;
    base.dlgReferral=dl&&dl.type==='referral'; base.dlgAnc=dl&&dl.type==='anc'; base.dlgPmsma=dl&&dl.type==='pmsma'; base.dlgUsg=dl&&dl.type==='usg'; base.dlgHbnc=dl&&dl.type==='hbnc'; base.dlgAshaRef=dl&&dl.type==='ashaRef';
    base.dlgLife=dl&&dl.type==='life'; base.dlgAct=dl&&dl.type==='act'; base.dlgResched=dl&&dl.type==='resched'; base.dlgClose=dl&&dl.type==='close'; base.dlgSms=dl&&dl.type==='sms'; base.dlgScan=dl&&dl.type==='scan'; base.dlgDeliv=dl&&dl.type==='deliv'; base.dlgAddSvc=dl&&(dl.type==='addsvc'||dl.type==='delivered'); base.dlgRegPick=dl&&dl.type==='regpick'; base.dlgHrp=dl&&dl.type==='hrp'; base.dlgIv=dl&&dl.type==='iv';
    if(dl){
      const dlg={};
      if(dl.type==='referral'||dl.type==='ashaRef'){
        const rw=this.byId(st.cap?st.cap.womanId:null);
        const ex=rw?rw.steps.filter(s=>s.cat==='REFERRAL' && s.status==='OPEN' && (s.reg||rw.svc)===this.svc()):[];
        dlg.hasRefExisting=ex.length>0;
        dlg.refExisting=ex.length ? ('She already has '+ex.length+' open referral'+(ex.length>1?'s':'')+' — '+ex.map(s=>this.stepVM(s,rw).levelLabel).join(', ')+'. This adds a new one; the earlier referral stays open until it is closed.') : '';
        const u=dl.urg||'ROUTINE';
        dlg.hasUrg=['ANC','DELIVERY'].indexOf(this.capSvc())>-1 && !(st.role==='anm'&&this.capSvc()==='ANC');
        dlg.urgOpts=[{k:'EMERGENCY',label:'Emergency',sub:'Go now · alert facility',on:'#994242',sf:'#F7E3E3'},{k:'ROUTINE',label:'Routine',sub:'Facility schedules her',on:'#1E14BE',sf:'#EFEDFF'}]
          .map(o=>({label:o.label, sub:o.sub, bg:u===o.k?o.sf:'#fff', bd:u===o.k?o.on:'var(--border-default)', fg:u===o.k?o.on:'var(--text-strong)',
            onTap:()=>this.setState({dialog:{...this.state.dialog, urg:o.k}})}));
      }
      if(dl.type==='referral'){
        const opts=dl.del ? (DEL_ROLE[st.role]||{refs:[]}).refs.map(k=>({k,dir:'Refer'}))
          : this.expandPhc((role.level==='SUBCENTRE' && (this.svc()==='NCD'||this.svc()==='ANC')) ? role.refUp.filter(x=>x!=='TERTIARY') : role.refUp).map(k=>({k,dir:'Refer up'})).concat(this.svc()==='NCD'?[]:this.expandPhc(role.refDown).map(k=>({k,dir:'Refer back'})));
        const sel=dl.sel||[], max=this.refMax();
        dlg.levels=opts.map(({k,dir})=>{ const on=sel.includes(k); const t=this.refT(k); const lm={label:t.label, facility:t.facility, c:LVL[t.level].c};
          return {label:lm.label, facility:lm.facility, tag:dir, tone:lm.c, radius:max>1?'6px':'50%',
            bg:on?'#EFEDFF':'#fff', bd:on?'#1E14BE':'#DEDDD8', dot:on?'#1E14BE':'#DEDDD8', fill:on?'#1E14BE':'transparent',
            onTap:()=>this.toggleRefLevel(k)}; });
        base.refHint = max>1
          ? 'Select up to two facilities — she can be referred to both at once. No date needed; each facility schedules her.'
          : 'Choose the level she is referred to. No date needed — the facility schedules her.';
        if(dl.del) base.refHint='Choose where she is referred for delivery. The facility sees her as soon as you save.';
        base.refCount = max>1 ? (sel.length+' of 2 selected') : '';
        base.refMulti = max>1;
        dlg.confirmLabel = sel.length>1 ? 'Send 2 referrals' : 'Send referral';
        if(this.ncdDoc()){ base.refHint='Choose the facility and date for the doctor consultation.'; dlg.confirmLabel='Send for doctor consultation'; }
        if(this.ncdSpec()){ base.refHint='Choose the facility and date for the specialist consultation.'; dlg.confirmLabel='Schedule specialist consultation'; }
        if(this.ncdDoc()||this.ncdSpec()){ const rd=dl.date||this.iso(new Date(TODAY.getTime()+86400000));
          dlg.refDated=true; dlg.refPlain=false; dlg.refDatedTitle=this.ncdSpec()?'Schedule specialist consultation':'Schedule doctor consultation'; dlg.refDate=rd; dlg.refMin=TODAY_ISO;
          dlg.onRefDate=(e)=>this.setState({dialog:{...this.state.dialog, date:e.target.value}});
          dlg.refQuick=[[0,'Today'],[1,'Tomorrow'],[7,'1 week'],[14,'2 weeks'],[28,'4 weeks']].map(([n,l])=>{ const v=this.iso(new Date(TODAY.getTime()+n*86400000));
            return {label:l, ...this.chip(rd===v, role.accent), onTap:()=>this.setState({dialog:{...this.state.dialog, date:v}})}; }); }
        if(!dlg.refDated) dlg.refPlain=true;
        dlg.confirmDisabled=sel.length?'1':'0.5'; dlg.onConfirm=()=>this.confirmReferral();
      }
      if(dl.type==='anc'){
        dlg.dateTitle='Schedule '+(dl.cat==='FOLLOW_UP'&&dl.labSel?'follow up':dl.cat==='FOLLOW_UP'?this.catLabel('FOLLOW_UP', role.level).replace(/^Follow/,'follow'):CAT[dl.cat].label.toLowerCase());
        const atT=dl.at?this.atTarget(dl.at):null, btRef=!atT && dl.cat==='BT' && ['PHC','CHC'].indexOf(role.level)>-1, atFac=atT?atT.name:btRef?ROLES.dh_sn.facility:role.facility;
        const atKs=(dl.at||dl.labSel)?(this.atKeys(dl.cat)||[]):[];
        dlg.hasAt=atKs.length>0; dlg.isLab=!!dl.labSel; dlg.notLab=!dl.labSel;
        dlg.atOpts=atKs.map(k=>({label:this.atShort(k), ...this.chip(dl.labSel?dl.labSel.indexOf(k)>-1:dl.at===k, role.accent), onTap:()=>dl.labSel?this.toggleLabFac(k):this.setState({dialog:{...dl, at:k}})}));
        dlg.atHint=dl.labSel?(dl.cat==='FOLLOW_UP'?'Follow up at — pick up to 2, set a date for each.':'Pick up to 2 facilities — set a date for each.'):'';
        dlg.dateSub=atT ? (atT.here?('Pick the date she should come to '+role.facility+'.'):('Referred to '+atT.name+' — it appears in their worklist as incoming.')) : btRef ? ('Auto-referred to '+atFac+'. She appears in the DH worklist as an incoming transfusion.') : dl.cat==='HOME_PNC' ? 'ANM home visit for a high-risk mother and newborn — shown on the ANM worklist of her village.' : ('Pick the date '+(dl.cat==='NB_CHECK'?'the baby':'she')+' should come to '+role.facility+'.');
        const capW=this.byId(st.cap?st.cap.womanId:null);
        const pncCap=(this.svc()==='PNC' && capW) ? this.pncEnd(capW) : null;
        if(pncCap){ dlg.dateSub+=' PNW/NB steps close on '+this.fmtLong(pncCap)+' (day 42).';
          if(dl.date>pncCap) dl.date=pncCap; }
        dlg.date=dl.date; dlg.minDate=TODAY_ISO; dlg.maxDate=pncCap||'';
        dlg.onDate=(e)=>this.setState({dialog:{...dl, date:(pncCap&&e.target.value>pncCap)?pncCap:e.target.value}});
        dlg.quick=((dl.cat==='FOLLOW_UP' && this.svc()==='NCD')?(role.level==='SUBCENTRE'?[1,7,14,28]:[1,14,28,56,84]):dl.cat==='ANC_VISIT'?[14,28,42,56,70,84]:(dl.cat==='LAB'||dl.cat==='IMAGING'||dl.cat==='SPEC')?[0,1,7,14,28]:(dl.cat==='BT'||dl.cat==='REFILL'||(dl.cat==='FOLLOW_UP' && this.svc()==='ANC'))?[1,7,14,28]:[7,14,28]).filter(d=>!pncCap || this.iso(new Date(TODAY.getTime()+d*86400000))<=pncCap)
          .map(d=>{ const val=this.iso(new Date(TODAY.getTime()+d*86400000)); const on=dl.date===val;
          return {label:dl.cat==='ANC_VISIT'?((d/7)+' wk'):d===0?'Today':d===1?'Tomorrow':d===7?'1 week':d===14?'2 weeks':d===28?'4 weeks':((d/7)+' weeks'), ...this.chip(on, role.accent), onTap:()=>this.setState({dialog:{...dl, date:val}})}; });
        const wsel=this.byId(st.cap?st.cap.womanId:null);
        dlg.summary = dl.date ? (CAT[dl.cat].label+' at '+atFac+' on '+this.fmtLong(dl.date)+((wsel && wsel.lmp && dl.cat==='ANC_VISIT')?(' — she will be '+Math.floor((new Date(dl.date+'T00:00:00')-new Date(wsel.lmp+'T00:00:00'))/604800000)+' weeks then.'):'.')) : 'Pick a date to continue.';
        dlg.confirmDisabled=dl.date?'1':'0.5'; dlg.onConfirm=()=>this.confirmDated();
        if(dl.labSel){ const ld=dl.labDates||{}, isFU=dl.cat==='FOLLOW_UP';
          dlg.dateSub=isFU?'Follow up here or at a facility closer to her.':'Lab tests can be split across two facilities.';
          dlg.labRows=dl.labSel.map(k=>{ const t=this.atTarget(k);
            return {name:t.name, sub:t.here?'At your facility':'Sent as incoming referral', date:ld[k]||'',
              onDate:(e)=>this.setState({dialog:{...dl, labDates:{...ld, [k]:e.target.value}}}),
              quick:(isFU?(this.svc()==='NCD'?[1,14,28,56,84]:[1,7,14,28]):[0,1,7,14,28]).map(d=>{ const val=this.iso(new Date(TODAY.getTime()+d*86400000));
                return {label:d===0?'Today':d===1?'Tomorrow':d===7?'1 week':d===14?'2 weeks':d===28?'4 weeks':((d/7)+' weeks'), ...this.chip(ld[k]===val, role.accent), onTap:()=>this.setState({dialog:{...dl, labDates:{...ld, [k]:val}}})}; })}; });
          const ok=dl.labSel.every(k=>ld[k]);
          dlg.summary=ok?((isFU?'Follow up at ':'Lab at ')+dl.labSel.map(k=>this.atTarget(k).name+' on '+this.fmtLong(ld[k])).join(' and ')+'.'):'Pick a date for each facility.';
          dlg.confirmDisabled=ok?'1':'0.5'; }
      }
      if(dl.type==='ashaRef'){
        const who=dl.who||[];
        dlg.whoRows=[{k:'PW',label:'Postnatal woman',sub:'Mother needs care at a facility'},{k:'NB',label:'Newborn',sub:'Baby needs care at a facility'}].map(o=>{
          const on=who.indexOf(o.k)>-1;
          return {label:o.label, sub:o.sub, bg:on?'#EFEDFF':'#fff', bd:on?'#1E14BE':'var(--border-default)', dot:on?'#1E14BE':'transparent',
            onTap:()=>this.toggleRefWho(o.k)}; });
        dlg.refLevels=['SUBCENTRE','PHC_DAY','PHC_CHI','CHC','DH','TERTIARY'].map(k=>{ const on=dl.lvl===k, lm2=this.refT(k);
          return {label:lm2.label, facility:lm2.facility, bg:on?'#EFEDFF':'#fff', bd:on?'#1E14BE':'var(--border-default)', dot:on?'#1E14BE':'transparent',
            onTap:()=>this.setState({dialog:{...dl, lvl:k}})}; });
        const lt=this.refT(dl.lvl), ltn=lt.fac?lt.label:lt.facility;
        dlg.refSummary = who.length===2 ? ('Two referrals — mother and newborn — to '+ltn+'.')
          : who.length===1 ? (((who[0]==='PW')?'Postnatal woman':'Newborn')+' referred to '+ltn+'.')
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
        dlg.usgTitle='Referred to '+(dl.to||'SDH')+' for '+(dl.what||'ultrasound');
        dlg.onDate=(e)=>this.setState({dialog:{...dl, date:e.target.value}});
        dlg.quick=[0,1,7,14,28].map(d=>{ const val=this.iso(new Date(TODAY.getTime()+d*86400000)); const on=dl.date===val;
          return {label:dl.cat==='ANC_VISIT'?((d/7)+' wk'):d===0?'Today':d===1?'Tomorrow':d===7?'1 week':d===14?'2 weeks':d===28?'4 weeks':((d/7)+' weeks'), ...this.chip(on, role.accent), onTap:()=>this.setState({dialog:{...dl, date:val}})}; });
        dlg.confirmDisabled=dl.date?'1':'0.5';
        dlg.onConfirm=()=>this.confirmUsg();
      }
      if(dl.type==='pmsma'){
        const d=this.nextPmsma();
        dlg.sessionDate=this.fmtLong(d); dlg.sessionPlace=LVL[this.pmsmaLevel()].facility;
        dlg.sessionNote='PMSMA runs on the '+this.ord(this.pmsmaDay())+' of every month. She gets an SMS three days before and on the morning of the session.';
        dlg.onConfirm=()=>this.confirmPmsma();
      }
      if(dl.type==='regpick'){
        dlg.regOpts=Object.keys(FOLDERS.capture.subs).filter(k=>SVC[k] && k!=='PNC' && st.role!=='asha').map(k=>({label:SVC[k].label, sub:SVC[k].enrol, ac:SVC[k].ac, sf:SVC[k].sf,
          onTap:()=>{ this.setState({svc:k, sub:k, lkAll:false, dialog:null}); setTimeout(()=>this.openRegister(),0); }}));
      }
      if(dl.type==='addsvc' || dl.type==='delivered'){
        const aw=this.byId(dl.wid), isDel=dl.type==='delivered';
        if(aw){ const av=isDel?[]:this.addableSvcs(aw), p=isDel?'PNC':dl.pick;
          dlg.asTitle=isDel?'Pregnancy outcome':'Add a service';
          dlg.asSub=isDel?'Once saved, no further HRP next steps can be recorded.':'same profile, phone and ABHA — no re-registration';
          const SUB={ANC:'Pregnant · LMP', PNC:'Delivered · date', NCD:'HTN / diabetes', CANCER:'Screen positive'};
          dlg.asName=aw.name; const ashaLock=st.role==='asha' && !isDel;
          dlg.ashaLock=ashaLock; dlg.ashaLockMsg='Only AAM (ANM) and above can add NCD or cancer care. Tell the ANM so she can add it to this profile.';
          dlg.svcOpts=av.map(k=>{ const m=SVC[k], on=p===k; return {label:m.label, sub:SUB[k], bg:on?m.sf:'#fff', bd:on?m.ac:'var(--border-default)', fg:on?m.ac:'var(--text-strong)', onTap:()=>{ if(ashaLock && (k==='NCD'||k==='CANCER')) return this.toast('Ask the ANM to add '+m.label); this.setState({dialog:{...dl, pick:k, date:'', cond:null}}); }}; });
          dlg.showDate=p==='ANC'||p==='PNC'; dlg.dateLabel=p==='PNC'?'Date of delivery':'LMP (last menstrual period)'; dlg.maxDate=TODAY_ISO;
          dlg.onDate=(e)=>this.setState({dialog:{...dl, date:e.target.value}});
          dlg.date=dl.date||''; dlg.minDate=isDel&&aw.lmp?aw.lmp:'';
          dlg.dateQuick=[];
          const CO={NCD:['Hypertension','Diabetes','HTN & DM'], CANCER:['Oral','Breast','Cervical','Other'], PNC:['Home','Institution']};
          dlg.showCond=!!CO[p]; dlg.condLabel=p==='PNC'?'Place of delivery':p==='NCD'?'Condition':'Screening positive for';
          dlg.condOpts=(CO[p]||[]).map(c=>({label:c, ...this.chip(dl.cond===c, role.accent), onTap:()=>this.setState({dialog:{...dl, cond:c}})}));
          const gw=isDel?this.weeks(aw):null, early=isDel && gw!==null && gw<24;
          dlg.showOut=isDel; dlg.outLabel='Outcome'+(gw!==null?' · '+gw+' weeks':'');
          dlg.outOpts=(early?['Abortion']:['Delivery']).map(c=>({label:c, ...this.chip(dl.out===c, role.accent), onTap:()=>this.setState({dialog:{...dl, out:c}})}));
          if(isDel){ dlg.showCond=false; dlg.showDate=false;
            dlg.asSub=(early?'Under 24 weeks · abortion. ':'24 weeks or more · delivery. ')+'Once saved, no further HRP next steps can be recorded.'; }
          const ok=!!p && (!dlg.showDate || !!dl.date) && (!dlg.showCond || !!dl.cond) && (!isDel || !!dl.out);
          dlg.confirmOpacity=ok?'1':'0.5'; dlg.confirmLabel=p?('Add to '+SVC[p].label):'Pick a service';
          dlg.confirmLabel=isDel?'Save outcome':dlg.confirmLabel;
          if(isDel) dlg.onPickOut=null;
          dlg.onConfirm=()=>{ if(ok) (isDel?this.confirmDelivered():this.addSvc(aw, dl)); };
        }
      }
      if(dl.type==='life'){ const lw=this.byId(dl.wid);
        if(lw){ const cur=this.lifeOf(lw), open=lw.steps.filter(s=>s.status==='OPEN').length;
          dlg.lifeName=lw.name; dlg.lifeNow=cur||'Active';
          dlg.lifeHint=open?(open+' open step'+(open===1?'':'s')+' will be closed with this status.'):'No open steps right now.';
          const O=[['Temporarily moved','Away for now · you can add a new step when she returns','#A87800'],['Migrated','Moved out of the area · you can still add a new step','#6165DE'],['Deceased','Closes all steps · no new steps','#2A2A33']];
          dlg.lifeOpts=O.map(([l,sub,ac])=>({label:l, sub, ac, bg:cur===l?'#F4F4F8':'#fff', bd:cur===l?ac:'var(--border-default)', fg:'var(--text-strong)', onTap:()=>cur===l?this.setState({dialog:null}):this.setLife(lw.id,l)}));
          if(cur && cur!=='Deceased') dlg.lifeOpts.push({label:'Back / active', sub:'Clear the status', ac:'#17834F', bg:'#fff', bd:'var(--border-default)', fg:'var(--text-strong)', onTap:()=>this.setLife(lw.id,null)}); }
      }
      if(dl.type==='hrp'){
        const hw=this.byId(dl.wid);
        if(hw){ const k=hw.svc||'ANC', mat=k==='ANC'||k==='DELIVERY', phcUp=this.isPhcUp();
          const by=hw.hrpBy||(hw.risk==='HRP'?'SUBCENTRE':null);
          const FN={SUBCENTRE:'AAM',PHC:'PHC',CHC:'CHC',SDH:'SDH',DH:'SDH / DH',TERTIARY:'Tertiary care'};
          const esc=this.anmEsc(hw), can = mat ? ((phcUp && this.canSetHrp(hw)) || esc) : k==='PNC' ? this.pncEdit(hw) : phcUp;
          const opt=(l,on,tone,sf,fn)=>({label:l, bg:on?sf:'#fff', bd:on?tone:'var(--border-default)', fg:on?tone:'var(--text-strong)', onTap:fn});
          const G='#1B6B47', GS='#D9F7E8', R='#994242', RS='#F7E3E3', B='#1E14BE', BS='#EFEDFF';
          dlg.hrpName=hw.name; dlg.hrpCan=can; dlg.hrpLocked=!can;
          if(mat){
            dlg.hrpTitle='HRP status';
            dlg.hrpNow = by ? ((hw.risk==='HRP'?'Marked HRP':'Marked normal')+' by '+(hw.hrpByName||FN[by])+(hw.hrpDate?(' · '+this.fmt(hw.hrpDate)):'')) : 'Not assessed yet';
            dlg.hrpGroups=[{hasTitle:false, title:'', opts:[(!phcUp && hw.risk==='Normal' && !hw.riskPending)?opt('Normal',true,G,GS,()=>{}):opt('Normal',hw.risk==='Normal'&&!hw.riskPending,G,GS,()=>this.setHrp(hw.id,'Normal')), opt('HRP',hw.risk==='HRP',R,RS,()=>this.setHrp(hw.id,'HRP'))]}];
            dlg.hrpLock = !phcUp ? 'HRP to normal · only PHC and above can change it.' : ('Marked by '+FN[by]+' — only '+this.hrpOverriders(by)+' can change it.');
            dlg.hrpRule = !phcUp ? 'AAM can mark normal → HRP · HRP → normal needs PHC and above' : 'AAM can mark HRP · HRP → normal only at PHC and above · SDH / DH / tertiary can override the PHC';
          } else if(k==='PNC'){
            dlg.hrpTitle='Risk status'; dlg.hrpNow=(hw.risk==='HRP'?'Woman high risk':'Woman normal')+' · '+(hw.nbRisk?'Newborn high risk':'Newborn normal');
            dlg.hrpGroups=[{hasTitle:true, title:'Woman', opts:[opt('Normal',hw.risk!=='HRP',G,GS,(this.state.role==='asha'&&hw.risk==='HRP')?(()=>this.toast('High risk to normal · ANM and above only')):(()=>this.setCat(hw.id,{risk:'Normal'},'Woman marked normal'))), opt('High risk',hw.risk==='HRP',R,RS,()=>this.setCat(hw.id,{risk:'HRP'},'Woman marked high risk'))]},
              {hasTitle:true, title:'Newborn', opts:[opt('Normal',!hw.nbRisk,G,GS,(this.state.role==='asha'&&hw.nbRisk)?(()=>this.toast('High risk to normal · ANM and above only')):(()=>this.setCat(hw.id,{nbRisk:false},'Newborn marked normal'))), opt('High risk',!!hw.nbRisk,R,RS,()=>this.setCat(hw.id,{nbRisk:true},'Newborn marked high risk'))]}];
            dlg.hrpLock='Both already high risk · only ANM and above can mark normal.'; dlg.hrpRule='ASHA and above can mark high risk · high risk → normal needs ANM and above';
          } else if(k==='NCD'){
            const c=hw.cond||'', d=/diabet/i.test(c), h=/hyperten/i.test(c)||!d, cur=d&&h?'BOTH':d?'DM':'HTN';
            const CL={HTN:'Hypertension', DM:'Type 2 diabetes', BOTH:'Diabetes + hypertension'};
            dlg.hrpTitle='Condition'; dlg.hrpNow=CL[cur];
            dlg.hrpGroups=[{hasTitle:false, title:'', opts:[['HTN','HTN'],['DM','DM'],['BOTH','HTN + DM']].map(([kk,l])=>opt(l,cur===kk,B,BS,()=>this.setCat(hw.id,{cond:CL[kk]},'Condition updated · '+l)))}];
            dlg.hrpLock='Only PHC and above can change the condition.'; dlg.hrpRule='PHC / CHC / SDH / DH / tertiary can change the condition';
          } else { dlg.hrpTitle='Status'; dlg.hrpNow=hw.cond||''; dlg.hrpGroups=[]; dlg.hrpLock='Not editable'; dlg.hrpRule=''; }
          dlg.hasLastBy=!mat && !!hw.catBy; dlg.lastBy=hw.catBy?('Last changed by '+hw.catBy+' · '+this.fmt(hw.catDate)):'';
        }
      }
      if(dl.type==='iv'){
        const plan=this.ivPlan(dl), gap=this.ivGap(dl.cat);
        dlg.ivTitle='Schedule '+CAT[dl.cat].label;
        dlg.ivSub=(dl.cat==='IV_IS'?'Doses every '+gap+' days':'Second dose, if needed, after '+gap+' days')+' at '+role.facility+'.';
        dlg.ivDoses=(dl.cat==='IV_IS'?[1,2,3,4,5]:[1,2]).map(n=>({label:n+' dose'+(n>1?'s':''), ...this.chip(dl.doses===n, role.accent), onTap:()=>this.setState({dialog:{...dl, doses:n}})}));
        dlg.date=dl.first; dlg.minDate=TODAY_ISO; dlg.onDate=(e)=>this.setState({dialog:{...dl, first:e.target.value}});
        dlg.ivRows=plan.map(p=>({label:'Dose '+p.dose, date:this.fmtLong(p.date)}));
        dlg.confirmDisabled=dl.first?'1':'0.5'; dlg.onConfirm=()=>this.confirmIv();
      }
      if(dl.type==='deliv'){
        const cs=dl.cat==='DEL_CSEC';
        dlg.delTitle=this.catLabel(dl.cat, role.level);
        dlg.delSub='At '+role.facility+'. PNW/NB care (42 days) starts from the delivery date.';
        dlg.ddate=dl.ddate||''; dlg.disdate=dl.disdate||''; dlg.maxDate=TODAY_ISO; dlg.minDis=dl.ddate||'';
        dlg.onDdate=(e)=>this.setState({dialog:{...dl, ddate:e.target.value}});
        dlg.onDisdate=(e)=>this.setState({dialog:{...dl, disdate:e.target.value}});
        dlg.dQuick=[0,1,2].map(n=>{ const v=this.iso(new Date(TODAY.getTime()-n*86400000));
          return {label:n===0?'Today':(n===1?'Yesterday':'2 days ago'), ...this.chip(dl.ddate===v, role.accent), onTap:()=>this.setState({dialog:{...dl, ddate:v}})}; });
        const b=new Date((dl.ddate||TODAY_ISO)+'T00:00:00');
        dlg.xQuick=(cs?[3,5,7]:[1,2,3]).map(n=>{ const v=this.iso(new Date(b.getTime()+n*86400000));
          return {label:'After '+n+' day'+(n>1?'s':''), ...this.chip(dl.disdate===v, role.accent), onTap:()=>this.setState({dialog:{...dl, disdate:v}})}; });
        dlg.delSummary = dl.ddate ? ('Delivered '+this.fmtLong(dl.ddate)+(dl.disdate?(' · discharge '+this.fmtLong(dl.disdate)):' · leave discharge blank if she is still admitted')+'.') : 'Pick the delivery date to continue.';
        dlg.confirmDisabled=dl.ddate?'1':'0.5'; dlg.onConfirm=()=>this.confirmDeliv();
      }
      if(dl.type==='scan'){ dlg.onConfirm=()=>this.confirmScan(); }
      if(dl.type==='close'||dl.type==='sms'||dl.type==='act'||dl.type==='resched'){
        let found=null; this.allSteps().forEach(({s,w})=>{ if(s.id===dl.stepId) found={s,w}; });
        if(!found) st.women.forEach(w=>(w.steps||[]).forEach(s=>{ if(s.id===dl.stepId) found={s,w}; }));
        if(found){ const s=found.s, w=found.w, cm=CAT[s.cat]||{}, lm=LVL[s.level]||{}; const vm=this.stepVM(s,w);
          dlg.womanName=w.name; dlg.stepTitle=vm.title; dlg.icon=cm.icon; dlg.lc=lm.c; dlg.lsoft=lm.s;
          dlg.dueColor=vm.dueColor; dlg.dueLabel=vm.dueLabel;
          if(dl.type==='act'){
            dlg.onBack=()=>this.setState({dialog:null});
            const exp=dl.exp===undefined?'complete':dl.exp;
            const tog=(k)=>()=>this.setState({dialog:{...dl, exp: exp===k?null:k}});
            const CH_OPEN='M6 15l6-6 6 6', CH_SHUT='M9 6l6 6-6 6';
            const dueTxt=this.fmt(s.due||s.sent);
            const NOUN={PMSMA_VISIT:'पीएमएसएमए जाँच', REFERRAL:'रेफ़रल जाँच', REFILL:'दवा लेने की तारीख', FOLLOW_UP:'फ़ॉलो-अप जाँच', TREATMENT:'फ़ॉलो-अप जाँच', LAB:'लैब जाँच', IMAGING:'सोनोग्राफ़ी', ANC_VISIT:'एएनसी जाँच', PNC_VISIT:'प्रसवोत्तर जाँच', NB_CHECK:'शिशु जाँच', REF_PW:'रेफ़रल जाँच', REF_NB:'शिशु रेफ़रल जाँच'};
            const msg='नमस्ते '+w.name+' जी। आपकी अगली '+(NOUN[s.cat]||'जाँच')+' '+lm.label+' पर '+dueTxt+' को निर्धारित है। कृपया समय पर पहुँचें। — स्वास्थ्य विभाग';
            const rowShell=(k,label,hint,ac,sf,icon)=>({label, hint, ac, sf, icon, onTap:tog(k),
              chev: exp===k?CH_OPEN:CH_SHUT, rbg: exp===k?'var(--surface-brand-soft)':'transparent'});
            const isHbnc = s.cat==='HBNC';
            const facLvl = ['PHC','CHC','SDH','DH','TERTIARY'].indexOf(ROLES[st.role].level)>-1;
            const myL = ROLES[st.role].level;
            const hiFac = myL==='TERTIARY' || myL==='DH';
            const phcTrack = !isHbnc && (myL==='PHC'||myL==='CHC') && s.level!==myL;
            const askWhere = !isHbnc && st.role==='asha';
            const lowerWarn = facLvl && LADDER.indexOf(ROLES[st.role].level)<LADDER.indexOf(s.level) ? ('Closed at '+this.facShort(ROLES[st.role].level)+' in place of '+this.facShort(s.level)) : '';
            const ownFac = LVL[ROLES[st.role].level];
            const myLvl = ROLES[st.role].level;
            const nudgeOk = !isHbnc && !hiFac;
            const facWord = ownFac.short==='TER' ? 'Tertiary care' : ownFac.short==='SC' ? 'the AAM' : ownFac.short;
            const care=dl.care||'FULL';
            const facOpts=this.facDoneOpts(s);
            const facRow=(title)=>({...rowShell('complete',title,'Where did she get care?','#1B6B47','#D9F7E8','M20 6L9 17l-5-5'),
              openComplete:exp==='complete', hasCare:false, warn:'',
              cols:facOpts.length===4?2:Math.max(1,facOpts.length), opts:facOpts.map(o=>({label:o.l, onTap:()=>{ this.applyClose(s.id,'COMPLETED',o.k); if(o.warn) setTimeout(()=>this.toast(o.warn),1600); }}))});
            
            dlg.rows=[
              askWhere
                ? {...rowShell('complete','Done','Where did she get care?','#1B6B47','#D9F7E8','M20 6L9 17l-5-5'),
                    openComplete:exp==='complete', hasCare:false, cols:3,
                    opts:[{k:'AT_REFERRED_FACILITY',l:((s.fac&&DFAC[s.fac])?DFAC[s.fac].label:(((LVL[s.level]||{}).facility||this.facShort(s.level))+'').replace('Sub-centre','AAM'))},
                          {k:'OTHER_PUBLIC_FACILITY',l:'Govt'},
                          {k:'PRIVATE_PROVIDER',l:'Private'}]
                      .map(o=>({label:o.l, onTap:()=>this.applyClose(s.id,'COMPLETED',o.k)}))}
                : facOpts.length ? facRow('Done')
                : {...rowShell('complete','Done', isHbnc?'Home visit done':('Care delivered at '+facWord),'#1B6B47','#D9F7E8','M20 6L9 17l-5-5'),
                    warn:'', chev:CH_SHUT, rbg:'transparent', onTap:()=>{ this.applyClose(s.id,'COMPLETED',null); if(lowerWarn) setTimeout(()=>this.toast(lowerWarn),1600); }},
              {...rowShell('noreply','No reply','Step stays open · try again later','#70706E','#EDECE8','M23 1L1 23M16.7 11.1A8 8 0 0 1 21 12M5 12.6a10.9 10.9 0 0 1 5.2-2.5M10.7 5a16 16 0 0 1 12.4 2.5M1 7.5A16 16 0 0 1 4.2 5.9M8.5 16.1a5 5 0 0 1 5.8 0M12 20h.01'),
                chev:CH_SHUT, rbg:'transparent', onTap:()=>this.actLogAttempt(s.id,'NO_ANSWER')},
              {...rowShell('declined','Declined','She refused this care · recorded','#994242','#F6DEDE','M18 6L6 18M6 6l12 12'),
                chev:CH_SHUT, rbg:'transparent', onTap:()=>this.actDeclined(s.id)},
            ].slice(0, (isHbnc||hiFac)?1:99);
            if(hiFac) dlg.rows=[
              hiFac ? {...rowShell('complete','Done','Care delivered at '+(myLvl==='TERTIARY'?'TC':(ROLES[st.role].facility||'DH')),'#1B6B47','#D9F7E8','M20 6L9 17l-5-5'),
                  warn:'', chev:CH_SHUT, rbg:'transparent', onTap:()=>this.applyClose(s.id,'COMPLETED','AT_THIS_FACILITY')} : facRow('Mark complete'),
              ...((!hiFac || s.level!==myL) ? [] : [{...rowShell('inc','Yet to arrive','Step stays open until marked done','#8A3D14','#FBE7DC','M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3.5 2'),
                chev:CH_SHUT, rbg:'transparent', onTap:()=>{ this.setState({dialog:null}); this.toast('Yet to arrive · step stays open'); }}])];
            dlg.showDeclined=false;
            dlg.onClose=()=>this.setState({dialog:null});
            dlg.onDeclined=()=>this.actDeclined(s.id);
          }
          if(dl.type==='resched'){
            dlg.date=dl.date||''; dlg.minDate=TODAY_ISO;
        dlg.usgTitle='Referred to '+(dl.to||'SDH')+' for '+(dl.what||'ultrasound');
            dlg.onDate=(e)=>this.setState({dialog:{...dl, date:e.target.value}});
            dlg.quick=[7,14,28].map(d=>{ const val=this.iso(new Date(TODAY.getTime()+d*86400000)); const on=dl.date===val;
              return {label:d===7?'In 1 week':(d===14?'In 2 weeks':'In 4 weeks'), ...this.chip(on, role.accent), onTap:()=>this.setState({dialog:{...dl, date:val}})}; });
            dlg.confirmDisabled=dl.date?'1':'0.5'; dlg.onConfirm=()=>this.confirmResched();
          }
          if(dl.type==='close'){
            const ownAam = st.role==='anm' && s.level==='SUBCENTRE';
            const facility = (st.role!=='asha' && st.role!=='anm') || ownAam;
            const outs = facility
              ? [{k:'COMPLETED',l:'Mark as done',h: ownAam ? 'The visit was carried out at the AAM / sub-centre' : 'The step was carried out at this facility'}]
              : [{k:'COMPLETED',l:'Completed',h:'The step was carried out'},
                 {k:'NOT_COMPLETED',l:'Not completed',h:'She did not receive the service'},
                 {k:'NO_CONTACT',l:'Could not be contacted',h:'No response after repeated attempts'}];
            const SUB= facility ? {} : {
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
            const ready = facility ? !!dl.outcome : (dl.outcome==='NO_CONTACT' ? true : !!(dl.outcome && dl.src));
            dlg.confirmDisabled=ready?'1':'0.5';
            dlg.confirmLabel = dl.asha ? 'Confirm complete' : facility ? 'Mark as done' : (dl.outcome==='COMPLETED' ? 'Mark completed' : (dl.outcome ? 'Save outcome' : 'Choose an outcome'));
            dlg.confirmBg = dl.outcome==='COMPLETED'||!dl.outcome ? 'var(--status-success)' : 'var(--ml-blue)';
            dlg.onConfirm=()=>this.confirmClose();
          }
          if(dl.type==='sms'){
            dlg.langLabel=this.isHiLang()?'Hindi':'English';
            dlg.smsHi='नमस्ते '+w.name+' जी। आपकी अगली '+(s.cat==='PMSMA_VISIT'?'पीएमएसएमए जाँच':'जाँच')+' '+lm.label+' पर '+this.fmt(s.due)+' को निर्धारित है। कृपया समय पर पहुँचें। — स्वास्थ्य विभाग';
            dlg.smsEn='“Hello '+w.name+'. Your next visit at '+lm.label+' is due on '+this.fmt(s.due)+'. Please attend on time. — Health Dept.”'; if(!this.isHiLang()) dlg.smsHi=dlg.smsEn.replace(/[“”]/g,''); dlg.smsEn='';
            dlg.onConfirm=()=>{ this.setState({dialog:null}); this.toast('SMS nudge queued'); };
          }
        }
      }
      base.dlg=dlg;
    }
    return base;
  }

  render() {
    return <div className="mobile-app-shell">{renderTemplate(this.renderVals(), this)}</div>;
  }
}
