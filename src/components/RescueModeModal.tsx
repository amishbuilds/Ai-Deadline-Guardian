import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  Flame, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp, 
  Sparkles, 
  X, 
  RefreshCw,
  Zap,
  CheckSquare
} from "lucide-react";
import { Task, RescuePlan } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface RescueModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  pace: number;
  isDarkMode?: boolean;
}

export default function RescueModeModal({ isOpen, onClose, tasks, pace, isDarkMode }: RescueModeModalProps) {
  const [plan, setPlan] = useState<RescuePlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const activeTasks = tasks.filter(t => {
        const done = t.subtasks.filter(s => s.completed).length;
        return t.subtasks.length === 0 || done < t.subtasks.length;
      });

      const res = await fetch("/api/rescue-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: activeTasks, pace })
      });

      if (!res.ok) throw new Error("Failed to formulate rescue plan");
      const data = await res.json();
      setPlan(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate emergency rescue protocol");
      // Local fallback rescue plan
      setPlan({
        remainingHours: Math.round(tasks.reduce((sum, t) => sum + t.estimatedHours, 0) * 0.7),
        successProbability: "82%",
        mustComplete: tasks.slice(0, 3).map(t => `${t.name} (Core Delivery)`),
        maySkip: ["Secondary styling details", "Optional bonus modules", "Exhaustive unit test refactoring"],
        workBlocks: [
          { time: "07:00 – 09:30", activity: "High-priority core feature implementation" },
          { time: "09:45 – 11:30", activity: "Integration & bug triage" },
          { time: "11:45 – 12:30", activity: "Final verification & submission package build" }
        ],
        estCompletionPercentage: 91,
        expectedFinishTime: "Tomorrow 4:00 PM",
        motivationMessage: "🔥 **Stay calm and execute.** You have enough time to deliver a solid passing submission if you cut non-essential scope immediately. Complete the first work block now."
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPlan();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={`relative w-full max-w-2xl rounded-3xl shadow-2xl border overflow-hidden my-8 ${
            isDarkMode 
              ? "bg-slate-900 border-rose-500/50 text-slate-100" 
              : "bg-white border-rose-300 text-slate-800"
          }`}
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 p-6 text-white relative flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md text-yellow-300 animate-bounce">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-black text-xl sm:text-2xl tracking-tight">
                    EMERGENCY RESCUE MODE
                  </h2>
                  <span className="bg-white text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-full font-mono uppercase tracking-widest animate-pulse">
                    ACTIVE
                  </span>
                </div>
                <p className="text-xs text-rose-100 font-mono mt-0.5">
                  Automated Triage & Scope Salvage Protocol
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative">
                  <RefreshCw className="w-12 h-12 text-rose-600 animate-spin" />
                  <Sparkles className="w-5 h-5 text-amber-500 absolute top-0 right-0 animate-ping" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-base">Formulating Emergency Completion Plan...</h4>
                  <p className="text-xs text-slate-500 font-mono mt-1">Analyzing deadline buffers and trimming non-essential deliverables</p>
                </div>
              </div>
            ) : plan ? (
              <>
                {/* Motivation Banner */}
                <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                  isDarkMode ? "bg-amber-950/40 border-amber-500/30 text-amber-200" : "bg-amber-50 border-amber-200 text-amber-900"
                }`}>
                  <Flame className="w-6 h-6 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                  <div className="text-xs sm:text-sm leading-relaxed">
                    <span dangerouslySetInnerHTML={{ __html: plan.motivationMessage.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                  </div>
                </div>

                {/* KPI Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className={`p-3.5 rounded-2xl border text-center ${isDarkMode ? "bg-slate-800/80 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                    <div className="text-[10px] font-bold uppercase font-mono text-slate-500">Remaining Time</div>
                    <div className="text-lg font-black text-indigo-500 font-mono mt-1">{plan.remainingHours} hrs</div>
                  </div>
                  <div className={`p-3.5 rounded-2xl border text-center ${isDarkMode ? "bg-slate-800/80 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                    <div className="text-[10px] font-bold uppercase font-mono text-slate-500">Success Probability</div>
                    <div className="text-lg font-black text-emerald-500 font-mono mt-1">{plan.successProbability}</div>
                  </div>
                  <div className={`p-3.5 rounded-2xl border text-center ${isDarkMode ? "bg-slate-800/80 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                    <div className="text-[10px] font-bold uppercase font-mono text-slate-500">Est. Completion</div>
                    <div className="text-lg font-black text-amber-500 font-mono mt-1">{plan.estCompletionPercentage}%</div>
                  </div>
                  <div className={`p-3.5 rounded-2xl border text-center ${isDarkMode ? "bg-slate-800/80 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                    <div className="text-[10px] font-bold uppercase font-mono text-slate-500">Expected Finish</div>
                    <div className="text-xs font-black text-rose-500 font-mono mt-1.5 truncate">{plan.expectedFinishTime}</div>
                  </div>
                </div>

                {/* Triage Columns: Must Complete vs May Skip */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Must Complete */}
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-emerald-950/20 border-emerald-800/40" : "bg-emerald-50/60 border-emerald-200"}`}>
                    <h4 className="font-display font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-3">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>MUST COMPLETE (NON-NEGOTIABLE)</span>
                    </h4>
                    <ul className="space-y-2">
                      {plan.mustComplete.map((item, idx) => (
                        <li key={idx} className="text-xs flex items-start gap-2 text-slate-700 dark:text-slate-300 font-medium">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* May Skip */}
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-rose-950/20 border-rose-800/40" : "bg-rose-50/60 border-rose-200"}`}>
                    <h4 className="font-display font-bold text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5 mb-3">
                      <XCircle className="w-4 h-4" />
                      <span>MAY SKIP OR POSTPONE SAFELY</span>
                    </h4>
                    <ul className="space-y-2">
                      {plan.maySkip.map((item, idx) => (
                        <li key={idx} className="text-xs flex items-start gap-2 text-slate-600 dark:text-slate-400 line-through">
                          <span className="text-rose-500 font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommended Chronological Work Blocks */}
                <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 mb-3">
                    <Clock className="w-4 h-4" />
                    <span>RECOMMENDED EMERGENCY WORK BLOCKS</span>
                  </h4>
                  <div className="space-y-2.5 divide-y divide-slate-200 dark:divide-slate-700/50">
                    {plan.workBlocks.map((wb, idx) => (
                      <div key={idx} className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                        <span className="font-mono font-black text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-1 rounded w-fit sm:w-36 shrink-0 border border-rose-200 dark:border-rose-800/40">
                          {wb.time}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {wb.activity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-rose-500">Failed to load plan data.</div>
            )}
          </div>

          {/* Footer */}
          <div className={`p-4 border-t flex items-center justify-between ${isDarkMode ? "bg-slate-800/80 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
            <button
              onClick={fetchPlan}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Recalculate Plan</span>
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-500/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4" />
              <span>Acknowledge & Start Execution</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
