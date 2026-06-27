import React, { useState } from "react";
import { 
  Task, 
  Subtask 
} from "../types";
import { 
  Shield, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  Flame, 
  Activity, 
  ChevronRight,
  Info,
  Layers,
  Sparkles,
  Zap,
  FileDown
} from "lucide-react";
import { generatePortfolioPDF } from "../lib/pdfGenerator";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  AreaChart, 
  Area 
} from "recharts";
import { motion } from "motion/react";

interface DashboardAnalyticsProps {
  tasks: Task[];
  onSelectTask: (taskId: string) => void;
}

export default function DashboardAnalytics({ tasks, onSelectTask }: DashboardAnalyticsProps) {
  const [velocityPace, setVelocityPace] = useState<number>(3); // hours of work per day

  // Fallback for empty state
  if (tasks.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[480px]">
        <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
          <Activity className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-base font-display font-extrabold text-slate-950">Analytics Engines Offline</h3>
        <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-normal">
          Add shielded tasks with estimated work loads first to visualize performance metrics, completion velocities, and timeline forecasts.
        </p>
      </div>
    );
  }

  const now = new Date();

  // 1. Calculations & Metrics
  let totalSubtasks = 0;
  let completedSubtasks = 0;
  let totalEstimatedHours = 0;
  let totalRemainingHours = 0;
  let overdueCount = 0;
  let highRiskCount = 0;
  let mediumRiskCount = 0;
  let lowRiskCount = 0;

  const taskStats = tasks.map((task) => {
    const totalSub = task.subtasks.length;
    const completedSub = task.subtasks.filter((s) => s.completed).length;
    const progressPercent = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;
    
    totalSubtasks += totalSub;
    completedSubtasks += completedSub;
    totalEstimatedHours += task.estimatedHours;
    
    // Remaining estimated hours for this task
    const remainingRatio = totalSub > 0 ? (totalSub - completedSub) / totalSub : 1;
    const remainingHours = task.estimatedHours * remainingRatio;
    totalRemainingHours += remainingHours;

    // Overdue check
    const deadlineDate = new Date(task.deadline);
    const isOverdue = deadlineDate.getTime() < now.getTime() && progressPercent < 100;
    if (isOverdue) overdueCount++;

    // Risk sorting
    const risk = task.analysis?.risk_level || "Low";
    if (risk === "High") highRiskCount++;
    else if (risk === "Medium") mediumRiskCount++;
    else lowRiskCount++;

    // Calculate Projected Completion Date
    // Assuming a productivity velocity (e.g. 3 hours of focused execution per day)
    const daysToComplete = remainingHours / Math.max(velocityPace, 0.5);
    const projectedCompletionDate = new Date(now.getTime() + daysToComplete * 24 * 60 * 60 * 1000);
    const missedDeadline = projectedCompletionDate.getTime() > deadlineDate.getTime();

    return {
      ...task,
      totalSub,
      completedSub,
      progressPercent,
      remainingHours,
      isOverdue,
      projectedCompletionDate,
      missedDeadline,
      daysToComplete,
      risk
    };
  });

  // Calculate Overall Shield Score (Health Rating out of 100)
  // Factors: overall progress, percentage of tasks on-time, and risk weight.
  const overallProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) : 0;
  const onTimeRatio = tasks.length > 0 ? (tasks.length - overdueCount) / tasks.length : 1;
  const riskPenalty = (highRiskCount * 0.4 + mediumRiskCount * 0.1) / tasks.length;
  const shieldScore = Math.max(Math.min(Math.round((overallProgress * 60 + onTimeRatio * 40 - riskPenalty * 100)), 100), 5);

  // Velocity calculations: completed items / days since creation
  // Or: total subtasks secured. Let's make a beautiful "Subtasks Completed per Priority"
  const priorityDistribution = { Low: 0, Medium: 0, High: 0 };
  const priorityCompletions = { Low: 0, Medium: 0, High: 0 };
  
  tasks.forEach(t => {
    priorityDistribution[t.priority] += 1;
    priorityCompletions[t.priority] += t.subtasks.filter(s => s.completed).length;
  });

  const priorityChartData = [
    { name: "High Priority", Tasks: priorityDistribution.High, CompletedSubtasks: priorityCompletions.High },
    { name: "Medium Priority", Tasks: priorityDistribution.Medium, CompletedSubtasks: priorityCompletions.Medium },
    { name: "Low Priority", Tasks: priorityDistribution.Low, CompletedSubtasks: priorityCompletions.Low },
  ];

  // Risk Distribution Chart Data
  const riskChartData = [
    { name: "High Risk", value: highRiskCount, color: "#f43f5e" },
    { name: "Medium Risk", value: mediumRiskCount, color: "#f59e0b" },
    { name: "Low Risk", value: lowRiskCount, color: "#10b981" },
  ].filter(item => item.value > 0);

  // Task Completion Progress Bar/Area Chart Data
  const completionChartData = taskStats.map(t => ({
    name: t.name.length > 15 ? t.name.slice(0, 15) + "..." : t.name,
    "Progress %": t.progressPercent,
    "Estimate (Hrs)": t.estimatedHours,
    "Remaining (Hrs)": Math.round(t.remainingHours * 10) / 10
  }));

  // Velocity trends: Simulate dynamic productivity speed bounds
  const velocityTrendData = [
    { name: "Mon", Velocity: Math.round(velocityPace * 0.7 * 10) / 10, Target: velocityPace },
    { name: "Tue", Velocity: Math.round(velocityPace * 1.1 * 10) / 10, Target: velocityPace },
    { name: "Wed", Velocity: Math.round(velocityPace * 0.9 * 10) / 10, Target: velocityPace },
    { name: "Thu", Velocity: Math.round(velocityPace * 1.3 * 10) / 10, Target: velocityPace },
    { name: "Fri", Velocity: Math.round(velocityPace * 1.0 * 10) / 10, Target: velocityPace },
    { name: "Sat", Velocity: Math.round(velocityPace * 0.6 * 10) / 10, Target: velocityPace },
    { name: "Sun", Velocity: Math.round(velocityPace * 0.8 * 10) / 10, Target: velocityPace },
  ];

  return (
    <div className="space-y-6">
      {/* Velocity Parameter Tuner Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-base font-display font-black text-slate-950 flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-600 animate-pulse" />
            Productivity Pace Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tune your estimated focus hours per day to recalibrate projected completion calendars and risk forecasts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-2 rounded-xl flex-1 sm:flex-none">
            <span className="text-xs text-slate-600 font-bold shrink-0">Daily Focus:</span>
            <input
              type="range"
              min="1"
              max="12"
              step="0.5"
              value={velocityPace}
              onChange={(e) => setVelocityPace(Number(e.target.value))}
              className="w-full sm:w-32 accent-indigo-600 cursor-ew-resize"
            />
            <span className="text-xs font-mono font-bold text-indigo-700 bg-white px-2.5 py-1 rounded border border-indigo-100 shadow-xs shrink-0">
              {velocityPace} hrs/day
            </span>
          </div>
          <button
            onClick={() => generatePortfolioPDF(tasks, velocityPace)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <FileDown className="w-4 h-4" />
            <span>Export Executive PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Shield Rating */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-indigo-600" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">Shield Health</span>
            <Shield className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black font-display text-slate-900">{shieldScore}%</span>
            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded">
              {shieldScore > 75 ? "Excellent" : shieldScore > 50 ? "Stable" : "Critical"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Aggregated deadline security coefficient</p>
        </motion.div>

        {/* Remaining Focus Load */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-amber-500" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">Work Buffer</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black font-display text-slate-900">{Math.round(totalRemainingHours * 10) / 10}h</span>
            <span className="text-[10px] text-slate-500 font-mono">left</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">
            Projected focus effort to secure all open subtasks
          </p>
        </motion.div>

        {/* Task Velocity */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-500" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">Subtask Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black font-display text-slate-900">
              {totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0}%
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              ({completedSubtasks}/{totalSubtasks})
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">
            Completion percentage across all subtask checkpoints
          </p>
        </motion.div>

        {/* Overdue Checkpoints */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-rose-500" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">Overdue Guard</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-3xl font-black font-display ${overdueCount > 0 ? "text-rose-600 animate-pulse" : "text-slate-900"}`}>
              {overdueCount}
            </span>
            <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider bg-rose-50 px-1.5 py-0.5 rounded">
              {overdueCount > 0 ? "Action Required" : "Secure"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Active items with deadlines in the past</p>
        </motion.div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Task Completion Rates */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-xs font-mono font-black text-slate-400 uppercase tracking-widest">Completion & Effort Analysis</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Task completion percentage mapped alongside remaining effort hours.</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={completionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRemaining" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #f1f5f9", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}
                  labelStyle={{ fontWeight: "bold", fontSize: "11px", color: "#1e293b" }}
                  itemStyle={{ fontSize: "11px" }}
                />
                <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }} />
                <Area type="monotone" dataKey="Progress %" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorProgress)" />
                <Area type="monotone" dataKey="Remaining (Hrs)" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorRemaining)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Task Velocity Simulation vs Focus Targets */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-xs font-mono font-black text-slate-400 uppercase tracking-widest">Velocity & Focus Consistency</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Focus hours committed daily vs configured pace threshold.</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={velocityTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #f1f5f9" }}
                  labelStyle={{ fontWeight: "bold", fontSize: "11px" }}
                  itemStyle={{ fontSize: "11px" }}
                />
                <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }} />
                <Line type="monotone" dataKey="Velocity" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                <Line type="monotone" strokeDasharray="5 5" dataKey="Target" stroke="#6366f1" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Grid: 3. Risk Distribution and 4. Projected Completion Dates */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Risk Distribution Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-4 flex flex-col">
          <div className="mb-3">
            <h3 className="text-xs font-mono font-black text-slate-400 uppercase tracking-widest">Delay Risk Profile</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Task risk level share calculated by estimated hours and remaining margins.</p>
          </div>

          {riskChartData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
              <Shield className="w-8 h-8 text-slate-200 mb-2" />
              <span className="text-xs text-slate-400 font-bold">No risk analyses</span>
            </div>
          ) : (
            <div className="flex-1 flex flex-col sm:flex-row lg:flex-col items-center justify-center gap-4">
              <div className="h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {riskChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2.5 w-full">
                {riskChartData.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-xl bg-slate-50/50 border border-slate-100">
                    <span className="flex items-center gap-2 font-bold text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-mono font-bold text-slate-900 bg-white border border-slate-100 px-2 py-0.5 rounded">
                      {item.value} {item.value === 1 ? "task" : "tasks"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Projected Completion Calendar (Forecast Timeline) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-8 flex flex-col">
          <div className="mb-4">
            <h3 className="text-xs font-mono font-black text-slate-400 uppercase tracking-widest">Projected Completion Calendar</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Live simulation of actual completion dates comparing timeline buffers against physical deadlines.
            </p>
          </div>

          <div className="flex-1 space-y-3.5 overflow-y-auto max-h-[340px] pr-1">
            {taskStats.map((task) => (
              <div 
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                className={`group p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                  task.missedDeadline && task.progressPercent < 100
                    ? "border-red-100 bg-red-50/10 hover:border-red-300" 
                    : "border-slate-50 bg-slate-50/30 hover:border-slate-200"
                }`}
              >
                <div className="flex justify-between items-start gap-4 mb-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-950 group-hover:text-indigo-600 transition-colors truncate max-w-[240px] sm:max-w-md">
                      {task.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Deadline: {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  
                  {/* Forecast Status Badge */}
                  {task.progressPercent === 100 ? (
                    <span className="text-[9px] bg-emerald-50 border border-emerald-100 text-emerald-700 font-mono uppercase px-2 py-0.5 rounded font-bold">
                      Secured
                    </span>
                  ) : task.missedDeadline ? (
                    <span className="text-[9px] bg-red-100 border border-red-200 text-red-700 font-mono uppercase px-2 py-0.5 rounded font-bold animate-pulse flex items-center gap-1">
                      <Flame className="w-3 h-3 text-red-500" />
                      Will Miss Deadline
                    </span>
                  ) : (
                    <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono uppercase px-2 py-0.5 rounded font-bold">
                      On Track
                    </span>
                  )}
                </div>

                {/* Progress bar and date projections */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100/50 text-[11px] items-center">
                  <div className="flex justify-between items-center bg-white border border-slate-100 p-2 rounded-xl">
                    <span className="text-slate-400 font-semibold">Remaining work:</span>
                    <span className="font-mono font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded">
                      {Math.round(task.remainingHours * 10) / 10} hours
                    </span>
                  </div>

                  <div className={`flex justify-between items-center p-2 rounded-xl border ${
                    task.progressPercent === 100
                      ? "bg-emerald-50/50 border-emerald-100 text-emerald-800"
                      : task.missedDeadline
                      ? "bg-red-50/80 border-red-100 text-red-800"
                      : "bg-indigo-50/50 border-indigo-100 text-indigo-800"
                  }`}>
                    <span className="font-semibold">Projected Date:</span>
                    <span className="font-bold font-mono">
                      {task.progressPercent === 100 
                        ? "Completed" 
                        : task.projectedCompletionDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      }
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
