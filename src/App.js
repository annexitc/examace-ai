/* eslint-disable */
import { useState, useRef, useEffect } from "react";

// ── THEME ─────────────────────────────────────────────────────────────────────
const C = {
  bg: "#0f1117", card: "#16181f", card2: "#1e2130", border: "#2a2d3e",
  gold: "#f5c842", goldD: "#c49b1a",
  green: "#22c55e", greenD: "#15803d", greenL: "#f0fdf4",
  blue: "#3b82f6", blueD: "#1d4ed8", blueL: "#eff6ff",
  purple: "#a855f7", purpleD: "#7e22ce",
  red: "#ef4444", redD: "#b91c1c", redL: "#fef2f2",
  orange: "#f97316", orangeD: "#c2410c",
  sky: "#38bdf8", skyD: "#0369a1",
  teal: "#14b8a6", pink: "#ec4899",
  wa: "#25D366", waD: "#075E54",
  // text colors — always readable on their background
  textDark: "#0f172a",   // for WHITE/LIGHT backgrounds (chat bubbles, cards)
  textLight: "#f1f5f9",  // for DARK backgrounds (main app)
  muted: "#94a3b8",
  sub: "#64748b",
};

// ── TEXT FORMATTER ────────────────────────────────────────────────────────────
// onDark=true  → text is on dark background (OutBox, dark cards) → use light colors
// onDark=false → text is on light background (chat bubbles #fff / #dcf8c6) → use dark colors
const formatText = (text, onDark = true) => {
  const headingColor = onDark ? C.gold : "#92400e";
  const boldColor    = onDark ? "#ffffff" : "#1e293b";
  const bodyColor    = onDark ? "#e2e8f0" : "#1e293b";
  const codeColor    = onDark ? "#f1f5f9" : "#1e293b";
  const codeBg       = onDark ? "#0a0c14"  : "#e2e8f0";
  const hrColor      = onDark ? "#2a2d3e"  : "#cbd5e1";

  return text.split("\n").map((l, i) => {
    // strip heading markers but style the text
    let html = l
      .replace(/^###\s*(.*)/, `<span style="font-size:13px;font-weight:800;color:${headingColor}">$1</span>`)
      .replace(/^##\s*(.*)/,  `<span style="font-size:14px;font-weight:900;color:${headingColor}">$1</span>`)
      .replace(/^#\s*(.*)/,   `<span style="font-size:15px;font-weight:900;color:${headingColor}">$1</span>`)
      .replace(/\*\*(.*?)\*\*/g, `<b style="color:${boldColor}">$1</b>`)
      .replace(/\*(.*?)\*/g,     `<b style="color:${boldColor}">$1</b>`)
      .replace(/`(.*?)`/g, `<code style="background:${codeBg};color:${codeColor};padding:1px 6px;border-radius:4px;font-size:12px;font-family:monospace">$1</code>`)
      .replace(/^━+$/, `<hr style="border:none;border-top:1px solid ${hrColor};margin:6px 0"/>`)
      .replace(/^─+$/, `<hr style="border:none;border-top:1px solid ${hrColor};margin:6px 0"/>`)
      .replace(/^•\s*/, `<span style="color:${headingColor}">•</span> `);

    return (
      <div key={i}
        dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }}
        style={{ lineHeight: 1.85, color: bodyColor }}
      />
    );
  });
};

const EXAMS = ["WAEC","NECO","JAMB","POST-UTME"];
const YEARS = ["2025","2024","2023","2022","2021","2020","2019","2018","2017","2016","2015","2014","2012","2010","2008","2005","2003","2000"];
const SUBJECTS = ["Mathematics","English Language","Physics","Chemistry","Biology","Economics","Government","Literature in English","Accounting","Commerce","Geography","Agricultural Science","Further Mathematics","Civic Education","Christian Religious Studies","Islamic Studies"];
const EXAM_DATES = {
  "WAEC 2025": new Date("2026-05-05"),
  "NECO 2025": new Date("2026-06-16"),
  "JAMB 2025": new Date("2026-04-16"),
  "POST-UTME":  new Date("2026-08-15"),
};
const SYLLABUS = {
  Mathematics:       ["Number & Numeration","Algebraic Processes","Geometry & Mensuration","Trigonometry","Statistics & Probability","Calculus","Matrices & Transformation","Vectors","Modular Arithmetic","Sets & Logic"],
  "English Language":["Comprehension","Summary Writing","Continuous Writing","Lexis & Structure","Oral English","Register & Figures of Speech","Tense & Agreement","Vocabulary Development"],
  Physics:           ["Mechanics","Thermal Physics","Waves & Sound","Light & Optics","Electricity & Magnetism","Atomic & Nuclear Physics","Electronics","Energy & Power"],
  Chemistry:         ["Atomic Structure & Bonding","Stoichiometry","Acids Bases & Salts","Electrochemistry","Organic Chemistry","Chemical Kinetics","Equilibrium","Metals & Non-metals","Environmental Chemistry"],
  Biology:           ["Cell Biology & Biochemistry","Genetics & Evolution","Ecology & Environment","Nutrition & Digestion","Transport in Plants & Animals","Respiration","Reproduction","Excretion & Homeostasis","Coordination & Control","Diseases & Immunity"],
  Economics:         ["Demand Supply & Elasticity","Market Structures","National Income","Money Banking & Finance","Public Finance","International Trade","Population & Labour","Agricultural & Industrial Economics"],
  Government:        ["Constitution & Federalism","Legislature Executive & Judiciary","Electoral Systems & Political Parties","International Relations","Nigerian Political History","Citizenship & Human Rights"],
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const toBase64 = f => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(",")[1]);
  r.onerror = rej;
  r.readAsDataURL(f);
});
const ts = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const callClaude = async (messages, system, imgData) => {
  let msgs = messages;
  if (imgData) {
    const txt = typeof messages === "string" ? messages
      : Array.isArray(messages) ? (messages[messages.length - 1]?.content || "") : "";
    msgs = [{ role: "user", content: [
      { type: "image", source: { type: "base64", media_type: imgData.type, data: imgData.data } },
      { type: "text", text: txt }
    ]}];
  } else if (typeof messages === "string") {
    msgs = [{ role: "user", content: messages }];
  }
  const body = { model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: msgs };
  if (system) body.system = system;
  const res = await fetch("https://examace-backend.onrender.com/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await res.json();
  return d.content?.find(b => b.type === "text")?.text || "Could not process. Please try again.";
};

const SYS = (exam, subject, year) =>
  `You are ExamAce AI — Nigeria's #1 WAEC/NECO/JAMB exam preparation tutor.
Context: ${exam} · ${subject}${year ? ` · ${year} style` : ""}
Rules:
- Strictly follow the official Nigerian ${exam} syllabus for ${subject}
- All answers reference ${exam} marking scheme and question style
- When year is specified, answer with that year's context and trends
- Format responses clearly: use **bold** for key terms, numbered steps, short paragraphs
- Be warm, expert, encouraging — like a brilliant Nigerian tutor
- Always end with a relevant exam tip`;

// ── UI ATOMS ──────────────────────────────────────────────────────────────────
const Card = ({ children, style = {} }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 14, ...style }}>
    {children}
  </div>
);

const Label = ({ c = C.muted, children }) => (
  <div style={{ fontSize: 11, fontWeight: 800, color: c, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 7 }}>
    {children}
  </div>
);

const Inp = ({ value, onChange, placeholder, multiline, rows, type = "text" }) =>
  multiline
    ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows || 5}
        style={{ width: "100%", background: C.card2, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "11px 14px", color: C.textLight, fontSize: 13, outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.6 }} />
    : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type}
        style={{ width: "100%", background: C.card2, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "11px 14px", color: C.textLight, fontSize: 13, outline: "none", fontFamily: "inherit" }} />;

