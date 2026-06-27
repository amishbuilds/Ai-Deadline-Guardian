import React, { useState } from "react";
import { Plus, Clock, Calendar, AlertCircle, Sparkles, X } from "lucide-react";
import { PriorityType } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface TaskFormProps {
  onSubmit: (task: {
    name: string;
    description: string;
    deadline: string;
    estimatedHours: number;
    priority: PriorityType;
  }) => void;
}

export default function TaskForm({ onSubmit }: TaskFormProps) {
  const getFutureDeadline = () => {
    // Default to 24 hours in the future
    return new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16);
  };

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState(getFutureDeadline);
  const [estimatedHours, setEstimatedHours] = useState<number | "">("");
  const [priority, setPriority] = useState<PriorityType>("Medium");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Task Name is required.");
      return;
    }
    if (!deadline) {
      setError("Deadline is required.");
      return;
    }

    const selectedDate = new Date(deadline);
    if (isNaN(selectedDate.getTime())) {
      setError("Please provide a valid deadline date and time.");
      return;
    }

    if (selectedDate <= new Date()) {
      setError("Deadline must be in the future!");
      return;
    }

    if (estimatedHours === "" || estimatedHours <= 0) {
      setError("Estimated hours must be greater than 0.");
      return;
    }

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      deadline: new Date(deadline).toISOString(),
      estimatedHours: Number(estimatedHours),
      priority,
    });

    // Reset Form
    setName("");
    setDescription("");
    setDeadline(getFutureDeadline());
    setEstimatedHours("");
    setPriority("Medium");
    setIsOpen(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-md shadow-slate-100/50 overflow-hidden mb-6 transition-all">
      <AnimatePresence initial={false} mode="wait">
        {!isOpen ? (
          <motion.button
            key="collapsed-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            id="btn-add-task-trigger"
            onClick={() => setIsOpen(true)}
            className="w-full px-5 py-4 flex items-center justify-between text-left text-sm font-semibold text-indigo-600 hover:bg-indigo-50/40 transition-colors cursor-pointer group"
          >
            <span className="flex items-center gap-2.5">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-110 transition-transform">
                <Plus className="w-4 h-4" />
              </span>
              Shield a New Deadline with AI
            </span>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-mono font-bold tracking-wider uppercase border border-indigo-100">
              AI Guarded
            </span>
          </motion.button>
        ) : (
          <motion.div
            key="expanded-form"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="p-5 border-t-2 border-indigo-600">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                <h3 className="text-sm font-display font-bold text-slate-900 flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                  Configure Task Protection
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setError("");
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Close form"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-red-50/70 border border-red-100 text-red-700 text-xs rounded-xl flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5 animate-bounce" />
                  <span className="font-medium">{error}</span>
                </motion.div>
              )}

              <div className="space-y-4 text-sm">
                {/* Task Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="task-name">
                    Task Name *
                  </label>
                  <input
                    id="task-name"
                    type="text"
                    placeholder="e.g. Finalize App Pitch Presentation"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-900 bg-white transition-all text-sm placeholder:text-slate-400"
                  />
                </div>

                {/* Task Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="task-description">
                    Description / Scope
                  </label>
                  <textarea
                    id="task-description"
                    rows={2}
                    placeholder="Details, key parameters, or subtask notes..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-900 bg-white resize-none transition-all text-sm placeholder:text-slate-400"
                  />
                </div>

                {/* Deadline & Estimated Hours */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="task-deadline">
                      Deadline *
                    </label>
                    <div className="relative">
                      <input
                        id="task-deadline"
                        type="datetime-local"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-900 bg-white transition-all text-sm"
                      />
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="task-hours">
                      Estimated Hours *
                    </label>
                    <div className="relative">
                      <input
                        id="task-hours"
                        type="number"
                        min="1"
                        placeholder="e.g. 5"
                        value={estimatedHours}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEstimatedHours(val === "" ? "" : Number(val));
                        }}
                        className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-900 bg-white transition-all text-sm"
                      />
                      <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Priority Selection */}
                <div>
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Priority Level
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Low", "Medium", "High"] as PriorityType[]).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setPriority(level)}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                          priority === level
                            ? level === "High"
                              ? "bg-red-50/80 border-red-500 text-red-700 shadow-sm shadow-red-50"
                              : level === "Medium"
                              ? "bg-amber-50/80 border-amber-500 text-amber-700 shadow-sm shadow-amber-50"
                              : "bg-blue-50/80 border-blue-500 text-blue-700 shadow-sm shadow-blue-50"
                            : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100 hover:border-slate-200"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <button
                  id="btn-add-task-submit"
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer mt-2 shadow-md shadow-indigo-100 hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Sparkles className="w-4 h-4 text-indigo-200 animate-pulse" />
                  Generate AI Guard Plan
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
