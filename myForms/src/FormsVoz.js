import React, { useState, useEffect, useRef } from "react";

const AIRTABLE_TOKEN = "pat1tMoSJCwycnUXt.c71bfed349e29283812c39426a6453c3a7fa5b95c657652ab15e631e8a5c1c94";
const AIRTABLE_BASE  = "appF6xeb2ltmPwRXr";
const AIRTABLE_TABLE = "Table%201";

async function saveToAirtable(answers) {
  const fields = { timestamp: new Date().toISOString(), ...answers };
  await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
}

const QUESTIONS = [
  { id:"q1",  block:"Bloco 01 · Sua rotina",         type:"choice", text:"Há quanto tempo você treina regularmente?",                                                                               options:["Menos de 6 meses","6 meses a 1 ano","1 a 3 anos","Mais de 3 anos"] },
  { id:"q2",  block:"Bloco 01 · Sua rotina",         type:"choice", text:"Onde você costuma treinar?",                                                                                              options:["Academia convencional","Studio / aulas marcadas","Em casa","Mais de um ambiente"] },
  { id:"q3",  block:"Bloco 01 · Sua rotina",         type:"choice", text:"Com que frequência você treina por semana?",                                                                              options:["1 a 2 vezes","3 a 4 vezes","5 vezes ou mais","Varia muito"] },
  { id:"q4",  block:"Bloco 02 · O que você consome", type:"choice", text:"Você consome algum suplemento ligado aos treinos? (whey, creatina, BCAA...)",                                            options:["Sim, regularmente","Sim, às vezes","Não consumo","Já consumi mas parei"], skipIf:a=>a==="Não consumo", skipTo:"q11" },
  { id:"q5",  block:"Bloco 02 · O que você consome", type:"voice",  text:"Pensa na sua última semana de treinos. O que você consumiu antes, durante ou depois — conta como você fez isso.",        placeholder:"Fala ou digita à vontade..." },
  { id:"q6",  block:"Bloco 03 · Preparação",         type:"voice",  text:"Como você normalmente se prepara antes de sair para treinar? O que você pensa, separa, leva?",                           placeholder:"Conta como é esse processo pra você..." },
  { id:"q7",  block:"Bloco 03 · Preparação",         type:"voice",  text:"Já aconteceu de chegar no treino e perceber que esqueceu algo que queria ter consumido? Como foi?",                      placeholder:"Se aconteceu, descreve a situação..." },
  { id:"q8",  block:"Bloco 03 · Preparação",         type:"voice",  text:"Tem alguma parte da sua rotina de suplementação que você acha trabalhosa ou preferia que fosse diferente?",              placeholder:"Pode ser qualquer coisa..." },
  { id:"q9",  block:"Bloco 04 · O que você tentou",  type:"voice",  text:"Você já tentou alguma forma de tornar sua rotina de suplementação mais prática? O que funcionou, o que não funcionou?",  placeholder:"Me conta..." },
  { id:"q10", block:"Bloco 04 · O que você tentou",  type:"voice",  text:"Você usa ou já usou algum serviço de conveniência fitness? (marmitas, personal, apps, assinaturas...)",                 placeholder:"Pode citar qualquer serviço..." },
  { id:"q11", block:"Bloco 05 · O que importa",      type:"voice",  text:"Quando o assunto é suplementação, o que é mais importante pra você?",                                                    placeholder:"Lista por ordem de prioridade se quiser..." },
  { id:"q12", block:"Bloco 05 · O que importa",      type:"voice",  text:"Se você pudesse mudar uma coisa — só uma — na forma como cuida da sua nutrição e suplementação hoje, o que seria?",     placeholder:"Pode ser qualquer coisa..." },
];

const TOTAL = QUESTIONS.length;
const GREEN = "#25D366";

function uid() { return Math.random().toString(36).slice(2); }

function getNextIndex(idx, answers) {
  const q = QUESTIONS[idx];
  if (q?.skipIf && q?.skipTo && q.skipIf(answers[q.id])) {
    const i = QUESTIONS.findIndex(x => x.id === q.skipTo);
    if (i !== -1) return i;
  }
  return idx + 1;
}

