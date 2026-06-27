import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client lazily to avoid crashing if the key is missing on startup
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing. Please configure it in the Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API endpoint to analyze task
app.post("/api/analyze-task", async (req, res) => {
  try {
    const { taskName, taskDescription, deadline, estimatedHours, priority, currentLocalTime, subtasks } = req.body;

    if (!taskName || !deadline || !estimatedHours || !priority) {
      return res.status(400).json({ error: "Missing required fields: taskName, deadline, estimatedHours, and priority are required." });
    }

    const ai = getAiClient();

    // Prepare prompt
    const subtasksContext = subtasks && subtasks.length > 0
      ? `The user already has the following subtasks and progress:\n${subtasks.map((s: { text: string; completed: boolean }, i: number) => `${i + 1}. [${s.completed ? "COMPLETED" : "PENDING"}] ${s.text}`).join("\n")}\nAnalyze the progress based on these exact subtasks. Do NOT invent new subtasks; return the exact text of these existing subtasks in the "subtasks" array of the JSON response.`
      : "No subtasks exist yet. Create a fresh list of 4 to 8 actionable, sequentially ordered subtasks for this task.";

    const systemPrompt = `You are "AI Deadline Guardian", an AI-powered productivity companion. Your goal is to help users complete tasks before deadlines are missed.
Analyze the provided task inputs and return a structured JSON response.

Input parameters:
- Task Name: "${taskName}"
- Task Description: "${taskDescription || 'No description provided'}"
- Deadline: "${deadline}"
- Estimated Hours Required: ${estimatedHours} hours
- User-selected Priority: "${priority}"
- Current Local Time: "${currentLocalTime || new Date().toISOString()}"

Subtasks Context:
${subtasksContext}

Evaluation Actions:
1. TASK PRIORITIZATION: Analyze urgency, importance, deadline proximity, and workload. Return Priority Level ('Low', 'Medium', 'High', 'Critical') and Priority Reason.
2. SCHEDULE GENERATION: Create a realistic, highly specific time-block schedule (list of strings, e.g. ["Wednesday 10:00 AM - 12:00 PM: Draft requirements", "Wednesday 12:00 PM - 12:15 PM: Break"]) based on available time until deadline, estimated effort, and workload distribution. Give a recommended start time and list suggested breaks.
3. TASK BREAKDOWN: If subtasks were NOT provided, create a fresh list of 4-8 clear, measurable, sequentially ordered subtasks. If subtasks WERE provided, return their exact string texts in the "subtasks" array of the JSON.
4. DELAY RISK PREDICTION: Calculate Risk Percentage (0% to 100%) and Risk Level ('Low', 'Medium', 'High') based on remaining time, complexity, estimated hours, and user progress. Provide a clear Risk Reason and actionable Mitigation strategy.
5. DAILY PROGRESS TRACKING: Describe progress. Provide a summary (e.g., "1 of 5 subtasks completed"), dynamic productivity insights (how well the user is doing relative to the deadline and remaining effort), and the recommended next action.
6. RESCUE MODE: Trigger Rescue Mode when the deadline is less than 24 hours away AND progress is below 50% (either 0 subtasks completed when none exist, or <50% of existing subtasks completed). If activated, set rescue_mode.activated to true and generate a clear emergency action plan focusing on core MVP functionality, list what features/work can be postponed, and estimate the chance of successful completion. If not activated, set rescue_mode.activated to false and leave the emergency_plan empty.

Return a JSON object conforming EXACTLY to the following structure:
{
  "priority_level": "Low" | "Medium" | "High" | "Critical",
  "priority_reason": "string describing prioritization justification",
  "recommended_start_time": "string showing recommended date and time",
  "schedule": ["string 1", "string 2", ...],
  "subtasks": ["string 1", "string 2", ...],
  "risk_percentage": "string (e.g. '78%')",
  "risk_level": "Low" | "Medium" | "High",
  "risk_reason": "string explaining the risk score",
  "mitigation": "string containing mitigation advice",
  "progress_summary": "string summarising current progress",
  "next_action": "string recommending the immediate next action",
  "rescue_mode": {
    "activated": boolean,
    "emergency_plan": ["string 1", "string 2", ...]
  }
}`;

    let response;
    let attempt = 0;
    const maxAttempts = 4;
    const retryDelays = [2000, 4000, 6000];

    while (true) {
      // Try gemini-2.5-flash for the first two attempts, then fallback to the highly available gemini-3.5-flash
      const currentModel = attempt < 2 ? "gemini-2.5-flash" : "gemini-3.5-flash";
      try {
        console.log(`[Deadline Guardian Backend] Requesting Gemini analysis using model: ${currentModel} (Attempt: ${attempt + 1}/${maxAttempts})`);
        response = await ai.models.generateContent({
          model: currentModel,
          contents: systemPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                priority_level: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] },
                priority_reason: { type: Type.STRING },
                recommended_start_time: { type: Type.STRING },
                schedule: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                subtasks: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                risk_percentage: { type: Type.STRING },
                risk_level: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
                risk_reason: { type: Type.STRING },
                mitigation: { type: Type.STRING },
                progress_summary: { type: Type.STRING },
                next_action: { type: Type.STRING },
                rescue_mode: {
                  type: Type.OBJECT,
                  properties: {
                    activated: { type: Type.BOOLEAN },
                    emergency_plan: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ["activated", "emergency_plan"],
                },
              },
              required: [
                "priority_level",
                "priority_reason",
                "recommended_start_time",
                "schedule",
                "subtasks",
                "risk_percentage",
                "risk_level",
                "risk_reason",
                "mitigation",
                "progress_summary",
                "next_action",
                "rescue_mode",
              ],
            },
          },
        });
        break; // Success
      } catch (err: any) {
        const errMsg = err.message || "";
        attempt++;
        
        if (attempt < maxAttempts) {
          const delay = retryDelays[attempt - 1] || 2000;
          const nextModel = attempt < 2 ? "gemini-2.5-flash" : "gemini-3.5-flash";
          console.warn(`[Deadline Guardian Backend] Error with ${currentModel} (Attempt ${attempt}/${maxAttempts}). Retrying with ${nextModel} in ${delay}ms... Error: ${errMsg}`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          console.error(`[Deadline Guardian Backend] All attempts exhausted. Final error with ${currentModel}: ${errMsg}`);
          throw new Error("The AI analysis service is temporarily busy. We attempted multiple retry strategies across models (gemini-2.5-flash and gemini-3.5-flash) but the service remains unavailable. Please try again shortly.");
        }
      }
    }

    const dataText = response.text;
    if (!dataText) {
      throw new Error("No response from Gemini API");
    }

    const result = JSON.parse(dataText.trim());
    return res.json(result);
  } catch (error: any) {
    console.error("Analysis Error:", error);
    
    const errMsg = error.message || "";
    let statusCode = 500;
    
    if (
      errMsg.includes("503") || 
      errMsg.toUpperCase().includes("SERVICE_UNAVAILABLE") || 
      errMsg.toUpperCase().includes("UNAVAILABLE") || 
      errMsg.toLowerCase().includes("overloaded") || 
      errMsg.toLowerCase().includes("busy")
    ) {
      statusCode = 503;
    } else if (
      errMsg.includes("429") || 
      errMsg.toUpperCase().includes("RESOURCE_EXHAUSTED") || 
      errMsg.toLowerCase().includes("quota") || 
      errMsg.toLowerCase().includes("rate limit") || 
      errMsg.toLowerCase().includes("limit exceeded")
    ) {
      statusCode = 429;
    }

    return res.status(statusCode).json({ error: errMsg || "Failed to analyze task" });
  }
});

