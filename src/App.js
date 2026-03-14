/* eslint-disable */
import { useState, useRef, useEffect, useCallback, Component } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════════════════════
const C = {
  bg:"#0b0d14", card:"#13151f", card2:"#1a1d2a", border:"#252838",
  gold:"#f5c842", goldD:"#c49b1a",
  green:"#22c55e", greenD:"#15803d",
  blue:"#3b82f6", blueD:"#1d4ed8",
  purple:"#a855f7", purpleD:"#7e22ce",
  red:"#ef4444", redD:"#b91c1c",
  orange:"#f97316", orangeD:"#c2410c",
  sky:"#38bdf8", teal:"#14b8a6", pink:"#ec4899",
  wa:"#25D366", waD:"#075E54",
  textLight:"#f1f5f9", textDark:"#0f172a", muted:"#94a3b8", sub:"#64748b",
};

// ═══════════════════════════════════════════════════════════════════════════
// BACKEND API — 4-TIER ROUTER
// All AI calls go through the backend which handles: Gemini → DeepSeek → Groq → Claude
// ═══════════════════════════════════════════════════════════════════════════
// Auto-detect backend: same origin in production (Render), localhost in dev
const BACKEND = (typeof window !== "undefined" && window.location.hostname !== "localhost")
  ? ""          // same-origin: frontend & backend on same Render service
  : "https://examace-backend.onrender.com";

const callAI = async (messages, system, imgData) => {
  const body = { messages, system, imgData };
  const res = await fetch(`${BACKEND}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  const d = await res.json();
  return {
    text: d.content?.find(b => b.type === "text")?.text || "Could not process. Please try again.",
    source: d.source || "AI",
  };
};

// ── QUESTION FETCHER — uses ALOC real past questions + AI fallback ────────────
// Returns { questions, meta: { alocCount, aiCount, total } }
const fetchQuestions = async (subject, exam, year, count) => {
  const params = new URLSearchParams({
    subject: subject.toLowerCase(),
    exam:    exam.toLowerCase(),
    count:   String(count),
    ...(year && year !== "any" ? { year } : {}),
  });
  try {
    const res = await fetch(`${BACKEND}/api/questions?${params}`);
    if (!res.ok) throw new Error(`Questions API error: ${res.status}`);
    return res.json();
  } catch(e) {
    console.warn("Questions API unavailable, will use AI fallback via chat endpoint");
    // Return empty — caller will handle fallback
    return { questions: [], meta: { alocCount:0, aiCount:0, total:0, error: e.message } };
  }
};

// ── BATCH QUESTION FETCHER — for JAMB CBT (all 4 subjects at once) ────────────
const fetchQuestionsBatch = async (subjects) => {
  try {
    const res = await fetch(`${BACKEND}/api/questions/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjects }),
    });
    if (!res.ok) throw new Error(`Batch API error: ${res.status}`);
    return res.json();
  } catch(e) {
    console.warn("Batch API unavailable:", e.message);
    // Return empty structure — CBT will fall back to AI generation
    return {
      results: Object.fromEntries(subjects.map(s=>[s.name, []])),
      meta:    Object.fromEntries(subjects.map(s=>[s.name, {alocCount:0,aiCount:0,total:0}])),
      summary: { totalReal:0, totalAI:0, totalQuestions:0 },
    };
  }
};

// Source badge colours
const SOURCE_BADGE = {
  ALOC:    { bg:"#22c55e18", border:"#22c55e33", color:"#22c55e", label:"✅ Real Past Question (ALOC)" },
  AI:      { bg:"#3b82f618", border:"#3b82f633", color:"#38bdf8", label:"🤖 AI-Generated" },
  Gemini:  { bg:"#3b82f618", border:"#3b82f633", color:"#38bdf8", label:"🤖 AI (Gemini)" },
  DeepSeek:{ bg:"#a855f718", border:"#a855f733", color:"#a855f7", label:"🤖 AI (DeepSeek)" },
  Groq:    { bg:"#14b8a618", border:"#14b8a633", color:"#14b8a6", label:"🤖 AI (Groq/Llama)" },
  Claude:  { bg:"#f5c84218", border:"#f5c84233", color:"#f5c842", label:"🤖 AI (Claude)" },
};

// ═══════════════════════════════════════════════════════════════════════════
// HISTORY STORE
// ═══════════════════════════════════════════════════════════════════════════
const HISTORY_KEY = "examace_history_v2";
const STREAK_KEY  = "examace_streak_v2";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

const getHistory = () => {
  try { const r=localStorage.getItem(HISTORY_KEY); if(!r)return[]; return JSON.parse(r).filter(h=>h.timestamp>Date.now()-THIRTY_DAYS); } catch{return[];}
};
const saveHistory = (entry) => {
  try { const e=getHistory(); localStorage.setItem(HISTORY_KEY,JSON.stringify([{...entry,timestamp:Date.now(),id:Date.now()},...e].slice(0,200))); } catch{}
};
const clearHistory = () => { try{localStorage.removeItem(HISTORY_KEY);}catch{} };
const getStreak = () => { try{const r=localStorage.getItem(STREAK_KEY);return r?JSON.parse(r):{count:0,lastDate:null};}catch{return{count:0,lastDate:null};} };
const updateStreak = () => {
  try {
    const today=new Date().toDateString(); const s=getStreak();
    if(s.lastDate===today)return s;
    const yest=new Date(Date.now()-86400000).toDateString();
    const n={count:s.lastDate===yest?s.count+1:1,lastDate:today};
    localStorage.setItem(STREAK_KEY,JSON.stringify(n)); return n;
  } catch{return{count:1,lastDate:new Date().toDateString()};}
};

// ═══════════════════════════════════════════════════════════════════════════
// NIGERIA CURRICULUM DATA
// ═══════════════════════════════════════════════════════════════════════════
const EXAMS    = ["WAEC","NECO","JAMB"];
const YEARS    = ["2025","2024","2023","2022","2021","2020","2019","2018","2017","2016","2015","2014","2013","2012","2010","2008","2005","2003","2000"];
const SUBJECTS = [
  "Mathematics","English Language","Physics","Chemistry","Biology",
  "Economics","Government","Literature in English","Accounting","Commerce",
  "Geography","Agricultural Science","Further Mathematics","Civic Education",
  "Christian Religious Studies","Islamic Studies","History","Yoruba","Igbo","Hausa"
];

const EXAM_DATES = {
  "WAEC 2025":  new Date("2026-05-05"),
  "NECO 2025":  new Date("2026-06-16"),
  "JAMB 2025":  new Date("2026-04-16"),
};

// Nigeria-specific topic maps for each subject
const SYLLABUS = {
  Mathematics:[
    "Number & Numeration","Algebraic Processes","Polynomials & Equations",
    "Geometry & Mensuration","Trigonometry","Statistics & Probability",
    "Calculus (Further)","Matrices & Determinants","Vectors","Modular Arithmetic",
    "Sets & Logic","Surds & Indices","Sequences & Series","Commercial Arithmetic",
    "Coordinate Geometry","Circle Theorems","Construction & Loci"
  ],
  "English Language":[
    "Comprehension","Summary Writing","Continuous Writing (Essay)",
    "Lexis & Structure","Oral English (Vowels & Consonants)","Register & Figures of Speech",
    "Tense & Agreement","Vocabulary in Context","Letter Writing","Speech Work",
    "Reading Comprehension (Cloze Test)","Directed Writing"
  ],
  Physics:[
    "Scalars & Vectors","Linear Motion & Dynamics","Newton's Laws of Motion",
    "Circular & Projectile Motion","Work, Energy & Power","Elasticity & Hooke's Law",
    "Fluid Mechanics","Temperature & Thermometers","Heat Capacity & Latent Heat",
    "Gas Laws (Boyle, Charles)","Waves — Types & Properties","Sound & Acoustics",
    "Light — Reflection & Refraction","Lenses & Mirrors","Electricity (Ohm's Law)",
    "Capacitors & Inductors","Magnetic Fields","Atomic & Nuclear Physics"
  ],
  Chemistry:[
    "Atomic Structure & Periodic Table","Chemical Bonding","Stoichiometry & Mole Concept",
    "Acids, Bases & Salts","Oxidation & Reduction (Redox)","Electrochemistry",
    "Organic Chemistry — Hydrocarbons","Organic — Functional Groups",
    "Reaction Kinetics & Equilibrium","Metals — Extraction & Properties",
    "Non-metals (Halogens, Noble Gases)","Environmental Chemistry",
    "Nuclear Chemistry","Water & Solutions","Gas Laws & Molar Volume"
  ],
  Biology:[
    "Cell Structure & Organisation","Nutrition in Plants & Animals","Photosynthesis & Respiration",
    "Transport in Plants (Osmosis/Diffusion)","Circulatory System","Excretion & Homeostasis",
    "Nervous System & Sense Organs","Reproduction (Sexual & Asexual)","Genetics & Heredity",
    "Evolution & Natural Selection","Ecology & Ecosystem","Food Webs & Energy Flow",
    "Classification of Living Things","Diseases & Pathogens","Biotechnology & Genetics"
  ],
  Economics:[
    "Demand, Supply & Market Equilibrium","Price Elasticity","Consumer Theory (Utility)",
    "Theory of Production & Cost","Market Structures (Perfect, Monopoly, Oligopoly)",
    "National Income & GDP","Nigerian Economy — Structure","Agriculture in Nigeria",
    "Industry & Industrialisation","Money, Banking & CBN Policy","Inflation & Unemployment",
    "Government Budget & Fiscal Policy","International Trade & Balance of Payments",
    "Economic Development & Population","ECOWAS & African Union"
  ],
  Government:[
    "Meaning & Scope of Government","Constitutional Development in Nigeria",
    "Types of Government (Democracy, Federalism)","Nigerian Independence 1960",
    "Nigerian Constitution (1963, 1979, 1999)","Legislature — NASS & State Houses",
    "Executive — President & Governors","Judiciary — Supreme Court & Roles",
    "Electoral Commission (INEC) & Elections","Political Parties in Nigeria",
    "Citizenship & Fundamental Rights","Local Government & Tier System",
    "International Relations — UN, AU, ECOWAS","Military Rule in Nigeria",
    "Separation of Powers & Rule of Law","Pressure Groups & Civil Society"
  ],
  "Literature in English":[
    "Prose — Nigerian & African Literature","Drama — Shakespearean & African Plays",
    "Poetry — African & Caribbean Verse","Literary Devices & Techniques",
    "Chinua Achebe — Things Fall Apart","Wole Soyinka — The Lion and the Jewel",
    "Prescribed Novels & Plays Analysis","Character & Theme Analysis",
    "Summary & Critical Appreciation","Narrative Techniques"
  ],
  Geography:[
    "Maps, Scales & Grid References","Latitude, Longitude & Time Zones",
    "Plate Tectonics & Earthquakes","Rocks & Rock Formation",
    "Weather & Climate Zones","Nigeria's Climate Regions",
    "Rivers & Drainage Basins","Population Geography (Nigeria & Africa)",
    "Agriculture in West Africa","Natural Resources of Nigeria",
    "Environmental Degradation & Conservation","Urban & Rural Settlement in Nigeria",
    "Transport & Communication in Nigeria","West Africa — Physical & Human Geography"
  ],
  "Agricultural Science":[
    "Meaning & Importance of Agriculture","Types of Farming Systems in Nigeria",
    "Soil — Types, Properties & Conservation","Crop Production (Maize, Yam, Cassava)",
    "Fertilisers & Soil Improvement","Pest & Disease Control in Nigeria",
    "Animal Husbandry (Poultry, Cattle, Goats)","Fisheries & Aquaculture in Nigeria",
    "Farm Machinery & Equipment","Agricultural Economics & Marketing",
    "Land Tenure System in Nigeria","Forestry & Wildlife Conservation",
    "Irrigation & Water Supply","Post-harvest Technology"
  ],
  Accounting:[
    "Double Entry Bookkeeping","Trial Balance","Final Accounts (Trading, P&L, Balance Sheet)",
    "Bank Reconciliation Statement","Control Accounts","Depreciation Methods",
    "Partnership Accounts","Company Accounts & Shares","Cash Book & Petty Cash",
    "Stock Valuation (FIFO, LIFO)","Incomplete Records","Club Accounts",
    "Manufacturing Accounts","Accounting Concepts & Conventions"
  ],
};

// JAMB high-frequency past question topics (well-known repeating areas)
const JAMB_HOT_TOPICS = {
  Mathematics: [
    "Fractions, Ratios & Percentages (appears every year)",
    "Quadratic Equations & Completing the Square",
    "Indices & Logarithms",
    "Sets — Union, Intersection, Venn Diagrams",
    "Statistics — Mean, Median, Mode, Range",
    "Linear & Simultaneous Equations",
    "Mensuration — Areas & Volumes",
    "Commercial Maths — Simple & Compound Interest, Profit/Loss",
    "Geometry — Angles, Triangles, Circle Theorems",
    "Surds & Sequences",
    "Matrices — 2×2 Determinant & Inverse",
    "Coordinate Geometry — Midpoint, Gradient, Distance"
  ],
  Physics: [
    "Newton's Laws — every year guaranteed",
    "Electric Circuits — Ohm's Law, Resistance, Power",
    "Heat & Temperature — specific heat, latent heat",
    "Waves — frequency, wavelength, speed formula",
    "Projectile Motion — horizontal & vertical components",
    "Work, Energy, Power — efficiency problems",
    "Pressure — fluid, atmospheric, Pascal's principle",
    "Mirrors & Lenses — focal length, ray diagrams",
    "Radioactivity — half-life calculations",
    "Electromagnetic Spectrum",
    "Simple Harmonic Motion — period, frequency",
    "Capacitors — series, parallel, energy stored"
  ],
  Chemistry: [
    "Mole Concept — molar mass calculations (every JAMB)",
    "Periodic Table — Groups, Periods, Properties",
    "Chemical Bonding — ionic, covalent, metallic",
    "Acids & Bases — pH, neutralisation, titration",
    "Organic Chemistry — alkanes, alkenes, functional groups",
    "Electrochemistry — electrolysis, Faraday's laws",
    "Rates of Reaction & Equilibrium",
    "Redox Reactions — oxidation numbers",
    "Gas Laws — Boyle's, Charles', combined",
    "Metallurgy — extraction of iron, aluminium",
    "Halogens — properties, reactions, uses",
    "Thermochemistry — exothermic/endothermic reactions"
  ],
  Biology: [
    "Cell Structure — organelles & their functions (every year)",
    "Genetics — Mendel's laws, crosses, F1/F2 ratios",
    "Photosynthesis & Respiration equations",
    "Classification — kingdom to species, binomial nomenclature",
    "Ecology — food chains, energy pyramids, nutrient cycles",
    "Human Digestive System — enzymes & absorption",
    "Circulatory System — heart, blood, ABO grouping",
    "Excretion — kidney structure & nephron",
    "Nervous System — neurones, reflex arc",
    "Reproduction — mitosis vs meiosis",
    "Transport in Plants — osmosis, transpiration, xylem/phloem",
    "Diseases — vectors, causative agents, prevention"
  ],
  "English Language": [
    "Comprehension — inferential questions (highest marks)",
    "Synonyms & Antonyms — vocabulary in context",
    "Sentence Construction — correct/incorrect",
    "Parts of Speech — nouns, verbs, adjectives, adverbs",
    "Tenses — simple, continuous, perfect",
    "Figures of Speech — simile, metaphor, personification",
    "Oral English — vowel sounds, consonants, stress",
    "Register — formal vs informal language",
    "Cloze Test — fill-in-the-gap passages",
    "Direct & Indirect Speech",
    "Punctuation & Spelling",
    "Idiomatic Expressions"
  ],
  Economics: [
    "Supply & Demand — shifts, equilibrium price",
    "Price Elasticity of Demand & Supply",
    "National Income — GDP, GNP, per capita income",
    "Money — functions, quantity theory, inflation",
    "Commercial Banks & CBN functions",
    "International Trade — comparative advantage, balance of payments",
    "Market Structures — perfect competition, monopoly",
    "Theory of Production — returns to scale",
    "Population & Labour in Nigeria",
    "Government Revenue — taxes, petroleum revenue (Nigeria)",
    "ECOWAS & economic integration in West Africa",
    "Agricultural policies in Nigeria (Green Revolution etc.)"
  ],
  Government: [
    "Nigerian Constitutions 1963, 1979, 1999 — differences",
    "Federalism — features, merits, demerits",
    "Legislature — bicameral system, NASS functions",
    "Executive — Presidential vs Parliamentary system",
    "Judiciary — independence, judicial review",
    "Electoral process — INEC, types of elections",
    "Political parties — history in Nigeria (NPC, NCNC, AG, PDP, APC)",
    "Military rule — coups 1966, 1983, 1993",
    "Citizenship — rights & obligations (Chapter IV, 1999 Constitution)",
    "International organisations — UN, AU, ECOWAS, Commonwealth",
    "Local government — 1976 reform, roles & functions",
    "Human rights — universal declaration, Nigerian bill of rights"
  ],
};