export default function FormsVoz() {
  const [phase, setPhase]           = useState("intro");
  const [qIndex, setQIndex]         = useState(0);
  const [answers, setAnswers]       = useState({});
  const [messages, setMessages]     = useState([]);
  const [inputText, setInputText]   = useState("");
  const [isTyping, setIsTyping]     = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hasVoice, setHasVoice]     = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
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
  const currentQ = QUESTIONS[qIndex];

  function pushBot(text, block) {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(p => [...p, { type:"bot", text, block, id:uid() }]);
    }, 800);
  }

  function startChat() {
    setPhase("chat");
    setMessages([{ type:"bot", text:"Oi! Vou te fazer algumas perguntas sobre sua rotina de treinos. Sem julgamentos — só quero entender como é sua vida real. 👊", id:uid() }]);
    setTimeout(() => pushBot(QUESTIONS[0].text, QUESTIONS[0].block), 700);
  }

  function submitAnswer(value) {
    if (!value.trim()) return;
    const q = QUESTIONS[qIndex];
    setMessages(p => [...p, { type:"user", text:value, id:uid() }]);
    const next = { ...answers, [q.id]: value };
    setAnswers(next);
    setInputText("");
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); }

    const nextIdx = getNextIndex(qIndex, next);
    if (nextIdx < QUESTIONS.length) {
      setQIndex(nextIdx);
      setTimeout(() => pushBot(QUESTIONS[nextIdx].text, QUESTIONS[nextIdx].block), 300);
    } else {
      setTimeout(async () => {
        pushBot("Obrigado pela sua participação! 🙏 Suas respostas foram registradas e vão nos ajudar muito.");
        setPhase("done");
        setSaveStatus("saving");
        try { await saveToAirtable(next); setSaveStatus("ok"); }
        catch { setSaveStatus("error"); }
      }, 300);
    }
  }

  function toggleVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const r = new SR();
    r.lang = "pt-BR"; r.continuous = false; r.interimResults = true;
    r.onresult = e => setInputText(Array.from(e.results).map(x => x[0].transcript).join(""));
    r.onend  = () => setIsListening(false);
    r.onerror = () => setIsListening(false);
    r.start(); recognitionRef.current = r; setIsListening(true);
  }

  if (phase === "intro") return (
    <div style={{ minHeight:"100dvh", width:"100%", background:"#0a0a0a", display:"flex", alignItems:"center", justifyContent:"center", padding:"32px 24px", fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", boxSizing:"border-box" }}>
      <div style={{ width:"100%", maxWidth:400, textAlign:"center" }}>
        <div style={{ fontSize:52, marginBottom:24 }}>💬</div>
        <h1 style={{ fontSize:"clamp(24px, 7vw, 32px)", fontWeight:300, color:"#f0f0f0", margin:"0 0 16px", lineHeight:1.3 }}>
          Como é a sua<br /><em style={{ color:GREEN, fontStyle:"italic" }}>rotina de treinos?</em>
        </h1>
        <p style={{ color:"#888", fontSize:"clamp(14px, 4vw, 16px)", lineHeight:1.7, margin:"0 0 8px" }}>
          Responda algumas perguntas sobre seus hábitos de treino. Leva cerca de 5 minutos — pode digitar ou usar o microfone. 🎙️
        </p>
        <p style={{ color:"#555", fontSize:12, margin:"0 0 32px" }}>Suas respostas são anônimas.</p>
        <button onClick={startChat} style={{ width:"100%", padding:16, background:GREEN, color:"#000", border:"none", borderRadius:32, fontSize:16, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          Começar conversa →
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100dvh", background:"#0a0a0a", fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", overflow:"hidden" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", background:"#111", borderBottom:"1px solid #222", flexShrink:0 }}>
        <div style={{ width:38, height:38, borderRadius:"50%", background:"#1e1e1e", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>🏋️</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:"clamp(13px, 4vw, 15px)", fontWeight:600, color:"#f0f0f0" }}>Pesquisa de hábitos</div>
          <div style={{ fontSize:11, color:"#555" }}>{phase==="done" ? "Concluído ✓" : `${answered} de ${TOTAL} respondidas`}</div>
        </div>
        <div style={{ fontSize:13, fontWeight:700, color:GREEN, flexShrink:0 }}>{progress}%</div>
      </div>

      {/* Progress bar */}
      <div style={{ height:3, background:"#1a1a1a", flexShrink:0 }}>
        <div style={{ height:"100%", width:`${progress}%`, background:GREEN, transition:"width 0.5s ease" }} />
      </div>

      {/* Chat area */}
      <div style={{ flex:1, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:10, WebkitOverflowScrolling:"touch" }}>
        {messages.map(m => m.type==="bot" ? (
          <div key={m.id} style={{ display:"flex", flexDirection:"column", alignItems:"flex-start", gap:2 }}>
            {m.block && <span style={{ fontSize:9, letterSpacing:1.5, textTransform:"uppercase", color:"#444", marginLeft:4 }}>{m.block}</span>}
            <div style={{ background:"#161616", color:"#e0e0e0", padding:"10px 14px", borderRadius:"4px 16px 16px 16px", fontSize:"clamp(14px, 4vw, 15px)", lineHeight:1.6, maxWidth:"85%", border:"1px solid #252525", wordBreak:"break-word" }}>
              {m.text}
            </div>
          </div>
        ) : (
          <div key={m.id} style={{ display:"flex", justifyContent:"flex-end" }}>
            <div style={{ background:"#1a3d28", color:"#d4f0dd", padding:"10px 14px", borderRadius:"16px 4px 16px 16px", fontSize:"clamp(14px, 4vw, 15px)", lineHeight:1.6, maxWidth:"85%", border:"1px solid #245c35", wordBreak:"break-word" }}>
              {m.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div style={{ background:"#161616", padding:"12px 16px", borderRadius:"4px 16px 16px 16px", display:"flex", gap:5, alignItems:"center", width:58, border:"1px solid #252525" }}>
            {[0, 0.2, 0.4].map((d,i) => (
              <span key={i} style={{ width:7, height:7, borderRadius:"50%", background:"#555", display:"inline-block", animation:`bounce 1.2s ${d}s infinite` }} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {phase==="chat" && !isTyping && currentQ && (
        <div style={{ padding:"12px 16px 28px", background:"#111", borderTop:"1px solid #222", flexShrink:0 }}>
          {currentQ.type==="choice" ? (
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {currentQ.options.map(opt => (
                <button key={opt} onClick={() => submitAnswer(opt)}
                  style={{ padding:"10px 16px", background:"transparent", border:`1.5px solid ${GREEN}`, borderRadius:24, color:GREEN, fontSize:"clamp(13px, 3.5vw, 14px)", cursor:"pointer", fontFamily:"inherit", WebkitTapHighlightColor:"transparent" }}>
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
              <textarea rows={2} value={inputText}
                placeholder={isListening ? "🎙️ Ouvindo..." : currentQ.placeholder}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); if (inputText.trim()) submitAnswer(inputText); }}}
                style={{ flex:1, minWidth:0, background:"#0d0d0d", border:"1px solid #2a2a2a", borderRadius:20, padding:"10px 14px", color:"#f0f0f0", fontSize:"clamp(14px, 4vw, 15px)", lineHeight:1.5, resize:"none", fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}
              />
              <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
                {hasVoice && (
                  <button onClick={toggleVoice}
                    style={{ width:44, height:44, borderRadius:"50%", background:isListening ? GREEN : "#1e1e1e", border:"none", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:isListening ? "0 0 0 4px rgba(37,211,102,0.2)" : "none", WebkitTapHighlightColor:"transparent" }}>
                    {isListening ? "⏹" : "🎙️"}
                  </button>
                )}
                <button onClick={() => inputText.trim() && submitAnswer(inputText)}
                  style={{ width:44, height:44, borderRadius:"50%", background:inputText.trim() ? GREEN : "#1e1e1e", border:"none", color:inputText.trim() ? "#000" : "#444", fontSize:22, fontWeight:700, cursor:inputText.trim() ? "pointer" : "not-allowed", display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.2s", WebkitTapHighlightColor:"transparent" }}>
                  ↑
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase==="done" && (
        <div style={{ padding:"14px 16px", textAlign:"center", fontSize:13, color:saveStatus==="error" ? "#ff6b6b" : GREEN, background:"#111", borderTop:"1px solid #222", flexShrink:0 }}>
          {saveStatus==="saving" && "Salvando respostas..."}
          {saveStatus==="ok"     && "✓ Respostas salvas com sucesso!"}
          {saveStatus==="error"  && "⚠️ Erro ao salvar. Tente novamente."}
        </div>
      )}

      <style>{`
        @keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:.3}40%{transform:translateY(-5px);opacity:1}}
        textarea::placeholder{color:#555}
        button:active{opacity:.75}
      `}</style>
    </div>
  );
}
