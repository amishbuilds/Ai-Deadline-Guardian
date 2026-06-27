import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  MessageSquare, 
  X, 
  Send, 
  Trash2, 
  RefreshCw, 
  Bot, 
  User, 
  Zap, 
  AlertTriangle,
  ChevronDown,
  ArrowRight
} from "lucide-react";
import { Task, ChatMessage } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface AITaskAssistantProps {
  tasks: Task[];
  pace: number;
  onQuickActionTrigger?: (action: string, responseContext?: string) => void;
  isDarkMode?: boolean;
}

export default function AITaskAssistant({ tasks, pace, onQuickActionTrigger, isDarkMode }: AITaskAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history
  useEffect(() => {
    const saved = localStorage.getItem("deadline_guardian_chat_history");
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load chat history", e);
      }
    } else {
      // Initial greeting
      const initialMsg: ChatMessage = {
        id: `msg-init-${Date.now()}`,
        sender: "assistant",
        text: "👋 **Hello! I'm your AI Task Assistant.**\n\nI automatically analyze your workspace deadlines, risk scores, and progress. How can I help you accelerate today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        quickActions: ["What should I work on today?", "Which task is the highest priority?", "Am I behind schedule?", "Activate Rescue Mode"]
      };
      setMessages([initialMsg]);
    }
  }, []);

  // Save chat history
  const saveHistory = (msgs: ChatMessage[]) => {
    setMessages(msgs);
    localStorage.setItem("deadline_guardian_chat_history", JSON.stringify(msgs));
  };

  // Scroll to bottom when messages change or panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, isOpen, isLoading]);

  // Clear chat history
  const handleClearHistory = () => {
    const welcome: ChatMessage = {
      id: `msg-welcome-${Date.now()}`,
      sender: "assistant",
      text: "🧹 **Chat history cleared.** Ready for fresh coaching!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      quickActions: ["What should I work on today?", "Give me today's study plan", "Explain Risk"]
    };
    saveHistory([welcome]);
  };

  // Build Project State snapshot
  const buildProjectSnapshot = () => {
    let totalSub = 0;
    let completedSub = 0;
    let overdueCount = 0;
    let highRiskCount = 0;
    const now = new Date();

    const taskList = tasks.map(t => {
      const subs = t.subtasks.length;
      const done = t.subtasks.filter(s => s.completed).length;
      totalSub += subs;
      completedSub += done;
      const progress = subs > 0 ? Math.round((done / subs) * 100) : 0;
      
      const dead = new Date(t.deadline);
      if (dead < now && progress < 100) overdueCount++;
      const risk = t.analysis?.risk_level || "Low";
      if (risk === "High") highRiskCount++;

      return {
        name: t.name,
        priority: t.priority,
        deadline: new Date(t.deadline).toLocaleString(),
        estimatedHours: t.estimatedHours,
        progress,
        risk
      };
    });

    const progressPercent = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

    return {
      totalTasks: tasks.length,
      pace,
      progressPercent,
      overdueCount,
      highRiskCount,
      taskList
    };
  };

  // Send message to backend
  const handleSendMessage = async (queryText?: string) => {
    const query = (queryText || inputQuery).trim();
    if (!query || isLoading) return;

    if (!queryText) setInputQuery("");

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMsgs = [...messages, userMsg];
    saveHistory(updatedMsgs);
    setIsLoading(true);
    setRetryCount(0);

    const snapshot = buildProjectSnapshot();

    let currentAttempt = 0;
    const maxRetries = 3;

    while (currentAttempt <= maxRetries) {
      try {
        const res = await fetch("/api/chat-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userQuery: query,
            messages: updatedMsgs,
            projectState: snapshot
          })
        });

        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }

        const data = await res.json();
        
        const botMsg: ChatMessage = {
          id: `msg-bot-${Date.now()}`,
          sender: "assistant",
          text: data.reply || "I've analyzed your workspace schedule.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          quickActions: data.quickActions || ["Create Schedule", "Break into Subtasks", "Optimize Plan", "Activate Rescue Mode"]
        };

        saveHistory([...updatedMsgs, botMsg]);
        setIsLoading(false);
        return;
      } catch (err: any) {
        currentAttempt++;
        setRetryCount(currentAttempt);
        if (currentAttempt <= maxRetries) {
          console.warn(`[AI Coach] Network issue. Retrying attempt ${currentAttempt}...`);
          await new Promise(r => setTimeout(r, 2000));
        } else {
          console.error("[AI Coach] Exhausted retries:", err);
          const errorMsg: ChatMessage = {
            id: `msg-err-${Date.now()}`,
            sender: "assistant",
            text: "⚠️ **Connection Error:** The AI productivity coach is momentarily unreachable due to heavy network congestion. Please tap Retry.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isError: true,
            quickActions: ["Retry last question", "What should I work on today?"]
          };
          saveHistory([...updatedMsgs, errorMsg]);
          setIsLoading(false);
        }
      }
    }
  };

  // Quick action clicked
  const handleActionClick = (action: string) => {
    if (action === "Retry last question") {
      const lastUser = [...messages].reverse().find(m => m.sender === "user");
      if (lastUser) handleSendMessage(lastUser.text);
      return;
    }

    if (onQuickActionTrigger) {
      onQuickActionTrigger(action);
    }

    // Also send prompt to assistant if conversational
    handleSendMessage(action);
  };

  // Simple markdown renderer for chat text
  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      // Bold syntax
      const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return (
        <React.Fragment key={idx}>
          <span dangerouslySetInnerHTML={{ __html: formattedLine }} />
          {idx < text.split('\n').length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        id="ai-assistant-fab"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full shadow-xl shadow-indigo-500/30 flex items-center gap-2.5 cursor-pointer border border-indigo-400/30 group"
      >
        <div className="relative">
          <Sparkles className="w-6 h-6 animate-pulse text-yellow-300" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-indigo-600 animate-ping" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-indigo-600" />
        </div>
        <span className="font-display font-bold text-sm pr-1 hidden sm:inline">AI Task Coach</span>
      </motion.button>

      {/* Chat Drawer / Panel Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className={`fixed bottom-24 right-4 sm:right-6 w-[calc(100vw-32px)] sm:w-[440px] h-[600px] max-h-[80vh] rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden border ${
              isDarkMode 
                ? "bg-slate-900 border-slate-700 text-slate-100 shadow-slate-950/50" 
                : "bg-white border-slate-200 text-slate-800 shadow-slate-300/60"
            }`}
          >
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
              isDarkMode ? "bg-slate-800/80 border-slate-700" : "bg-indigo-600 text-white border-indigo-700"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isDarkMode ? "bg-indigo-500/20 text-indigo-400" : "bg-white/10 text-yellow-300"}`}>
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-sm flex items-center gap-1.5">
                    <span>AI Productivity Coach</span>
                    <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded font-mono uppercase">Live</span>
                  </h3>
                  <p className={`text-[11px] font-mono ${isDarkMode ? "text-slate-400" : "text-indigo-100"}`}>
                    Gemini 3.5 Grounded Context
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleClearHistory}
                  title="Clear Chat History"
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-white/10 text-indigo-100"
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-white/10 text-indigo-100"
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Body */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${
              isDarkMode ? "bg-slate-900/50" : "bg-slate-50/70"
            }`}>
              {messages.map((msg) => {
                const isUser = msg.sender === "user";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-end gap-2 max-w-[88%]">
                      {!isUser && (
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mb-1 ${
                          msg.isError ? "bg-rose-500 text-white" : isDarkMode ? "bg-indigo-600 text-white" : "bg-indigo-600 text-white"
                        }`}>
                          {msg.isError ? <AlertTriangle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                      )}

                      <div className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                        isUser 
                          ? "bg-indigo-600 text-white rounded-br-xs font-medium" 
                          : msg.isError
                          ? isDarkMode ? "bg-rose-950/60 border border-rose-800 text-rose-200 rounded-bl-xs" : "bg-rose-50 border border-rose-200 text-rose-900 rounded-bl-xs"
                          : isDarkMode
                          ? "bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-xs"
                          : "bg-white border border-slate-200/80 text-slate-800 rounded-bl-xs"
                      }`}>
                        {renderFormattedText(msg.text)}
                      </div>

                      {isUser && (
                        <div className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center shrink-0 mb-1 text-slate-600 dark:text-slate-300">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <span className={`text-[10px] font-mono px-9 mt-1 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                      {msg.timestamp}
                    </span>

                    {/* Quick Actions Buttons below assistant response */}
                    {!isUser && msg.quickActions && msg.quickActions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5 pl-9 max-w-full">
                        {msg.quickActions.map((qa, i) => (
                          <button
                            key={i}
                            onClick={() => handleActionClick(qa)}
                            disabled={isLoading}
                            className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer border ${
                              isDarkMode
                                ? "bg-slate-800 hover:bg-indigo-950/80 border-slate-700 hover:border-indigo-500/50 text-indigo-300"
                                : "bg-white hover:bg-indigo-50 border-slate-200 hover:border-indigo-300 text-indigo-700 shadow-2xs"
                            }`}
                          >
                            <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>{qa}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {/* Typing / Loading Animation */}
              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 pl-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 animate-spin" />
                  </div>
                  <div className={`p-3 rounded-2xl rounded-bl-xs flex items-center gap-2 border ${
                    isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                  }`}>
                    <span className="text-xs font-mono text-indigo-500 font-bold">
                      {retryCount > 0 ? `Auto-retrying failover (Attempt ${retryCount})...` : "Coach is thinking..."}
                    </span>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Footer Input */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} 
              className={`p-3 border-t flex items-center gap-2 shrink-0 ${
                isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
              }`}
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask e.g., What should I work on today?"
                disabled={isLoading}
                className={`flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border focus:outline-none transition-colors ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-indigo-500"
                    : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white"
                }`}
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isLoading}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer shrink-0 flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
