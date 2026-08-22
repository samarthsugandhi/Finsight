"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Sparkles, X, GripVertical } from "lucide-react";
import { api } from "@/lib/api";
import { useFinance } from "@/context/FinanceContext";

const POSITION_KEY = "finai_widget_position";
const DEFAULT_POSITION = { x: null, y: null }; // null = use default bottom-right CSS position

function loadPosition() {
  if (typeof window === "undefined") return DEFAULT_POSITION;
  try {
    const raw = window.localStorage.getItem(POSITION_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_POSITION;
  } catch {
    return DEFAULT_POSITION;
  }
}

function savePosition(pos) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(POSITION_KEY, JSON.stringify(pos));
}

function clampToViewport(x, y, width, height) {
  const maxX = window.innerWidth - width - 8;
  const maxY = window.innerHeight - height - 8;
  return { x: Math.min(Math.max(8, x), Math.max(8, maxX)), y: Math.min(Math.max(8, y), Math.max(8, maxY)) };
}

export default function FinAIChat() {
  const store = useFinance();
  const { refetch, setError } = store;
  const prefersReducedMotion = useReducedMotion();

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [activeAction, setActiveAction] = useState(null);

  // --- Draggable position (persisted, works for both the trigger button and the open panel) ---
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ dx: 0, dy: 0 });
  const widgetRef = useRef(null);

  useEffect(() => {
    setPosition(loadPosition());
  }, []);

  function handleDragStart(e) {
    const point = e.touches ? e.touches[0] : e;
    const rect = widgetRef.current.getBoundingClientRect();
    dragOffset.current = { dx: point.clientX - rect.left, dy: point.clientY - rect.top };
    setDragging(true);
  }

  useEffect(() => {
    if (!dragging) return;

    function handleMove(e) {
      const point = e.touches ? e.touches[0] : e;
      const rect = widgetRef.current.getBoundingClientRect();
      const next = clampToViewport(
        point.clientX - dragOffset.current.dx,
        point.clientY - dragOffset.current.dy,
        rect.width,
        rect.height
      );
      setPosition(next);
    }
    function handleUp() {
      setDragging(false);
      setPosition((current) => {
        savePosition(current);
        return current;
      });
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [dragging]);

  const wrapperStyle =
    position.x !== null
      ? { position: "fixed", left: position.x, top: position.y, right: "auto", bottom: "auto", zIndex: 40 }
      : { position: "fixed", right: 24, bottom: 24, zIndex: 40 };

  // --- Chat logic ---
  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || chatLoading) return;
    const userMsg = input.trim();
    setInput("");
    setChatLoading(true);
    const updatedMessages = [...messages, { role: "user", content: userMsg }];
    setMessages(updatedMessages);
    try {
      const res = await api.aiChat({ message: userMsg, history: messages });
      setMessages((current) => [...current, { role: "assistant", content: res.answer }]);
      if (res.actionRequired) setActiveAction(res.actionRequired);
      await refetch();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleExecuteAction() {
    if (!activeAction) return;
    try {
      if (activeAction.type === "delete_transaction") {
        const id = activeAction.parameters?.id;
        await api.deleteTransaction(id);
        setMessages((current) => [
          ...current,
          { role: "assistant", content: `Transaction ID ${id} has been deleted.` },
        ]);
      } else if (activeAction.type === "create_transaction") {
        const { type, amount, categoryId, description, date } = activeAction.parameters || {};
        await api.addTransaction({ type, amount: Number(amount), categoryId: Number(categoryId), description, date });
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: `Added: ${type === "INCOME" ? "+" : "−"}₹${amount} (${description || "no description"}).`,
          },
        ]);
      }
      setActiveAction(null);
      await refetch();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div ref={widgetRef} style={wrapperStyle}>
      {/* Trigger button — draggable via the grip handle, click to open */}
      {!chatOpen && (
        <motion.button
          onDoubleClick={() => setChatOpen(true)}
          whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
          className="group relative flex items-center gap-2 rounded-full border border-horizon/40 bg-gradient-to-br from-horizon to-horizon/70 pl-4 pr-5 py-3 shadow-[0_8px_30px_var(--color-horizon-dim)] cursor-pointer"
          title="FinAI (Double click to open)"
        >
          <span className="absolute inset-0 rounded-full bg-horizon/40 animate-ping opacity-40" />
          <Sparkles className="h-4 w-4 text-[#0f1b33] relative z-10" />
          <span className="font-screamer text-sm tracking-widest text-[#0f1b33] relative z-10">FinAI</span>
          <span
            onMouseDown={(e) => {
              e.stopPropagation();
              handleDragStart(e);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleDragStart(e);
            }}
            className="relative z-10 ml-1 cursor-grab active:cursor-grabbing rounded-full p-1 hover:bg-[#0f1b33]/10"
            title="Drag to move"
          >
            <GripVertical className="h-3.5 w-3.5 text-[#0f1b33]/60" />
          </span>
        </motion.button>
      )}

      {/* Open chat panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="w-[380px] max-w-[92vw] h-[540px] rounded-2xl border border-horizon/25 bg-paper-raised/95 shadow-2xl backdrop-blur-md flex flex-col overflow-hidden font-editorial"
          >
            <div
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
              className="px-4 py-3 border-b border-line flex justify-between items-center bg-gradient-to-r from-horizon/15 to-transparent cursor-grab active:cursor-grabbing select-none"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-horizon/25 text-horizon">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="font-screamer text-base text-ink uppercase leading-none tracking-wide">FinAI</h3>
                  <p className="text-[9px] text-ink-soft mt-0.5">Available on every page · drag header to move</p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-ink-soft hover:text-ink cursor-pointer p-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-ink-soft text-xs px-6 leading-relaxed">
                  Ask about budgets, goals, transactions, or portfolio — or say something like{" "}
                  <span className="text-horizon font-semibold">&ldquo;add ₹200 expense for coffee&rdquo;</span>.
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                        msg.role === "user" ? "bg-horizon text-[#0f1b33] font-semibold" : "bg-paper border border-line text-ink-soft"
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-xs bg-paper border border-line text-ink-soft/60 animate-pulse">
                    FinAI is thinking...
                  </div>
                </div>
              )}
              {activeAction && (
                <div className="border border-horizon/30 bg-horizon/8 p-3.5 rounded-xl flex flex-col gap-2 shadow-sm">
                  <p className="text-xs text-ink font-semibold leading-normal">
                    {activeAction.type === "delete_transaction"
                      ? `Confirm deleting transaction ID ${activeAction.parameters?.id}?`
                      : `Confirm adding ${activeAction.parameters?.type === "INCOME" ? "income" : "expense"} of ₹${activeAction.parameters?.amount}?`}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExecuteAction}
                      className="px-3.5 py-1.5 bg-horizon text-[#0f1b33] rounded-md text-[10px] font-bold cursor-pointer hover:opacity-90"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setActiveAction(null)}
                      className="px-3.5 py-1.5 bg-paper border border-line text-ink-soft rounded-md text-[10px] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-line bg-paper flex gap-2">
              <input
                type="text"
                placeholder="Ask FinAI or tell it to add a transaction..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 px-3 py-2.5 bg-paper-raised border border-line rounded-lg text-xs text-ink focus-visible:outline-none focus:border-horizon"
              />
              <button
                type="submit"
                disabled={chatLoading}
                className="px-4 bg-horizon text-[#0f1b33] rounded-lg font-screamer text-xs uppercase cursor-pointer disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