// API endpoint for AI Task Assistant Chat
app.post("/api/chat-assistant", async (req, res) => {
  try {
    const { userQuery, messages, projectState } = req.body;
    if (!userQuery) {
      return res.status(400).json({ error: "userQuery is required." });
    }

    const ai = getAiClient();

    const historyContext = messages && messages.length > 0
      ? `Recent Conversation History:\n${messages.slice(-6).map((m: any) => `${m.sender.toUpperCase()}: ${m.text}`).join("\n")}`
      : "No previous conversation.";

    const systemPrompt = `You are the "AI Task Assistant", an intelligent personal productivity coach and deadline strategist for AI Deadline Guardian.
Your goal is to coach the user, answer natural language questions about their workload, provide actionable study/work plans, keep them motivated, and help them beat procrastination.

Current User & Project State Summary:
- Total Tasks: ${projectState?.totalTasks || 0}
- Active Pace Assumption: ${projectState?.pace || 3} hrs/day
- Overall Progress: ${projectState?.progressPercent || 0}%
- Overdue Tasks: ${projectState?.overdueCount || 0}
- High Risk Tasks: ${projectState?.highRiskCount || 0}
- Task Details List:
${projectState?.taskList?.map((t: any) => `  * "${t.name}" | Priority: ${t.priority} | Deadline: ${t.deadline} | Effort: ${t.estimatedHours}h | Progress: ${t.progress}% | Risk: ${t.risk}`).join("\n") || "No tasks recorded yet."}

${historyContext}

Latest User Prompt: "${userQuery}"

Directives:
1. Understand the user's project state automatically. If they ask "What should I work on today?", prioritize overdue or high risk items due soon.
2. If they ask "Break this task into smaller subtasks", provide concrete actionable subtask bullet points.
3. If they say "I prefer studying at night" or similar personal preferences, acknowledge and remember it for future scheduling suggestions.
4. Keep tone encouraging, sharp, modern, and highly structured. Use bullet points where appropriate.
5. Suggest 3 to 6 relevant Quick Action buttons for the user to click next.

Return a JSON object conforming EXACTLY to this schema:
{
  "reply": "string containing your detailed coaching response (supports markdown)",
  "quickActions": ["Create Schedule", "Break into Subtasks", "Optimize Plan", "Activate Rescue Mode", "Export Report", "Explain Risk", "Mark Complete"]
}`;

    let response;
    let attempt = 0;
    const maxAttempts = 3;
    const retryDelays = [1500, 3000];

    while (true) {
      const currentModel = attempt < 1 ? "gemini-2.5-flash" : "gemini-3.5-flash";
      try {
        response = await ai.models.generateContent({
          model: currentModel,
          contents: systemPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: { type: Type.STRING },
                quickActions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["reply", "quickActions"]
            }
          }
        });
        break;
      } catch (err: any) {
        attempt++;
        if (attempt < maxAttempts) {
          const delay = retryDelays[attempt - 1] || 2000;
          await new Promise((r) => setTimeout(r, delay));
        } else {
          throw err;
        }
      }
    }

    const dataText = response.text;
    if (!dataText) throw new Error("No response from AI Assistant");
    return res.json(JSON.parse(dataText.trim()));
  } catch (error: any) {
    console.error("Chat Assistant Error:", error);
    return res.status(503).json({ error: error.message || "AI Coach is momentarily unavailable. Please retry." });
  }
});

