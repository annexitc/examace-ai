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
// Backend URL — points to your Render backend service
// Frontend and backend are on separate Render services
const BACKEND = "https://examace-backend.onrender.com";

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE & AUTH API
// ═══════════════════════════════════════════════════════════════════════════
const AUTH_KEY = "examace_token_v1";
const USER_KEY = "examace_user_v1";

const getToken   = () => { try { return localStorage.getItem(AUTH_KEY)||null; } catch { return null; } };
const getUser    = () => { try { const r=localStorage.getItem(USER_KEY); return r?JSON.parse(r):null; } catch { return null; } };
const saveAuth   = (token,user) => { try { localStorage.setItem(AUTH_KEY,token); localStorage.setItem(USER_KEY,JSON.stringify(user)); } catch {} };
const clearAuth  = () => { try { localStorage.removeItem(AUTH_KEY); localStorage.removeItem(USER_KEY); } catch {} };

const apiCall = async (path, method="GET", body=null) => {
  const token = getToken();
  const opts = { method, headers:{ "Content-Type":"application/json", ...(token?{"Authorization":`Bearer ${token}`}:{}) } };
  if(body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BACKEND}${path}`, opts);
  const data = await res.json();
  if(!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data;
};

const NIGERIA_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT Abuja","Gombe",
  "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto",
  "Taraba","Yobe","Zamfara"
];

// Gamification helpers (mirror server constants)
const LEVELS_CLIENT = [
  {level:1,name:"SS1 Starter",  minXP:0,   badge:"🌱",color:"#22c55e"},
  {level:2,name:"SS1 Learner",   minXP:100, badge:"📚",color:"#38bdf8"},
  {level:3,name:"SS2 Scholar",   minXP:300, badge:"⭐",color:"#a855f7"},
  {level:4,name:"SS3 Candidate", minXP:600, badge:"🎯",color:"#f97316"},
  {level:5,name:"WAEC Ready",    minXP:1000,badge:"🏅",color:"#f5c842"},
  {level:6,name:"JAMB Champion", minXP:1500,badge:"🏆",color:"#f5c842"},
  {level:7,name:"A1 Legend",     minXP:2500,badge:"👑",color:"#ef4444"},
  {level:8,name:"ExamAce Master",minXP:4000,badge:"💎",color:"#a855f7"},
];
const getLevelClient = (xp=0) => {
  const lvl  = [...LEVELS_CLIENT].reverse().find(l=>xp>=l.minXP)||LEVELS_CLIENT[0];
  const next = LEVELS_CLIENT.find(l=>l.minXP>xp);
  return {...lvl, nextXP:next?.minXP||null, xpToNext:next?next.minXP-xp:0,
    progress:next?Math.round(((xp-lvl.minXP)/(next.minXP-lvl.minXP))*100):100};
};

const ACHIEVEMENTS_CLIENT = [
  {id:"first_quiz",  name:"First Step",     desc:"Complete your first quiz",              icon:"🎯"},
  {id:"streak_3",    name:"Hat Trick",       desc:"3-day study streak",                    icon:"🔥"},
  {id:"streak_7",    name:"Week Warrior",    desc:"7-day study streak",                    icon:"⚡"},
  {id:"streak_30",   name:"Iron Student",    desc:"30-day study streak",                   icon:"💪"},
  {id:"perfect_quiz",name:"Perfectionist",   desc:"Score 100% on any quiz",               icon:"💯"},
  {id:"cbt_first",   name:"CBT Debut",       desc:"Complete your first JAMB CBT mock",    icon:"🖥️"},
  {id:"cbt_280",     name:"Uni Ready",       desc:"Score 280+ in JAMB CBT",               icon:"🎓"},
  {id:"cbt_300",     name:"Admission Ready", desc:"Score 300+ in JAMB CBT",               icon:"🏛️"},
  {id:"q100",        name:"Century Mark",    desc:"Answer 100 questions total",            icon:"💯"},
  {id:"q500",        name:"Question Master", desc:"Answer 500 questions total",            icon:"🌟"},
  {id:"q1000",       name:"Question Legend", desc:"Answer 1,000 questions total",          icon:"🔱"},
  {id:"subjects_5",  name:"All-Rounder",     desc:"Practice 5 different subjects",         icon:"📚"},
  {id:"waec_a1",     name:"A1 Achiever",     desc:"Score 75%+ on any WAEC quiz",          icon:"🏆"},
  {id:"review_10",   name:"Disciplined",     desc:"Complete 10 spaced repetition reviews", icon:"🔁"},
  {id:"review_50",   name:"Memory Master",   desc:"Complete 50 spaced repetition reviews", icon:"🧠"},
];

// Career counselling API
const callCareer = async (message, history=[], profile={}) => {
  const res = await fetch(`${BACKEND}/api/career`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(getToken()?{"Authorization":`Bearer ${getToken()}`}:{}) },
    body: JSON.stringify({ message, history, profile }),
  });
  if(!res.ok) throw new Error(`Career API error: ${res.status}`);
  return await res.json();
};

// Daily question API
const fetchDailyQuestion = async (subject, exam="WAEC") => {
  const res = await fetch(`${BACKEND}/api/daily-question?subject=${encodeURIComponent(subject||"Mathematics")}&exam=${exam}`);
  if(!res.ok) throw new Error("Daily question unavailable");
  return await res.json();
};

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

// ── STREAMING AI CALL — shows answer word-by-word ────────────────────────────
const callAIStream = async (messages, system, onToken, onDone) => {
  try {
    const res = await fetch(`${BACKEND}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, system }),
    });
    if (!res.ok) throw new Error(`Stream error: ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let source = "AI";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "token") { source = data.source || source; onToken(data.text, source); }
            if (data.type === "done")  { onDone(source); return; }
            if (data.type === "error") { onDone(source); return; }
          } catch {}
        }
      }
    }
    onDone(source);
  } catch(e) {
    // Fallback to non-streaming if stream fails
    console.warn("Stream failed, using regular callAI:", e.message);
    const { text, source } = await callAI(messages, system);
    onToken(text, source);
    onDone(source);
  }
};

// ── REPORT QUESTION (flag bad ALOC question) ──────────────────────────────────
const reportQuestion = async (questionId, subject, type=1, message="") => {
  if (!questionId) return;
  try {
    await fetch(`${BACKEND}/api/report-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, subject, type, message }),
    });
    console.log(`🚩 Reported question ${questionId}`);
  } catch(e) { console.warn("Report failed:", e.message); }
};

// ── SPACED REPETITION STORE ───────────────────────────────────────────────────
// Wrong questions are scheduled for review: 1 day → 3 days → 7 days → 14 days
const SRS_KEY = "examace_srs_v1";
const SRS_INTERVALS = [1, 3, 7, 14]; // days

const getSRS = () => {
  try { const r = localStorage.getItem(SRS_KEY); return r ? JSON.parse(r) : {}; } catch { return {}; }
};
const saveSRS = (data) => {
  try { localStorage.setItem(SRS_KEY, JSON.stringify(data)); } catch {}
};
const scheduleReview = (question, subject, exam) => {
  try {
    const srs = getSRS();
    const id = question.id || `${question.q.slice(0,40)}`;
    const existing = srs[id];
    const interval = existing ? SRS_INTERVALS[Math.min(existing.level||0, SRS_INTERVALS.length-1)] : SRS_INTERVALS[0];
    const nextReview = Date.now() + interval * 24 * 60 * 60 * 1000;
    srs[id] = { question, subject, exam, level: existing ? Math.min((existing.level||0)+1, SRS_INTERVALS.length-1) : 0, nextReview, scheduled: new Date().toISOString() };
    saveSRS(srs);
  } catch {}
};
const getDueReviews = () => {
  try {
    const srs = getSRS();
    const now = Date.now();
    return Object.values(srs).filter(r => r.nextReview <= now);
  } catch { return []; }
};
const clearReviewItem = (question) => {
  try {
    const srs = getSRS();
    const id = question.id || `${question.q.slice(0,40)}`;
    delete srs[id];
    saveSRS(srs);
  } catch {}
};

// ── WEAKNESS TRACKER ──────────────────────────────────────────────────────────
const WEAKNESS_KEY = "examace_weakness_v1";
const updateTopicStats = (topic, subject, correct) => {
  try {
    const data = JSON.parse(localStorage.getItem(WEAKNESS_KEY)||"{}");
    const key = `${subject}||${topic}`;
    if (!data[key]) data[key] = { topic, subject, correct:0, total:0 };
    data[key].total++;
    if (correct) data[key].correct++;
    data[key].pct = Math.round((data[key].correct / data[key].total) * 100);
    localStorage.setItem(WEAKNESS_KEY, JSON.stringify(data));
  } catch {}
};
const getWeakTopics = (threshold=50) => {
  try {
    const data = JSON.parse(localStorage.getItem(WEAKNESS_KEY)||"{}");
    return Object.values(data)
      .filter(t => t.total >= 3 && t.pct < threshold)
      .sort((a,b) => a.pct - b.pct)
      .slice(0, 10);
  } catch { return []; }
};

// ── CBT AUTO-SAVE ─────────────────────────────────────────────────────────────
const CBT_SAVE_KEY = "examace_cbt_save_v1";
const saveCBTProgress = (subjects, allQs, answers, flagged, timeLeft) => {
  try {
    localStorage.setItem(CBT_SAVE_KEY, JSON.stringify({ subjects, allQs, answers, timeLeft, savedAt: Date.now() }));
  } catch {}
};
const loadCBTSave = () => {
  try {
    const r = localStorage.getItem(CBT_SAVE_KEY);
    if (!r) return null;
    const data = JSON.parse(r);
    // Only restore if saved within the last 3 hours
    if (Date.now() - data.savedAt > 3 * 60 * 60 * 1000) { localStorage.removeItem(CBT_SAVE_KEY); return null; }
    return data;
  } catch { return null; }
};
const clearCBTSave = () => { try { localStorage.removeItem(CBT_SAVE_KEY); } catch {} };

// ═══════════════════════════════════════════════════════════════════════════
// CHALLENGE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

const createChallenge = async (subject, exam, year, score, total, pct, questions) => {
  try {
    return await apiCall("/api/challenge/create","POST",{subject,exam,year,score,total,pct,questions:questions.slice(0,10)});
  } catch(e){ console.warn("Challenge create failed:",e.message); return null; }
};

const fetchChallenge = async (id) => {
  const res = await fetch(`${BACKEND}/api/challenge/${id}`);
  if(!res.ok) throw new Error("Challenge not found or expired");
  return res.json();
};

const submitChallenge = async (id, answers, guestName) => {
  const res = await fetch(`${BACKEND}/api/challenge/${id}/submit`,{
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({answers,guestName}),
  });
  if(!res.ok) throw new Error("Could not submit");
  return res.json();
};

const getChallengeIdFromUrl = () => {
  try {
    const m = window.location.pathname.match(/\/challenge\/([A-Z0-9]{6})/i);
    return m ? m[1].toUpperCase() : null;
  } catch { return null; }
};

