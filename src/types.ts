export type PriorityType = "Low" | "Medium" | "High";
export type PriorityLevelType = "Low" | "Medium" | "High" | "Critical";
export type RiskLevelType = "Low" | "Medium" | "High";

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface AIAnalysis {
  priority_level: PriorityLevelType;
  priority_reason: string;
  recommended_start_time: string;
  schedule: string[];
  subtasks: string[];
  risk_percentage: string;
  risk_level: RiskLevelType;
  risk_reason: string;
  mitigation: string;
  progress_summary: string;
  next_action: string;
  rescue_mode: {
    activated: boolean;
    emergency_plan: string[];
  };
}

export interface Task {
  id: string;
  name: string;
  description: string;
  deadline: string; // ISO format string
  estimatedHours: number;
  priority: PriorityType;
  createdAt: string;
  subtasks: Subtask[];
  analysis: AIAnalysis | null;
  isAnalyzing: boolean;
  error: string | null;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant" | "system";
  text: string;
  timestamp: string;
  quickActions?: string[];
  isError?: boolean;
}

export interface RescuePlan {
  remainingHours: number;
  successProbability: string;
  mustComplete: string[];
  maySkip: string[];
  workBlocks: { time: string; activity: string }[];
  estCompletionPercentage: number;
  expectedFinishTime: string;
  motivationMessage: string;
}

export interface DailyBriefingData {
  greeting: string;
  todayPriorities: string[];
  upcomingDeadlines: string[];
  completedYesterdayCount: number;
  hoursRemaining: number;
  biggestRiskToday: string;
  recommendedFocusBlock: string;
  productivityGoal: string;
}

export interface SmartNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "danger";
  timestamp: string;
  read: boolean;
}