// API endpoint for Emergency Rescue Mode Plan
app.post("/api/rescue-plan", async (req, res) => {
  try {
    const { tasks, pace } = req.body;
    const ai = getAiClient();

    const taskListStr = tasks?.map((t: any) => `"${t.name}" (Deadline: ${t.deadline}, Effort: ${t.estimatedHours}h, Subtasks done: ${t.subtasks?.filter((s: any) => s.completed).length}/${t.subtasks?.length || 0})`).join("; ") || "No tasks";

    const systemPrompt = `You are the Emergency Rescue Coordinator for AI Deadline Guardian.
The user has triggered EMERGENCY RESCUE MODE because deadlines are imminent or progress is critically behind.

Active Tasks Context:
${taskListStr}
Daily Pace Capacity: ${pace || 4} hours/day
Current Time: ${new Date().toLocaleString()}

Generate a realistic, hard-nosed Emergency Completion Plan to salvage the deadlines.
1. Calculate realistic remaining available work hours before critical deadlines.
2. Estimate realistic success probability percentage (e.g., "78%").
3. Identify tasks/subtasks that MUST be completed to pass.
4. Identify non-essential tasks/features that MAY be skipped or postponed safely.
5. Create a tight chronological work block schedule (e.g. [{"time": "7:00–9:00", "activity": "Finish implementation"}, ...]).
6. Estimate final completion percentage achievable (0-100).
7. Calculate expected finish time string (e.g. "Tomorrow 11:30 PM").
8. Provide a fierce, highly motivating AI rally message.

Return JSON exactly matching this structure:
{
  "remainingHours": number,
  "successProbability": "string (e.g. '85%')",
  "mustComplete": ["string 1", "string 2"],
  "maySkip": ["string 1", "string 2"],
  "workBlocks": [{"time": "string", "activity": "string"}],
  "estCompletionPercentage": number,
  "expectedFinishTime": "string",
  "motivationMessage": "string"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            remainingHours: { type: Type.NUMBER },
            successProbability: { type: Type.STRING },
            mustComplete: { type: Type.ARRAY, items: { type: Type.STRING } },
            maySkip: { type: Type.ARRAY, items: { type: Type.STRING } },
            workBlocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { time: { type: Type.STRING }, activity: { type: Type.STRING } },
                required: ["time", "activity"]
              }
            },
            estCompletionPercentage: { type: Type.NUMBER },
            expectedFinishTime: { type: Type.STRING },
            motivationMessage: { type: Type.STRING }
          },
          required: ["remainingHours", "successProbability", "mustComplete", "maySkip", "workBlocks", "estCompletionPercentage", "expectedFinishTime", "motivationMessage"]
        }
      }
    });

    return res.json(JSON.parse(response.text!.trim()));
  } catch (error: any) {
    console.error("Rescue Plan Error:", error);
    return res.status(500).json({ error: "Failed to generate emergency rescue plan" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (false) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
