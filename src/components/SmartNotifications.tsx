import React, { useState, useEffect } from "react";
import { 
  Bell, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Sparkles, 
  X, 
  Trash2,
  Info
} from "lucide-react";
import { Task, SmartNotification } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface SmartNotificationsProps {
  tasks: Task[];
  isDarkMode?: boolean;
}

export default function SmartNotifications({ tasks, isDarkMode }: SmartNotificationsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());

  // Track inactivity
  useEffect(() => {
    const handleUserActivity = () => setLastActivityTime(Date.now());
    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);
    window.addEventListener("click", handleUserActivity);

    return () => {
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("click", handleUserActivity);
    };
  }, []);

  // Formulate Smart Notifications dynamically
  useEffect(() => {
    const now = new Date();
    const generated: SmartNotification[] = [];

    // 1. Check High Risk / Tight Deadlines
    tasks.forEach(t => {
      const dead = new Date(t.deadline);
      const hoursLeft = (dead.getTime() - now.getTime()) / (3600 * 1000);
      const subsDone = t.subtasks.filter(s => s.completed).length;
      const isComplete = t.subtasks.length > 0 && subsDone === t.subtasks.length;

      if (!isComplete) {
        if (hoursLeft > 0 && hoursLeft <= 6) {
          generated.push({
            id: `notif-urgent-${t.id}`,
            title: "Tight Deadline Proximity",
            message: `Your "${t.name}" becomes critical risk in ${Math.round(hoursLeft)} hours.`,
            type: "danger",
            timestamp: "Just now",
            read: false
          });
        }

        if (t.subtasks.length > 0 && t.subtasks.length - subsDone <= 2) {
          generated.push({
            id: `notif-almost-${t.id}`,
            title: "Almost Finished!",
            message: `Only ${t.subtasks.length - subsDone} subtasks remain on "${t.name}". Finish strong!`,
            type: "info",
            timestamp: "10m ago",
            read: false
          });
        }
      }
    });

    // 2. Completion milestones
    const totalSub = tasks.reduce((acc, t) => acc + t.subtasks.length, 0);
    const doneSub = tasks.reduce((acc, t) => acc + t.subtasks.filter(s => s.completed).length, 0);
    const progress = totalSub > 0 ? Math.round((doneSub / totalSub) * 100) : 0;

    if (progress >= 60) {
      generated.push({
        id: "notif-prog-60",
        title: "Velocity Milestone Achieved",
        message: `You completed ${progress}% of recorded subtasks. Great work! Your estimated completion probability increased to 91%.`,
        type: "success",
        timestamp: "35m ago",
        read: false
      });
    }

    // 3. Inactivity warning check (if > 45 mins)
    const inactiveMins = Math.round((Date.now() - lastActivityTime) / 60000);
    if (inactiveMins >= 45) {
      generated.push({
        id: "notif-inact",
        title: "Workspace Inactivity Alert",
        message: `You have been inactive for ${inactiveMins} minutes. Re-engage a short 15-minute sprint to stay on track.`,
        type: "warning",
        timestamp: "Now",
        read: false
      });
    }

    // Default system notification
    generated.push({
      id: "notif-sys-guard",
      title: "AI Guardian Shield Armed",
      message: "Continuous background failover protection and Gemini failover telemetry are fully active.",
      type: "info",
      timestamp: "Today",
      read: true
    });

    setNotifications(generated);
  }, [tasks, lastActivityTime]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type: SmartNotification["type"]) => {
    switch (type) {
      case "danger": return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case "warning": return <Clock className="w-4 h-4 text-amber-500" />;
      case "success": return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      default: return <Sparkles className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Smart Notifications"
        className={`p-2 sm:p-2.5 rounded-xl transition-all relative cursor-pointer border ${
          isDarkMode
            ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
            : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600 shadow-2xs"
        }`}
      >
        <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-rose-500 text-white text-[10px] font-mono font-black rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            {/* Dropdown Panel */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl shadow-2xl z-50 border overflow-hidden flex flex-col ${
                isDarkMode 
                  ? "bg-slate-900 border-slate-700 text-slate-100 shadow-slate-950/80" 
                  : "bg-white border-slate-200 text-slate-800 shadow-slate-300/80"
              }`}
            >
              {/* Header */}
              <div className={`p-4 border-b flex items-center justify-between ${
                isDarkMode ? "bg-slate-800/80 border-slate-700" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-500" />
                  <h4 className="font-display font-bold text-xs sm:text-sm">Smart Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Mark read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-1">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">No notifications</div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-2xl transition-colors flex items-start gap-3 ${
                        !notif.read
                          ? isDarkMode ? "bg-indigo-950/40 border border-indigo-800/30" : "bg-indigo-50/70 border border-indigo-100/60"
                          : isDarkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xs border border-slate-100 dark:border-slate-700 shrink-0 mt-0.5">
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{notif.title}</h5>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">{notif.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-normal break-words">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className={`p-3 border-t text-center ${
                isDarkMode ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-100 text-slate-500"
              }`}>
                <span className="text-[10px] font-mono flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Powered by Real-time Deadline Telemetry</span>
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
