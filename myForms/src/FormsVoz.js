import React, { useState, useEffect, useRef } from "react";

// ─── AIRTABLE ─────────────────────────────────────────────────────────────────
const AIRTABLE_TOKEN = "pat9AFggLM7iwdFQf.93e843fddd0fb5871e8e98eba3a996ff0805406e698afb0575d01be27d9f5b3f";
const AIRTABLE_BASE  = "appF6xeb2ltmPwRXr";
const AIRTABLE_TABLE = "respostas";

async function saveToAirtable(answers) {
  const fields = { timestamp: new Date().toISOString(), ...answers };
  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
}

// ─── PALETA ───────────────────────────────────────────────────────────────────
const C = {
  bg:        "#0c0e12",
  surface:   "#12151a",
  surface2:  "#181c22",
  border:    "#22272f",
  accent:    "#7EB8D4",   // azul aço
  accentDim: "#0d1620",
  accentBorder: "#1e3a50",
  text:      "#eef1f5",
  textMid:   "#7a8694",
  textDim:   "#3a4450",
  botBg:     "#141820",
  userBg:    "#0f1e2e",
  userBorder:"#1e3a54",
  userText:  "#c8dff0",
};

// ─── PERGUNTAS ────────────────────────────────────────────────────────────────
const BLOCKS = [
  { id: 1, label: "Bloco 01", title: "Sua rotina de treinos" },
  { id: 2, label: "Bloco 02", title: "O que você consome" },
  { id: 3, label: "Bloco 03", title: "Preparação no dia a dia" },
  { id: 4, label: "Bloco 04", title: "O que você já tentou" },
  { id: 5, label: "Bloco 05", title: "O que mais importa" },
];

const QUESTIONS = [
  { id:"q1",  block:1, type:"choice", text:"Há quanto tempo você treina regularmente?",                                                                               options:["Menos de 6 meses","6 meses a 1 ano","1 a 3 anos","Mais de 3 anos"] },
  { id:"q2",  block:1, type:"choice", text:"Onde você costuma treinar?",                                                                                              options:["Academia convencional","Studio / aulas marcadas","Em casa","Mais de um ambiente"] },
  { id:"q3",  block:1, type:"choice", text:"Com que frequência você treina por semana?",                                                                              options:["1 a 2 vezes","3 a 4 vezes","5 vezes ou mais","Varia muito"] },
  { id:"q4",  block:2, type:"choice", text:"Você consome algum suplemento ligado aos treinos? (whey, creatina, BCAA...)",                                            options:["Sim, regularmente","Sim, às vezes","Não consumo","Já consumi mas parei"], skipIf:a=>a==="Não consumo", skipTo:"q11" },
  { id:"q5",  block:2, type:"voice",  text:"Pensa na sua última semana de treinos. O que você consumiu antes, durante ou depois — conta como você fez isso.",        placeholder:"Ou digita aqui se preferir..." },
  { id:"q6",  block:3, type:"voice",  text:"Como você normalmente se prepara antes de sair para treinar? O que você pensa, separa, leva?",                           placeholder:"Ou digita aqui se preferir..." },
  { id:"q7",  block:3, type:"voice",  text:"Já aconteceu de chegar no treino e perceber que esqueceu algo que queria ter consumido? Como foi?",                      placeholder:"Ou digita aqui se preferir..." },
  { id:"q8",  block:3, type:"voice",  text:"Tem alguma parte da sua rotina de suplementação que você acha trabalhosa ou preferia que fosse diferente?",              placeholder:"Ou digita aqui se preferir..." },
  { id:"q9",  block:4, type:"voice",  text:"Você já tentou alguma forma de tornar sua rotina de suplementação mais prática? O que funcionou, o que não funcionou?",  placeholder:"Ou digita aqui se preferir..." },
  { id:"q10", block:4, type:"voice",  text:"Você usa ou já usou algum serviço de conveniência fitness? (marmitas, personal, apps, assinaturas...)",                 placeholder:"Ou digita aqui se preferir..." },
  { id:"q11", block:5, type:"voice",  text:"Quando o assunto é suplementação, o que é mais importante pra você?",                                                    placeholder:"Ou digita aqui se preferir..." },
  { id:"q12", block:5, type:"voice",  text:"Se você pudesse mudar uma coisa — só uma — na forma como cuida da sua nutrição e suplementação hoje, o que seria?",     placeholder:"Ou digita aqui se preferir..." },
];