// Source badge — always shows ExamAce AI (never reveals underlying model)
const SOURCE_BADGE = {
  "ExamAce AI": { bg:"#f5c84218", border:"#f5c84233", color:"#f5c842", label:"✨ ExamAce AI" },
  "ALOC":       { bg:"#22c55e18", border:"#22c55e33", color:"#22c55e", label:"✅ Real Past Question" },
  "Error":      { bg:"#ef444418", border:"#ef444433", color:"#ef4444", label:"⚠️ Error" },
};
const getSourceBadge = (src) => SOURCE_BADGE[src] || SOURCE_BADGE["ExamAce AI"];

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
  // Always show ExamAce branding — never expose underlying AI provider
  const isReal = source === "ALOC";
  const isError = source === "Error";
  const bg    = isReal ? "#22c55e18" : isError ? "#ef444418" : "#f5c84218";
  const border= isReal ? "#22c55e33" : isError ? "#ef444433" : "#f5c84233";
  const color = isReal ? "#22c55e"   : isError ? "#ef4444"   : "#f5c842";
  const label = isReal ? "✅ Real Past Question" : isError ? "⚠️ Try again" : "🏆 ExamAce AI";
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:4, background:bg, border:`1px solid ${border}`, borderRadius:20, padding:"2px 8px", fontSize:9, color, fontWeight:800, marginTop:6 }}>
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
// PROFILE SETUP — shown to new users on first open
// ═══════════════════════════════════════════════════════════════════════════
function ProfileSetup({ onComplete }) {
  const [step,setStep]=useState(0);
  const [name,setName]=useState("");
  const [avatar,setAvatar]=useState("🎓");
  const [exam,setExam]=useState("JAMB");
  const [examYear,setExamYear]=useState("2025");
  const [school,setSchool]=useState("");
  const [subjects,setSubjects]=useState([]);

  const EXAM_SUBJECTS = ["Mathematics","English Language","Physics","Chemistry","Biology","Economics","Government","Literature in English","Agricultural Science","Geography","Accounting","Commerce","Christian Religious Studies","Islamic Studies"];

  const toggleSubject = (s) => setSubjects(prev=>prev.includes(s)?prev.filter(x=>x!==s):[...prev,s].slice(0,4));

  const finish = () => {
    const profile = { name:name.trim()||"Student", avatar, exam, examYear, school:school.trim(), subjects, createdAt:Date.now() };
    saveProfile(profile);
    // Give welcome XP
    awardXP(100, "profile created");
    onComplete(profile);
  };

  const steps = [
    // Step 0: Name + avatar
    <div key={0}>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:64,marginBottom:8}}>{avatar}</div>
        <div style={{fontSize:18,fontWeight:900,color:C.textLight,marginBottom:4}}>Welcome to ExamAce AI! 🏆</div>
        <div style={{fontSize:13,color:C.muted}}>Let's set up your student profile</div>
      </div>
      <Label>Your Name</Label>
      <Inp value={name} onChange={setName} placeholder="e.g. Chidi Okonkwo"/>
      <div style={{marginTop:16,marginBottom:8}}><Label>Choose Your Avatar</Label></div>
      <div style={{display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center"}}>
        {AVATARS.map(a=>(
          <button key={a} onClick={()=>setAvatar(a)} style={{width:52,height:52,fontSize:28,background:avatar===a?C.gold+"22":C.card2,border:`2px solid ${avatar===a?C.gold:C.border}`,borderRadius:14,cursor:"pointer"}}>
            {a}
          </button>
        ))}
      </div>
      <div style={{marginTop:20}}>
        <Btn onClick={()=>setStep(1)} color={C.gold} disabled={!name.trim()}>Next →</Btn>
      </div>
    </div>,

    // Step 1: Exam details
    <div key={1}>
      <div style={{textAlign:"center",marginBottom:20}}>
        <div style={{fontSize:42,marginBottom:8}}>{avatar}</div>
        <div style={{fontSize:16,fontWeight:800,color:C.gold}}>Hi {name}! 👋</div>
        <div style={{fontSize:13,color:C.muted,marginTop:4}}>Tell us about your exam</div>
      </div>
      <Label>Target Exam</Label>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
        {["JAMB","WAEC","NECO"].map(e=>(
          <button key={e} onClick={()=>setExam(e)} style={{padding:"12px 0",background:exam===e?C.purple+"22":C.card2,border:`2px solid ${exam===e?C.purple:C.border}`,borderRadius:12,color:exam===e?C.purple:C.muted,fontWeight:exam===e?800:400,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{e}</button>
        ))}
      </div>
      <Label>Exam Year</Label>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {["2025","2026"].map(y=>(
          <button key={y} onClick={()=>setExamYear(y)} style={{flex:1,padding:"11px 0",background:examYear===y?C.purple+"22":C.card2,border:`2px solid ${examYear===y?C.purple:C.border}`,borderRadius:12,color:examYear===y?C.purple:C.muted,fontWeight:examYear===y?800:400,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{y}</button>
        ))}
      </div>
      <Label>Target School (optional)</Label>
      <Inp value={school} onChange={setSchool} placeholder="e.g. University of Lagos"/>
      <div style={{display:"flex",gap:8,marginTop:20}}>
        <button onClick={()=>setStep(0)} style={{flex:1,background:C.card2,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 0",color:C.muted,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
        <button onClick={()=>setStep(2)} style={{flex:2,background:C.purple,border:"none",borderRadius:12,padding:"13px 0",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Next →</button>
      </div>
    </div>,

    // Step 2: Subjects
    <div key={2}>
      <div style={{textAlign:"center",marginBottom:20}}>
        <div style={{fontSize:42,marginBottom:8}}>{avatar}</div>
        <div style={{fontSize:16,fontWeight:800,color:C.gold}}>Your Subjects</div>
        <div style={{fontSize:13,color:C.muted,marginTop:4}}>Select up to 4 subjects you're preparing for</div>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20}}>
        {EXAM_SUBJECTS.map(s=>(
          <button key={s} onClick={()=>toggleSubject(s)} style={{padding:"8px 14px",background:subjects.includes(s)?C.green+"22":C.card2,border:`1.5px solid ${subjects.includes(s)?C.green:C.border}`,borderRadius:20,color:subjects.includes(s)?C.green:C.muted,fontWeight:subjects.includes(s)?700:400,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{s}</button>
        ))}
      </div>
      <div style={{background:C.gold+"18",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:12,color:C.gold}}>
        🎁 Complete setup to earn <b>100 XP</b> welcome bonus!
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>setStep(1)} style={{flex:1,background:C.card2,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 0",color:C.muted,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
        <button onClick={finish} style={{flex:2,background:C.gold,border:"none",borderRadius:12,padding:"13px 0",color:"#000",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>🚀 Start Learning!</button>
      </div>
    </div>
  ];

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:24,padding:24,width:"100%",maxWidth:440,maxHeight:"90vh",overflowY:"auto"}}>
        {/* Progress dots */}
        <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:20}}>
          {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:i<=step?C.gold:C.border,transition:"background .3s"}}/>)}
        </div>
        {steps[step]}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE DASHBOARD — full student profile page
// ═══════════════════════════════════════════════════════════════════════════
function ProfileDashboard({ profile, onClose, onEdit }) {
  const xpData    = getXPData();
  const history   = getHistory();
  const streak    = getStreak();
  const lvlIdx    = getLevelFromXP(xpData.xp);
  const lvl       = LEVELS[lvlIdx];
  const nextLvl   = LEVELS[lvlIdx+1];
  const progress  = getLevelProgress(xpData.xp);
  const quizzes   = history.filter(h=>h.type==="quiz");
  const cbts      = history.filter(h=>h.type==="cbt");
  const avgScore  = quizzes.length>0?Math.round(quizzes.reduce((s,h)=>s+h.pct,0)/quizzes.length):0;
  const bestCBT   = cbts.length>0?Math.max(...cbts.map(h=>h.jambScore)):0;
  const daysStudied = history.length>0?new Set(history.map(h=>new Date(h.timestamp).toDateString())).size:0;

  // Subjects practiced
  const subjectSet = [...new Set(quizzes.map(h=>h.subject))];

  // Earned badges
  const earnedBadges = BADGES_DEF.filter(b=>xpData.badges?.includes(b.id));
  const lockedBadges = BADGES_DEF.filter(b=>!xpData.badges?.includes(b.id));

  return(
    <div style={{position:"fixed",inset:0,background:C.bg,zIndex:200,overflowY:"auto",paddingBottom:40}}>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg,#0a0c14,#12141e)`,borderBottom:`1px solid ${C.border}`,padding:"13px 16px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,zIndex:10}}>
        <button onClick={onClose} style={{background:C.card2,border:`1px solid ${C.border}`,color:C.muted,borderRadius:10,padding:"7px 14px",cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:700}}>← Back</button>
        <div style={{flex:1,fontWeight:900,fontSize:17,color:C.textLight}}>My Profile</div>
        <button onClick={onEdit} style={{background:C.card2,border:`1px solid ${C.border}`,color:C.muted,borderRadius:10,padding:"7px 12px",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:700}}>✏️ Edit</button>
      </div>

      <div style={{padding:"16px 14px 0"}}>

        {/* Hero card */}
        <div style={{background:`linear-gradient(135deg,${lvl.color}22,${C.card})`,border:`1px solid ${lvl.color}44`,borderRadius:20,padding:20,marginBottom:14,textAlign:"center"}}>
          <div style={{fontSize:64,marginBottom:8}}>{profile.avatar||"🎓"}</div>
          <div style={{fontWeight:900,fontSize:22,color:C.textLight,marginBottom:2}}>{profile.name}</div>
          <div style={{fontSize:13,color:C.muted,marginBottom:10}}>{profile.exam} {profile.examYear}{profile.school?" · "+profile.school:""}</div>
          {/* Level badge */}
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:lvl.color+"22",border:`1px solid ${lvl.color}44`,borderRadius:20,padding:"6px 16px",marginBottom:12}}>
            <span style={{fontSize:18}}>{lvl.icon}</span>
            <span style={{fontWeight:800,color:lvl.color,fontSize:13}}>{lvl.name}</span>
          </div>
          {/* XP bar */}
          <div style={{marginBottom:4}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginBottom:4}}>
              <span>{xpData.xp} XP total</span>
              <span>{nextLvl?`${progress.needed} XP to ${nextLvl.name}`:"Max Level!"}</span>
            </div>
            <div style={{background:C.border,borderRadius:8,height:10}}>
              <div style={{background:lvl.color,height:"100%",borderRadius:8,width:progress.pct+"%",transition:"width 1s"}}/>
            </div>
          </div>
          <div style={{fontSize:12,color:lvl.color,fontWeight:700,marginTop:4}}>{progress.pct}% to next level</div>
        </div>

        {/* Stats grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
          {[
            {icon:"🔥",label:"Current Streak",value:`${streak.count} days`,sub:`Best: ${streak.best||streak.count} days`,color:C.orange},
            {icon:"⚡",label:"Total XP",value:xpData.xp.toLocaleString(),sub:`${xpData.weeklyXP||0} XP this week`,color:C.gold},
            {icon:"📝",label:"Quizzes Done",value:quizzes.length,sub:`Avg: ${avgScore}%`,color:C.blue},
            {icon:"🖥️",label:"CBT Mocks",value:cbts.length,sub:bestCBT>0?`Best: ${bestCBT}/400`:"No CBT yet",color:C.purple},
            {icon:"📅",label:"Days Studied",value:daysStudied,sub:`${streak.freeze||0} streak freeze${streak.freeze!==1?"s":""} left`,color:C.green},
            {icon:"🏅",label:"Badges",value:`${earnedBadges.length}/${BADGES_DEF.length}`,sub:"achievements",color:C.pink},
          ].map(s=>(
            <div key={s.label} style={{background:C.card,border:`1px solid ${s.color}22`,borderRadius:14,padding:14}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                <span style={{fontSize:20}}>{s.icon}</span>
                <span style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>{s.label}</span>
              </div>
              <div style={{fontWeight:900,fontSize:22,color:s.color}}>{s.value}</div>
              <div style={{fontSize:11,color:C.sub,marginTop:2}}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Subjects */}
        {(profile.subjects?.length>0||subjectSet.length>0)&&(
          <Card>
            <Label>My Subjects</Label>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {[...new Set([...(profile.subjects||[]),...subjectSet])].map(s=>(
                <div key={s} style={{background:C.green+"18",border:`1px solid ${C.green}33`,borderRadius:20,padding:"5px 12px",fontSize:12,color:C.green,fontWeight:600}}>{s}</div>
              ))}
            </div>
          </Card>
        )}

        {/* Streak calendar (last 30 days) */}
        <Card>
          <Label c={C.orange}>🔥 Study Streak</Label>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <div style={{textAlign:"center"}}><div style={{fontWeight:900,fontSize:28,color:C.orange}}>{streak.count}</div><div style={{fontSize:11,color:C.muted}}>current</div></div>
            <div style={{textAlign:"center"}}><div style={{fontWeight:900,fontSize:28,color:C.gold}}>{streak.best||streak.count}</div><div style={{fontSize:11,color:C.muted}}>best ever</div></div>
            <div style={{textAlign:"center"}}><div style={{fontWeight:900,fontSize:28,color:C.green}}>{daysStudied}</div><div style={{fontSize:11,color:C.muted}}>total days</div></div>
          </div>
          {/* Mini calendar dots */}
          <div>
            <div style={{fontSize:11,color:C.muted,marginBottom:6}}>Last 30 days</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {Array.from({length:30},(_,i)=>{
                const day = new Date(Date.now()-(29-i)*86400000).toDateString();
                const studied = history.some(h=>new Date(h.timestamp).toDateString()===day);
                return <div key={i} style={{width:18,height:18,borderRadius:4,background:studied?C.orange:C.card2,border:`1px solid ${studied?C.orange+"66":C.border}`}}/>;
              })}
            </div>
          </div>
          {streak.freeze>0&&(
            <div style={{marginTop:10,background:C.blue+"18",borderRadius:10,padding:"8px 12px",fontSize:12,color:C.sky}}>
              🛡️ You have <b>{streak.freeze}</b> streak freeze{streak.freeze!==1?"s":""} available — your streak is protected!
            </div>
          )}
        </Card>

        {/* Badges */}
        <Card>
          <Label c={C.gold}>🏅 Achievements ({earnedBadges.length}/{BADGES_DEF.length})</Label>
          {earnedBadges.length===0&&(
            <div style={{fontSize:13,color:C.muted,marginBottom:12}}>Complete quizzes and CBT mocks to earn badges!</div>
          )}
          {/* Earned */}
          {earnedBadges.length>0&&(
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
              {earnedBadges.map(b=>(
                <div key={b.id} style={{background:C.gold+"22",border:`1px solid ${C.gold}44`,borderRadius:12,padding:"8px 12px",display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:22}}>{b.icon}</span>
                  <div><div style={{fontSize:12,fontWeight:800,color:C.gold}}>{b.name}</div><div style={{fontSize:10,color:C.muted}}>{b.desc}</div></div>
                </div>
              ))}
            </div>
          )}
          {/* Locked */}
          <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>Locked ({lockedBadges.length})</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {lockedBadges.map(b=>(
              <div key={b.id} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:"6px 10px",display:"flex",alignItems:"center",gap:6,opacity:0.6}}>
                <span style={{fontSize:18,filter:"grayscale(1)"}}>{b.icon}</span>
                <div><div style={{fontSize:11,fontWeight:700,color:C.sub}}>{b.name}</div><div style={{fontSize:10,color:C.sub}}>{b.desc}</div></div>
              </div>
            ))}
          </div>
        </Card>

        {/* Share card */}
        {(()=>{
          const shareText="🏆 My ExamAce AI Profile!\n\n"+
            (profile?.avatar||"🌱")+" "+(profile?.name||"Student")+" — Level "+(lvl?.icon||"")+" "+(lvl?.name||"")+"\n"+
            "⚡ "+(xpData?.xp||0)+" XP · 🔥 "+(streak?.count||0)+" day streak\n"+
            "📝 "+quizzes.length+" quizzes · 🏅 "+(earnedBadges?.length||0)+" badges"+
            (bestCBT>0?"\n🖥️ Best CBT: "+bestCBT+"/400":"")+"\n\nStudying with ExamAce AI 🇳🇬";
          return(
            <a href={"https://wa.me/?text="+encodeURIComponent(shareText)} target="_blank" rel="noreferrer"
              style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:C.wa,borderRadius:13,padding:"14px 0",color:"#fff",fontWeight:800,fontSize:14,textDecoration:"none",marginTop:4}}>
              💬 Share My Profile on WhatsApp
            </a>
          );
        })()}
      </div>
    </div>
  );
}

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

  // Auto-save answers every 30 seconds during test
  useEffect(()=>{
    if(screen !== "test") return;
    const interval = setInterval(()=>{
      saveCBTProgress(subjects, allQs, answers, {}, timeLeft);
    }, 30000);
    return () => clearInterval(interval);
  },[screen, answers, timeLeft]);

  // On mount: check for saved CBT progress and offer restore
  useEffect(()=>{
    const saved = loadCBTSave();
    if(saved && saved.subjects && Object.keys(saved.allQs||{}).length > 0){
      const mins = Math.floor((Date.now()-saved.savedAt)/60000);
      if(window.confirm(`Resume your previous CBT session from ${mins} minutes ago? (${Object.values(saved.answers||{}).reduce((s,a)=>s+Object.keys(a).length,0)} answers saved)`)){
        setSubjects(saved.subjects);
        allQsRef.current = saved.allQs;
        setAllQs(saved.allQs);
        setAnswers(saved.answers||{});
        setTimeLeft(saved.timeLeft||7200);
        setScreen("test");
        clearCBTSave();
      } else {
        clearCBTSave();
      }
    }
  },[]);

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
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={toggleFlag} style={{background:isFlagged?C.orange+"22":"transparent",border:`1px solid ${isFlagged?C.orange:C.border}`,borderRadius:8,padding:"4px 10px",color:isFlagged?C.orange:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{isFlagged?"🚩":"🏳️"}</button>
                    {q.source==="ALOC"&&q.id&&<button onClick={()=>{if(window.confirm("Report this question as incorrect/unclear?"))reportQuestion(q.id,subjects[curSubj],1,"Reported by student");}} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 10px",color:C.sub,fontSize:11,cursor:"pointer",fontFamily:"inherit"}} title="Report bad question">⚠️</button>}
                  </div>
                </div>
                {/* Show comprehension passage if present */}
                {q.passage&&(
                  <div style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:12,marginBottom:12}}>
                    <div style={{fontSize:10,fontWeight:800,color:C.gold,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>📖 Read the passage carefully</div>
                    <div style={{fontSize:13,color:"#cbd5e1",lineHeight:1.9,fontStyle:"italic"}}>{q.passage}</div>
                  </div>
                )}
                <div style={{fontSize:15,fontWeight:600,lineHeight:1.8,color:C.textLight}}>{q.q}</div>
              </Card>

              {/* Options */}
              {(()=>{
                const opts = q.options || {};
                const hasContent = Object.values(opts).some(v => v && v.trim().length > 0);
                if (!hasContent) {
                  return (
                    <Card style={{background:C.orange+"18",borderColor:C.orange+"44",textAlign:"center"}}>
                      <div style={{fontSize:13,color:C.orange,fontWeight:700}}>⚠️ Options not available for this question</div>
                      <div style={{fontSize:11,color:C.muted,marginTop:4}}>This ALOC question has missing option data. Skip to the next question.</div>
                      <button onClick={()=>setCurQ(q=>Math.min(q+1, currentSubjCount-1))}
                        style={{marginTop:10,background:C.orange,border:"none",borderRadius:10,padding:"8px 20px",color:"#fff",fontWeight:800,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>
                        Skip →
                      </button>
                    </Card>
                  );
                }
                return (
                  <div style={{display:"flex",flexDirection:"column",gap:9}}>
                    {["A","B","C","D"].map(letter => {
                      const text = opts[letter] || "";
                      if (!text) return null;
                      return (
                        <button key={letter} onClick={()=>setAnswer(letter)} style={{background:curAns===letter?C.purple+"33":C.card,border:`2px solid ${curAns===letter?C.purple:C.border}`,borderRadius:14,padding:"13px 16px",color:curAns===letter?C.purple:C.textLight,fontSize:13,textAlign:"left",cursor:"pointer",display:"flex",gap:12,alignItems:"center",fontFamily:"inherit",transition:"all .15s"}}>
                          <span style={{width:30,height:30,borderRadius:"50%",background:curAns===letter?C.purple:C.card2,color:curAns===letter?"#fff":C.muted,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,flexShrink:0}}>{letter}</span>
                          <span style={{flex:1,lineHeight:1.4}}>{text}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

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
  const [showChallenge,setShowChallenge]=useState(false);
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
    // Track topic performance for weakness detection
    if(q.topic) updateTopicStats(q.topic, subject, ok);
    // Schedule wrong answers for spaced repetition review
    if(!ok) scheduleReview(q, subject, exam);
  };

  const next = () => {
    if(cur+1>=qs.length)finish();
    else{setCur(c=>c+1);setSel(null);setAnswered(false);setTimer(45);setTimerOn(true);}
  };

  const finish = async () => {
    const finalScore = score;
    const pct=Math.round((finalScore/qs.length)*100);
    setMode("result");
    onSaveHistory({type:"quiz",exam,subject,year:qtype==="year"?year:"Random",qtype,pct,score:finalScore,total:qs.length});
    const wrong=log.filter(r=>!r.ok);
    // Schedule ALL wrong questions for spaced repetition (1-day interval first)
    wrong.forEach(r => scheduleReview(r, subject, exam));
    if(wrong.length>0){
      setCoachLoading(true);
      try{
        const {text}=await callAI(`Nigerian student scored ${finalScore}/${qs.length} (${pct}%) in ${exam} ${subject}${qtype==="year"?" ("+year+" paper)":""}.
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
            {/* Comprehension passage */}
            {q.passage&&(
              <div style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:12,margin:"8px 0"}}>
                <div style={{fontSize:10,fontWeight:800,color:C.gold,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>📖 Read the passage carefully</div>
                <div style={{fontSize:13,color:"#cbd5e1",lineHeight:1.9,fontStyle:"italic"}}>{q.passage}</div>
              </div>
            )}
            </div>
            <div style={{fontSize:15,fontWeight:700,lineHeight:1.8,color:C.textLight}}>{q.q}</div>
          </Card>

          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {["A","B","C","D"].map(l=>{
              const t=(q.options||{})[l]||"";
              if(!t)return null;
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
              {/* Show Me How button — sends to AskAI with full working request */}
              {sel!==q.answer&&(
                <button onClick={()=>{
                  const prompt="Show me how to solve this "+exam+" "+subject+" question step by step:\n\n"+q.q+"\n\nOptions: A) "+(q.options?.A||"")+" B) "+(q.options?.B||"")+" C) "+(q.options?.C||"")+" D) "+(q.options?.D||"")+"\n\nCorrect answer: "+q.answer;
                  // Store in sessionStorage so AskAI tab can pick it up
                  sessionStorage.setItem("examace_show_me", prompt);
                  alert("Switch to the Ask AI tab — your question is ready to send! 💡");
                }} style={{width:"100%",background:C.purple+"22",border:`1px solid ${C.purple}44`,borderRadius:12,padding:"11px 0",color:C.purple,fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",marginBottom:8}}>
                  🎓 Show Me How To Solve This
                </button>
              )}
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
            {(()=>{const wrong=log.filter(r=>!r.ok);return wrong.length>0?<div style={{marginTop:6,background:C.purple+"18",borderRadius:10,padding:"5px 12px",display:"inline-block",fontSize:11,color:C.purple,fontWeight:700}}>🔁 {wrong.length} wrong questions scheduled for review</div>:null;})()}
            {/* Challenge share — appears after score >= 60% */}
            {pct>=60&&<button onClick={()=>setShowChallenge(true)} style={{marginTop:10,width:"100%",background:C.purple+"22",border:`1.5px solid ${C.purple}44`,borderRadius:12,padding:"11px 0",color:C.purple,fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>⚔️ Challenge a Friend — Can They Beat {pct}%?</button>}
            {showChallenge&&<ChallengeShareCard subject={subject} exam={exam} year={year} score={score} total={qs.length} pct={pct} questions={qs.map((q,i)=>({...q,sel:log[i]?.sel,ok:log[i]?.ok}))} onClose={()=>setShowChallenge(false)}/>}
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
  // Pick up "Show Me How" prompt from Quiz tab via sessionStorage
  useEffect(()=>{
    const pending = sessionStorage.getItem("examace_show_me");
    if(pending){
      sessionStorage.removeItem("examace_show_me");
      // Auto-send after a short delay so the component is fully mounted
      setTimeout(()=>{
        setInput(pending);
      }, 400);
    }
  },[]);

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
      if(imgData){
        // Images can't stream — use regular callAI
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
        setImgData(null);
        setMsgs(m=>[...m,{from:"bot",text:r.text,time:ts(),source:r.source}]);
      } else {
        // Stream text responses token-by-token ✨
        const hist=msgs.slice(-8).map(m=>({role:m.from==="user"?"user":"assistant",content:m.text}));
        const msgHistory=[...hist,{role:"user",content:msg}];
        const botId = Date.now();
        // Add an empty bot message that we'll fill in
        setMsgs(m=>[...m,{from:"bot",text:"",time:ts(),source:"",id:botId,streaming:true}]);
        setLoading(false); // hide spinner — streaming indicator shows instead

        let fullText = "";
        let finalSource = "AI";
        await callAIStream(
          msgHistory,
          SYS(exam,subject,yr),
          (token, src) => {
            fullText += token;
            finalSource = src;
            setMsgs(m => m.map(msg => msg.id===botId ? {...msg, text:fullText, source:src, streaming:true} : msg));
          },
          (src) => {
            finalSource = src;
            setMsgs(m => m.map(msg => msg.id===botId ? {...msg, source:src, streaming:false} : msg));
          }
        );
        return; // don't call setLoading(false) again below
      }
    }catch{
      setMsgs(m=>[...m,{from:"bot",text:"⚠️ Connection issue. Please try again!",time:ts()}]);
    }
    setLoading(false);
  };

  const QUICK_ASKS = [
    "Show me how to solve quadratic equations step by step",
    "WAEC 2023 Maths past question",
    "JAMB 2022 Chemistry",
    "Explain osmosis for NECO",
    "How to pass JAMB in one sitting?",
    "Show me how to balance chemical equations",
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
                {m.img&&<img src={m.img} alt="" style={{maxWidth:"100%",borderRadius:8,marginBottom:8,maxHeight:140,objectFit:"cover"}}/>}
                <div>{fmt(m.text||"",false)}{m.streaming&&<span style={{display:"inline-block",width:7,height:13,background:"#475569",borderRadius:2,marginLeft:2,animation:"blink .7s step-end infinite",verticalAlign:"middle"}}/>}</div>
                {!m.streaming&&m.source&&<AiBadge source={m.source}/>}
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
  const [camMode,setCamMode]=useState(false);
  const [stream,setStream]=useState(null);
  const fileRef=useRef();
  const videoRef=useRef();
  const canvasRef=useRef();

  // Auto-open camera when Snap tab is visited
  useEffect(()=>{
    openCamera();
    return ()=>{ stopCamera(); };
  },[]);

  const openCamera = async () => {
    // Only try camera if no image already loaded
    if(preview) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video:{ facingMode:"environment", width:{ideal:1280}, height:{ideal:720} }
      });
      setStream(s);
      setCamMode(true);
      // Attach stream to video element after state update
      setTimeout(()=>{ if(videoRef.current){ videoRef.current.srcObject=s; videoRef.current.play(); } },100);
    } catch(e) {
      console.log("Camera not available, using file picker:", e.message);
      setCamMode(false);
    }
  };

  const stopCamera = () => {
    if(stream){ stream.getTracks().forEach(t=>t.stop()); setStream(null); }
    setCamMode(false);
  };

  const capturePhoto = () => {
    if(!videoRef.current||!canvasRef.current) return;
    const v=videoRef.current, c=canvasRef.current;
    c.width=v.videoWidth; c.height=v.videoHeight;
    c.getContext("2d").drawImage(v,0,0);
    c.toBlob(async blob=>{
      if(!blob) return;
      const dataUrl=c.toDataURL("image/jpeg",0.92);
      setPreview(dataUrl);
      setImgData({data:dataUrl.split(",")[1], type:"image/jpeg"});
      setAnswer("");setAiSource("");
      stopCamera();
    },"image/jpeg",0.92);
  };

  const retake = () => {
    setPreview(null);setImgData(null);setAnswer("");setAiSource("");
    openCamera();
  };

  const onFile = async f=>{
    if(!f)return;
    stopCamera();
    setPreview(URL.createObjectURL(f));
    setImgData({data:await toBase64(f),type:f.type||"image/jpeg"});
    setAnswer("");setAiSource("");
  };

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
      <Card style={{background:`linear-gradient(135deg,${C.greenD}22,${C.card})`,borderColor:C.green+"44",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontSize:28}}>📸</div>
          <div>
            <div style={{fontWeight:900,fontSize:16,color:C.green}}>Snap & Solve</div>
            <div style={{fontSize:11,color:C.muted}}>Point at any question — AI solves with full marking scheme</div>
          </div>
        </div>
      </Card>

      <Card style={{padding:"10px 12px",marginBottom:8}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          <div><Label>Exam</Label><Sel value={exam} onChange={setExam} options={EXAMS} placeholder="Exam"/></div>
          <div><Label>Subject</Label><Sel value={subject} onChange={setSubject} options={SUBJECTS} placeholder="Auto"/></div>
          <div><Label>Year</Label><Sel value={year} onChange={setYear} options={YEARS} placeholder="Any"/></div>
        </div>
      </Card>

      {camMode&&!preview&&(
        <div style={{position:"relative",borderRadius:16,overflow:"hidden",marginBottom:10,background:"#000"}}>
          <video ref={videoRef} autoPlay playsInline muted style={{width:"100%",maxHeight:340,objectFit:"cover",display:"block"}}/>
          <canvas ref={canvasRef} style={{display:"none"}}/>
          <div style={{position:"absolute",inset:0,border:"2px solid "+C.green+"88",borderRadius:16,pointerEvents:"none"}}/>
          <div style={{position:"absolute",top:10,left:0,right:0,textAlign:"center",fontSize:11,color:"#fff",fontWeight:700,textShadow:"0 1px 4px rgba(0,0,0,0.8)"}}>📖 Aim at the question and tap capture</div>
          <div style={{position:"absolute",bottom:16,left:0,right:0,display:"flex",justifyContent:"center",gap:14}}>
            <button onClick={capturePhoto} style={{width:68,height:68,borderRadius:"50%",background:C.green,border:"4px solid #fff",fontSize:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(0,0,0,0.5)"}}>📷</button>
            <button onClick={()=>{stopCamera();fileRef.current.click();}} style={{width:44,height:44,borderRadius:"50%",background:C.card2,border:`2px solid ${C.border}`,fontSize:18,cursor:"pointer",alignSelf:"center"}}>🖼️</button>
          </div>
        </div>
      )}

      {preview&&(
        <div style={{position:"relative",marginBottom:10}}>
          <img src={preview} alt="" style={{width:"100%",maxHeight:280,borderRadius:14,objectFit:"contain",background:"#000"}}/>
          <button onClick={retake} style={{position:"absolute",top:10,right:10,background:C.card+"cc",border:`1px solid ${C.border}`,borderRadius:20,padding:"5px 12px",color:C.textLight,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>🔄 Retake</button>
        </div>
      )}

      {!camMode&&!preview&&(
        <div onClick={()=>fileRef.current.click()} style={{border:`2.5px dashed ${C.border}`,borderRadius:16,padding:32,textAlign:"center",cursor:"pointer",background:C.card,marginBottom:10}}>
          <div style={{fontSize:48,marginBottom:8}}>🖼️</div>
          <div style={{fontWeight:700,color:C.muted,fontSize:14}}>Tap to choose a photo</div>
          <div style={{fontSize:12,color:C.sub,marginTop:4}}>Camera unavailable — use gallery</div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>onFile(e.target.files[0])}/>

      {preview&&(
        <>
          <Card style={{padding:"10px 12px",marginBottom:8}}>
            <Label>Note (optional)</Label>
            <Inp value={note} onChange={setNote} placeholder="e.g. Show theorem used, WAEC 2022 Q3b"/>
          </Card>
          <Btn onClick={solve} loading={loading} color={C.green} tc="#fff">🔍 Solve with Full Marking Scheme</Btn>
        </>
      )}

      {answer&&(
        <>
          <Out text={answer} color={C.green} source={aiSource}/>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button onClick={()=>navigator.clipboard.writeText(answer)} style={{flex:1,background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 0",color:C.muted,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>📋 Copy</button>
            <button onClick={()=>{const t="📸 Solved by ExamAce AI!\n"+exam+" "+(year||"")+" "+(subject||"")+"\n\n"+answer.slice(0,350)+"...\n\n🏆 ExamAce AI 🇳🇬";if(navigator.share)navigator.share({title:"ExamAce AI",text:t});else navigator.clipboard.writeText(t);}} style={{flex:1,background:C.wa,borderRadius:10,padding:"10px 0",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>💬 Share</button>
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
// ── SPACED REPETITION REVIEW PANEL ────────────────────────────────────────
function ReviewPanel() {
  const [reviews] = useState(()=>getDueReviews());
  const [revealed,setRevealed]=useState(false);
  const [done,setDone]=useState([]);
  const pending=reviews.filter((_,i)=>!done.includes(i));

  if(!reviews.length) return(
    <Card style={{textAlign:"center",padding:40}}>
      <div style={{fontSize:48,marginBottom:12}}>🎉</div>
      <div style={{fontWeight:800,fontSize:16,color:C.textLight,marginBottom:6}}>No reviews due!</div>
      <div style={{fontSize:13,color:C.muted,lineHeight:1.7}}>Complete quizzes, get questions wrong, and they'll appear here for spaced review.</div>
      <div style={{marginTop:12,background:C.purple+"18",borderRadius:10,padding:"10px 14px",textAlign:"left"}}>
        <div style={{fontSize:12,color:C.purple,fontWeight:700}}>📅 How Spaced Repetition Works</div>
        <div style={{fontSize:12,color:C.muted,marginTop:4,lineHeight:1.7}}>Wrong answers return after 1 day → 3 days → 7 days → 14 days. Answer correctly to advance.</div>
      </div>
    </Card>
  );

  if(!pending.length) return(
    <Card style={{textAlign:"center",padding:32,background:`linear-gradient(135deg,${C.purple}22,${C.card})`,borderColor:C.purple+"44"}}>
      <div style={{fontSize:48,marginBottom:8}}>🏆</div>
      <div style={{fontWeight:800,fontSize:16,color:C.purple}}>All {reviews.length} reviews done!</div>
      <div style={{fontSize:12,color:C.muted,marginTop:6}}>Great work. Come back tomorrow for more.</div>
    </Card>
  );

  const item=pending[0];
  const q=item.question;
  return(
    <div>
      <Card style={{background:C.purple+"0a",borderColor:C.purple+"33"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <Label c={C.purple}>🔁 Spaced Review</Label>
          <span style={{fontSize:12,color:C.muted}}>{pending.length} remaining · {item.subject}</span>
        </div>
        {q.passage&&(
          <div style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:12,marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:800,color:C.gold,marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>📖 Passage</div>
            <div style={{fontSize:12,color:"#cbd5e1",lineHeight:1.8,fontStyle:"italic"}}>{q.passage}</div>
          </div>
        )}
        <div style={{fontSize:15,fontWeight:600,lineHeight:1.8,color:C.textLight,marginBottom:12}}>{q.q}</div>
        {!revealed?(
          <button onClick={()=>setRevealed(true)} style={{width:"100%",background:C.purple,border:"none",borderRadius:12,padding:"13px 0",color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>👁️ Reveal Answer</button>
        ):(
          <>
            <Card style={{background:C.green+"18",borderColor:C.green+"44"}}>
              <div style={{fontSize:12,fontWeight:800,color:C.green,marginBottom:4}}>✅ Correct Answer: {q.answer}</div>
              <div style={{fontSize:13,color:C.textLight,lineHeight:1.7}}><b>{q.options?.[q.answer]}</b> — {q.explanation}</div>
            </Card>
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <button onClick={()=>{clearReviewItem(q);setDone(d=>[...d,reviews.indexOf(item)]);setRevealed(false);}} style={{flex:1,background:C.green,border:"none",borderRadius:12,padding:"12px 0",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>✅ Got it!</button>
              <button onClick={()=>{scheduleReview(q,item.subject,item.exam);setDone(d=>[...d,reviews.indexOf(item)]);setRevealed(false);}} style={{flex:1,background:C.red+"22",border:`1px solid ${C.red}44`,borderRadius:12,padding:"12px 0",color:C.red,fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>❌ Still learning</button>
            </div>
          </>
        )}
      </Card>
      <div style={{background:C.border,borderRadius:4,height:5,marginBottom:4}}>
        <div style={{background:C.purple,height:"100%",borderRadius:4,width:`${((reviews.length-pending.length)/reviews.length)*100}%`,transition:"width .5s"}}/>
      </div>
      <div style={{fontSize:11,color:C.muted,textAlign:"center"}}>{reviews.length-pending.length}/{reviews.length} reviewed</div>
    </div>
  );
}

// ── WEAKNESS DRILL PANEL ───────────────────────────────────────────────────
function WeaknessPanel() {
  const weakTopics=getWeakTopics();
  const [drilling,setDrilling]=useState(null);
  const [drillQs,setDrillQs]=useState([]);
  const [drillCur,setDrillCur]=useState(0);
  const [drillSel,setDrillSel]=useState(null);
  const [drillAnswered,setDrillAnswered]=useState(false);
  const [drillScore,setDrillScore]=useState(0);
  const [loadingDrill,setLoadingDrill]=useState(false);

  const startDrill = async (topic) => {
    setLoadingDrill(true);
    setDrilling(topic);
    try {
      const {questions}=await fetchQuestions(topic.subject,"waec",null,10);
      const topicQs=questions.filter(q=>(q.topic||"").toLowerCase().includes(topic.topic.toLowerCase()));
      setDrillQs(topicQs.length>=4?topicQs:questions.slice(0,10));
    } catch { setDrillQs([]); }
    setDrillCur(0);setDrillSel(null);setDrillAnswered(false);setDrillScore(0);
    setLoadingDrill(false);
  };

  if(loadingDrill) return(
    <Card style={{textAlign:"center",padding:32}}>
      <div style={{fontSize:32,marginBottom:8}}>⏳</div>
      <div style={{color:C.muted}}>Loading drill questions for {drilling?.topic}...</div>
    </Card>
  );

  // Active drill screen
  if(drilling&&drillQs.length>0&&drillCur<drillQs.length){
    const q=drillQs[drillCur];
    return(
      <div>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
          <button onClick={()=>{setDrilling(null);setDrillQs([]);}} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 12px",color:C.muted,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
          <div style={{flex:1,fontSize:13,fontWeight:700,color:C.red}}>💪 {drilling.topic} · Q{drillCur+1}/{drillQs.length}</div>
          <span style={{fontSize:12,color:C.green,fontWeight:700}}>✅ {drillScore}</span>
        </div>
        <div style={{background:C.border,borderRadius:3,height:4,marginBottom:12}}>
          <div style={{background:C.red,height:"100%",borderRadius:3,width:`${(drillCur/drillQs.length)*100}%`,transition:"width .4s"}}/>
        </div>
        <Card style={{background:C.red+"11",borderColor:C.red+"33"}}>
          {q.passage&&<div style={{background:C.card2,borderRadius:8,padding:10,marginBottom:10,fontSize:12,color:"#cbd5e1",lineHeight:1.7,fontStyle:"italic"}}>{q.passage}</div>}
          <div style={{fontSize:15,fontWeight:600,lineHeight:1.8,color:C.textLight}}>{q.q}</div>
        </Card>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {["A","B","C","D"].map(l=>{
            const t=(q.options||{})[l]||"";
            if(!t)return null;
            const ok=l===q.answer,isSel=drillSel===l;
            let bg=C.card,border=C.border,color=C.textLight;
            if(drillAnswered){if(ok){bg=C.green+"22";border=C.green;color=C.green;}else if(isSel){bg=C.red+"22";border=C.red;color=C.red;}}
            else if(isSel){bg=C.blue+"18";border=C.blue;}
            return(
              <button key={l} onClick={()=>{
                if(drillAnswered)return;
                setDrillSel(l);setDrillAnswered(true);
                const correct=l===q.answer;
                if(correct){setDrillScore(s=>s+1);clearReviewItem(q);updateTopicStats(q.topic||drilling.topic,drilling.subject,true);}
                else{scheduleReview(q,drilling.subject,"waec");updateTopicStats(q.topic||drilling.topic,drilling.subject,false);}
              }} style={{background:bg,border:`2px solid ${border}`,borderRadius:12,padding:"12px 14px",color,fontSize:13,textAlign:"left",cursor:drillAnswered?"default":"pointer",display:"flex",gap:10,alignItems:"center",fontFamily:"inherit"}}>
                <span style={{width:26,height:26,borderRadius:"50%",background:drillAnswered&&ok?C.green:drillAnswered&&isSel?C.red:C.card2,color:drillAnswered&&(ok||isSel)?"#fff":C.muted,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,flexShrink:0}}>
                  {drillAnswered?(ok?"✓":isSel?"✗":l):l}
                </span>
                {t}
              </button>
            );
          })}
        </div>
        {drillAnswered&&(
          <div style={{marginTop:10}}>
            <Card style={{background:drillSel===q.answer?C.green+"18":C.red+"18",borderColor:drillSel===q.answer?C.green:C.red}}>
              <div style={{fontWeight:700,color:drillSel===q.answer?C.green:C.red,marginBottom:4}}>
                {drillSel===q.answer?"✅ Correct!":"❌ Wrong — Correct: "+q.answer}
              </div>
              <div style={{fontSize:12,color:C.textLight,lineHeight:1.6}}>{q.explanation}</div>
            </Card>
            <button onClick={()=>{
              if(drillCur+1>=drillQs.length){setDrilling(null);setDrillQs([]);}
              else{setDrillCur(c=>c+1);setDrillSel(null);setDrillAnswered(false);}
            }} style={{width:"100%",background:C.red,border:"none",borderRadius:12,padding:"13px 0",color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit",marginTop:8}}>
              {drillCur+1>=drillQs.length?"🏁 Finish Drill":"Next →"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Drill finished
  if(drilling&&drillCur>=drillQs.length) return(
    <Card style={{textAlign:"center",padding:32,background:`linear-gradient(135deg,${C.green}22,${C.card})`,borderColor:C.green+"44"}}>
      <div style={{fontSize:48,marginBottom:8}}>🎯</div>
      <div style={{fontWeight:800,fontSize:16,color:C.green}}>Drill complete!</div>
      <div style={{fontSize:13,color:C.muted,marginTop:4}}>{drillScore}/{drillQs.length} correct on {drilling.topic}</div>
      <button onClick={()=>{setDrilling(null);setDrillQs([]);}} style={{marginTop:16,background:C.green,border:"none",borderRadius:12,padding:"12px 24px",color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>← Back to Topics</button>
    </Card>
  );

  // Topic list
  return(
    <div>
      <Card style={{background:C.red+"0a",borderColor:C.red+"33"}}>
        <Label c={C.red}>💪 Weak Topics — Targeted Drill</Label>
        <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>Topics where you've scored below 50% in at least 3 questions. Tap Drill to focus practice.</div>
      </Card>
      {!weakTopics.length?(
        <Card style={{textAlign:"center",padding:32}}>
          <div style={{fontSize:40,marginBottom:8}}>📊</div>
          <div style={{fontWeight:700,color:C.textLight,marginBottom:4}}>No weak topics yet</div>
          <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>Complete quizzes on multiple topics to see your weak areas appear here.</div>
        </Card>
      ):weakTopics.map((t,i)=>(
        <Card key={i} style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:14,color:C.textLight,marginBottom:2}}>{t.topic}</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:6}}>{t.subject} · {t.total} questions attempted</div>
            <div style={{background:C.border,borderRadius:4,height:6}}>
              <div style={{background:t.pct<30?C.red:C.orange,height:"100%",borderRadius:4,width:t.pct+"%",transition:"width 1s"}}/>
            </div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontWeight:900,fontSize:20,color:t.pct<30?C.red:C.orange}}>{t.pct}%</div>
            <div style={{fontSize:10,color:C.muted,marginBottom:4}}>{t.total} attempts</div>
            <button onClick={()=>startDrill(t)} style={{background:C.red,border:"none",borderRadius:8,padding:"7px 16px",color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Drill →</button>
          </div>
        </Card>
      ))}
    </div>
  );
}

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

  const dueCount  = getDueReviews().length;
  const weakCount = getWeakTopics().length;

  // Only tools that directly improve exam performance — nothing decorative
  const TOOLS=[
    {
      id:"review", icon:"🔁", label:"Review Wrong Answers",
      desc: dueCount>0 ? `${dueCount} question${dueCount>1?"s":""} due for review today` : "No reviews due — check back after your next quiz",
      color:C.purple, badge:dueCount,
      detail:"Questions you got wrong come back after 1, 3, 7 and 14 days so you never forget them",
    },
    {
      id:"weakness", icon:"💪", label:"Drill Weak Topics",
      desc: weakCount>0 ? `${weakCount} topic${weakCount>1?"s":""} below 50% accuracy — tap to drill` : "Complete more quizzes to discover your weak areas",
      color:C.red, badge:weakCount,
      detail:"Focused practice on topics where you score below 50% — fastest way to improve",
    },
    {
      id:"focusareas", icon:"🎯", label:"What to Focus On",
      desc:"AI identifies the highest-frequency topics for your exam and subject",
      color:C.orange,
      detail:"Know exactly what to study — AI analyses past WAEC/JAMB papers and tells you which topics appear most",
    },
    {
      id:"keypoints", icon:"📌", label:"Key Points Summary",
      desc:"Quick revision notes for any topic — perfect for the night before",
      color:C.gold,
      detail:"AI generates concise bullet-point revision notes tailored to WAEC/NECO/JAMB syllabus",
    },
    {
      id:"mnemonics", icon:"🧠", label:"Memory Tricks",
      desc:"Tricks and shortcuts to remember difficult topics and formulas",
      color:C.pink,
      detail:"AI creates memorable acronyms, rhymes and visual tricks specific to Nigerian exam topics",
    },
  ];
  const at=TOOLS.find(t=>t.id===sub);

  return (
    <div>
      {/* Tool header */}
      {!sub&&(
        <Card style={{background:C.card2,marginBottom:12}}>
          <div style={{fontWeight:800,fontSize:15,color:C.textLight,marginBottom:4}}>🛠️ Study Tools</div>
          <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>Five tools that directly improve your exam performance. Tap any tool to get started.</div>
        </Card>
      )}

      {/* Tool list — card style, not icon grid */}
      {!sub&&(
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:4}}>
          {TOOLS.map(t=>(
            <button key={t.id} onClick={()=>{setSub(t.id);setOut("");setAiSource("");}}
              style={{background:C.card,border:`1px solid ${t.badge>0?t.color+"55":C.border}`,borderRadius:14,padding:"14px 16px",textAlign:"left",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:12,width:"100%",transition:"border-color .2s"}}>
              <div style={{width:44,height:44,background:t.color+"18",border:`1px solid ${t.color}33`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,position:"relative"}}>
                {t.icon}
                {t.badge>0&&<span style={{position:"absolute",top:-5,right:-5,background:t.color,color:"#fff",borderRadius:"50%",width:17,height:17,fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>{t.badge>9?"9+":t.badge}</span>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14,color:t.badge>0?t.color:C.textLight,marginBottom:3}}>{t.label}</div>
                <div style={{fontSize:12,color:C.muted,lineHeight:1.5}}>{t.desc}</div>
              </div>
              <div style={{fontSize:16,color:C.muted,flexShrink:0}}>→</div>
            </button>
          ))}
        </div>
      )}

      {/* Active tool — show back button */}
      {sub&&(
        <button onClick={()=>{setSub("");setOut("");}} style={{background:"transparent",border:"none",color:C.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit",padding:"0 0 12px 0",display:"flex",alignItems:"center",gap:4}}>
          ← Back to tools
        </button>
      )}

      {/* ── TOOL CONTENT ─────────────────────────────────────────────── */}

      {/* Focus areas, Key points, Mnemonics — need subject/topic selectors */}
      {["focusareas","keypoints","mnemonics"].includes(sub)&&(
        <Card>
          {/* What this tool does — plain English for any ICT level */}
          <div style={{background:at?.color+"11",borderRadius:10,padding:"10px 12px",marginBottom:12}}>
            <div style={{fontSize:12,color:at?.color,fontWeight:700,marginBottom:2}}>{at?.icon} {at?.label}</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{at?.detail}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            <div><Label>Your exam</Label><Sel value={exam} onChange={setExam} options={EXAMS} placeholder="Select exam"/></div>
            <div><Label>Your subject</Label><Sel value={subject} onChange={setSubject} options={SUBJECTS} placeholder="Select subject"/></div>
          </div>
          {subject&&SYLLABUS[subject]&&(
            <div style={{marginTop:4}}>
              <Label>Topic <span style={{color:C.sub,fontWeight:400}}>(optional — leave blank for full subject)</span></Label>
              <Pills options={SYLLABUS[subject]} value={topic} onChange={v=>setTopic(topic===v?"":v)} color={at?.color}/>
            </div>
          )}
          {subject&&JAMB_HOT_TOPICS[subject]&&sub==="focusareas"&&(
            <div style={{marginTop:10,background:C.red+"11",borderRadius:8,padding:"10px 12px"}}>
              <div style={{fontSize:11,color:C.red,fontWeight:800,marginBottom:4}}>🔥 High-frequency {exam} {subject} topics:</div>
              {JAMB_HOT_TOPICS[subject].slice(0,5).map((t,i)=><div key={i} style={{fontSize:12,color:C.muted,lineHeight:1.7}}>• {t}</div>)}
            </div>
          )}
          <div style={{marginTop:12}}>
            <Btn onClick={run} loading={loading} color={at?.color||C.gold} tc="#fff">
              {loading?"Generating...":at?.icon+" Generate "+at?.label}
            </Btn>
          </div>
        </Card>
      )}

      {/* Spaced repetition reviews */}
      {sub==="review"&&<ReviewPanel/>}

      {/* Weakness drill */}
      {sub==="weakness"&&<WeaknessPanel/>}

      {/* AI output */}
      {out&&["focusareas","keypoints","mnemonics"].includes(sub)&&(
        <>
          <Out text={out} color={at?.color||C.gold} source={aiSource}/>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button onClick={()=>navigator.clipboard.writeText(out)} style={{flex:1,background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 0",color:C.muted,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>📋 Copy Notes</button>
            <button onClick={()=>{const t="🏆 ExamAce AI — "+at?.label+"\n"+exam+" "+subject+" "+(year||"")+"\n\n"+out.slice(0,400)+"...\n\nExamAce AI 🇳🇬";if(navigator.share)navigator.share({title:"ExamAce AI",text:t});else navigator.clipboard.writeText(t);}} style={{flex:1,background:C.wa,borderRadius:10,padding:"10px 0",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>💬 Share</button>
          </div>
        </>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// XP TOAST — floats up when XP is earned
// ═══════════════════════════════════════════════════════════════════════════
function XPToast({ events, onClear }) {
  useEffect(()=>{ if(events.length>0){ const t=setTimeout(onClear, 3500); return()=>clearTimeout(t); } },[events]);
  if(!events.length) return null;
  return(
    <div style={{position:"fixed",top:70,right:12,zIndex:999,display:"flex",flexDirection:"column",gap:6,pointerEvents:"none"}}>
      {events.slice(0,4).map((e,i)=>(
        <div key={i} style={{background:e.type==="achievement"?C.purple:C.gold,color:"#000",borderRadius:12,padding:"8px 14px",fontWeight:800,fontSize:13,boxShadow:"0 4px 20px rgba(0,0,0,0.4)",animation:"slideIn .4s ease",display:"flex",alignItems:"center",gap:8}}>
          {e.type==="achievement"?<span style={{fontSize:18}}>{e.icon}</span>:<span>+{e.xp} XP</span>}
          {e.type==="achievement"?<span style={{color:"#fff"}}>{e.name} unlocked!</span>:<span>{e.reason}</span>}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LEVEL BADGE
// ═══════════════════════════════════════════════════════════════════════════
function LevelBadge({ user, compact=false }) {
  if(!user) return null;
  const lvl = getLevelClient(user.xp||0);
  if(compact) return(
    <div style={{display:"flex",alignItems:"center",gap:5,background:lvl.color+"22",border:`1px solid ${lvl.color}44`,borderRadius:20,padding:"3px 10px"}}>
      <span style={{fontSize:14}}>{lvl.badge}</span>
      <span style={{fontSize:11,fontWeight:800,color:lvl.color}}>{lvl.name}</span>
      <span style={{fontSize:10,color:C.muted}}>·</span>
      <span style={{fontSize:11,fontWeight:700,color:C.muted}}>{user.xp||0} XP</span>
    </div>
  );
  return(
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:14}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <div style={{width:44,height:44,background:lvl.color+"22",border:`2px solid ${lvl.color}`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{lvl.badge}</div>
        <div>
          <div style={{fontWeight:800,fontSize:15,color:lvl.color}}>{lvl.name}</div>
          <div style={{fontSize:12,color:C.muted}}>Level {lvl.level} · {user.xp||0} XP total</div>
        </div>
      </div>
      <div style={{background:C.border,borderRadius:6,height:8,overflow:"hidden"}}>
        <div style={{background:lvl.color,height:"100%",width:lvl.progress+"%",borderRadius:6,transition:"width 1s ease"}}/>
      </div>
      {lvl.nextXP&&<div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:10,color:C.muted}}><span>{user.xp||0} XP</span><span>{lvl.xpToNext} XP to Level {lvl.level+1}</span></div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH SCREEN — Login & Register
// ═══════════════════════════════════════════════════════════════════════════
function AuthScreen({ onAuth }) {
  const [mode,setMode]  = useState("login");
  const [name,setName]  = useState("");
  const [email,setEmail]= useState("");
  const [pass,setPass]  = useState("");
  const [exam,setExam]  = useState("WAEC");
  const [state,setSt]   = useState("");
  const [subs,setSubs]  = useState([]);
  const [loading,setLoading]=useState(false);
  const [err,setErr]    = useState("");

  const toggleSub = (s) => setSubs(prev => prev.includes(s)?prev.filter(x=>x!==s):[...prev,s]);

  const submit = async () => {
    setErr(""); setLoading(true);
    try {
      const path = mode==="login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode==="login" ? {email,password:pass} : {name,email,password:pass,exam,state,subjects:subs};
      const data = await apiCall(path,"POST",body);
      saveAuth(data.token, data.user);
      onAuth(data.user, data.newlyEarned||[]);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:420}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:68,height:68,background:`linear-gradient(135deg,${C.gold},${C.goldD})`,borderRadius:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,margin:"0 auto 12px",boxShadow:`0 0 30px ${C.gold}44`}}>🏆</div>
          <div style={{fontWeight:900,fontSize:26,color:C.textLight}}>ExamAce <span style={{color:C.gold}}>AI</span></div>
          <div style={{fontSize:12,color:C.muted,marginTop:4}}>Nigeria's #1 WAEC · NECO · JAMB Tutor</div>
        </div>

        <Card>
          {/* Mode toggle */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:20}}>
            {[["login","Sign In"],["register","Create Account"]].map(([m,l])=>(
              <button key={m} onClick={()=>{setMode(m);setErr("");}} style={{background:mode===m?C.gold:"transparent",border:`1.5px solid ${mode===m?C.gold:C.border}`,borderRadius:10,padding:"10px 0",color:mode===m?"#000":C.muted,fontWeight:mode===m?800:400,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
            ))}
          </div>

          {err&&<div style={{background:C.red+"18",border:`1px solid ${C.red}33`,borderRadius:10,padding:"10px 12px",color:C.red,fontSize:13,marginBottom:14,fontWeight:600}}>⚠️ {err}</div>}

          {mode==="register"&&(
            <div style={{marginBottom:12}}>
              <Label>Full Name</Label>
              <Inp value={name} onChange={setName} placeholder="e.g. Chukwuemeka Obi"/>
            </div>
          )}

          <div style={{marginBottom:12}}>
            <Label>Email Address</Label>
            <Inp value={email} onChange={setEmail} placeholder="your@email.com" type="email"/>
          </div>

          <div style={{marginBottom:mode==="register"?12:20}}>
            <Label>Password</Label>
            <Inp value={pass} onChange={setPass} placeholder={mode==="register"?"At least 6 characters":"Your password"} type="password"/>
          </div>

          {mode==="register"&&(
            <>
              <div style={{marginBottom:12}}>
                <Label>Target Exam</Label>
                <Pills options={["WAEC","NECO","JAMB"]} value={exam} onChange={setExam} color={C.gold}/>
              </div>
              <div style={{marginBottom:12}}>
                <Label>State of Origin</Label>
                <Sel value={state} onChange={setSt} options={NIGERIA_STATES} placeholder="Select state"/>
              </div>
              <div style={{marginBottom:20}}>
                <Label>Your Subjects (select all you're taking)</Label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {["Mathematics","English Language","Physics","Chemistry","Biology","Economics","Government","Literature in English","Geography","Agricultural Science","Accounting","Commerce"].map(s=>(
                    <button key={s} onClick={()=>toggleSub(s)} style={{background:subs.includes(s)?C.gold+"28":"transparent",border:`1.5px solid ${subs.includes(s)?C.gold:C.border}`,borderRadius:20,padding:"5px 12px",color:subs.includes(s)?C.gold:C.muted,fontWeight:subs.includes(s)?800:400,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{s.split(" ")[0]}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          <Btn onClick={submit} loading={loading} color={C.gold}>
            {mode==="login"?"🚀 Sign In":"🎉 Create My Account"}
          </Btn>

          {mode==="login"&&(
            <div style={{textAlign:"center",marginTop:14,fontSize:12,color:C.muted}}>
              No account? <button onClick={()=>setMode("register")} style={{background:"none",border:"none",color:C.gold,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:12}}>Create one free →</button>
            </div>
          )}
        </Card>

        <div style={{textAlign:"center",marginTop:16,fontSize:11,color:C.sub,lineHeight:1.7}}>
          🔒 Your data stays private · 🇳🇬 Made for Nigerian students
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE SCREEN
// ═══════════════════════════════════════════════════════════════════════════
function ProfileScreen({ user, onClose, onLogout, onUpdate }) {
  const [tab,setTab]     = useState("stats");
  const [history,setHistory]=useState([]);
  const [leaderboard,setLeaderboard]=useState([]);
  const [loadingH,setLoadingH]=useState(false);
  const [editMode,setEditMode]=useState(false);
  const [editName,setEditName]=useState(user.name||"");
  const [editExam,setEditExam]=useState(user.exam||"WAEC");
  const [editState,setEditState]=useState(user.state||"");
  const [saving,setSaving]=useState(false);

  const lvl = getLevelClient(user.xp||0);
  const stats = user.stats||{};
  const accuracy = stats.totalAnswered>0 ? Math.round((stats.totalCorrect/stats.totalAnswered)*100) : 0;

  useEffect(()=>{
    if(tab==="history" && !history.length){
      setLoadingH(true);
      apiCall("/api/progress/history?limit=50").then(d=>setHistory(d.history||[])).catch(()=>{}).finally(()=>setLoadingH(false));
    }
    if(tab==="leaderboard" && !leaderboard.length){
      apiCall("/api/leaderboard").then(d=>setLeaderboard(d.board||[])).catch(()=>{});
    }
  },[tab]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await apiCall("/api/profile","PUT",{name:editName,exam:editExam,state:editState});
      onUpdate({...user,name:editName,exam:editExam,state:editState});
      setEditMode(false);
    } catch(e){alert(e.message);}
    setSaving(false);
  };

  const quizHistory = history.filter(h=>h.type==="quiz");
  const cbtHistory  = history.filter(h=>h.type==="cbt");

  return(
    <div style={{position:"fixed",inset:0,background:C.bg,zIndex:300,overflowY:"auto",paddingBottom:40}}>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${lvl.color}22,#0a0c14)`,borderBottom:`1px solid ${C.border}`,padding:"14px 16px",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onClose} style={{background:C.card2,border:`1px solid ${C.border}`,color:C.muted,borderRadius:10,padding:"7px 14px",cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:700}}>← Back</button>
          <div style={{flex:1}}>
            <div style={{fontWeight:900,fontSize:17,color:C.textLight}}>👤 My Profile</div>
            <div style={{fontSize:11,color:C.muted}}>{user.email}</div>
          </div>
          <button onClick={onLogout} style={{background:C.red+"22",border:`1px solid ${C.red}33`,color:C.red,borderRadius:10,padding:"7px 12px",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:700}}>Sign Out</button>
        </div>
      </div>

      <div style={{padding:"16px 14px 0"}}>
        {/* Profile card */}
        <Card style={{background:`linear-gradient(135deg,${lvl.color}18,${C.card})`,borderColor:lvl.color+"44"}}>
          <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:14}}>
            <div style={{width:56,height:56,background:lvl.color+"22",border:`2px solid ${lvl.color}`,borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,flexShrink:0}}>{lvl.badge}</div>
            <div style={{flex:1}}>
              {editMode?(
                <input value={editName} onChange={e=>setEditName(e.target.value)} style={{background:C.card2,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"6px 10px",color:C.textLight,fontSize:15,fontWeight:800,fontFamily:"inherit",width:"100%",marginBottom:4}}/>
              ):(
                <div style={{fontWeight:900,fontSize:18,color:C.textLight,marginBottom:2}}>{user.name}</div>
              )}
              <div style={{fontSize:12,color:lvl.color,fontWeight:700}}>{lvl.badge} {lvl.name} · Level {lvl.level}</div>
              <div style={{fontSize:11,color:C.muted}}>{user.state||""} {user.exam} Candidate</div>
            </div>
            {editMode?(
              <div style={{display:"flex",gap:6}}>
                <button onClick={saveProfile} disabled={saving} style={{background:C.green,border:"none",borderRadius:8,padding:"7px 12px",color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{saving?"...":"Save"}</button>
                <button onClick={()=>setEditMode(false)} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 12px",color:C.muted,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              </div>
            ):(
              <button onClick={()=>setEditMode(true)} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 12px",color:C.muted,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✏️ Edit</button>
            )}
          </div>
          {editMode&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              <div><Label>Exam</Label><Sel value={editExam} onChange={setEditExam} options={["WAEC","NECO","JAMB"]} placeholder="Exam"/></div>
              <div><Label>State</Label><Sel value={editState} onChange={setEditState} options={NIGERIA_STATES} placeholder="State"/></div>
            </div>
          )}
          {/* XP bar */}
          <div style={{background:C.border,borderRadius:6,height:10,overflow:"hidden",marginBottom:4}}>
            <div style={{background:lvl.color,height:"100%",width:lvl.progress+"%",borderRadius:6,transition:"width 1.5s ease"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted}}>
            <span>{user.xp||0} XP</span>
            {lvl.nextXP?<span>{lvl.xpToNext} XP to {LEVELS_CLIENT[lvl.level]?.name||"Max"}</span>:<span>Max level reached! 💎</span>}
          </div>
        </Card>

        {/* Quick stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
          {[
            ["🔥",user.currentStreak||0,"Day Streak",C.orange],
            ["📝",stats.quizzesCompleted||0,"Quizzes",C.blue],
            ["🖥️",stats.cbtCompleted||0,"CBT Tests",C.purple],
            ["💯",accuracy+"%","Accuracy",C.green],
          ].map(([icon,val,label,color])=>(
            <div key={label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 8px",textAlign:"center"}}>
              <div style={{fontSize:16,marginBottom:2}}>{icon}</div>
              <div style={{fontWeight:900,fontSize:16,color}}>{val}</div>
              <div style={{fontSize:9,color:C.muted,marginTop:2}}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto"}}>
          {[["stats","📊 Stats"],["achievements","🏆 Badges"],["history","📋 History"],["leaderboard","🥇 Leaderboard"]].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{background:tab===t?C.gold+"22":"transparent",border:`1px solid ${tab===t?C.gold:C.border}`,borderRadius:20,padding:"6px 14px",color:tab===t?C.gold:C.muted,fontWeight:tab===t?800:400,fontSize:11,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0}}>{l}</button>
          ))}
        </div>

        {/* Stats tab */}
        {tab==="stats"&&(
          <>
            <Card>
              <Label c={C.gold}>📊 Study Statistics</Label>
              {[
                ["Total Questions Answered", stats.totalAnswered||0],
                ["Total Correct Answers",    stats.totalCorrect||0],
                ["Overall Accuracy",         accuracy+"%"],
                ["Quizzes Completed",         stats.quizzesCompleted||0],
                ["JAMB CBT Mocks",            stats.cbtCompleted||0],
                ["Best JAMB Score",           (stats.bestJAMB||0)+"/400"],
                ["Longest Streak",            (stats.longestStreak||0)+" days"],
                ["Total Study Days",          (user.totalStudyDays||0)+" days"],
                ["Reviews Completed",         stats.reviewsCompleted||0],
                ["Subjects Practiced",        Object.keys(stats.subjectsPracticed||{}).length],
              ].map(([label,val])=>(
                <div key={label} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontSize:13,color:C.muted}}>{label}</span>
                  <span style={{fontSize:13,fontWeight:800,color:C.textLight}}>{val}</span>
                </div>
              ))}
            </Card>
            {Object.keys(stats.subjectsPracticed||{}).length>0&&(
              <Card>
                <Label c={C.sky}>Subjects Practiced</Label>
                {Object.entries(stats.subjectsPracticed||{}).sort((a,b)=>b[1]-a[1]).map(([subj,count])=>(
                  <div key={subj} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}`,alignItems:"center"}}>
                    <span style={{fontSize:13,color:C.textLight}}>{subj}</span>
                    <span style={{background:C.blue+"22",color:C.sky,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>{count} sessions</span>
                  </div>
                ))}
              </Card>
            )}
          </>
        )}

        {/* Achievements tab */}
        {tab==="achievements"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {ACHIEVEMENTS_CLIENT.map(a=>{
              const earned=(user.achievements||[]).includes(a.id);
              return(
                <div key={a.id} style={{background:earned?C.card:C.card2,border:`1px solid ${earned?C.gold+"44":C.border}`,borderRadius:14,padding:14,opacity:earned?1:0.5,transition:"all .3s"}}>
                  <div style={{fontSize:28,marginBottom:6}}>{earned?a.icon:"🔒"}</div>
                  <div style={{fontSize:13,fontWeight:800,color:earned?C.gold:C.muted,marginBottom:3}}>{a.name}</div>
                  <div style={{fontSize:11,color:C.sub,lineHeight:1.5}}>{a.desc}</div>
                  {earned&&<div style={{marginTop:6,fontSize:10,color:C.green,fontWeight:700}}>✅ Earned!</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* History tab */}
        {tab==="history"&&(
          <>
            {loadingH?<Card style={{textAlign:"center",padding:32}}><div style={{color:C.muted}}>Loading history...</div></Card>:
            !history.length?<Card style={{textAlign:"center",padding:32}}><div style={{fontSize:32,marginBottom:8}}>📋</div><div style={{color:C.muted}}>No study sessions yet</div></Card>:
            <>
              <Card>
                <Label>All Sessions ({history.length})</Label>
                {history.map((h,i)=>{
                  const grade=h.type==="quiz"?gradeFromPct(h.pct||0):null;
                  return(
                    <div key={i} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`,alignItems:"center"}}>
                      <div style={{width:36,height:36,background:h.type==="cbt"?C.purple+"22":C.blue+"22",border:`1px solid ${h.type==="cbt"?C.purple:C.blue}33`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{h.type==="cbt"?"🖥️":"📝"}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.textLight,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.type==="cbt"?"JAMB CBT Mock":`${h.exam||""} ${h.subject||""}`}</div>
                        <div style={{fontSize:11,color:C.muted}}>{h.type==="quiz"&&`${h.qtype==="year"?h.year||"":"Random"} · `}{new Date(h.ts).toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"})}</div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        {h.type==="cbt"?<div style={{fontWeight:900,fontSize:15,color:C.purple}}>{h.jambScore}<span style={{fontSize:10,color:C.muted}}>/400</span></div>:<div style={{fontWeight:900,fontSize:15,color:grade?.c||C.muted}}>{h.pct}%</div>}
                        {grade&&<div style={{fontSize:10,color:grade.c}}>Grade {grade.g}</div>}
                        {h.xpEarned>0&&<div style={{fontSize:10,color:C.gold}}>+{h.xpEarned} XP</div>}
                      </div>
                    </div>
                  );
                })}
              </Card>
              <a href={`https://wa.me/?text=${encodeURIComponent(`📊 My ExamAce AI Progress\n🔥 Streak: ${user.currentStreak||0} days\n⭐ Level: ${lvl.name}\n📝 Quizzes: ${stats.quizzesCompleted||0}\n💯 Accuracy: ${accuracy}%\n\nExamAce AI 🇳🇬`)}`} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:C.wa,borderRadius:13,padding:"14px 0",color:"#fff",fontWeight:800,fontSize:14,textDecoration:"none"}}>💬 Share Progress on WhatsApp</a>
            </>}
          </>
        )}

        {/* Leaderboard tab */}
        {tab==="leaderboard"&&(
          <Card>
            <Label c={C.gold}>🥇 Top Students</Label>
            {!leaderboard.length?<div style={{textAlign:"center",color:C.muted,padding:20}}>Loading...</div>:
            leaderboard.map((entry,i)=>{
              const entryLvl=getLevelClient(entry.xp||0);
              const isMe = entry.name===user.name;
              return(
                <div key={i} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`,alignItems:"center",background:isMe?C.gold+"0a":"transparent",borderRadius:isMe?8:0,paddingInline:isMe?8:0}}>
                  <div style={{width:28,fontWeight:900,fontSize:i<3?18:13,color:i===0?C.gold:i===1?"#94a3b8":i===2?C.orange:C.muted,flexShrink:0,textAlign:"center"}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</div>
                  <div style={{fontSize:22,flexShrink:0}}>{entryLvl.badge}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:isMe?C.gold:C.textLight}}>{entry.name}{isMe?" (You)":""}</div>
                    <div style={{fontSize:11,color:C.muted}}>{entryLvl.name} · {entry.stats?.totalAnswered||0} questions</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontWeight:900,fontSize:14,color:entryLvl.color}}>{entry.xp} XP</div>
                    {entry.currentStreak>0&&<div style={{fontSize:10,color:C.orange}}>🔥{entry.currentStreak}d</div>}
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PRACTICE HUB — Quiz + CBT merged into one tab
// ═══════════════════════════════════════════════════════════════════════════
function PracticeHub({ onSaveHistory }) {
  const [mode,setMode] = useState("home"); // home | quiz | cbt

  if(mode==="quiz") return <div><button onClick={()=>setMode("home")} style={{background:"transparent",border:"none",color:"#94a3b8",fontSize:13,cursor:"pointer",fontFamily:"inherit",padding:"0 0 12px 0",display:"flex",alignItems:"center",gap:6}}>← Back</button><Quiz onSaveHistory={onSaveHistory}/></div>;
  if(mode==="cbt")  return <div><button onClick={()=>setMode("home")} style={{background:"transparent",border:"none",color:"#94a3b8",fontSize:13,cursor:"pointer",fontFamily:"inherit",padding:"0 0 12px 0",display:"flex",alignItems:"center",gap:6}}>← Back</button><JambCBT onSaveHistory={onSaveHistory}/></div>;

  const dueReviews = getDueReviews().length;
  const weakTopics = getWeakTopics().length;

  return(
    <div>
      <div style={{marginBottom:16}}>
        <div style={{fontWeight:900,fontSize:18,color:"#f1f5f9",marginBottom:2}}>Practice</div>
        <div style={{fontSize:12,color:"#94a3b8"}}>Real past questions from ALOC · WAEC · NECO · JAMB</div>
      </div>

      {/* Primary options */}
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
        <button onClick={()=>setMode("quiz")} style={{background:"#13151f",border:"1px solid #252838",borderRadius:16,padding:"18px 16px",textAlign:"left",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:48,height:48,background:"#3b82f622",border:"1px solid #3b82f633",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>📝</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,fontSize:15,color:"#f1f5f9",marginBottom:3}}>Past Questions Quiz</div>
            <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.5}}>Practice by subject · Filter by year · WAEC/NECO/JAMB</div>
          </div>
          <div style={{fontSize:18,color:"#94a3b8"}}>→</div>
        </button>

        <button onClick={()=>setMode("cbt")} style={{background:"#13151f",border:"1px solid #252838",borderRadius:16,padding:"18px 16px",textAlign:"left",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:48,height:48,background:"#a855f722",border:"1px solid #a855f733",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>🖥️</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,fontSize:15,color:"#f1f5f9",marginBottom:3}}>JAMB CBT Mock Exam</div>
            <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.5}}>180 questions · 4 subjects · 2 hours · Timed</div>
          </div>
          <div style={{fontSize:18,color:"#94a3b8"}}>→</div>
        </button>
      </div>

      {/* Secondary tools */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {dueReviews>0&&(
          <button onClick={()=>setMode("quiz")} style={{background:"#a855f711",border:"1px solid #a855f733",borderRadius:14,padding:"14px 12px",textAlign:"left",cursor:"pointer",fontFamily:"inherit"}}>
            <div style={{fontSize:20,marginBottom:6}}>🔁</div>
            <div style={{fontSize:13,fontWeight:700,color:"#a855f7",marginBottom:2}}>{dueReviews} Due Reviews</div>
            <div style={{fontSize:11,color:"#94a3b8"}}>Spaced repetition</div>
          </button>
        )}
        {weakTopics>0&&(
          <button onClick={()=>setMode("quiz")} style={{background:"#ef444411",border:"1px solid #ef444433",borderRadius:14,padding:"14px 12px",textAlign:"left",cursor:"pointer",fontFamily:"inherit"}}>
            <div style={{fontSize:20,marginBottom:6}}>💪</div>
            <div style={{fontSize:13,fontWeight:700,color:"#ef4444",marginBottom:2}}>{weakTopics} Weak Topics</div>
            <div style={{fontSize:11,color:"#94a3b8"}}>Targeted drill</div>
          </button>
        )}
        <button onClick={()=>setMode("quiz")} style={{background:"#13151f",border:"1px solid #252838",borderRadius:14,padding:"14px 12px",textAlign:"left",cursor:"pointer",fontFamily:"inherit"}}>
          <div style={{fontSize:20,marginBottom:6}}>📸</div>
          <div style={{fontSize:13,fontWeight:700,color:"#22c55e",marginBottom:2}}>Snap & Solve</div>
          <div style={{fontSize:11,color:"#94a3b8"}}>Photo any question</div>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LEARN HUB — Deep Learning + Study Tools + Career
// ═══════════════════════════════════════════════════════════════════════════
function LearnHub({ user }) {
  const [mode,setMode] = useState("home"); // home | deeplearn | studytools

  if(mode==="deeplearn")  return(
    <div>
      <button onClick={()=>setMode("home")} style={{background:"transparent",border:"none",color:C.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit",padding:"0 0 14px 0",display:"flex",alignItems:"center",gap:6}}>
        ← Back to Learn
      </button>
      <DeepLearnMode/>
    </div>
  );
  if(mode==="studytools") return(
    <div>
      <button onClick={()=>setMode("home")} style={{background:"transparent",border:"none",color:C.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit",padding:"0 0 14px 0",display:"flex",alignItems:"center",gap:6}}>
        ← Back to Learn
      </button>
      <StudyTools/>
    </div>
  );

  const dueReviews = getDueReviews().length;
  const weakTopics = getWeakTopics().length;
  const lvl = getLevelClient(user?.xp||0);

  return(
    <div>
      {/* Header */}
      <div style={{marginBottom:20}}>
        <div style={{fontWeight:900,fontSize:20,color:C.textLight,marginBottom:2}}>Learn 🎓</div>
        <div style={{fontSize:12,color:C.muted}}>AI teacher · Study tools · Performance tracking</div>
      </div>

      {/* Deep Learning — primary card, most prominent */}
      <button onClick={()=>setMode("deeplearn")} style={{width:"100%",background:`linear-gradient(135deg,${C.purple}22,${C.card})`,border:`1.5px solid ${C.purple}44`,borderRadius:18,padding:"20px 18px",textAlign:"left",cursor:"pointer",fontFamily:"inherit",marginBottom:10,display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:52,height:52,background:C.purple+"33",border:`1px solid ${C.purple}55`,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>🎓</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:900,fontSize:16,color:C.purple,marginBottom:3}}>Deep Learning Mode</div>
          <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>AI teaches you any topic — explanation, worked example, quiz. Like having a private tutor.</div>
          <div style={{marginTop:6,fontSize:11,color:C.purple,fontWeight:700}}>TAP TO START A LESSON →</div>
        </div>
      </button>

      {/* Study Tools — show alert if reviews are due */}
      <button onClick={()=>setMode("studytools")} style={{width:"100%",background:C.card,border:`1px solid ${dueReviews>0?C.gold+"66":C.border}`,borderRadius:16,padding:"16px 18px",textAlign:"left",cursor:"pointer",fontFamily:"inherit",marginBottom:10,display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:48,height:48,background:C.gold+"22",border:`1px solid ${C.gold}33`,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0,position:"relative"}}>
          📚
          {dueReviews>0&&<span style={{position:"absolute",top:-4,right:-4,background:C.purple,color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>{dueReviews>9?"9+":dueReviews}</span>}
        </div>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:15,color:C.textLight,marginBottom:2}}>Study Tools</div>
          <div style={{fontSize:12,color:C.muted,lineHeight:1.5}}>
            {dueReviews>0&&<span style={{color:C.gold,fontWeight:700}}>🔁 {dueReviews} reviews due · </span>}
            {weakTopics>0&&<span style={{color:C.red,fontWeight:700}}>💪 {weakTopics} weak topics · </span>}
            Key points · Focus areas · Mnemonics
          </div>
        </div>
        <div style={{fontSize:18,color:C.muted}}>→</div>
      </button>

      {/* Progress snapshot */}
      <Card style={{background:C.card2}}>
        <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>📊 Your Progress</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[
            ["Questions answered", user?.stats?.totalAnswered||0, C.blue],
            ["Quizzes done",       user?.stats?.quizzesCompleted||0, C.green],
            ["Current streak",    (user?.currentStreak||0)+" days", C.orange],
            ["Level",             lvl.name, C.purple],
          ].map(([label,val,color])=>(
            <div key={label} style={{background:C.card,borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontSize:11,color:C.sub,marginBottom:3}}>{label}</div>
              <div style={{fontWeight:800,fontSize:14,color}}>{val}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ME TAB — Profile + Stats + Leaderboard + Logout
// ═══════════════════════════════════════════════════════════════════════════
function MeTab({ user, onUpdate, onLogout }) {
  const [showFullProfile,setShowFullProfile] = useState(false);
  if(showFullProfile) return <ProfileScreen user={user} onClose={()=>setShowFullProfile(false)} onLogout={onLogout} onUpdate={onUpdate}/>;

  const lvl   = getLevelClient(user?.xp||0);
  const stats = user?.stats||{};
  const acc   = stats.totalAnswered>0 ? Math.round((stats.totalCorrect/stats.totalAnswered)*100) : 0;

  return(
    <div>
      {/* Profile card */}
      <div style={{background:`linear-gradient(135deg,${lvl.color}22,#13151f)`,border:`1px solid ${lvl.color}33`,borderRadius:16,padding:16,marginBottom:12}}>
        <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
          <div style={{width:52,height:52,background:lvl.color+"22",border:`2px solid ${lvl.color}`,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{lvl.badge}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:900,fontSize:17,color:"#f1f5f9"}}>{user?.name}</div>
            <div style={{fontSize:12,color:lvl.color,fontWeight:700}}>{lvl.badge} {lvl.name} · Level {lvl.level}</div>
            <div style={{fontSize:11,color:"#94a3b8"}}>{user?.exam} Candidate · {user?.state||"Nigeria"}</div>
          </div>
        </div>
        <div style={{background:"#1a1d2a",borderRadius:8,height:10,overflow:"hidden",marginBottom:4}}>
          <div style={{background:lvl.color,height:"100%",width:lvl.progress+"%",borderRadius:8,transition:"width 1.5s"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#64748b"}}>
          <span>{user?.xp||0} XP</span>
          {lvl.nextXP&&<span>{lvl.xpToNext} XP to Level {lvl.level+1}</span>}
        </div>
      </div>

      {/* Stats grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
        {[["🔥",user?.currentStreak||0,"Streak","#f97316"],["📝",stats.quizzesCompleted||0,"Quizzes","#3b82f6"],["💯",acc+"%","Accuracy","#22c55e"],["🏆",stats.bestJAMB||0,"Best CBT","#a855f7"]].map(([icon,val,label,color])=>(
          <div key={label} style={{background:"#13151f",border:"1px solid #252838",borderRadius:12,padding:"10px 6px",textAlign:"center"}}>
            <div style={{fontSize:16,marginBottom:2}}>{icon}</div>
            <div style={{fontWeight:900,fontSize:15,color}}>{val}</div>
            <div style={{fontSize:9,color:"#94a3b8",marginTop:1}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <button onClick={()=>setShowFullProfile(true)} style={{background:"#13151f",border:"1px solid #252838",borderRadius:12,padding:"13px 16px",color:"#f1f5f9",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",textAlign:"left",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span>📊 Full Profile & History</span><span style={{color:"#94a3b8"}}>→</span>
        </button>
        <button onClick={onLogout} style={{background:"#ef444411",border:"1px solid #ef444433",borderRadius:12,padding:"13px 16px",color:"#ef4444",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
          Sign Out
        </button>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// CAREER COUNSELLOR
// ═══════════════════════════════════════════════════════════════════════════
const FACULTIES = {
  "Medicine & Surgery":        {subjects:["Biology","Chemistry","Physics","Mathematics"],jamb:300,waec:"6B3"},
  "Engineering":               {subjects:["Mathematics","Physics","Chemistry"],jamb:280,waec:"5B3"},
  "Computer Science":          {subjects:["Mathematics","Physics"],jamb:260,waec:"5C6"},
  "Law":                       {subjects:["Literature in English","Government","English Language"],jamb:270,waec:"6B3"},
  "Accounting":                {subjects:["Mathematics","Economics","Commerce"],jamb:240,waec:"5C6"},
  "Economics":                 {subjects:["Mathematics","Economics"],jamb:240,waec:"5C6"},
  "Pharmacy":                  {subjects:["Chemistry","Biology","Mathematics"],jamb:290,waec:"6B3"},
  "Nursing":                   {subjects:["Biology","Chemistry","Physics"],jamb:200,waec:"5C6"},
  "Architecture":              {subjects:["Mathematics","Physics","Fine Arts"],jamb:260,waec:"5C6"},
  "Mass Communication":        {subjects:["English Language","Literature in English"],jamb:200,waec:"5C6"},
  "Education (Science)":       {subjects:["Mathematics","Physics","Chemistry","Biology"],jamb:180,waec:"5C6"},
  "Education (Arts)":          {subjects:["English Language","Literature in English"],jamb:180,waec:"5C6"},
  "Agriculture":               {subjects:["Biology","Chemistry","Agricultural Science"],jamb:180,waec:"5C6"},
  "Business Administration":   {subjects:["Mathematics","Economics"],jamb:200,waec:"5C6"},
  "Political Science":         {subjects:["Government","Economics"],jamb:200,waec:"5C6"},
  "Microbiology":              {subjects:["Biology","Chemistry","Mathematics"],jamb:220,waec:"5C6"},
  "Medical Lab Science":       {subjects:["Chemistry","Biology","Mathematics"],jamb:250,waec:"5C6"},
  "Physiotherapy":             {subjects:["Biology","Chemistry","Physics"],jamb:270,waec:"5C6"},
  "Radiography":               {subjects:["Biology","Chemistry","Physics"],jamb:250,waec:"5C6"},
  "Dentistry":                 {subjects:["Biology","Chemistry","Physics"],jamb:300,waec:"6B3"},
};

const CAREER_PATHS = [
  {area:"Healthcare & Medicine",    icon:"🏥", examples:"Doctor, Nurse, Pharmacist, Lab Scientist, Physiotherapist"},
  {area:"Engineering & Technology", icon:"⚙️", examples:"Civil, Mechanical, Electrical, Computer, Chemical Engineer"},
  {area:"Business & Finance",       icon:"💼", examples:"Accountant, Banker, Entrepreneur, Economist, Auditor"},
  {area:"Law & Governance",         icon:"⚖️", examples:"Lawyer, Judge, Civil Servant, Diplomat, Politician"},
  {area:"Education & Research",     icon:"🎓", examples:"Teacher, Lecturer, Researcher, Educational Consultant"},
  {area:"Science & Agriculture",    icon:"🔬", examples:"Scientist, Agronomist, Food Technologist, Environmental Scientist"},
  {area:"Media & Communication",    icon:"📢", examples:"Journalist, PR Officer, Broadcaster, Content Creator"},
  {area:"Arts & Humanities",        icon:"🎭", examples:"Graphic Designer, Writer, Historian, Linguist"},
];

function CareerCounsellor() {
  const [view,setView]     = useState("home");   // home|finder|explorer|counsellor
  const [jambScore,setJambScore] = useState("");
  const [subjects,setSubjects]   = useState([]);
  const [interest,setInterest]   = useState("");
  const [advice,setAdvice]       = useState("");
  const [loading,setLoading]     = useState(false);
  const [question,setQuestion]   = useState("");

  const toggleSubject = s => setSubjects(p => p.includes(s)?p.filter(x=>x!==s):[...p,s]);

  // Find matching courses based on subjects + JAMB score
  const matchedCourses = Object.entries(FACULTIES).filter(([name,info])=>{
    const scoreOk = !jambScore || parseInt(jambScore) >= info.jamb;
    const subjMatch = subjects.length===0 || info.subjects.some(s=>subjects.includes(s));
    return scoreOk && subjMatch;
  }).sort((a,b)=>b[1].jamb - a[1].jamb);

  const askCounsellor = async () => {
    if(!question.trim()) return;
    setLoading(true); setAdvice("");
    const prompt = `You are an expert Nigerian university admissions and career counsellor.

A student is asking: "${question}"

Context about the student:
- JAMB score: ${jambScore||"not specified"}
- Strong subjects: ${subjects.join(", ")||"not specified"}
- Career interest: ${interest||"not specified"}

Give practical, specific advice for Nigerian students. Include:
1. Realistic university options in Nigeria (mention specific universities like UNILAG, UI, OAU, UNIBEN, ABU, UNIPORT where relevant)
2. Minimum JAMB and O-level requirements
3. Alternative paths if their score is low (polytechnic, college of education, remedial, JUPEB)
4. Honest assessment — don't sugarcoat low scores
5. What the career actually involves day-to-day in Nigeria
6. Earning potential in Nigeria (use ₦)

Be warm but direct. Use Nigerian educational context. Maximum 300 words.`;

    try {
      const {text} = await callAI([{role:"user",content:prompt}],
        "You are a knowledgeable Nigerian career and university admissions counsellor. Give accurate, realistic advice.");
      setAdvice(text);
    } catch { setAdvice("⚠️ Could not connect. Please try again."); }
    setLoading(false);
  };

  if(view==="home") return(
    <div>
      <div style={{background:`linear-gradient(135deg,${C.teal}22,${C.card})`,border:`1px solid ${C.teal}44`,borderRadius:16,padding:18,marginBottom:12}}>
        <div style={{fontSize:28,marginBottom:6}}>🎓</div>
        <div style={{fontWeight:900,fontSize:17,color:"#14b8a6",marginBottom:4}}>Career Counsellor</div>
        <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>Find the right course, university and career path based on your WAEC results and JAMB score.</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {[
          {id:"finder",  icon:"🔍", title:"Course Finder",       sub:"See which courses match your subjects and JAMB score"},
          {id:"explorer",icon:"🗺️", title:"Career Explorer",     sub:"Explore careers by interest area"},
          {id:"counsellor",icon:"💬",title:"Ask the Counsellor", sub:"Ask anything about admissions, cut-offs, alternatives"},
        ].map(item=>(
          <button key={item.id} onClick={()=>setView(item.id)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",display:"flex",gap:14,alignItems:"center",cursor:"pointer",textAlign:"left",width:"100%",fontFamily:"inherit"}}>
            <div style={{fontSize:28,flexShrink:0}}>{item.icon}</div>
            <div>
              <div style={{fontWeight:800,fontSize:14,color:C.textLight,marginBottom:3}}>{item.title}</div>
              <div style={{fontSize:12,color:C.muted,lineHeight:1.5}}>{item.sub}</div>
            </div>
            <div style={{marginLeft:"auto",color:C.muted,fontSize:18}}>›</div>
          </button>
        ))}
      </div>
    </div>
  );

  if(view==="finder") return(
    <div>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:14}}>
        <button onClick={()=>setView("home")} style={{background:"none",border:"none",color:C.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
        <div style={{fontWeight:800,fontSize:15,color:C.textLight}}>🔍 Course Finder</div>
      </div>
      <Card>
        <Label>Your JAMB Score (or expected)</Label>
        <input value={jambScore} onChange={e=>setJambScore(e.target.value)} type="number" min="100" max="400" placeholder="e.g. 260" style={{width:"100%",background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.textLight,fontSize:14,fontFamily:"inherit",outline:"none",marginBottom:12}}/>
        <Label>Your Strong Subjects</Label>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>
          {SUBJECTS.map(s=>(
            <button key={s} onClick={()=>toggleSubject(s)} style={{background:subjects.includes(s)?C.teal+"22":"transparent",border:`1.5px solid ${subjects.includes(s)?C.teal:C.border}`,borderRadius:20,padding:"4px 10px",color:subjects.includes(s)?"#14b8a6":C.muted,fontWeight:subjects.includes(s)?800:400,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{s.split(" ")[0]}</button>
          ))}
        </div>
      </Card>
      <div style={{marginBottom:8,fontSize:12,color:C.muted}}>
        {matchedCourses.length} courses match your profile
      </div>
      {matchedCourses.map(([name,info])=>(
        <Card key={name} style={{marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
            <div style={{fontWeight:800,fontSize:14,color:C.textLight}}>{name}</div>
            <div style={{background:parseInt(jambScore||"0")>=info.jamb?C.green+"22":C.red+"22",color:parseInt(jambScore||"0")>=info.jamb?C.green:C.red,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700,flexShrink:0,marginLeft:8}}>
              {parseInt(jambScore||"0")>=info.jamb?"✅ Eligible":"Min "+info.jamb}
            </div>
          </div>
          <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Minimum JAMB: {info.jamb} · WAEC: {info.waec}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {info.subjects.map(s=>(
              <span key={s} style={{background:subjects.includes(s)?C.blue+"22":C.card2,color:subjects.includes(s)?C.sky:C.sub,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:subjects.includes(s)?700:400}}>{s}</span>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );

  if(view==="explorer") return(
    <div>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:14}}>
        <button onClick={()=>setView("home")} style={{background:"none",border:"none",color:C.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
        <div style={{fontWeight:800,fontSize:15,color:C.textLight}}>🗺️ Career Explorer</div>
      </div>
      {CAREER_PATHS.map(cp=>(
        <Card key={cp.area} style={{marginBottom:8,cursor:"pointer"}} onClick={()=>{setView("counsellor");setQuestion("Tell me about careers in "+cp.area+" in Nigeria — what to study, JAMB requirements, job prospects and salary");}}>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <div style={{fontSize:28,flexShrink:0}}>{cp.icon}</div>
            <div>
              <div style={{fontWeight:800,fontSize:14,color:C.textLight,marginBottom:3}}>{cp.area}</div>
              <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{cp.examples}</div>
            </div>
            <div style={{marginLeft:"auto",color:C.muted,fontSize:18}}>›</div>
          </div>
        </Card>
      ))}
    </div>
  );

  if(view==="counsellor") return(
    <div>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:14}}>
        <button onClick={()=>setView("home")} style={{background:"none",border:"none",color:C.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
        <div style={{fontWeight:800,fontSize:15,color:C.textLight}}>💬 Ask the Counsellor</div>
      </div>
      <Card style={{background:C.teal+"0a",borderColor:C.teal+"33",marginBottom:10}}>
        <div style={{fontSize:12,color:"#14b8a6",lineHeight:1.7}}>Ask anything: "Can I study Medicine with 260 in JAMB?", "What course should I study if I love Mathematics?", "What are alternatives if I don't get admission this year?"</div>
      </Card>
      <Card>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          <div>
            <Label>JAMB Score</Label>
            <input value={jambScore} onChange={e=>setJambScore(e.target.value)} type="number" placeholder="e.g. 240" style={{width:"100%",background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.textLight,fontSize:13,fontFamily:"inherit",outline:"none"}}/>
          </div>
          <div>
            <Label>Career Interest</Label>
            <input value={interest} onChange={e=>setInterest(e.target.value)} placeholder="e.g. Medicine" style={{width:"100%",background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.textLight,fontSize:13,fontFamily:"inherit",outline:"none"}}/>
          </div>
        </div>
        <Label>Your Question</Label>
        <textarea value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Type your question here..." rows={3} style={{width:"100%",background:C.card2,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.textLight,fontSize:13,fontFamily:"inherit",resize:"none",outline:"none",marginBottom:10}}/>
        <Btn onClick={askCounsellor} loading={loading} color={"#14b8a6"} tc="#fff">💬 Get Advice</Btn>
      </Card>
      {/* Quick question chips */}
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
        {[
          "What can I study with 200 in JAMB?",
          "Best courses for someone who loves Maths",
          "Alternatives if I fail JAMB",
          "Courses without Physics",
          "What is JUPEB and IJMB?",
          "How to choose between Uni and Poly?",
        ].map(q=>(
          <button key={q} onClick={()=>{setQuestion(q);}} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:20,padding:"6px 12px",color:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>{q}</button>
        ))}
      </div>
      {advice&&(
        <Out text={advice} color={"#14b8a6"} source="ExamAce AI"/>
      )}
    </div>
  );

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEEP LEARNING MODE — AI Teacher
// Interactive lesson: Explain → Example → Check Understanding → Quiz
// ═══════════════════════════════════════════════════════════════════════════
function DeepLearnMode() {
  const LESSON_STAGES = ["intro","explain","example","check","quiz","summary"];

  const [exam,setExam]       = useState("WAEC");
  const [subject,setSubject] = useState("");
  const [topic,setTopic]     = useState("");
  const [customTopic,setCustomTopic] = useState("");
  const [stage,setStage]     = useState("select"); // select | loading | teaching
  const [lessonStage,setLessonStage] = useState(0);
  const [lesson,setLesson]   = useState(null);     // {intro,explain,example,check,quiz:[],summary}
  const [loading,setLoading] = useState(false);
  const [loadingMsg,setLoadingMsg] = useState("");
  const [userAnswer,setUserAnswer] = useState("");
  const [feedback,setFeedback] = useState("");
  const [fbLoading,setFbLoading] = useState(false);
  const [quizIndex,setQuizIndex] = useState(0);
  const [quizSel,setQuizSel]   = useState(null);
  const [quizAnswered,setQuizAnswered] = useState(false);
  const [quizScore,setQuizScore] = useState(0);
  const [aiSource,setAiSource] = useState("");

  const topicList = subject&&SYLLABUS[subject] ? SYLLABUS[subject] : [];
  const activeTopic = customTopic || topic;

  const startLesson = async () => {
    if(!subject||!activeTopic){ alert("Please select a subject and topic"); return; }
    setStage("loading"); setLoading(true);
    setLoadingMsg("Preparing your lesson...");

    const LESSON_PROMPT = `You are an expert Nigerian ${exam} teacher teaching "${activeTopic}" in ${subject}.

Create a complete structured lesson for a secondary school leaver preparing for ${exam}.

Respond ONLY with valid JSON in this exact format:
{
  "intro": "A warm 2-sentence welcome that names the topic and why it matters for ${exam}",
  "explain": "Clear explanation in 200-250 words. Use Nigerian examples (₦, Lagos, Kano, Nigeria). Break into short paragraphs. Include the key formula or rule if applicable. Use **bold** for key terms.",
  "example": "One fully worked ${exam}-style example with COMPLETE step-by-step solution. Show ALL working. Format:\n**Question:** [question]\n**Step 1:** [step]\n**Step 2:** [step]\n**Answer:** [answer with units]",
  "check": "A single short open-ended question to test understanding before the quiz. Should be answerable in 1-3 sentences.",
  "quiz": [
    {"q":"MCQ question 1 in ${exam} style","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","explanation":"Why A is correct and others wrong"},
    {"q":"MCQ question 2","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"B","explanation":"..."},
    {"q":"MCQ question 3","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"C","explanation":"..."},
    {"q":"MCQ question 4","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","explanation":"..."},
    {"q":"MCQ question 5","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"D","explanation":"..."}
  ],
  "summary": "5 bullet-point summary of key things to remember for ${exam}. Start each with ✅"
}`;

    try {
      const msgs = [
        {role:"system", content:`You are an expert Nigerian ${exam}/${subject} teacher. Always respond with valid JSON only, no markdown code blocks, no extra text.`},
        {role:"user", content:LESSON_PROMPT}
      ];
      const {text,source} = await callAI(msgs, `You are a Nigerian ${exam} teacher. Respond with valid JSON only.`);
      setAiSource(source);

      // Parse JSON — strip any markdown fences if present
      const clean = text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);

      // Validate structure
      if(!parsed.intro||!parsed.explain||!parsed.quiz?.length) throw new Error("Incomplete lesson");

      setLesson(parsed);
      setLessonStage(0);
      setStage("teaching");
      setQuizIndex(0); setQuizSel(null); setQuizAnswered(false); setQuizScore(0);
    } catch(e) {
      console.error("Lesson error:", e);
      alert("Could not load lesson. Please try again.");
      setStage("select");
    }
    setLoading(false);
  };

  const checkAnswer = async () => {
    if(!userAnswer.trim()) return;
    setFbLoading(true); setFeedback("");
    try {
      const {text} = await callAI(
        `A student learning "${activeTopic}" in ${exam} ${subject} answered a comprehension check:

Question: ${lesson.check}
Student answer: "${userAnswer}"

Respond in 3-4 sentences: (1) Say if they're right/partially right/wrong. (2) Correct any misunderstanding clearly. (3) Give one encouraging tip for ${exam}.`,
        `You are a kind but accurate ${exam} teacher.`
      );
      setFeedback(text);
    } catch { setFeedback("Good attempt! Review the explanation above and try to connect the key concept to the example shown."); }
    setFbLoading(false);
  };

  const stageLabel = ["📖 Introduction","📚 Explanation","✏️ Worked Example","🤔 Check","📝 Mini Quiz","🏁 Summary"];

  // ── SELECT SCREEN ─────────────────────────────────────────────────────────
  if(stage==="select") return(
    <div>
      <Card style={{background:`linear-gradient(135deg,${C.purple}22,${C.card})`,borderColor:C.purple+"44"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
          <div style={{fontSize:32}}>🎓</div>
          <div>
            <div style={{fontWeight:900,fontSize:17,color:C.purple}}>Deep Learning Mode</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>AI teaches you a topic from scratch — explanation, examples, check, then quiz</div>
          </div>
        </div>
        <div style={{background:C.purple+"18",borderRadius:10,padding:"8px 12px",fontSize:12,color:C.purple,lineHeight:1.7}}>
          📖 Explain → ✏️ Worked Example → 🤔 Check Understanding → 📝 Mini Quiz → 🏁 Summary
        </div>
      </Card>

      <Card>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
          <div><Label>Exam</Label><Sel value={exam} onChange={setExam} options={EXAMS} placeholder="Exam"/></div>
          <div><Label>Subject</Label><Sel value={subject} onChange={v=>{setSubject(v);setTopic("");setCustomTopic("");}} options={SUBJECTS} placeholder="Subject"/></div>
        </div>
        {topicList.length>0&&(
          <div style={{marginBottom:12}}>
            <Label>Topic</Label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>
              {topicList.map(t=>(
                <button key={t} onClick={()=>{setTopic(t);setCustomTopic("");}} style={{background:topic===t?C.purple+"33":"transparent",border:`1.5px solid ${topic===t?C.purple:C.border}`,borderRadius:20,padding:"5px 12px",color:topic===t?C.purple:C.muted,fontWeight:topic===t?800:400,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{t}</button>
              ))}
            </div>
          </div>
        )}
        <div style={{marginBottom:16}}>
          <Label>Or type any topic</Label>
          <Inp value={customTopic} onChange={v=>{setCustomTopic(v);setTopic("");}} placeholder={`e.g. ${subject?"Photosynthesis, Quadratic equations, Supply and demand":"Select subject first"}`}/>
        </div>
        <Btn onClick={startLesson} loading={loading} color={C.purple} tc="#fff">
          🎓 Start Lesson{activeTopic?" — "+activeTopic:""}
        </Btn>
      </Card>

      {/* Recent topic suggestions */}
      <Card>
        <Label c={C.muted}>🔥 High-frequency {exam} topics</Label>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
          {[
            ["Quadratic Equations","Mathematics"],
            ["Photosynthesis","Biology"],
            ["Supply & Demand","Economics"],
            ["Newton's Laws","Physics"],
            ["Ionic Bonding","Chemistry"],
            ["Nigerian Civil War","History"],
            ["Essay Writing","English Language"],
            ["Trigonometry","Mathematics"],
          ].map(([t,s])=>(
            <button key={t} onClick={()=>{setSubject(s);setCustomTopic(t);setTopic("");}} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:20,padding:"5px 12px",color:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{t}</button>
          ))}
        </div>
      </Card>
    </div>
  );

  // ── LOADING SCREEN ────────────────────────────────────────────────────────
  if(stage==="loading") return(
    <Card style={{textAlign:"center",padding:48,background:`linear-gradient(135deg,${C.purple}18,${C.card})`}}>
      <div style={{fontSize:48,marginBottom:12,animation:"pulse 1.5s infinite"}}>🎓</div>
      <div style={{fontWeight:800,fontSize:16,color:C.purple,marginBottom:6}}>Preparing your lesson...</div>
      <div style={{fontSize:13,color:C.muted,marginBottom:20}}>{activeTopic} · {subject} · {exam}</div>
      <div style={{display:"flex",justifyContent:"center",gap:6}}>
        {[0,1,2].map(i=><div key={i} style={{width:10,height:10,borderRadius:"50%",background:C.purple,animation:`blink 1.2s ${i*0.3}s infinite`}}/>)}
      </div>
      <div style={{marginTop:16,fontSize:12,color:C.sub}}>AI teacher is preparing explanation, examples and quiz questions...</div>
    </Card>
  );

  // ── TEACHING SCREEN ───────────────────────────────────────────────────────
  if(!lesson) return null;
  const quizQ = lesson.quiz?.[quizIndex];

  return(
    <div>
      {/* Progress bar */}
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontSize:13,fontWeight:700,color:C.purple}}>{stageLabel[lessonStage]}</div>
          <div style={{display:"flex",gap:4}}>
            {LESSON_STAGES.map((_,i)=>(
              <div key={i} style={{width:28,height:5,borderRadius:3,background:i<=lessonStage?C.purple:C.border,transition:"background .3s"}}/>
            ))}
          </div>
        </div>
        <div style={{fontSize:11,color:C.muted,fontWeight:600}}>{activeTopic} · {subject} · {exam}</div>
      </div>

      {/* Stage 0: Introduction */}
      {lessonStage===0&&(
        <Card style={{background:`linear-gradient(135deg,${C.purple}18,${C.card})`,borderColor:C.purple+"44"}}>
          <div style={{fontSize:32,marginBottom:8}}>👨‍🏫</div>
          <div style={{fontSize:15,color:C.textLight,lineHeight:1.8,marginBottom:16}}>{lesson.intro}</div>
          <Btn onClick={()=>setLessonStage(1)} color={C.purple} tc="#fff">📚 Start Learning →</Btn>
        </Card>
      )}

      {/* Stage 1: Explanation */}
      {lessonStage===1&&(
        <div>
          <Card style={{borderColor:C.blue+"44"}}>
            <Label c={C.blue}>📚 Explanation</Label>
            <div style={{fontSize:14,color:C.textLight,lineHeight:1.9,whiteSpace:"pre-wrap"}}>{fmt(lesson.explain,false)}</div>
          </Card>
          <Btn onClick={()=>setLessonStage(2)} color={C.blue} tc="#fff">✏️ See Worked Example →</Btn>
        </div>
      )}

      {/* Stage 2: Worked Example */}
      {lessonStage===2&&(
        <div>
          <Card style={{background:C.gold+"0a",borderColor:C.gold+"44"}}>
            <Label c={C.gold}>✏️ Worked Example</Label>
            <div style={{fontSize:14,color:C.textLight,lineHeight:1.9,whiteSpace:"pre-wrap"}}>{fmt(lesson.example,false)}</div>
          </Card>
          <Btn onClick={()=>setLessonStage(3)} color={C.gold} tc="#000">🤔 Check My Understanding →</Btn>
        </div>
      )}

      {/* Stage 3: Understanding Check */}
      {lessonStage===3&&(
        <div>
          <Card style={{borderColor:C.orange+"44"}}>
            <Label c={C.orange}>🤔 Check Your Understanding</Label>
            <div style={{fontSize:14,fontWeight:700,color:C.textLight,marginBottom:12,lineHeight:1.7}}>{lesson.check}</div>
            <textarea value={userAnswer} onChange={e=>setUserAnswer(e.target.value)} placeholder="Type your answer here..." style={{width:"100%",background:C.card2,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"12px 14px",color:C.textLight,fontSize:13,fontFamily:"inherit",minHeight:80,resize:"vertical",outline:"none"}}/>
            {!feedback&&<Btn onClick={checkAnswer} loading={fbLoading} color={C.orange} tc="#fff" style={{marginTop:8}}>✅ Submit Answer</Btn>}
            {feedback&&(
              <>
                <Card style={{background:C.blue+"11",borderColor:C.blue+"33",marginTop:10}}>
                  <Label c={C.blue}>👨‍🏫 Teacher Feedback</Label>
                  <div style={{fontSize:13,color:C.textLight,lineHeight:1.7}}>{feedback}</div>
                </Card>
                <Btn onClick={()=>setLessonStage(4)} color={C.purple} tc="#fff" style={{marginTop:8}}>📝 Take the Mini Quiz →</Btn>
              </>
            )}
          </Card>
        </div>
      )}

      {/* Stage 4: Mini Quiz */}
      {lessonStage===4&&quizQ&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <Label c={C.green}>📝 Mini Quiz — Q{quizIndex+1}/{lesson.quiz.length}</Label>
            <span style={{fontSize:12,color:C.green,fontWeight:700}}>✅ {quizScore}/{lesson.quiz.length}</span>
          </div>
          <div style={{background:C.border,borderRadius:4,height:5,marginBottom:12}}>
            <div style={{background:C.green,height:"100%",borderRadius:4,width:(quizIndex/lesson.quiz.length*100)+"%",transition:"width .4s"}}/>
          </div>
          <Card><div style={{fontSize:15,fontWeight:600,lineHeight:1.8,color:C.textLight}}>{quizQ.q}</div></Card>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
            {["A","B","C","D"].map(l=>{
              const t=quizQ.options?.[l]||""; if(!t) return null;
              const ok=l===quizQ.answer, isSel=quizSel===l;
              let bg=C.card, border=C.border, color=C.textLight;
              if(quizAnswered){if(ok){bg=C.green+"22";border=C.green;color=C.green;}else if(isSel){bg=C.red+"22";border=C.red;color=C.red;}}
              else if(isSel){bg=C.purple+"18";border=C.purple;}
              return(
                <button key={l} onClick={()=>{
                  if(quizAnswered)return;
                  setQuizSel(l);setQuizAnswered(true);
                  if(l===quizQ.answer) setQuizScore(s=>s+1);
                }} style={{background:bg,border:`2px solid ${border}`,borderRadius:12,padding:"12px 14px",color,fontSize:13,textAlign:"left",cursor:quizAnswered?"default":"pointer",display:"flex",gap:10,alignItems:"center",fontFamily:"inherit"}}>
                  <span style={{width:26,height:26,borderRadius:"50%",background:quizAnswered&&ok?C.green:quizAnswered&&isSel?C.red:C.card2,color:quizAnswered&&(ok||isSel)?"#fff":C.muted,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,flexShrink:0}}>
                    {quizAnswered?(ok?"✓":isSel?"✗":l):l}
                  </span>
                  {t}
                </button>
              );
            })}
          </div>
          {quizAnswered&&(
            <>
              <Card style={{background:quizSel===quizQ.answer?C.green+"18":C.red+"18",borderColor:quizSel===quizQ.answer?C.green:C.red,marginBottom:10}}>
                <div style={{fontWeight:700,color:quizSel===quizQ.answer?C.green:C.red,marginBottom:4}}>{quizSel===quizQ.answer?"✅ Correct!":"❌ Wrong — Answer: "+quizQ.answer}</div>
                <div style={{fontSize:12,color:C.textLight,lineHeight:1.6}}>{quizQ.explanation}</div>
              </Card>
              <button onClick={()=>{
                if(quizIndex+1>=lesson.quiz.length){setLessonStage(5);}
                else{setQuizIndex(i=>i+1);setQuizSel(null);setQuizAnswered(false);}
              }} style={{width:"100%",background:C.purple,border:"none",borderRadius:12,padding:"13px 0",color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
                {quizIndex+1>=lesson.quiz.length?"🏁 See Summary →":"Next Question →"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Stage 5: Summary */}
      {lessonStage===5&&(
        <div>
          <Card style={{background:`linear-gradient(135deg,${C.green}18,${C.card})`,borderColor:C.green+"44"}}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:48,marginBottom:8}}>{quizScore>=4?"🏆":quizScore>=3?"🎯":"📚"}</div>
              <div style={{fontWeight:900,fontSize:18,color:quizScore>=4?C.gold:quizScore>=3?C.green:C.orange}}>
                {quizScore>=4?"Excellent! 🌟":quizScore>=3?"Good work! 👍":"Keep studying! 💪"}
              </div>
              <div style={{fontSize:13,color:C.muted,marginTop:4}}>Quiz score: {quizScore}/{lesson.quiz.length}</div>
            </div>
            <Label c={C.green}>🏁 Key Takeaways</Label>
            <div style={{fontSize:14,color:C.textLight,lineHeight:1.9,whiteSpace:"pre-wrap",marginBottom:16}}>{fmt(lesson.summary,false)}</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button onClick={()=>{setStage("select");setLesson(null);setLessonStage(0);setFeedback("");setUserAnswer("");}} style={{flex:1,background:C.purple,border:"none",borderRadius:12,padding:"12px 0",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>🎓 New Topic</button>
              <button onClick={()=>{
                sessionStorage.setItem("examace_show_me","Explain "+activeTopic+" in "+subject+" with more examples for "+exam);
                alert("Switch to Ask AI tab for more practice!");
              }} style={{flex:1,background:C.blue+"22",border:`1px solid ${C.blue}44`,borderRadius:12,padding:"12px 0",color:C.sky,fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>💬 Ask AI More</button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// TODAY'S PROGRESS — stored in localStorage, resets at midnight
// ═══════════════════════════════════════════════════════════════════════════
const TODAY_KEY = () => `examace_today_${new Date().toDateString()}`;

const getTodayProgress = () => {
  try {
    const raw = localStorage.getItem(TODAY_KEY());
    return raw ? JSON.parse(raw) : { answered: 0, correct: 0, dailyDone: false };
  } catch { return { answered: 0, correct: 0, dailyDone: false }; }
};

const updateTodayProgress = (answeredDelta, correctDelta, markDailyDone=false) => {
  try {
    const p = getTodayProgress();
    p.answered  += answeredDelta;
    p.correct   += correctDelta;
    if (markDailyDone) p.dailyDone = true;
    localStorage.setItem(TODAY_KEY(), JSON.stringify(p));
    return p;
  } catch { return getTodayProgress(); }
};

// ═══════════════════════════════════════════════════════════════════════════
// HOME SCREEN — Daily question + today's goal + quick actions
// Shown as first tab. Designed for <30 second daily habit.
// ═══════════════════════════════════════════════════════════════════════════
function HomeScreen({ user, onNavigate, onAnswered }) {
  const [dailyQ,setDailyQ]       = useState(null);
  const [dailySel,setDailySel]   = useState(null);
  const [dailyDone,setDailyDone] = useState(false);
  const [loading,setLoading]     = useState(true);
  const [todayProgress,setTodayProgress] = useState(()=>getTodayProgress());
  const subject    = user?.subjects?.[0] || "Mathematics";
  const exam       = user?.exam || "WAEC";
  const lvl        = getLevelClient(user?.xp||0);
  const stats      = user?.stats || {};
  const dueReviews = getDueReviews().length;

  useEffect(()=>{
    const p = getTodayProgress();
    setTodayProgress(p);
    if(p.dailyDone){ setDailyDone(true); setLoading(false); return; }
    // Auto-fetch daily question immediately on mount
    fetchDailyQuestion(subject, exam)
      .then(d=>{ setDailyQ(d.question); setLoading(false); })
      .catch(e=>{ console.warn("Daily Q fetch failed:", e.message); setLoading(false); });
  },[]);

  const answerDaily = (letter) => {
    if(dailySel) return;
    setDailySel(letter);
    const correct = letter === dailyQ.answer;
    // Update today's progress immediately
    const p = updateTodayProgress(1, correct?1:0, true);
    setTodayProgress(p);
    // Notify parent to update streak/XP
    if(onAnswered) onAnswered({ correct, question: dailyQ });
    // Show answer for 3s then mark done
    setTimeout(()=>setDailyDone(true), 3000);
  };

  // Days to exam countdown
  const EXAM_DATES = { "WAEC": new Date("2026-05-04"), "NECO": new Date("2026-06-02"), "JAMB": new Date("2026-04-26") };
  const examDate = EXAM_DATES[exam] || EXAM_DATES["WAEC"];
  const daysLeft = Math.max(0, Math.ceil((examDate - Date.now()) / 86400000));
  const dailyTarget = Math.min(20, Math.max(5, Math.ceil((daysLeft > 0 ? 200 / daysLeft : 20))));

  return(
    <div>
      {/* Greeting + streak */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div>
          <div style={{fontWeight:900,fontSize:18,color:C.textLight}}>Hello, {user?.name?.split(" ")[0]} 👋</div>
          <div style={{fontSize:12,color:C.muted,marginTop:2}}>Ready to study? {exam} in <span style={{color:daysLeft<30?C.red:C.gold,fontWeight:700}}>{daysLeft} days</span></div>
        </div>
        <div style={{textAlign:"right"}}>
          {(user?.currentStreak||0)>0?(
            <div style={{background:C.orange+"22",border:`1px solid ${C.orange}44`,borderRadius:20,padding:"6px 12px",display:"inline-block"}}>
              <span style={{fontWeight:900,fontSize:18,color:C.orange}}>🔥{user.currentStreak}</span>
              <span style={{fontSize:10,color:C.orange,marginLeft:3}}>day streak</span>
            </div>
          ):(
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:"6px 12px",fontSize:11,color:C.muted}}>Start your streak today!</div>
          )}
        </div>
      </div>

      {/* Today's goal progress — live, updates as student answers */}
      {(()=>{
        const answered = todayProgress.answered || 0;
        const pctDone  = Math.min(100, Math.round((answered / dailyTarget) * 100));
        const goalMet  = answered >= dailyTarget;
        return(
          <Card
            onClick={()=>onNavigate&&onNavigate("quiz")}
            style={{marginBottom:12,background:`linear-gradient(135deg,${goalMet?C.green:lvl.color}14,${C.card})`,borderColor:(goalMet?C.green:lvl.color)+"33",cursor:"pointer"}}
          >
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:C.textLight}}>{goalMet?"🎯 Goal Complete!":"Today's goal"}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:1}}>{goalMet?"Great work — keep going!":`${dailyTarget} questions recommended`}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontWeight:900,fontSize:18,color:goalMet?C.green:lvl.color}}>{answered}</div>
                <div style={{fontSize:10,color:C.muted}}>of {dailyTarget}</div>
              </div>
            </div>
            <div style={{background:C.border,borderRadius:6,height:10,overflow:"hidden"}}>
              <div style={{background:goalMet?C.green:lvl.color,height:"100%",width:pctDone+"%",borderRadius:6,transition:"width .8s ease"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:5,fontSize:11}}>
              <span style={{color:C.muted}}>{answered} answered today</span>
              {!goalMet
                ? <span style={{color:lvl.color,fontWeight:700}}>Tap to practice → {dailyTarget-answered} to go</span>
                : <span style={{color:C.green,fontWeight:700}}>✅ Done for today</span>
              }
            </div>
          </Card>
        );
      })()}

      {/* DAILY QUESTION — the core habit loop */}
      {!loading&&dailyQ&&!dailyDone&&(
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:C.gold,flexShrink:0}}/>
            <div style={{fontSize:12,fontWeight:800,color:C.gold,textTransform:"uppercase",letterSpacing:1}}>Question of the Day</div>
            <div style={{fontSize:10,color:C.muted,marginLeft:"auto"}}>{exam} · {dailyQ.topic||subject}</div>
          </div>
          <Card style={{borderColor:C.gold+"44",background:C.gold+"08"}}>
            <div style={{fontSize:15,fontWeight:600,color:C.textLight,lineHeight:1.8,marginBottom:12}}>{dailyQ.q}</div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {["A","B","C","D"].map(l=>{
                const t=(dailyQ.options||{})[l]||""; if(!t) return null;
                const ok=l===dailyQ.answer, isSel=dailySel===l;
                let bg=C.card, border=C.border, color=C.textLight;
                if(dailySel){if(ok){bg=C.green+"22";border=C.green;color=C.green;}else if(isSel){bg=C.red+"22";border=C.red;color=C.red;}}
                return(
                  <button key={l} onClick={()=>answerDaily(l)} style={{background:bg,border:`1.5px solid ${border}`,borderRadius:10,padding:"10px 12px",color,fontSize:13,textAlign:"left",cursor:dailySel?"default":"pointer",display:"flex",gap:8,alignItems:"center",fontFamily:"inherit"}}>
                    <span style={{width:22,height:22,borderRadius:"50%",background:dailySel&&ok?C.green:dailySel&&isSel?C.red:C.card2,color:dailySel&&(ok||isSel)?"#fff":C.muted,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:11,flexShrink:0}}>
                      {dailySel?(ok?"✓":isSel?"✗":l):l}
                    </span>
                    {t}
                  </button>
                );
              })}
            </div>
            {dailySel&&(
              <div style={{marginTop:10,background:dailySel===dailyQ.answer?C.green+"18":C.red+"18",borderRadius:10,padding:"10px 12px",borderLeft:`3px solid ${dailySel===dailyQ.answer?C.green:C.red}`}}>
                <div style={{fontWeight:700,color:dailySel===dailyQ.answer?C.green:C.red,marginBottom:3}}>{dailySel===dailyQ.answer?"✅ Correct! +5 XP":"❌ Answer: "+dailyQ.answer}</div>
                <div style={{fontSize:12,color:C.textLight,lineHeight:1.6}}>{dailyQ.explanation}</div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Daily done state */}
      {dailyDone&&(
        <Card style={{background:C.green+"11",borderColor:C.green+"33",marginBottom:14,padding:"14px 12px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <div style={{fontSize:28}}>✅</div>
            <div>
              <div style={{fontWeight:800,fontSize:14,color:C.green}}>Daily question done!</div>
              <div style={{fontSize:12,color:C.muted,marginTop:1}}>
                {(todayProgress.answered||0) >= dailyTarget
                  ? "You've hit today's goal! 🎯"
                  : `${Math.max(0,dailyTarget-(todayProgress.answered||0))} more to reach your daily goal`}
              </div>
            </div>
          </div>
          {(todayProgress.answered||0) < dailyTarget&&(
            <button onClick={()=>onNavigate&&onNavigate("quiz")} style={{width:"100%",background:C.green,border:"none",borderRadius:12,padding:"11px 0",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
              📝 Keep Practising → {dailyTarget-(todayProgress.answered||0)} questions to goal
            </button>
          )}
        </Card>
      )}

      {/* Quick actions */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:8,textTransform:"uppercase",letterSpacing:.8}}>Quick Practice</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[
            {icon:"📝",label:"Past Questions Quiz",sub:"WAEC/NECO/JAMB",color:C.blue,action:"practice"},
            {icon:"🖥️",label:"JAMB CBT Mock",sub:"180 questions · 2hrs",color:C.purple,action:"practice"},
            {icon:"🎓",label:"Deep Learning",sub:"AI teaches a topic",color:C.teal,action:"learn"},
            {icon:"🧭",label:"Career Advisor",sub:"Courses & universities",color:C.orange,action:"career"},
          ].map(({icon,label,sub,color,action})=>(
            <button key={label} onClick={()=>onNavigate(action)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 12px",textAlign:"left",cursor:"pointer",fontFamily:"inherit"}}>
              <div style={{fontSize:24,marginBottom:6}}>{icon}</div>
              <div style={{fontSize:13,fontWeight:700,color:C.textLight,marginBottom:2}}>{label}</div>
              <div style={{fontSize:11,color:C.muted}}>{sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Due reviews alert */}
      {dueReviews>0&&(
        <button onClick={()=>onNavigate("study")} style={{width:"100%",background:C.purple+"18",border:`1px solid ${C.purple}33`,borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",fontFamily:"inherit",marginBottom:10}}>
          <div style={{fontSize:22}}>🔁</div>
          <div style={{textAlign:"left"}}>
            <div style={{fontSize:13,fontWeight:700,color:C.purple}}>{dueReviews} review{dueReviews>1?"s":""} due</div>
            <div style={{fontSize:11,color:C.muted}}>Questions you got wrong — ready to retry</div>
          </div>
          <div style={{marginLeft:"auto",fontSize:13,color:C.purple}}>→</div>
        </button>
      )}

      {/* Snap shortcut */}
      <button onClick={()=>onNavigate("snap")} style={{width:"100%",background:C.green+"11",border:`1px solid ${C.green}33`,borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",fontFamily:"inherit"}}>
        <div style={{fontSize:22}}>📸</div>
        <div style={{textAlign:"left"}}>
          <div style={{fontSize:13,fontWeight:700,color:C.green}}>Snap a question</div>
          <div style={{fontSize:11,color:C.muted}}>Photo any question — AI solves with full working</div>
        </div>
        <div style={{marginLeft:"auto",fontSize:13,color:C.green}}>→</div>
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// CHALLENGE SHARE CARD — shown after good quiz score
// ═══════════════════════════════════════════════════════════════════════════
function ChallengeShareCard({ subject, exam, year, score, total, pct, questions, onClose }) {
  const [state,setState]   = useState("idle"); // idle | creating | ready | copied
  const [link,setLink]     = useState("");
  const [error,setError]   = useState("");
  const gradeColor = pct>=75?C.green:pct>=60?C.gold:C.orange;

  const handleCreate = async () => {
    setState("creating");
    const data = await createChallenge(subject, exam, year, score, total, pct, questions);
    if(!data){ setError("Could not create challenge. Try again."); setState("idle"); return; }
    const fullLink = `${window.location.origin}/challenge/${data.challengeId}`;
    setLink(fullLink);
    setState("ready");
  };

  const share = () => {
    const text = `🏆 I scored ${score}/${total} (${pct}%) on ${exam} ${subject} — can you beat me?

Take the same quiz here 👇
${link}

Powered by ExamAce AI 🇳🇬`;
    if(navigator.share){ navigator.share({ title:"ExamAce Challenge", text }); }
    else {
      navigator.clipboard.writeText(text);
      setState("copied");
      setTimeout(()=>setState("ready"), 2500);
    }
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:24,padding:28,maxWidth:360,width:"100%",animation:"fadeUp .3s ease"}}>
        {/* Score celebration */}
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:52,marginBottom:8}}>{pct>=75?"🏆":pct>=60?"🎯":"💪"}</div>
          <div style={{fontWeight:900,fontSize:22,color:gradeColor,marginBottom:4}}>{pct}% — {gradeFromPct(pct).g}</div>
          <div style={{fontSize:13,color:C.muted}}>{score}/{total} correct · {exam} {subject} {year||""}</div>
        </div>

        {/* Challenge prompt */}
        <div style={{background:C.purple+"18",border:`1px solid ${C.purple}33`,borderRadius:14,padding:14,marginBottom:16,textAlign:"center"}}>
          <div style={{fontWeight:800,fontSize:14,color:C.purple,marginBottom:4}}>⚔️ Challenge a Friend!</div>
          <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>Generate a link — your friend plays the exact same 10 questions. See if they can beat your score.</div>
        </div>

        {error&&<div style={{background:C.red+"18",borderRadius:10,padding:"8px 12px",color:C.red,fontSize:12,marginBottom:12}}>{error}</div>}

        {state==="idle"&&(
          <Btn onClick={handleCreate} color={C.purple} tc="#fff">⚔️ Create Challenge Link</Btn>
        )}

        {state==="creating"&&(
          <div style={{textAlign:"center",padding:"14px 0",color:C.muted,fontSize:13}}>
            <span style={{animation:"spin 1s linear infinite",display:"inline-block",marginRight:8}}>⏳</span>
            Creating your challenge...
          </div>
        )}

        {(state==="ready"||state==="copied")&&(
          <>
            {/* Link preview */}
            <div style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
              <div style={{flex:1,fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{link}</div>
              <button onClick={()=>{navigator.clipboard.writeText(link);setState("copied");setTimeout(()=>setState("ready"),2000);}} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 10px",color:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
                {state==="copied"?"✅":"Copy"}
              </button>
            </div>
            {/* Share button */}
            <button onClick={share} style={{width:"100%",background:C.wa,border:"none",borderRadius:14,padding:"14px 0",color:"#fff",fontWeight:900,fontSize:15,cursor:"pointer",fontFamily:"inherit",marginBottom:10}}>
              {state==="copied"?"✅ Copied to clipboard!":"💬 Share on WhatsApp"}
            </button>
            <div style={{fontSize:11,color:C.sub,textAlign:"center",marginBottom:12}}>Your friend plays without creating an account</div>
          </>
        )}

        <button onClick={onClose} style={{width:"100%",background:"transparent",border:`1px solid ${C.border}`,borderRadius:14,padding:"11px 0",color:C.muted,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
          Maybe Later
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CHALLENGE PLAY SCREEN — guest plays without account
// Shown when URL is /challenge/XXXXXX
// ═══════════════════════════════════════════════════════════════════════════
function ChallengePlay({ challengeId }) {
  const [stage,setStage]       = useState("loading"); // loading|name|playing|results|signup
  const [challenge,setChallenge]=useState(null);
  const [guestName,setGuestName]=useState("");
  const [cur,setCur]           = useState(0);
  const [answers,setAnswers]   = useState({});
  const [sel,setSel]           = useState(null);
  const [answered,setAnswered] = useState(false);
  const [results,setResults]   = useState(null);
  const [error,setError]       = useState("");
  const [submitting,setSubmitting]=useState(false);

  useEffect(()=>{
    fetchChallenge(challengeId)
      .then(d=>{ setChallenge(d); setStage("name"); })
      .catch(e=>{ setError(e.message); setStage("error"); });
  },[challengeId]);

  const startPlay = () => {
    if(!guestName.trim()){ alert("Please enter your name"); return; }
    setStage("playing"); setCur(0); setSel(null); setAnswered(false);
  };

  const handleAnswer = (letter) => {
    if(answered) return;
    setSel(letter);
    setAnswered(true);
    setAnswers(prev=>({...prev,[cur]:letter}));
  };

  const next = async () => {
    if(cur+1 < (challenge?.questions?.length||0)){
      setCur(c=>c+1); setSel(null); setAnswered(false);
    } else {
      // Submit all answers
      setSubmitting(true);
      try {
        const data = await submitChallenge(challengeId, answers, guestName.trim());
        setResults(data);
        setStage("results");
      } catch(e){ alert("Could not submit. Please try again."); }
      setSubmitting(false);
    }
  };

  const q = challenge?.questions?.[cur];
  const challenger = challenge?.challenger;

  if(stage==="loading") return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
      <div style={{fontSize:40,animation:"pulse 1.5s infinite"}}>🏆</div>
      <div style={{color:C.muted,fontSize:13}}>Loading challenge...</div>
    </div>
  );

  if(stage==="error") return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <Card style={{textAlign:"center",maxWidth:340}}>
        <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
        <div style={{fontWeight:800,color:C.red,marginBottom:8}}>Challenge not found</div>
        <div style={{fontSize:13,color:C.muted,marginBottom:16}}>{error}</div>
        <button onClick={()=>window.location.href="/"} style={{background:C.gold,border:"none",borderRadius:12,padding:"12px 28px",color:"#000",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Open ExamAce AI</button>
      </Card>
    </div>
  );

  if(stage==="name") return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:380}}>
        {/* ExamAce branding */}
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{width:56,height:56,background:`linear-gradient(135deg,${C.gold},${C.goldD})`,borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 10px",boxShadow:`0 0 24px ${C.gold}44`}}>🏆</div>
          <div style={{fontWeight:900,fontSize:22,color:C.textLight}}>ExamAce <span style={{color:C.gold}}>AI</span></div>
          <div style={{fontSize:11,color:C.sub,marginTop:2}}>Nigeria's #1 WAEC · NECO · JAMB Tutor</div>
        </div>

        <Card style={{background:`linear-gradient(135deg,${C.purple}22,${C.card})`,borderColor:C.purple+"44",marginBottom:12}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:6}}>⚔️</div>
            <div style={{fontWeight:900,fontSize:16,color:C.purple,marginBottom:4}}>You've been challenged!</div>
            <div style={{fontWeight:700,fontSize:14,color:C.textLight,marginBottom:8}}>
              {challenger?.name} scored <span style={{color:C.gold}}>{challenger?.score}/{challenger?.total} ({challenger?.pct}%)</span>
            </div>
            <div style={{fontSize:12,color:C.muted}}>
              {challenge?.exam} {challenge?.subject} {challenge?.year||""} · {challenge?.totalQ} questions
            </div>
          </div>
        </Card>

        <Card>
          <Label>Enter your name to play</Label>
          <Inp value={guestName} onChange={setGuestName} placeholder="e.g. Adaeze Okonkwo"/>
          <div style={{marginTop:12}}>
            <Btn onClick={startPlay} color={C.purple} tc="#fff">⚔️ Accept Challenge</Btn>
          </div>
          <div style={{marginTop:10,fontSize:11,color:C.sub,textAlign:"center"}}>No account needed · Takes about 3 minutes</div>
        </Card>
      </div>
    </div>
  );

  if(stage==="playing"&&q) return(
    <div style={{minHeight:"100vh",background:C.bg,padding:"16px 14px",paddingBottom:40}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:36,height:36,background:`linear-gradient(135deg,${C.gold},${C.goldD})`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🏆</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:14,color:C.textLight}}>ExamAce Challenge</div>
          <div style={{fontSize:11,color:C.muted}}>Beating {challenger?.name}'s {challenger?.pct}%</div>
        </div>
        <div style={{fontSize:12,color:C.gold,fontWeight:700}}>Q{cur+1}/{challenge.questions.length}</div>
      </div>

      {/* Progress */}
      <div style={{background:C.border,borderRadius:4,height:5,marginBottom:14}}>
        <div style={{background:C.purple,height:"100%",borderRadius:4,width:`${(cur/challenge.questions.length)*100}%`,transition:"width .4s"}}/>
      </div>

      {/* Question */}
      <Card style={{background:C.purple+"0a",borderColor:C.purple+"33",marginBottom:10}}>
        <div style={{fontSize:15,fontWeight:600,lineHeight:1.8,color:C.textLight}}>{q.q}</div>
      </Card>

      {/* Options */}
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
        {["A","B","C","D"].map(l=>{
          const t=(q.options||{})[l]||""; if(!t) return null;
          const isSel=sel===l;
          return(
            <button key={l} onClick={()=>handleAnswer(l)} style={{
              background:isSel?C.purple+"22":C.card,
              border:`2px solid ${isSel?C.purple:C.border}`,
              borderRadius:12,padding:"12px 14px",color:C.textLight,
              fontSize:13,textAlign:"left",cursor:answered?"default":"pointer",
              display:"flex",gap:10,alignItems:"center",fontFamily:"inherit"
            }}>
              <span style={{width:26,height:26,borderRadius:"50%",background:isSel?C.purple:C.card2,color:isSel?"#fff":C.muted,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,flexShrink:0}}>{l}</span>
              {t}
            </button>
          );
        })}
      </div>

      {answered&&(
        <button onClick={next} disabled={submitting} style={{width:"100%",background:C.purple,border:"none",borderRadius:14,padding:"14px 0",color:"#fff",fontWeight:900,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>
          {submitting?"Submitting...":(cur+1>=challenge.questions.length?"🏁 See Results →":"Next →")}
        </button>
      )}
    </div>
  );

  if(stage==="results"&&results) {
    const { summary } = results;
    const myPct = summary.pct;
    const theirPct = summary.challenger.pct;
    const myColor = summary.beat?C.green:summary.tied?C.gold:C.orange;

    return(
      <div style={{minHeight:"100vh",background:C.bg,padding:"20px 14px",paddingBottom:60}}>
        <style>{`*{box-sizing:border-box;margin:0;padding:0}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Result header */}
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:56,marginBottom:8,animation:"fadeUp .4s ease"}}>{summary.beat?"🏆":summary.tied?"🤝":"💪"}</div>
          <div style={{fontWeight:900,fontSize:20,color:myColor,marginBottom:6}}>{summary.message}</div>
          <div style={{fontSize:13,color:C.muted}}>{challenge.exam} {challenge.subject}</div>
        </div>

        {/* Score comparison */}
        <Card style={{marginBottom:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center",textAlign:"center"}}>
            <div>
              <div style={{fontSize:11,color:C.muted,marginBottom:4}}>{summary.guestName}</div>
              <div style={{fontWeight:900,fontSize:32,color:myColor}}>{summary.correct}</div>
              <div style={{fontSize:11,color:C.muted}}>/{summary.total}</div>
              <div style={{fontWeight:700,fontSize:14,color:myColor,marginTop:2}}>{myPct}%</div>
            </div>
            <div style={{fontSize:20,color:C.border}}>vs</div>
            <div>
              <div style={{fontSize:11,color:C.muted,marginBottom:4}}>{summary.challenger.name}</div>
              <div style={{fontWeight:900,fontSize:32,color:C.purple}}>{summary.challenger.score}</div>
              <div style={{fontSize:11,color:C.muted}}>/{summary.total}</div>
              <div style={{fontWeight:700,fontSize:14,color:C.purple,marginTop:2}}>{theirPct}%</div>
            </div>
          </div>
        </Card>

        {/* Question review */}
        <Card style={{marginBottom:16}}>
          <Label>Question Review</Label>
          {results.results.map((r,i)=>(
            <div key={i} style={{padding:"8px 0",borderBottom:`1px solid ${C.border}`,display:"flex",gap:8,alignItems:"flex-start"}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:r.correct?C.green+"22":C.red+"22",color:r.correct?C.green:C.red,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0,marginTop:2}}>{r.correct?"✓":"✗"}</div>
              <div>
                <div style={{fontSize:12,color:C.textLight,marginBottom:2,lineHeight:1.5}}>{r.q}</div>
                {!r.correct&&<div style={{fontSize:11,color:C.green}}>Answer: {r.answer} — {(r.options||{})[r.answer]}</div>}
                {r.explanation&&<div style={{fontSize:11,color:C.sub,marginTop:2,lineHeight:1.5}}>{r.explanation}</div>}
              </div>
            </div>
          ))}
        </Card>

        {/* Signup CTA */}
        <Card style={{background:`linear-gradient(135deg,${C.gold}22,${C.card})`,borderColor:C.gold+"44",textAlign:"center",marginBottom:12}}>
          <div style={{fontSize:24,marginBottom:6}}>🌟</div>
          <div style={{fontWeight:800,fontSize:15,color:C.gold,marginBottom:4}}>{summary.signupPrompt}</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:14,lineHeight:1.6}}>Track your progress, practice real past questions, and level up with AI tutoring — all free.</div>
          <button onClick={()=>window.location.href="/"} style={{width:"100%",background:C.gold,border:"none",borderRadius:14,padding:"14px 0",color:"#000",fontWeight:900,fontSize:15,cursor:"pointer",fontFamily:"inherit",marginBottom:8}}>
            🚀 Create Free Account
          </button>
          <div style={{fontSize:11,color:C.sub}}>Joins 1,000+ students preparing for WAEC · NECO · JAMB</div>
        </Card>
      </div>
    );
  }

  return null;
}

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
  const [tab,setTab]         = useState("ask");
  const [isOnline,setIsOnline]= useState(navigator.onLine);
  const [user,setUser]       = useState(()=>getUser());

  // Check if this is a challenge URL — /challenge/XXXXXX
  const challengeIdFromUrl = getChallengeIdFromUrl();
  const [showProfile,setShowProfile]= useState(false);
  const [xpEvents,setXpEvents]     = useState([]);
  const [showLevelUp,setShowLevelUp]= useState(null);

  // Register PWA service worker
  useEffect(()=>{
    if("serviceWorker" in navigator){
      navigator.serviceWorker.register("/service-worker.js").catch(()=>{});
    }
    const onOnline  = ()=>setIsOnline(true);
    const onOffline = ()=>setIsOnline(false);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    return()=>{window.removeEventListener("online",onOnline);window.removeEventListener("offline",onOffline);};
  },[]);

  // Save a quiz/CBT result to the server and award XP
  const handleSaveHistory = useCallback(async (entry) => {
    saveHistory(entry); // always save locally too
    // Update today's progress counter (drives home screen goal bar)
    const todayCorrect = Math.round(((entry.pct||0)/100) * (entry.total||0));
    updateTodayProgress(entry.total||0, todayCorrect, false);
    if(!getToken()) return;
    try {
      const data = await apiCall("/api/progress/save", "POST", entry);
      if(!data || data.error) { console.warn("Save returned error:", data?.error); return; }

      // Merge new server stats back into local user object
      const currentUser = getUser() || {};
      const updated = {
        ...currentUser,
        xp:             data.xp            ?? currentUser.xp,
        level:          data.level         ?? currentUser.level,
        currentStreak:  data.currentStreak ?? currentUser.currentStreak,
        longestStreak:  data.longestStreak ?? currentUser.longestStreak,
        achievements: [
          ...new Set([
            ...(currentUser.achievements || []),
            ...(data.newlyEarned || []).map(a => a.id),
          ])
        ],
        // Update stats directly so profile shows immediately without re-fetch
        stats: {
          ...(currentUser.stats || {}),
          quizzesCompleted: entry.type === "quiz"
            ? (currentUser.stats?.quizzesCompleted || 0) + 1
            : currentUser.stats?.quizzesCompleted || 0,
          cbtCompleted: entry.type === "cbt"
            ? (currentUser.stats?.cbtCompleted || 0) + 1
            : currentUser.stats?.cbtCompleted || 0,
          totalAnswered: (currentUser.stats?.totalAnswered || 0) + (entry.total || 0),
          totalCorrect:  (currentUser.stats?.totalCorrect  || 0) + Math.round(((entry.pct||0)/100) * (entry.total||0)),
          bestJAMB: Math.max(currentUser.stats?.bestJAMB || 0, entry.jambScore || 0),
          subjectsPracticed: entry.subject ? {
            ...(currentUser.stats?.subjectsPracticed || {}),
            [entry.subject]: (currentUser.stats?.subjectsPracticed?.[entry.subject] || 0) + 1,
          } : (currentUser.stats?.subjectsPracticed || {}),
          longestStreak: Math.max(currentUser.stats?.longestStreak || 0, data.longestStreak || 0),
        },
      };

      saveAuth(getToken(), updated);
      setUser(updated);

      // XP toast + level-up celebration
      const events = [];
      const xpEarned = (data.xp || 0) - (currentUser.xp || 0);
      if(xpEarned > 0) events.push({
        type: "xp",
        xp:   xpEarned,
        reason: entry.type === "cbt" ? "JAMB CBT completed" : `Quiz: ${entry.subject || ""}`,
      });
      if(data.newlyEarned?.length) data.newlyEarned.forEach(a => events.push({type:"achievement", ...a}));
      if(data.levelUp) setShowLevelUp(data.level);
      if(events.length) setXpEvents(events);

      console.log(`✅ Progress saved — XP: ${data.xp}, Level: ${data.level?.name}, Streak: ${data.currentStreak}`);
    } catch(e) {
      console.warn("Could not save progress to server:", e.message);
    }
  },[]);

  const handleAuth = (userData, newlyEarned=[]) => {
    setUser(userData);
    if(newlyEarned.length) setXpEvents(newlyEarned.map(a=>({type:"achievement",...a})));
    setXpEvents(prev=>[{type:"xp",xp:25,reason:"Welcome bonus!"},...prev]);
    // Pre-cache questions for offline use on login
    preCacheQuestionsForOffline(userData);
  };

  // Pre-cache the student's subjects × top exam types so questions work offline
  const preCacheQuestionsForOffline = async (userData) => {
    const subjects = userData?.subjects?.length > 0
      ? userData.subjects
      : ["Mathematics","English Language","Physics","Chemistry","Biology"];
    const exams = [userData?.exam || "WAEC"];
    // Fire-and-forget — cache in background without blocking UI
    setTimeout(async () => {
      for (const subject of subjects.slice(0,5)) {
        for (const exam of exams) {
          try {
            await fetchQuestions(subject, exam, null, 40);
            console.log(`📦 Cached offline: ${subject} ${exam}`);
          } catch(e) { /* silently ignore — user may be offline */ }
          // Small delay to avoid hammering the API
          await new Promise(r => setTimeout(r, 800));
        }
      }
      console.log("✅ Offline question cache ready");
    }, 2000); // Wait 2s after login before caching
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);        // triggers !user → AuthScreen shown immediately
    setShowProfile(false);
  };

  const handleProfileUpdate = (updated) => {
    saveAuth(getToken(), updated);
    setUser(updated);
  };

  const navDueCount = getDueReviews().length;

  // Navigate from home screen cards
  const handleHomeNav = (dest) => {
    if(dest==="practice") setTab("practice");
    else if(dest==="learn") setTab("learn");
    else if(dest==="career") setTab("career");
    else if(dest==="snap") setTab("ask");
    else if(dest==="study") setTab("learn");
    else setTab(dest);
  };

  // 4-tab navigation — clean, focused, no overload
  const TABS=[
    {id:"home",     icon:"🏠", label:"Home"    },
    {id:"ask",      icon:"💬", label:"Ask AI"  },
    {id:"practice", icon:"📝", label:"Practice"},
    {id:"learn",    icon:"🎓", label:"Learn",  badge:navDueCount},
    {id:"career",   icon:"🗺️", label:"Career"  },
    {id:"me",       icon:"👤", label:"Me"      },
  ];

  // If visiting a challenge link, show guest play screen (no login needed)
  if(challengeIdFromUrl) return <ChallengePlay challengeId={challengeIdFromUrl}/>;

  // Always show login screen if not logged in
  if(!user) return <AuthScreen onAuth={handleAuth}/>;
  // Show profile screen when requested
  if(showProfile) return <ProfileScreen user={user} onClose={()=>setShowProfile(false)} onLogout={handleLogout} onUpdate={handleProfileUpdate}/>;

  return (
    <ErrorBoundary>
    <div style={{minHeight:"100vh",background:C.bg,color:C.textLight,fontFamily:"'Segoe UI',sans-serif",paddingBottom:76}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}@keyframes slideIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#2a2d3e;border-radius:4px}textarea,input,select,button{box-sizing:border-box}input::placeholder,textarea::placeholder{color:#64748b}select option{background:#1e2130;color:#f1f5f9}`}</style>

      {/* XP Toast notifications */}
      <XPToast events={xpEvents} onClear={()=>setXpEvents([])}/>

      {/* Level-up modal */}
      {showLevelUp&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:998,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowLevelUp(null)}>
          <div style={{background:`linear-gradient(135deg,${showLevelUp.color}22,${C.card})`,border:`2px solid ${showLevelUp.color}`,borderRadius:24,padding:32,textAlign:"center",maxWidth:300,animation:"fadeUp .4s ease"}}>
            <div style={{fontSize:64,marginBottom:8}}>{showLevelUp.badge}</div>
            <div style={{fontWeight:900,fontSize:22,color:showLevelUp.color,marginBottom:4}}>Level Up! 🎉</div>
            <div style={{fontSize:16,color:C.textLight,marginBottom:12}}>{showLevelUp.name}</div>
            <button onClick={()=>setShowLevelUp(null)} style={{background:showLevelUp.color,border:"none",borderRadius:12,padding:"12px 28px",color:"#000",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Awesome! 🚀</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,#0a0c14,#12141e)`,borderBottom:`1px solid ${C.border}`,padding:"11px 14px",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 20px rgba(0,0,0,0.4)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,background:`linear-gradient(135deg,${C.gold},${C.goldD})`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:`0 0 20px ${C.gold}55`,flexShrink:0}}>🏆</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:900,fontSize:18,letterSpacing:"-0.5px",color:C.textLight}}>ExamAce <span style={{color:C.gold}}>AI</span></div>
            {user?(
              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:1}}>
                <span style={{fontSize:11,color:C.sub}}>{getLevelClient(user.xp||0).badge}</span>
                <span style={{fontSize:10,color:C.sub}}>{getLevelClient(user.xp||0).name}</span>
                <span style={{fontSize:10,color:C.gold,fontWeight:700}}>· {user.xp||0} XP</span>
                {(user.currentStreak||0)>0&&<span style={{fontSize:10,color:C.orange,fontWeight:700}}>🔥{user.currentStreak}d</span>}
              </div>
            ):(
              <div style={{fontSize:10,color:C.sub,textTransform:"uppercase",letterSpacing:1.2}}>WAEC · NECO · JAMB 🇳🇬</div>
            )}
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <button onClick={()=>setShowProfile(true)} style={{background:C.gold+"22",border:`1px solid ${C.gold}44`,color:C.gold,borderRadius:20,padding:"5px 12px",fontSize:10,fontWeight:800,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
              👤 {user.name?.split(" ")[0]||"Profile"}
            </button>
          </div>
        </div>
      </div>

      {/* Offline banner */}
      {!isOnline&&(
        <div style={{background:C.orange+"22",borderBottom:`1px solid ${C.orange}44`,padding:"8px 14px",display:"flex",alignItems:"center",gap:8,fontSize:12,color:C.orange,fontWeight:700}}>
          <span>📵</span>
          <span>You're offline — quiz history and saved questions still available</span>
        </div>
      )}

      {/* Tab content */}
      <div style={{padding:"14px 13px 0",animation:"fadeUp .3s ease"}}>
        {tab==="home"     &&<HomeScreen user={user} onNavigate={handleHomeNav} onAnswered={(r)=>{
  updateTodayProgress(1, r.correct?1:0, false);
}}/>}
        {tab==="ask"      &&<AskAI/>}
        {tab==="practice" &&<PracticeHub onSaveHistory={handleSaveHistory}/>}
        {tab==="learn"    &&<LearnHub user={user}/>}
        {tab==="career"   &&<CareerCounsellor/>}
        {tab==="me"       &&<MeTab user={user} onUpdate={handleProfileUpdate} onLogout={handleLogout}/>}
      </div>

      {/* Bottom nav */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#0a0c14",borderTop:`1px solid ${C.border}`,display:"flex",zIndex:100,boxShadow:"0 -4px 20px rgba(0,0,0,0.4)"}}>
        {TABS.map(t=>(
          <div key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 0 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer",borderTop:tab===t.id?`2px solid ${C.gold}`:"2px solid transparent",color:tab===t.id?C.gold:C.sub,fontSize:9,fontWeight:tab===t.id?800:400,transition:"all .2s",minWidth:46}}>
            <span style={{fontSize:18}}>{t.icon}</span>{t.label}
          {t.badge>0&&<span style={{position:"absolute",top:6,right:"calc(50% - 16px)",background:C.purple,color:"#fff",borderRadius:"50%",width:13,height:13,fontSize:8,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>{t.badge>9?"9+":t.badge}</span>}
          </div>
        ))}
      </div>
    </div>
    </ErrorBoundary>
  );
}