// Nigeria-specific context for prompts
const NG_CONTEXT = `
CRITICAL — NIGERIA CURRICULUM RULES:
- All questions MUST reflect Nigerian secondary school curriculum (WAEC/NECO/JAMB SSCE standard)
- Use Nigerian examples: Naira (₦) not Dollar, Lagos/Abuja/Kano/Ibadan not London/New York
- Nigerian history: reference Nigerian independence (1960), civil war (1967-70), Nigerian leaders
- Biology examples: use Nigerian flora & fauna (oil palm, cashew, tilapia, agama lizard)
- Economics: reference CBN, OPEC, Nigerian petroleum, ECOWAS, Niger Delta
- Geography: Sahel, Guinea Savanna, Mangrove Swamp, Jos Plateau, River Niger, River Benue
- Government: 1999 Constitution, NASS (Senate + House of Reps), INEC, State Governors
- Chemistry: use Nigerian industrial examples (NNPC, Dangote Refinery, Kaduna Textile)
- Physics: use Nigerian measurements and real-life Nigerian context
- All monetary values in Naira (₦)
- Reference past WAEC/NECO/JAMB question styles and marking schemes
`;

const gradeFromPct = p => p>=75?{g:"A1",c:C.green}:p>=65?{g:"B2",c:C.sky}:p>=60?{g:"B3",c:C.sky}:p>=55?{g:"C4",c:C.orange}:p>=50?{g:"C5",c:C.orange}:p>=45?{g:"C6",c:C.gold}:p>=40?{g:"D7",c:C.red}:p>=35?{g:"E8",c:C.red}:{g:"F9",c:C.red};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
const toBase64 = f => new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result.split(",")[1]); r.onerror=rej; r.readAsDataURL(f); });
const ts = () => new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
const dateStr = (ts) => new Date(ts).toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"});

const SYS = (exam, subject, year) =>
  `You are ExamAce AI — Nigeria's #1 ${exam}/NECO/JAMB exam preparation tutor.
Context: ${exam} · ${subject}${year ? " · "+year+" past questions style" : ""}
${NG_CONTEXT}
Format: **bold** key terms, numbered steps, clear paragraphs.
Always follow official Nigerian ${exam} syllabus. Be warm, expert, encouraging.
Reference marking schemes, common examiner tricks, and high-frequency topics.`;

// ═══════════════════════════════════════════════════════════════════════════
// TEXT FORMATTER
// ═══════════════════════════════════════════════════════════════════════════
const fmt = (text, onDark=true) => {
  const hc=onDark?C.gold:"#92400e", bc=onDark?"#ffffff":"#1e293b",
        body=onDark?"#e2e8f0":"#1e293b", codeBg=onDark?"#0a0c14":"#e2e8f0",
        codeC=onDark?"#f1f5f9":"#1e293b", hr=onDark?"#2a2d3e":"#cbd5e1";
  return text.split("\n").map((l,i) => {
    let html = l
      .replace(/^###\s*(.*)/,`<span style="font-size:13px;font-weight:800;color:${hc}">$1</span>`)
      .replace(/^##\s*(.*)/,`<span style="font-size:14px;font-weight:900;color:${hc}">$1</span>`)
      .replace(/^#\s*(.*)/,`<span style="font-size:15px;font-weight:900;color:${hc}">$1</span>`)
      .replace(/\*\*(.*?)\*\*/g,`<b style="color:${bc}">$1</b>`)
      .replace(/\*(.*?)\*/g,`<b style="color:${bc}">$1</b>`)
      .replace(/`(.*?)`/g,`<code style="background:${codeBg};color:${codeC};padding:1px 6px;border-radius:4px;font-size:12px">$1</code>`)
      .replace(/^━+$/,`<hr style="border:none;border-top:1px solid ${hr};margin:6px 0"/>`)
      .replace(/^•\s*/,`<span style="color:${hc}">•</span> `);
    return <div key={i} dangerouslySetInnerHTML={{__html:html||"&nbsp;"}} style={{lineHeight:1.85,color:body}}/>;
  });
};

// AI Source badge
const AiBadge = ({ source }) => {
  if (!source) return null;
  const info = SOURCE_BADGE[source];
  const c = info?.color || C.muted;
  const label = info?.label || `⚡ ${source}`;
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:4, background:info?.bg||c+"18", border:`1px solid ${info?.border||c+"33"}`, borderRadius:20, padding:"2px 8px", fontSize:9, color:c, fontWeight:800, marginTop:6 }}>
      {label}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// UI ATOMS
// ═══════════════════════════════════════════════════════════════════════════
const Card = ({children,style={}}) => <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:16,marginBottom:14,...style}}>{children}</div>;
const Label = ({c=C.muted,children}) => <div style={{fontSize:11,fontWeight:800,color:c,textTransform:"uppercase",letterSpacing:1.2,marginBottom:7}}>{children}</div>;
const Inp = ({value,onChange,placeholder,multiline,rows,type="text"}) => multiline
  ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows||5} style={{width:"100%",background:C.card2,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"11px 14px",color:C.textLight,fontSize:13,outline:"none",fontFamily:"inherit",resize:"vertical",lineHeight:1.6}}/>
  : <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type} style={{width:"100%",background:C.card2,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"11px 14px",color:C.textLight,fontSize:13,outline:"none",fontFamily:"inherit"}}/>;
