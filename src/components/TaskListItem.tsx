import React from "react";
import { Calendar, AlertTriangle, ShieldCheck, Flame, Clock, Trash2 } from "lucide-react";
import { Task } from "../types";
import { motion } from "motion/react";

interface TaskListItemProps {
  key?: React.Key;
  task: Task;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export default function TaskListItem({ task, isSelected, onSelect, onDelete }: TaskListItemProps) {
  const totalSubtasks = task.subtasks.length;
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  // Calculate relative time and risk level
  const now = new Date();
  const deadlineDate = new Date(task.deadline);
  const msRemaining = deadlineDate.getTime() - now.getTime();
  const hoursRemaining = msRemaining / (1000 * 60 * 60);

  let relativeTimeText = "";
  let urgencyClass = "text-slate-500 bg-slate-50 border-slate-100";
  let isOverdue = false;

  if (hoursRemaining < 0) {
    isOverdue = true;
    relativeTimeText = "Overdue!";
    urgencyClass = "text-rose-700 bg-rose-50 border-rose-100 animate-pulse";
  } else if (hoursRemaining < 24) {
    const hours = Math.floor(hoursRemaining);
    const mins = Math.floor((hoursRemaining - hours) * 60);
    relativeTimeText = `${hours}h ${mins}m left`;
    urgencyClass = "text-rose-600 bg-rose-50 border-rose-100 font-bold";
  } else if (hoursRemaining < 48) {
    relativeTimeText = "1 day left";
    urgencyClass = "text-amber-700 bg-amber-50 border-amber-100 font-medium";
  } else {
    const days = Math.floor(hoursRemaining / 24);
    relativeTimeText = `${days} days left`;
    urgencyClass = "text-indigo-700 bg-indigo-50 border-indigo-100 font-medium";
  }

  // Determine if Rescue Mode criteria is satisfied locally too for urgent warning
  const triggersRescue = hoursRemaining > 0 && hoursRemaining < 24 && progressPercent < 50;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={onSelect}
      className={`group relative p-4 rounded-2xl border-2 transition-all cursor-pointer ${
        isSelected
          ? "border-indigo-600 bg-indigo-50/20 shadow-md shadow-indigo-100/10"
          : "border-slate-100 bg-white hover:border-slate-300 hover:shadow-md hover:shadow-slate-100/30"
      }`}
    >
      {/* Active Selected Glow indicator */}
      {isSelected && (
        <span className="absolute top-0 bottom-0 left-0 w-1.5 bg-indigo-600 rounded-l-2xl" />
      )}

      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-bold text-slate-950 truncate transition-colors duration-150 ${
            isSelected ? "text-indigo-900" : "group-hover:text-indigo-600"
          }`}>
            {task.name}
          </h4>
          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
            {task.description || "No description provided."}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 cursor-pointer shrink-0"
          title="Delete task"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Urgency and Badges */}
      <div className="flex flex-wrap gap-1.5 items-center mb-3.5">
        {/* Time Remaining Badge */}
        <span className={`text-[10px] px-2.5 py-1 rounded-full border flex items-center gap-1 font-mono uppercase tracking-wider ${urgencyClass}`}>
          <Clock className="w-3 h-3" />
          {relativeTimeText}
        </span>

        {/* Priority Badge */}
        <span
          className={`text-[10px] px-2.5 py-1 rounded-full border font-mono uppercase tracking-wider font-bold ${
            task.priority === "High"
              ? "text-red-700 bg-red-50 border-red-100"
              : task.priority === "Medium"
              ? "text-amber-700 bg-amber-50 border-amber-100"
              : "text-blue-700 bg-blue-50 border-blue-100"
          }`}
        >
          {task.priority}
        </span>

        {/* Risk Badge */}
        <span
          className={`text-[10px] px-2.5 py-1 rounded-full border font-mono uppercase tracking-wider font-bold ${
            task.analysis
              ? task.analysis.risk_level === "High"
                ? "text-rose-700 bg-rose-50 border-rose-100 animate-pulse"
                : task.analysis.risk_level === "Medium"
                ? "text-amber-700 bg-amber-50 border-amber-100"
                : "text-emerald-700 bg-emerald-50 border-emerald-100"
              : "text-slate-500 bg-slate-50 border-slate-100"
          }`}
        >
          Risk: {task.analysis ? `${task.analysis.risk_level} (${task.analysis.risk_percentage})` : "WAIT..."}
        </span>

        {/* Rescue Warning */}
        {triggersRescue && (
          <span className="text-[10px] px-2.5 py-1 rounded-full border border-red-200 bg-red-50 text-red-600 font-bold animate-pulse flex items-center gap-1 uppercase tracking-wider font-mono">
            <Flame className="w-3 h-3 text-red-500" />
            RESCUE
          </span>
        )}

        {/* Finished / Perfect badge */}
        {progressPercent === 100 && (
          <span className="text-[10px] px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 font-bold flex items-center gap-1 uppercase tracking-wider font-mono">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            SECURE
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="pt-1.5 border-t border-slate-50">
        <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
          <span className="font-bold uppercase tracking-wider text-[9px] text-slate-400">Progress</span>
          <span className="font-mono font-bold text-slate-700">
            {completedSubtasks}/{totalSubtasks} ({progressPercent}%)
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressPercent === 100
                ? "bg-emerald-500"
                : triggersRescue
                ? "bg-rose-500"
                : "bg-indigo-600"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
}
