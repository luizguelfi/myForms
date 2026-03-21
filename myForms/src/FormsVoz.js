import React, { useState, useEffect, useRef } from "react";

const QUESTIONS = [
  {
    id: "q1", block: "Bloco 01 · Sua rotina",
    text: "Há quanto tempo você treina regularmente?",
    type: "choice",
    options: ["Menos de 6 meses", "6 meses a 1 ano", "1 a 3 anos", "Mais de 3 anos"],
  },
  {
    id: "q2", block: "Bloco 01 · Sua rotina",
    text: "Onde você costuma treinar?",
    type: "choice",
    options: ["Academia convencional", "Studio / aulas marcadas", "Em casa", "Mais de um ambiente"],
  },
  {
    id: "q3", block: "Bloco 01 · Sua rotina",
    text: "Com que frequência você treina por semana?",
    type: "choice",
    options: ["1 a 2 vezes", "3 a 4 vezes", "5 vezes ou mais", "Varia muito"],
  },
  {
    id: "q4", block: "Bloco 02 · O que você consome",
    text: "Você consome algum suplemento ligado aos treinos? (whey, creatina, BCAA...)",
    type: "choice",
    options: ["Sim, regularmente", "Sim, às vezes", "Não consumo", "Já consumi mas parei"],
    skipIf: (ans) => ans === "Não consumo",
    skipTo: "q11",
  },
  {
    id: "q5", block: "Bloco 02 · O que você consome",
    text: "Pensa na sua última semana de treinos. O que você consumiu antes, durante ou depois — conta como você fez isso.",
    type: "voice",
    placeholder: "Fala ou digita à vontade...",
  },
  {
    id: "q6", block: "Bloco 03 · Preparação",
    text: "Como você normalmente se prepara antes de sair para treinar? O que você pensa, separa, leva?",
    type: "voice",
    placeholder: "Conta como é esse processo pra você...",
  },
  {
    id: "q7", block: "Bloco 03 · Preparação",
    text: "Já aconteceu de chegar no treino e perceber que esqueceu algo que queria ter consumido? Como foi?",
    type: "voice",
    placeholder: "Se aconteceu, descreve a situação...",
  },
  {
    id: "q8", block: "Bloco 03 · Preparação",
    text: "Tem alguma parte da sua rotina de suplementação que você acha trabalhosa ou preferia que fosse diferente?",
    type: "voice",
    placeholder: "Pode ser qualquer coisa...",
  },
  {
    id: "q9", block: "Bloco 04 · O que você tentou",
    text: "Você já tentou alguma forma de tornar sua rotina de suplementação mais prática? O que funcionou, o que não funcionou?",
    type: "voice",
    placeholder: "Me conta...",
  },
  {
    id: "q10", block: "Bloco 04 · O que você tentou",
    text: "Você usa ou já usou algum serviço de conveniência fitness? (marmitas, personal, apps, assinaturas...)",
    type: "voice",
    placeholder: "Pode citar qualquer serviço...",
  },
  {
    id: "q11", block: "Bloco 05 · O que importa",
    text: "Quando o assunto é suplementação, o que é mais importante pra você?",
    type: "voice",
    placeholder: "Lista por ordem de prioridade se quiser...",
  },
  {
    id: "q12", block: "Bloco 05 · O que importa",
    text: "Se você pudesse mudar uma coisa — só uma — na forma como cuida da sua nutrição e suplementação hoje, o que seria?",
    type: "voice",
    placeholder: "Pode ser qualquer coisa...",
  },
];

const TOTAL = QUESTIONS.length;
const GREEN = "#25D366";
const BG = "#0a0a0a";
const SURFACE = "#161616";
const BORDER = "#2a2a2a";

function uid() {
  return Math.random().toString(36).slice(2);
}

function getNextIndex(currentIndex, answers) {
  const current = QUESTIONS[currentIndex];
  if (current?.skipIf && current?.skipTo) {
    if (current.skipIf(answers[current.id])) {
      const idx = QUESTIONS.findIndex((q) => q.id === current.skipTo);
      if (idx !== -1) return idx;
    }
  }
  return currentIndex + 1;
}

