import React, { useState, useEffect, FormEvent } from "react";
import {
  Calendar,
  Clock,
  AlertTriangle,
  Flame,
  CheckCircle2,
  ListTodo,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Shield,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  PlusCircle,
  CheckSquare,
  Square,
  TrendingUp,
  X,
  Lock,
  Zap,
  ChevronRight,
  Sun,
  Moon,
  Bell
} from "lucide-react";
import TaskForm from "./components/TaskForm";
import TaskListItem from "./components/TaskListItem";
import DashboardAnalytics from "./components/DashboardAnalytics";
import AITaskAssistant from "./components/AITaskAssistant";
import RescueModeModal from "./components/RescueModeModal";
import DailyBriefingCard from "./components/DailyBriefingCard";
import SmartNotifications from "./components/SmartNotifications";
import { Task, Subtask, AIAnalysis, PriorityType } from "./types";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  // New features state
  const [isRescueModeOpen, setIsRescueModeOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("deadline_guardian_theme");
    if (saved !== null) {
      return saved === "dark";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [hasAutoTriggeredRescue, setHasAutoTriggeredRescue] = useState(false);

  // Sync theme selection to localStorage and document HTML class
  useEffect(() => {
    localStorage.setItem("deadline_guardian_theme", isDarkMode ? "dark" : "light");
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);
  
  // viewMode controls whether we are looking at the Task Shield dashboard or Productivity Analytics
  const [viewMode, setViewMode] = useState<"shield" | "analytics">("shield");
  
  // Responsive tab switcher for mobile/tablet screen sizes
  const [activeTab, setActiveTab] = useState<"list" | "analysis">("list");

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem("deadline_guardian_tasks");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTasks(parsed);
        const savedSelectedTaskId = localStorage.getItem("deadline_guardian_selected_task_id");
        if (savedSelectedTaskId && parsed.some((t: Task) => t.id === savedSelectedTaskId)) {
          setSelectedTaskId(savedSelectedTaskId);
        } else if (parsed.length > 0) {
          setSelectedTaskId(parsed[0].id);
        }
      } catch (e) {
        console.error("Failed to parse saved tasks", e);
      }
    }
  }, []);

  // Check Rescue Mode Auto-Trigger conditions
  useEffect(() => {
    if (tasks.length > 0 && !hasAutoTriggeredRescue) {
      const now = new Date();
      const shouldTrigger = tasks.some(t => {
        const subsDone = t.subtasks.filter(s => s.completed).length;
        const totalSubs = t.subtasks.length;
        const progress = totalSubs > 0 ? (subsDone / totalSubs) * 100 : 0;
        if (progress >= 100) return false;

        const dead = new Date(t.deadline);
        const hoursLeft = (dead.getTime() - now.getTime()) / (3600 * 1000);
        const isHighRisk = t.analysis?.risk_level === "High";

        return (hoursLeft > 0 && hoursLeft <= 24) || (progress < 40 && isHighRisk);
      });

      if (shouldTrigger) {
        setHasAutoTriggeredRescue(true);
        setIsRescueModeOpen(true);
      }
    }
  }, [tasks, hasAutoTriggeredRescue]);

  // Save to LocalStorage
  const saveTasks = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    localStorage.setItem("deadline_guardian_tasks", JSON.stringify(updatedTasks));
  };

  // Helper to select task and persist selected ID
  const selectTask = (id: string | null) => {
    setSelectedTaskId(id);
    if (id) {
      localStorage.setItem("deadline_guardian_selected_task_id", id);
    } else {
      localStorage.removeItem("deadline_guardian_selected_task_id");
    }
  };

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  // Generate fallback analysis using rule-based logic when Gemini is unavailable
  const generateRuleBasedFallback = (task: Task): AIAnalysis => {
    const msRemaining = new Date(task.deadline).getTime() - Date.now();
    const hoursRemaining = Math.max(msRemaining / (1000 * 60 * 60), 0.1);

    // 1. Priority level and reason
    let priority_level: "Low" | "Medium" | "High" | "Critical" = "Medium";
    let priority_reason = "";
    if (hoursRemaining < 24) {
      priority_level = "Critical";
      priority_reason = `The deadline is less than 24 hours away (${Math.round(hoursRemaining)}h remaining). Action is critical.`;
    } else if (hoursRemaining < 72 || task.priority === "High") {
      priority_level = "High";
      priority_reason = `Proximity to deadline is tight (${Math.round(hoursRemaining / 24)} days) with substantial complexity.`;
    } else if (hoursRemaining < 168 || task.priority === "Medium") {
      priority_level = "Medium";
      priority_reason = `Moderate timeline buffer (${Math.round(hoursRemaining / 24)} days) allows structured implementation.`;
    } else {
      priority_level = "Low";
      priority_reason = `Generous timeline buffer of ${Math.round(hoursRemaining / 24)} days. Focus on high-quality delivery.`;
    }

    // 2. Schedule generation (rule-based focus blocks)
    const schedule: string[] = [];
    const recStart = new Date(Date.now() + 60 * 60 * 1000); // starts in 1 hour
    const recStartStr = recStart.toLocaleString(undefined, { 
      weekday: "short", 
      month: "short", 
      day: "numeric", 
      hour: "2-digit", 
      minute: "2-digit" 
    });

    const hours = Math.max(task.estimatedHours, 1);
    const numBlocks = Math.ceil(hours / 2);
    for (let i = 0; i < numBlocks; i++) {
      const blockStart = new Date(recStart.getTime() + i * 3 * 60 * 60 * 1000); // 3-hour intervals (2h block + 1h break/buffer)
      const blockEnd = new Date(blockStart.getTime() + 2 * 60 * 60 * 1000);
      
      const dayStr = blockStart.toLocaleDateString(undefined, { weekday: "short" });
      const startStr = blockStart.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      const endStr = blockEnd.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      
      let blockDescription = "";
      if (i === 0) blockDescription = "Research, outline core requirements, and initial setup";
      else if (i === numBlocks - 1) blockDescription = "Polishing, testing, and final deadline validation";
      else if (i === 1) blockDescription = "Core development, draft content, and heavy execution";
      else blockDescription = "Refinement, integration, and address edge cases";

      schedule.push(`${dayStr} ${startStr} - ${endStr}: ${blockDescription}`);
      if (i < numBlocks - 1) {
        schedule.push(`${dayStr} Break: Stretch, rest eyes, and drink water`);
      }
    }

    // 3. Subtasks
    const subtaskTexts = task.subtasks.length > 0 
      ? task.subtasks.map(s => s.text)
      : [
          "Phase 1: Research, resource gathering, and requirements outline",
          "Phase 2: Establish the core architecture and skeleton implementation",
          "Phase 3: Deep work session for primary execution and feature building",
          "Phase 4: Integrity check, debugging, and polishing details",
          "Phase 5: Final run-through against deadline parameters and submission"
        ];

    // 4. Risk level and explanation
    const effortRatio = task.estimatedHours / hoursRemaining;
    let risk_percentage = "10%";
    let risk_level: "Low" | "Medium" | "High" = "Low";
    let risk_reason = "";
    let mitigation = "";

    if (effortRatio > 0.8 || hoursRemaining < task.estimatedHours) {
      risk_percentage = `${Math.min(Math.round(effortRatio * 100), 99)}%`;
      risk_level = "High";
      risk_reason = `High delay risk because estimated effort (${task.estimatedHours}h) is very close to or exceeds total remaining time (${Math.round(hoursRemaining)}h).`;
      mitigation = "De-scope immediately. Focus on an MVP, eliminate secondary features, and work in uninterrupted 50-minute blocks.";
    } else if (effortRatio > 0.4 || hoursRemaining < 48) {
      risk_percentage = `${Math.min(Math.round(effortRatio * 100), 75)}%`;
      risk_level = "Medium";
      risk_reason = `Moderate risk due to substantial task weight relative to remaining window. Buffer is limited.`;
      mitigation = "Front-load the hardest sections of the task. Keep track of hourly milestones and avoid distractions.";
    } else {
      risk_percentage = `${Math.max(Math.min(Math.round(effortRatio * 100), 30), 5)}%`;
      risk_level = "Low";
      risk_reason = `Low risk with an ample timeline buffer of ${Math.round(hoursRemaining)} hours against ${task.estimatedHours} estimated hours.`;
      mitigation = "Maintain standard progress pace. Review the subtask checklist daily and keep a reliable schedule.";
    }

    // 5. Progress summary and next action
    const completedCount = task.subtasks.filter(s => s.completed).length;
    const totalSubtasks = task.subtasks.length;
    const progress_summary = totalSubtasks > 0 
      ? `${completedCount} of ${totalSubtasks} subtasks completed. Local backup analysis active.`
      : "No subtasks completed yet. Task initialized with a fallback local schedule.";

    const next_action = subtaskTexts.length > 0 
      ? `Start immediately on: "${subtaskTexts[0]}"`
      : "Initiate Phase 1 preparation block.";

    // 6. Rescue mode activation
    const completedRatio = totalSubtasks > 0 ? completedCount / totalSubtasks : 0;
    const rescueActivated = hoursRemaining < 24 && completedRatio < 0.5;
    const emergency_plan = rescueActivated 
      ? [
          "Emergency MVP protocol: cut all nice-to-have features immediately.",
          "Establish a single-threaded workflow with absolute focus.",
          "Work in 25-minute Pomodoro sprints with 5-minute active recovery breaks.",
          "Prioritize final functional delivery over perfect design/details."
        ]
      : [];

    return {
      priority_level,
      priority_reason,
      recommended_start_time: recStartStr,
      schedule,
      subtasks: subtaskTexts,
      risk_percentage,
      risk_level,
      risk_reason,
      mitigation,
      progress_summary,
      next_action,
      rescue_mode: {
        activated: rescueActivated,
        emergency_plan
      }
    };
  };

  // Run or re-run Gemini analysis for a task with automatic retries and rule-based fallback
  const runAnalysis = async (taskId: string, currentTasks: Task[]) => {
    const taskIndex = currentTasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return;

    const taskToAnalyze = currentTasks[taskIndex];

    // Mark as analyzing
    const analyzingTasks = [...currentTasks];
    analyzingTasks[taskIndex] = {
      ...taskToAnalyze,
      isAnalyzing: true,
      error: null,
    };
    saveTasks(analyzingTasks);

    const backoffs = [2000, 4000, 8000, 16000, 32000];
    let attempt = 0;
    let success = false;
    let lastErrorMsg = "";
    let analysisResult: AIAnalysis | null = null;

    while (attempt < 5 && !success) {
      try {
        if (attempt > 0) {
          console.log(`[Deadline Guardian] Retry attempt ${attempt}/5...`);
          const retryingTasks = [...currentTasks];
          retryingTasks[taskIndex] = {
            ...taskToAnalyze,
            isAnalyzing: true,
            error: `AI analysis is temporarily busy. Retrying... (Attempt ${attempt}/5)`,
          };
          saveTasks(retryingTasks);
        }

        const response = await fetch("/api/analyze-task", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskName: taskToAnalyze.name,
            taskDescription: taskToAnalyze.description,
            deadline: taskToAnalyze.deadline,
            estimatedHours: taskToAnalyze.estimatedHours,
            priority: taskToAnalyze.priority,
            currentLocalTime: new Date().toISOString(),
            subtasks: taskToAnalyze.subtasks.map((s) => ({ text: s.text, completed: s.completed })),
          }),
        });

        if (!response.ok) {
          let errText = "Server failed to analyze task.";
          let isJson = false;
          try {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const errData = await response.json();
              errText = errData.error || errText;
              isJson = true;
            }
          } catch (jsonErr) {
            // Fallback to text reading
          }

          if (!isJson) {
            try {
              const text = await response.text();
              if (text && !text.includes("<!doctype") && !text.includes("<html") && text.length < 500) {
                errText = text;
              } else {
                errText = `Server error (${response.status} ${response.statusText || "Unavailable"})`;
              }
            } catch (txtErr) {
              errText = `Server error (${response.status})`;
            }
          }
          
          const isTransient = response.status === 503 || response.status === 429 || response.status === 502 || response.status === 504 ||
            errText.toUpperCase().includes("503") || errText.toUpperCase().includes("429") ||
            errText.toUpperCase().includes("UNAVAILABLE") || errText.toUpperCase().includes("OVERLOADED") ||
            errText.toUpperCase().includes("BUSY") || errText.toUpperCase().includes("LIMIT") ||
            errText.toUpperCase().includes("QUOTA");

          if (isTransient) {
            lastErrorMsg = errText;
            attempt++;
            if (attempt < 5) {
              const delay = backoffs[attempt - 1];
              console.warn(`Transient error encountered: ${errText}. Retrying in ${delay}ms...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            } else {
              throw new Error(errText);
            }
          } else {
            throw new Error(errText);
          }
        }

        analysisResult = await response.json();
        success = true;
      } catch (err: any) {
        console.error("Analysis attempt failed:", err);
        lastErrorMsg = err.message || "Failed to contact analysis server.";
        
        // Treat JSON syntax errors or non-JSON errors on error responses as potentially retryable if status is known or it looks like a proxy failure
        const isNetworkOrProxyErr = 
          err.message?.includes("fetch") || 
          err.message?.includes("NetworkError") || 
          err.message?.includes("Failed to fetch") ||
          err.message?.includes("Unexpected token") || // JSON parsing of non-ok HTML responses
          err.message?.includes("not valid JSON");

        if (isNetworkOrProxyErr && attempt < 5) {
          attempt++;
          const delay = backoffs[attempt - 1];
          console.warn(`Network/Proxy error (${err.message}). Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        break;
      }
    }

    if (success && analysisResult) {
      const completedTasks = [...currentTasks];
      const updatedSubtasks: Subtask[] = analysisResult.subtasks.map((stText, idx) => {
        const existing = taskToAnalyze.subtasks.find(
          (s) => s.text.toLowerCase().trim() === stText.toLowerCase().trim()
        );
        return {
          id: existing?.id || `subtask-${Date.now()}-${idx}`,
          text: stText,
          completed: existing ? existing.completed : false,
        };
      });

      completedTasks[taskIndex] = {
        ...taskToAnalyze,
        subtasks: updatedSubtasks,
        analysis: analysisResult,
        isAnalyzing: false,
        error: null,
      };
      saveTasks(completedTasks);
    } else {
      console.warn(`[Deadline Guardian] All retries exhausted. Generating local backup analysis. Error: ${lastErrorMsg}`);
      
      const fallbackResult = generateRuleBasedFallback(taskToAnalyze);
      const completedTasks = [...currentTasks];
      const updatedSubtasks: Subtask[] = fallbackResult.subtasks.map((stText, idx) => {
        const existing = taskToAnalyze.subtasks.find(
          (s) => s.text.toLowerCase().trim() === stText.toLowerCase().trim()
        );
        return {
          id: existing?.id || `subtask-${Date.now()}-${idx}`,
          text: stText,
          completed: existing ? existing.completed : false,
        };
      });

      completedTasks[taskIndex] = {
        ...taskToAnalyze,
        subtasks: updatedSubtasks,
        analysis: {
          ...fallbackResult,
          progress_summary: `${fallbackResult.progress_summary} (Offline Backup Mode)`,
        },
        isAnalyzing: false,
        error: null, // Clear error so fallback visual displays normally
      };
      saveTasks(completedTasks);
    }
  };

  // Add a brand new task
  const handleAddTask = (newTaskData: {
    name: string;
    description: string;
    deadline: string;
    estimatedHours: number;
    priority: PriorityType;
  }) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      name: newTaskData.name,
      description: newTaskData.description,
      deadline: newTaskData.deadline,
      estimatedHours: newTaskData.estimatedHours,
      priority: newTaskData.priority,
      createdAt: new Date().toISOString(),
      subtasks: [],
      analysis: null,
      isAnalyzing: false,
      error: null,
    };

    const updated = [newTask, ...tasks];
    saveTasks(updated);
    selectTask(newTask.id);
    setActiveTab("analysis"); // Swivel tab on mobile for instant visibility of report

    // Run AI analysis
    runAnalysis(newTask.id, updated);
  };

  // Delete task
  const handleDeleteTask = (taskId: string) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    saveTasks(updated);
    if (selectedTaskId === taskId) {
      const nextSelected = updated.length > 0 ? updated[0].id : null;
      selectTask(nextSelected);
      if (!nextSelected) {
        setActiveTab("list");
      }
    }
  };

  // Toggle subtask status
  const handleToggleSubtask = async (subtaskId: string) => {
    if (!selectedTask) return;

    const updatedSubtasks = selectedTask.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );

    const updatedTask = {
      ...selectedTask,
      subtasks: updatedSubtasks,
    };

    const updatedTasks = tasks.map((t) => (t.id === selectedTask.id ? updatedTask : t));
    saveTasks(updatedTasks);

    // Auto trigger recalculation with Gemini to adapt priorities, risks, schedules, and Rescue Mode live!
    runAnalysis(selectedTask.id, updatedTasks);
  };

  // Add custom subtask manually
  const handleAddCustomSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newSubtaskText.trim()) return;

    const newSub: Subtask = {
      id: `subtask-${Date.now()}`,
      text: newSubtaskText.trim(),
      completed: false,
    };

    const updatedTask = {
      ...selectedTask,
      subtasks: [...selectedTask.subtasks, newSub],
    };

    const updatedTasks = tasks.map((t) => (t.id === selectedTask.id ? updatedTask : t));
    saveTasks(updatedTasks);
    setNewSubtaskText("");

    // Recalculate analysis
    runAnalysis(selectedTask.id, updatedTasks);
  };

  // Delete a subtask
  const handleDeleteSubtask = (subtaskId: string) => {
    if (!selectedTask) return;

    const updatedSubtasks = selectedTask.subtasks.filter((s) => s.id !== subtaskId);
    const updatedTask = {
      ...selectedTask,
      subtasks: updatedSubtasks,
    };

    const updatedTasks = tasks.map((t) => (t.id === selectedTask.id ? updatedTask : t));
    saveTasks(updatedTasks);

    // Recalculate analysis
    runAnalysis(selectedTask.id, updatedTasks);
  };

  // Helper metrics for overall dashboard stats
  const totalTasks = tasks.length;
  const completedTasksCount = tasks.filter((t) => {
    const totalSub = t.subtasks.length;
    if (totalSub === 0) return false;
    const completedSub = t.subtasks.filter((s) => s.completed).length;
    return completedSub === totalSub;
  }).length;
  const pendingTasksCount = totalTasks - completedTasksCount;

  // Calculate Average Completion Rate
  const totalCompletionRates = tasks.map((t) => {
    const totalSub = t.subtasks.length;
    if (totalSub === 0) return 0;
    const completedSub = t.subtasks.filter((s) => s.completed).length;
    return (completedSub / totalSub) * 100;
  });
  const avgCompletionRate = totalTasks > 0
    ? Math.round(totalCompletionRates.reduce((sum, rate) => sum + rate, 0) / totalTasks)
    : 0;

  return (
    <div className={`min-h-screen ${isDarkMode ? "dark bg-[#0F172A] text-[#F8FAFC]" : "bg-slate-50/50 text-slate-800"} font-sans antialiased pb-12 transition-colors duration-300`}>
      {/* Upper Brand Nav */}
      <header className={`${isDarkMode ? "bg-[#1E293B]/85 border-[#475569] shadow-black/40" : "bg-white/85 border-slate-100 shadow-xs"} backdrop-blur-md border-b sticky top-0 z-30 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-200 dark:shadow-none">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className={`text-base font-display font-black tracking-tight flex items-center gap-2 ${isDarkMode ? "text-white" : "text-slate-950"}`}>
                AI Deadline Guardian
              </h1>
              <p className="text-[9px] text-slate-500 font-mono tracking-widest font-bold">TASK SHIELD & MITIGATION ENGINE</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              title="Toggle Theme"
              className={`p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer border ${
                isDarkMode
                  ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-yellow-400"
                  : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600 shadow-2xs"
              }`}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Smart Notifications */}
            <SmartNotifications tasks={tasks} isDarkMode={isDarkMode} />

            {/* Activate Rescue Mode Button */}
            <button
              onClick={() => setIsRescueModeOpen(true)}
              className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
            >
              <Flame className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
              <span className="hidden lg:inline">Activate Rescue Mode</span>
              <span className="lg:hidden">Rescue</span>
            </button>

            <button
              onClick={() => setViewMode("shield")}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border ${
                viewMode === "shield"
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none"
                  : isDarkMode
                  ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Shield Control</span>
              <span className="sm:hidden">Shield</span>
            </button>
            <button
              onClick={() => setViewMode("analytics")}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border ${
                viewMode === "analytics"
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none"
                  : isDarkMode
                  ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Productivity Analytics</span>
              <span className="sm:hidden">Analytics</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Smart Daily Briefing Banner */}
        <DailyBriefingCard tasks={tasks} userName="Amish" isDarkMode={isDarkMode} />

        {/* Global Statistics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-shadow"
          >
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tasks</div>
              <div className="text-2xl font-black text-slate-900 font-display mt-0.5">{totalTasks}</div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-shadow"
          >
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed</div>
              <div className="text-2xl font-black text-emerald-600 font-display mt-0.5">{completedTasksCount}</div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-shadow"
          >
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending</div>
              <div className="text-2xl font-black text-amber-600 font-display mt-0.5">{pendingTasksCount}</div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-shadow"
          >
            <div className="p-3 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Progress</div>
              <div className="text-2xl font-black text-indigo-600 font-display mt-0.5">{avgCompletionRate}%</div>
            </div>
          </motion.div>
        </div>

        {viewMode === "analytics" ? (
          <DashboardAnalytics
            tasks={tasks}
            onSelectTask={(id) => {
              selectTask(id);
              setViewMode("shield");
              setActiveTab("analysis");
            }}
          />
        ) : (
          <>
            {/* Mobile Tab segmented control */}
            <div className="flex p-1 bg-slate-100 rounded-2xl mb-6 lg:hidden">
              <button
                onClick={() => setActiveTab("list")}
                className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "list"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <ListTodo className="w-4 h-4" />
                Tasks Overview ({tasks.length})
              </button>
              <button
                disabled={!selectedTask}
                onClick={() => selectedTask && setActiveTab("analysis")}
                className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 ${
                  activeTab === "analysis"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                AI Guard Report
              </button>
            </div>

            {/* Split Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Panel: Task Creation & Tasks Selection (4 Columns) */}
              <div className={`lg:col-span-4 space-y-6 ${activeTab === "list" ? "block" : "hidden lg:block"}`}>
                <TaskForm onSubmit={handleAddTask} />

                {/* Shielded Tasks List */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <h3 className="text-[10px] font-mono font-black text-slate-400 tracking-widest uppercase mb-4 flex items-center justify-between">
                    <span>Shielded Tasks ({tasks.length})</span>
                    <ListTodo className="w-4 h-4 text-slate-400" />
                  </h3>

                  {tasks.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50 p-6">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <Shield className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">No tasks guarded</p>
                      <p className="text-[11px] text-slate-400/80 mt-1 leading-normal">
                        Create a task using the configuration wizard above to synthesize AI support logs.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                      <AnimatePresence initial={false}>
                        {tasks.map((t) => (
                          <TaskListItem
                            key={t.id}
                            task={t}
                            isSelected={selectedTaskId === t.id}
                            onSelect={() => {
                              selectTask(t.id);
                              setActiveTab("analysis"); // Instantly focus report on mobile
                            }}
                            onDelete={() => handleDeleteTask(t.id)}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Detailed AI analysis and interactive execution state (8 Columns) */}
              <div className={`lg:col-span-8 ${activeTab === "analysis" ? "block" : "hidden lg:block"}`}>
                {selectedTask ? (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedTask.id + "-" + selectedTask.isAnalyzing}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="space-y-6"
                    >
                      {/* Header overview of Selected Task */}
                      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col sm:flex-row justify-between gap-4 items-start relative overflow-hidden">
                        <div className="absolute top-0 left-0 h-1.5 w-full bg-indigo-600" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-md font-mono font-black tracking-widest uppercase">
                              ACTIVE PROTECTION
                            </span>
                            <span className="text-[11px] text-slate-400 font-semibold">
                              Created {new Date(selectedTask.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          <h2 className="text-xl font-display font-black text-slate-950 tracking-tight leading-snug">{selectedTask.name}</h2>
                          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                            {selectedTask.description || "No description provided."}
                          </p>
                        </div>

                        <div className="shrink-0 flex flex-col gap-3 text-right self-stretch justify-between items-end">
                          <button
                            id="btn-re-analyze"
                            disabled={selectedTask.isAnalyzing}
                            onClick={() => runAnalysis(selectedTask.id, tasks)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 bg-indigo-50/80 hover:bg-indigo-100 px-3 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${selectedTask.isAnalyzing ? "animate-spin" : ""}`} />
                            {selectedTask.isAnalyzing ? "Syncing..." : "Re-Analyze Plan"}
                          </button>

                          <div className="flex gap-4 text-xs font-mono text-slate-500 text-left bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <div>
                              <div className="text-[9px] text-slate-400 uppercase font-sans font-black tracking-wider">Deadline</div>
                              <div className="font-bold text-slate-800 text-[11px] mt-0.5">
                                {new Date(selectedTask.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at{" "}
                                {new Date(selectedTask.deadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </div>
                            <div className="border-l border-slate-200 pl-4">
                              <div className="text-[9px] text-slate-400 uppercase font-sans font-black tracking-wider">Work Weight</div>
                              <div className="font-bold text-slate-800 text-[11px] mt-0.5">{selectedTask.estimatedHours} Hours</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Analysis Loading State */}
                      {selectedTask.isAnalyzing && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 text-center shadow-sm flex flex-col justify-center min-h-[400px] relative overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                          <style>{`
                            @keyframes shimmer {
                              100% { transform: translateX(100%); }
                            }
                          `}</style>
                          
                          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-5 mx-auto animate-bounce">
                            <Shield className="w-7 h-7" />
                          </div>
                          <h3 className="text-base font-display font-bold text-slate-900">Guardian Core Securing Task...</h3>
                          {selectedTask.error ? (
                            <div className="mt-3 px-4 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl animate-pulse max-w-sm mx-auto">
                              <p className="text-xs text-indigo-700 font-bold font-mono">
                                {selectedTask.error}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                              Gemini is formulating task steps, workload buffers, and escape-route timelines for active protection...
                            </p>
                          )}

                          {/* Simulated loader columns */}
                          <div className="mt-8 space-y-4 max-w-md mx-auto w-full">
                            <div className="flex gap-4">
                              <div className="h-16 bg-slate-100/70 rounded-xl flex-1 animate-pulse" />
                              <div className="h-16 bg-slate-100/70 rounded-xl flex-1 animate-pulse" />
                            </div>
                            <div className="h-20 bg-slate-100/70 rounded-xl w-full animate-pulse" />
                            <div className="h-24 bg-slate-100/70 rounded-xl w-full animate-pulse" />
                          </div>
                        </motion.div>
                      )}

                      {/* Analysis Error State */}
                      {!selectedTask.isAnalyzing && selectedTask.error && (
                        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6 text-center shadow-sm">
                          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3 animate-bounce" />
                          <h3 className="text-sm font-bold text-red-900">AI Guard Synthesis Blocked</h3>
                          <p className="text-xs text-red-700/80 mt-1.5 max-w-md mx-auto leading-relaxed">{selectedTask.error}</p>
                          <button
                            onClick={() => runAnalysis(selectedTask.id, tasks)}
                            className="mt-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-red-100"
                          >
                            Retry Active Assessment
                          </button>
                        </div>
                      )}

                      {/* AI REPORT DATA SUMMARY */}
                      {!selectedTask.isAnalyzing && !selectedTask.error && selectedTask.analysis && (
                        <div className="space-y-6">
                          {/* EMERGENCY RESCUE MODE - Show conspicuously at top of the analysis if activated */}
                          {selectedTask.analysis.rescue_mode?.activated && (
                            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 shadow-sm relative overflow-hidden glow-pulse">
                              <div className="absolute top-0 left-0 h-1.5 w-full bg-rose-600" />
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-rose-100 rounded-xl text-rose-700 shrink-0 mt-0.5 animate-bounce">
                                  <Flame className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <h3 className="text-xs font-mono font-black text-rose-900 tracking-wider uppercase">
                                      ⚠️ EMERGENCY ESCAPE PROTOCOL ACTIVE ⚠️
                                    </h3>
                                    <span className="text-[9px] bg-rose-100 border border-rose-200 text-rose-800 px-2.5 py-0.5 rounded-md font-mono font-black tracking-widest">
                                      CRITICAL TIMELINE
                                    </span>
                                  </div>
                                  <p className="text-xs text-rose-700 mt-1.5 leading-relaxed font-medium">
                                    The task deadline is less than 24 hours away and completions remain low. Apply the strategic fallback directives immediately to secure the submission.
                                  </p>

                                  {/* Rescue Plan List */}
                                  <div className="mt-4 space-y-2 bg-white/80 rounded-xl p-4 border border-rose-100 text-xs shadow-xs">
                                    <div className="font-bold text-rose-900 mb-1.5 flex items-center gap-1.5">
                                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                                      AI Formulated Emergency Milestones
                                    </div>
                                    <ul className="space-y-2 text-rose-800">
                                      {selectedTask.analysis.rescue_mode.emergency_plan.map((planStep, idx) => (
                                        <li key={idx} className="leading-relaxed flex items-start gap-2 font-medium">
                                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                                          <span>{planStep}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* TWO COLUMN BENTO STATS: 1. Priority and 2. Risk Calculation */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Priority Bento Block */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative hover:border-slate-200 transition-colors">
                              <div className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest mb-3">
                                1. Prioritization Assessment
                              </div>
                              <div className="flex items-center gap-2 mb-2.5">
                                <span
                                  className={`text-[10px] px-2.5 py-1 rounded-md font-mono font-black tracking-wider uppercase border ${
                                    selectedTask.analysis.priority_level === "Critical"
                                      ? "text-red-700 bg-red-50 border-red-200"
                                      : selectedTask.analysis.priority_level === "High"
                                      ? "text-rose-600 bg-rose-50 border-rose-100"
                                      : selectedTask.analysis.priority_level === "Medium"
                                      ? "text-amber-700 bg-amber-50 border-amber-100"
                                      : "text-blue-700 bg-blue-50 border-blue-100"
                                  }`}
                                >
                                  {selectedTask.analysis.priority_level} Priority
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                {selectedTask.analysis.priority_reason}
                              </p>
                              <div className="mt-4 pt-3.5 border-t border-slate-50 text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>Recommended start: <strong className="text-slate-700 font-sans font-bold">{selectedTask.analysis.recommended_start_time}</strong></span>
                              </div>
                            </div>

                            {/* Risk Level Bento Block */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-slate-200 transition-colors">
                              <div className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest mb-3">
                                2. Delay Risk Prediction
                              </div>
                              <div className="flex items-center justify-between mb-2.5">
                                <span
                                  className={`text-[10px] px-2.5 py-1 rounded-md font-mono font-black tracking-wider uppercase border ${
                                    selectedTask.analysis.risk_level === "High"
                                      ? "text-rose-700 bg-rose-50 border-rose-200"
                                      : selectedTask.analysis.risk_level === "Medium"
                                      ? "text-amber-700 bg-amber-50 border-amber-100"
                                      : "text-emerald-700 bg-emerald-50 border-emerald-100"
                                  }`}
                                >
                                  {selectedTask.analysis.risk_level} Risk
                                </span>
                                <span className="text-xs font-mono font-black text-slate-800 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                                  {selectedTask.analysis.risk_percentage} Prob.
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed font-medium mb-3.5">
                                {selectedTask.analysis.risk_reason}
                              </p>
                              <div className="p-3 bg-indigo-50/50 rounded-xl text-xs text-indigo-950 border border-indigo-100/50 leading-relaxed font-medium">
                                <strong>Mitigation:</strong> {selectedTask.analysis.mitigation}
                              </div>
                            </div>
                          </div>

                          {/* SCHEDULE BLOCK GENERATION */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-[9px] font-mono font-black text-slate-400 tracking-widest uppercase mb-3.5">
                              3. Suggested Focus Schedule
                            </div>
                            {selectedTask.analysis.schedule && selectedTask.analysis.schedule.length > 0 ? (
                              <div className="space-y-2">
                                {selectedTask.analysis.schedule.map((block, i) => (
                                  <div
                                    key={i}
                                    className="text-xs py-2.5 px-3.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 flex items-start gap-3 hover:bg-slate-100/50 transition-colors"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5 shadow-sm shadow-indigo-300" />
                                    <span className="leading-relaxed font-medium">{block}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-slate-500 italic p-2">No focus timeline is generated.</div>
                            )}
                          </div>

                          {/* INTERACTIVE SUBTASK LIST WITH DYNAMIC RE-EVALUATION */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                              <div>
                                <h3 className="text-[9px] font-mono font-black text-slate-400 tracking-widest uppercase">
                                  4. Actionable Deliverables Checklist
                                </h3>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                  Toggling subtasks triggers immediate recalculation of timeline margins and delays.
                                </p>
                              </div>
                              <span className="text-[11px] font-mono bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-md font-bold">
                                {selectedTask.subtasks.filter((s) => s.completed).length}/{selectedTask.subtasks.length} SECURED
                              </span>
                            </div>

                            {/* Subtask list */}
                            <div className="space-y-2 mb-4">
                              <AnimatePresence initial={false}>
                                {selectedTask.subtasks.map((sub, idx) => (
                                  <motion.div
                                    key={sub.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border text-xs transition-all duration-150 ${
                                      sub.completed
                                        ? "bg-emerald-50/30 border-emerald-100/70 text-slate-500 line-through decoration-slate-300"
                                        : "bg-white border-slate-100 text-slate-800 hover:border-slate-200"
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSubtask(sub.id)}
                                      className="text-left flex items-start gap-3 flex-1 cursor-pointer group"
                                    >
                                      {/* Custom Animated Checkbox */}
                                      <div className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                                        sub.completed
                                          ? "bg-emerald-600 border-emerald-600 text-white"
                                          : "bg-white border-slate-200 group-hover:border-indigo-400"
                                      }`}>
                                        {sub.completed && (
                                          <motion.svg
                                            initial={{ scale: 0, pathLength: 0 }}
                                            animate={{ scale: 1, pathLength: 1 }}
                                            transition={{ duration: 0.18 }}
                                            className="w-3 h-3"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                          >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                          </motion.svg>
                                        )}
                                      </div>
                                      <span className="leading-relaxed font-bold">{sub.text}</span>
                                    </button>
                                    
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSubtask(sub.id)}
                                      className="text-slate-300 hover:text-red-500 p-1 rounded-md transition-colors font-bold text-sm shrink-0"
                                      title="Remove subtask"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </motion.div>
                                ))}
                              </AnimatePresence>
                            </div>

                            {/* Custom subtask manual input */}
                            <form onSubmit={handleAddCustomSubtask} className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Inject your own subtask milestone..."
                                value={newSubtaskText}
                                onChange={(e) => setNewSubtaskText(e.target.value)}
                                className="flex-1 text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-900 bg-white transition-all"
                              />
                              <button
                                type="submit"
                                className="bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Inject
                              </button>
                            </form>
                          </div>

                          {/* 5. DAILY PROGRESS TRACKING & PRODUCTIVITY INSIGHTS */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-[9px] font-mono font-black text-slate-400 tracking-widest uppercase mb-3.5">
                              5. Performance Summary & Guardian Insight
                            </div>
                            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-3.5">
                              <div className="flex justify-between items-start gap-4 text-xs flex-col sm:flex-row">
                                <span className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">Real-time Status:</span>
                                <span className="font-bold text-indigo-700 text-xs">
                                  {selectedTask.analysis.progress_summary}
                                </span>
                              </div>

                              {/* Insights Quote from AI */}
                              <div className="flex gap-3 p-3.5 bg-white rounded-xl border border-slate-100">
                                <div className="p-1 bg-amber-50 text-amber-500 rounded-lg shrink-0 h-fit">
                                  <Lightbulb className="w-4 h-4" />
                                </div>
                                <div className="text-xs text-slate-700 leading-relaxed font-medium italic">
                                  "{selectedTask.analysis.next_action}"
                                </div>
                              </div>

                              <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 pt-1">
                                <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Progress state updates live as tasks are secured.</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Initial analysis helper prompt when task was added but not evaluated yet */}
                      {!selectedTask.isAnalyzing && !selectedTask.analysis && !selectedTask.error && (
                        <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center shadow-sm max-w-lg mx-auto">
                          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                            <Shield className="w-7 h-7" />
                          </div>
                          <h3 className="text-sm font-display font-bold text-slate-900 uppercase tracking-wide">Shielding Inactive</h3>
                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-sm mx-auto">
                            We have synthesized the container envelope for this task, but have not calculated delay predictions yet. Run active assessment to populate plans.
                          </p>
                          <button
                            onClick={() => runAnalysis(selectedTask.id, tasks)}
                            className="mt-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-3 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-100"
                          >
                            Request Active Assessment
                          </button>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[480px]">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                      <Shield className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-base font-display font-extrabold text-slate-950">No Active Target Selected</h3>
                    <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-normal">
                      Select a task from the list or create a new shielded task to assess delay projections, timelines, and rescue plans.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* AI Task Assistant Floating Overlay */}
        <AITaskAssistant
          tasks={tasks}
          pace={4}
          isDarkMode={isDarkMode}
          onQuickActionTrigger={(action) => {
            if (action === "Activate Rescue Mode") {
              setIsRescueModeOpen(true);
            }
          }}
        />

        {/* Emergency Rescue Mode Modal */}
        <RescueModeModal
          isOpen={isRescueModeOpen}
          onClose={() => setIsRescueModeOpen(false)}
          tasks={tasks}
          pace={4}
          isDarkMode={isDarkMode}
        />
      </main>
    </div>
  );
}