const Pills = ({ options, value, onChange, color = C.gold }) => (
  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
    {options.map(o => (
      <button key={o} onClick={() => onChange(o)}
        style={{ background: value === o ? color + "28" : "transparent", border: `1.5px solid ${value === o ? color : C.border}`, borderRadius: 20, padding: "6px 14px", color: value === o ? color : C.muted, fontWeight: value === o ? 800 : 400, fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
        {o}
      </button>
    ))}
  </div>
);

const Sel = ({ value, onChange, options, placeholder }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    style={{ width: "100%", background: C.card2, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "11px 14px", color: value ? C.textLight : C.sub, fontSize: 13, outline: "none", fontFamily: "inherit" }}>
    <option value="">{placeholder || "Select..."}</option>
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

const Btn = ({ onClick, loading: l, children, color = C.gold, tc = "#000", disabled, sm }) => (
  <button onClick={onClick} disabled={l || disabled}
    style={{ width: sm ? "auto" : "100%", background: l || disabled ? C.card2 : color, border: "none", borderRadius: sm ? 10 : 13, padding: sm ? "8px 18px" : "14px 20px", color: l || disabled ? C.sub : tc, fontWeight: 800, fontSize: sm ? 12 : 14, cursor: l || disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit" }}>
    {l ? <><span style={{ width: 15, height: 15, border: "2px solid #444", borderTopColor: color, borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />Working...</> : children}
  </button>
);

// OutBox — always on DARK background → use light text
const Out = ({ text, color = C.gold }) => (
  <div style={{ background: C.card2, border: `1px solid ${color}33`, borderRadius: 14, padding: 16, maxHeight: 460, overflowY: "auto", fontSize: 13, marginTop: 12, animation: "fadeUp .4s ease" }}>
    {formatText(text, true)}
  </div>
);

const Badge = ({ children, color = C.gold }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
    {children}
  </span>
);

// ── 1. ASK AI ─────────────────────────────────────────────────────────────────
function AskAI() {
  const [msgs, setMsgs] = useState([{
    from: "bot",
    text: `👋 **Welcome to ExamAce AI!** 🏆\n\nAsk me **anything** about your exams — no limits!\n\n📸 Snap a question → I solve it\n📅 Ask by year → "WAEC 2022 Physics Q4"\n📚 Any topic → step-by-step explanation\n\nType below or tap 📷 to send a photo!`,
    time: ts()
  }]);
  const [input, setInput] = useState("");
  const [exam, setExam] = useState("WAEC");
  const [subject, setSubject] = useState("Mathematics");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [imgPreview, setImgPreview] = useState(null);
  const [imgData, setImgData] = useState(null);
  const chatRef = useRef(); const fileRef = useRef();

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [msgs]);

  const onImg = async f => {
    if (!f) return;
    setImgPreview(URL.createObjectURL(f));
    setImgData({ data: await toBase64(f), type: f.type || "image/jpeg" });
  };

  const send = async () => {
    const msg = input.trim();
    if (!msg && !imgData) return;
    const yr = msg.match(/\b(19|20)\d{2}\b/)?.[0] || year;
    const display = imgPreview ? (msg ? `📷 [Photo]\n${msg}` : "📷 [Question photo]") : msg;
    setMsgs(m => [...m, { from: "user", text: display, time: ts(), img: imgPreview }]);
    setInput(""); setImgPreview(null); setLoading(true);
    try {
      let reply;
      if (imgData) {
        reply = await callClaude(
          `You are an official ${exam} examiner for ${subject}${yr ? ` (${yr} style)` : ""}. Read ALL question(s) in this image.\n\n**QUESTION READ:** [restate exactly]\n**SUBJECT & TOPIC:** [identify]\n**FULL SOLUTION:** [complete step-by-step]\n**KEY CONCEPT:** [syllabus concept]\n**MARKS:** [how ${exam} marks this]\n**${exam} TIP:** [examiner insight]`,
          null, imgData
        );
        setImgData(null);
      } else {
        const hist = msgs.slice(-6).map(m => ({ role: m.from === "user" ? "user" : "assistant", content: m.text }));
        reply = await callClaude([...hist, { role: "user", content: msg }], SYS(exam, subject, yr));
      }
      setMsgs(m => [...m, { from: "bot", text: reply, time: ts() }]);
    } catch {
      setMsgs(m => [...m, { from: "bot", text: "⚠️ Connection issue. Please try again!", time: ts() }]);
    }
    setLoading(false);
  };

  return (
    <div>
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <div><Label>Exam</Label><Sel value={exam} onChange={setExam} options={EXAMS} placeholder="Exam" /></div>
          <div><Label>Subject</Label><Sel value={subject} onChange={setSubject} options={SUBJECTS} placeholder="Subject" /></div>
          <div><Label>Year</Label><Sel value={year} onChange={setYear} options={YEARS} placeholder="Any" /></div>
        </div>
        <div style={{ marginTop: 8, background: C.blue + "18", borderRadius: 8, padding: "7px 10px", fontSize: 11, color: C.sky }}>
          💡 Try: <b>"WAEC 2021 Biology Q3"</b> or <b>"Explain osmosis for NECO"</b>
        </div>
      </Card>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden", marginBottom: 12 }}>
        {/* WA header */}
        <div style={{ background: C.waD, padding: "11px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: C.wa, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤖</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>ExamAce AI · {exam} {subject}{year ? ` · ${year}` : ""}</div>
            <div style={{ fontSize: 10, color: "#b2dfdb" }}>Official syllabus · Unlimited · 📷 Snap enabled</div>
          </div>
        </div>

        {/* Messages */}
        <div ref={chatRef} style={{ height: 340, overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 10, background: "#ece5dd" }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start", animation: i === msgs.length - 1 ? "fadeUp .3s ease" : "none" }}>
              <div style={{
                maxWidth: "83%",
                background: m.from === "user" ? "#dcf8c6" : "#ffffff",
                borderRadius: m.from === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                padding: "10px 13px", fontSize: 13,
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
              }}>
                {m.img && <img src={m.img} alt="" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 8, maxHeight: 140, objectFit: "cover" }} />}
                {/* ALWAYS onDark=false here — bubbles are white/light green */}
                <div>{formatText(m.text, false)}</div>
                <div style={{ fontSize: 10, color: "#64748b", textAlign: "right", marginTop: 4 }}>
                  {m.time}{m.from === "user" && <span style={{ color: "#34B7F1" }}> ✓✓</span>}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex" }}>
              <div style={{ background: "#fff", borderRadius: "14px 14px 14px 2px", padding: "11px 16px", display: "flex", gap: 5 }}>
                {[0, 1, 2].map(d => <span key={d} style={{ width: 8, height: 8, borderRadius: "50%", background: "#94a3b8", display: "inline-block", animation: `blink 1.2s ${d * .22}s infinite` }} />)}
              </div>
            </div>
          )}
        </div>

        {/* Image preview */}
        {imgPreview && (
          <div style={{ padding: "8px 12px", background: C.blue + "18", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <img src={imgPreview} alt="" style={{ width: 46, height: 46, objectFit: "cover", borderRadius: 8, border: `2px solid ${C.blue}` }} />
            <div style={{ flex: 1, fontSize: 12, color: C.sky, fontWeight: 700 }}>📷 Photo ready</div>
            <button onClick={() => { setImgPreview(null); setImgData(null); }} style={{ background: C.card2, border: "none", color: C.red, borderRadius: 8, padding: "4px 10px", fontSize: 13, cursor: "pointer" }}>✕</button>
          </div>
        )}

        {/* Input */}
        <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, alignItems: "flex-end", background: C.card2 }}>
          <button onClick={() => fileRef.current.click()} style={{ width: 40, height: 40, background: C.wa, borderRadius: "50%", border: "none", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>📷</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => onImg(e.target.files[0])} />
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !loading && send()}
            placeholder="Ask anything or snap 📷..."
            style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 22, padding: "10px 16px", color: C.textLight, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
          <button onClick={send} disabled={loading || (!input.trim() && !imgData)}
            style={{ width: 40, height: 40, background: (input.trim() || imgData) && !loading ? C.wa : C.border, borderRadius: "50%", border: "none", cursor: "pointer", fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background .2s" }}>➤</button>
        </div>
      </div>

      {/* Quick prompts */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["WAEC 2023 Maths", "JAMB 2022 Chemistry", "Explain Genetics NECO", "WAEC essay tips", "What repeats in JAMB?"].map(q => (
          <button key={q} onClick={() => setInput(q)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "5px 12px", color: C.gold, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{q}</button>
        ))}
      </div>
    </div>
  );
}

// ── 2. SNAP & SOLVE ───────────────────────────────────────────────────────────
function SnapSolve() {
  const [preview, setPreview] = useState(null);
  const [imgData, setImgData] = useState(null);
  const [exam, setExam] = useState("WAEC");
  const [subject, setSubject] = useState("");
  const [year, setYear] = useState("");
  const [note, setNote] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const onFile = async f => {
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    setImgData({ data: await toBase64(f), type: f.type || "image/jpeg" });
    setAnswer("");
  };

  const solve = async () => {
    if (!imgData) return;
    setLoading(true); setAnswer("");
    try {
      setAnswer(await callClaude(
        `You are an official ${exam} examiner${subject ? ` for ${subject}` : ""}${year ? ` (${year} style)` : ""}.\nRead ALL question(s) in this image carefully.\n\n**QUESTION READ:** [restate exactly what you see]\n**SUBJECT & TOPIC:** [identify subject and specific syllabus topic]\n${year ? `**${exam} ${year} CONTEXT:** [similarity to actual ${year} questions]\n` : ""}\n**COMPLETE SOLUTION:**\n[Full step-by-step answer using ${exam} marking scheme]\n\n**KEY CONCEPT TESTED:**\n[The exact ${exam} syllabus concept]\n\n**MARKS BREAKDOWN:**\n[How ${exam} would allocate marks]\n\n**EXAMINER TIP:**\n[Specific insight for this question type in ${exam}]\n\n${note ? `Student note: "${note}"` : ""}`,
        "", imgData
      ));
    } catch { setAnswer("⚠️ Could not read image. Ensure good lighting and try again."); }
    setLoading(false);
  };

  return (
    <div>
      <Card style={{ background: `linear-gradient(135deg,${C.greenD}22,${C.card})`, borderColor: C.green + "44" }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>📸</div>
        <div style={{ fontWeight: 900, fontSize: 16, color: C.green, marginBottom: 3 }}>Snap & Solve</div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>Snap any question from textbook, past paper, chalkboard, or exam booklet — AI reads and solves with official marking scheme!</div>
      </Card>

      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <div><Label>Exam</Label><Sel value={exam} onChange={setExam} options={EXAMS} placeholder="Exam" /></div>
          <div><Label>Subject</Label><Sel value={subject} onChange={setSubject} options={SUBJECTS} placeholder="Auto" /></div>
          <div><Label>Year</Label><Sel value={year} onChange={setYear} options={YEARS} placeholder="Any" /></div>
        </div>
      </Card>

      <div onClick={() => fileRef.current.click()}
        style={{ border: `2.5px dashed ${preview ? C.green : C.border}`, borderRadius: 16, padding: 24, textAlign: "center", cursor: "pointer", background: preview ? C.green + "11" : C.card, marginBottom: 12, minHeight: 180, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, transition: "all .2s" }}>
        {preview
          ? <><img src={preview} alt="" style={{ maxWidth: "100%", maxHeight: 240, borderRadius: 10, objectFit: "contain" }} /><div style={{ fontSize: 11, color: C.green, fontWeight: 700, marginTop: 4 }}>✅ Tap to change</div></>
          : <><div style={{ fontSize: 52 }}>📷</div><div style={{ fontWeight: 700, color: C.green, fontSize: 15 }}>Tap to upload question photo</div><div style={{ fontSize: 12, color: C.muted }}>Handwritten · Printed · Screenshot · Board</div></>}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => onFile(e.target.files[0])} />
      </div>

      {preview && (
        <><Card><Label>Note (optional)</Label><Inp value={note} onChange={setNote} placeholder="e.g. 'WAEC 2022 Q3b — show full working'" /></Card>
          <Btn onClick={solve} loading={loading} color={C.green} tc="#fff">🔍 Read & Solve</Btn></>
      )}

      {answer && (
        <>
          <Out text={answer} color={C.green} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => navigator.clipboard.writeText(answer)} style={{ flex: 1, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 0", color: C.muted, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>📋 Copy</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(`📸 Solved by ExamAce AI!\n${exam} ${year || ""} ${subject || ""}\n\n${answer.slice(0, 350)}...\n\n🏆 ExamAce AI Nigeria`)}`} target="_blank" rel="noreferrer" style={{ flex: 1, background: C.wa, borderRadius: 10, padding: "10px 0", color: "#fff", fontWeight: 700, fontSize: 12, textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>💬 Share</a>
          </div>
        </>
      )}
    </div>
  );
}

// ── 3. QUIZ ───────────────────────────────────────────────────────────────────
function Quiz() {
  const [mode, setMode] = useState("setup");
  const [qtype, setQtype] = useState("year");
  const [exam, setExam] = useState("WAEC");
  const [subject, setSubject] = useState("Mathematics");
  const [year, setYear] = useState("2023");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(10);
  const [qs, setQs] = useState([]);
  const [cur, setCur] = useState(0);
  const [sel, setSel] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(45);
  const [timerOn, setTimerOn] = useState(false);
  const [coach, setCoach] = useState("");
  const [coachLoading, setCoachLoading] = useState(false);
  const tRef = useRef();

  useEffect(() => {
    if (timerOn && timer > 0) { tRef.current = setTimeout(() => setTimer(t => t - 1), 1000); }
    else if (timer === 0 && timerOn) { handle(null); }
    return () => clearTimeout(tRef.current);
  }, [timerOn, timer]);

  const parse = t => {
    try { const c = t.replace(/```json|```/g, "").trim(); return JSON.parse(c.slice(c.indexOf("["), c.lastIndexOf("]") + 1)); }
    catch { return null; }
  };

  const start = async () => {
    setLoading(true);
    const p = qtype === "year"
      ? `Generate ${count} authentic ${exam} ${year} style MCQs for ${subject}${topic ? ` (topic: ${topic})` : ""}. ONLY valid JSON array, no other text: [{"q":"","options":{"A":"","B":"","C":"","D":""},"answer":"A","explanation":"","tip":"","year":"${year}","topic":"","difficulty":"easy|medium|hard"}]`
      : `Generate ${count} RANDOMIZED ${exam} MCQs for ${subject} from ALL these topics: ${SYLLABUS[subject]?.join(", ") || "all topics"}. Mix years 2015-2024. Max 2 per topic. ONLY valid JSON array: [{"q":"","options":{"A":"","B":"","C":"","D":""},"answer":"A","explanation":"","tip":"","year":"20XX","topic":"","difficulty":"easy|medium|hard"}]`;
    try {
      const t = await callClaude(p, SYS(exam, subject, qtype === "year" ? year : ""));
      const parsed = parse(t);
      if (parsed?.length > 0) {
        setQs(parsed); setCur(0); setScore(0); setLog([]); setSel(null); setAnswered(false);
        setMode("quiz"); setTimer(45); setTimerOn(true);
      } else alert("Could not generate. Try again.");
    } catch { alert("Connection error. Try again."); }
    setLoading(false);
  };

  const handle = l => {
    if (answered) return;
    clearTimeout(tRef.current); setTimerOn(false);
    setSel(l); setAnswered(true);
    const q = qs[cur], ok = l === q.answer;
    if (ok) setScore(s => s + 1);
    setLog(lg => [...lg, { ...q, sel: l, ok }]);
  };

  const next = () => {
    if (cur + 1 >= qs.length) finish();
    else { setCur(c => c + 1); setSel(null); setAnswered(false); setTimer(45); setTimerOn(true); }
  };

  const finish = async () => {
    setMode("result");
    const wrong = log.filter(r => !r.ok);
    if (wrong.length > 0) {
      setCoachLoading(true);
      try { setCoach(await callClaude(`Student got ${wrong.length}/${qs.length} wrong in ${exam} ${subject}. Missed: ${[...new Set(wrong.map(w => w.topic))].join(", ")}. Write a 90-word WhatsApp coaching note with **bold**, emojis, 2 tips, motivation referencing ${exam} syllabus.`)); }
      catch { setCoach("Keep going! Review the topics you missed and try again. You've got this! 💪"); }
      setCoachLoading(false);
    }
  };

  const pct = qs.length > 0 ? Math.round((score / qs.length) * 100) : 0;
  const grade = pct >= 75 ? { g: "A1", c: C.green } : pct >= 65 ? { g: "B2", c: C.sky } : pct >= 55 ? { g: "C4", c: C.orange } : pct >= 45 ? { g: "C6", c: C.gold } : { g: "F9", c: C.red };
  const q = qs[cur];

  return (
    <div>
      {mode === "setup" && (
        <>
          <Card style={{ background: `linear-gradient(135deg,${C.blueD}22,${C.card})`, borderColor: C.blue + "44" }}>
            <div style={{ fontSize: 26, marginBottom: 4 }}>📝</div>
            <div style={{ fontWeight: 900, fontSize: 16, color: C.blue, marginBottom: 3 }}>Past Questions & Random Test</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>Year-specific authentic questions OR fully randomized mixed-topic tests — live marking, 45s timer & personal coaching!</div>
          </Card>
          <Card>
            <Label>Test Type</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["year", "📅 Year-Specific\nPast Questions"], ["random", "🎲 Randomized\nMixed Topics"]].map(([t, l]) => (
                <button key={t} onClick={() => setQtype(t)} style={{ background: qtype === t ? C.blue + "22" : "transparent", border: `2px solid ${qtype === t ? C.blue : C.border}`, borderRadius: 12, padding: "12px 8px", color: qtype === t ? C.blue : C.muted, fontWeight: qtype === t ? 800 : 400, fontSize: 12, cursor: "pointer", fontFamily: "inherit", lineHeight: 1.5, whiteSpace: "pre-line" }}>{l}</button>
              ))}
            </div>
          </Card>
          <Card><Label>Exam</Label><Pills options={EXAMS} value={exam} onChange={setExam} color={C.blue} /></Card>
          <Card><Label>Subject</Label><Sel value={subject} onChange={setSubject} options={SUBJECTS} placeholder="Select subject" /></Card>
          {qtype === "year" && (
            <>
              <Card>
                <Label>Year</Label>
                <Pills options={["2024","2023","2022","2021","2020","2019","2018","2017"]} value={year} onChange={setYear} color={C.blue} />
                <div style={{ marginTop: 8 }}><Sel value={year} onChange={setYear} options={YEARS} placeholder="Or pick older year..." /></div>
              </Card>
              <Card>
                <Label>Topic (optional)</Label>
                {subject && SYLLABUS[subject]
                  ? <Pills options={SYLLABUS[subject]} value={topic} onChange={v => setTopic(topic === v ? "" : v)} color={C.blue} />
                  : <Inp value={topic} onChange={setTopic} placeholder="Enter topic..." />}
              </Card>
            </>
          )}
          {qtype === "random" && subject && SYLLABUS[subject] && (
            <Card style={{ background: C.blue + "11", borderColor: C.blue + "33" }}>
              <Label c={C.blue}>Topics in Random Pool</Label>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {SYLLABUS[subject].map(t => <span key={t} style={{ background: C.blue + "22", color: C.sky, border: `1px solid ${C.blue}33`, borderRadius: 20, padding: "2px 9px", fontSize: 10 }}>{t}</span>)}
              </div>
            </Card>
          )}
          <Card><Label>Questions</Label><Pills options={["5","10","15","20"]} value={String(count)} onChange={v => setCount(parseInt(v))} color={C.blue} /></Card>
          <Btn onClick={start} loading={loading} color={C.blue} tc="#fff">{qtype === "year" ? `📅 Start ${exam} ${year} Test` : "🎲 Start Randomized Test"}</Btn>
        </>
      )}

      {mode === "quiz" && q && (
        <div style={{ animation: "fadeUp .3s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Badge color={C.blue}>Q{cur + 1}/{qs.length}</Badge>
            <div style={{ background: C.blue + "18", border: `1px solid ${C.blue}33`, borderRadius: 20, padding: "3px 10px", fontSize: 10, color: C.sky, fontWeight: 700 }}>{exam} {q.year || year} · {q.topic}</div>
            <div style={{ background: timer <= 10 ? C.red : C.orange, color: "#fff", borderRadius: 20, padding: "4px 12px", fontWeight: 800, fontSize: 13 }}>⏱ {timer}s</div>
          </div>
          <div style={{ background: C.border, borderRadius: 4, height: 4, marginBottom: 8 }}>
            <div style={{ background: C.blue, height: "100%", borderRadius: 4, width: `${((cur + (answered ? 1 : 0)) / qs.length) * 100}%`, transition: "width .4s" }} />
          </div>
          <div style={{ background: "#7f1d1d22", borderRadius: 3, height: 3, marginBottom: 14 }}>
            <div style={{ background: timer > 20 ? C.green : timer > 10 ? C.orange : C.red, height: "100%", borderRadius: 3, width: `${(timer / 45) * 100}%`, transition: "width 1s linear" }} />
          </div>

          <Card style={{ background: C.blue + "11", borderColor: C.blue + "44" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.blue, marginBottom: 6 }}>
              {exam} {q.year || year} · {subject} · <Badge color={q.difficulty === "easy" ? C.green : q.difficulty === "medium" ? C.gold : C.red}>{q.difficulty}</Badge>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.6, color: C.textLight }}>{q.q}</div>
          </Card>

          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {Object.entries(q.options).map(([l, t]) => {
              const ok = l === q.answer, isSel = sel === l;
              let bg = C.card, border = C.border, color = C.textLight;
              if (answered) {
                if (ok) { bg = C.green + "22"; border = C.green; color = C.green; }
                else if (isSel) { bg = C.red + "22"; border = C.red; color = C.red; }
              } else if (isSel) { bg = C.blue + "18"; border = C.blue; }
              return (
                <button key={l} onClick={() => handle(l)} disabled={answered}
                  style={{ background: bg, border: `2px solid ${border}`, borderRadius: 14, padding: "13px 16px", color, fontSize: 13, textAlign: "left", cursor: answered ? "default" : "pointer", display: "flex", gap: 12, alignItems: "center", transition: "all .15s", fontFamily: "inherit" }}>
                  <span style={{ width: 30, height: 30, borderRadius: "50%", background: answered && ok ? C.green : answered && isSel ? C.red : C.card2, color: answered && (ok || isSel) ? "#fff" : C.muted, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                    {answered ? (ok ? "✓" : isSel ? "✗" : l) : l}
                  </span>
                  <span style={{ flex: 1, lineHeight: 1.4 }}>{t}</span>
                </button>
              );
            })}
          </div>

          {answered && (
            <div style={{ marginTop: 14, animation: "fadeUp .35s ease" }}>
              <Card style={{ background: sel === q.answer ? C.green + "18" : C.red + "18", borderColor: sel === q.answer ? C.green : C.red }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: sel === q.answer ? C.green : C.red, marginBottom: 6 }}>
                  {sel === q.answer ? "✅ Correct!" : sel === null ? `⏰ Time's up! Answer: ${q.answer}` : `❌ Wrong. Correct: ${q.answer}`}
                </div>
                <div style={{ fontSize: 13, color: C.textLight, lineHeight: 1.7 }}>{q.explanation}</div>
              </Card>
              <Card style={{ background: C.gold + "11", borderColor: C.gold + "44" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.gold, marginBottom: 4 }}>🎯 {exam} TIP</div>
                <div style={{ fontSize: 12, color: C.textLight, lineHeight: 1.6 }}>{q.tip}</div>
              </Card>
              <Btn onClick={next} color={C.blue} tc="#fff">{cur + 1 >= qs.length ? "🏁 See Results →" : "Next Question →"}</Btn>
            </div>
          )}
        </div>
      )}

      {mode === "result" && (
        <div style={{ animation: "fadeUp .4s ease" }}>
          <Card style={{ textAlign: "center", background: `linear-gradient(135deg,${grade.c}18,${C.card})`, borderColor: grade.c + "44" }}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>{pct >= 75 ? "🏆" : pct >= 55 ? "✅" : "💪"}</div>
            <div style={{ fontWeight: 900, fontSize: 44, color: grade.c }}>{pct}%</div>
            <div style={{ fontWeight: 900, fontSize: 20, color: grade.c, marginBottom: 4 }}>Grade {grade.g}</div>
            <div style={{ fontSize: 13, color: C.muted }}>{score}/{qs.length} · {subject} · {exam} {qtype === "year" ? year : "Random"}</div>
          </Card>

          {qtype === "random" && (
            <Card>
              <Label c={C.blue}>Topic Performance</Label>
              {[...new Set(log.map(r => r.topic))].map(tp => {
                const tqs = log.filter(r => r.topic === tp), ts = tqs.filter(r => r.ok).length, p = Math.round((ts / tqs.length) * 100);
                return (
                  <div key={tp} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: C.textLight }}>{tp}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: p >= 70 ? C.green : p >= 50 ? C.orange : C.red }}>{ts}/{tqs.length}</span>
                    </div>
                    <div style={{ background: C.border, borderRadius: 4, height: 6 }}>
                      <div style={{ background: p >= 70 ? C.green : p >= 50 ? C.orange : C.red, height: "100%", borderRadius: 4, width: `${p}%`, transition: "width .8s" }} />
                    </div>
                  </div>
                );
              })}
            </Card>
          )}

          {(coachLoading || coach) && (
            <Card style={{ background: C.green + "11", borderColor: C.green + "33" }}>
              <Label c={C.green}>🏆 AI Coach</Label>
              {coachLoading
                ? <div style={{ color: C.muted, fontSize: 13 }}>Analysing...</div>
                : <div style={{ fontSize: 13, lineHeight: 1.8, color: C.textLight, whiteSpace: "pre-wrap" }}>{coach}</div>}
            </Card>
          )}

          <Card>
            <Label>Review</Label>
            {log.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}`, alignItems: "flex-start" }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{r.ok ? "✅" : "❌"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: C.sky, fontWeight: 700, marginBottom: 2 }}>{r.topic} · {r.year}</div>
                  <div style={{ fontSize: 12, color: C.textLight, lineHeight: 1.4, marginBottom: 2 }}>{r.q}</div>
                  {!r.ok && <div style={{ fontSize: 11, color: C.red }}>You: {r.sel || "–"} · Correct: {r.answer}</div>}
                </div>
              </div>
            ))}
          </Card>

          <div style={{ display: "flex", gap: 8 }}>
            <a href={`https://wa.me/?text=${encodeURIComponent(`🏆 I scored ${pct}% (Grade ${grade.g}) on ${exam} ${subject}!\n\nPrepare with ExamAce AI 🇳🇬`)}`} target="_blank" rel="noreferrer" style={{ flex: 1, background: C.wa, borderRadius: 12, padding: "13px 0", color: "#fff", fontWeight: 800, fontSize: 13, textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>💬 Share</a>
            <button onClick={() => { setMode("setup"); setCoach(""); }} style={{ flex: 1, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 0", color: C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>🔄 New Test</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 4. ESSAY MARKER ───────────────────────────────────────────────────────────
function EssayMarker() {
  const [mode, setMode] = useState("text");
  const [essay, setEssay] = useState("");
  const [topic, setTopic] = useState("");
  const [exam, setExam] = useState("WAEC");
  const [subject, setSubject] = useState("English Language");
  const [year, setYear] = useState("");
  const [imgPreview, setImgPreview] = useState(null);
  const [imgData, setImgData] = useState(null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();
  const wc = essay.trim().split(/\s+/).filter(Boolean).length;

  const onImg = async f => {
    if (!f) return;
    setImgPreview(URL.createObjectURL(f));
    setImgData({ data: await toBase64(f), type: f.type || "image/jpeg" });
  };

  const mark = async () => {
    setLoading(true); setResult("");
    const scheme = `**${exam} ESSAY MARKING${year ? ` — ${year}` : ""}**\n━━━━━━━━━━━━━━━\n\n**SCORES:**\n• Content & Relevance: [X]/10 — [comment]\n• Organisation & Flow: [X]/10 — [comment]\n• Language & Expression: [X]/10 — [comment]\n• Grammar & Mechanics: [X]/10 — [comment]\n**TOTAL: [X]/40 — Grade [X]**\n\n**STRENGTHS (quote from essay):**\n1. "[quote]" — [why good]\n2. "[quote]" — [why good]\n\n**ERRORS & CORRECTIONS:**\n[list each error → correction]\n\n**TO REACH A1 IN ${exam}:**\n1. [tip]\n2. [tip]\n3. [tip]\n\n**IMPROVED OPENING:**\n"[rewrite their opening sentence]"\n\n**${exam}${year ? ` ${year}` : ""} TIP:**\n[specific examiner insight]`;

    try {
      if (mode === "image") {
        if (!imgData) { alert("Upload essay image!"); setLoading(false); return; }
        setResult(await callClaude(`You are a strict official ${exam} ${subject} examiner${year ? ` for ${year} style` : ""}. Read the essay in this image and mark it using the OFFICIAL ${exam} marking scheme.\n\n${scheme}`, "", imgData));
      } else {
        if (wc < 30) { alert("Write at least 30 words!"); setLoading(false); return; }
        setResult(await callClaude(`You are a strict official ${exam} ${subject} examiner. Mark this essay.\nTopic: "${topic || "General essay"}"\nEssay: "${essay}"\n\n${scheme}`, SYS(exam, subject, year)));
      }
    } catch { setResult("⚠️ Error marking. Please try again."); }
    setLoading(false);
  };

  return (
    <div>
      <Card style={{ background: `linear-gradient(135deg,${C.purpleD}22,${C.card})`, borderColor: C.purple + "44" }}>
        <div style={{ fontSize: 26, marginBottom: 4 }}>✍️</div>
        <div style={{ fontWeight: 900, fontSize: 16, color: C.purple, marginBottom: 3 }}>AI Essay Marker</div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>Type OR snap a photo of handwritten essay — marked by official {exam} standards with scores, corrections & tips!</div>
      </Card>

      <Card>
        <Label>Input</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[["text", "⌨️ Type Essay"], ["image", "📷 Photo of Essay"]].map(([m, l]) => (
            <button key={m} onClick={() => setMode(m)} style={{ background: mode === m ? C.purple + "22" : "transparent", border: `2px solid ${mode === m ? C.purple : C.border}`, borderRadius: 12, padding: "12px 8px", color: mode === m ? C.purple : C.muted, fontWeight: mode === m ? 800 : 400, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{l}</button>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div><Label>Exam</Label><Pills options={["WAEC","NECO","JAMB"]} value={exam} onChange={setExam} color={C.purple} /></div>
          <div><Label>Year</Label><Sel value={year} onChange={setYear} options={YEARS} placeholder="Any" /></div>
        </div>
        <Label>Subject</Label>
        <Sel value={subject} onChange={setSubject} options={["English Language","Literature in English","History","Government","Economics","Biology","Chemistry","Physics","Mathematics","Geography","Agricultural Science"]} placeholder="Select subject" />
        {mode === "text" && (
          <div style={{ marginTop: 10 }}>
            <Label>Essay Topic</Label>
            <Inp value={topic} onChange={setTopic} placeholder={`e.g. "${exam} ${year || "2023"}: Discuss the role of technology in Nigeria..."`} />
          </div>
        )}
      </Card>

      {mode === "image"
        ? <Card>
            <Label>Upload Essay Photo</Label>
            <div onClick={() => fileRef.current.click()} style={{ border: `2.5px dashed ${imgPreview ? C.purple : C.border}`, borderRadius: 14, padding: 20, textAlign: "center", cursor: "pointer", background: imgPreview ? C.purple + "11" : C.card2, marginBottom: 10, minHeight: 150, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
              {imgPreview
                ? <><img src={imgPreview} alt="" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 10, objectFit: "contain" }} /><div style={{ fontSize: 11, color: C.purple, fontWeight: 700 }}>✅ Tap to change</div></>
                : <><div style={{ fontSize: 44 }}>📄</div><div style={{ fontWeight: 700, color: C.purple }}>Tap to upload essay photo</div><div style={{ fontSize: 12, color: C.muted }}>Handwritten, typed, printed</div></>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => onImg(e.target.files[0])} />
            <div style={{ background: C.gold + "11", border: `1px solid ${C.gold}33`, borderRadius: 10, padding: 10, fontSize: 12, color: C.gold }}>💡 Good lighting + all text visible = accurate marking</div>
          </Card>
        : <Card>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
              <Label>Essay</Label>
              <span style={{ fontSize: 11, color: wc >= 150 ? C.green : C.muted, fontWeight: 700 }}>{wc} words {wc < 150 ? "(aim 150+)" : "✅"}</span>
            </div>
            <Inp value={essay} onChange={setEssay} multiline rows={9} placeholder="Write your essay here — introduction, body paragraphs, conclusion..." />
          </Card>}

      <Btn onClick={mark} loading={loading} color={C.purple} tc="#fff">{mode === "image" ? "📷 Analyse & Mark Photo" : "✍️ Mark My Essay"}</Btn>

      {result && (
        <>
          <Out text={result} color={C.purple} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => navigator.clipboard.writeText(result)} style={{ flex: 1, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 0", color: C.muted, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>📋 Copy</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(`✍️ My essay was marked by ExamAce AI!\n${exam} ${year || ""} standard\n\n${result.slice(0, 300)}...\n\n🏆 ExamAce AI Nigeria`)}`} target="_blank" rel="noreferrer" style={{ flex: 1, background: C.wa, borderRadius: 10, padding: "10px 0", color: "#fff", fontWeight: 700, fontSize: 12, textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>💬 Share</a>
          </div>
        </>
      )}
    </div>
  );
}

// ── 5. STUDY TOOLS ────────────────────────────────────────────────────────────
function StudyTools() {
  const [sub, setSub] = useState("keypoints");
  const [exam, setExam] = useState("WAEC");
  const [subject, setSubject] = useState("Mathematics");
  const [topic, setTopic] = useState("");
  const [year, setYear] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState("");
  const [pScore, setPScore] = useState("");
  const [pTopics, setPTopics] = useState("");
  const [pWeeks, setPWeeks] = useState("8");
  const [cdExam, setCdExam] = useState("WAEC 2025");
  const [now2, setNow2] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setNow2(new Date()), 1000); return () => clearInterval(t); }, []);

  const diff = d => { const x = d - now2; if (x <= 0) return null; return { days: Math.floor(x / 86400000), hours: Math.floor((x % 86400000) / 3600000), mins: Math.floor((x % 3600000) / 60000), secs: Math.floor((x % 60000) / 1000) }; };
  const urg = d => d <= 30 ? { c: C.red, l: "🔴 URGENT" } : d <= 60 ? { c: C.orange, l: "🟡 SOON" } : { c: C.green, l: "🟢 ON TRACK" };
  const d = diff(EXAM_DATES[cdExam]); const u = d ? urg(d.days) : null;

  const PROMPTS = {
    keypoints: () => `Generate comprehensive KEY POINTS for ${exam} ${subject}${topic ? ` — ${topic}` : ""}${year ? ` (${year} style)` : ""}.\n\nFor each point use this format:\n**[Point Title]**\n• Explanation\n• Formula or rule if applicable\n⭐ Why this appears in ${exam}\n\nInclude 8-10 most important points. Highlight what examiners test most. Add memory tricks. Reference ${exam} marking scheme.`,
    definitions: () => `Generate a COMPREHENSIVE GLOSSARY of key terms for ${exam} ${subject}${topic ? ` — ${topic}` : ""}${year ? ` (${year})` : ""}.\n\nFor each term:\n**[TERM]** — [Clear definition in simple English]\n💡 Example: [Nigerian-context example]\n🎯 ${exam} note: [How examiners test this term]\n\nInclude 12-15 most important terms. Mark ⭐ for terms that appear almost every year.`,
    focusareas: () => `Identify CRITICAL FOCUS AREAS for ${exam} ${subject}${year ? ` ${year}` : ""}.\n\n🔴 **MUST-KNOW (Appear every year):**\n[list with frequency %]\n\n🟡 **HIGH PRIORITY (Appear most years):**\n[list with context]\n\n🟢 **GOOD TO KNOW (Occasional):**\n[list briefly]\n\n📊 **TOPIC WEIGHT ANALYSIS:**\n[marks allocation per topic]\n\n⚡ **LAST-MINUTE TOP 5:**\n[most likely to appear]\n\n🎓 **EXAMINER SECRETS:**\n[3 things top scorers know]`,
    flashcards: () => `Create 10 FLASHCARD pairs for ${exam} ${subject}${topic ? ` — ${topic}` : ""}.\n\nFor each card:\n━━━ Card [N] ━━━\n**FRONT:** [Question or term]\n**BACK:** [Answer — max 2 lines]\n**Memory Trick:** [Mnemonic or visual association]\n\nMake cards progressively harder. Last 2 should be ${exam} exam-style questions. Use Nigerian examples.`,
    timetable: () => `Create a PERSONALISED 4-WEEK STUDY TIMETABLE for ${exam} ${subject}.\n\nTopics: ${SYLLABUS[subject]?.join(", ") || "All topics"}\n\nFor each week:\n📆 **WEEK [N] — [Theme]**\n• Mon: [topic + activity + duration]\n• Tue: [topic + activity]\n• Wed: [topic + activity]\n• Thu: [topic + activity]\n• Fri: [topic + activity]\n• Sat: MOCK TEST or REVIEW\n• Sun: REST + light revision\n\n📊 **DAILY ROUTINE:**\n[Morning/Afternoon/Evening schedule]\n\n💡 **PRODUCTIVITY TIPS:**\n[3 tips specific to ${exam} prep]`,
    mnemonics: () => `Create POWERFUL MEMORY TRICKS for ${exam} ${subject}${topic ? ` — ${topic}` : ""}.\n\nFor each concept:\n💡 **[Concept Name]**\n🎯 What to remember: [fact/formula]\n🧠 Memory trick: [mnemonic/acronym/visual]\n📝 Example: [how to use in ${exam}]\n\nInclude 6-8 mnemonics, acronyms for lists, visual associations for formulas, story-based tricks for sequences, Nigerian-context hooks. Make them fun and impossible to forget!`,
    examstrategy: () => `Reveal the ULTIMATE EXAM STRATEGY for ${exam} ${subject}.\n\n⏰ **TIME MANAGEMENT:**\n[minute-by-minute exam day plan]\n\n📋 **ANSWERING ORDER:**\n[which questions to attempt first and why]\n\n✅ **GUARANTEED MARKS TECHNIQUE:**\n[easy marks most students miss]\n\n🔍 **READING THE QUESTION:**\n[keywords to look for in ${exam} ${subject}]\n\n✍️ **PRESENTATION SECRETS:**\n[formatting tips that earn extra marks]\n\n⚠️ **TOP 10 MISTAKES TO AVOID:**\n[common errors that cost marks]\n\n🎯 **THE A1 FORMULA:**\n[exact strategy to score 75%+]\n\n📌 **DAY BEFORE EXAM CHECKLIST:**\n[what to do and NOT do]`,
  };

  const run = async () => {
    if (!subject && sub !== "countdown") { alert("Select a subject!"); return; }
    setLoading(true); setOut("");
    try { setOut(await callClaude(PROMPTS[sub](), SYS(exam, subject, year))); }
    catch { setOut("⚠️ Error generating. Please try again."); }
    setLoading(false);
  };

  const solveMaths = async () => {
    if (!problem.trim()) return;
    setLoading(true); setOut("");
    try {
      setOut(await callClaude(`You are a Nigerian WAEC/JAMB maths teacher. Solve step-by-step:\n\nProblem: ${problem}\n\n**SOLUTION**\n━━━━━━━\n**Given:** [known values]\n**Step 1 — [action]:** [working]\n**Step 2 — [action]:** [working]\n[continue as needed]\n✅ **Answer: [final answer with units]**\n\n📌 **Formula used:** [formula]\n⚠️ **Common mistake:** [what students get wrong]\n🎯 **WAEC/JAMB tip:** [exam tip]`));
    } catch { setOut("⚠️ Error. Try again."); }
    setLoading(false);
  };

  const predict = async () => {
    if (!pScore) { alert("Enter practice score!"); return; }
    setLoading(true); setOut("");
    try {
      setOut(await callClaude(`Predict ${exam} ${subject} results. Practice score: ${pScore}%, Topics covered: ${pTopics || "General revision"}, Weeks to exam: ${pWeeks}.\n\n📈 **SCORE PREDICTION**\n━━━━━━━━━━━\n**Current Trajectory:** [Grade] ([score range])\n**Confidence:** [X]%\n\n📊 **GRADE PROBABILITIES:**\n• A1 (75+): [X]%\n• B2-B3 (65-74): [X]%\n• C4-C6 (50-64): [X]%\n• F (below 50): [X]%\n\n🚀 **TO REACH A1:** [3 specific actions]\n⚡ **QUICK WIN TOPICS:** [easy marks available]\n📅 **WEEK-BY-WEEK PLAN:** [brief plan]\n💬 **COACH'S VERDICT:** [honest motivating assessment]`));
    } catch { setOut("⚠️ Error. Try again."); }
    setLoading(false);
  };

  const TOOLS = [
    { id: "keypoints",    icon: "📌", label: "Key Points",     color: C.gold },
    { id: "definitions",  icon: "📖", label: "Definitions",    color: C.sky },
    { id: "focusareas",   icon: "🎯", label: "Focus Areas",    color: C.red },
    { id: "flashcards",   icon: "🃏", label: "Flashcards",     color: C.teal },
    { id: "mnemonics",    icon: "🧠", label: "Mnemonics",      color: C.pink },
    { id: "timetable",    icon: "📅", label: "Timetable",      color: C.green },
    { id: "examstrategy", icon: "🏆", label: "Strategy",       color: C.purple },
    { id: "maths",        icon: "📐", label: "Maths Solver",   color: C.blue },
    { id: "predict",      icon: "📈", label: "Predict Score",  color: C.orange },
    { id: "countdown",    icon: "⏰", label: "Countdown",      color: C.green },
  ];

  const activeTool = TOOLS.find(t => t.id === sub);

  return (
    <div>
      {/* Tool grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 7, marginBottom: 16 }}>
        {TOOLS.map(t => (
          <button key={t.id} onClick={() => { setSub(t.id); setOut(""); }}
            style={{ background: sub === t.id ? t.color + "22" : C.card, border: `1.5px solid ${sub === t.id ? t.color : C.border}`, borderRadius: 12, padding: "10px 4px", color: sub === t.id ? t.color : C.muted, fontWeight: sub === t.id ? 800 : 400, fontSize: 9, cursor: "pointer", fontFamily: "inherit", transition: "all .15s", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Context selectors */}
      {["keypoints","definitions","focusareas","flashcards","mnemonics","timetable","examstrategy"].includes(sub) && (
        <>
          <Card>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div><Label>Exam</Label><Sel value={exam} onChange={setExam} options={EXAMS} placeholder="Exam" /></div>
              <div><Label>Year (optional)</Label><Sel value={year} onChange={setYear} options={YEARS} placeholder="Any" /></div>
            </div>
            <div style={{ marginBottom: 10 }}><Label>Subject</Label><Sel value={subject} onChange={setSubject} options={SUBJECTS} placeholder="Select subject" /></div>
            {["keypoints","definitions","flashcards","mnemonics"].includes(sub) && subject && SYLLABUS[subject] && (
              <div><Label>Topic (optional)</Label><Pills options={SYLLABUS[subject]} value={topic} onChange={v => setTopic(topic === v ? "" : v)} color={activeTool?.color} /></div>
            )}
          </Card>
          <Btn onClick={run} loading={loading} color={activeTool?.color || C.gold} tc={activeTool?.id === "keypoints" ? "#000" : "#fff"}>
            {activeTool?.icon} Generate {activeTool?.label}
          </Btn>
        </>
      )}

      {/* Maths */}
      {sub === "maths" && (
        <>
          <Card style={{ background: `linear-gradient(135deg,${C.blueD}18,${C.card})`, borderColor: C.blue + "44" }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>📐</div>
            <div style={{ fontWeight: 900, fontSize: 15, color: C.blue }}>Maths Step-by-Step Solver</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Any maths problem — full WAEC/JAMB working shown with examiner tips!</div>
          </Card>
          <Card>
            <Label>Problem</Label>
            <Inp value={problem} onChange={setProblem} multiline rows={4} placeholder={"Examples:\n• Solve 2x² + 5x - 3 = 0\n• Find area of circle with radius 7cm\n• Simplify log₂8 + log₂4\n• A man walks 5km north then 12km east. Find distance from start."} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {["Solve x²-5x+6=0","15% of ₦840","Simplify 3√48","log₃81=?","sin60°+cos30°"].map(ex => (
                <button key={ex} onClick={() => setProblem(ex)} style={{ background: C.blue + "18", border: `1px solid ${C.blue}33`, borderRadius: 20, padding: "4px 11px", color: C.sky, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>{ex}</button>
              ))}
            </div>
          </Card>
          <Btn onClick={solveMaths} loading={loading} color={C.blue} tc="#fff">📐 Solve with Full Working</Btn>
        </>
      )}

      {/* Predict */}
      {sub === "predict" && (
        <>
          <Card style={{ background: `linear-gradient(135deg,${C.orangeD}18,${C.card})`, borderColor: C.orange + "44" }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>📈</div>
            <div style={{ fontWeight: 900, fontSize: 15, color: C.orange }}>Score Predictor</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Enter your performance → get predicted grade + A1 strategy!</div>
          </Card>
          <Card>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div><Label>Exam</Label><Pills options={EXAMS} value={exam} onChange={setExam} color={C.orange} /></div>
              <div><Label>Subject</Label><Sel value={subject} onChange={setSubject} options={SUBJECTS} placeholder="Subject" /></div>
            </div>
            <Label>Practice Score (%)</Label>
            <Inp value={pScore} onChange={setPScore} type="number" placeholder="e.g. 65" />
          </Card>
          <Card><Label>Topics Covered</Label><Inp value={pTopics} onChange={setPTopics} placeholder="e.g. Algebra, Statistics, Geometry..." /></Card>
          <Card><Label>Weeks Until Exam</Label><Pills options={["4","6","8","10","12"]} value={pWeeks} onChange={setPWeeks} color={C.orange} /></Card>
          <Btn onClick={predict} loading={loading} color={C.orange} tc="#fff">📈 Predict My Grade</Btn>
        </>
      )}

      {/* Countdown */}
      {sub === "countdown" && (
        <>
          <Card style={{ background: `linear-gradient(135deg,${C.greenD}18,${C.card})`, borderColor: C.green + "44" }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>⏰</div>
            <div style={{ fontWeight: 900, fontSize: 15, color: C.green }}>Live Exam Countdown</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Real-time countdown — never be caught unprepared!</div>
          </Card>
          <Card><Label>Select Exam</Label><Pills options={Object.keys(EXAM_DATES)} value={cdExam} onChange={setCdExam} color={C.green} /></Card>
          {d ? (
            <>
              <Card style={{ background: `linear-gradient(135deg,${u.c}11,${C.card})`, borderColor: u.c + "44", textAlign: "center" }}>
                <div style={{ background: u.c + "22", color: u.c, borderRadius: 20, padding: "4px 14px", fontSize: 11, fontWeight: 800, display: "inline-block", marginBottom: 12 }}>{u.l}</div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>{cdExam} · {EXAM_DATES[cdExam].toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                  {[["DAYS",d.days],["HRS",d.hours],["MIN",d.mins],["SEC",d.secs]].map(([l, v]) => (
                    <div key={l} style={{ textAlign: "center" }}>
                      <div style={{ background: C.card2, border: `2px solid ${u.c}44`, borderRadius: 14, width: 68, height: 68, display: "flex", alignItems: "center", justifyContent: "center", fontSize: l === "DAYS" ? 28 : 22, fontWeight: 900, color: l === "DAYS" ? u.c : C.textLight, boxShadow: `0 0 20px ${u.c}22` }}>{String(v).padStart(2, "0")}</div>
                      <div style={{ fontSize: 9, color: C.muted, marginTop: 5, fontWeight: 700, letterSpacing: 1.5 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card style={{ background: C.green + "11", borderColor: C.green + "33" }}>
                <Label c={C.green}>📚 Study Pace</Label>
                <div style={{ fontSize: 13, color: C.green, lineHeight: 1.7 }}>
                  {d.days <= 14 ? "🔴 Final revision — past questions ONLY now!" : d.days <= 30 ? "🟡 2+ topics/day, mock every 3 days" : d.days <= 60 ? "🟢 1 topic/day + 30 past questions daily" : "✅ Build foundations — textbook and notes first"}
                </div>
              </Card>
            </>
          ) : (
            <Card style={{ textAlign: "center" }}><div style={{ fontSize: 36 }}>🏁</div><div style={{ fontWeight: 700, marginTop: 8, color: C.textLight }}>Exam date has passed</div></Card>
          )}
          <Card>
            <Label>All Exams</Label>
            {Object.entries(EXAM_DATES).map(([name, date]) => {
              const d2 = diff(date); const u2 = d2 ? urg(d2.days) : null;
              return (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.textLight }}>{name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</div>
                  </div>
                  {d2
                    ? <div style={{ textAlign: "right" }}><div style={{ fontWeight: 900, color: u2.c, fontSize: 15 }}>{d2.days}d</div><div style={{ fontSize: 10, color: u2.c }}>{u2.l}</div></div>
                    : <span style={{ color: C.muted, fontSize: 12 }}>Passed</span>}
                </div>
              );
            })}
          </Card>
        </>
      )}

      {/* Output */}
      {out && ["keypoints","definitions","focusareas","flashcards","mnemonics","timetable","examstrategy","maths","predict"].includes(sub) && (
        <>
          <Out text={out} color={activeTool?.color || C.gold} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => navigator.clipboard.writeText(out)} style={{ flex: 1, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 0", color: C.muted, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>📋 Copy</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(`🏆 ExamAce AI — ${activeTool?.label}\n${exam} ${subject} ${year || ""}\n\n${out.slice(0, 400)}...\n\nExamAce AI 🇳🇬`)}`} target="_blank" rel="noreferrer" style={{ flex: 1, background: C.wa, borderRadius: 10, padding: "10px 0", color: "#fff", fontWeight: 700, fontSize: 12, textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>💬 Share</a>
          </div>
        </>
      )}
    </div>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("ask");
  const TABS = [
    { id: "ask",   icon: "💬", label: "Ask AI" },
    { id: "snap",  icon: "📸", label: "Snap" },
    { id: "quiz",  icon: "📝", label: "Quiz" },
    { id: "essay", icon: "✍️",  label: "Essay" },
    { id: "study", icon: "📚", label: "Study" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.textLight, fontFamily: "'Segoe UI', sans-serif", paddingBottom: 76 }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #2a2d3e; border-radius: 4px; }
        textarea, input, select, button { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: #64748b; }
        select option { background: #1e2130; color: #f1f5f9; }
      `}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg,#0a0c14,#12141e)`, borderBottom: `1px solid ${C.border}`, padding: "13px 14px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 20px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 42, height: 42, background: `linear-gradient(135deg,${C.gold},${C.goldD})`, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: `0 0 20px ${C.gold}55`, flexShrink: 0 }}>🏆</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 19, letterSpacing: "-0.5px", color: C.textLight }}>ExamAce <span style={{ color: C.gold }}>AI</span></div>
            <div style={{ fontSize: 10, color: C.sub, letterSpacing: 1.5, textTransform: "uppercase" }}>WAEC · NECO · JAMB · Snap · Year-Specific · 🇳🇬</div>
          </div>
          <div style={{ background: C.green + "22", border: `1px solid ${C.green}44`, color: C.green, borderRadius: 20, padding: "5px 12px", fontSize: 10, fontWeight: 800 }}>✅ UNLIMITED</div>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ padding: "14px 13px 0", animation: "fadeUp .3s ease" }}>
        {tab === "ask"   && <AskAI />}
        {tab === "snap"  && <SnapSolve />}
        {tab === "quiz"  && <Quiz />}
        {tab === "essay" && <EssayMarker />}
        {tab === "study" && <StudyTools />}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0a0c14", borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 100, boxShadow: "0 -4px 20px rgba(0,0,0,0.4)" }}>
        {TABS.map(t => (
          <div key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: "10px 0 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer", borderTop: tab === t.id ? `2px solid ${C.gold}` : "2px solid transparent", color: tab === t.id ? C.gold : C.sub, fontSize: 10, fontWeight: tab === t.id ? 800 : 400, transition: "all .2s" }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>{t.label}
          </div>
        ))}
      </div>
    </div>
  );
}