/* eslint-disable */
import { useState, useRef, useEffect, useCallback } from "react";

// ── THEME ─────────────────────────────────────────────────────────────────────
const C = {
  bg:"#0f1117", card:"#16181f", card2:"#1e2130", border:"#2a2d3e",
  gold:"#f5c842", goldD:"#c49b1a",
  green:"#22c55e", greenD:"#15803d", greenL:"#f0fdf4",
  blue:"#3b82f6", blueD:"#1d4ed8",
  purple:"#a855f7", purpleD:"#7e22ce",
  red:"#ef4444", redD:"#b91c1c",
  orange:"#f97316", orangeD:"#c2410c",
  sky:"#38bdf8", teal:"#14b8a6", pink:"#ec4899",
  wa:"#25D366", waD:"#075E54",
  textLight:"#f1f5f9", textDark:"#0f172a", muted:"#94a3b8", sub:"#64748b",
};

// ── DATA ──────────────────────────────────────────────────────────────────────
const EXAMS = ["WAEC","NECO","JAMB"];
const YEARS = ["2024","2023","2022","2021","2020","2019","2018","2017","2016","2015","2014","2012","2010","2008","2005","2003","2000"];
const SUBJECTS = ["Mathematics","English Language","Physics","Chemistry","Biology","Economics","Government","Literature in English","Accounting","Commerce","Geography","Agricultural Science","Further Mathematics","Civic Education","Christian Religious Studies","Islamic Studies"];
const EXAM_DATES = { "WAEC 2025":new Date("2025-05-05"), "NECO 2025":new Date("2025-06-16"), "JAMB 2025":new Date("2025-04-26") };
const SYLLABUS = {
  Mathematics:["Number & Numeration","Algebraic Processes","Geometry & Mensuration","Trigonometry","Statistics & Probability","Calculus","Matrices & Transformation","Vectors","Modular Arithmetic","Sets & Logic"],
  "English Language":["Comprehension","Summary Writing","Continuous Writing","Lexis & Structure","Oral English","Register & Figures of Speech","Tense & Agreement","Vocabulary Development"],
  Physics:["Mechanics","Thermal Physics","Waves & Sound","Light & Optics","Electricity & Magnetism","Atomic & Nuclear Physics","Electronics","Energy & Power"],
  Chemistry:["Atomic Structure & Bonding","Stoichiometry","Acids Bases & Salts","Electrochemistry","Organic Chemistry","Chemical Kinetics","Equilibrium","Metals & Non-metals"],
  Biology:["Cell Biology","Genetics & Evolution","Ecology","Nutrition & Digestion","Transport","Respiration","Reproduction","Excretion","Coordination","Diseases & Immunity"],
  Economics:["Demand Supply & Elasticity","Market Structures","National Income","Money Banking & Finance","Public Finance","International Trade","Population & Labour"],
  Government:["Constitution & Federalism","Legislature Executive & Judiciary","Electoral Systems","International Relations","Nigerian Political History","Citizenship"],
};

// JAMB CBT exact structure — 4 subjects, 40 questions each, 100 mins total
const JAMB_SUBJECTS = [
  { name:"Use of English",   color:C.blue,   icon:"📝", count:40, mins:25 },
  { name:"Mathematics",      color:C.orange, icon:"📐", count:40, mins:25 },
  { name:"Physics",          color:C.purple, icon:"⚡", count:40, mins:25 },
  { name:"Chemistry",        color:C.green,  icon:"🧪", count:40, mins:25 },
];
// Students can swap subject 3 & 4
const JAMB_ALT_SUBJECTS = ["Biology","Economics","Government","Literature in English","Geography","Agricultural Science","Accounting","Commerce","Christian Religious Studies","Islamic Studies"];

// Periodic table data
const PERIODIC = [
  {s:"H",n:"Hydrogen",a:1,m:"1.008",g:"Nonmetal"},{s:"He",n:"Helium",a:2,m:"4.003",g:"Noble Gas"},
  {s:"Li",n:"Lithium",a:3,m:"6.941",g:"Alkali Metal"},{s:"Be",n:"Beryllium",a:4,m:"9.012",g:"Alkaline Earth"},
  {s:"B",n:"Boron",a:5,m:"10.81",g:"Metalloid"},{s:"C",n:"Carbon",a:6,m:"12.01",g:"Nonmetal"},
  {s:"N",n:"Nitrogen",a:7,m:"14.01",g:"Nonmetal"},{s:"O",n:"Oxygen",a:8,m:"16.00",g:"Nonmetal"},
  {s:"F",n:"Fluorine",a:9,m:"19.00",g:"Halogen"},{s:"Ne",n:"Neon",a:10,m:"20.18",g:"Noble Gas"},
  {s:"Na",n:"Sodium",a:11,m:"22.99",g:"Alkali Metal"},{s:"Mg",n:"Magnesium",a:12,m:"24.31",g:"Alkaline Earth"},
  {s:"Al",n:"Aluminium",a:13,m:"26.98",g:"Post-Transition"},{s:"Si",n:"Silicon",a:14,m:"28.09",g:"Metalloid"},
  {s:"P",n:"Phosphorus",a:15,m:"30.97",g:"Nonmetal"},{s:"S",n:"Sulphur",a:16,m:"32.06",g:"Nonmetal"},
  {s:"Cl",n:"Chlorine",a:17,m:"35.45",g:"Halogen"},{s:"Ar",n:"Argon",a:18,m:"39.95",g:"Noble Gas"},
  {s:"K",n:"Potassium",a:19,m:"39.10",g:"Alkali Metal"},{s:"Ca",n:"Calcium",a:20,m:"40.08",g:"Alkaline Earth"},
  {s:"Fe",n:"Iron",a:26,m:"55.85",g:"Transition"},{s:"Cu",n:"Copper",a:29,m:"63.55",g:"Transition"},
  {s:"Zn",n:"Zinc",a:30,m:"65.38",g:"Transition"},{s:"Br",n:"Bromine",a:35,m:"79.90",g:"Halogen"},
  {s:"Ag",n:"Silver",a:47,m:"107.9",g:"Transition"},{s:"I",n:"Iodine",a:53,m:"126.9",g:"Halogen"},
  {s:"Au",n:"Gold",a:79,m:"197.0",g:"Transition"},{s:"Hg",n:"Mercury",a:80,m:"200.6",g:"Transition"},
  {s:"Pb",n:"Lead",a:82,m:"207.2",g:"Post-Transition"},{s:"U",n:"Uranium",a:92,m:"238.0",g:"Actinide"},
];
const elemColor = g => ({
  "Alkali Metal":"#ef4444","Alkaline Earth":"#f97316","Transition":"#a855f7",
  "Post-Transition":"#6b7280","Metalloid":"#14b8a6","Nonmetal":"#22c55e",
  "Halogen":"#f59e0b","Noble Gas":"#3b82f6","Actinide":"#ec4899"
}[g] || "#64748b");

// Math formulas
const FORMULAS = [
  { cat:"Algebra", items:[
    { name:"Quadratic Formula", f:"x = (-b ± √(b²-4ac)) / 2a" },
    { name:"Difference of Squares", f:"a² - b² = (a+b)(a-b)" },
    { name:"Perfect Square", f:"(a+b)² = a² + 2ab + b²" },
    { name:"Sum of AP", f:"Sn = n/2(2a + (n-1)d)" },
    { name:"nth term of AP", f:"Un = a + (n-1)d" },
    { name:"Sum of GP", f:"Sn = a(rⁿ-1)/(r-1)" },
  ]},
  { cat:"Geometry", items:[
    { name:"Circle Area", f:"A = πr²" },
    { name:"Circle Circumference", f:"C = 2πr" },
    { name:"Sphere Volume", f:"V = 4/3 πr³" },
    { name:"Cylinder Volume", f:"V = πr²h" },
    { name:"Pythagoras", f:"c² = a² + b²" },
    { name:"Triangle Area", f:"A = ½bh" },
  ]},
  { cat:"Trigonometry", items:[
    { name:"SOH CAH TOA", f:"sin=O/H, cos=A/H, tan=O/A" },
    { name:"Sine Rule", f:"a/sinA = b/sinB = c/sinC" },
    { name:"Cosine Rule", f:"a² = b² + c² - 2bc·cosA" },
    { name:"sin²θ + cos²θ", f:"= 1" },
    { name:"Area of Triangle", f:"A = ½ab·sinC" },
  ]},
  { cat:"Statistics", items:[
    { name:"Mean", f:"x̄ = Σx / n" },
    { name:"Variance", f:"σ² = Σ(x-x̄)² / n" },
    { name:"Standard Deviation", f:"σ = √(Σ(x-x̄)²/n)" },
    { name:"Probability", f:"P(A) = n(A) / n(S)" },
    { name:"Permutation", f:"nPr = n! / (n-r)!" },
    { name:"Combination", f:"nCr = n! / r!(n-r)!" },
  ]},
  { cat:"Physics", items:[
    { name:"Newton's 2nd Law", f:"F = ma" },
    { name:"Kinetic Energy", f:"KE = ½mv²" },
    { name:"Potential Energy", f:"PE = mgh" },
    { name:"Ohm's Law", f:"V = IR" },
    { name:"Wave Speed", f:"v = fλ" },
    { name:"Power", f:"P = W/t = IV" },
    { name:"Pressure", f:"P = F/A" },
    { name:"Velocity", f:"v = u + at" },
    { name:"Displacement", f:"s = ut + ½at²" },
  ]},
];

// Unit conversions
const CONVERSIONS = {
  Length: [
    { from:"km",  to:"m",   factor:1000 },
    { from:"m",   to:"cm",  factor:100 },
    { from:"cm",  to:"mm",  factor:10 },
    { from:"mile",to:"km",  factor:1.609 },
    { from:"inch",to:"cm",  factor:2.54 },
  ],
  Mass: [
    { from:"kg",  to:"g",   factor:1000 },
    { from:"g",   to:"mg",  factor:1000 },
    { from:"tonne",to:"kg", factor:1000 },
    { from:"lb",  to:"kg",  factor:0.4536 },
  ],
  Temperature: [
    { from:"°C", to:"°F",  formula:"(x × 9/5) + 32" },
    { from:"°F", to:"°C",  formula:"(x - 32) × 5/9" },
    { from:"°C", to:"K",   formula:"x + 273.15" },
    { from:"K",  to:"°C",  formula:"x - 273.15" },
  ],
  Energy: [
    { from:"J",   to:"kJ",  factor:0.001 },
    { from:"kJ",  to:"J",   factor:1000 },
    { from:"cal", to:"J",   factor:4.184 },
    { from:"eV",  to:"J",   factor:1.602e-19 },
  ],
  Pressure: [
    { from:"Pa",  to:"kPa", factor:0.001 },
    { from:"atm", to:"Pa",  factor:101325 },
    { from:"bar", to:"Pa",  factor:100000 },
    { from:"mmHg",to:"Pa",  factor:133.3 },
  ],
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const toBase64 = f => new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(f);});
const ts = ()=>new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
const callClaude = async (messages, system, imgData) => {
  let msgs = messages;
  if (imgData) {
    const txt = typeof messages==="string"?messages:Array.isArray(messages)?(messages[messages.length-1]?.content||""):"";
    msgs=[{role:"user",content:[{type:"image",source:{type:"base64",media_type:imgData.type,data:imgData.data}},{type:"text",text:txt}]}];
  } else if (typeof messages==="string") msgs=[{role:"user",content:messages}];
  const body={model:"claude-sonnet-4-20250514",max_tokens:1000,messages:msgs};
  if(system)body.system=system;
  const res=await fetch("https://examace-backend.onrender.com/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const d=await res.json();
  return d.content?.find(b=>b.type==="text")?.text||"Could not process. Please try again.";
};
const SYS=(exam,subject,year)=>`You are ExamAce AI — Nigeria's #1 ${exam}/NECO/JAMB exam tutor. Context: ${exam}·${subject}${year?`·${year} style`:""}. Follow official Nigerian ${exam} syllabus strictly. Format: **bold** key terms, numbered steps, short paragraphs. Be warm, expert, encouraging.`;

// ── TEXT FORMATTER ─────────────────────────────────────────────────────────────
const fmt=(text,onDark=true)=>{
  const hc=onDark?C.gold:"#92400e", bc=onDark?"#ffffff":"#1e293b", body=onDark?"#e2e8f0":"#1e293b", codeBg=onDark?"#0a0c14":"#e2e8f0", codeC=onDark?"#f1f5f9":"#1e293b", hr=onDark?"#2a2d3e":"#cbd5e1";
  return text.split("\n").map((l,i)=>{
    let html=l
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

// ── UI ATOMS ──────────────────────────────────────────────────────────────────
const Card=({children,style={}})=><div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:16,marginBottom:14,...style}}>{children}</div>;
const Label=({c=C.muted,children})=><div style={{fontSize:11,fontWeight:800,color:c,textTransform:"uppercase",letterSpacing:1.2,marginBottom:7}}>{children}</div>;
const Inp=({value,onChange,placeholder,multiline,rows,type="text"})=>multiline
  ?<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows||5} style={{width:"100%",background:C.card2,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"11px 14px",color:C.textLight,fontSize:13,outline:"none",fontFamily:"inherit",resize:"vertical",lineHeight:1.6}}/>
  :<input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type} style={{width:"100%",background:C.card2,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"11px 14px",color:C.textLight,fontSize:13,outline:"none",fontFamily:"inherit"}}/>;