const Pills = ({options,value,onChange,color=C.gold}) => <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{options.map(o=><button key={o} onClick={()=>onChange(o)} style={{background:value===o?color+"28":"transparent",border:`1.5px solid ${value===o?color:C.border}`,borderRadius:20,padding:"6px 14px",color:value===o?color:C.muted,fontWeight:value===o?800:400,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{o}</button>)}</div>;
const Sel = ({value,onChange,options,placeholder}) => <select value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",background:C.card2,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"11px 14px",color:value?C.textLight:C.sub,fontSize:13,outline:"none",fontFamily:"inherit"}}><option value="">{placeholder||"Select..."}</option>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>;
const Btn = ({onClick,loading:l,children,color=C.gold,tc="#000",disabled,sm}) => <button onClick={onClick} disabled={l||disabled} style={{width:sm?"auto":"100%",background:l||disabled?C.card2:color,border:"none",borderRadius:sm?10:13,padding:sm?"8px 18px":"14px 20px",color:l||disabled?C.sub:tc,fontWeight:800,fontSize:sm?12:14,cursor:l||disabled?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit"}}>{l?<><span style={{width:15,height:15,border:"2px solid #444",borderTopColor:color,borderRadius:"50%",display:"inline-block",animation:"spin .7s linear infinite"}}/>Working...</>:children}</button>;
const Out = ({text,color=C.gold,source}) => <div style={{background:C.card2,border:`1px solid ${color}33`,borderRadius:14,padding:16,maxHeight:460,overflowY:"auto",fontSize:13,marginTop:12,animation:"fadeUp .4s ease"}}>{fmt(text,true)}{source&&<AiBadge source={source}/>}</div>;

// Mini bar chart
const MiniBarChart = ({ data, color=C.gold, height=60 }) => {
  if(!data||data.length===0)return null;
  const max=Math.max(...data.map(d=>d.value),1);
  return <div style={{display:"flex",alignItems:"flex-end",gap:4,height,padding:"4px 0"}}>{data.map((d,i)=><div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}><div style={{fontSize:9,color:C.muted,fontWeight:700}}>{d.value>0?d.value:""}</div><div style={{width:"100%",background:color+"22",borderRadius:"4px 4px 0 0",position:"relative",height:height-20}}><div style={{position:"absolute",bottom:0,left:0,right:0,background:color,borderRadius:"4px 4px 0 0",height:`${(d.value/max)*100}%`,transition:"height .8s ease",minHeight:d.value>0?4:0}}/></div><div style={{fontSize:8,color:C.sub,textAlign:"center",lineHeight:1.2}}>{d.label}</div></div>)}</div>;
};

// Radial progress
const RadialProgress = ({ pct, color, size=80, label }) => {
  const r=(size-10)/2, circ=2*Math.PI*r, dash=(pct/100)*circ;
  return <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><svg width={size} height={size} style={{transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={8}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{transition:"stroke-dasharray 1s ease"}}/></svg><div style={{position:"relative",marginTop:-size-4}}><div style={{width:size,height:size,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}><div style={{fontWeight:900,fontSize:size>70?18:13,color}}>{pct}%</div></div></div><div style={{fontSize:10,color:C.muted,fontWeight:700,marginTop:size-8}}>{label}</div></div>;
};

// ═══════════════════════════════════════════════════════════════════════════
// HISTORY DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
function HistoryDashboard({ onClose }) {
  const [history,setHistory]=useState(getHistory());
  const [filter,setFilter]=useState("all");
  const [streak]=useState(getStreak());
  const [confirmClear,setConfirmClear]=useState(false);

  const quizHistory=history.filter(h=>h.type==="quiz");
  const cbtHistory=history.filter(h=>h.type==="cbt");
  const filtered=filter==="all"?history:filter==="quiz"?quizHistory:cbtHistory;
  const avgScore=quizHistory.length>0?Math.round(quizHistory.reduce((s,h)=>s+h.pct,0)/quizHistory.length):0;
  const bestScore=quizHistory.length>0?Math.max(...quizHistory.map(h=>h.pct)):0;
  const bestJAMB=cbtHistory.length>0?Math.max(...cbtHistory.map(h=>h.jambScore)):0;

  const subjectStats={};
  quizHistory.forEach(h=>{if(!subjectStats[h.subject])subjectStats[h.subject]={sum:0,count:0};subjectStats[h.subject].sum+=h.pct;subjectStats[h.subject].count+=1;});
  const subjectAvgs=Object.entries(subjectStats).map(([s,v])=>({subject:s,avg:Math.round(v.sum/v.count),count:v.count})).sort((a,b)=>b.avg-a.avg);
  const chartData=quizHistory.slice(0,7).reverse().map((h,i)=>({label:h.subject?.slice(0,4)||`Q${i+1}`,value:h.pct}));
  const gradeDist={A1:0,B:0,C:0,F:0};
  quizHistory.forEach(h=>{if(h.pct>=75)gradeDist.A1++;else if(h.pct>=65)gradeDist.B++;else if(h.pct>=50)gradeDist.C++;else gradeDist.F++;});
  const recentAvg=quizHistory.slice(0,5).reduce((s,h)=>s+h.pct,0)/Math.max(quizHistory.slice(0,5).length,1);
  const olderAvg=quizHistory.slice(5,10).reduce((s,h)=>s+h.pct,0)/Math.max(quizHistory.slice(5,10).length,1);
  const trend=recentAvg>=olderAvg?"improving":"declining";

  return (
    <div style={{position:"fixed",inset:0,background:C.bg,zIndex:200,overflowY:"auto",paddingBottom:40}}>
      <div style={{background:`linear-gradient(135deg,#0a0c14,#12141e)`,borderBottom:`1px solid ${C.border}`,padding:"14px 16px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,zIndex:10}}>
        <button onClick={onClose} style={{background:C.card2,border:`1px solid ${C.border}`,color:C.muted,borderRadius:10,padding:"7px 14px",cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:700}}>← Back</button>
        <div style={{flex:1}}><div style={{fontWeight:900,fontSize:17,color:C.textLight}}>📊 My Progress</div><div style={{fontSize:11,color:C.muted}}>Last 30 days · {history.length} sessions</div></div>
        <button onClick={()=>setConfirmClear(true)} style={{background:C.red+"22",border:`1px solid ${C.red}33`,color:C.red,borderRadius:10,padding:"7px 12px",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:700}}>🗑️ Clear</button>
      </div>
      <div style={{padding:"16px 14px 0"}}>
        {confirmClear&&<Card style={{background:C.red+"18",borderColor:C.red+"44",textAlign:"center"}}><div style={{fontWeight:800,color:C.red,marginBottom:8}}>⚠️ Clear all history?</div><div style={{fontSize:12,color:C.muted,marginBottom:12}}>All 30 days of progress will be permanently deleted.</div><div style={{display:"flex",gap:8}}><button onClick={()=>{clearHistory();setHistory([]);setConfirmClear(false);}} style={{flex:1,background:C.red,border:"none",borderRadius:10,padding:"10px 0",color:"#fff",fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>Yes, Clear All</button><button onClick={()=>setConfirmClear(false)} style={{flex:1,background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 0",color:C.muted,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button></div></Card>}
        {history.length===0?(<Card style={{textAlign:"center",padding:40}}><div style={{fontSize:48,marginBottom:12}}>📊</div><div style={{fontWeight:800,fontSize:16,color:C.textLight,marginBottom:6}}>No history yet</div><div style={{fontSize:13,color:C.muted}}>Complete a Quiz or JAMB CBT to start tracking!</div></Card>):(
          <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:14}}>
              {[["🔥 Streak",`${streak.count}d`,C.orange],["📝 Quizzes",quizHistory.length,C.blue],["🖥️ CBT Tests",cbtHistory.length,C.purple],["⭐ Best",`${bestScore}%`,C.gold]].map(([l,v,c])=>(
                <div key={l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 8px",textAlign:"center"}}><div style={{fontWeight:900,fontSize:18,color:c}}>{v}</div><div style={{fontSize:9,color:C.muted,marginTop:3}}>{l}</div></div>
              ))}
            </div>
            {quizHistory.length>=3&&<Card style={{background:trend==="improving"?C.green+"18":C.red+"18",borderColor:trend==="improving"?C.green+"44":C.red+"44",display:"flex",alignItems:"center",gap:12}}><div style={{fontSize:28}}>{trend==="improving"?"📈":"📉"}</div><div><div style={{fontWeight:800,color:trend==="improving"?C.green:C.red,fontSize:13}}>{trend==="improving"?"You're improving! 🎉":"Needs attention ⚠️"}</div><div style={{fontSize:12,color:C.muted}}>Recent avg: <b style={{color:C.textLight}}>{Math.round(recentAvg)}%</b> vs earlier: <b style={{color:C.textLight}}>{Math.round(olderAvg)}%</b></div></div></Card>}
            {chartData.length>0&&<Card><Label c={C.gold}>Last {chartData.length} Quiz Scores</Label><MiniBarChart data={chartData} color={C.gold} height={80}/></Card>}
            {quizHistory.length>0&&<Card><Label>Performance Overview</Label><div style={{display:"flex",justifyContent:"space-around",padding:"8px 0"}}><RadialProgress pct={avgScore} color={C.gold} label="Avg Score"/><RadialProgress pct={bestScore} color={C.green} label="Best Score"/><RadialProgress pct={Math.round((gradeDist.A1/Math.max(quizHistory.length,1))*100)} color={C.purple} label="A1 Rate"/></div></Card>}
            {quizHistory.length>0&&<Card><Label>Grade Distribution</Label><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>{[["A1",gradeDist.A1,C.green],["B",gradeDist.B,C.sky],["C",gradeDist.C,C.orange],["F",gradeDist.F,C.red]].map(([g,count,color])=><div key={g} style={{background:color+"18",border:`1px solid ${color}33`,borderRadius:10,padding:"10px 8px",textAlign:"center"}}><div style={{fontWeight:900,fontSize:22,color}}>{count}</div><div style={{fontSize:10,color:C.muted}}>Grade {g}</div><div style={{fontSize:10,color,fontWeight:700}}>{quizHistory.length>0?Math.round((count/quizHistory.length)*100):0}%</div></div>)}</div></Card>}
            {subjectAvgs.length>0&&<Card><Label c={C.sky}>Performance by Subject</Label>{subjectAvgs.slice(0,8).map(s=>{const grade=gradeFromPct(s.avg);return(<div key={s.subject} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5,alignItems:"center"}}><div><div style={{fontSize:13,fontWeight:700,color:C.textLight}}>{s.subject}</div><div style={{fontSize:10,color:C.muted}}>{s.count} quiz{s.count!==1?"zes":""}</div></div><div style={{textAlign:"right"}}><div style={{fontWeight:900,fontSize:15,color:grade.c}}>{s.avg}%</div><div style={{fontSize:10,color:grade.c}}>Grade {grade.g}</div></div></div><div style={{background:C.border,borderRadius:6,height:7}}><div style={{background:grade.c,height:"100%",borderRadius:6,width:`${s.avg}%`,transition:"width 1s ease"}}/></div></div>);})}<div style={{marginTop:10,background:C.card2,borderRadius:10,padding:10}}><div style={{fontSize:11,fontWeight:800,color:C.gold,marginBottom:4}}>💡 AI INSIGHT</div><div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>{subjectAvgs[0]?.avg>=70?"🏆 Strongest in "+subjectAvgs[0].subject+" ("+subjectAvgs[0].avg+"%) — maintain this!":"Focus more on "+subjectAvgs[0].subject+" — currently at "+subjectAvgs[0].avg+"%"}{subjectAvgs.length>1&&subjectAvgs[subjectAvgs.length-1]?.avg<60?" Weakest in "+subjectAvgs[subjectAvgs.length-1].subject+" ("+subjectAvgs[subjectAvgs.length-1].avg+"%) — needs urgent attention.":" Keep practising consistently!"}</div></div></Card>}
            {cbtHistory.length>0&&<Card><Label c={C.purple}>JAMB CBT History</Label>{cbtHistory.map((h,i)=><div key={i} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div><div style={{fontWeight:800,fontSize:15,color:C.purple}}>🖥️ {h.jambScore}/400</div><div style={{fontSize:11,color:C.muted}}>{dateStr(h.timestamp)}</div></div><div style={{background:h.jambScore>=280?C.green+"22":h.jambScore>=200?C.gold+"22":C.red+"22",border:`1px solid ${h.jambScore>=280?C.green:h.jambScore>=200?C.gold:C.red}44`,borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:800,color:h.jambScore>=280?C.green:h.jambScore>=200?C.gold:C.red}}>{h.jambScore>=280?"🎓 Uni Ready":h.jambScore>=200?"📚 Keep Going":"🔄 More Practice"}</div></div><div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}}>{(h.subjectBreakdown||[]).map((s,j)=>{const p=Math.round((s.correct/s.total)*100);return <div key={j} style={{background:C.card,borderRadius:8,padding:"6px 10px"}}><div style={{fontSize:11,color:C.textLight,fontWeight:600,marginBottom:3}}>{s.name}</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{background:C.border,borderRadius:3,height:5,flex:1,marginRight:6}}><div style={{background:p>=70?C.green:p>=50?C.gold:C.red,height:"100%",borderRadius:3,width:`${p}%`}}/></div><div style={{fontSize:10,fontWeight:800,color:p>=70?C.green:p>=50?C.gold:C.red,flexShrink:0}}>{s.correct}/{s.total}</div></div></div>})}</div></div>)}</Card>}
            <div style={{display:"flex",gap:6,marginBottom:12}}>{[["all","All Sessions"],["quiz","Quizzes"],["cbt","CBT Tests"]].map(([f,l])=><button key={f} onClick={()=>setFilter(f)} style={{background:filter===f?C.blue+"22":"transparent",border:`1px solid ${filter===f?C.blue:C.border}`,borderRadius:20,padding:"6px 14px",color:filter===f?C.blue:C.muted,fontWeight:filter===f?800:400,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>)}</div>
            <Card><Label>Session Log ({filtered.length})</Label>{filtered.length===0?<div style={{textAlign:"center",color:C.muted,fontSize:13,padding:20}}>No sessions of this type yet.</div>:filtered.map((h,i)=>{const grade=h.type==="quiz"?gradeFromPct(h.pct):null;return(<div key={i} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`,alignItems:"center"}}><div style={{width:36,height:36,background:h.type==="cbt"?C.purple+"22":C.blue+"22",border:`1px solid ${h.type==="cbt"?C.purple:C.blue}33`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{h.type==="cbt"?"🖥️":"📝"}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:C.textLight,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.type==="cbt"?"JAMB CBT Mock":`${h.exam} ${h.subject}`}</div><div style={{fontSize:11,color:C.muted}}>{h.type==="quiz"&&`${h.qtype==="year"?h.year:"Random"} · `}{dateStr(h.timestamp)}</div></div><div style={{textAlign:"right",flexShrink:0}}>{h.type==="cbt"?<div style={{fontWeight:900,fontSize:15,color:C.purple}}>{h.jambScore}<span style={{fontSize:10,color:C.muted}}>/400</span></div>:<div style={{fontWeight:900,fontSize:15,color:grade.c}}>{h.pct}%</div>}{grade&&<div style={{fontSize:10,color:grade.c}}>Grade {grade.g}</div>}</div></div>);})}</Card>
            <a href={`https://wa.me/?text=${encodeURIComponent(`📊 My ExamAce AI Progress Report\n━━━━━━━━━━━━\n🔥 Study Streak: ${streak.count} days\n📝 Quizzes: ${quizHistory.length} · Avg: ${avgScore}% · Best: ${bestScore}%\n🖥️ JAMB CBT: ${cbtHistory.length} attempts${cbtHistory.length>0?"\n🎯 Best JAMB: "+bestJAMB+"/400":""}\n\nPrepared with ExamAce AI 🏆 🇳🇬`)}`} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:C.wa,borderRadius:13,padding:"14px 0",color:"#fff",fontWeight:800,fontSize:14,textDecoration:"none",marginTop:4}}>💬 Share Progress on WhatsApp</a>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// JAMB CBT — Full 180-question simulation with Nigeria past question prompts
// ═══════════════════════════════════════════════════════════════════════════
function JambCBT({ onSaveHistory }) {
  const [screen,setScreen]   = useState("setup");
  const [subjects,setSubjects]= useState(["Use of English","Mathematics","Physics","Chemistry"]);
  const [allQs,setAllQs]     = useState({});
  const [curSubj,setCurSubj] = useState(0);
  const [curQ,setCurQ]       = useState(0);
  const [answers,setAnswers] = useState({});
  const [flagged,setFlagged] = useState({});
  const [timeLeft,setTimeLeft]= useState(120*60);
  const [loading,setLoading] = useState(false);
  const [loadMsg,setLoadMsg] = useState("");
  const [loadDone,setLoadDone]= useState([]);
  const [loadErr,setLoadErr] = useState("");
  const [scores,setScores]   = useState({});
  const [reviewing,setReviewing]=useState(null);
  const timerRef  = useRef();
  const allQsRef  = useRef({});   // keep a ref in sync so timer closure can access latest
  const answersRef= useRef({});

  // Keep refs in sync with state
  useEffect(()=>{ allQsRef.current   = allQs;   },[allQs]);
  useEffect(()=>{ answersRef.current = answers; },[answers]);

  const getQCount = s => s==="Use of English"?60:40;
  const totalQuestions = subjects.reduce((s,subj)=>s+getQCount(subj),0);

  // Timer — uses refs to avoid stale closure on submitAll
  useEffect(()=>{
    if(screen==="test"){
      timerRef.current=setInterval(()=>{
        setTimeLeft(t=>{
          if(t<=1){ clearInterval(timerRef.current); doSubmit(); return 0; }
          return t-1;
        });
      },1000);
    }
    return()=>clearInterval(timerRef.current);
  },[screen]);

  const fmtTime = s=>`${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  // ── Start test — load from ALOC + AI fallback ──────────────────────────────
  const startTest = async () => {
    setLoading(true);
    setLoadErr("");
    setLoadDone([]);
    setLoadMsg("Connecting to ALOC past questions database...");

    try {
      const batchPayload = subjects.map(name => ({
        name, exam:"jamb", year:null, count:getQCount(name),
      }));

      setLoadMsg("Fetching real JAMB past questions...");
      const data = await fetchQuestionsBatch(batchPayload);
      const { results, meta, summary } = data;

      console.log(`📚 CBT: ${summary.totalReal} real + ${summary.totalAI} AI questions`);

      const generated = {};
      for(const subj of subjects){
        const qs = results[subj] || [];
        generated[subj] = qs;
        setLoadDone(d=>[...d, subj]);
        if(qs.length === 0){
          console.warn(`⚠️  No questions loaded for ${subj}`);
        }
      }

      // If backend returned nothing, fall back to AI generation via /api/chat
      const totalLoaded = Object.values(generated).reduce((s,qs)=>s+qs.length, 0);
      if(totalLoaded === 0){
        setLoadMsg("Backend unavailable — generating with AI directly...");
        for(const subj of subjects){
          setLoadMsg(`Generating ${subj} questions with AI...`);
          try {
            const qCount = getQCount(subj);
            const prompt = `Generate exactly ${qCount} JAMB-style MCQs for "${subj}". `
              + `Follow official JAMB syllabus. Use Nigerian context. `
              + `Return ONLY a JSON array: `
              + `[{"q":"","options":{"A":"","B":"","C":"","D":""},"answer":"A","explanation":"","topic":"","year":"20XX","difficulty":"easy","source":"AI"}]`;
            const { text } = await callAI(prompt, `You are a JAMB examiner for ${subj}.`);
            const clean = text.replace(/\`\`\`json|\`\`\`/g,"").trim();
            const start = clean.indexOf("["), end = clean.lastIndexOf("]");
            if(start >= 0 && end >= 0){
              const parsed = JSON.parse(clean.slice(start, end+1));
              if(Array.isArray(parsed) && parsed.length > 0){
                generated[subj] = parsed.slice(0, qCount);
                setLoadDone(d=>[...d, subj]);
              }
            }
          } catch(aiErr){
            console.error(`AI fallback for ${subj} failed:`, aiErr);
          }
        }
        const totalAfterFallback = Object.values(generated).reduce((s,qs)=>s+qs.length, 0);
        if(totalAfterFallback === 0){
          throw new Error("Could not load questions from any source. Check your internet connection and try again.");
        }
      }

      allQsRef.current = generated;
      setAllQs(generated);
      setAnswers({}); setFlagged({});
      setCurSubj(0);  setCurQ(0);
      setTimeLeft(120*60);
      setScreen("test");
      updateStreak();
    } catch(e) {
      console.error("CBT load error:", e);
      setLoadErr(e.message || "Failed to load questions. Please try again.");
    }
    setLoading(false);
  };

  // ── Submit — uses ref so timer closure always has fresh data ──────────────
  const doSubmit = () => {
    clearInterval(timerRef.current);
    const qs  = allQsRef.current;
    const ans = answersRef.current;
    const sc  = {};
    subjects.forEach(s=>{
      const qArr = qs[s]||[];
      const aMap = ans[s]||{};
      sc[s]={ correct:qArr.filter((_,i)=>aMap[i]===qArr[i]?.answer).length, total:qArr.length };
    });
    setScores(sc);
    setScreen("result");
    const totalCorrect = Object.values(sc).reduce((s,v)=>s+v.correct,0);
    const totalQ       = Object.values(sc).reduce((s,v)=>s+v.total,0);
    const jambScore    = totalQ>0?Math.round((totalCorrect/totalQ)*400):0;
    onSaveHistory({
      type:"cbt", jambScore, totalCorrect, totalQ,
      subjects:subjects.join(", "),
      subjectBreakdown:subjects.map(s=>({name:s,correct:sc[s]?.correct||0,total:sc[s]?.total||0}))
    });
  };

  const setAnswer   = (letter)=>{const s=subjects[curSubj];setAnswers(a=>{const n={...a,[s]:{...(a[s]||{}),[curQ]:letter}};answersRef.current=n;return n;});};
  const toggleFlag  = ()=>{const s=subjects[curSubj];setFlagged(f=>{const set=new Set(f[s]||[]);set.has(curQ)?set.delete(curQ):set.add(curQ);return{...f,[s]:set};});};
  const totalScore  = ()=>Object.values(scores).reduce((s,v)=>s+v.correct,0);
  const jambScore   = ()=>{const tq=Object.values(scores).reduce((s,v)=>s+v.total,0);return tq>0?Math.round((totalScore()/tq)*400):0;};

  const q            = allQs[subjects[curSubj]]?.[curQ];
  const curAns       = answers[subjects[curSubj]]?.[curQ];
  const isFlagged    = (flagged[subjects[curSubj]]||new Set()).has(curQ);
  const subjQs       = allQs[subjects[curSubj]]||[];
  const answeredInSubj= Object.values(answers[subjects[curSubj]]||{}).length;
  const currentSubjCount = getQCount(subjects[curSubj]);

  return (
    <div>
      {/* ── SETUP SCREEN ─────────────────────────────────────────────────── */}
      {screen==="setup"&&(
        <>
          <Card style={{background:`linear-gradient(135deg,#1a0a2e,${C.card})`,borderColor:C.purple+"44"}}>
            <div style={{fontSize:28,marginBottom:4}}>🖥️</div>
            <div style={{fontWeight:900,fontSize:17,color:C.purple,marginBottom:4}}>JAMB CBT Mock Exam</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:12,lineHeight:1.6}}>Real ALOC past questions + AI fallback · 180 questions · 120 minutes</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[["⏱️ Duration","120 minutes"],["📝 Questions","180 total"],["📗 Use of English","60 Qs (compulsory)"],["📘 Other Subjects","40 Qs each"],["🎯 Total Score","400 marks"],["⚡ Scoring","+1 correct, 0 wrong"]].map(([l,v])=>(
                <div key={l} style={{background:C.card2,borderRadius:10,padding:"8px 10px"}}><div style={{fontSize:10,color:C.muted}}>{l}</div><div style={{fontSize:12,fontWeight:700,color:C.textLight}}>{v}</div></div>
              ))}
            </div>
          </Card>

          {/* Hot topics */}
          <Card style={{background:C.gold+"0a",borderColor:C.gold+"33"}}>
            <Label c={C.gold}>🔥 JAMB Hot Topics in Your Test</Label>
            {["Mathematics","Physics","Chemistry","Biology"].map(s=>(
              <div key={s} style={{background:C.card2,borderRadius:10,padding:10,marginBottom:6}}>
                <div style={{fontSize:11,fontWeight:800,color:C.gold,marginBottom:5}}>📐 {s}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {(JAMB_HOT_TOPICS[s]||[]).slice(0,3).map((t,i)=><span key={i} style={{background:C.gold+"18",border:`1px solid ${C.gold}33`,borderRadius:20,padding:"2px 8px",fontSize:10,color:C.gold}}>{t.split("(")[0].trim()}</span>)}
                </div>
              </div>
            ))}
          </Card>

          <Card><Label c={C.purple}>Subject 1 — Fixed (Compulsory)</Label><div style={{background:C.purple+"22",border:`1px solid ${C.purple}44`,borderRadius:10,padding:"10px 14px",color:C.purple,fontWeight:700,fontSize:13}}>📝 Use of English — 60 Questions</div></Card>

          {[1,2,3].map(i=>(
            <Card key={i}>
              <Label c={C.purple}>Subject {i+1} — 40 Questions</Label>
              <Sel value={subjects[i]} onChange={v=>setSubjects(s=>{const n=[...s];n[i]=v;return n;})}
                options={["Mathematics","Further Mathematics","Physics","Chemistry","Biology","Economics","Government","Literature in English","Geography","Agricultural Science","Accounting","Commerce","Christian Religious Studies","Islamic Studies"]}
                placeholder="Select subject"/>
            </Card>
          ))}

          <Card style={{background:C.purple+"11",borderColor:C.purple+"33"}}>
            <Label c={C.purple}>Your Combination</Label>
            {subjects.map((s,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"center",background:C.card2,borderRadius:10,padding:"8px 12px",marginBottom:6}}>
                <span style={{width:22,height:22,background:C.purple,color:"#fff",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>{i+1}</span>
                <span style={{flex:1,fontSize:13,color:C.textLight,fontWeight:600}}>{s}</span>
                <span style={{fontSize:11,color:C.purple,fontWeight:700}}>{getQCount(s)} Qs</span>
              </div>
            ))}
            <div style={{marginTop:8,background:C.card,borderRadius:8,padding:"8px 12px",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,color:C.muted}}>Total</span><span style={{fontSize:13,fontWeight:800,color:C.gold}}>{totalQuestions} questions · 120 mins</span></div>
          </Card>

          {/* Error message */}
          {loadErr&&(
            <Card style={{background:C.red+"18",borderColor:C.red+"44"}}>
              <div style={{fontSize:12,color:C.red,fontWeight:700,marginBottom:4}}>⚠️ Failed to Load Questions</div>
              <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{loadErr}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:8}}>Check that your ALOC_ACCESS_TOKEN is set in Render and try again.</div>
            </Card>
          )}

          <Btn onClick={startTest} loading={loading} color={C.purple} tc="#fff">
            {loading?(
              <div style={{textAlign:"center",width:"100%"}}>
                <div style={{marginBottom:4}}>📚 {loadMsg}</div>
                <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:6}}>
                  {subjects.map((s,i)=>(
                    <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                      <div style={{width:12,height:12,borderRadius:"50%",background:loadDone.includes(s)?C.green:C.border,transition:"background .3s"}}/>
                      <div style={{fontSize:8,color:loadDone.includes(s)?C.green:C.sub}}>{s.split(" ")[0]}</div>
                    </div>
                  ))}
                </div>
              </div>
            ):"🖥️ Start JAMB CBT Mock Exam"}
          </Btn>
        </>
      )}

      {/* ── TEST SCREEN ──────────────────────────────────────────────────── */}
      {screen==="test"&&(
        <div style={{animation:"fadeUp .3s ease"}}>
          {/* Show loading skeleton if q not yet available */}
          {!q?(
            <Card style={{textAlign:"center",padding:40}}>
              <div style={{fontSize:32,marginBottom:12}}>⏳</div>
              <div style={{fontWeight:700,color:C.purple}}>Loading questions...</div>
              <div style={{fontSize:12,color:C.muted,marginTop:6}}>Subject: {subjects[curSubj]}</div>
            </Card>
          ):(
            <>
              {/* Timer bar */}
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"10px 12px",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{background:timeLeft<600?C.red:timeLeft<1800?C.orange:C.green,color:"#fff",borderRadius:10,padding:"6px 14px",fontWeight:900,fontSize:16,fontFamily:"monospace",animation:timeLeft<300?"pulse .5s infinite":"none",flexShrink:0}}>⏱ {fmtTime(timeLeft)}</div>
                  <div style={{flex:1,background:C.card2,borderRadius:8,height:8,overflow:"hidden"}}><div style={{background:timeLeft<600?C.red:timeLeft<1800?C.orange:C.green,height:"100%",width:`${(timeLeft/(120*60))*100}%`,transition:"width 1s linear"}}/></div>
                  <button onClick={doSubmit} style={{background:C.red,border:"none",borderRadius:8,padding:"6px 12px",color:"#fff",fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>Submit</button>
                </div>
                <div style={{display:"flex",gap:5,overflowX:"auto"}}>
                  {subjects.map((s,i)=>{const cnt=getQCount(s),ans=Object.values(answers[s]||{}).length;return(<button key={i} onClick={()=>{setCurSubj(i);setCurQ(0);}} style={{background:curSubj===i?C.purple:"transparent",border:`1px solid ${curSubj===i?C.purple:C.border}`,borderRadius:8,padding:"5px 10px",color:curSubj===i?"#fff":C.muted,fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,fontFamily:"inherit"}}>{s.split(" ")[0]} ({ans}/{cnt})</button>);})}
                </div>
              </div>

              {/* Question navigator grid */}
              <Card style={{padding:10}}>
                <div style={{fontSize:10,color:C.muted,fontWeight:700,marginBottom:6}}>{subjects[curSubj]} · Q{curQ+1}/{currentSubjCount}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:3,maxHeight:120,overflowY:"auto"}}>
                  {Array.from({length:currentSubjCount},(_,i)=>{const ans=answers[subjects[curSubj]]?.[i],fl=(flagged[subjects[curSubj]]||new Set()).has(i);return(<button key={i} onClick={()=>setCurQ(i)} style={{width:26,height:26,borderRadius:5,border:`1.5px solid ${curQ===i?C.gold:fl?C.orange:ans?C.green:C.border}`,background:curQ===i?C.gold:fl?C.orange+"22":ans?C.green+"22":C.card2,color:curQ===i?"#000":fl?C.orange:ans?C.green:C.sub,fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{i+1}</button>);})}
                </div>
                <div style={{display:"flex",gap:14,marginTop:8,fontSize:10,color:C.muted}}>
                  <span>🟢 Answered ({answeredInSubj})</span>
                  <span>🟠 Flagged</span>
                  <span>⬜ Unanswered ({currentSubjCount-answeredInSubj})</span>
                </div>
              </Card>

              {/* Question card */}
              <Card style={{background:C.purple+"11",borderColor:C.purple+"44"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <div style={{fontSize:11,fontWeight:800,color:C.purple}}>{subjects[curSubj]} · Q{curQ+1}/{currentSubjCount}</div>
                    {q.topic&&<div style={{fontSize:10,color:C.sub,marginTop:2}}>Topic: {q.topic}{q.year&&q.year!=="Past"?" · JAMB "+q.year:""}</div>}
                    <div style={{marginTop:3}}><AiBadge source={q.source==="ALOC"?"ALOC":"AI"}/></div>
                  </div>
                  <button onClick={toggleFlag} style={{background:isFlagged?C.orange+"22":"transparent",border:`1px solid ${isFlagged?C.orange:C.border}`,borderRadius:8,padding:"4px 10px",color:isFlagged?C.orange:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>{isFlagged?"🚩 Flagged":"🏳️ Flag"}</button>
                </div>
                <div style={{fontSize:15,fontWeight:600,lineHeight:1.8,color:C.textLight}}>{q.q}</div>
              </Card>

              {/* Options */}
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                {Object.entries(q.options||{}).map(([letter,text])=>(
                  <button key={letter} onClick={()=>setAnswer(letter)} style={{background:curAns===letter?C.purple+"33":C.card,border:`2px solid ${curAns===letter?C.purple:C.border}`,borderRadius:14,padding:"13px 16px",color:curAns===letter?C.purple:C.textLight,fontSize:13,textAlign:"left",cursor:"pointer",display:"flex",gap:12,alignItems:"center",fontFamily:"inherit",transition:"all .15s"}}>
                    <span style={{width:30,height:30,borderRadius:"50%",background:curAns===letter?C.purple:C.card2,color:curAns===letter?"#fff":C.muted,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,flexShrink:0}}>{letter}</span>
                    <span style={{flex:1,lineHeight:1.4}}>{text}</span>
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div style={{display:"flex",gap:8,marginTop:14}}>
                <button onClick={()=>setCurQ(q=>Math.max(0,q-1))} disabled={curQ===0} style={{flex:1,background:C.card2,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 0",color:curQ===0?C.sub:C.muted,fontWeight:700,fontSize:13,cursor:curQ===0?"not-allowed":"pointer",fontFamily:"inherit"}}>← Prev</button>
                {curQ<currentSubjCount-1
                  ?<button onClick={()=>setCurQ(q=>q+1)} style={{flex:2,background:C.blue,border:"none",borderRadius:12,padding:"12px 0",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Next →</button>
                  :curSubj<subjects.length-1
                    ?<button onClick={()=>{setCurSubj(s=>s+1);setCurQ(0);}} style={{flex:2,background:C.purple,border:"none",borderRadius:12,padding:"12px 0",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Next Subject →</button>
                    :<button onClick={doSubmit} style={{flex:2,background:C.green,border:"none",borderRadius:12,padding:"12px 0",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>✅ Submit All</button>}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── RESULT SCREEN ────────────────────────────────────────────────── */}
      {screen==="result"&&(
        <div style={{animation:"fadeUp .4s ease"}}>
          <Card style={{background:`linear-gradient(135deg,${C.purple}22,${C.card})`,borderColor:C.purple+"44",textAlign:"center"}}>
            <div style={{fontSize:52,marginBottom:8}}>{jambScore()>=280?"🏆":jambScore()>=200?"✅":"💪"}</div>
            <div style={{fontWeight:900,fontSize:52,color:C.purple}}>{jambScore()}</div>
            <div style={{fontSize:14,color:C.muted,marginBottom:6}}>out of 400</div>
            <div style={{fontWeight:700,fontSize:14,color:jambScore()>=280?C.green:jambScore()>=200?C.gold:C.red,marginBottom:4}}>{jambScore()>=280?"🎓 University Ready!":jambScore()>=200?"📚 Keep Pushing!":"🔄 More Practice Needed"}</div>
            <div style={{fontSize:12,color:C.muted}}>{totalScore()} correct out of {subjects.reduce((s,subj)=>s+(scores[subj]?.total||0),0)} questions</div>
            {/* Question source breakdown */}
            {(()=>{
              const all=subjects.flatMap(s=>allQs[s]||[]);
              const real=all.filter(q=>q.source==="ALOC").length;
              const ai=all.filter(q=>q.source!=="ALOC").length;
              return all.length>0?(
                <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:10,flexWrap:"wrap"}}>
                  {real>0&&<div style={{background:C.green+"18",border:`1px solid ${C.green}33`,borderRadius:20,padding:"3px 12px",fontSize:10,color:C.green,fontWeight:800}}>✅ {real} Real Past Questions</div>}
                  {ai>0&&<div style={{background:C.blue+"18",border:`1px solid ${C.blue}33`,borderRadius:20,padding:"3px 12px",fontSize:10,color:C.sky,fontWeight:800}}>🤖 {ai} AI-Generated</div>}
                </div>
              ):null;
            })()}
          </Card>

          <Card>
            <Label c={C.purple}>Subject Breakdown</Label>
            {subjects.map(s=>{const sc=scores[s]||{correct:0,total:getQCount(s)};const p=sc.total>0?Math.round((sc.correct/sc.total)*100):0;return(<div key={s} style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5,alignItems:"center"}}><div><div style={{fontSize:13,fontWeight:700,color:C.textLight}}>{s}</div><div style={{fontSize:10,color:C.muted}}>{sc.total} questions</div></div><div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:900,color:p>=70?C.green:p>=50?C.gold:C.red}}>{sc.correct}/{sc.total}</div><div style={{fontSize:10,color:p>=70?C.green:p>=50?C.gold:C.red}}>{p}%</div></div></div><div style={{background:C.border,borderRadius:6,height:8}}><div style={{background:p>=70?C.green:p>=50?C.gold:C.red,height:"100%",borderRadius:6,width:`${p}%`,transition:"width 1s"}}/></div></div>);})}
          </Card>

          <Card style={{background:"#0a1628",borderColor:C.blue+"33"}}>
            <Label c={C.sky}>🎓 University Admission Guide</Label>
            {[["320-400","UNILAG, UI, OAU, ABU — Medicine, Engineering, Law"],["280-319","Most Federal Universities — Science & Arts"],["250-279","State Universities, Polytechnics"],["200-249","Most Polytechnics & some State Universities"],["Below 200","More preparation needed — aim for 200+"]].map(([range,unis])=>(
              <div key={range} style={{display:"flex",gap:10,marginBottom:8,padding:"8px 10px",background:C.card2,borderRadius:8}}><span style={{fontWeight:800,fontSize:12,color:C.gold,flexShrink:0,minWidth:70}}>{range}</span><span style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{unis}</span></div>
            ))}
          </Card>

          <Card>
            <Label>Review Wrong Answers</Label>
            <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:10}}>
              {subjects.map(s=>(
                <button key={s} onClick={()=>setReviewing(reviewing===s?null:s)} style={{background:reviewing===s?C.purple+"22":"transparent",border:`1px solid ${reviewing===s?C.purple:C.border}`,borderRadius:20,padding:"5px 12px",color:reviewing===s?C.purple:C.muted,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{s.split(" ")[0]} ({(allQs[s]||[]).filter((_,i)=>answers[s]?.[i]!==allQs[s]?.[i]?.answer).length} wrong)</button>
              ))}
            </div>
            {reviewing&&(allQs[reviewing]||[]).map((q,i)=>{
              const userAns=answers[reviewing]?.[i];
              if(userAns===q.answer)return null;
              return(<div key={i} style={{background:C.red+"11",border:`1px solid ${C.red}33`,borderRadius:10,padding:12,marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{fontSize:11,color:C.muted}}>Q{i+1} · {q.topic||""}{q.year&&q.year!=="Past"?" · JAMB "+q.year:""}</span>
                  <AiBadge source={q.source==="ALOC"?"ALOC":"AI"}/>
                </div>
                <div style={{fontSize:13,color:C.textLight,marginBottom:6,lineHeight:1.5}}>{q.q}</div>
                <div style={{fontSize:12,color:C.red,marginBottom:4}}>Your answer: <b>{userAns||"Not answered"}</b> · Correct: <b style={{color:C.green}}>{q.answer}</b></div>
                <div style={{fontSize:12,color:C.sky,lineHeight:1.6}}>{q.explanation}</div>
              </div>);
            })}
          </Card>

          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{setScreen("setup");setScores({});setReviewing(null);setLoadErr("");}} style={{flex:1,background:C.card2,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 0",color:C.muted,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>🔄 New Test</button>
            <a href={`https://wa.me/?text=${encodeURIComponent("🖥️ JAMB CBT Mock!\nScore: "+jambScore()+"/400\n"+subjects.map(s=>s+": "+(scores[s]?.correct||0)+"/"+(scores[s]?.total||0)).join("\n")+"\n\nExamAce AI 🏆 🇳🇬")}`} target="_blank" rel="noreferrer" style={{flex:1,background:C.wa,borderRadius:12,padding:"13px 0",color:"#fff",fontWeight:800,fontSize:13,textAlign:"center",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>💬 Share</a>
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// QUIZ — Nigeria WAEC/NECO/JAMB past questions with live marking
// ═══════════════════════════════════════════════════════════════════════════
function Quiz({ onSaveHistory }) {
  const [mode,setMode]=useState("setup");
  const [qtype,setQtype]=useState("year");
  const [exam,setExam]=useState("WAEC");
  const [subject,setSubject]=useState("Mathematics");
  const [year,setYear]=useState("2023");
  const [topic,setTopic]=useState("");
  const [count,setCount]=useState(10);
  const [qs,setQs]=useState([]);
  const [cur,setCur]=useState(0);
  const [sel,setSel]=useState(null);
  const [answered,setAnswered]=useState(false);
  const [score,setScore]=useState(0);
  const [log,setLog]=useState([]);
  const [loading,setLoading]=useState(false);
  const [timer,setTimer]=useState(45);
  const [timerOn,setTimerOn]=useState(false);
  const [coach,setCoach]=useState("");
  const [coachLoading,setCoachLoading]=useState(false);
  const [aiSource,setAiSource]=useState("");
  const tRef=useRef();

  useEffect(()=>{
    if(timerOn&&timer>0){tRef.current=setTimeout(()=>setTimer(t=>t-1),1000);}
    else if(timer===0&&timerOn)handle(null);
    return()=>clearTimeout(tRef.current);
  },[timerOn,timer]);

  const parse = t=>{
    try{const c=t.replace(/```json|```/g,"").trim();return JSON.parse(c.slice(c.indexOf("["),c.lastIndexOf("]")+1));}
    catch{return null;}
  };

  const start = async () => {
    setLoading(true);
    setAiSource("");
    try {
      // Use ALOC real past questions with AI fallback
      const requestYear = qtype==="year" ? year : null;
      const { questions, meta } = await fetchQuestions(subject, exam, requestYear, count);

      if (!questions?.length) { alert("Could not load questions. Please try again."); setLoading(false); return; }

      // If user selected a topic, filter client-side (ALOC doesn't support topic filter)
      const filtered = topic
        ? questions.filter(q => !q.topic || q.topic.toLowerCase().includes(topic.toLowerCase())).concat(
            questions.filter(q => q.topic && !q.topic.toLowerCase().includes(topic.toLowerCase()))
          ).slice(0, count)
        : questions;

      // Show source info
      const src = meta.alocCount > 0
        ? (meta.aiCount > 0 ? "ALOC+AI" : "ALOC")
        : "AI";
      setAiSource(src);

      console.log(`📚 Quiz: ${meta.alocCount} real + ${meta.aiCount} AI questions`);
      setQs(filtered);setCur(0);setScore(0);setLog([]);setSel(null);setAnswered(false);setMode("quiz");setTimer(45);setTimerOn(true);updateStreak();
    } catch(e) {
      console.error("Quiz start error:", e);
      alert("Connection error. Please try again.");
    }
    setLoading(false);
  };

  const handle = l => {
    if(answered)return;
    clearTimeout(tRef.current);setTimerOn(false);setSel(l);setAnswered(true);
    const q=qs[cur],ok=l===q.answer;
    if(ok)setScore(s=>s+1);
    setLog(lg=>[...lg,{...q,sel:l,ok}]);
  };

  const next = () => {
    if(cur+1>=qs.length)finish();
    else{setCur(c=>c+1);setSel(null);setAnswered(false);setTimer(45);setTimerOn(true);}
  };

  const finish = async () => {
    const pct=Math.round((score/qs.length)*100);
    setMode("result");
    onSaveHistory({type:"quiz",exam,subject,year:qtype==="year"?year:"Random",qtype,pct,score,total:qs.length});
    const wrong=log.filter(r=>!r.ok);
    if(wrong.length>0){
      setCoachLoading(true);
      try{
        const {text}=await callAI(`Nigerian student scored ${score}/${qs.length} (${pct}%) in ${exam} ${subject}${qtype==="year"?" ("+year+" paper)":""}.
Missed topics: ${[...new Set(wrong.map(w=>w.topic))].filter(Boolean).join(", ")}.
Write a 100-word WhatsApp-style coaching note:
- Start with their grade using Nigerian grading (A1=75%+, B2=65%+, C4=55%+, etc.)
- **Bold** key action points
- Use emojis (🇳🇬 encouraged)
- Give 2 specific WAEC/JAMB tips for the topics they missed
- End with strong encouragement
Keep it warm and Nigeria-context aware.`);
        setCoach(text);
      }catch{setCoach("Keep practising! Review the topics you missed. 💪🇳🇬");}
      setCoachLoading(false);
    }
  };

  const pct=qs.length>0?Math.round((score/qs.length)*100):0;
  const grade=gradeFromPct(pct);
  const q=qs[cur];

  return (
    <div>
      {/* SETUP */}
      {mode==="setup"&&(
        <>
          <Card style={{background:`linear-gradient(135deg,${C.blueD}22,${C.card})`,borderColor:C.blue+"44"}}>
            <div style={{fontSize:26,marginBottom:4}}>📝</div>
            <div style={{fontWeight:900,fontSize:16,color:C.blue,marginBottom:3}}>Past Questions Practice</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>Authentic WAEC/NECO/JAMB style questions · Nigeria curriculum · AI coaching</div>
          </Card>

          <Card>
            <Label>Test Type</Label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[["year","📅 Year-Specific Past Q"],["random","🎲 Randomized Practice"]].map(([t,l])=>(
                <button key={t} onClick={()=>setQtype(t)} style={{background:qtype===t?C.blue+"22":"transparent",border:`2px solid ${qtype===t?C.blue:C.border}`,borderRadius:12,padding:"12px 8px",color:qtype===t?C.blue:C.muted,fontWeight:qtype===t?800:400,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
              ))}
            </div>
          </Card>

          <Card>
            <Label>Exam</Label>
            <Pills options={EXAMS} value={exam} onChange={setExam} color={C.blue}/>
          </Card>

          <Card>
            <Label>Subject</Label>
            <Sel value={subject} onChange={setSubject} options={SUBJECTS} placeholder="Select subject"/>
            {/* Show hot topics hint */}
            {subject&&JAMB_HOT_TOPICS[subject]&&(
              <div style={{marginTop:8,background:C.gold+"11",borderRadius:8,padding:"8px 10px"}}>
                <div style={{fontSize:10,color:C.gold,fontWeight:800,marginBottom:4}}>🔥 High-frequency {exam} topics:</div>
                {JAMB_HOT_TOPICS[subject].slice(0,3).map((t,i)=><div key={i} style={{fontSize:11,color:C.muted,lineHeight:1.6}}>• {t}</div>)}
              </div>
            )}
          </Card>

          {qtype==="year"&&(
            <>
              <Card>
                <Label>Year</Label>
                <Pills options={["2024","2023","2022","2021","2020","2019","2018"]} value={year} onChange={setYear} color={C.blue}/>
                <div style={{marginTop:8}}><Sel value={year} onChange={setYear} options={YEARS} placeholder="Or choose older year..."/></div>
              </Card>
              <Card>
                <Label>Topic (optional — leave blank for mixed)</Label>
                {subject&&SYLLABUS[subject]
                  ?<Pills options={SYLLABUS[subject]} value={topic} onChange={v=>setTopic(topic===v?"":v)} color={C.blue}/>
                  :<Inp value={topic} onChange={setTopic} placeholder="Enter topic..."/>}
              </Card>
            </>
          )}

          <Card>
            <Label>Number of Questions</Label>
            <Pills options={["5","10","15","20","25","30"]} value={String(count)} onChange={v=>setCount(parseInt(v))} color={C.blue}/>
          </Card>

          <Btn onClick={start} loading={loading} color={C.blue} tc="#fff">
            {qtype==="year"?"📅 Start "+exam+" "+year+" Quiz":"🎲 Start Random Practice"}
          </Btn>
        </>
      )}

      {/* QUIZ SCREEN */}
      {mode==="quiz"&&q&&(
        <div style={{animation:"fadeUp .3s ease"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{background:C.blue+"22",border:`1px solid ${C.blue}33`,borderRadius:20,padding:"3px 10px",fontSize:11,color:C.sky,fontWeight:700}}>Q{cur+1}/{qs.length} · {q.topic||subject}</div>
            <div style={{background:timer<=10?C.red:timer<=20?C.orange:C.card2,color:timer<=20?C.textLight:C.muted,borderRadius:20,padding:"4px 12px",fontWeight:800,fontSize:13,border:`1px solid ${timer<=10?C.red:C.border}`}}>⏱ {timer}s</div>
            <div style={{fontSize:12,fontWeight:700,color:C.green}}>✅ {score}/{cur+(answered?1:0)}</div>
          </div>
          <div style={{background:C.border,borderRadius:4,height:4,marginBottom:14}}><div style={{background:C.blue,height:"100%",borderRadius:4,width:`${((cur+(answered?1:0))/qs.length)*100}%`,transition:"width .4s"}}/></div>

          <Card style={{background:C.blue+"11",borderColor:C.blue+"44"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
              <div style={{fontSize:11,fontWeight:800,color:C.blue}}>{exam} {q.year||year} · {subject}{q.difficulty?" · "+q.difficulty:""}</div>
              <AiBadge source={q.source==="ALOC"?"ALOC":"AI"}/>
            </div>
            <div style={{fontSize:15,fontWeight:700,lineHeight:1.8,color:C.textLight}}>{q.q}</div>
          </Card>

          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {Object.entries(q.options).map(([l,t])=>{
              const ok=l===q.answer,isSel=sel===l;
              let bg=C.card,border=C.border,color=C.textLight;
              if(answered){if(ok){bg=C.green+"22";border=C.green;color=C.green;}else if(isSel){bg=C.red+"22";border=C.red;color=C.red;}}
              else if(isSel){bg=C.blue+"18";border=C.blue;}
              return(<button key={l} onClick={()=>handle(l)} disabled={answered} style={{background:bg,border:`2px solid ${border}`,borderRadius:14,padding:"13px 16px",color,fontSize:13,textAlign:"left",cursor:answered?"default":"pointer",display:"flex",gap:12,alignItems:"center",fontFamily:"inherit"}}>
                <span style={{width:30,height:30,borderRadius:"50%",background:answered&&ok?C.green:answered&&isSel?C.red:C.card2,color:answered&&(ok||isSel)?"#fff":C.muted,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,flexShrink:0}}>{answered?(ok?"✓":isSel?"✗":l):l}</span>
                <span style={{flex:1,lineHeight:1.4}}>{t}</span>
              </button>);
            })}
          </div>

          {answered&&(
            <div style={{marginTop:14,animation:"fadeUp .35s ease"}}>
              <Card style={{background:sel===q.answer?C.green+"18":C.red+"18",borderColor:sel===q.answer?C.green:C.red}}>
                <div style={{fontWeight:800,fontSize:14,color:sel===q.answer?C.green:C.red,marginBottom:6}}>
                  {sel===q.answer?"✅ Correct!":sel===null?"⏰ Time's up! Correct: "+q.answer:"❌ Wrong. Correct answer: "+q.answer}
                </div>
                <div style={{fontSize:13,color:C.textLight,lineHeight:1.7}}>{q.explanation}</div>
              </Card>
              {q.tip&&<Card style={{background:C.gold+"11",borderColor:C.gold+"44"}}><div style={{fontSize:11,fontWeight:800,color:C.gold,marginBottom:4}}>🎯 {exam} EXAMINER TIP</div><div style={{fontSize:12,color:C.textLight,lineHeight:1.6}}>{q.tip}</div></Card>}
              <Btn onClick={next} color={C.blue} tc="#fff">{cur+1>=qs.length?"🏁 See Results →":"Next Question →"}</Btn>
            </div>
          )}
        </div>
      )}

      {/* RESULT SCREEN */}
      {mode==="result"&&(
        <div style={{animation:"fadeUp .4s ease"}}>
          <Card style={{textAlign:"center",background:`linear-gradient(135deg,${grade.c}18,${C.card})`,borderColor:grade.c+"44"}}>
            <div style={{fontSize:52,marginBottom:8}}>{pct>=75?"🏆":pct>=55?"✅":"💪"}</div>
            <div style={{fontWeight:900,fontSize:44,color:grade.c}}>{pct}%</div>
            <div style={{fontWeight:900,fontSize:20,color:grade.c,marginBottom:4}}>Grade {grade.g}</div>
            <div style={{fontSize:13,color:C.muted}}>{score}/{qs.length} · {subject} · {exam} {qtype==="year"?year:"Random"}</div>
            {aiSource&&(
              <div style={{marginTop:8,display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>
                {aiSource.includes("ALOC")&&<AiBadge source="ALOC"/>}
                {aiSource.includes("AI")&&<AiBadge source="AI"/>}
                {!aiSource.includes("ALOC")&&!aiSource.includes("AI")&&<AiBadge source={aiSource}/>}
              </div>
            )}
            <div style={{marginTop:8,background:C.gold+"18",borderRadius:10,padding:"6px 12px",display:"inline-block",fontSize:11,color:C.gold,fontWeight:700}}>✅ Result saved to history!</div>
          </Card>

          {(coachLoading||coach)&&(
            <Card style={{background:C.green+"11",borderColor:C.green+"33"}}>
              <Label c={C.green}>🏆 AI Coach Feedback</Label>
              {coachLoading?<div style={{color:C.muted,fontSize:13}}>Analysing your performance...</div>:<div style={{fontSize:13,lineHeight:1.8,color:C.textLight}}>{coach}</div>}
            </Card>
          )}

          <Card>
            <Label>Question Review</Label>
            {log.map((r,i)=>(
              <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`,alignItems:"flex-start"}}>
                <span style={{fontSize:16,flexShrink:0}}>{r.ok?"✅":"❌"}</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                    <div style={{fontSize:11,color:C.sky,fontWeight:700}}>{r.topic||""} · {exam} {r.year||year}</div>
                    <AiBadge source={r.source==="ALOC"?"ALOC":"AI"}/>
                  </div>
                  <div style={{fontSize:12,color:C.textLight,lineHeight:1.4,marginBottom:2}}>{r.q}</div>
                  {!r.ok&&<div style={{fontSize:11,color:C.red}}>You: {r.sel||"–"} · Correct: <b style={{color:C.green}}>{r.answer}</b></div>}
                </div>
              </div>
            ))}
          </Card>

          <div style={{display:"flex",gap:8}}>
            <a href={`https://wa.me/?text=${encodeURIComponent(`🏆 ${pct}% (Grade ${grade.g}) in ${exam} ${subject}!\nScore: ${score}/${qs.length}\n\nExamAce AI 🇳🇬`)}`} target="_blank" rel="noreferrer" style={{flex:1,background:C.wa,borderRadius:12,padding:"13px 0",color:"#fff",fontWeight:800,fontSize:13,textAlign:"center",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>💬 Share</a>
            <button onClick={()=>{setMode("setup");setCoach("");setAiSource("");}} style={{flex:1,background:C.card2,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 0",color:C.muted,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>🔄 New Quiz</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ASK AI — Chat with 4-tier AI
// ═══════════════════════════════════════════════════════════════════════════
function AskAI() {
  const [msgs,setMsgs]=useState([{from:"bot",text:`👋 **Welcome to ExamAce AI!** 🏆🇳🇬\n\nI'm your personal WAEC/NECO/JAMB tutor. Ask me anything!\n\n📸 **Snap a question** → I solve it with full working\n📅 **Ask by year** → "WAEC 2022 Physics Q4"\n📚 **Any topic** → step-by-step explanation\n💡 **Study tips** → "How do I pass JAMB Chemistry?"\n\nType below or tap 📷 to snap a photo!`,time:ts()}]);
  const [input,setInput]=useState("");
  const [exam,setExam]=useState("WAEC");
  const [subject,setSubject]=useState("Mathematics");
  const [year,setYear]=useState("");
  const [loading,setLoading]=useState(false);
  const [imgPreview,setImgPreview]=useState(null);
  const [imgData,setImgData]=useState(null);
  const chatRef=useRef();
  const fileRef=useRef();

  useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[msgs]);

  const onImg = async f=>{if(!f)return;setImgPreview(URL.createObjectURL(f));setImgData({data:await toBase64(f),type:f.type||"image/jpeg"});};

  const send = async () => {
    const msg=input.trim();
    if(!msg&&!imgData)return;
    const yr=msg.match(/\b(19|20)\d{2}\b/)?.[0]||year;
    const display=imgPreview?(msg?"📷 [Photo]\n"+msg:"📷 [Question photo]"):msg;
    setMsgs(m=>[...m,{from:"user",text:display,time:ts(),img:imgPreview}]);
    setInput("");setImgPreview(null);setLoading(true);
    try{
      let text,source;
      if(imgData){
        const r=await callAI(
          `You are an official ${exam} examiner for ${subject}${yr?" ("+yr+" style)":""}.
Read ALL question(s) in this image carefully.

**QUESTION READ:** [restate the question exactly]
**SUBJECT & TOPIC:** [identify subject and syllabus topic]
**COMPLETE SOLUTION:** [full step-by-step working using ${exam} marking scheme]
**KEY FORMULA/CONCEPT:** [state the formula or concept]
**MARKS ALLOCATION:** [how marks are awarded in ${exam}]
**EXAMINER TIP:** [common mistake to avoid]
${NG_CONTEXT}`,
          null, imgData
        );
        text=r.text; source=r.source;
        setImgData(null);
      }else{
        const hist=msgs.slice(-8).map(m=>({role:m.from==="user"?"user":"assistant",content:m.text}));
        const r=await callAI([...hist,{role:"user",content:msg}],SYS(exam,subject,yr));
        text=r.text; source=r.source;
      }
      setMsgs(m=>[...m,{from:"bot",text,time:ts(),source}]);
    }catch{
      setMsgs(m=>[...m,{from:"bot",text:"⚠️ Connection issue. Please try again!",time:ts()}]);
    }
    setLoading(false);
  };

  const QUICK_ASKS = [
    "WAEC 2023 Maths past question","JAMB 2022 Chemistry",
    "Explain osmosis for NECO","How to pass JAMB in one sitting?",
    "WAEC 2024 English essay tips","Differentiate between acids and bases"
  ];

  return (
    <div>
      <Card>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          <div><Label>Exam</Label><Sel value={exam} onChange={setExam} options={EXAMS} placeholder="Exam"/></div>
          <div><Label>Subject</Label><Sel value={subject} onChange={setSubject} options={SUBJECTS} placeholder="Subject"/></div>
          <div><Label>Year</Label><Sel value={year} onChange={setYear} options={YEARS} placeholder="Any"/></div>
        </div>
        <div style={{marginTop:8,background:C.blue+"18",borderRadius:8,padding:"7px 10px",fontSize:11,color:C.sky}}>
          💡 Try: <b>"WAEC 2021 Biology osmosis question"</b> or <b>"Explain logarithms for JAMB"</b>
        </div>
      </Card>

      {/* Chat interface */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:18,overflow:"hidden",marginBottom:12}}>
        <div style={{background:C.waD,padding:"11px 14px",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,background:C.wa,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🤖</div>
          <div>
            <div style={{fontWeight:700,fontSize:13,color:"#fff"}}>ExamAce AI · {exam} {subject}{year?" · "+year:""}</div>
            <div style={{fontSize:10,color:"#b2dfdb"}}>Nigeria Curriculum · 4-AI System · 📷 Snap enabled</div>
          </div>
        </div>

        <div ref={chatRef} style={{height:340,overflowY:"auto",padding:"14px 12px",display:"flex",flexDirection:"column",gap:10,background:"#ece5dd"}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.from==="user"?"flex-end":"flex-start",animation:i===msgs.length-1?"fadeUp .3s ease":"none"}}>
              <div style={{maxWidth:"85%",background:m.from==="user"?"#dcf8c6":"#ffffff",borderRadius:m.from==="user"?"14px 14px 2px 14px":"14px 14px 14px 2px",padding:"10px 13px",fontSize:13,boxShadow:"0 1px 2px rgba(0,0,0,0.1)"}}>
                {m.img&&<img src={m.img} alt="" style={{maxWidth:"100%",borderRadius:8,marginBottom:8,maxHeight:140,objectFit:"cover"}}/>}
                <div>{fmt(m.text,false)}</div>
                {m.source&&<AiBadge source={m.source}/>}
                <div style={{fontSize:10,color:"#64748b",textAlign:"right",marginTop:4}}>{m.time}{m.from==="user"&&<span style={{color:"#34B7F1"}}> ✓✓</span>}</div>
              </div>
            </div>
          ))}
          {loading&&<div style={{display:"flex"}}><div style={{background:"#fff",borderRadius:"14px 14px 14px 2px",padding:"11px 16px",display:"flex",gap:5,alignItems:"center"}}><span style={{fontSize:10,color:"#94a3b8",marginRight:4}}>AI thinking...</span>{[0,1,2].map(d=><span key={d} style={{width:8,height:8,borderRadius:"50%",background:"#94a3b8",display:"inline-block",animation:`blink 1.2s ${d*.22}s infinite`}}/>)}</div></div>}
        </div>

        {imgPreview&&<div style={{padding:"8px 12px",background:C.blue+"18",borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8}}><img src={imgPreview} alt="" style={{width:46,height:46,objectFit:"cover",borderRadius:8,border:`2px solid ${C.blue}`}}/><div style={{flex:1,fontSize:12,color:C.sky,fontWeight:700}}>📷 Photo ready to send</div><button onClick={()=>{setImgPreview(null);setImgData(null);}} style={{background:C.card2,border:"none",color:C.red,borderRadius:8,padding:"4px 10px",fontSize:13,cursor:"pointer"}}>✕</button></div>}

        <div style={{padding:"10px 12px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8,alignItems:"flex-end",background:C.card2}}>
          <button onClick={()=>fileRef.current.click()} style={{width:40,height:40,background:C.wa,borderRadius:"50%",border:"none",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>📷</button>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>onImg(e.target.files[0])}/>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!loading&&send()} placeholder="Ask any exam question... or snap 📷" style={{flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:22,padding:"10px 16px",color:C.textLight,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
          <button onClick={send} disabled={loading||(!input.trim()&&!imgData)} style={{width:40,height:40,background:(input.trim()||imgData)&&!loading?C.wa:C.border,borderRadius:"50%",border:"none",cursor:"pointer",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>➤</button>
        </div>
      </div>

      {/* Quick asks */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {QUICK_ASKS.map(q=>(
          <button key={q} onClick={()=>setInput(q)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:"5px 12px",color:C.gold,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{q}</button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SNAP & SOLVE
// ═══════════════════════════════════════════════════════════════════════════
function SnapSolve() {
  const [preview,setPreview]=useState(null);
  const [imgData,setImgData]=useState(null);
  const [exam,setExam]=useState("WAEC");
  const [subject,setSubject]=useState("");
  const [year,setYear]=useState("");
  const [note,setNote]=useState("");
  const [answer,setAnswer]=useState("");
  const [aiSource,setAiSource]=useState("");
  const [loading,setLoading]=useState(false);
  const fileRef=useRef();

  const onFile = async f=>{if(!f)return;setPreview(URL.createObjectURL(f));setImgData({data:await toBase64(f),type:f.type||"image/jpeg"});setAnswer("");setAiSource("");};

  const solve = async () => {
    if(!imgData)return;
    setLoading(true);setAnswer("");setAiSource("");
    try{
      const {text,source}=await callAI(
        `You are an official ${exam} examiner${subject?" for "+subject:""}${year?" ("+year+" marking scheme)":""}.
${NG_CONTEXT}

Read ALL question(s) in this image carefully and provide:

**📋 QUESTION:** [restate the exact question]
**📚 SUBJECT & TOPIC:** [identify subject and WAEC/JAMB syllabus topic]
**✅ COMPLETE SOLUTION:**
[Full step-by-step working]
[Show ALL working — no skipping steps]
[Include units where applicable]
**📌 KEY FORMULA/RULE:** [state formula used]
**🎯 MARKS ALLOCATION:** [how ${exam} awards marks for this]
**⚠️ COMMON MISTAKES:** [what students get wrong in exams]
**💡 EXAMINER TIP:** [insider tip from ${exam} marking scheme]
${note?"\nStudent's note: \""+note+"\"":""}`,
        null, imgData
      );
      setAnswer(text);setAiSource(source);
    }catch{setAnswer("⚠️ Could not read image. Ensure image is clear and try again.");}
    setLoading(false);
  };

  return (
    <div>
      <Card style={{background:`linear-gradient(135deg,${C.greenD}22,${C.card})`,borderColor:C.green+"44"}}>
        <div style={{fontSize:28,marginBottom:4}}>📸</div>
        <div style={{fontWeight:900,fontSize:16,color:C.green,marginBottom:3}}>Snap & Solve</div>
        <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>Snap any WAEC/NECO/JAMB question — AI reads it and provides full marking-scheme solution!</div>
      </Card>

      <Card>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          <div><Label>Exam</Label><Sel value={exam} onChange={setExam} options={EXAMS} placeholder="Exam"/></div>
          <div><Label>Subject</Label><Sel value={subject} onChange={setSubject} options={SUBJECTS} placeholder="Auto-detect"/></div>
          <div><Label>Year</Label><Sel value={year} onChange={setYear} options={YEARS} placeholder="Any"/></div>
        </div>
      </Card>

      <div onClick={()=>fileRef.current.click()} style={{border:`2.5px dashed ${preview?C.green:C.border}`,borderRadius:16,padding:24,textAlign:"center",cursor:"pointer",background:preview?C.green+"11":C.card,marginBottom:12,minHeight:180,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8}}>
        {preview?<><img src={preview} alt="" style={{maxWidth:"100%",maxHeight:240,borderRadius:10,objectFit:"contain"}}/><div style={{fontSize:11,color:C.green,fontWeight:700,marginTop:4}}>✅ Image ready · Tap to change</div></>:<><div style={{fontSize:52}}>📷</div><div style={{fontWeight:700,color:C.green,fontSize:15}}>Tap to upload question photo</div><div style={{fontSize:12,color:C.muted}}>Handwritten · Printed · Screenshot — all supported</div></>}
        <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>onFile(e.target.files[0])}/>
      </div>

      {preview&&(
        <>
          <Card><Label>Additional note (optional)</Label><Inp value={note} onChange={setNote} placeholder="e.g. 'WAEC 2022 Q3b — show full working and state theorem used'"/></Card>
          <Btn onClick={solve} loading={loading} color={C.green} tc="#fff">🔍 Read & Solve with Marking Scheme</Btn>
        </>
      )}

      {answer&&(
        <>
          <Out text={answer} color={C.green} source={aiSource}/>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button onClick={()=>navigator.clipboard.writeText(answer)} style={{flex:1,background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 0",color:C.muted,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>📋 Copy</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(`📸 Solved by ExamAce AI!\n${exam} ${year||""} ${subject||""}\n\n${answer.slice(0,350)}...\n\n🏆 ExamAce AI 🇳🇬`)}`} target="_blank" rel="noreferrer" style={{flex:1,background:C.wa,borderRadius:10,padding:"10px 0",color:"#fff",fontWeight:700,fontSize:12,textAlign:"center",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>💬 Share</a>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ESSAY MARKER
// ═══════════════════════════════════════════════════════════════════════════
function EssayMarker() {
  const [mode,setMode]=useState("text");
  const [essay,setEssay]=useState("");
  const [topic,setTopic]=useState("");
  const [exam,setExam]=useState("WAEC");
  const [subject,setSubject]=useState("English Language");
  const [year,setYear]=useState("");
  const [imgPreview,setImgPreview]=useState(null);
  const [imgData,setImgData]=useState(null);
  const [result,setResult]=useState("");
  const [aiSource,setAiSource]=useState("");
  const [loading,setLoading]=useState(false);
  const fileRef=useRef();
  const wc=essay.trim().split(/\s+/).filter(Boolean).length;

  const onImg = async f=>{if(!f)return;setImgPreview(URL.createObjectURL(f));setImgData({data:await toBase64(f),type:f.type||"image/jpeg"});};

  const WAEC_SCHEME = `**${exam} ESSAY MARKING SCHEME${year?" ("+year+")":""} — Official Nigerian Standard**\n━━━━━━━━━━━━━━━━━━━━━━━\n**CONTENT SCORE: [X]/10**\n[Relevance to topic, factual accuracy, Nigerian context, depth of ideas]\n\n**ORGANISATION SCORE: [X]/10**\n[Introduction, body paragraphs, conclusion, logical flow, paragraph unity]\n\n**EXPRESSION SCORE: [X]/10**\n[Clarity, sentence variety, register, vocabulary richness, style]\n\n**MECHANICS SCORE: [X]/10**\n[Spelling, punctuation, grammar, agreement, tenses]\n\n**━━━━━━━━━━━━━━━━━━━━━━━**\n**TOTAL: [X]/40 — ${exam} Grade: [A1/B2/B3/C4/C5/C6/D7/E8/F9]**\n**━━━━━━━━━━━━━━━━━━━━━━━**\n\n**✅ STRENGTHS (with quoted examples from essay):**\n1. [Quote + explanation]\n2. [Quote + explanation]\n\n**❌ ERRORS & CORRECTIONS:**\n1. Error: "[quote]" → Correction: "[fix]" (Reason: [grammar rule])\n2. [Continue for up to 5 errors]\n\n**🎯 HOW TO REACH A1 IN ${exam}:**\n1. [Specific actionable tip]\n2. [Specific actionable tip]\n3. [Specific actionable tip]\n\n**✍️ IMPROVED OPENING SENTENCE:**\n"[Rewrite opening to A1 standard]"\n\n**💡 ${exam} EXAMINER SECRET:**`;

  const mark = async () => {
    setLoading(true);setResult("");setAiSource("");
    try{
      let text,source;
      if(mode==="image"){
        if(!imgData){alert("Upload essay image!");setLoading(false);return;}
        const r=await callAI(`You are a strict official ${exam} ${subject} examiner${year?" ("+year+" marking scheme)":""}.
Read the handwritten essay in this image carefully and mark using this OFFICIAL ${exam} MARKING SCHEME:
${WAEC_SCHEME}
${NG_CONTEXT}`,null,imgData);
        text=r.text;source=r.source;
      }else{
        if(wc<30){alert("Write at least 30 words!");setLoading(false);return;}
        const r=await callAI(`You are a strict official ${exam} ${subject} examiner${year?" ("+year+")":""}.
Mark this essay using OFFICIAL ${exam} MARKING SCHEME.

ESSAY TOPIC: "${topic||"General Essay"}"
STUDENT'S ESSAY:
"${essay}"

${WAEC_SCHEME}
${NG_CONTEXT}`,SYS(exam,subject,year));
        text=r.text;source=r.source;
      }
      setResult(text);setAiSource(source);
    }catch{setResult("⚠️ Error. Please try again.");}
    setLoading(false);
  };

  return (
    <div>
      <Card style={{background:`linear-gradient(135deg,${C.purpleD}22,${C.card})`,borderColor:C.purple+"44"}}>
        <div style={{fontSize:26,marginBottom:4}}>✍️</div>
        <div style={{fontWeight:900,fontSize:16,color:C.purple,marginBottom:3}}>AI Essay Marker</div>
        <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>Official WAEC/NECO/JAMB marking scheme · Type or snap handwritten essays!</div>
      </Card>

      <Card>
        <Label>Input Mode</Label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["text","⌨️ Type Essay"],["image","📷 Photo of Essay"]].map(([m,l])=>(
            <button key={m} onClick={()=>setMode(m)} style={{background:mode===m?C.purple+"22":"transparent",border:`2px solid ${mode===m?C.purple:C.border}`,borderRadius:12,padding:"12px 8px",color:mode===m?C.purple:C.muted,fontWeight:mode===m?800:400,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          <div><Label>Exam</Label><Pills options={["WAEC","NECO","JAMB"]} value={exam} onChange={setExam} color={C.purple}/></div>
          <div><Label>Year</Label><Sel value={year} onChange={setYear} options={YEARS} placeholder="Any"/></div>
        </div>
        <Label>Subject</Label>
        <Sel value={subject} onChange={setSubject} options={["English Language","Literature in English","Government","Economics","Biology","Chemistry","Physics","Mathematics","Geography","Agricultural Science"]} placeholder="Select subject"/>
        {mode==="text"&&<div style={{marginTop:10}}><Label>Essay Topic</Label><Inp value={topic} onChange={setTopic} placeholder={`e.g. "${exam} ${year||"2024"}: Discuss the impact of technology on Nigerian youth..."`}/></div>}
      </Card>

      {mode==="image"?(
        <Card>
          <Label>Upload Essay Photo</Label>
          <div onClick={()=>fileRef.current.click()} style={{border:`2.5px dashed ${imgPreview?C.purple:C.border}`,borderRadius:14,padding:20,textAlign:"center",cursor:"pointer",background:imgPreview?C.purple+"11":C.card2,marginBottom:10,minHeight:140,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8}}>
            {imgPreview?<><img src={imgPreview} alt="" style={{maxWidth:"100%",maxHeight:180,borderRadius:10,objectFit:"contain"}}/><div style={{fontSize:11,color:C.purple,fontWeight:700}}>✅ Tap to change</div></>:<><div style={{fontSize:40}}>📄</div><div style={{fontWeight:700,color:C.purple}}>Upload essay photo</div><div style={{fontSize:12,color:C.muted}}>Handwritten · Printed — clearly lit photos work best</div></>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>onImg(e.target.files[0])}/>
        </Card>
      ):(
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><Label>Your Essay</Label><span style={{fontSize:11,color:wc>=150?C.green:wc>=50?C.orange:C.red,fontWeight:700}}>{wc} words {wc<150?"(aim 150+ for full marks)":"✅ Good length"}</span></div>
          <Inp value={essay} onChange={setEssay} multiline rows={9} placeholder="Write your essay here..."/>
        </Card>
      )}

      <Btn onClick={mark} loading={loading} color={C.purple} tc="#fff">
        {mode==="image"?"📷 Read & Mark Essay":"✍️ Mark My Essay"}
      </Btn>

      {result&&(
        <>
          <Out text={result} color={C.purple} source={aiSource}/>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button onClick={()=>navigator.clipboard.writeText(result)} style={{flex:1,background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 0",color:C.muted,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>📋 Copy</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(`✍️ Essay marked by ExamAce AI!\n${exam} ${year||""}\n\n${result.slice(0,300)}...\n\n🏆 ExamAce AI 🇳🇬`)}`} target="_blank" rel="noreferrer" style={{flex:1,background:C.wa,borderRadius:10,padding:"10px 0",color:"#fff",fontWeight:700,fontSize:12,textAlign:"center",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>💬 Share</a>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STUDY TOOLS
// ═══════════════════════════════════════════════════════════════════════════
function StudyTools() {
  const [sub,setSub]=useState("keypoints");
  const [exam,setExam]=useState("WAEC");
  const [subject,setSubject]=useState("Mathematics");
  const [topic,setTopic]=useState("");
  const [year,setYear]=useState("");
  const [out,setOut]=useState("");
  const [aiSource,setAiSource]=useState("");
  const [loading,setLoading]=useState(false);
  const [problem,setProblem]=useState("");
  const [pScore,setPScore]=useState("");
  const [pTopics,setPTopics]=useState("");
  const [pWeeks,setPWeeks]=useState("8");
  const [cdExam,setCdExam]=useState("WAEC 2025");
  const [now2,setNow2]=useState(new Date());

  useEffect(()=>{const t=setInterval(()=>setNow2(new Date()),1000);return()=>clearInterval(t);},[]);

  const diff=d=>{const x=d-now2;if(x<=0)return null;return{days:Math.floor(x/86400000),hours:Math.floor((x%86400000)/3600000),mins:Math.floor((x%3600000)/60000),secs:Math.floor((x%60000)/1000)};};
  const urg=d=>d<=30?{c:C.red,l:"🔴 URGENT"}:d<=60?{c:C.orange,l:"🟡 SOON"}:{c:C.green,l:"🟢 ON TRACK"};
  const d=diff(EXAM_DATES[cdExam]);const u=d?urg(d.days):null;

  const hotTopicsStr = JAMB_HOT_TOPICS[subject]?.slice(0,5).join(", ") || "";
  const syllabusStr = SYLLABUS[subject]?.join(", ") || "all topics";

  const PROMPTS = {
    keypoints: ()=>`Generate KEY POINTS for ${exam} ${subject}${topic?" — "+topic:""}${year?" ("+year+" style)":""}.
${NG_CONTEXT}
High-frequency topics to emphasise: ${hotTopicsStr}

For each key point:
**[TOPIC TITLE]**
• Core explanation with Nigerian examples
• Formula/rule where applicable
⭐ Why this appears in ${exam} marking scheme
📝 Common exam question type

Include 8-10 points. Reference official WAEC/NECO/JAMB syllabus.`,

    definitions: ()=>`Generate GLOSSARY for ${exam} ${subject}${topic?" — "+topic:""}.
${NG_CONTEXT}

For each term:
**[TERM]** — [clear definition]
💡 Nigerian example (use Nigerian places, currency ₦, context)
🎯 ${exam} note — how this is tested
⭐ Mark if appears almost every year

Include 12-15 terms. Mark ⭐⭐⭐ for terms in 3+ consecutive years.`,

    focusareas: ()=>`CRITICAL FOCUS AREAS for ${exam} ${subject}${year?" "+year:""}.
${NG_CONTEXT}

🔴 **MUST-KNOW (guaranteed marks):**
${hotTopicsStr?"High-frequency: "+hotTopicsStr:"[list top 5 guaranteed topics with % likelihood]"}

🟡 **HIGH PRIORITY:**
[8 topics most likely to appear]

🟢 **GOOD TO KNOW:**
[5 supporting topics]

📊 **TOPIC MARK WEIGHT:**
[marks/questions per topic based on ${exam} past data]

⚡ **LAST 3 DAYS TOP 5:**
[5 most important topics to revise before the exam]

🎓 **EXAMINER SECRETS:**
[3 insider insights from ${exam} marking scheme]

💡 **NIGERIA CONTEXT TIPS:**
[Nigerian examples that appear frequently in ${exam}]`,

    timetable: ()=>`Create a 4-WEEK STUDY TIMETABLE for ${exam} ${subject}.
${NG_CONTEXT}
Topics to cover: ${syllabusStr}
High-priority (do first): ${hotTopicsStr}

For each week:
📆 **WEEK [N] — [Focus Theme]**
Monday: [topic + study method + duration]
Tuesday: [topic + study method + duration]
Wednesday: [topic + past questions practice]
Thursday: [topic + study method]
Friday: [topic + past questions]
Saturday: MOCK TEST (${exam} style) + review
Sunday: REST + light revision only

📊 DAILY STUDY ROUTINE
💡 3 STUDY TIPS specific to ${exam} ${subject}
📱 How to use ExamAce AI daily`,

    mnemonics: ()=>`MEMORY TRICKS & MNEMONICS for ${exam} ${subject}${topic?" — "+topic:""}.\n${NG_CONTEXT}\n\nFor each concept:\n💡 **[CONCEPT NAME]**\n🎯 What to remember: [key fact]\n🧠 Memory trick: [mnemonic/rhyme/acronym]\n🇳🇬 Nigerian angle: [Nigerian example to anchor memory]\n📝 How it appears in ${exam}: [exam application]\n`,

    examstrategy: ()=>`COMPLETE EXAM STRATEGY for ${exam} ${subject}.
${NG_CONTEXT}

⏰ **TIME MANAGEMENT:**
[Exact time allocation per question type in ${exam}]

📋 **QUESTION ORDER:**
[Which questions to attempt first for maximum marks]

✅ **GUARANTEED MARKS:**
[Questions that are always easy in ${exam} ${subject}]

🔍 **HOW TO READ QUESTIONS:**
[Common tricks and traps in ${exam} ${subject} wording]

✍️ **PRESENTATION:**
[What ${exam} examiners want to see on answer sheet]

⚠️ **TOP 10 MISTAKES STUDENTS MAKE:**
[Most common errors in ${exam} ${subject} with how to avoid]

🎯 **THE A1 FORMULA:**
[Exact recipe for getting A1 in ${exam} ${subject}]

📌 **DAY BEFORE CHECKLIST:**
[What to do the evening before the exam]

🌅 **EXAM DAY MORNING:**
[What to do on the day of the exam]`
  };

  const run = async () => {
    if(!subject){alert("Select a subject!");return;}
    setLoading(true);setOut("");setAiSource("");
    try{const {text,source}=await callAI(PROMPTS[sub](),SYS(exam,subject,year));setOut(text);setAiSource(source);}
    catch{setOut("⚠️ Error. Try again.");}
    setLoading(false);
  };

  const solveMaths = async () => {
    if(!problem.trim())return;
    setLoading(true);setOut("");setAiSource("");
    try{
      const {text,source}=await callAI(
        `You are a WAEC/JAMB Mathematics examiner. Solve this step-by-step.
${NG_CONTEXT}

**PROBLEM:** ${problem}

**SOLUTION:**
**Given/Identify:** [what is given]
**Step 1:** [working with explanation]
**Step 2:** [working with explanation]
[Continue steps...]
**✅ FINAL ANSWER:** [answer with units]
**📌 FORMULA USED:** [state the formula]
**⚠️ COMMON MISTAKE:** [what students get wrong]
**🎯 WAEC/JAMB TIP:** [how this topic appears in exams]
**📊 MARKS ALLOCATION:** [how marks are awarded]`
      );
      setOut(text);setAiSource(source);
    }catch{setOut("⚠️ Error.");}
    setLoading(false);
  };

  const predict = async () => {
    if(!pScore){alert("Enter your current practice score!");return;}
    setLoading(true);setOut("");setAiSource("");
    try{
      const {text,source}=await callAI(
        `Predict ${exam} ${subject} result for a Nigerian student.
${NG_CONTEXT}
Current practice score: ${pScore}%
Topics covered: ${pTopics||"General"}
Weeks until exam: ${pWeeks}

📈 **REALISTIC GRADE PREDICTION**
**Current trajectory:** [Nigerian ${exam} grade A1-F9]
**Confidence level:** [X]%
**Prediction date:** [estimated based on ${pWeeks} weeks preparation]

📊 **GRADE PROBABILITIES:**
A1 (75%+): [X]%
B2-B3 (65-74%): [X]%
C4-C6 (45-64%): [X]%
D7-F9 (below 45%): [X]%

🚀 **TO GUARANTEE A1 IN ${pWeeks} WEEKS:**
1. [Specific high-impact action]
2. [Specific high-impact action]
3. [Specific high-impact action]

⚡ **QUICK WIN TOPICS:**
[Topics that are easiest to improve quickly in ${exam} ${subject}]

📅 **WEEK-BY-WEEK PLAN:**
[Brief weekly targets]

💬 **HONEST ASSESSMENT:**
[Straight-talking advice based on Nigerian ${exam} standards]`
      );
      setOut(text);setAiSource(source);
    }catch{setOut("⚠️ Error.");}
    setLoading(false);
  };

  const TOOLS=[
    {id:"keypoints",icon:"📌",label:"Key Points",color:C.gold},
    {id:"definitions",icon:"📖",label:"Glossary",color:C.sky},
    {id:"focusareas",icon:"🎯",label:"Focus Areas",color:C.red},
    {id:"mnemonics",icon:"🧠",label:"Mnemonics",color:C.pink},
    {id:"timetable",icon:"📅",label:"Timetable",color:C.green},
    {id:"examstrategy",icon:"🏆",label:"Strategy",color:C.purple},
    {id:"maths",icon:"📐",label:"Maths Solver",color:C.blue},
    {id:"predict",icon:"📈",label:"Predict Grade",color:C.orange},
    {id:"countdown",icon:"⏰",label:"Countdown",color:C.green},
  ];
  const at=TOOLS.find(t=>t.id===sub);

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:16}}>
        {TOOLS.map(t=>(
          <button key={t.id} onClick={()=>{setSub(t.id);setOut("");setAiSource("");}} style={{background:sub===t.id?t.color+"22":C.card,border:`1.5px solid ${sub===t.id?t.color:C.border}`,borderRadius:12,padding:"10px 4px",color:sub===t.id?t.color:C.muted,fontWeight:sub===t.id?800:400,fontSize:9,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <span style={{fontSize:22}}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Standard tools */}
      {["keypoints","definitions","focusareas","mnemonics","timetable","examstrategy"].includes(sub)&&(
        <>
          <Card>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <div><Label>Exam</Label><Sel value={exam} onChange={setExam} options={EXAMS} placeholder="Exam"/></div>
              <div><Label>Year</Label><Sel value={year} onChange={setYear} options={YEARS} placeholder="Any"/></div>
            </div>
            <Label>Subject</Label>
            <Sel value={subject} onChange={setSubject} options={SUBJECTS} placeholder="Select subject"/>
            {["keypoints","definitions","mnemonics"].includes(sub)&&subject&&SYLLABUS[subject]&&(
              <div style={{marginTop:10}}><Label>Topic (optional)</Label><Pills options={SYLLABUS[subject]} value={topic} onChange={v=>setTopic(topic===v?"":v)} color={at?.color}/></div>
            )}
            {/* Show hot topics */}
            {subject&&JAMB_HOT_TOPICS[subject]&&sub==="focusareas"&&(
              <div style={{marginTop:8,background:C.red+"11",borderRadius:8,padding:"8px 10px"}}>
                <div style={{fontSize:10,color:C.red,fontWeight:800,marginBottom:4}}>🔥 Known high-frequency {exam} {subject} topics:</div>
                {JAMB_HOT_TOPICS[subject].slice(0,4).map((t,i)=><div key={i} style={{fontSize:11,color:C.muted,lineHeight:1.6}}>• {t}</div>)}
              </div>
            )}
          </Card>
          <Btn onClick={run} loading={loading} color={at?.color||C.gold} tc={at?.id==="keypoints"?"#000":"#fff"}>
            {at?.icon} Generate {at?.label}
          </Btn>
        </>
      )}

      {/* Maths solver */}
      {sub==="maths"&&(
        <>
          <Card style={{borderColor:C.blue+"44"}}>
            <div style={{fontWeight:900,fontSize:15,color:C.blue,marginBottom:8}}>📐 Step-by-Step Maths Solver</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:10}}>Works for WAEC/JAMB/NECO mathematics — shows full marking-scheme working</div>
            <Inp value={problem} onChange={setProblem} multiline rows={4} placeholder={"Examples:\n• Solve 2x² + 5x - 3 = 0 using factorisation\n• Find simple interest on ₦50,000 at 8% for 3 years\n• Evaluate log₂8 + log₂4"}/>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
              {["Solve x²-5x+6=0","SI on ₦20,000 at 5% for 2 years","Evaluate log₃81","Factorize 6x²+x-2","Find area of circle r=7cm"].map(e=>(
                <button key={e} onClick={()=>setProblem(e)} style={{background:C.blue+"18",border:`1px solid ${C.blue}33`,borderRadius:20,padding:"4px 10px",color:C.sky,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{e}</button>
              ))}
            </div>
          </Card>
          <Btn onClick={solveMaths} loading={loading} color={C.blue} tc="#fff">📐 Solve with Full Working</Btn>
        </>
      )}

      {/* Grade predictor */}
      {sub==="predict"&&(
        <>
          <Card style={{borderColor:C.orange+"44"}}>
            <div style={{fontWeight:900,fontSize:15,color:C.orange,marginBottom:8}}>📈 Nigerian Exam Grade Predictor</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <div><Label>Exam</Label><Pills options={EXAMS} value={exam} onChange={setExam} color={C.orange}/></div>
              <div><Label>Subject</Label><Sel value={subject} onChange={setSubject} options={SUBJECTS} placeholder="Subject"/></div>
            </div>
            <Label>Your Current Practice Score (%)</Label>
            <Inp value={pScore} onChange={setPScore} type="number" placeholder="e.g. 65"/>
          </Card>
          <Card>
            <Label>Topics You've Covered</Label>
            <Inp value={pTopics} onChange={setPTopics} placeholder="e.g. Algebra, Statistics, Trigonometry..."/>
          </Card>
          <Card>
            <Label>Weeks Until Your Exam</Label>
            <Pills options={["2","4","6","8","10","12"]} value={pWeeks} onChange={setPWeeks} color={C.orange}/>
          </Card>
          <Btn onClick={predict} loading={loading} color={C.orange} tc="#fff">📈 Predict My Grade</Btn>
        </>
      )}

      {/* Countdown */}
      {sub==="countdown"&&(
        <>
          <Card style={{borderColor:C.green+"44"}}>
            <div style={{fontWeight:900,fontSize:15,color:C.green,marginBottom:4}}>⏰ Live Exam Countdown</div>
            <div style={{fontSize:12,color:C.muted}}>Track how much time you have left to prepare</div>
          </Card>
          <Card><Label>Select Exam</Label><Pills options={Object.keys(EXAM_DATES)} value={cdExam} onChange={setCdExam} color={C.green}/></Card>
          {d?(
            <>
              <Card style={{background:`linear-gradient(135deg,${u.c}11,${C.card})`,borderColor:u.c+"44",textAlign:"center"}}>
                <div style={{background:u.c+"22",color:u.c,borderRadius:20,padding:"4px 14px",fontSize:11,fontWeight:800,display:"inline-block",marginBottom:12}}>{u.l}</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:16}}>{cdExam} · {EXAM_DATES[cdExam].toLocaleDateString("en-NG",{day:"numeric",month:"long",year:"numeric"})}</div>
                <div style={{display:"flex",justifyContent:"center",gap:12}}>
                  {[["DAYS",d.days],["HRS",d.hours],["MIN",d.mins],["SEC",d.secs]].map(([l,v])=>(
                    <div key={l} style={{textAlign:"center"}}>
                      <div style={{background:C.card2,border:`2px solid ${u.c}44`,borderRadius:14,width:68,height:68,display:"flex",alignItems:"center",justifyContent:"center",fontSize:l==="DAYS"?28:22,fontWeight:900,color:l==="DAYS"?u.c:C.textLight}}>{String(v).padStart(2,"0")}</div>
                      <div style={{fontSize:9,color:C.muted,marginTop:5,fontWeight:700,letterSpacing:1.5}}>{l}</div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card style={{background:C.green+"11",borderColor:C.green+"33"}}>
                <Label c={C.green}>📅 Study Pace Recommendation</Label>
                <div style={{fontSize:13,color:C.green,lineHeight:1.8}}>
                  {d.days<=7?"🔴 Final week! Attempt ONLY past questions — no new topics!"
                    :d.days<=14?"🔴 Final 2 weeks — revisit weak areas and past questions ONLY"
                    :d.days<=30?"🟡 Final month: 2+ topics/day, mock test every 3 days, use ExamAce AI daily"
                    :d.days<=60?"🟢 2 months: 1 topic/day + 30 past questions daily, weekly mocks"
                    :"✅ Plenty of time: build strong foundations, textbook first, then past questions"}
                </div>
              </Card>
            </>
          ):<Card style={{textAlign:"center"}}><div style={{fontSize:32}}>🏁</div><div style={{fontWeight:700,marginTop:8,color:C.textLight}}>Exam date has passed</div></Card>}
          <Card>
            <Label>All Upcoming Exams</Label>
            {Object.entries(EXAM_DATES).map(([name,date])=>{const d2=diff(date),u2=d2?urg(d2.days):null;return(<div key={name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${C.border}`}}><div><div style={{fontWeight:700,fontSize:13,color:C.textLight}}>{name}</div><div style={{fontSize:11,color:C.muted}}>{date.toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"})}</div></div>{d2?<div style={{textAlign:"right"}}><div style={{fontWeight:900,color:u2.c,fontSize:15}}>{d2.days}d</div><div style={{fontSize:10,color:u2.c}}>{u2.l}</div></div>:<span style={{color:C.muted,fontSize:12}}>Passed</span>}</div>);})}
          </Card>
        </>
      )}

      {/* Output */}
      {out&&["keypoints","definitions","focusareas","mnemonics","timetable","examstrategy","maths","predict"].includes(sub)&&(
        <>
          <Out text={out} color={at?.color||C.gold} source={aiSource}/>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button onClick={()=>navigator.clipboard.writeText(out)} style={{flex:1,background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 0",color:C.muted,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>📋 Copy</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(`🏆 ExamAce AI — ${at?.label}\n${exam} ${subject} ${year||""}\n\n${out.slice(0,400)}...\n\nExamAce AI 🇳🇬`)}`} target="_blank" rel="noreferrer" style={{flex:1,background:C.wa,borderRadius:10,padding:"10px 0",color:"#fff",fontWeight:700,fontSize:12,textAlign:"center",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>💬 Share</a>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// ERROR BOUNDARY — catches crashes so the whole app doesn't go blank
// ═══════════════════════════════════════════════════════════════════════════
class ErrorBoundary extends Component {
  constructor(props){ super(props); this.state={hasError:false,error:null}; }
  static getDerivedStateFromError(error){ return {hasError:true,error}; }
  componentDidCatch(error,info){ console.error("ExamAce crash:",error,info); }
  render(){
    if(this.state.hasError){
      return(
        <div style={{padding:24,background:"#0b0d14",minHeight:"100vh",color:"#f1f5f9",fontFamily:"'Segoe UI',sans-serif"}}>
          <div style={{background:"#1a0a0a",border:"1px solid #ef444433",borderRadius:16,padding:24,maxWidth:500,margin:"40px auto",textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:12}}>⚠️</div>
            <div style={{fontWeight:900,fontSize:18,color:"#ef4444",marginBottom:8}}>Something went wrong</div>
            <div style={{fontSize:13,color:"#94a3b8",marginBottom:16,lineHeight:1.6}}>{this.state.error?.message||"An unexpected error occurred"}</div>
            <button onClick={()=>window.location.reload()} style={{background:"#a855f7",border:"none",borderRadius:12,padding:"12px 24px",color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>🔄 Reload App</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [tab,setTab]=useState("ask");
  const [showHistory,setShowHistory]=useState(false);
  const [historyCount,setHistoryCount]=useState(getHistory().length);
  const [streak]=useState(getStreak());

  const handleSaveHistory = useCallback((entry)=>{saveHistory(entry);setHistoryCount(getHistory().length);},[]);

  const TABS=[
    {id:"ask",   icon:"💬", label:"Ask AI"  },
    {id:"snap",  icon:"📸", label:"Snap"    },
    {id:"cbt",   icon:"🖥️", label:"JAMB CBT"},
    {id:"quiz",  icon:"📝", label:"Quiz"    },
    {id:"essay", icon:"✍️",  label:"Essay"   },
    {id:"study", icon:"📚", label:"Study"   },
  ];

  return (
    <ErrorBoundary>
    <div style={{minHeight:"100vh",background:C.bg,color:C.textLight,fontFamily:"'Segoe UI',sans-serif",paddingBottom:76}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#2a2d3e;border-radius:4px}textarea,input,select,button{box-sizing:border-box}input::placeholder,textarea::placeholder{color:#64748b}select option{background:#1e2130;color:#f1f5f9}`}</style>

      {showHistory&&<HistoryDashboard onClose={()=>{setShowHistory(false);setHistoryCount(getHistory().length);}}/>}

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,#0a0c14,#12141e)`,borderBottom:`1px solid ${C.border}`,padding:"13px 14px",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 20px rgba(0,0,0,0.4)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:42,height:42,background:`linear-gradient(135deg,${C.gold},${C.goldD})`,borderRadius:13,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:`0 0 20px ${C.gold}55`,flexShrink:0}}>🏆</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:900,fontSize:19,letterSpacing:"-0.5px",color:C.textLight}}>ExamAce <span style={{color:C.gold}}>AI</span></div>
            <div style={{fontSize:10,color:C.sub,letterSpacing:1.5,textTransform:"uppercase"}}>WAEC · NECO · JAMB · Nigeria 🇳🇬</div>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {streak.count>0&&<div style={{background:C.orange+"22",border:`1px solid ${C.orange}44`,color:C.orange,borderRadius:20,padding:"4px 8px",fontSize:10,fontWeight:800}}>🔥{streak.count}d</div>}
            <button onClick={()=>setShowHistory(true)} style={{background:C.gold+"22",border:`1px solid ${C.gold}44`,color:C.gold,borderRadius:20,padding:"5px 12px",fontSize:10,fontWeight:800,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>📊 {historyCount>0?`${historyCount} sessions`:"History"}</button>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div style={{padding:"14px 13px 0",animation:"fadeUp .3s ease"}}>
        {tab==="ask"   &&<AskAI/>}
        {tab==="snap"  &&<SnapSolve/>}
        {tab==="cbt"   &&<JambCBT onSaveHistory={handleSaveHistory}/>}
        {tab==="quiz"  &&<Quiz onSaveHistory={handleSaveHistory}/>}
        {tab==="essay" &&<EssayMarker/>}
        {tab==="study" &&<StudyTools/>}
      </div>

      {/* Bottom nav */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#0a0c14",borderTop:`1px solid ${C.border}`,display:"flex",zIndex:100,boxShadow:"0 -4px 20px rgba(0,0,0,0.4)"}}>
        {TABS.map(t=>(
          <div key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 0 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer",borderTop:tab===t.id?`2px solid ${C.gold}`:"2px solid transparent",color:tab===t.id?C.gold:C.sub,fontSize:9,fontWeight:tab===t.id?800:400,transition:"all .2s",minWidth:46}}>
            <span style={{fontSize:18}}>{t.icon}</span>{t.label}
          </div>
        ))}
      </div>
    </div>
    </ErrorBoundary>
  );
}