export default function FormsVoz() {
  const [phase, setPhase] = useState("intro");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hasVoice, setHasVoice] = useState(false);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setHasVoice(!!SR);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / TOTAL) * 100);
  const currentQ = QUESTIONS[qIndex];

  function showQuestion(idx) {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { type: "bot", text: QUESTIONS[idx].text, block: QUESTIONS[idx].block, id: uid() },
      ]);
    }, 800);
  }

  function startChat() {
    setPhase("chat");
    setMessages([{
      type: "bot",
      text: "Oi! Vou te fazer algumas perguntas sobre sua rotina de treinos. Sem julgamentos — só quero entender como é sua vida real. 👊",
      id: uid(),
    }]);
    setTimeout(() => showQuestion(0), 600);
  }

  function submitAnswer(value) {
    if (!value.trim()) return;
    const q = QUESTIONS[qIndex];
    setMessages((prev) => [...prev, { type: "user", text: value, id: uid() }]);
    const newAnswers = { ...answers, [q.id]: value };
    setAnswers(newAnswers);
    setInputText("");
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const nextIdx = getNextIndex(qIndex, newAnswers);
    if (nextIdx < QUESTIONS.length) {
      setQIndex(nextIdx);
      showQuestion(nextIdx);
    } else {
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            { type: "bot", text: "Obrigado pela sua participação! 🙏 Suas respostas foram registradas e vão nos ajudar muito.", id: uid() },
          ]);
          setPhase("done");
        }, 900);
      }, 300);
    }
  }

  function toggleVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const r = new SR();
    r.lang = "pt-BR";
    r.continuous = false;
    r.interimResults = true;
    r.onresult = (e) => {
      const t = Array.from(e.results).map((x) => x[0].transcript).join("");
      setInputText(t);
    };
    r.onend = () => setIsListening(false);
    r.onerror = () => setIsListening(false);
    r.start();
    recognitionRef.current = r;
    setIsListening(true);
  }

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div style={{
        minHeight: "100dvh",
        background: BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        boxSizing: "border-box",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        <div style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>💬</div>
          <h1 style={{
            fontSize: 28,
            fontWeight: 300,
            color: "#f0f0f0",
            margin: "0 0 16px",
            lineHeight: 1.3,
          }}>
            Como é a sua<br />
            <em style={{ color: GREEN, fontStyle: "italic" }}>rotina de treinos?</em>
          </h1>
          <p style={{ color: "#888", fontSize: 15, lineHeight: 1.7, margin: "0 0 8px" }}>
            Responda algumas perguntas sobre seus hábitos de treino. Leva cerca de 5 minutos — pode responder digitando ou pelo microfone. 🎙️
          </p>
          <p style={{ color: "#555", fontSize: 12, margin: "0 0 32px" }}>
            Suas respostas são anônimas.
          </p>
          <button
            onClick={startChat}
            style={{
              width: "100%",
              padding: "16px",
              background: GREEN,
              color: "#000",
              border: "none",
              borderRadius: 32,
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Começar conversa →
          </button>
        </div>
      </div>
    );
  }

  // ── CHAT ───────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100dvh",
      background: BG,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      maxWidth: 520,
      margin: "0 auto",
      boxSizing: "border-box",
    }}>

      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 16px",
        background: SURFACE,
        borderBottom: `1px solid ${BORDER}`,
        flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "#222",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, flexShrink: 0,
        }}>🏋️</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#f0f0f0" }}>Pesquisa de hábitos</div>
          <div style={{ fontSize: 11, color: "#555" }}>
            {phase === "done" ? "Concluído ✓" : `${answeredCount} de ${TOTAL} respondidas`}
          </div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: GREEN, flexShrink: 0 }}>
          {progress}%
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "#1e1e1e", flexShrink: 0 }}>
        <div style={{
          height: "100%",
          width: `${progress}%`,
          background: GREEN,
          transition: "width 0.5s ease",
        }} />
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        WebkitOverflowScrolling: "touch",
      }}>
        {messages.map((m) => (
          m.type === "bot" ? (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
              {m.block && (
                <span style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "#444", marginLeft: 4 }}>
                  {m.block}
                </span>
              )}
              <div style={{
                background: SURFACE,
                color: "#e0e0e0",
                padding: "10px 14px",
                borderRadius: "4px 16px 16px 16px",
                fontSize: 14,
                lineHeight: 1.6,
                maxWidth: "82%",
                border: `1px solid ${BORDER}`,
                wordBreak: "break-word",
              }}>
                {m.text}
              </div>
            </div>
          ) : (
            <div key={m.id} style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{
                background: "#1a3d28",
                color: "#d4f0dd",
                padding: "10px 14px",
                borderRadius: "16px 4px 16px 16px",
                fontSize: 14,
                lineHeight: 1.6,
                maxWidth: "82%",
                border: "1px solid #245c35",
                wordBreak: "break-word",
              }}>
                {m.text}
              </div>
            </div>
          )
        ))}

        {isTyping && (
          <div style={{
            background: SURFACE,
            padding: "12px 16px",
            borderRadius: "4px 16px 16px 16px",
            display: "flex",
            gap: 5,
            alignItems: "center",
            width: 56,
            border: `1px solid ${BORDER}`,
          }}>
            {[0, 0.2, 0.4].map((delay, i) => (
              <span key={i} style={{
                width: 7, height: 7,
                borderRadius: "50%",
                background: "#555",
                display: "inline-block",
                animation: `bounce 1.2s ${delay}s infinite`,
              }} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {phase === "chat" && !isTyping && currentQ && (
        <div style={{
          padding: "12px 16px 20px",
          background: SURFACE,
          borderTop: `1px solid ${BORDER}`,
          flexShrink: 0,
        }}>
          {currentQ.type === "choice" ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {currentQ.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => submitAnswer(opt)}
                  style={{
                    padding: "10px 16px",
                    background: "transparent",
                    border: `1.5px solid ${GREEN}`,
                    borderRadius: 24,
                    color: GREEN,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                rows={2}
                value={inputText}
                placeholder={isListening ? "🎙️ Ouvindo..." : currentQ.placeholder}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (inputText.trim()) submitAnswer(inputText);
                  }
                }}
                style={{
                  flex: 1,
                  background: "#111",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 20,
                  padding: "10px 14px",
                  color: "#f0f0f0",
                  fontSize: 14,
                  lineHeight: 1.5,
                  resize: "none",
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                {hasVoice && (
                  <button
                    onClick={toggleVoice}
                    style={{
                      width: 42, height: 42,
                      borderRadius: "50%",
                      background: isListening ? GREEN : "#222",
                      border: "none",
                      fontSize: 17,
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: isListening ? `0 0 0 4px rgba(37,211,102,0.2)` : "none",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {isListening ? "⏹" : "🎙️"}
                  </button>
                )}
                <button
                  onClick={() => inputText.trim() && submitAnswer(inputText)}
                  style={{
                    width: 42, height: 42,
                    borderRadius: "50%",
                    background: inputText.trim() ? GREEN : "#222",
                    border: "none",
                    color: inputText.trim() ? "#000" : "#555",
                    fontSize: 20,
                    fontWeight: 700,
                    cursor: inputText.trim() ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    WebkitTapHighlightColor: "transparent",
                    transition: "background 0.2s",
                  }}
                >
                  ↑
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === "done" && (
        <div style={{
          padding: "16px",
          textAlign: "center",
          fontSize: 13,
          color: GREEN,
          background: SURFACE,
          borderTop: `1px solid ${BORDER}`,
          flexShrink: 0,
        }}>
          ✓ Respostas registradas — obrigado!
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #0a0a0a; }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
        textarea::placeholder { color: #555; }
        button:active { opacity: 0.75; }
      `}</style>
    </div>
  );
}