const Pills=({options,value,onChange,color=C.gold})=><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{options.map(o=><button key={o} onClick={()=>onChange(o)} style={{background:value===o?color+"28":"transparent",border:`1.5px solid ${value===o?color:C.border}`,borderRadius:20,padding:"6px 14px",color:value===o?color:C.muted,fontWeight:value===o?800:400,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{o}</button>)}</div>;
const Sel=({value,onChange,options,placeholder})=><select value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",background:C.card2,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"11px 14px",color:value?C.textLight:C.sub,fontSize:13,outline:"none",fontFamily:"inherit"}}><option value="">{placeholder||"Select..."}</option>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>;
const Btn=({onClick,loading:l,children,color=C.gold,tc="#000",disabled,sm})=><button onClick={onClick} disabled={l||disabled} style={{width:sm?"auto":"100%",background:l||disabled?C.card2:color,border:"none",borderRadius:sm?10:13,padding:sm?"8px 18px":"14px 20px",color:l||disabled?C.sub:tc,fontWeight:800,fontSize:sm?12:14,cursor:l||disabled?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit"}}>{l?<><span style={{width:15,height:15,border:"2px solid #444",borderTopColor:color,borderRadius:"50%",display:"inline-block",animation:"spin .7s linear infinite"}}/>Working...</>:children}</button>;
const Out=({text,color=C.gold})=><div style={{background:C.card2,border:`1px solid ${color}33`,borderRadius:14,padding:16,maxHeight:460,overflowY:"auto",fontSize:13,marginTop:12,animation:"fadeUp .4s ease"}}>{fmt(text,true)}</div>;

// ── JAMB CBT ──────────────────────────────────────────────────────────────────
function JambCBT() {
  const [screen, setScreen] = useState("setup"); // setup | test | result
  const [subjects, setSubjects] = useState(["Use of English","Mathematics","Physics","Chemistry"]);
  const [allQs, setAllQs] = useState({}); // {subjectName: [{q,options,answer,...}]}
  const [curSubj, setCurSubj] = useState(0);
  const [curQ, setCurQ] = useState(0);
  const [answers, setAnswers] = useState({}); // {subjectName: {qIndex: letter}}
  const [flagged, setFlagged] = useState({}); // {subjectName: Set of indices}
  const [timeLeft, setTimeLeft] = useState(100 * 60); // 100 mins
  const [loading, setLoading] = useState(false);
  const [loadingSubj, setLoadingSubj] = useState("");
  const [scores, setScores] = useState({});
  const [reviewing, setReviewing] = useState(null);
  const timerRef = useRef();

  useEffect(() => {
    if (screen === "test") {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); submitAll(); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [screen]);

  const fmtTime = s => `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const generateSubject = async (subj) => {
    setLoadingSubj(subj);
    const p = `Generate exactly 40 JAMB-style MCQ questions for "${subj}" strictly following the official JAMB syllabus. Mix difficulty: 40% easy, 40% medium, 20% hard. Use authentic JAMB question style. Nigerian context where applicable.
Return ONLY valid JSON array:
[{"q":"question text","options":{"A":"","B":"","C":"","D":""},"answer":"A","explanation":"why A is correct per JAMB marking","topic":"topic name","difficulty":"easy|medium|hard"}]`;
    try {
      const text = await callClaude(p, `You are an official JAMB examiner for ${subj}. Follow JAMB syllabus strictly.`);
      const clean = text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean.slice(clean.indexOf("["),clean.lastIndexOf("]")+1));
      return parsed.slice(0,40);
    } catch { return null; }
  };

  const startTest = async () => {
    setLoading(true);
    const generated = {};
    for (const s of subjects) {
      const qs = await generateSubject(s);
      if (qs) generated[s] = qs;
      else generated[s] = [];
    }
    setAllQs(generated);
    setAnswers({});
    setFlagged({});
    setCurSubj(0);
    setCurQ(0);
    setTimeLeft(100 * 60);
    setScreen("test");
    setLoading(false);
  };

  const submitAll = () => {
    clearInterval(timerRef.current);
    const sc = {};
    subjects.forEach(s => {
      const qs = allQs[s] || [];
      const ans = answers[s] || {};
      sc[s] = { correct: qs.filter((q,i) => ans[i] === q.answer).length, total: qs.length };
    });
    setScores(sc);
    setScreen("result");
  };

  const setAnswer = (letter) => {
    const s = subjects[curSubj];
    setAnswers(a => ({ ...a, [s]: { ...(a[s]||{}), [curQ]: letter } }));
  };

  const toggleFlag = () => {
    const s = subjects[curSubj];
    setFlagged(f => {
      const set = new Set(f[s]||[]);
      set.has(curQ) ? set.delete(curQ) : set.add(curQ);
      return { ...f, [s]: set };
    });
  };

  const totalScore = () => Object.values(scores).reduce((s,v)=>s+v.correct,0);
  const totalQ = () => Object.values(scores).reduce((s,v)=>s+v.total,0);
  const jambScore = () => Math.round((totalScore()/totalQ())*400);

  const q = allQs[subjects[curSubj]]?.[curQ];
  const curAns = answers[subjects[curSubj]]?.[curQ];
  const isFlagged = (flagged[subjects[curSubj]]||new Set()).has(curQ);
  const answeredCount = Object.values(answers[subjects[curSubj]]||{}).length;
  const subjQs = allQs[subjects[curSubj]]||[];

  return (
    <div>
      {/* SETUP */}
      {screen==="setup" && (
        <>
          <Card style={{background:`linear-gradient(135deg,#1a0a2e,${C.card})`,borderColor:C.purple+"44"}}>
            <div style={{fontSize:28,marginBottom:4}}>🖥️</div>
            <div style={{fontWeight:900,fontSize:17,color:C.purple,marginBottom:3}}>JAMB CBT Mock Exam</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>Authentic JAMB Computer-Based Test experience. 4 subjects · 40 questions each · 100 minutes · 400 marks total. Auto-submits when time expires.</div>
          </Card>

          <Card>
            <Label c={C.purple}>Subject 1 — Compulsory</Label>
            <div style={{background:C.purple+"22",border:`1px solid ${C.purple}44`,borderRadius:10,padding:"10px 14px",color:C.purple,fontWeight:700,fontSize:13}}>📝 Use of English (Compulsory for all)</div>
          </Card>

          <Card>
            <Label c={C.purple}>Subject 2</Label>
            <Sel value={subjects[1]} onChange={v=>setSubjects(s=>[s[0],v,s[2],s[3]])} options={["Mathematics","Further Mathematics"]} placeholder="Select"/>
          </Card>

          <Card>
            <Label c={C.purple}>Subject 3</Label>
            <Sel value={subjects[2]} onChange={v=>setSubjects(s=>[s[0],s[1],v,s[3]])} options={["Physics","Biology","Chemistry","Economics","Government","Literature in English","Geography","Agricultural Science","Accounting","Commerce","Christian Religious Studies","Islamic Studies"]} placeholder="Select"/>
          </Card>

          <Card>
            <Label c={C.purple}>Subject 4</Label>
            <Sel value={subjects[3]} onChange={v=>setSubjects(s=>[s[0],s[1],s[2],v])} options={["Chemistry","Biology","Physics","Economics","Government","Literature in English","Geography","Agricultural Science","Accounting","Commerce","Christian Religious Studies","Islamic Studies"]} placeholder="Select"/>
          </Card>

          <Card style={{background:C.purple+"11",borderColor:C.purple+"33"}}>
            <Label c={C.purple}>Your JAMB Combination</Label>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {subjects.map((s,i)=>(
                <div key={i} style={{display:"flex",gap:10,alignItems:"center",background:C.card2,borderRadius:10,padding:"8px 12px"}}>
                  <span style={{width:22,height:22,background:C.purple,color:"#fff",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>{i+1}</span>
                  <span style={{fontSize:13,color:C.textLight,fontWeight:600}}>{s}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{background:"#0a1628",borderColor:C.blue+"33"}}>
            <Label c={C.sky}>📋 JAMB CBT Rules</Label>
            {["100 minutes for all 4 subjects (400 questions total)","40 questions per subject","Each correct answer = 1 mark out of 400","You can navigate between questions freely","Flag questions to review later","Test auto-submits when time expires","Target score: 280+ for top universities"].map((r,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:6,fontSize:12,color:"#93c5fd"}}>
                <span style={{color:C.blue,fontWeight:700,flexShrink:0}}>→</span>{r}
              </div>
            ))}
          </Card>

          <Btn onClick={startTest} loading={loading} color={C.purple} tc="#fff">
            {loading ? `Generating ${loadingSubj} questions...` : "🖥️ Start JAMB CBT Mock"}
          </Btn>
        </>
      )}

      {/* TEST INTERFACE */}
      {screen==="test" && q && (
        <div style={{animation:"fadeUp .3s ease"}}>
          {/* Top bar */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"10px 14px",marginBottom:10,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <div style={{background:timeLeft<600?C.red:timeLeft<1800?C.orange:C.green,color:"#fff",borderRadius:10,padding:"6px 14px",fontWeight:900,fontSize:15,fontFamily:"monospace",animation:timeLeft<300?"pulse .5s infinite":"none"}}>
              ⏱ {fmtTime(timeLeft)}
            </div>
            <div style={{flex:1,display:"flex",gap:6,overflowX:"auto"}}>
              {subjects.map((s,i)=>(
                <button key={i} onClick={()=>{setCurSubj(i);setCurQ(0);}} style={{background:curSubj===i?JAMB_SUBJECTS.find(j=>j.name===s)?.color||C.purple:C.card2,border:`1px solid ${curSubj===i?JAMB_SUBJECTS.find(j=>j.name===s)?.color||C.purple:C.border}`,borderRadius:8,padding:"5px 10px",color:curSubj===i?"#fff":C.muted,fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,fontFamily:"inherit"}}>
                  {s.split(" ")[0]} ({Object.values(answers[s]||{}).length}/40)
                </button>
              ))}
            </div>
            <button onClick={submitAll} style={{background:C.red,border:"none",borderRadius:8,padding:"6px 12px",color:"#fff",fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>Submit</button>
          </div>

          {/* Question navigator */}
          <Card style={{padding:10}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:700,marginBottom:6}}>{subjects[curSubj]} — Q{curQ+1}/40</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {subjQs.map((_,i)=>{
                const ans = answers[subjects[curSubj]]?.[i];
                const fl = (flagged[subjects[curSubj]]||new Set()).has(i);
                return (
                  <button key={i} onClick={()=>setCurQ(i)} style={{width:28,height:28,borderRadius:6,border:`1.5px solid ${curQ===i?C.gold:fl?C.orange:ans?C.green:C.border}`,background:curQ===i?C.gold:fl?C.orange+"22":ans?C.green+"22":C.card2,color:curQ===i?"#000":fl?C.orange:ans?C.green:C.muted,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                    {i+1}
                  </button>
                );
              })}
            </div>
            <div style={{display:"flex",gap:12,marginTop:8,fontSize:10,color:C.muted}}>
              <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,background:C.green+"44",border:`1px solid ${C.green}`,borderRadius:2,display:"inline-block"}}/>Answered</span>
              <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,background:C.orange+"44",border:`1px solid ${C.orange}`,borderRadius:2,display:"inline-block"}}/>Flagged</span>
              <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,background:C.card2,border:`1px solid ${C.border}`,borderRadius:2,display:"inline-block"}}/>Unanswered</span>
            </div>
          </Card>

          {/* Question */}
          <Card style={{background:C.blue+"11",borderColor:C.blue+"44"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontSize:11,fontWeight:800,color:C.blue}}>{subjects[curSubj]} · Q{curQ+1}</div>
              <button onClick={toggleFlag} style={{background:isFlagged?C.orange+"22":"transparent",border:`1px solid ${isFlagged?C.orange:C.border}`,borderRadius:8,padding:"4px 10px",color:isFlagged?C.orange:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{isFlagged?"🚩 Flagged":"🏳️ Flag"}</button>
            </div>
            <div style={{fontSize:15,fontWeight:600,lineHeight:1.7,color:C.textLight}}>{q.q}</div>
          </Card>

          {/* Options */}
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {Object.entries(q.options).map(([letter,text])=>(
              <button key={letter} onClick={()=>setAnswer(letter)}
                style={{background:curAns===letter?C.purple+"33":C.card,border:`2px solid ${curAns===letter?C.purple:C.border}`,borderRadius:14,padding:"13px 16px",color:curAns===letter?C.purple:C.textLight,fontSize:13,textAlign:"left",cursor:"pointer",display:"flex",gap:12,alignItems:"center",fontFamily:"inherit",transition:"all .15s"}}>
                <span style={{width:30,height:30,borderRadius:"50%",background:curAns===letter?C.purple:C.card2,color:curAns===letter?"#fff":C.muted,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,flexShrink:0}}>{letter}</span>
                <span style={{flex:1,lineHeight:1.4}}>{text}</span>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div style={{display:"flex",gap:8,marginTop:14}}>
            <button onClick={()=>setCurQ(q=>Math.max(0,q-1))} disabled={curQ===0} style={{flex:1,background:C.card2,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 0",color:C.muted,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>← Prev</button>
            {curQ<39
              ? <button onClick={()=>setCurQ(q=>Math.min(39,q+1))} style={{flex:2,background:C.blue,border:"none",borderRadius:12,padding:"12px 0",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Next →</button>
              : curSubj<subjects.length-1
                ? <button onClick={()=>{setCurSubj(s=>s+1);setCurQ(0);}} style={{flex:2,background:C.purple,border:"none",borderRadius:12,padding:"12px 0",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Next Subject →</button>
                : <button onClick={submitAll} style={{flex:2,background:C.green,border:"none",borderRadius:12,padding:"12px 0",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>✅ Submit All</button>}
          </div>
        </div>
      )}

      {/* RESULTS */}
      {screen==="result" && (
        <div style={{animation:"fadeUp .4s ease"}}>
          {/* Score card */}
          <Card style={{background:`linear-gradient(135deg,${C.purple}22,${C.card})`,borderColor:C.purple+"44",textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:8}}>{jambScore()>=280?"🏆":jambScore()>=200?"✅":"💪"}</div>
            <div style={{fontWeight:900,fontSize:48,color:C.purple}}>{jambScore()}</div>
            <div style={{fontSize:14,color:C.muted,marginBottom:4}}>out of 400</div>
            <div style={{fontWeight:700,fontSize:16,color:jambScore()>=280?C.green:jambScore()>=200?C.gold:C.red}}>
              {jambScore()>=280?"🎓 University Admission Worthy!":jambScore()>=200?"📚 Keep Pushing — Almost There!":"🔄 More Practice Needed"}
            </div>
          </Card>

          {/* Per subject breakdown */}
          <Card>
            <Label c={C.purple}>Subject Breakdown</Label>
            {subjects.map(s=>{
              const sc=scores[s]||{correct:0,total:40};
              const p=Math.round((sc.correct/sc.total)*100);
              return(
                <div key={s} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{fontSize:13,fontWeight:700,color:C.textLight}}>{s}</span>
                    <span style={{fontSize:13,fontWeight:900,color:p>=70?C.green:p>=50?C.gold:C.red}}>{sc.correct}/{sc.total} ({p}%)</span>
                  </div>
                  <div style={{background:C.border,borderRadius:6,height:8}}>
                    <div style={{background:p>=70?C.green:p>=50?C.gold:C.red,height:"100%",borderRadius:6,width:`${p}%`,transition:"width 1s"}}/>
                  </div>
                </div>
              );
            })}
          </Card>

          {/* JAMB score bands */}
          <Card style={{background:"#0a1628",borderColor:C.blue+"33"}}>
            <Label c={C.sky}>🎓 University Admission Guide</Label>
            {[["320-400","University of Lagos, UI, OAU, ABU (Medicine, Law, Engineering)"],["280-319","Most Federal Universities (Science & Arts courses)"],["250-279","State Universities, Polytechnics (most courses)"],["200-249","Most Polytechnics and some State Universities"],["Below 200","Additional preparation recommended"]].map(([range,unis])=>(
              <div key={range} style={{display:"flex",gap:10,marginBottom:8,padding:"8px 10px",background:C.card2,borderRadius:8}}>
                <span style={{fontWeight:800,fontSize:12,color:C.gold,flexShrink:0,minWidth:70}}>{range}</span>
                <span style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{unis}</span>
              </div>
            ))}
          </Card>

          {/* Review wrong answers */}
          <Card>
            <Label>Review Wrong Answers</Label>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
              {subjects.map(s=>(
                <button key={s} onClick={()=>setReviewing(reviewing===s?null:s)} style={{background:reviewing===s?C.purple+"22":"transparent",border:`1px solid ${reviewing===s?C.purple:C.border}`,borderRadius:20,padding:"5px 12px",color:reviewing===s?C.purple:C.muted,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{s}</button>
              ))}
            </div>
            {reviewing && (allQs[reviewing]||[]).map((q,i)=>{
              const userAns=answers[reviewing]?.[i];
              if(userAns===q.answer)return null;
              return(
                <div key={i} style={{background:C.red+"11",border:`1px solid ${C.red}33`,borderRadius:10,padding:12,marginBottom:8}}>
                  <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Q{i+1} · {q.topic}</div>
                  <div style={{fontSize:13,color:C.textLight,marginBottom:6,lineHeight:1.5}}>{q.q}</div>
                  <div style={{fontSize:12,color:C.red,marginBottom:4}}>Your answer: {userAns||"Not answered"} · Correct: {q.answer}</div>
                  <div style={{fontSize:12,color:C.green,lineHeight:1.6}}>{q.explanation}</div>
                </div>
              );
            })}
          </Card>

          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setScreen("setup")} style={{flex:1,background:C.card2,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 0",color:C.muted,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>🔄 New CBT</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(`🖥️ JAMB CBT Mock Result!\nScore: ${jambScore()}/400\n${subjects.map(s=>`${s}: ${scores[s]?.correct||0}/40`).join("\n")}\n\nPrepare with ExamAce AI 🏆`)}`} target="_blank" rel="noreferrer" style={{flex:1,background:C.wa,borderRadius:12,padding:"13px 0",color:"#fff",fontWeight:800,fontSize:13,textAlign:"center",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>💬 Share Score</a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PRACTICE TOOLS ────────────────────────────────────────────────────────────
function PracticeTools() {
  const [tool, setTool] = useState("calc");

  // Calculator state
  const [calcDisplay, setCalcDisplay] = useState("0");
  const [calcExpr, setCalcExpr] = useState("");
  const [calcMem, setCalcMem] = useState(0);
  const [calcDeg, setCalcDeg] = useState(true);

  // Periodic table state
  const [selElem, setSelElem] = useState(null);

  // Formula state
  const [formulaCat, setFormulaCat] = useState("Algebra");

  // Unit converter state
  const [convCat, setConvCat] = useState("Length");
  const [convFrom, setConvFrom] = useState("");
  const [convTo, setConvTo] = useState("");
  const [convVal, setConvVal] = useState("");
  const [convResult, setConvResult] = useState("");

  // Spelling trainer state
  const [spellWord, setSpellWord] = useState(null);
  const [spellInput, setSpellInput] = useState("");
  const [spellResult, setSpellResult] = useState(null);
  const [spellLoading, setSpellLoading] = useState(false);
  const [spellScore, setSpellScore] = useState({correct:0,total:0});
  const vocabWords = ["acquisition","ameliorate","benevolent","callous","dexterous","eloquence","fortitude","garrulous","hierarchy","idiosyncrasy","juxtaposition","loquacious","meticulous","nonchalant","ostracize","perfidious","quintessential","recalcitrant","sycophant","tenacious"];

  // Comprehension state
  const [passage, setPassage] = useState("");
  const [compQ, setCompQ] = useState("");
  const [compAnswer, setCompAnswer] = useState("");
  const [compLoading, setCompLoading] = useState(false);
  const [compTopic, setCompTopic] = useState("Nigerian society");

  // Graph viewer state
  const [graphExpr, setGraphExpr] = useState("x^2");
  const canvasRef = useRef();

  // Notes state
  const [notes, setNotes] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [savedNotes, setSavedNotes] = useState([]);

  // Flashcard state  
  const [fcSubject, setFcSubject] = useState("Mathematics");
  const [fcTopic, setFcTopic] = useState("");
  const [fcCards, setFcCards] = useState([]);
  const [fcIndex, setFcIndex] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);
  const [fcLoading, setFcLoading] = useState(false);
  const [fcKnown, setFcKnown] = useState(new Set());

  // ── CALCULATOR ──
  const calcPress = (btn) => {
    const toRad = v => calcDeg ? v * Math.PI/180 : v;
    try {
      if (btn==="C"){setCalcDisplay("0");setCalcExpr("");return;}
      if (btn==="⌫"){setCalcDisplay(d=>d.length>1?d.slice(0,-1):"0");return;}
      if (btn==="="){
        let expr = calcExpr+calcDisplay;
        expr = expr.replace(/sin\(/g,calcDeg?"Math.sin(Math.PI/180*":"Math.sin(");
        expr = expr.replace(/cos\(/g,calcDeg?"Math.cos(Math.PI/180*":"Math.cos(");
        expr = expr.replace(/tan\(/g,calcDeg?"Math.tan(Math.PI/180*":"Math.tan(");
        expr = expr.replace(/√\(/g,"Math.sqrt(");
        expr = expr.replace(/log\(/g,"Math.log10(");
        expr = expr.replace(/ln\(/g,"Math.log(");
        expr = expr.replace(/π/g,"Math.PI");
        expr = expr.replace(/e/g,"Math.E");
        expr = expr.replace(/\^/g,"**");
        const result = eval(expr);
        setCalcDisplay(String(parseFloat(result.toFixed(10))));
        setCalcExpr("");
        return;
      }
      if (["sin(","cos(","tan(","√(","log(","ln("].includes(btn)){
        setCalcExpr(e=>e+calcDisplay+btn);setCalcDisplay("0");return;
      }
      if (btn==="x²"){setCalcDisplay(d=>String(parseFloat(eval(`${d}**2`).toFixed(10))));return;}
      if (btn==="1/x"){setCalcDisplay(d=>String(parseFloat((1/parseFloat(d)).toFixed(10))));return;}
      if (btn==="+/-"){setCalcDisplay(d=>d.startsWith("-")?d.slice(1):"-"+d);return;}
      if (btn==="M+"){setCalcMem(m=>m+parseFloat(calcDisplay));return;}
      if (btn==="MR"){setCalcDisplay(String(calcMem));return;}
      if (btn==="MC"){setCalcMem(0);return;}
      if (["+","-","×","÷","%","^","(",")"].includes(btn)){
        setCalcExpr(e=>e+calcDisplay+btn);setCalcDisplay("0");return;
      }
      if (btn==="."){
        if(!calcDisplay.includes("."))setCalcDisplay(d=>d+"."); return;
      }
      setCalcDisplay(d=>d==="0"?btn:d+btn);
    } catch { setCalcDisplay("Error"); }
  };

  const calcBtns = [
    ["DEG","sin(","cos(","tan(","⌫"],
    ["MC","MR","M+","(",")"  ],
    ["√(","log(","ln(","x²","1/x"],
    ["7","8","9","÷","^"     ],
    ["4","5","6","×","+/-"   ],
    ["1","2","3","-","π"     ],
    ["0",".","=","+","C"     ],
  ];

  // ── UNIT CONVERTER ──
  const convert = () => {
    if (!convVal || !convFrom || !convTo) return;
    const convs = CONVERSIONS[convCat] || [];
    const rule = convs.find(c=>c.from===convFrom&&c.to===convTo) || convs.find(c=>c.from===convTo&&c.to===convFrom);
    if (!rule) { setConvResult("No direct conversion found"); return; }
    try {
      if (rule.formula) {
        const x = parseFloat(convVal);
        const result = eval(rule.formula.replace("x",x));
        setConvResult(`${convVal} ${convFrom} = ${parseFloat(result.toFixed(6))} ${convTo}`);
      } else {
        const invert = rule.from===convTo;
        const result = invert ? parseFloat(convVal)/rule.factor : parseFloat(convVal)*rule.factor;
        setConvResult(`${convVal} ${convFrom} = ${parseFloat(result.toFixed(6))} ${convTo}`);
      }
    } catch { setConvResult("Conversion error"); }
  };

  // ── SPELLING ──
  const newSpellWord = () => {
    const w = vocabWords[Math.floor(Math.random()*vocabWords.length)];
    setSpellWord(w); setSpellInput(""); setSpellResult(null);
  };
  const checkSpell = () => {
    const correct = spellInput.trim().toLowerCase() === spellWord.toLowerCase();
    setSpellResult(correct);
    setSpellScore(s=>({correct:s.correct+(correct?1:0),total:s.total+1}));
  };

  // ── COMPREHENSION ──
  const genPassage = async () => {
    setCompLoading(true); setPassage(""); setCompAnswer("");
    try {
      const text = await callClaude(`Generate a WAEC/JAMB style reading comprehension passage (200-250 words) about "${compTopic}" for Nigerian SS3 students. After the passage, write 5 comprehension questions. Format:\n\nPASSAGE:\n[passage text]\n\nQUESTIONS:\n1. [question]\n2. [question]\n3. [question]\n4. [question]\n5. [question]`);
      setPassage(text);
    } catch { setPassage("Error generating passage. Please try again."); }
    setCompLoading(false);
  };

  const answerComp = async () => {
    if (!compQ.trim()) return;
    setCompLoading(true);
    try {
      const ans = await callClaude(`Based on this passage:\n"${passage.slice(0,500)}"\n\nAnswer this comprehension question in WAEC style (3-4 sentences, complete sentences, reference the passage):\n${compQ}`);
      setCompAnswer(ans);
    } catch { setCompAnswer("Error. Try again."); }
    setCompLoading(false);
  };

  // ── GRAPH ──
  useEffect(() => {
    if (tool !== "graph" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = "#1e2130";
    ctx.fillRect(0,0,w,h);
    // Grid
    ctx.strokeStyle = "#2a2d3e"; ctx.lineWidth = 1;
    for (let x=0;x<w;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for (let y=0;y<h;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    // Axes
    ctx.strokeStyle = "#64748b"; ctx.lineWidth = 2;
    ctx.beginPath();ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();
    // Plot
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5;
    ctx.beginPath();
    const scale = 40, cx = w/2, cy = h/2;
    let first = true;
    for (let px=0;px<w;px++){
      const x = (px-cx)/scale;
      try {
        let expr = graphExpr.replace(/\^/g,"**").replace(/x/g,`(${x})`);
        const y = eval(expr);
        const py = cy - y*scale;
        if (isFinite(py) && py>-h && py<2*h){
          first?ctx.moveTo(px,py):ctx.lineTo(px,py);
          first=false;
        } else first=true;
      } catch { first=true; }
    }
    ctx.stroke();
    // Labels
    ctx.fillStyle=C.gold;ctx.font="11px monospace";
    for(let i=-5;i<=5;i++){if(i!==0){ctx.fillText(i,cx+i*scale-4,cy+12);ctx.fillText(-i,cx-8,cy-i*scale+4);}}
  },[tool,graphExpr]);

  // ── FLASHCARDS ──
  const genFlashcards = async () => {
    setFcLoading(true); setFcCards([]); setFcIndex(0); setFcFlipped(false); setFcKnown(new Set());
    try {
      const p = `Create 10 flashcard pairs for ${fcSubject}${fcTopic?` — ${fcTopic}`:""} for WAEC/JAMB students.
Return ONLY valid JSON array:
[{"front":"Question or term (max 15 words)","back":"Answer or definition (max 40 words)","hint":"One-word memory trick","category":"topic name"}]
Make cards progressively harder. Use Nigerian examples. Include formulas, definitions, and exam-style questions.`;
      const text = await callClaude(p, `You are a ${fcSubject} tutor. Create clear, memorable flashcards.`);
      const clean = text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean.slice(clean.indexOf("["),clean.lastIndexOf("]")+1));
      setFcCards(parsed);
    } catch { alert("Could not generate flashcards. Try again."); }
    setFcLoading(false);
  };

  const fc = fcCards[fcIndex];
  const TOOLS_LIST = [
    {id:"calc",   icon:"🔢", label:"Calculator"},
    {id:"periodic",icon:"⚗️",label:"Periodic Table"},
    {id:"formulas",icon:"📐",label:"Formulas"},
    {id:"convert", icon:"🔄",label:"Unit Converter"},
    {id:"spell",   icon:"🔤",label:"Vocabulary"},
    {id:"reading", icon:"📖",label:"Comprehension"},
    {id:"graph",   icon:"📈",label:"Graph Viewer"},
    {id:"notes",   icon:"📝",label:"Notes Pad"},
    {id:"flashcard",icon:"🃏",label:"Flashcards"},
  ];

  return (
    <div>
      {/* Tool selector */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:16}}>
        {TOOLS_LIST.map(t=>(
          <button key={t.id} onClick={()=>setTool(t.id)} style={{background:tool===t.id?C.gold+"22":C.card,border:`1.5px solid ${tool===t.id?C.gold:C.border}`,borderRadius:12,padding:"10px 4px",color:tool===t.id?C.gold:C.muted,fontWeight:tool===t.id?800:400,fontSize:10,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <span style={{fontSize:22}}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── SCIENTIFIC CALCULATOR ── */}
      {tool==="calc" && (
        <div>
          <div style={{background:"#0a0c14",border:`2px solid ${C.gold}44`,borderRadius:16,padding:16,marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{fontSize:11,color:C.muted,fontFamily:"monospace",minHeight:16}}>{calcExpr}</div>
              <button onClick={()=>setCalcDeg(!calcDeg)} style={{background:calcDeg?C.gold+"22":"transparent",border:`1px solid ${calcDeg?C.gold:C.border}`,borderRadius:6,padding:"3px 8px",color:calcDeg?C.gold:C.muted,fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>{calcDeg?"DEG":"RAD"}</button>
            </div>
            <div style={{fontSize:36,fontWeight:900,color:C.gold,textAlign:"right",fontFamily:"monospace",letterSpacing:-1,overflow:"hidden",textOverflow:"ellipsis"}}>{calcDisplay}</div>
            <div style={{fontSize:11,color:C.muted,textAlign:"right",marginTop:2}}>M: {calcMem}</div>
          </div>
          {calcBtns.map((row,ri)=>(
            <div key={ri} style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:6}}>
              {row.map(btn=>(
                <button key={btn} onClick={()=>btn==="DEG"?setCalcDeg(!calcDeg):calcPress(btn)}
                  style={{background:btn==="="?C.gold:["C","⌫"].includes(btn)?C.red+"22":["+","-","×","÷","^","(",")"].includes(btn)?C.orange+"22":["sin(","cos(","tan(","√(","log(","ln(","x²","1/x"].includes(btn)?C.purple+"22":C.card2,border:`1px solid ${btn==="="?C.gold:C.border}`,borderRadius:10,padding:"12px 4px",color:btn==="="?"#000":["C","⌫"].includes(btn)?C.red:["+","-","×","÷","^","(",")"].includes(btn)?C.orange:["sin(","cos(","tan(","√(","log(","ln(","x²","1/x"].includes(btn)?C.purple:C.textLight,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"monospace"}}>
                  {btn}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── PERIODIC TABLE ── */}
      {tool==="periodic" && (
        <div>
          <Card style={{background:"#050915",borderColor:C.teal+"44"}}>
            <div style={{fontWeight:900,fontSize:15,color:C.teal,marginBottom:3}}>⚗️ Periodic Table</div>
            <div style={{fontSize:12,color:C.muted}}>Tap any element for full details — WAEC/JAMB Chemistry</div>
          </Card>
          {selElem && (
            <Card style={{background:`linear-gradient(135deg,${elemColor(selElem.g)}22,${C.card})`,borderColor:elemColor(selElem.g)+"44",textAlign:"center",marginBottom:10}}>
              <div style={{fontSize:48,fontWeight:900,color:elemColor(selElem.g),lineHeight:1}}>{selElem.s}</div>
              <div style={{fontSize:16,fontWeight:800,color:C.textLight,marginTop:4}}>{selElem.n}</div>
              <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:8}}>
                <div style={{textAlign:"center"}}><div style={{fontSize:11,color:C.muted}}>Atomic No.</div><div style={{fontWeight:800,color:C.gold}}>{selElem.a}</div></div>
                <div style={{textAlign:"center"}}><div style={{fontSize:11,color:C.muted}}>Mass</div><div style={{fontWeight:800,color:C.gold}}>{selElem.m}</div></div>
                <div style={{textAlign:"center"}}><div style={{fontSize:11,color:C.muted}}>Group</div><div style={{fontWeight:800,color:elemColor(selElem.g),fontSize:11}}>{selElem.g}</div></div>
              </div>
              <button onClick={()=>setSelElem(null)} style={{marginTop:10,background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 12px",color:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Close ✕</button>
            </Card>
          )}
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5}}>
            {PERIODIC.map(el=>(
              <button key={el.s} onClick={()=>setSelElem(el)}
                style={{background:elemColor(el.g)+"22",border:`1.5px solid ${elemColor(el.g)}44`,borderRadius:8,padding:"8px 4px",cursor:"pointer",textAlign:"center",fontFamily:"inherit"}}>
                <div style={{fontSize:10,color:C.muted}}>{el.a}</div>
                <div style={{fontSize:16,fontWeight:900,color:elemColor(el.g)}}>{el.s}</div>
                <div style={{fontSize:8,color:C.muted,lineHeight:1.2}}>{el.n}</div>
                <div style={{fontSize:7,color:C.sub}}>{el.m}</div>
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:12}}>
            {[...new Set(PERIODIC.map(e=>e.g))].map(g=>(
              <div key={g} style={{display:"flex",alignItems:"center",gap:4,fontSize:9,color:C.muted}}>
                <span style={{width:10,height:10,background:elemColor(g),borderRadius:2,display:"inline-block"}}/>
                {g}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FORMULAS ── */}
      {tool==="formulas" && (
        <div>
          <Card style={{background:"#050915",borderColor:C.blue+"44"}}><div style={{fontWeight:900,fontSize:15,color:C.blue,marginBottom:3}}>📐 Formula Sheet</div><div style={{fontSize:12,color:C.muted}}>WAEC/JAMB Mathematics & Physics — tap any formula to copy</div></Card>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
            {FORMULAS.map(f=><button key={f.cat} onClick={()=>setFormulaCat(f.cat)} style={{background:formulaCat===f.cat?C.blue+"22":"transparent",border:`1.5px solid ${formulaCat===f.cat?C.blue:C.border}`,borderRadius:20,padding:"6px 14px",color:formulaCat===f.cat?C.blue:C.muted,fontWeight:formulaCat===f.cat?800:400,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{f.cat}</button>)}
          </div>
          {(FORMULAS.find(f=>f.cat===formulaCat)?.items||[]).map((item,i)=>(
            <button key={i} onClick={()=>navigator.clipboard.writeText(`${item.name}: ${item.f}`)}
              style={{width:"100%",background:C.card2,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginBottom:8,textAlign:"left",cursor:"pointer",fontFamily:"inherit",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:C.textLight,marginBottom:3}}>{item.name}</div>
                <div style={{fontSize:16,fontWeight:900,color:C.gold,fontFamily:"monospace"}}>{item.f}</div>
              </div>
              <div style={{fontSize:10,color:C.muted,flexShrink:0}}>📋 Copy</div>
            </button>
          ))}
        </div>
      )}

      {/* ── UNIT CONVERTER ── */}
      {tool==="convert" && (
        <div>
          <Card style={{background:"#050915",borderColor:C.teal+"44"}}><div style={{fontWeight:900,fontSize:15,color:C.teal,marginBottom:3}}>🔄 Unit Converter</div><div style={{fontSize:12,color:C.muted}}>Physics & Chemistry conversions — WAEC/JAMB standard units</div></Card>
          <Card>
            <Label>Category</Label>
            <Pills options={Object.keys(CONVERSIONS)} value={convCat} onChange={v=>{setConvCat(v);setConvFrom("");setConvTo("");setConvResult("");}} color={C.teal}/>
          </Card>
          <Card>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <div><Label>From</Label><Sel value={convFrom} onChange={setConvFrom} options={[...new Set((CONVERSIONS[convCat]||[]).map(c=>c.from))]} placeholder="From unit"/></div>
              <div><Label>To</Label><Sel value={convTo} onChange={setConvTo} options={[...new Set((CONVERSIONS[convCat]||[]).map(c=>c.to))]} placeholder="To unit"/></div>
            </div>
            <Label>Value</Label>
            <Inp value={convVal} onChange={setConvVal} placeholder="Enter value..." type="number"/>
          </Card>
          <Btn onClick={convert} color={C.teal} tc="#fff">🔄 Convert</Btn>
          {convResult && (
            <Card style={{background:C.teal+"11",borderColor:C.teal+"44",textAlign:"center",marginTop:10}}>
              <div style={{fontSize:20,fontWeight:900,color:C.teal}}>{convResult}</div>
            </Card>
          )}
        </div>
      )}

      {/* ── VOCABULARY/SPELLING ── */}
      {tool==="spell" && (
        <div>
          <Card style={{background:"#050915",borderColor:C.pink+"44"}}><div style={{fontWeight:900,fontSize:15,color:C.pink,marginBottom:3}}>🔤 Vocabulary Trainer</div><div style={{fontSize:12,color:C.muted}}>WAEC English spelling & vocabulary practice — hear word, spell it correctly</div></Card>
          <Card style={{textAlign:"center"}}>
            <div style={{fontSize:12,color:C.muted,marginBottom:10}}>Score: <b style={{color:C.gold}}>{spellScore.correct}/{spellScore.total}</b> correct</div>
            {!spellWord
              ? <Btn onClick={newSpellWord} color={C.pink} tc="#fff">🔤 Start Vocabulary Test</Btn>
              : <>
                  <div style={{background:C.pink+"11",border:`2px solid ${C.pink}44`,borderRadius:14,padding:20,marginBottom:12}}>
                    <div style={{fontSize:12,color:C.muted,marginBottom:6}}>Definition:</div>
                    <div style={{fontSize:14,color:C.textLight,fontWeight:600,lineHeight:1.6}}>
                      {{"acquisition":"The act of obtaining or gaining something","ameliorate":"To make something bad better","benevolent":"Well-meaning and kindly","callous":"Showing no sympathy","dexterous":"Showing great skill","eloquence":"Fluent and persuasive speaking","fortitude":"Courage in pain or adversity","garrulous":"Excessively talkative","hierarchy":"System ranked by status","idiosyncrasy":"Personal peculiarity","juxtaposition":"Placing two things side by side","loquacious":"Fond of talking a great deal","meticulous":"Very careful and precise","nonchalant":"Casually calm and relaxed","ostracize":"To exclude from society","perfidious":"Deceitful and untrustworthy","quintessential":"Perfect typical example","recalcitrant":"Uncooperative and stubborn","sycophant":"One who uses flattery to gain favor","tenacious":"Very determined"}[spellWord]}
                    </div>
                  </div>
                  <Inp value={spellInput} onChange={setSpellInput} placeholder="Type the spelling here..."/>
                  {spellResult===null
                    ? <div style={{marginTop:10}}><Btn onClick={checkSpell} color={C.pink} tc="#fff">✅ Check Spelling</Btn></div>
                    : <div style={{marginTop:10}}>
                        <div style={{background:spellResult?C.green+"22":C.red+"22",border:`2px solid ${spellResult?C.green:C.red}`,borderRadius:12,padding:16,marginBottom:10}}>
                          <div style={{fontWeight:800,fontSize:16,color:spellResult?C.green:C.red,marginBottom:4}}>{spellResult?"✅ Correct!":"❌ Wrong!"}</div>
                          <div style={{fontSize:18,fontWeight:900,color:C.gold,letterSpacing:1}}>{spellWord}</div>
                          {!spellResult&&<div style={{fontSize:12,color:C.muted,marginTop:4}}>You typed: "{spellInput}"</div>}
                        </div>
                        <Btn onClick={newSpellWord} color={C.pink} tc="#fff">Next Word →</Btn>
                      </div>}
                </>}
          </Card>
        </div>
      )}

      {/* ── COMPREHENSION ── */}
      {tool==="reading" && (
        <div>
          <Card style={{background:"#050915",borderColor:C.orange+"44"}}><div style={{fontWeight:900,fontSize:15,color:C.orange,marginBottom:3}}>📖 Comprehension Trainer</div><div style={{fontSize:12,color:C.muted}}>AI-generated WAEC/JAMB style passages with comprehension questions</div></Card>
          <Card>
            <Label>Passage Topic</Label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
              {["Nigerian society","Technology in Africa","Environmental issues","Youth & Education","Agriculture","Historical events","Health & Medicine"].map(t=>(
                <button key={t} onClick={()=>setCompTopic(t)} style={{background:compTopic===t?C.orange+"22":"transparent",border:`1px solid ${compTopic===t?C.orange:C.border}`,borderRadius:20,padding:"5px 11px",color:compTopic===t?C.orange:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{t}</button>
              ))}
            </div>
            <Btn onClick={genPassage} loading={compLoading} color={C.orange} tc="#fff">📖 Generate Passage</Btn>
          </Card>
          {passage && (
            <>
              <Card style={{background:"#050915",borderColor:C.orange+"33"}}>
                <Label c={C.orange}>Passage</Label>
                <div style={{fontSize:13,color:C.textLight,lineHeight:1.9,whiteSpace:"pre-wrap"}}>{passage}</div>
              </Card>
              <Card>
                <Label>Ask a Comprehension Question</Label>
                <Inp value={compQ} onChange={setCompQ} placeholder="e.g. What is the main idea of the passage? OR Answer question 2"/>
                <div style={{marginTop:10}}><Btn onClick={answerComp} loading={compLoading} color={C.orange} tc="#fff">💡 Get Model Answer</Btn></div>
              </Card>
              {compAnswer && <Out text={compAnswer} color={C.orange}/>}
            </>
          )}
        </div>
      )}

      {/* ── GRAPH VIEWER ── */}
      {tool==="graph" && (
        <div>
          <Card style={{background:"#050915",borderColor:C.green+"44"}}><div style={{fontWeight:900,fontSize:15,color:C.green,marginBottom:3}}>📈 Graph Viewer</div><div style={{fontSize:12,color:C.muted}}>Plot any mathematical function — WAEC/JAMB Maths & Physics</div></Card>
          <Card>
            <Label>Function f(x) =</Label>
            <Inp value={graphExpr} onChange={setGraphExpr} placeholder="e.g. x^2, sin(x), 2*x+3, x^3-2*x"/>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
              {["x^2","sin(x)","cos(x)","x^3-3*x","2*x+1","Math.abs(x)"].map(e=>(
                <button key={e} onClick={()=>setGraphExpr(e)} style={{background:C.green+"18",border:`1px solid ${C.green}33`,borderRadius:20,padding:"4px 10px",color:C.green,fontSize:11,cursor:"pointer",fontFamily:"monospace"}}>{e}</button>
              ))}
            </div>
          </Card>
          <div style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden",marginBottom:10}}>
            <canvas ref={canvasRef} width={360} height={300} style={{width:"100%",display:"block"}}/>
          </div>
          <Card style={{background:C.green+"11",borderColor:C.green+"33"}}>
            <div style={{fontSize:12,color:C.green,lineHeight:1.8}}>
              <b>Tips:</b> Use <code style={{background:C.card2,padding:"1px 5px",borderRadius:4,color:C.gold}}>^</code> for powers, <code style={{background:C.card2,padding:"1px 5px",borderRadius:4,color:C.gold}}>*</code> for multiply, <code style={{background:C.card2,padding:"1px 5px",borderRadius:4,color:C.gold}}>Math.sqrt(x)</code> for √x
            </div>
          </Card>
        </div>
      )}

      {/* ── NOTES PAD ── */}
      {tool==="notes" && (
        <div>
          <Card style={{background:"#050915",borderColor:C.sky+"44"}}><div style={{fontWeight:900,fontSize:15,color:C.sky,marginBottom:3}}>📝 Notes Pad</div><div style={{fontSize:12,color:C.muted}}>Save key points, formulas, and study notes as you learn</div></Card>
          <Card>
            <Label>Note Title</Label>
            <Inp value={noteTitle} onChange={setNoteTitle} placeholder="e.g. WAEC Chemistry — Organic reactions"/>
            <div style={{marginTop:10}}><Label>Notes</Label></div>
            <Inp value={notes} onChange={setNotes} multiline rows={8} placeholder="Write your study notes here...&#10;&#10;• Key formulas&#10;• Important definitions&#10;• Things to remember"/>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <Btn onClick={()=>{if(noteTitle&&notes){setSavedNotes(n=>[{title:noteTitle,content:notes,time:ts()},...n.slice(0,9)]);setNoteTitle("");setNotes("");} }} color={C.sky} tc="#fff">💾 Save Note</Btn>
            </div>
          </Card>
          {savedNotes.length>0 && (
            <Card>
              <Label c={C.sky}>Saved Notes ({savedNotes.length})</Label>
              {savedNotes.map((n,i)=>(
                <div key={i} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:12,marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{fontWeight:700,fontSize:13,color:C.sky}}>{n.title}</div>
                    <div style={{fontSize:10,color:C.muted}}>{n.time}</div>
                  </div>
                  <div style={{fontSize:12,color:C.textLight,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{n.content.slice(0,150)}{n.content.length>150?"...":""}</div>
                  <div style={{display:"flex",gap:6,marginTop:8}}>
                    <button onClick={()=>{setNoteTitle(n.title);setNotes(n.content);}} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 10px",color:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✏️ Edit</button>
                    <button onClick={()=>navigator.clipboard.writeText(`${n.title}\n\n${n.content}`)} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 10px",color:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>📋 Copy</button>
                    <button onClick={()=>setSavedNotes(ns=>ns.filter((_,j)=>j!==i))} style={{background:"transparent",border:`1px solid ${C.red}33`,borderRadius:8,padding:"4px 10px",color:C.red,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>🗑️ Delete</button>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {/* ── FLASHCARDS (FLIP ANIMATION) ── */}
      {tool==="flashcard" && (
        <div>
          <Card style={{background:"#050915",borderColor:C.gold+"44"}}><div style={{fontWeight:900,fontSize:15,color:C.gold,marginBottom:3}}>🃏 Flashcards</div><div style={{fontSize:12,color:C.muted}}>Tap card to flip and reveal answer — spaced repetition learning</div></Card>

          {fcCards.length===0 ? (
            <>
              <Card>
                <Label>Subject</Label>
                <Sel value={fcSubject} onChange={setFcSubject} options={SUBJECTS} placeholder="Select subject"/>
                {fcSubject&&SYLLABUS[fcSubject]&&<div style={{marginTop:10}}><Label>Topic (optional)</Label><Pills options={SYLLABUS[fcSubject]} value={fcTopic} onChange={v=>setFcTopic(fcTopic===v?"":v)} color={C.gold}/></div>}
              </Card>
              <Btn onClick={genFlashcards} loading={fcLoading} color={C.gold} tc="#000">🃏 Generate Flashcards</Btn>
            </>
          ) : (
            <>
              {/* Progress */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{fontSize:12,color:C.muted}}>Card {fcIndex+1} of {fcCards.length}</span>
                <span style={{fontSize:12,color:C.green,fontWeight:700}}>✅ Known: {fcKnown.size}/{fcCards.length}</span>
                <span style={{fontSize:12,color:C.muted}}>{fc?.category}</span>
              </div>
              <div style={{background:C.border,borderRadius:4,height:4,marginBottom:14}}>
                <div style={{background:C.gold,height:"100%",borderRadius:4,width:`${((fcIndex+1)/fcCards.length)*100}%`,transition:"width .4s"}}/>
              </div>

              {/* Flip card */}
              <div onClick={()=>setFcFlipped(f=>!f)} style={{cursor:"pointer",marginBottom:14,perspective:"1000px"}}>
                <div style={{position:"relative",height:220,transition:"transform 0.6s",transformStyle:"preserve-3d",transform:fcFlipped?"rotateY(180deg)":"rotateY(0deg)"}}>
                  {/* Front */}
                  <div style={{position:"absolute",inset:0,background:`linear-gradient(135deg,${C.card2},${C.card})`,border:`2px solid ${C.gold}44`,borderRadius:20,padding:24,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",backfaceVisibility:"hidden",WebkitBackfaceVisibility:"hidden"}}>
                    <div style={{fontSize:10,color:C.gold,fontWeight:800,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>QUESTION</div>
                    <div style={{fontSize:16,fontWeight:700,color:C.textLight,lineHeight:1.6}}>{fc?.front}</div>
                    <div style={{position:"absolute",bottom:14,fontSize:11,color:C.sub}}>Tap to reveal answer 👆</div>
                  </div>
                  {/* Back */}
                  <div style={{position:"absolute",inset:0,background:`linear-gradient(135deg,${C.gold}22,${C.card})`,border:`2px solid ${C.gold}`,borderRadius:20,padding:24,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",backfaceVisibility:"hidden",WebkitBackfaceVisibility:"hidden",transform:"rotateY(180deg)"}}>
                    <div style={{fontSize:10,color:C.gold,fontWeight:800,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>ANSWER</div>
                    <div style={{fontSize:15,fontWeight:600,color:C.textLight,lineHeight:1.7}}>{fc?.back}</div>
                    <div style={{marginTop:12,background:C.gold+"22",borderRadius:20,padding:"4px 14px",fontSize:11,color:C.gold,fontWeight:700}}>💡 {fc?.hint}</div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                <button onClick={()=>{setFcFlipped(false);setFcIndex(i=>Math.max(0,i-1));}} disabled={fcIndex===0} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 0",color:fcIndex===0?C.sub:C.muted,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>← Prev</button>
                <button onClick={()=>{setFcKnown(k=>new Set([...k,fcIndex]));setFcFlipped(false);if(fcIndex<fcCards.length-1)setFcIndex(i=>i+1);}} style={{background:C.green+"22",border:`1px solid ${C.green}`,borderRadius:12,padding:"11px 0",color:C.green,fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✅ Know it</button>
                <button onClick={()=>{setFcFlipped(false);if(fcIndex<fcCards.length-1)setFcIndex(i=>i+1);}} disabled={fcIndex===fcCards.length-1} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 0",color:fcIndex===fcCards.length-1?C.sub:C.muted,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Next →</button>
              </div>

              {fcKnown.size===fcCards.length && (
                <Card style={{background:C.green+"18",borderColor:C.green+"44",textAlign:"center"}}>
                  <div style={{fontSize:32,marginBottom:8}}>🎉</div>
                  <div style={{fontWeight:900,fontSize:16,color:C.green,marginBottom:4}}>All cards mastered!</div>
                  <div style={{fontSize:12,color:C.muted,marginBottom:12}}>You know all {fcCards.length} cards in this deck!</div>
                  <Btn onClick={()=>{setFcCards([]);setFcKnown(new Set());}} color={C.gold} tc="#000">🔄 New Deck</Btn>
                </Card>
              )}

              <button onClick={()=>{setFcCards([]);setFcKnown(new Set());}} style={{width:"100%",background:"transparent",border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 0",color:C.muted,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",marginTop:4}}>🔄 Generate New Deck</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── ASK AI ────────────────────────────────────────────────────────────────────
function AskAI() {
  const [msgs,setMsgs]=useState([{from:"bot",text:`👋 **Welcome to ExamAce AI!** 🏆\n\nAsk me **anything** about your exams — no limits!\n\n📸 Snap a question → I solve it\n📅 Ask by year → "WAEC 2022 Physics Q4"\n📚 Any topic → step-by-step explanation\n\nType below or tap 📷 to send a photo!`,time:ts()}]);
  const [input,setInput]=useState(""); const [exam,setExam]=useState("WAEC"); const [subject,setSubject]=useState("Mathematics"); const [year,setYear]=useState("");
  const [loading,setLoading]=useState(false); const [imgPreview,setImgPreview]=useState(null); const [imgData,setImgData]=useState(null);
  const chatRef=useRef(); const fileRef=useRef();
  useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[msgs]);
  const onImg=async f=>{if(!f)return;setImgPreview(URL.createObjectURL(f));setImgData({data:await toBase64(f),type:f.type||"image/jpeg"});};
  const send=async()=>{
    const msg=input.trim();if(!msg&&!imgData)return;
    const yr=msg.match(/\b(19|20)\d{2}\b/)?.[0]||year;
    const display=imgPreview?(msg?`📷 [Photo]\n${msg}`:"📷 [Question photo]"):msg;
    setMsgs(m=>[...m,{from:"user",text:display,time:ts(),img:imgPreview}]);
    setInput("");setImgPreview(null);setLoading(true);
    try{
      let reply;
      if(imgData){reply=await callClaude(`You are an official ${exam} examiner for ${subject}${yr?` (${yr} style)`:""} Read ALL question(s) in this image.\n\n**QUESTION READ:** [restate]\n**SUBJECT & TOPIC:** [identify]\n**FULL SOLUTION:** [step-by-step]\n**KEY CONCEPT:** [syllabus concept]\n**MARKS:** [how ${exam} marks this]\n**${exam} TIP:** [examiner insight]`,null,imgData);setImgData(null);}
      else{const hist=msgs.slice(-6).map(m=>({role:m.from==="user"?"user":"assistant",content:m.text}));reply=await callClaude([...hist,{role:"user",content:msg}],SYS(exam,subject,yr));}
      setMsgs(m=>[...m,{from:"bot",text:reply,time:ts()}]);
    }catch{setMsgs(m=>[...m,{from:"bot",text:"⚠️ Connection issue. Please try again!",time:ts()}]);}
    setLoading(false);
  };
  return(
    <div>
      <Card><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}><div><Label>Exam</Label><Sel value={exam} onChange={setExam} options={EXAMS} placeholder="Exam"/></div><div><Label>Subject</Label><Sel value={subject} onChange={setSubject} options={SUBJECTS} placeholder="Subject"/></div><div><Label>Year</Label><Sel value={year} onChange={setYear} options={YEARS} placeholder="Any"/></div></div><div style={{marginTop:8,background:C.blue+"18",borderRadius:8,padding:"7px 10px",fontSize:11,color:C.sky}}>💡 Try: <b>"WAEC 2021 Biology Q3"</b> or <b>"Explain osmosis for NECO"</b></div></Card>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:18,overflow:"hidden",marginBottom:12}}>
        <div style={{background:C.waD,padding:"11px 14px",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,background:C.wa,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🤖</div>
          <div><div style={{fontWeight:700,fontSize:13,color:"#fff"}}>ExamAce AI · {exam} {subject}{year?` · ${year}`:""}</div><div style={{fontSize:10,color:"#b2dfdb"}}>Official syllabus · Unlimited · 📷 Snap enabled</div></div>
        </div>
        <div ref={chatRef} style={{height:320,overflowY:"auto",padding:"14px 12px",display:"flex",flexDirection:"column",gap:10,background:"#ece5dd"}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.from==="user"?"flex-end":"flex-start",animation:i===msgs.length-1?"fadeUp .3s ease":"none"}}>
              <div style={{maxWidth:"83%",background:m.from==="user"?"#dcf8c6":"#ffffff",borderRadius:m.from==="user"?"14px 14px 2px 14px":"14px 14px 14px 2px",padding:"10px 13px",fontSize:13,boxShadow:"0 1px 2px rgba(0,0,0,0.1)"}}>
                {m.img&&<img src={m.img} alt="" style={{maxWidth:"100%",borderRadius:8,marginBottom:8,maxHeight:140,objectFit:"cover"}}/>}
                <div>{fmt(m.text,false)}</div>
                <div style={{fontSize:10,color:"#64748b",textAlign:"right",marginTop:4}}>{m.time}{m.from==="user"&&<span style={{color:"#34B7F1"}}> ✓✓</span>}</div>
              </div>
            </div>
          ))}
          {loading&&<div style={{display:"flex"}}><div style={{background:"#fff",borderRadius:"14px 14px 14px 2px",padding:"11px 16px",display:"flex",gap:5}}>{[0,1,2].map(d=><span key={d} style={{width:8,height:8,borderRadius:"50%",background:"#94a3b8",display:"inline-block",animation:`blink 1.2s ${d*.22}s infinite`}}/>)}</div></div>}
        </div>
        {imgPreview&&<div style={{padding:"8px 12px",background:C.blue+"18",borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8}}><img src={imgPreview} alt="" style={{width:46,height:46,objectFit:"cover",borderRadius:8,border:`2px solid ${C.blue}`}}/><div style={{flex:1,fontSize:12,color:C.sky,fontWeight:700}}>📷 Photo ready</div><button onClick={()=>{setImgPreview(null);setImgData(null);}} style={{background:C.card2,border:"none",color:C.red,borderRadius:8,padding:"4px 10px",fontSize:13,cursor:"pointer"}}>✕</button></div>}
        <div style={{padding:"10px 12px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8,alignItems:"flex-end",background:C.card2}}>
          <button onClick={()=>fileRef.current.click()} style={{width:40,height:40,background:C.wa,borderRadius:"50%",border:"none",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>📷</button>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>onImg(e.target.files[0])}/>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!loading&&send()} placeholder="Ask anything or snap 📷..." style={{flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:22,padding:"10px 16px",color:C.textLight,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
          <button onClick={send} disabled={loading||(!input.trim()&&!imgData)} style={{width:40,height:40,background:(input.trim()||imgData)&&!loading?C.wa:C.border,borderRadius:"50%",border:"none",cursor:"pointer",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>➤</button>
        </div>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {["WAEC 2023 Maths","JAMB 2022 Chemistry","Explain Genetics NECO","WAEC essay tips","What repeats in JAMB?"].map(q=><button key={q} onClick={()=>setInput(q)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:"5px 12px",color:C.gold,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{q}</button>)}
      </div>
    </div>
  );
}

// ── SNAP & SOLVE ──────────────────────────────────────────────────────────────
function SnapSolve() {
  const [preview,setPreview]=useState(null);const [imgData,setImgData]=useState(null);const [exam,setExam]=useState("WAEC");const [subject,setSubject]=useState("");const [year,setYear]=useState("");const [note,setNote]=useState("");const [answer,setAnswer]=useState("");const [loading,setLoading]=useState(false);
  const fileRef=useRef();
  const onFile=async f=>{if(!f)return;setPreview(URL.createObjectURL(f));setImgData({data:await toBase64(f),type:f.type||"image/jpeg"});setAnswer("");};
  const solve=async()=>{if(!imgData)return;setLoading(true);setAnswer("");try{setAnswer(await callClaude(`You are an official ${exam} examiner${subject?` for ${subject}`:""}${year?` (${year} style)`:""}\nRead ALL questions in this image carefully.\n\n**QUESTION READ:** [restate exactly]\n**SUBJECT & TOPIC:** [identify]\n${year?`**${exam} ${year} CONTEXT:** [similarity to actual ${year} questions]\n`:""}\n**COMPLETE SOLUTION:**\n[Full step-by-step using ${exam} marking scheme]\n\n**KEY CONCEPT:**\n[${exam} syllabus concept tested]\n\n**MARKS BREAKDOWN:**\n[How ${exam} allocates marks]\n\n**EXAMINER TIP:**\n[Specific insight for ${exam}]\n\n${note?`Student note: "${note}"`:""}`,null,imgData));}catch{setAnswer("⚠️ Could not read image. Ensure good lighting and try again.");}setLoading(false);};
  return(
    <div>
      <Card style={{background:`linear-gradient(135deg,${C.greenD}22,${C.card})`,borderColor:C.green+"44"}}><div style={{fontSize:28,marginBottom:4}}>📸</div><div style={{fontWeight:900,fontSize:16,color:C.green,marginBottom:3}}>Snap & Solve</div><div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>Snap any question from textbook, past paper, chalkboard, or exam booklet — AI solves with official marking scheme!</div></Card>
      <Card><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}><div><Label>Exam</Label><Sel value={exam} onChange={setExam} options={EXAMS} placeholder="Exam"/></div><div><Label>Subject</Label><Sel value={subject} onChange={setSubject} options={SUBJECTS} placeholder="Auto"/></div><div><Label>Year</Label><Sel value={year} onChange={setYear} options={YEARS} placeholder="Any"/></div></div></Card>
      <div onClick={()=>fileRef.current.click()} style={{border:`2.5px dashed ${preview?C.green:C.border}`,borderRadius:16,padding:24,textAlign:"center",cursor:"pointer",background:preview?C.green+"11":C.card,marginBottom:12,minHeight:180,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8}}>
        {preview?<><img src={preview} alt="" style={{maxWidth:"100%",maxHeight:240,borderRadius:10,objectFit:"contain"}}/><div style={{fontSize:11,color:C.green,fontWeight:700,marginTop:4}}>✅ Tap to change</div></>:<><div style={{fontSize:52}}>📷</div><div style={{fontWeight:700,color:C.green,fontSize:15}}>Tap to upload question photo</div><div style={{fontSize:12,color:C.muted}}>Handwritten · Printed · Screenshot · Board</div></>}
        <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>onFile(e.target.files[0])}/>
      </div>
      {preview&&<><Card><Label>Note (optional)</Label><Inp value={note} onChange={setNote} placeholder="e.g. 'WAEC 2022 Q3b — show full working'"/></Card><Btn onClick={solve} loading={loading} color={C.green} tc="#fff">🔍 Read & Solve</Btn></>}
      {answer&&<><Out text={answer} color={C.green}/><div style={{display:"flex",gap:8,marginTop:10}}><button onClick={()=>navigator.clipboard.writeText(answer)} style={{flex:1,background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 0",color:C.muted,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>📋 Copy</button><a href={`https://wa.me/?text=${encodeURIComponent(`📸 Solved by ExamAce AI!\n${exam} ${year||""} ${subject||""}\n\n${answer.slice(0,350)}...\n\n🏆 ExamAce AI Nigeria`)}`} target="_blank" rel="noreferrer" style={{flex:1,background:C.wa,borderRadius:10,padding:"10px 0",color:"#fff",fontWeight:700,fontSize:12,textAlign:"center",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>💬 Share</a></div></>}
    </div>
  );
}

// ── QUIZ ──────────────────────────────────────────────────────────────────────
function Quiz() {
  const [mode,setMode]=useState("setup");const [qtype,setQtype]=useState("year");const [exam,setExam]=useState("WAEC");const [subject,setSubject]=useState("Mathematics");const [year,setYear]=useState("2023");const [topic,setTopic]=useState("");const [count,setCount]=useState(10);const [qs,setQs]=useState([]);const [cur,setCur]=useState(0);const [sel,setSel]=useState(null);const [answered,setAnswered]=useState(false);const [score,setScore]=useState(0);const [log,setLog]=useState([]);const [loading,setLoading]=useState(false);const [timer,setTimer]=useState(45);const [timerOn,setTimerOn]=useState(false);const [coach,setCoach]=useState("");const [coachLoading,setCoachLoading]=useState(false);const tRef=useRef();
  useEffect(()=>{if(timerOn&&timer>0){tRef.current=setTimeout(()=>setTimer(t=>t-1),1000);}else if(timer===0&&timerOn)handle(null);return()=>clearTimeout(tRef.current);},[timerOn,timer]);
  const parse=t=>{try{const c=t.replace(/```json|```/g,"").trim();return JSON.parse(c.slice(c.indexOf("["),c.lastIndexOf("]")+1));}catch{return null;}};
  const start=async()=>{setLoading(true);const p=qtype==="year"?`Generate ${count} authentic ${exam} ${year} style MCQs for ${subject}${topic?` (topic: ${topic})`:""} ONLY JSON: [{"q":"","options":{"A":"","B":"","C":"","D":""},"answer":"A","explanation":"","tip":"","year":"${year}","topic":"","difficulty":"easy|medium|hard"}]`:`Generate ${count} RANDOMIZED ${exam} MCQs for ${subject} from ALL syllabus topics: ${SYLLABUS[subject]?.join(", ")||"all topics"}. Mix years 2015-2024. ONLY JSON: [{"q":"","options":{"A":"","B":"","C":"","D":""},"answer":"A","explanation":"","tip":"","year":"20XX","topic":"","difficulty":"easy|medium|hard"}]`;try{const t=await callClaude(p,SYS(exam,subject,qtype==="year"?year:""));const parsed=parse(t);if(parsed?.length>0){setQs(parsed);setCur(0);setScore(0);setLog([]);setSel(null);setAnswered(false);setMode("quiz");setTimer(45);setTimerOn(true);}else alert("Could not generate. Try again.");}catch{alert("Connection error.");}setLoading(false);};
  const handle=l=>{if(answered)return;clearTimeout(tRef.current);setTimerOn(false);setSel(l);setAnswered(true);const q=qs[cur],ok=l===q.answer;if(ok)setScore(s=>s+1);setLog(lg=>[...lg,{...q,sel:l,ok}]);};
  const next=()=>{if(cur+1>=qs.length)finish();else{setCur(c=>c+1);setSel(null);setAnswered(false);setTimer(45);setTimerOn(true);}};
  const finish=async()=>{setMode("result");const wrong=log.filter(r=>!r.ok);if(wrong.length>0){setCoachLoading(true);try{setCoach(await callClaude(`Student got ${wrong.length}/${qs.length} wrong in ${exam} ${subject}. Missed: ${[...new Set(wrong.map(w=>w.topic))].join(", ")}. Write 90-word WhatsApp coaching note with **bold**, emojis, 2 tips, motivation.`));}catch{setCoach("Keep going! Review the topics you missed. 💪");}setCoachLoading(false);}};
  const pct=qs.length>0?Math.round((score/qs.length)*100):0;const grade=pct>=75?{g:"A1",c:C.green}:pct>=65?{g:"B2",c:C.sky}:pct>=55?{g:"C4",c:C.orange}:pct>=45?{g:"C6",c:C.gold}:{g:"F9",c:C.red};const q=qs[cur];
  return(
    <div>
      {mode==="setup"&&(<><Card style={{background:`linear-gradient(135deg,${C.blueD}22,${C.card})`,borderColor:C.blue+"44"}}><div style={{fontSize:26,marginBottom:4}}>📝</div><div style={{fontWeight:900,fontSize:16,color:C.blue,marginBottom:3}}>Past Questions & Random Test</div><div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>Year-specific or randomized tests — live marking, 45s timer, AI coaching!</div></Card><Card><Label>Test Type</Label><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{[["year","📅 Year-Specific"],["random","🎲 Randomized"]].map(([t,l])=><button key={t} onClick={()=>setQtype(t)} style={{background:qtype===t?C.blue+"22":"transparent",border:`2px solid ${qtype===t?C.blue:C.border}`,borderRadius:12,padding:"12px 8px",color:qtype===t?C.blue:C.muted,fontWeight:qtype===t?800:400,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>)}</div></Card><Card><Label>Exam</Label><Pills options={EXAMS} value={exam} onChange={setExam} color={C.blue}/></Card><Card><Label>Subject</Label><Sel value={subject} onChange={setSubject} options={SUBJECTS} placeholder="Select subject"/></Card>{qtype==="year"&&<><Card><Label>Year</Label><Pills options={["2024","2023","2022","2021","2020","2019","2018","2017"]} value={year} onChange={setYear} color={C.blue}/><div style={{marginTop:8}}><Sel value={year} onChange={setYear} options={YEARS} placeholder="Or pick older year..."/></div></Card><Card><Label>Topic (optional)</Label>{subject&&SYLLABUS[subject]?<Pills options={SYLLABUS[subject]} value={topic} onChange={v=>setTopic(topic===v?"":v)} color={C.blue}/>:<Inp value={topic} onChange={setTopic} placeholder="Enter topic..."/>}</Card></>}<Card><Label>Questions</Label><Pills options={["5","10","15","20"]} value={String(count)} onChange={v=>setCount(parseInt(v))} color={C.blue}/></Card><Btn onClick={start} loading={loading} color={C.blue} tc="#fff">{qtype==="year"?`📅 Start ${exam} ${year} Test`:"🎲 Start Randomized Test"}</Btn></>)}
      {mode==="quiz"&&q&&(<div style={{animation:"fadeUp .3s ease"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={{background:C.blue+"22",border:`1px solid ${C.blue}33`,borderRadius:20,padding:"3px 10px",fontSize:11,color:C.sky,fontWeight:700}}>Q{cur+1}/{qs.length} · {q.topic}</div><div style={{background:timer<=10?C.red:C.orange,color:"#fff",borderRadius:20,padding:"4px 12px",fontWeight:800,fontSize:13}}>⏱ {timer}s</div><div style={{fontSize:12,fontWeight:700,color:C.green}}>✅ {score}</div></div><div style={{background:C.border,borderRadius:4,height:4,marginBottom:8}}><div style={{background:C.blue,height:"100%",borderRadius:4,width:`${((cur+(answered?1:0))/qs.length)*100}%`,transition:"width .4s"}}/></div><div style={{background:"#fee2e222",borderRadius:3,height:3,marginBottom:14}}><div style={{background:timer>20?C.green:timer>10?C.orange:C.red,height:"100%",borderRadius:3,width:`${(timer/45)*100}%`,transition:"width 1s linear"}}/></div><Card style={{background:C.blue+"11",borderColor:C.blue+"44"}}><div style={{fontSize:11,fontWeight:800,color:C.blue,marginBottom:6}}>{exam} {q.year||year} · {subject}</div><div style={{fontSize:15,fontWeight:700,lineHeight:1.6,color:C.textLight}}>{q.q}</div></Card><div style={{display:"flex",flexDirection:"column",gap:9}}>{Object.entries(q.options).map(([l,t])=>{const ok=l===q.answer,isSel=sel===l;let bg=C.card,border=C.border,color=C.textLight;if(answered){if(ok){bg=C.green+"22";border=C.green;color=C.green;}else if(isSel){bg=C.red+"22";border=C.red;color=C.red;}}else if(isSel){bg=C.blue+"18";border=C.blue;}return(<button key={l} onClick={()=>handle(l)} disabled={answered} style={{background:bg,border:`2px solid ${border}`,borderRadius:14,padding:"13px 16px",color,fontSize:13,textAlign:"left",cursor:answered?"default":"pointer",display:"flex",gap:12,alignItems:"center",fontFamily:"inherit"}}><span style={{width:30,height:30,borderRadius:"50%",background:answered&&ok?C.green:answered&&isSel?C.red:C.card2,color:answered&&(ok||isSel)?"#fff":C.muted,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,flexShrink:0}}>{answered?(ok?"✓":isSel?"✗":l):l}</span><span style={{flex:1,lineHeight:1.4}}>{t}</span></button>);})}</div>{answered&&<div style={{marginTop:14,animation:"fadeUp .35s ease"}}><Card style={{background:sel===q.answer?C.green+"18":C.red+"18",borderColor:sel===q.answer?C.green:C.red}}><div style={{fontWeight:800,fontSize:14,color:sel===q.answer?C.green:C.red,marginBottom:6}}>{sel===q.answer?"✅ Correct!":sel===null?`⏰ Time's up! Answer: ${q.answer}`:`❌ Wrong. Correct: ${q.answer}`}</div><div style={{fontSize:13,color:C.textLight,lineHeight:1.7}}>{q.explanation}</div></Card><Card style={{background:C.gold+"11",borderColor:C.gold+"44"}}><div style={{fontSize:11,fontWeight:800,color:C.gold,marginBottom:4}}>🎯 {exam} TIP</div><div style={{fontSize:12,color:C.textLight,lineHeight:1.6}}>{q.tip}</div></Card><Btn onClick={next} color={C.blue} tc="#fff">{cur+1>=qs.length?"🏁 See Results →":"Next Question →"}</Btn></div>}</div>)}
      {mode==="result"&&(<div style={{animation:"fadeUp .4s ease"}}><Card style={{textAlign:"center",background:`linear-gradient(135deg,${grade.c}18,${C.card})`,borderColor:grade.c+"44"}}><div style={{fontSize:52,marginBottom:8}}>{pct>=75?"🏆":pct>=55?"✅":"💪"}</div><div style={{fontWeight:900,fontSize:44,color:grade.c}}>{pct}%</div><div style={{fontWeight:900,fontSize:20,color:grade.c,marginBottom:4}}>Grade {grade.g}</div><div style={{fontSize:13,color:C.muted}}>{score}/{qs.length} · {subject} · {exam} {qtype==="year"?year:"Random"}</div></Card>{(coachLoading||coach)&&<Card style={{background:C.green+"11",borderColor:C.green+"33"}}><Label c={C.green}>🏆 AI Coach</Label>{coachLoading?<div style={{color:C.muted,fontSize:13}}>Analysing...</div>:<div style={{fontSize:13,lineHeight:1.8,color:C.textLight,whiteSpace:"pre-wrap"}}>{coach}</div>}</Card>}<Card><Label>Review</Label>{log.map((r,i)=><div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`,alignItems:"flex-start"}}><span style={{fontSize:16,flexShrink:0}}>{r.ok?"✅":"❌"}</span><div style={{flex:1}}><div style={{fontSize:11,color:C.sky,fontWeight:700,marginBottom:2}}>{r.topic} · {r.year}</div><div style={{fontSize:12,color:C.textLight,lineHeight:1.4,marginBottom:2}}>{r.q}</div>{!r.ok&&<div style={{fontSize:11,color:C.red}}>You: {r.sel||"–"} · Correct: {r.answer}</div>}</div></div>)}</Card><div style={{display:"flex",gap:8}}><a href={`https://wa.me/?text=${encodeURIComponent(`🏆 I scored ${pct}% (Grade ${grade.g}) on ${exam} ${subject}!\n\nPrepare with ExamAce AI 🇳🇬`)}`} target="_blank" rel="noreferrer" style={{flex:1,background:C.wa,borderRadius:12,padding:"13px 0",color:"#fff",fontWeight:800,fontSize:13,textAlign:"center",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>💬 Share</a><button onClick={()=>{setMode("setup");setCoach("");}} style={{flex:1,background:C.card2,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 0",color:C.muted,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>🔄 New Test</button></div></div>)}
    </div>
  );
}

// ── ESSAY ─────────────────────────────────────────────────────────────────────
function EssayMarker() {
  const [mode,setMode]=useState("text");const [essay,setEssay]=useState("");const [topic,setTopic]=useState("");const [exam,setExam]=useState("WAEC");const [subject,setSubject]=useState("English Language");const [year,setYear]=useState("");const [imgPreview,setImgPreview]=useState(null);const [imgData,setImgData]=useState(null);const [result,setResult]=useState("");const [loading,setLoading]=useState(false);const fileRef=useRef();const wc=essay.trim().split(/\s+/).filter(Boolean).length;
  const onImg=async f=>{if(!f)return;setImgPreview(URL.createObjectURL(f));setImgData({data:await toBase64(f),type:f.type||"image/jpeg"});};
  const mark=async()=>{setLoading(true);setResult("");const scheme=`**${exam} ESSAY MARKING${year?` — ${year}`:""}\n━━━━━━━━━━━━━━━\n\n**SCORES:**\n• Content & Relevance: [X]/10 — [comment]\n• Organisation & Flow: [X]/10 — [comment]\n• Language & Expression: [X]/10 — [comment]\n• Grammar & Mechanics: [X]/10 — [comment]\n**TOTAL: [X]/40 — Grade [X]**\n\n**STRENGTHS (quote from essay):**\n1. "[quote]" — [why good]\n2. "[quote]" — [why good]\n\n**ERRORS & CORRECTIONS:**\n[list each error → correction]\n\n**TO REACH A1 IN ${exam}:**\n1. [tip] 2. [tip] 3. [tip]\n\n**IMPROVED OPENING:**\n"[rewrite opening sentence]"\n\n**${exam}${year?` ${year}`:""} TIP:**\n[specific examiner insight]`;try{if(mode==="image"){if(!imgData){alert("Upload essay image!");setLoading(false);return;}setResult(await callClaude(`You are a strict official ${exam} ${subject} examiner${year?` for ${year} style`:""} Read the essay in this image and mark using OFFICIAL ${exam} marking scheme\n\n${scheme}`,null,imgData));}else{if(wc<30){alert("Write at least 30 words!");setLoading(false);return;}setResult(await callClaude(`You are a strict official ${exam} ${subject} examiner. Mark this essay.\nTopic: "${topic||"General essay"}"\nEssay: "${essay}"\n\n${scheme}`,SYS(exam,subject,year)));}}catch{setResult("⚠️ Error marking. Please try again.");}setLoading(false);};
  return(<div><Card style={{background:`linear-gradient(135deg,${C.purpleD}22,${C.card})`,borderColor:C.purple+"44"}}><div style={{fontSize:26,marginBottom:4}}>✍️</div><div style={{fontWeight:900,fontSize:16,color:C.purple,marginBottom:3}}>AI Essay Marker</div><div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>Type OR snap handwritten essay — marked by official {exam} standards!</div></Card><Card><Label>Input</Label><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{[["text","⌨️ Type Essay"],["image","📷 Photo of Essay"]].map(([m,l])=><button key={m} onClick={()=>setMode(m)} style={{background:mode===m?C.purple+"22":"transparent",border:`2px solid ${mode===m?C.purple:C.border}`,borderRadius:12,padding:"12px 8px",color:mode===m?C.purple:C.muted,fontWeight:mode===m?800:400,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>)}</div></Card><Card><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}><div><Label>Exam</Label><Pills options={["WAEC","NECO","JAMB"]} value={exam} onChange={setExam} color={C.purple}/></div><div><Label>Year</Label><Sel value={year} onChange={setYear} options={YEARS} placeholder="Any"/></div></div><Label>Subject</Label><Sel value={subject} onChange={setSubject} options={["English Language","Literature in English","History","Government","Economics","Biology","Chemistry","Physics","Mathematics","Geography","Agricultural Science"]} placeholder="Select subject"/>{mode==="text"&&<div style={{marginTop:10}}><Label>Essay Topic</Label><Inp value={topic} onChange={setTopic} placeholder={`e.g. "${exam} ${year||"2023"}: Discuss the role of technology..."`}/></div>}</Card>{mode==="image"?<Card><Label>Upload Essay Photo</Label><div onClick={()=>fileRef.current.click()} style={{border:`2.5px dashed ${imgPreview?C.purple:C.border}`,borderRadius:14,padding:20,textAlign:"center",cursor:"pointer",background:imgPreview?C.purple+"11":C.card2,marginBottom:10,minHeight:140,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8}}>{imgPreview?<><img src={imgPreview} alt="" style={{maxWidth:"100%",maxHeight:180,borderRadius:10,objectFit:"contain"}}/><div style={{fontSize:11,color:C.purple,fontWeight:700}}>✅ Tap to change</div></>:<><div style={{fontSize:40}}>📄</div><div style={{fontWeight:700,color:C.purple}}>Upload essay photo</div><div style={{fontSize:11,color:C.muted}}>Handwritten, typed, printed</div></>}</div><input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>onImg(e.target.files[0])}/></Card>:<Card><div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><Label>Essay</Label><span style={{fontSize:11,color:wc>=150?C.green:C.muted,fontWeight:700}}>{wc} words {wc<150?"(aim 150+)":"✅"}</span></div><Inp value={essay} onChange={setEssay} multiline rows={9} placeholder="Write your essay here..."/></Card>}<Btn onClick={mark} loading={loading} color={C.purple} tc="#fff">{mode==="image"?"📷 Analyse & Mark Photo":"✍️ Mark My Essay"}</Btn>{result&&<><Out text={result} color={C.purple}/><div style={{display:"flex",gap:8,marginTop:10}}><button onClick={()=>navigator.clipboard.writeText(result)} style={{flex:1,background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 0",color:C.muted,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>📋 Copy</button><a href={`https://wa.me/?text=${encodeURIComponent(`✍️ Essay marked by ExamAce AI!\n${exam} ${year||""}\n\n${result.slice(0,300)}...\n\n🏆 ExamAce AI`)}`} target="_blank" rel="noreferrer" style={{flex:1,background:C.wa,borderRadius:10,padding:"10px 0",color:"#fff",fontWeight:700,fontSize:12,textAlign:"center",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>💬 Share</a></div></>}</div>);
}

// ── STUDY TOOLS (Key Points, Definitions, Focus Areas, Timetable, Mnemonics, Strategy, Maths, Predict, Countdown) ──
function StudyTools() {
  const [sub,setSub]=useState("keypoints");const [exam,setExam]=useState("WAEC");const [subject,setSubject]=useState("Mathematics");const [topic,setTopic]=useState("");const [year,setYear]=useState("");const [out,setOut]=useState("");const [loading,setLoading]=useState(false);const [problem,setProblem]=useState("");const [pScore,setPScore]=useState("");const [pTopics,setPTopics]=useState("");const [pWeeks,setPWeeks]=useState("8");const [cdExam,setCdExam]=useState("WAEC 2025");const [now2,setNow2]=useState(new Date());
  useEffect(()=>{const t=setInterval(()=>setNow2(new Date()),1000);return()=>clearInterval(t);},[]);
  const diff=d=>{const x=d-now2;if(x<=0)return null;return{days:Math.floor(x/86400000),hours:Math.floor((x%86400000)/3600000),mins:Math.floor((x%3600000)/60000),secs:Math.floor((x%60000)/1000)};};
  const urg=d=>d<=30?{c:C.red,l:"🔴 URGENT"}:d<=60?{c:C.orange,l:"🟡 SOON"}:{c:C.green,l:"🟢 ON TRACK"};
  const d=diff(EXAM_DATES[cdExam]);const u=d?urg(d.days):null;
  const PROMPTS={
    keypoints:()=>`Generate comprehensive KEY POINTS for ${exam} ${subject}${topic?` — ${topic}`:""}${year?` (${year} style)`:""}\n\nFor each point:\n**[Point Title]**\n• Explanation\n• Formula or rule if applicable\n⭐ Why this appears in ${exam}\n\nInclude 8-10 most important points. Reference ${exam} marking scheme.`,
    definitions:()=>`Generate GLOSSARY of key terms for ${exam} ${subject}${topic?` — ${topic}`:""}${year?` (${year})`:""}\n\nFor each term:\n**[TERM]** — [Clear definition]\n💡 Example: [Nigerian context]\n🎯 ${exam} note: [How examiners test this]\n\nInclude 12-15 most important terms. Mark ⭐ for terms appearing almost every year.`,
    focusareas:()=>`Identify CRITICAL FOCUS AREAS for ${exam} ${subject}${year?` ${year}`:""}\n\n🔴 **MUST-KNOW (Appear every year):**\n[list with frequency %]\n\n🟡 **HIGH PRIORITY:**\n[list with context]\n\n🟢 **GOOD TO KNOW:**\n[brief list]\n\n📊 **TOPIC WEIGHT ANALYSIS:**\n[marks per topic]\n\n⚡ **LAST-MINUTE TOP 5:**\n[most likely to appear]\n\n🎓 **EXAMINER SECRETS:**\n[3 things top scorers know]`,
    timetable:()=>`Create 4-WEEK STUDY TIMETABLE for ${exam} ${subject}\nTopics: ${SYLLABUS[subject]?.join(", ")||"All topics"}\n\nFor each week:\n📆 **WEEK [N] — [Theme]**\n• Mon-Fri: [topic + activity + duration]\n• Sat: MOCK TEST\n• Sun: REST + light revision\n\n📊 **DAILY ROUTINE:** [schedule]\n💡 **TIPS:** [3 exam prep tips]`,
    mnemonics:()=>`Create MEMORY TRICKS for ${exam} ${subject}${topic?` — ${topic}`:""}\n\nFor each concept:\n💡 **[Concept]**\n🎯 What to remember: [fact/formula]\n🧠 Trick: [mnemonic/acronym]\n📝 Example: [how to use in ${exam}]\n\nInclude 6-8 mnemonics. Make them fun and unforgettable!`,
    examstrategy:()=>`ULTIMATE EXAM STRATEGY for ${exam} ${subject}\n\n⏰ **TIME MANAGEMENT:** [minute-by-minute plan]\n📋 **ANSWERING ORDER:** [which to attempt first]\n✅ **GUARANTEED MARKS:** [easy marks students miss]\n🔍 **READING QUESTIONS:** [keywords to look for]\n✍️ **PRESENTATION:** [formatting tips]\n⚠️ **TOP 10 MISTAKES:** [errors that cost marks]\n🎯 **A1 FORMULA:** [strategy to score 75%+]\n📌 **DAY BEFORE CHECKLIST:** [what to do and NOT do]`,
  };
  const run=async()=>{if(!subject){alert("Select a subject!");return;}setLoading(true);setOut("");try{setOut(await callClaude(PROMPTS[sub](),SYS(exam,subject,year)));}catch{setOut("⚠️ Error. Please try again.");}setLoading(false);};
  const solveMaths=async()=>{if(!problem.trim())return;setLoading(true);setOut("");try{setOut(await callClaude(`Solve step-by-step for WAEC/JAMB:\n\nProblem: ${problem}\n\n**SOLUTION**\n**Given:** [known values]\n**Step 1:** [working]\n**Step 2:** [working]\n[continue]\n✅ **Answer: [final with units]**\n\n📌 **Formula:** [formula used]\n⚠️ **Common mistake:** [what students get wrong]\n🎯 **WAEC/JAMB tip:** [exam tip]`));}catch{setOut("⚠️ Error. Try again.");}setLoading(false);};
  const predict=async()=>{if(!pScore){alert("Enter practice score!");return;}setLoading(true);setOut("");try{setOut(await callClaude(`Predict ${exam} ${subject} results. Score: ${pScore}%, Topics: ${pTopics||"General"}, Weeks: ${pWeeks}\n\n📈 **SCORE PREDICTION**\n**Trajectory:** [Grade]\n**Confidence:** [X]%\n\n📊 **PROBABILITIES:**\n• A1 (75+): [X]%\n• B2-B3: [X]%\n• C4-C6: [X]%\n• F: [X]%\n\n🚀 **TO REACH A1:** [3 actions]\n⚡ **QUICK WINS:** [easy topics]\n📅 **WEEKLY PLAN:** [brief]\n💬 **VERDICT:** [honest assessment]`));}catch{setOut("⚠️ Error. Try again.");}setLoading(false);};
  const TOOLS=[{id:"keypoints",icon:"📌",label:"Key Points",color:C.gold},{id:"definitions",icon:"📖",label:"Definitions",color:C.sky},{id:"focusareas",icon:"🎯",label:"Focus Areas",color:C.red},{id:"mnemonics",icon:"🧠",label:"Mnemonics",color:C.pink},{id:"timetable",icon:"📅",label:"Timetable",color:C.green},{id:"examstrategy",icon:"🏆",label:"Strategy",color:C.purple},{id:"maths",icon:"📐",label:"Maths Solver",color:C.blue},{id:"predict",icon:"📈",label:"Predict Score",color:C.orange},{id:"countdown",icon:"⏰",label:"Countdown",color:C.green}];
  const at=TOOLS.find(t=>t.id===sub);
  return(<div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:16}}>{TOOLS.map(t=><button key={t.id} onClick={()=>{setSub(t.id);setOut("");}} style={{background:sub===t.id?t.color+"22":C.card,border:`1.5px solid ${sub===t.id?t.color:C.border}`,borderRadius:12,padding:"10px 4px",color:sub===t.id?t.color:C.muted,fontWeight:sub===t.id?800:400,fontSize:9,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><span style={{fontSize:22}}>{t.icon}</span>{t.label}</button>)}</div>
  {["keypoints","definitions","focusareas","mnemonics","timetable","examstrategy"].includes(sub)&&<><Card><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}><div><Label>Exam</Label><Sel value={exam} onChange={setExam} options={EXAMS} placeholder="Exam"/></div><div><Label>Year</Label><Sel value={year} onChange={setYear} options={YEARS} placeholder="Any"/></div></div><Label>Subject</Label><Sel value={subject} onChange={setSubject} options={SUBJECTS} placeholder="Select subject"/>{["keypoints","definitions","mnemonics"].includes(sub)&&subject&&SYLLABUS[subject]&&<div style={{marginTop:10}}><Label>Topic</Label><Pills options={SYLLABUS[subject]} value={topic} onChange={v=>setTopic(topic===v?"":v)} color={at?.color}/></div>}</Card><Btn onClick={run} loading={loading} color={at?.color||C.gold} tc={at?.id==="keypoints"?"#000":"#fff"}>{at?.icon} Generate {at?.label}</Btn></>}
  {sub==="maths"&&<><Card style={{borderColor:C.blue+"44"}}><div style={{fontWeight:900,fontSize:15,color:C.blue,marginBottom:3}}>📐 Maths Solver</div><Inp value={problem} onChange={setProblem} multiline rows={4} placeholder={"• Solve 2x² + 5x - 3 = 0\n• Find area of circle r=7cm\n• Simplify log₂8 + log₂4"}/><div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>{["Solve x²-5x+6=0","15% of ₦840","3√48","log₃81=?","sin60°+cos30°"].map(e=><button key={e} onClick={()=>setProblem(e)} style={{background:C.blue+"18",border:`1px solid ${C.blue}33`,borderRadius:20,padding:"4px 10px",color:C.sky,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{e}</button>)}</div></Card><Btn onClick={solveMaths} loading={loading} color={C.blue} tc="#fff">📐 Solve with Full Working</Btn></>}
  {sub==="predict"&&<><Card style={{borderColor:C.orange+"44"}}><div style={{fontWeight:900,fontSize:15,color:C.orange,marginBottom:6}}>📈 Score Predictor</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}><div><Label>Exam</Label><Pills options={EXAMS} value={exam} onChange={setExam} color={C.orange}/></div><div><Label>Subject</Label><Sel value={subject} onChange={setSubject} options={SUBJECTS} placeholder="Subject"/></div></div><Label>Practice Score (%)</Label><Inp value={pScore} onChange={setPScore} type="number" placeholder="e.g. 65"/></Card><Card><Label>Topics Covered</Label><Inp value={pTopics} onChange={setPTopics} placeholder="e.g. Algebra, Statistics..."/></Card><Card><Label>Weeks Until Exam</Label><Pills options={["4","6","8","10","12"]} value={pWeeks} onChange={setPWeeks} color={C.orange}/></Card><Btn onClick={predict} loading={loading} color={C.orange} tc="#fff">📈 Predict My Grade</Btn></>}
  {sub==="countdown"&&<><Card style={{borderColor:C.green+"44"}}><div style={{fontWeight:900,fontSize:15,color:C.green,marginBottom:4}}>⏰ Live Countdown</div></Card><Card><Label>Select Exam</Label><Pills options={Object.keys(EXAM_DATES)} value={cdExam} onChange={setCdExam} color={C.green}/></Card>{d?<><Card style={{background:`linear-gradient(135deg,${u.c}11,${C.card})`,borderColor:u.c+"44",textAlign:"center"}}><div style={{background:u.c+"22",color:u.c,borderRadius:20,padding:"4px 14px",fontSize:11,fontWeight:800,display:"inline-block",marginBottom:12}}>{u.l}</div><div style={{fontSize:12,color:C.muted,marginBottom:16}}>{cdExam} · {EXAM_DATES[cdExam].toLocaleDateString("en-NG",{day:"numeric",month:"long",year:"numeric"})}</div><div style={{display:"flex",justifyContent:"center",gap:12}}>{[["DAYS",d.days],["HRS",d.hours],["MIN",d.mins],["SEC",d.secs]].map(([l,v])=><div key={l} style={{textAlign:"center"}}><div style={{background:C.card2,border:`2px solid ${u.c}44`,borderRadius:14,width:68,height:68,display:"flex",alignItems:"center",justifyContent:"center",fontSize:l==="DAYS"?28:22,fontWeight:900,color:l==="DAYS"?u.c:C.textLight}}>{String(v).padStart(2,"0")}</div><div style={{fontSize:9,color:C.muted,marginTop:5,fontWeight:700,letterSpacing:1.5}}>{l}</div></div>)}</div></Card><Card style={{background:C.green+"11",borderColor:C.green+"33"}}><Label c={C.green}>Study Pace</Label><div style={{fontSize:13,color:C.green,lineHeight:1.7}}>{d.days<=14?"🔴 Final revision — past questions ONLY!":d.days<=30?"🟡 2+ topics/day, mock every 3 days":d.days<=60?"🟢 1 topic/day + 30 past questions daily":"✅ Build foundations — textbook first"}</div></Card></>:<Card style={{textAlign:"center"}}><div style={{fontSize:32}}>🏁</div><div style={{fontWeight:700,marginTop:8,color:C.textLight}}>Exam date has passed</div></Card>}<Card><Label>All Exams</Label>{Object.entries(EXAM_DATES).map(([name,date])=>{const d2=diff(date);const u2=d2?urg(d2.days):null;return(<div key={name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${C.border}`}}><div><div style={{fontWeight:700,fontSize:13,color:C.textLight}}>{name}</div><div style={{fontSize:11,color:C.muted}}>{date.toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"})}</div></div>{d2?<div style={{textAlign:"right"}}><div style={{fontWeight:900,color:u2.c,fontSize:15}}>{d2.days}d</div><div style={{fontSize:10,color:u2.c}}>{u2.l}</div></div>:<span style={{color:C.muted,fontSize:12}}>Passed</span>}</div>);})}  </Card></>}
  {out&&["keypoints","definitions","focusareas","mnemonics","timetable","examstrategy","maths","predict"].includes(sub)&&<><Out text={out} color={at?.color||C.gold}/><div style={{display:"flex",gap:8,marginTop:10}}><button onClick={()=>navigator.clipboard.writeText(out)} style={{flex:1,background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 0",color:C.muted,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>📋 Copy</button><a href={`https://wa.me/?text=${encodeURIComponent(`🏆 ExamAce AI — ${at?.label}\n${exam} ${subject} ${year||""}\n\n${out.slice(0,400)}...\n\nExamAce AI 🇳🇬`)}`} target="_blank" rel="noreferrer" style={{flex:1,background:C.wa,borderRadius:10,padding:"10px 0",color:"#fff",fontWeight:700,fontSize:12,textAlign:"center",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>💬 Share</a></div></>}</div>);
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,setTab]=useState("ask");
  const TABS=[{id:"ask",icon:"💬",label:"Ask AI"},{id:"snap",icon:"📸",label:"Snap"},{id:"cbt",icon:"🖥️",label:"JAMB CBT"},{id:"quiz",icon:"📝",label:"Quiz"},{id:"essay",icon:"✍️",label:"Essay"},{id:"tools",icon:"📚",label:"Study"},{id:"practice",icon:"🛠️",label:"Tools"}];
  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.textLight,fontFamily:"'Segoe UI',sans-serif",paddingBottom:76}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#2a2d3e;border-radius:4px}textarea,input,select,button{box-sizing:border-box}input::placeholder,textarea::placeholder{color:#64748b}select option{background:#1e2130;color:#f1f5f9}.flip-card{perspective:1000px}.flip-inner{transition:transform 0.6s;transform-style:preserve-3d}.flipped{transform:rotateY(180deg)}.flip-front,.flip-back{backface-visibility:hidden;-webkit-backface-visibility:hidden}.flip-back{transform:rotateY(180deg)}`}</style>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg,#0a0c14,#12141e)`,borderBottom:`1px solid ${C.border}`,padding:"13px 14px",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 20px rgba(0,0,0,0.4)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:42,height:42,background:`linear-gradient(135deg,${C.gold},${C.goldD})`,borderRadius:13,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:`0 0 20px ${C.gold}55`,flexShrink:0}}>🏆</div>
          <div style={{flex:1}}><div style={{fontWeight:900,fontSize:19,letterSpacing:"-0.5px",color:C.textLight}}>ExamAce <span style={{color:C.gold}}>AI</span></div><div style={{fontSize:10,color:C.sub,letterSpacing:1.5,textTransform:"uppercase"}}>WAEC · NECO · JAMB CBT · Snap · 🇳🇬</div></div>
          <div style={{background:C.green+"22",border:`1px solid ${C.green}44`,color:C.green,borderRadius:20,padding:"5px 12px",fontSize:10,fontWeight:800}}>✅ UNLIMITED</div>
        </div>
      </div>
      <div style={{padding:"14px 13px 0",animation:"fadeUp .3s ease"}}>
        {tab==="ask"      && <AskAI/>}
        {tab==="snap"     && <SnapSolve/>}
        {tab==="cbt"      && <JambCBT/>}
        {tab==="quiz"     && <Quiz/>}
        {tab==="essay"    && <EssayMarker/>}
        {tab==="tools"    && <StudyTools/>}
        {tab==="practice" && <PracticeTools/>}
      </div>
      {/* Bottom Nav */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#0a0c14",borderTop:`1px solid ${C.border}`,display:"flex",zIndex:100,boxShadow:"0 -4px 20px rgba(0,0,0,0.4)",overflowX:"auto"}}>
        {TABS.map(t=><div key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 0 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer",borderTop:tab===t.id?`2px solid ${C.gold}`:"2px solid transparent",color:tab===t.id?C.gold:C.sub,fontSize:9,fontWeight:tab===t.id?800:400,transition:"all .2s",minWidth:46}}><span style={{fontSize:18}}>{t.icon}</span>{t.label}</div>)}
      </div>
    </div>
  );
}