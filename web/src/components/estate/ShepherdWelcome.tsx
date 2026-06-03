/**
 * ShepherdWelcome — Shepherd greets the user and opens a conversation.
 *
 * This is the FIRST thing on the estate dashboard. Per ETHOS, the user should
 * meet warmth and a familiar voice before any dashboard, list, or completion
 * percentage. Shepherd is the voice and heart of FinalWishes — here it both
 * welcomes and listens, wired to the live AI guidance engine.
 */
import { useRef, useState } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import {
  askShepherd,
  shepherdGreeting,
  SHEPHERD_OPENERS,
  type ShepherdMessage,
} from '../../lib/shepherd';

interface ShepherdWelcomeProps {
  estateId: string;
  firstName?: string;
}

export function ShepherdWelcome({ estateId, firstName }: ShepherdWelcomeProps) {
  const [messages, setMessages] = useState<ShepherdMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || thinking) return;
    setError(null);
    setInput('');
    const history = messages;
    setMessages((m) => [...m, { role: 'user', content: message }]);
    setThinking(true);
    try {
      const res = await askShepherd(estateId, message, history);
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Shepherd could not respond.');
    } finally {
      setThinking(false);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }));
    }
  };

  const started = messages.length > 0;

  return (
    <section
      aria-label="Shepherd"
      className="relative overflow-hidden rounded-3xl border border-[#C8A951]/30 bg-gradient-to-br from-[#0f285f] via-[#133378] to-[#1E3A5F] text-white shadow-xl"
    >
      {/* soft gold wash */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#C8A951]/20 blur-3xl" />

      <div className="relative p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#C8A951]/20 ring-1 ring-[#C8A951]/40">
            <Sparkles className="h-5 w-5 text-[#C8A951]" />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#C8A951]">Shepherd</p>
            <h2 className="font-[Cinzel] text-xl sm:text-2xl leading-tight">{shepherdGreeting(firstName)}</h2>
          </div>
        </div>

        {!started && (
          <p className="mt-4 max-w-2xl text-sm sm:text-base text-white/80 leading-relaxed">
            This isn&apos;t paperwork. It&apos;s your voice, your memories, the love only your people
            will treasure — kept safe, ready for the moment it matters. I&apos;m here to walk it with
            you, at your pace. What&apos;s on your heart today?
          </p>
        )}

        {/* Conversation */}
        {started && (
          <div ref={scrollRef} className="mt-5 max-h-72 space-y-3 overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === 'user'
                    ? 'ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-white/15 px-4 py-2.5 text-sm'
                    : 'mr-auto max-w-[90%] rounded-2xl rounded-bl-sm bg-white/95 px-4 py-2.5 text-sm text-[#133378]'
                }
              >
                {m.content}
              </div>
            ))}
            {thinking && (
              <div className="mr-auto flex items-center gap-2 rounded-2xl bg-white/95 px-4 py-2.5 text-sm text-[#133378]/70">
                <Loader2 className="h-4 w-4 animate-spin" /> Shepherd is thinking…
              </div>
            )}
          </div>
        )}

        {/* Openers (only before the conversation starts) */}
        {!started && (
          <div className="mt-5 flex flex-wrap gap-2">
            {SHEPHERD_OPENERS.map((o) => (
              <button
                key={o.label}
                onClick={() => send(o.prompt)}
                disabled={thinking}
                className="rounded-full border border-[#C8A951]/40 bg-white/5 px-4 py-2 text-xs text-white/90 transition-colors hover:bg-[#C8A951]/20 disabled:opacity-50"
              >
                {o.label}
              </button>
            ))}
          </div>
        )}

        {error && <p className="mt-3 text-xs text-[#F8C8C8]">{error}</p>}

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="mt-5 flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Talk to Shepherd…"
            aria-label="Message Shepherd"
            className="flex-1 rounded-full bg-white/95 px-5 py-3 text-sm text-[#133378] placeholder:text-[#133378]/45 outline-none ring-1 ring-white/20 focus:ring-2 focus:ring-[#C8A951]"
          />
          <button
            type="submit"
            disabled={thinking || !input.trim()}
            aria-label="Send"
            className="grid h-11 w-11 place-items-center rounded-full bg-[#C8A951] text-[#133378] transition-transform hover:scale-105 disabled:opacity-40"
          >
            {thinking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
      </div>
    </section>
  );
}