const TOTAL = QUESTIONS.length;
function uid() { return Math.random().toString(36).slice(2); }

function getNextIndex(idx, answers) {
  const q = QUESTIONS[idx];
  if (q?.skipIf && q?.skipTo && q.skipIf(answers[q.id])) {
    const i = QUESTIONS.findIndex(x => x.id === q.skipTo);
    if (i !== -1) return i;
  }
  return idx + 1;
}

// ─── BLOCO HEADER ─────────────────────────────────────────────────────────────
function BlockHeader({ blockId }) {
  const b = BLOCKS.find(x => x.id === blockId);
  if (!b) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "24px 0 10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.textDim, fontWeight: 600 }}>
          {b.label}
        </span>
        <span style={{ width: 1, height: 12, background: C.border }} />
        <span style={{ fontSize: 15, color: C.accent, fontWeight: 600, letterSpacing: 0.2 }}>
          {b.title}
        </span>
      </div>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

// ─── THANK YOU ────────────────────────────────────────────────────────────────
function ThankYou({ saveStatus }) {
  return (
    <div style={{ minHeight:"100dvh", width:"100%", background: C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:"32px 24px", boxSizing:"border-box", fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ width:"100%", maxWidth:400, textAlign:"center" }}>
        <div style={{ width:80, height:80, borderRadius:"50%", background: C.accentDim, border:`2px solid ${C.accent}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, margin:"0 auto 28px", animation:"popIn 0.4s ease" }}>
          🙏
        </div>
        <h1 style={{ fontSize:"clamp(24px, 7vw, 32px)", fontWeight:300, color: C.text, margin:"0 0 16px", lineHeight:1.3 }}>
          Obrigado pela<br />
          <em style={{ color: C.accent, fontStyle:"italic" }}>sua participação!</em>
        </h1>
        <p style={{ color: C.textMid, fontSize:"clamp(14px, 4vw, 16px)", lineHeight:1.7, margin:"0 0 32px", maxWidth:320, marginLeft:"auto", marginRight:"auto" }}>
          Suas respostas vão nos ajudar a entender melhor a rotina de quem treina de verdade.
        </p>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 20px", borderRadius:24, background: saveStatus==="error" ? "#2e0d0d" : C.accentDim, border:`1px solid ${saveStatus==="error" ? "#7a2020" : C.accentBorder}`, fontSize:13, color: saveStatus==="error" ? "#ff8080" : C.accent }}>
          {saveStatus==="saving" && <><span style={{ animation:"spin 1s linear infinite", display:"inline-block" }}>⏳</span> Salvando...</>}
          {saveStatus==="ok"     && <><span>✓</span> Respostas salvas com sucesso</>}
          {saveStatus==="error"  && <><span>⚠️</span> Erro ao salvar</>}
        </div>
        <div style={{ marginTop:48, paddingTop:32, borderTop:`1px solid ${C.border}` }}>
          <p style={{ color: C.textDim, fontSize:12, margin:0, lineHeight:1.7 }}>
            Estamos estudando formas de tornar<br />a rotina fitness mais inteligente e conveniente.
          </p>
        </div>
      </div>
      <style>{`
        @keyframes popIn { 0%{transform:scale(0.5);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
        @keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function FormsVoz() {
  const [phase, setPhase]             = useState("intro");
  const [qIndex, setQIndex]           = useState(0);
  const [answers, setAnswers]         = useState({});
  const [messages, setMessages]       = useState([]);
  const [inputText, setInputText]     = useState("");
  const [isTyping, setIsTyping]       = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hasVoice, setHasVoice]       = useState(false);
  const [saveStatus, setSaveStatus]   = useState("idle");
  const [editingId, setEditingId]     = useState(null); // id da pergunta sendo reditada
  const bottomRef      = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setHasVoice(!!SR);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const answered = Object.keys(answers).length;
  const progress = Math.round((answered / TOTAL) * 100);
  const currentQ = editingId ? QUESTIONS.find(q => q.id === editingId) : QUESTIONS[qIndex];

  function pushBot(text, blockId, forceId) {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(p => [...p, { type:"bot", text, blockId, id: forceId || uid() }]);
    }, 700);
  }

  function startChat() {
    setPhase("chat");
    setMessages([{ type:"bot", text:"Oi! Vou te fazer algumas perguntas sobre sua rotina de treinos. Sem julgamentos — só quero entender como é sua vida real. 👊", id:uid() }]);
    setTimeout(() => pushBot(QUESTIONS[0].text, QUESTIONS[0].block), 700);
  }

  // Toca numa resposta do usuário para reeditar
  function startEdit(qId) {
    const q = QUESTIONS.find(x => x.id === qId);
    if (!q) return;
    setEditingId(qId);
    setInputText(answers[qId] || "");
    // injeta mensagem do bot pedindo nova resposta
    setMessages(p => [...p, {
      type: "bot",
      text: `Claro, pode refazer: "${q.text}"`,
      blockId: q.block,
      id: uid(),
    }]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:"smooth" }), 100);
  }

  function goBack() {
    if (editingId) { setEditingId(null); setInputText(""); return; }
    if (qIndex === 0) return;
    // encontra índice anterior respondido
    const prevIdx = qIndex - 1;
    const prevQ   = QUESTIONS[prevIdx];
    setQIndex(prevIdx);
    setInputText(answers[prevQ.id] || "");
    setEditingId(prevQ.id);
    setMessages(p => [...p, {
      type: "bot",
      text: `Voltando: "${prevQ.text}"`,
      blockId: prevQ.block,
      id: uid(),
    }]);
  }

  function submitAnswer(value) {
    if (!value.trim()) return;
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); }

    if (editingId) {
      // substituí resposta existente no histórico de mensagens
      setAnswers(p => ({ ...p, [editingId]: value }));
      setMessages(p => {
        // remove a última resposta do usuário para esse editingId e adiciona nova
        const filtered = p.filter(m => !(m.type === "user" && m.editId === editingId));
        return [...filtered, { type:"user", text:value, editId:editingId, id:uid() }];
      });
      setEditingId(null);
      setInputText("");
      return;
    }

    const q = QUESTIONS[qIndex];
    setMessages(p => [...p, { type:"user", text:value, editId:q.id, id:uid() }]);
    const next = { ...answers, [q.id]: value };
    setAnswers(next);
    setInputText("");

    const nextIdx = getNextIndex(qIndex, next);
    if (nextIdx < QUESTIONS.length) {
      setQIndex(nextIdx);
      setTimeout(() => pushBot(QUESTIONS[nextIdx].text, QUESTIONS[nextIdx].block), 300);
    } else {
      setTimeout(async () => {
        setPhase("done");
        setSaveStatus("saving");
        try { await saveToAirtable(next); setSaveStatus("ok"); }
        catch { setSaveStatus("error"); }
      }, 400);
    }
  }

  function toggleVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      // pequeno delay para garantir que a transcrição final chegou
      setTimeout(() => {
        setInputText(prev => { if (prev.trim()) submitAnswer(prev); return ""; });
      }, 300);
      return;
    }
    const r = new SR();
    r.lang = "pt-BR"; r.continuous = true; r.interimResults = true;
    r.onresult = e => setInputText(Array.from(e.results).map(x => x[0].transcript).join(""));
    r.onend  = () => setIsListening(false);
    r.onerror = () => setIsListening(false);
    r.start(); recognitionRef.current = r; setIsListening(true);
  }

  // ── INTRO ────────────────────────────────────────────────────────────────────
  if (phase === "intro") return (
    <div style={{ minHeight:"100dvh", width:"100%", background: C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:"32px 24px", fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", boxSizing:"border-box" }}>
      <div style={{ width:"100%", maxWidth:400, textAlign:"center" }}>
        <div style={{ fontSize:52, marginBottom:24 }}>💬</div>
        <h1 style={{ fontSize:"clamp(24px, 7vw, 32px)", fontWeight:300, color: C.text, margin:"0 0 16px", lineHeight:1.3 }}>
          Como é a sua<br /><em style={{ color: C.accent, fontStyle:"italic" }}>rotina de treinos?</em>
        </h1>
        <p style={{ color: C.textMid, fontSize:"clamp(14px, 4vw, 16px)", lineHeight:1.7, margin:"0 0 8px" }}>
          Responda algumas perguntas sobre seus hábitos de treino. Leva cerca de 5 minutos.
        </p>
        <p style={{ color: C.textDim, fontSize:12, margin:"0 0 32px" }}>Suas respostas são anônimas.</p>
        <button onClick={startChat} style={{ width:"100%", padding:16, background: C.accent, color:"#000", border:"none", borderRadius:32, fontSize:16, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          Começar conversa →
        </button>
      </div>
    </div>
  );

  if (phase === "done") return <ThankYou saveStatus={saveStatus} />;

  // ── CHAT ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100dvh", background: C.bg, fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", overflow:"hidden" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", background: C.surface, borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        <div style={{ width:38, height:38, borderRadius:"50%", background: C.surface2, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>🏋️</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:"clamp(13px, 4vw, 15px)", fontWeight:600, color: C.text }}>Pesquisa de hábitos</div>
          <div style={{ fontSize:11, color: C.textDim }}>{`${answered} de ${TOTAL} respondidas`}</div>
        </div>
        {/* Botão voltar */}
        {(qIndex > 0 || editingId) && (
          <button onClick={goBack} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:20, padding:"5px 12px", color: C.textMid, fontSize:12, cursor:"pointer", fontFamily:"inherit", flexShrink:0, WebkitTapHighlightColor:"transparent" }}>
            ← Voltar
          </button>
        )}
        <div style={{ fontSize:13, fontWeight:700, color: C.accent, flexShrink:0 }}>{progress}%</div>
      </div>

      {/* Progress bar */}
      <div style={{ height:3, background: C.surface2, flexShrink:0 }}>
        <div style={{ height:"100%", width:`${progress}%`, background: C.accent, transition:"width 0.5s ease" }} />
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 16px 8px", display:"flex", flexDirection:"column", gap:6, WebkitOverflowScrolling:"touch" }}>

        {(() => {
          let lastBlock = null;
          return messages.map(m => {
            const showHeader = m.type === "bot" && m.blockId && m.blockId !== lastBlock;
            if (showHeader) lastBlock = m.blockId;
            return (
              <React.Fragment key={m.id}>
                {showHeader && <BlockHeader blockId={m.blockId} />}
                {m.type === "bot" ? (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-start" }}>
                    <div style={{ background: C.botBg, color:"#e0e0e0", padding:"10px 14px", borderRadius:"4px 16px 16px 16px", fontSize:"clamp(14px, 4vw, 15px)", lineHeight:1.6, maxWidth:"85%", border:`1px solid ${C.border}`, wordBreak:"break-word" }}>
                      {m.text}
                    </div>
                  </div>
                ) : (
                  <div style={{ display:"flex", justifyContent:"flex-end" }}>
                    <div
                      onClick={() => m.editId && startEdit(m.editId)}
                      style={{ background: C.userBg, color: C.userText, padding:"10px 14px", borderRadius:"16px 4px 16px 16px", fontSize:"clamp(14px, 4vw, 15px)", lineHeight:1.6, maxWidth:"85%", border:`1px solid ${C.userBorder}`, wordBreak:"break-word", cursor: m.editId ? "pointer" : "default", position:"relative" }}
                    >
                      {m.text}
                      {m.editId && (
                        <span style={{ display:"block", fontSize:10, color:"#3a6080", marginTop:4, textAlign:"right" }}>
                          toca para editar
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          });
        })()}

        {isTyping && (
          <div style={{ background: C.botBg, padding:"12px 16px", borderRadius:"4px 16px 16px 16px", display:"flex", gap:5, alignItems:"center", width:58, border:`1px solid ${C.border}` }}>
            {[0,0.2,0.4].map((d,i) => (
              <span key={i} style={{ width:7, height:7, borderRadius:"50%", background:"#555", display:"inline-block", animation:`bounce 1.2s ${d}s infinite` }} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!isTyping && currentQ && (
        <div style={{ padding:"16px 16px 28px", background: C.surface, borderTop:`1px solid ${C.border}`, flexShrink:0 }}>

          {/* Label de edição */}
          {editingId && (
            <div style={{ fontSize:11, color: C.accent, marginBottom:10, letterSpacing:0.5 }}>
              ✎ Editando resposta anterior
            </div>
          )}

          {/* MÚLTIPLA ESCOLHA */}
          {currentQ.type==="choice" && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {currentQ.options.map(opt => (
                <button key={opt} onClick={() => submitAnswer(opt)}
                  style={{ width:"100%", padding:"14px 20px", background:"transparent", border:`1.5px solid ${C.accent}`, borderRadius:14, color: C.accent, fontSize:"clamp(14px, 4vw, 16px)", fontWeight:500, cursor:"pointer", fontFamily:"inherit", textAlign:"left", WebkitTapHighlightColor:"transparent" }}>
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* RESPOSTA ABERTA */}
          {currentQ.type==="voice" && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

              {hasVoice && (
                <button onClick={toggleVoice}
                  style={{ width:"100%", padding:"18px", background:isListening ? C.accent : C.accentDim, border:`2px solid ${C.accent}`, borderRadius:16, color:isListening ? "#000" : C.accent, fontSize:16, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:10, WebkitTapHighlightColor:"transparent", transition:"all 0.2s", boxShadow:isListening ? `0 0 0 4px rgba(126,184,212,0.2)` : "none" }}>
                  <span style={{ fontSize:22 }}>{isListening ? "⏹" : "🎙️"}</span>
                  <span>{isListening ? "Toca para enviar →" : "Toca para falar"}</span>
                </button>
              )}

              {isListening && inputText && (
                <div style={{ background:"#0a1520", border:"1px solid #1a3040", borderRadius:12, padding:"10px 14px", fontSize:14, color:"#7ab0d0", lineHeight:1.6, fontStyle:"italic" }}>
                  {inputText}
                </div>
              )}

              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ flex:1, height:1, background: C.border }} />
                <span style={{ fontSize:11, color: C.textDim, letterSpacing:1 }}>OU</span>
                <div style={{ flex:1, height:1, background: C.border }} />
              </div>

              <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
                <textarea rows={2} value={inputText}
                  placeholder={currentQ.placeholder}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); if (inputText.trim()) submitAnswer(inputText); }}}
                  style={{ flex:1, minWidth:0, background:"#0d0d0d", border:`1px solid ${C.border}`, borderRadius:12, padding:"10px 14px", color: C.text, fontSize:"clamp(14px, 4vw, 15px)", lineHeight:1.5, resize:"none", fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}
                />
                <button onClick={() => inputText.trim() && submitAnswer(inputText)}
                  style={{ width:44, height:44, borderRadius:"50%", background:inputText.trim() ? C.accent : C.surface2, border:"none", color:inputText.trim() ? "#000" : C.textDim, fontSize:22, fontWeight:700, cursor:inputText.trim() ? "pointer" : "not-allowed", display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.2s", WebkitTapHighlightColor:"transparent", flexShrink:0 }}>
                  ↑
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:.3}40%{transform:translateY(-5px);opacity:1}}
        textarea::placeholder{color:#444}
        button:active{opacity:.8}
      `}</style>
    </div>
  );
}
