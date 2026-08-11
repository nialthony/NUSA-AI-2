import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { api, errText } from "@/lib/api";
import { Badge, AiModeChip } from "@/components/Shared";

export function AskNusa({ suggestions = [], compact = false, initialQuestion = "" }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(initialQuestion);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState("mock");
  const endRef = useRef(null);

  useEffect(() => {
    api.get("/config").then(({ data }) => setProvider(data.ai_provider)).catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: question }]);
    setLoading(true);
    try {
      const { data } = await api.post("/ai/ask", { question });
      setProvider(data.ai_provider);
      setMessages((m) => [...m, { role: "assistant", content: data.answer, sources: data.sources }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: errText(e), error: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="ask-nusa" className="nusa-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50">
            <Sparkles className="h-4 w-4 text-emerald-600" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold">NUSA AI</p>
            <p className="text-[11px] text-slate-500">Asisten intelijen komunitas Anda</p>
          </div>
        </div>
        <AiModeChip provider={provider} />
      </div>

      <div className={`space-y-4 overflow-y-auto px-5 py-5 ${compact ? "max-h-[340px]" : "max-h-[460px]"}`}>
        {messages.length === 0 && (
          <p className="text-sm leading-relaxed text-slate-500">
            Tanyakan apa pun tentang kondisi lingkungan, laporan warga, atau kas RT. NUSA AI menjawab berdasarkan data komunitas Anda.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} data-testid={`ai-msg-${m.role}-${i}`} className={`animate-rise ${m.role === "user" ? "text-right" : ""}`}>
            <div
              className={`inline-block max-w-[92%] whitespace-pre-line rounded-xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-slate-900 text-left text-white"
                  : m.error
                  ? "bg-rose-50 text-rose-800"
                  : "bg-slate-50 text-slate-800"
              }`}
            >
              {m.content}
            </div>
            {m.sources?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {m.sources.map((s) => (
                  <Badge key={s} className="bg-emerald-50 text-[10px] uppercase tracking-wider text-emerald-700">{s}</Badge>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <p data-testid="ai-loading" className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> NUSA AI sedang menganalisis data komunitas...
          </p>
        )}
        <div ref={endRef} />
      </div>

      {suggestions.length > 0 && messages.length === 0 && (
        <div className="flex flex-wrap gap-2 px-5 pb-4">
          {suggestions.map((s, i) => (
            <button
              key={s}
              data-testid={`ai-suggestion-${i}`}
              onClick={() => send(s)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-center gap-2 border-t border-slate-200 px-4 py-3"
      >
        <input
          data-testid="ai-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanya NUSA apa saja..."
          aria-label="Pertanyaan untuk NUSA AI"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
        <button
          data-testid="ai-send-btn"
          type="submit"
          disabled={loading}
          className="grid h-10 w-10 place-items-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
          aria-label="Kirim pertanyaan"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
