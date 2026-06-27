import { jsPDF } from "jspdf";
import { Task } from "../types";

// Helper to check page overflow and add new page if needed
function checkPageBreak(doc: jsPDF, currentY: number, neededHeight: number = 20): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + neededHeight > pageHeight - 20) {
    doc.addPage();
    return 20; // New top margin
  }
  return currentY;
}

// Helper to draw section title
function drawSectionHeader(doc: jsPDF, title: string, y: number): number {
  y = checkPageBreak(doc, y, 25);
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(14, y - 4, 3, 12, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(title, 21, y + 5);
  return y + 16;
}

export function generatePortfolioPDF(tasks: Task[], pace: number = 3) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header Banner
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.rect(0, 0, pageWidth, 42, "F");
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(0, 0, pageWidth, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text("Productivity & Risk Assessment Report", 14, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate 500
  const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`Generated on ${dateStr} | Pace Assumption: ${pace} hrs/day`, 14, 32);

  y = 52;

  if (tasks.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(12);
    doc.text("No tasks currently recorded in workspace.", 14, y);
    doc.save("Deadline_Guardian_Portfolio_Report.pdf");
    return;
  }

  // Calculate Metrics
  const now = new Date();
  let totalSub = 0;
  let completedSub = 0;
  let totalEstHours = 0;
  let totalRemHours = 0;
  let overdueCount = 0;
  let highRiskCount = 0;
  let medRiskCount = 0;
  let lowRiskCount = 0;

  tasks.forEach(t => {
    const subs = t.subtasks.length;
    const done = t.subtasks.filter(s => s.completed).length;
    totalSub += subs;
    completedSub += done;
    totalEstHours += t.estimatedHours;
    
    const remRatio = subs > 0 ? (subs - done) / subs : 1;
    totalRemHours += t.estimatedHours * remRatio;

    const dead = new Date(t.deadline);
    if (dead.getTime() < now.getTime() && (subs === 0 || done < subs)) overdueCount++;

    const risk = t.analysis?.risk_level || "Low";
    if (risk === "High") highRiskCount++;
    else if (risk === "Medium") medRiskCount++;
    else lowRiskCount++;
  });

  const progressPercent = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

  // Section 1: Completion Statistics
  y = drawSectionHeader(doc, "1. Executive KPI Summary", y);

  // KPI Boxes
  const boxWidth = (pageWidth - 36) / 3;
  const kpis = [
    { label: "SUBTASK COMPLETION", value: `${progressPercent}% (${completedSub}/${totalSub})`, color: [16, 185, 129] },
    { label: "REMAINING FOCUS EFFORT", value: `${Math.round(totalRemHours * 10) / 10} Hours`, color: [245, 158, 11] },
    { label: "OVERDUE CHECKPOINTS", value: `${overdueCount} Tasks`, color: overdueCount > 0 ? [244, 63, 94] : [99, 102, 241] }
  ];

  kpis.forEach((kpi, idx) => {
    const bx = 14 + idx * (boxWidth + 4);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(bx, y, boxWidth, 24, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.label, bx + 4, y + 8);

    doc.setFontSize(13);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, bx + 4, y + 18);
  });

  y += 34;

  // Section 2: Risk Assessment
  y = drawSectionHeader(doc, "2. Workspace Risk Breakdown", y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`Total Active Tasks: ${tasks.length}`, 14, y);
  y += 8;

  const riskLines = [
    { label: "High Risk Profile:", count: highRiskCount, color: [244, 63, 94] },
    { label: "Medium Risk Profile:", count: medRiskCount, color: [245, 158, 11] },
    { label: "Low / Secured Risk Profile:", count: lowRiskCount, color: [16, 185, 129] }
  ];

  riskLines.forEach(rl => {
    doc.setFillColor(rl.color[0], rl.color[1], rl.color[2]);
    doc.circle(17, y - 1, 2, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(rl.label, 23, y);
    
    doc.setFont("helvetica", "normal");
    doc.text(`${rl.count} tasks (${Math.round((rl.count / tasks.length) * 100)}%)`, 70, y);
    y += 8;
  });

  y += 6;

  // Section 3: Task Schedules & Forecasts
  y = drawSectionHeader(doc, "3. Task Schedules & Forecast Projections", y);

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, pageWidth - 28, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("TASK NAME", 16, y + 5.5);
  doc.text("DEADLINE", 90, y + 5.5);
  doc.text("EFFORT", 135, y + 5.5);
  doc.text("STATUS / FORECAST", 165, y + 5.5);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  tasks.forEach(t => {
    y = checkPageBreak(doc, y, 12);
    
    const deadStr = new Date(t.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const done = t.subtasks.filter(s => s.completed).length;
    const progress = t.subtasks.length > 0 ? Math.round((done / t.subtasks.length) * 100) : 0;
    
    const remRatio = t.subtasks.length > 0 ? (t.subtasks.length - done) / t.subtasks.length : 1;
    const remHours = t.estimatedHours * remRatio;
    const daysToComplete = remHours / Math.max(pace, 0.5);
    const projDate = new Date(now.getTime() + daysToComplete * 24 * 3600 * 1000);
    const willMiss = projDate.getTime() > new Date(t.deadline).getTime() && progress < 100;

    // Task Name
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    const nameTrunc = t.name.length > 32 ? t.name.slice(0, 32) + "..." : t.name;
    doc.text(nameTrunc, 16, y);

    // Deadline
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(deadStr, 90, y);

    // Effort
    doc.text(`${t.estimatedHours}h (${progress}%)`, 135, y);

    // Status
    if (progress === 100) {
      doc.setTextColor(16, 185, 129);
      doc.setFont("helvetica", "bold");
      doc.text("Completed", 165, y);
    } else if (willMiss) {
      doc.setTextColor(244, 63, 94);
      doc.setFont("helvetica", "bold");
      doc.text("At Risk (Late)", 165, y);
    } else {
      doc.setTextColor(79, 70, 229);
      doc.setFont("helvetica", "normal");
      doc.text("On Track", 165, y);
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + 3, pageWidth - 14, y + 3);
    y += 9;
  });

  // Footer on all pages
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`AI Deadline Guardian | Page ${i} of ${totalPages}`, 14, doc.internal.pageSize.getHeight() - 10);
  }

  doc.save(`Deadline_Guardian_Executive_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function generateTaskPDF(task: Task) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header Banner
  doc.setFillColor(238, 242, 255); // Indigo 50
  doc.rect(0, 0, pageWidth, 45, "F");
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(0, 0, pageWidth, 5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(79, 70, 229);
  doc.text("SHIELDED TASK REPORT", 14, 18);

  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(task.name, pageWidth - 28);
  doc.text(titleLines[0], 14, 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Created: ${new Date(task.createdAt).toLocaleDateString()} | Deadline: ${new Date(task.deadline).toLocaleString()}`, 14, 38);

  y = 55;

  if (task.description) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    const descLines = doc.splitTextToSize(`"${task.description}"`, pageWidth - 28);
    doc.text(descLines, 14, y);
    y += descLines.length * 6 + 8;
  }

  // Core Metrics Box
  y = drawSectionHeader(doc, "1. Target Profile & Risk Assessment", y);

  const analysis = task.analysis;
  const riskLevel = analysis?.risk_level || "Pending";
  const priority = analysis?.priority_level || task.priority;
  const estHours = task.estimatedHours;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Priority Level: ${priority}`, 14, y);
  doc.text(`Work Weight: ${estHours} Hours`, 100, y);
  y += 7;

  doc.text(`Predicted Delay Risk: ${riskLevel}`, 14, y);
  if (analysis?.risk_percentage) {
    doc.text(`Risk Probability: ${analysis.risk_percentage}`, 100, y);
  }
  y += 10;

  if (analysis?.risk_reason) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const rLines = doc.splitTextToSize(`Risk Analysis: ${analysis.risk_reason}`, pageWidth - 28);
    doc.text(rLines, 14, y);
    y += rLines.length * 5 + 6;
  }

  if (analysis?.mitigation) {
    doc.setFillColor(241, 245, 249);
    const mLines = doc.splitTextToSize(`Mitigation Strategy: ${analysis.mitigation}`, pageWidth - 36);
    const boxH = mLines.length * 5 + 8;
    y = checkPageBreak(doc, y, boxH);
    doc.roundedRect(14, y - 4, pageWidth - 28, boxH, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 65, 85);
    doc.text(mLines, 18, y + 2);
    y += boxH + 8;
  }

  // Emergency Mode
  if (analysis?.rescue_mode?.activated) {
    y = drawSectionHeader(doc, "⚠️ EMERGENCY ESCAPE PROTOCOL ACTIVE", y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(225, 29, 72); // Rose 600
    doc.text("Immediate milestones required to prevent deadline failure:", 14, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    analysis.rescue_mode.emergency_plan.forEach(step => {
      y = checkPageBreak(doc, y, 10);
      const stepLines = doc.splitTextToSize(`• ${step}`, pageWidth - 34);
      doc.text(stepLines, 18, y);
      y += stepLines.length * 5 + 3;
    });
    y += 6;
  }

  // Section 2: Suggested Schedule
  if (analysis?.schedule && analysis.schedule.length > 0) {
    y = drawSectionHeader(doc, "2. Formulated Focus Schedule", y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);

    analysis.schedule.forEach(blk => {
      y = checkPageBreak(doc, y, 10);
      const bLines = doc.splitTextToSize(`[Schedule] ${blk}`, pageWidth - 32);
      doc.text(bLines, 16, y);
      y += bLines.length * 5 + 4;
    });
    y += 6;
  }

  // Section 3: Deliverables Progress Checklist
  y = drawSectionHeader(doc, "3. Deliverables Milestones Checklist", y);

  if (task.subtasks.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text("No subtask checkpoints generated.", 14, y);
    y += 10;
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    task.subtasks.forEach(st => {
      y = checkPageBreak(doc, y, 10);
      const statusIcon = st.completed ? "[X]" : "[  ]";
      if (st.completed) {
        doc.setTextColor(16, 185, 129);
      } else {
        doc.setTextColor(71, 85, 105);
      }
      const stLines = doc.splitTextToSize(`${statusIcon} ${st.text}`, pageWidth - 32);
      doc.text(stLines, 16, y);
      y += stLines.length * 5 + 3;
    });
  }

  // Footer on all pages
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Task Shield Report (${task.id}) | Page ${i} of ${totalPages}`, 14, doc.internal.pageSize.getHeight() - 10);
  }

  const safeName = task.name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 24);
  doc.save(`Task_Shield_Report_${safeName}.pdf`);
}
