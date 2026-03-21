import React, { useState, useEffect, useRef } from "react";

// ─── PERGUNTAS ────────────────────────────────────────────────────────────────
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
    required: true,
  },
];

const TOTAL = QUESTIONS.length;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getNextIndex(questions, currentIndex, answers) {
  const current = questions[currentIndex];
  if (current?.skipIf && current.skipTo) {
    const ans = answers[current.id];
    if (current.skipIf(ans)) {
      const skipIdx = questions.findIndex((q) => q.id === current.skipTo);
      if (skipIdx !== -1) return skipIdx;
    }
  }
  return currentIndex + 1;
}

// ─── COMPONENTES ──────────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={s.bubble_bot}>
      <span style={s.dot} className="d1" />
      <span style={s.dot} className="d2" />
      <span style={s.dot} className="d3" />
    </div>
  );
}

function BotBubble({ text, block }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, marginBottom: 4 }}>
      {block && <span style={s.blockTag}>{block}</span>}
      <div style={s.bubble_bot_text}>{text}</div>
    </div>
  );
}

function UserBubble({ text }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
      <div style={s.bubble_user}>{text}</div>
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function FormsVoz() {
  const [phase, setPhase] = useState("intro"); // intro | chat | done
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hasVoice, setHasVoice] = useState(false);
  const [saved, setSaved] = useState(false);

  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const sessionId = useRef(uid());

  // Checa suporte à voz
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setHasVoice(!!SR);
  }, []);

  // Scroll automático
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const currentQ = QUESTIONS[qIndex];
  const progress = Math.round((Object.keys(answers).length / TOTAL) * 100);

  // Mostra pergunta com delay de digitação
  function showQuestion(idx) {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { type: "bot", text: QUESTIONS[idx].text, block: QUESTIONS[idx].block, id: uid() },
      ]);
    }, 900);
  }

  function startChat() {
    setPhase("chat");
    showQuestion(0);
  }

  function submitAnswer(value) {
    if (!value.trim()) return;
    const q = QUESTIONS[qIndex];

    // Adiciona resposta do usuário
    setMessages((prev) => [...prev, { type: "user", text: value, id: uid() }]);
    const newAnswers = { ...answers, [q.id]: value };
    setAnswers(newAnswers);
    setInputText("");

    // Próxima pergunta
    const nextIdx = getNextIndex(QUESTIONS, qIndex, newAnswers);
    if (nextIdx < QUESTIONS.length) {
      setQIndex(nextIdx);
      showQuestion(nextIdx);
    } else {
      // Fim
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Obrigado pela sua participação! 🙏 Suas respostas foram registradas e vão nos ajudar muito.",
              id: uid(),
            },
          ]);
          saveResponses(newAnswers);
          setPhase("done");
        }, 1000);
      }, 400);
    }
  }

  async function saveResponses(finalAnswers) {
    try {
      const record = {
        id: sessionId.current,
        timestamp: new Date().toISOString(),
        answers: finalAnswers,
      };
      // Carrega respostas existentes
      let all = [];
      try {
        const existing = await window.storage.get("survey_responses", true);
        if (existing?.value) all = JSON.parse(existing.value);
      } catch (_) {}
      all.push(record);
      await window.storage.set("survey_responses", JSON.stringify(all), true);
      setSaved(true);
    } catch (e) {
      console.error("Erro ao salvar:", e);
    }
  }

  // Voz
  function toggleVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SR();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      setInputText(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.start();
    setIsListening(true);
  }

  // ─── TELAS ────────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div style={s.page}>
        <div style={s.intro}>
          <div style={s.avatar}>💬</div>
          <h1 style={s.introTitle}>Como é a sua<br /><em style={{ color: "#25D366" }}>rotina de treinos?</em></h1>
          <p style={s.introDesc}>
            Responda algumas perguntas sobre seus hábitos de treino e suplementação.
            Leva cerca de 5 minutos — pode responder digitando ou pelo microfone. 🎙️
          </p>
          <p style={{ ...s.introDesc, fontSize: 12, color: "#555", marginTop: 8 }}>
            Suas respostas são anônimas.
          </p>
          <button style={s.startBtn} onClick={startChat}>
            Começar conversa →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerAvatar}>🏋️</div>
        <div>
          <div style={s.headerName}>Pesquisa de hábitos</div>
          <div style={s.headerSub}>
            {phase === "done" ? "Concluído ✓" : `${Object.keys(answers).length} de ${TOTAL} respondidas`}
          </div>
        </div>
        {phase !== "done" && (
          <div style={s.progressPill}>{progress}%</div>
        )}
      </div>

      {/* Progress bar */}
      <div style={s.progressTrack}>
        <div style={{ ...s.progressFill, width: `${progress}%` }} />
      </div>

      {/* Chat */}
      <div style={s.chat}>
        {/* Intro do bot */}
        <BotBubble text="Oi! Vou te fazer algumas perguntas sobre sua rotina de treinos. Sem julgamentos — só quero entender como é sua vida real. 👊" />

        {messages.map((m) =>
          m.type === "bot"
            ? <BotBubble key={m.id} text={m.text} block={m.block} />
            : <UserBubble key={m.id} text={m.text} />
        )}

        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {phase === "chat" && !isTyping && currentQ && (
        <div style={s.inputArea}>
          {currentQ.type === "choice" ? (
            <div style={s.choices}>
              {currentQ.options.map((opt) => (
                <button
                  key={opt}
                  style={s.choiceBtn}
                  onClick={() => submitAnswer(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <div style={s.textRow}>
              <textarea
                style={s.textarea}
                rows={2}
                value={inputText}
                placeholder={isListening ? "🎙️ Ouvindo..." : currentQ.placeholder}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitAnswer(inputText);
                  }
                }}
              />
              <div style={s.btnGroup}>
                {hasVoice && (
                  <button
                    style={{
                      ...s.micBtn,
                      background: isListening ? "#25D366" : "#1e1e1e",
                      boxShadow: isListening ? "0 0 0 4px rgba(37,211,102,0.25)" : "none",
                    }}
                    onClick={toggleVoice}
                    title="Responder por voz"
                  >
                    {isListening ? "⏹" : "🎙️"}
                  </button>
                )}
                <button
                  style={{
                    ...s.sendBtn,
                    opacity: inputText.trim() ? 1 : 0.35,
                    cursor: inputText.trim() ? "pointer" : "not-allowed",
                  }}
                  onClick={() => inputText.trim() && submitAnswer(inputText)}
                >
                  ↑
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === "done" && (
        <div style={s.doneBar}>
          {saved ? "✓ Respostas salvas com sucesso" : "Salvando respostas..."}
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
        .d1 { animation: bounce 1.2s infinite 0s; }
        .d2 { animation: bounce 1.2s infinite 0.2s; }
        .d3 { animation: bounce 1.2s infinite 0.4s; }
      `}</style>
    </div>
  );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const s = {
  page: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    maxWidth: 480,
    width: "100%",
    margin: "0 auto",
  },
  // INTRO
  intro: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 32px",
    textAlign: "center",
  },
  avatar: { fontSize: 52, marginBottom: 24 },
  introTitle: {
    fontSize: 30,
    fontWeight: 300,
    color: "#f0f0f0",
    margin: "0 0 16px",
    lineHeight: 1.3,
  },
  introDesc: {
    color: "#777",
    fontSize: 15,
    lineHeight: 1.7,
    margin: 0,
    maxWidth: 320,
  },
  startBtn: {
    marginTop: 32,
    padding: "14px 32px",
    background: "#25D366",
    color: "#000",
    border: "none",
    borderRadius: 28,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: 0.3,
  },
  // HEADER
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    background: "#111",
    borderBottom: "1px solid #1e1e1e",
    flexShrink: 0,
  },
  headerAvatar: {
    width: 40, height: 40,
    borderRadius: "50%",
    background: "#1e1e1e",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18,
  },
  headerName: { fontSize: 15, fontWeight: 600, color: "#f0f0f0" },
  headerSub: { fontSize: 12, color: "#555", marginTop: 1 },
  progressPill: {
    marginLeft: "auto",
    fontSize: 12,
    color: "#25D366",
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  // PROGRESS
  progressTrack: {
    height: 2,
    background: "#1e1e1e",
    flexShrink: 0,
  },
  progressFill: {
    height: "100%",
    background: "#25D366",
    transition: "width 0.5s ease",
  },
  // CHAT
  chat: {
    flex: 1,
    overflowY: "auto",
    padding: "20px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  blockTag: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "#333",
    marginLeft: 4,
  },
  bubble_bot_text: {
    background: "#1a1a1a",
    color: "#e8e8e8",
    padding: "10px 14px",
    borderRadius: "4px 16px 16px 16px",
    fontSize: 14,
    lineHeight: 1.6,
    maxWidth: "80%",
    border: "1px solid #252525",
  },
  bubble_bot: {
    background: "#1a1a1a",
    padding: "12px 16px",
    borderRadius: "4px 16px 16px 16px",
    display: "flex",
    gap: 5,
    alignItems: "center",
    width: 52,
    border: "1px solid #252525",
  },
  dot: {
    width: 6, height: 6,
    borderRadius: "50%",
    background: "#555",
    display: "inline-block",
  },
  bubble_user: {
    background: "#1f4a2e",
    color: "#e8f5e9",
    padding: "10px 14px",
    borderRadius: "16px 4px 16px 16px",
    fontSize: 14,
    lineHeight: 1.6,
    maxWidth: "80%",
    border: "1px solid #2a5c38",
  },
  // INPUT
  inputArea: {
    padding: "12px 12px 16px",
    background: "#0f0f0f",
    borderTop: "1px solid #1a1a1a",
    flexShrink: 0,
  },
  choices: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  choiceBtn: {
    padding: "9px 16px",
    background: "transparent",
    border: "1px solid #25D366",
    borderRadius: 20,
    color: "#25D366",
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: "inherit",
  },
  textRow: {
    display: "flex",
    gap: 8,
    alignItems: "flex-end",
  },
  textarea: {
    flex: 1,
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 20,
    padding: "10px 16px",
    color: "#f0f0f0",
    fontSize: 14,
    lineHeight: 1.5,
    resize: "none",
    fontFamily: "inherit",
    outline: "none",
  },
  btnGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  micBtn: {
    width: 40, height: 40,
    borderRadius: "50%",
    border: "none",
    fontSize: 16,
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.2s",
    flexShrink: 0,
  },
  sendBtn: {
    width: 40, height: 40,
    borderRadius: "50%",
    background: "#25D366",
    border: "none",
    color: "#000",
    fontSize: 20,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "opacity 0.2s",
    flexShrink: 0,
  },
  doneBar: {
    padding: "16px",
    textAlign: "center",
    fontSize: 13,
    color: "#25D366",
    background: "#0f0f0f",
    borderTop: "1px solid #1a1a1a",
    flexShrink: 0,
  },
};
