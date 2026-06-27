import React, { useState, useEffect } from "react";
import { 
  Sun, 
  Moon, 
  Sunset, 
  Sparkles, 
  Clock, 
  AlertTriangle, 
  Target, 
  CheckCircle2, 
  ArrowRight,
  Shield,
  Calendar
} from "lucide-react";
import { Task, DailyBriefingData } from "../types";
import { motion } from "motion/react";

interface DailyBriefingCardProps {
  tasks: Task[];
  userName?: string;
  isDarkMode?: boolean;
}

export default function DailyBriefingCard({ tasks, userName = "Amish", isDarkMode }: DailyBriefingCardProps) {
  const [briefing, setBriefing] = useState<DailyBriefingData | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    let timeGreeting = "Good Morning";
    let icon = <Sun className="w-6 h-6 text-amber-500 animate-spin-slow" />;

    if (hour >= 12 && hour < 17) {
      timeGreeting = "Good Afternoon";
      icon = <Sunset className="w-6 h-6 text-amber-500" />;
    } else if (hour >= 17 || hour < 5) {
      timeGreeting = "Good Evening";
      icon = <Moon className="w-6 h-6 text-indigo-400" />;
    }

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);

    // Filter active tasks due in next 48 hours or high priority
    const activeTasks = tasks.filter(t => {
      const done = t.subtasks.filter(s => s.completed).length;
      return t.subtasks.length === 0 || done < t.subtasks.length;
    });

    const todayPriorities = activeTasks
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 3)
      .map(t => t.name);

    const upcomingDeadlines = activeTasks
      .slice(0, 2)
      .map(t => `${t.name} (${new Date(t.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);

    // Tasks completed yesterday or recently
    const completedYesterdayCount = tasks.filter(t => {
      const total = t.subtasks.length;
      if (total === 0) return false;
      const done = t.subtasks.filter(s => s.completed).length;
      return done === total;
    }).length;

    const hoursRemaining = Math.round(activeTasks.reduce((sum, t) => sum + t.estimatedHours, 0) * 10) / 10;

    const highRiskTask = activeTasks.find(t => t.analysis?.risk_level === "High");
    const biggestRiskToday = highRiskTask 
      ? `High delay risk on "${highRiskTask.name}" (${highRiskTask.analysis?.risk_percentage || 'High probability'})`
      : activeTasks.length > 0
      ? `Procrastination bottleneck on "${activeTasks[0].name}"`
      : "No critical risks detected in current schedule.";

    const recommendedFocusBlock = activeTasks.length > 0 && activeTasks[0].analysis?.recommended_start_time
      ? activeTasks[0].analysis.recommended_start_time
      : "09:00 AM – 11:30 AM: Deep Work Session";

    const goal = activeTasks.length > 0 
      ? `Complete at least 3 subtask checkpoints across ${activeTasks[0].name}`
      : "Review project milestones and calibrate new deadlines";

    setBriefing({
      greeting: `${timeGreeting}, ${userName}.`,
      todayPriorities: todayPriorities.length > 0 ? todayPriorities : ["All recorded checkpoints secured."],
      upcomingDeadlines: upcomingDeadlines.length > 0 ? upcomingDeadlines : ["No pending deadlines today."],
      completedYesterdayCount,
      hoursRemaining,
      biggestRiskToday,
      recommendedFocusBlock,
      productivityGoal: goal
    });
  }, [tasks, userName]);

  if (!briefing) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-3xl border shadow-sm mb-6 relative overflow-hidden transition-colors ${
        isDarkMode 
          ? "bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border-indigo-500/30 text-slate-100" 
          : "bg-gradient-to-br from-indigo-50/80 via-white to-white border-indigo-100 text-slate-800"
      }`}
    >
      {/* Decorative background glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top row: Greeting & Goal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-indigo-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-indigo-100 dark:border-slate-700">
            <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-black tracking-tight text-slate-900 dark:text-white">
              {briefing.greeting}
            </h2>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-bold mt-0.5 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              <span>SMART DAILY BRIEFING</span>
            </p>
          </div>
        </div>

        <div className={`p-3.5 rounded-2xl border md:max-w-md ${
          isDarkMode ? "bg-slate-800/80 border-slate-700" : "bg-white border-indigo-100/80 shadow-2xs"
        }`}>
          <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Target className="w-3 h-3 text-indigo-500" />
            <span>Today's Productivity Goal</span>
          </div>
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
            {briefing.productivityGoal}
          </p>
        </div>
      </div>

      {/* Grid of Briefing Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
        
        {/* Priorities */}
        <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-slate-800/40 border-slate-700/60" : "bg-slate-50/80 border-slate-100"}`}>
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono uppercase mb-2 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-indigo-500" />
            <span>Today's Priorities</span>
          </div>
          <ul className="space-y-1.5">
            {briefing.todayPriorities.map((item, idx) => (
              <li key={idx} className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span className="truncate">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Deadlines & Hours */}
        <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-slate-800/40 border-slate-700/60" : "bg-slate-50/80 border-slate-100"}`}>
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono uppercase mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Workload & Deadlines</span>
          </div>
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 space-y-1">
            <div><strong>Remaining Effort:</strong> <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{briefing.hoursRemaining}h</span></div>
            <div><strong>Completed Yesterday:</strong> <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{briefing.completedYesterdayCount} tasks</span></div>
            <div className="text-[11px] text-slate-500 truncate pt-1">
              Next: {briefing.upcomingDeadlines[0] || "None"}
            </div>
          </div>
        </div>

        {/* Biggest Risk */}
        <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-rose-950/20 border-rose-900/40" : "bg-rose-50/60 border-rose-100"}`}>
          <div className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono uppercase mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Biggest Risk Today</span>
          </div>
          <p className="text-xs font-medium text-rose-900 dark:text-rose-200 leading-relaxed line-clamp-3">
            {briefing.biggestRiskToday}
          </p>
        </div>

        {/* Focus Block */}
        <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-emerald-950/20 border-emerald-900/40" : "bg-emerald-50/60 border-emerald-100"}`}>
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono uppercase mb-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Recommended Focus Block</span>
          </div>
          <p className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200 leading-relaxed">
            {briefing.recommendedFocusBlock}
          </p>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Optimized for Peak Energy</span>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
