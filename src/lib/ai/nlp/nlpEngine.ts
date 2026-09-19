import { paiseToRupees, formatINR } from "@/lib/services/fee-foundation.service";

export type NlpIntent =
  | "fees_defaulters"
  | "fees_collection"
  | "fees_how_to_collect"
  | "receipt_printer"
  | "attendance_summary"
  | "attendance_low"
  | "attendance_how_to_mark"
  | "students_roster"
  | "students_how_to_add"
  | "teachers_roster"
  | "timetable_schedule"
  | "exams_results"
  | "notices_circular"
  | "backup_sheets"
  | "greeting_help"
  | "general_summary"
  | "fee_overdue";

export interface NlpAnalysisResult {
  intent: NlpIntent;
  isHinglish: boolean;
  targetClass?: string;
  extractedKeywords: string[];
  confidence: number;
  toolCall?: {
    tool: string;
    params: Record<string, any>;
  };
}

/**
 * Detects whether the user is typing in Hindi / Hinglish (Latin transliterated Hindi).
 */
export function detectIsHinglish(text: string): boolean {
  const lower = text.toLowerCase();
  const hinglishMarkers = [
    /\b(hai|hain|kya|kaise|kitna|kitne|kitni|kiska|kisko|kon|kaun|bache|bacho|bachhe|vidyarthi|chhatra)\b/,
    /\b(paisa|paise|baki|baaki|jama|kist|chhoot|rasid|haziri|upsthiti|aaj|kal|chhutti|pariksha|shikshak)\b/,
    /\b(karo|batao|dikhao|bhejo|bolo|karna|lena|dena|chahiye|raha|rahe|karein|kare|hoga|hogi)\b/,
    /\b(namaste|pranam|shukriya|dhanyawad|haal|theek|sahi|acche|achha)\b/,
    /\b(nahi|mat|bhi|aur|lekin|par|se|ko|ka|ki|ke|me|mein|pe)\b/,
  ];

  return hinglishMarkers.some((pattern) => pattern.test(lower));
}

/**
 * Maps a user prompt to an intent and a corresponding tool call.
 * The tool call is a structured instruction for the backend to fetch REAL data.
 */
export function analyzePromptNlp(userPrompt: string): NlpAnalysisResult {
  const cleanPrompt = userPrompt.trim();
  const lower = cleanPrompt.toLowerCase();
  const isHinglish = detectIsHinglish(cleanPrompt);

  // Target Class Extraction (e.g. Class 10, Grade 9, 8th, 10th A, nursery, ukg)
  let targetClass: string | undefined;
  const classMatch =
    lower.match(
      /\b(?:class|grade|standard|std|kaksha)\s*(\d{1,2}|nursery|lkg|ukg|kg)(?:[\s-]*([a-zA-Z]))?\b/i
    ) ||
    lower.match(/\b(\d{1,2})(?:st|nd|rd|th)\s*(?:class|grade|kaksha)?\b/i);

  if (classMatch) {
    const clsNum = classMatch[1].toUpperCase();
    const section = classMatch[2] ? `-${classMatch[2].toUpperCase()}` : "";
    targetClass = `Class ${clsNum}${section}`;
  }

  let intent: NlpIntent = "general_summary";
  let confidence = 0.85;
  let toolCall: { tool: string; params: Record<string, any> } | undefined;

  // Fee defaulters / pending fees
  const isFeeDefaulters =
    /\b(defaulter|defaulters|baki|baaki|unpaid|pending|arrear|arrears|dues|balance|kiska baki|baki fee|overdue)\b/i.test(
      lower
    );

  const isFeeCollection =
    /\b(collection|collected|jama hua|aaj kitna aaya|total collection|recovery|paid|income|revenue|fees summary)\b/i.test(
      lower
    ) ||
    (/\b(fee|fees|paisa|paise)\b/i.test(lower) &&
      /\b(total|aaj|kitna|aaya|jama)\b/i.test(lower));

  const isFeeHowTo =
    /\b(fee|fees|paisa|payment)\b/i.test(lower) &&
    /\b(kaise|how|step|steps|procedure|jama kare|bharo|tarika)\b/i.test(lower) &&
    !/\b(pending|overdue|baki|baaki|unpaid|dues|arrear|collection|how much|kitna)\b/i.test(lower);

  const isReceiptPrinter = /\b(printer|print|receipt|rasid|thermal|58mm|mini printer|flipkart|pos|bluetooth|wifi print|slip)\b/i.test(
    lower
  );

  const isAttendanceHowTo =
    /\b(attendance|haziri|upsthiti)\b/i.test(lower) &&
    /\b(kaise|how|mark|lagaye|bhare|entry|tarika|step)\b/i.test(lower);

  const isAttendanceLow =
    /\b(low attendance|kam haziri|kam attendance|absent|absentees|bunk|below 75|shortage|kon nahi aaya|kon absent|anupasthit)\b/i.test(
      lower
    );

  const isAttendanceSummary =
    /\b(attendance|haziri|upsthiti|present|presence|percentage|aaj kitne aaye|daily attendance)\b/i.test(
      lower
    );

  const isStudentHowTo =
    /\b(admission|dakhila|student|bache|bachhe|vidyarthi|chhatra|roster|strength|enrollment|admissions)\b/i.test(
      lower
    ) &&
    /\b(kaise|how|naya|new|add|register|form|enroll|kare|tarika)\b/i.test(lower);

  const isStudentRoster =
    /\b(student|students|bache|bachhe|vidyarthi|chhatra|roster|strength|enrollment|admissions)\b/i.test(
      lower
    ) ||
    /\b(kitne bache|kitne student|total students|student list)\b/i.test(lower);

  const isTeacher = /\b(teacher|teachers|faculty|staff|shikshak|adhyapan|sir|madam|instructor|educator)\b/i.test(
    lower
  );

  const isTimetable = /\b(timetable|time table|schedule|period|periods|routine|bell|bells|samay|timing)\b/i.test(
    lower
  );

  const isExams = /\b(exam|exams|pariksha|test|tests|marks|number|result|grade|report card|topper|fail|pass|score)\b/i.test(
    lower
  );

  const isNotices = /\b(notice|notices|suchna|circular|announcement|announcements|chhutti|holiday|event|broadcast)\b/i.test(
    lower
  );

  const isBackup = /\b(backup|google sheet|sheets|sync|export|restore|excel)\b/i.test(lower);

  const isGreeting = /\b(hi|hello|hey|namaste|pranam|kaun ho|who are you|kya kar sakte|help|madad|kya haal|good morning|good evening)\b/i.test(
    lower
  );

  const isSummary = /\b(summary|overview|kya chal raha|report|status|dashboard|sab batao|all update)\b/i.test(
    lower
  );

  // Intent & Tool Mapping
  if (isReceiptPrinter) {
    intent = "receipt_printer";
    confidence = 0.95;
    toolCall = undefined; // This is a help/knowledge intent, no DB query needed
  } else if (isFeeHowTo) {
    intent = "fees_how_to_collect";
    confidence = 0.94;
    toolCall = undefined; // Help/knowledge intent
  } else if (isFeeDefaulters) {
    intent = "fees_defaulters";
    confidence = 0.93;
    toolCall = {
      tool: "get_fee_defaulters",
      params: targetClass ? { className: targetClass.replace(/^Class\s+/, "") } : {},
    };
  } else if (isFeeCollection) {
    intent = "fees_collection";
    confidence = 0.92;
    toolCall = {
      tool: "get_fee_collection",
      params: {},
    };
  } else if (isAttendanceHowTo) {
    intent = "attendance_how_to_mark";
    confidence = 0.93;
    toolCall = undefined; // Help/knowledge intent
  } else if (isAttendanceLow) {
    intent = "attendance_low";
    confidence = 0.93;
    toolCall = {
      tool: "get_today_attendance",
      params: targetClass ? { className: targetClass.replace(/^Class\s+/, "") } : {},
    };
  } else if (isAttendanceSummary) {
    intent = "attendance_summary";
    confidence = 0.91;
    toolCall = {
      tool: "get_today_attendance",
      params: targetClass ? { className: targetClass.replace(/^Class\s+/, "") } : {},
    };
  } else if (isStudentHowTo) {
    intent = "students_how_to_add";
    confidence = 0.93;
    toolCall = undefined; // Help/knowledge intent
  } else if (isStudentRoster) {
    intent = "students_roster";
    confidence = 0.91;
    toolCall = {
      tool: "get_student_count",
      params: targetClass ? { className: targetClass.replace(/^Class\s+/, "") } : {},
    };
  } else if (isTeacher) {
    intent = "teachers_roster";
    confidence = 0.92;
    toolCall = {
      tool: "get_overall_summary",
      params: {},
    };
  } else if (isTimetable) {
    intent = "timetable_schedule";
    confidence = 0.92;
    toolCall = undefined; // Help/knowledge intent
  } else if (isExams) {
    intent = "exams_results";
    confidence = 0.92;
    toolCall = undefined; // Help/knowledge intent
  } else if (isNotices) {
    intent = "notices_circular";
    confidence = 0.91;
    toolCall = undefined; // Help/knowledge intent
  } else if (isBackup) {
    intent = "backup_sheets";
    confidence = 0.94;
    toolCall = undefined; // Help/knowledge intent
  } else if (isGreeting) {
    intent = "greeting_help";
    confidence = 0.96;
    toolCall = undefined; // Greeting, no DB query needed
  } else if (isSummary) {
    intent = "general_summary";
    confidence = 0.9;
    toolCall = {
      tool: "get_overall_summary",
      params: {},
    };
  }

  const extractedKeywords = [];
  const tokens = (lower.match(/\b\w{4,}\b/g) || []).slice(0, 5);
  extractedKeywords.push(...tokens);

  return {
    intent,
    isHinglish,
    targetClass,
    extractedKeywords,
    confidence,
    toolCall,
  };
}

// Keep imports for compatibility with existing code that may reference these functions
export { paiseToRupees, formatINR };

export interface SynthesizedResponse {
  content: string;
  quickLinks: Array<{ label: string; href: string }>;
  suggestedFollowUps: string[];
  metrics: Record<string, string | number>;
}

/**
 * Generates a deterministic, data-driven natural-language response from
 * structured tool results returned by /api/ai/tools.
 *
 * NEVER fabricates values — all numbers come from the tool result data.
 * Shows loading/empty/error states appropriately when data is missing.
 *
 * @param portal The AI portal type (school_admin, teacher, etc.)
 * @param userPrompt The original user question
 * @param contextData Static context data from buildAiContext
 * @param toolData The structured real data returned from the backend tool
 */
export function synthesizeResponseFromToolData(
  portal: AiPortalType,
  userPrompt: string,
  contextData: any,
  toolData: any
): SynthesizedResponse {
  const analysis = analyzePromptNlp(userPrompt);
  const isH = analysis.isHinglish;
  const intent = analysis.intent;

  const schoolName = contextData?.schoolInfo?.name || "Your School";
  const metrics: Record<string, string | number> = {};
  let quickLinks: Array<{ label: string; href: string }> = [];
  let suggestedFollowUps: string[] = [];
  let content = "";

  // Helper: format paise to rupees string
  const fmt = (paise: number) => `₹${paiseToRupees(paise).toLocaleString("en-IN")}`;

  // =========================================================================
  // INTENT: Fees Defaulters / Pending Fees
  // =========================================================================
  if (intent === "fees_defaulters" || intent === "fee_overdue") {
    const data = toolData as any;

    if (data?.error) {
      content = `## ⚠️ Unable to Load Fee Data

I was unable to fetch fee defaulter data at this time. This could be because:

- Your Firestore connection is unavailable
- No fee records exist yet for your school
- You may not have permission to view fee data

Please try again, or contact your administrator if this problem persists.`;
      suggestedFollowUps = ["Show student enrollment", "What is today's attendance?"];
      return { content, quickLinks: [{ label: "Fee Management", href: "/admin/fees" }], suggestedFollowUps, metrics };
    }

    if (!data || data.count === 0) {
      metrics["Status"] = "No Defaulters";
      metrics["Pending Amount"] = "₹0";
      quickLinks = [
        { label: "Fee Collection", href: "/admin/fees/collect" },
        { label: "Fee Reports", href: "/admin/fees/reports" },
      ];
      content = `## ✅ No Pending Fee Defaulters

**School:** ${schoolName}

All fee accounts for your school are **current** — no students have pending or overdue balances at this time.

| Metric | Value |
| :--- | :--- |
| Students with Pending Dues | 0 |
| Total Outstanding Amount | ₹0 |
| Status | All Clear ✅ |

[Record New Fee Payment →](/admin/fees/collect)  
[View Full Fee Reports →](/admin/fees/reports)`;
      suggestedFollowUps = ["Show fee collection summary", "How many students are enrolled?"];
      return { content, quickLinks, suggestedFollowUps, metrics };
    }

    const totalOutstanding = data.totalOutstandingRupees || 0;
    const count = data.count || 0;

    metrics["Total Pending"] = fmt(data.totalOutstandingPaise || 0);
    metrics["Defaulter Students"] = count;

    quickLinks = [
      { label: "Defaulters Management", href: "/admin/fees/defaulters" },
      { label: "Fee Collection", href: "/admin/fees/collect" },
      { label: "Fee Reports", href: "/admin/fees/reports" },
    ];

    content = `## ⚠️ Pending Fee Defaulters Report

**School:** ${schoolName}

### 📊 Fee Defaulters Summary:

| Metric | Value |
| :--- | :--- |
| **Students With Pending Dues** | **${count} students** |
| **Total Outstanding Amount** | **${fmt(data.totalOutstandingPaise || 0)}** |

### 👥 Students With Pending Fees:

| Student Name | Enrollment ID | Class | Amount Due | Due Since | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
`;

    // Render each defaulter as a table row
    const defaulters = data.defaulters || data.students || [];
    if (defaulters.length > 0) {
      defaulters.forEach((d: any) => {
        const dueAmount = d.totalOutstandingRupees || d.totalOutstandingPaise
          ? fmt(d.totalOutstandingPaise || d.totalOutstandingRupees * 100)
          : "—";
        content += `| ${d.studentName || "—"} | ${d.admissionNumber || d.studentId || "—"} | ${d.className || "—"} | ${dueAmount} | ${d.daysOverdue || 0} days | ${d.status || "OVERDUE"} |\n`;
      });
    } else {
      content += `| — | — | — | — | — | No records |`;
    }

    content += `

[👉 Open Defaulters Management →](/admin/fees/defaulters)  
[💰 Collect Fee →](/admin/fees/collect)`;
    suggestedFollowUps = ["How much fee is pending in total?", "Show fee collection this month", "View student list"];
    return { content, quickLinks, suggestedFollowUps, metrics };
  }

  // =========================================================================
  // INTENT: Fee Collection
  // =========================================================================
  if (intent === "fees_collection") {
    const data = toolData as any;

    if (data?.error) {
      content = `## ⚠️ Unable to Load Fee Data

I was unable to fetch fee collection data. Please verify your Firestore connection and try again.`;
      return { content, quickLinks: [{ label: "Fee Dashboard", href: "/admin/fees/reports" }], suggestedFollowUps: ["Show student enrollment"], metrics };
    }

    const totalExpected = data.totalExpectedRupees || 0;
    const totalCollected = data.totalCollectedRupees || 0;
    const totalOutstanding = data.totalOutstandingRupees || 0;
    const todayCollected = data.todayCollectionRupees || 0;
    const defaultersCount = data.defaultersCount || 0;
    const collectionRate = data.collectionRate || 0;

    metrics["Total Collected"] = `₹${totalCollected.toLocaleString("en-IN")}`;
    metrics["Collection Rate"] = `${Math.round(collectionRate)}%`;
    metrics["Pending Dues"] = `₹${totalOutstanding.toLocaleString("en-IN")}`;
    metrics["Defaulters"] = defaultersCount;
    metrics["Today's Collection"] = `₹${todayCollected.toLocaleString("en-IN")}`;

    quickLinks = [
      { label: "Fee Transactions", href: "/admin/fees/transactions" },
      { label: "Fee Reports", href: "/admin/fees/reports" },
      { label: "Collect Fee", href: "/admin/fees/collect" },
    ];

    content = `## 💰 Fee Collection & Revenue Summary

**School:** ${schoolName}  
**Date:** ${new Date().toLocaleDateString("en-IN", { dateStyle: "full" })}

### 📈 Fee Collection Metrics:

| Financial Metric | Amount | Status |
| :--- | :--- | :--- |
| **Total Collected** | **₹${totalCollected.toLocaleString("en-IN")}** | ✅ Received |
| **Total Expected (Billed)** | ₹${totalExpected.toLocaleString("en-IN")} | Invoiced |
| **Total Outstanding (Pending)** | **₹${totalOutstanding.toLocaleString("en-IN")}** | ⚠️ ${defaultersCount} Defaulters |
| **Collection Rate** | **${Math.round(collectionRate)}%** | `;
    content += Math.round(collectionRate) >= 95 ? "🟢 Healthy" : Math.round(collectionRate) >= 80 ? "🟡 Monitor" : "🔴 Attention Required";
    content += ` |
| **Today's Collection** | ₹${todayCollected.toLocaleString("en-IN")} | ${data.todayPaymentsCount || 0} transactions |

`;

    // Class-wise breakdown if available
    if (data.classCollection && data.classCollection.length > 0) {
      content += `### 🏫 Class-Wise Fee Collection:

| Class | Students | Expected | Collected | Outstanding | Rate |
| :--- | :--- | :--- | :--- | :--- | :--- |
`;
      data.classCollection.forEach((c: any) => {
        content += `| ${c.className || "—"} | ${c.studentCount || 0} | ₹${(c.expectedRupees || 0).toLocaleString("en-IN")} | ₹${(c.collectedRupees || 0).toLocaleString("en-IN")} | ₹${(c.outstandingRupees || 0).toLocaleString("en-IN")} | ${Math.round(c.collectionRate || 0)}% |\n`;
      });
      content += `\n`;
    }

    // Monthly trend if available
    if (data.collectionTrend && data.collectionTrend.length > 0) {
      content += `### 📊 Monthly Collection Trend:

| Month | Expected | Collected | Outstanding | Rate |
| :--- | :--- | :--- | :--- | :--- |
`;
      data.collectionTrend.forEach((m: any) => {
        content += `| ${m.monthName || "—"} | ₹${(m.expectedRupees || 0).toLocaleString("en-IN")} | ₹${(m.collectedRupees || 0).toLocaleString("en-IN")} | ₹${(m.outstandingRupees || 0).toLocaleString("en-IN")} | ${Math.round(m.collectionRate || 0)}% |\n`;
      });
      content += `\n`;
    }

    content += `[👉 View Fee Reports →](/admin/fees/reports)  
[💳 Record Payment →](/admin/fees/collect)`;
    suggestedFollowUps = ["Show students with pending fees", "Who has the highest overdue amount?", "View class-wise fee report"];
    return { content, quickLinks, suggestedFollowUps, metrics };
  }

  // =========================================================================
  // INTENT: Student Roster / Count
  // =========================================================================
  if (intent === "students_roster") {
    const data = toolData as any;

    if (data?.error) {
      content = `## ⚠️ Unable to Load Student Data

I was unable to fetch student data. Please verify your Firestore connection and try again.`;
      return { content, quickLinks: [{ label: "Student Directory", href: "/admin/students" }], suggestedFollowUps: ["Show fee collection"], metrics };
    }

    if (!data || data.totalStudents === 0) {
      content = `## ℹ️ No Student Records Found

No enrolled students have been found for **${schoolName}** in the database.

| Metric | Value |
| :--- | :--- |
| Total Students | 0 |
| Active Students | 0 |
| Classes | No data |

[Go to Student Directory →](/admin/students)`;
      metrics["Total Students"] = 0;
      suggestedFollowUps = ["How to add a new student?", "Show fee collection summary"];
      return { content, quickLinks: [{ label: "Student Directory", href: "/admin/students" }], suggestedFollowUps, metrics };
    }

    const totalStudents = data.totalStudents || 0;
    const activeStudents = data.activeStudents || 0;
    const byClass = data.byClass || {};

    metrics["Total Students"] = totalStudents;
    metrics["Active Students"] = activeStudents;

    quickLinks = [
      { label: "Student Directory", href: "/admin/students" },
      { label: "Attendance", href: "/admin/attendance" },
      { label: "Fee Defaulters", href: "/admin/fees/defaulters" },
    ];

    content = `## 🎓 Student Enrollment & Strength Report

**School:** ${schoolName}

### 📊 Student Statistics:

| Metric | Count |
| :--- | :--- |
| **Total Enrolled Students** | **${totalStudents}** |
| **Active Students** | **${activeStudents}** |

### 🏫 Class-Wise Student Strength:

| Class | Student Count |
| :--- | :--- |
`;

    const classEntries = Object.entries(byClass);
    if (classEntries.length > 0) {
      classEntries.forEach(([cls, cnt]) => {
        content += `| ${cls} | ${cnt} |\n`;
      });
    } else {
      content += `| No class data | 0 |\n`;
    }

    content += `\n[👉 Open Student Directory →](/admin/students)  
[💰 View Pending Fee Students →](/admin/fees/defaulters)`;
    suggestedFollowUps = ["Show students with pending fees", "What is today's attendance?", "Show fee collection this month"];
    return { content, quickLinks, suggestedFollowUps, metrics };
  }

  // =========================================================================
  // INTENT: Attendance Summary
  // =========================================================================
  if (intent === "attendance_summary" || intent === "attendance_low") {
    const data = toolData as any;

    if (data?.error) {
      content = `## ⚠️ Unable to Load Attendance Data

I was unable to fetch attendance data. This may be because:

- No attendance has been marked for today
- Your Firestore connection is unavailable

Please mark attendance first or try again.`;
      metrics["Status"] = "No Data";
      return { content, quickLinks: [{ label: "Attendance Desk", href: "/admin/attendance" }], suggestedFollowUps: ["Show student enrollment"], metrics };
    }

    if (!data || data.total === 0) {
      content = `## 📋 Today's Attendance — No Records Found

**School:** ${schoolName}  
**Date:** ${data?.date || new Date().toISOString().split("T")[0]}

No attendance records have been marked for today.

| Metric | Value |
| :--- | :--- |
| Students Marked Present | 0 |
| Students Absent | 0 |
| Total Records | 0 |

[Open Attendance Desk →](/admin/attendance)`;
      metrics["Total Marked"] = 0;
      suggestedFollowUps = ["How many students are enrolled?", "Show fee collection summary"];
      quickLinks = [{ label: "Attendance Desk", href: "/admin/attendance" }];
      return { content, quickLinks, suggestedFollowUps, metrics };
    }

    const present = data.present || 0;
    const absent = data.absent || 0;
    const late = data.late || 0;
    const total = data.total || 0;
    const rate = data.rate || 0;

    metrics["Present"] = present;
    metrics["Absent"] = absent;
    metrics["Late"] = late;
    metrics["Attendance Rate"] = `${rate}%`;

    quickLinks = [
      { label: "Attendance Dashboard", href: "/admin/attendance" },
      { label: "Attendance Reports", href: "/admin/reports" },
    ];

    content = `## 📋 Today's Attendance Report

**School:** ${schoolName}  
**Date:** ${data.date || new Date().toISOString().split("T")[0]}

### 📊 Attendance Summary:

| Metric | Count |
| :--- | :--- |
| **Present** | **${present}** |
| **Absent** | **${absent}** |
| **Late** | **${late}** |
| **Total Students Marked** | **${total}** |
| **Attendance Rate** | **${rate}%** |

`;

    // Show absentees if any
    const absentStudents = (data.records || []).filter((r: any) => r.status === "ABSENT");
    if (absentStudents.length > 0) {
      content += `### ❌ Students Absent Today:

| Student Name | Admission No | Class | Section |
| :--- | :--- | :--- | :--- |
`;
      absentStudents.slice(0, 20).forEach((r: any) => {
        content += `| ${r.studentName || "—"} | ${r.admissionNumber || "—"} | ${r.className || "—"} | ${r.sectionName || "—"} |\n`;
      });
      if (absentStudents.length > 20) {
        content += `\n*...and ${absentStudents.length - 20} more absent students*\n`;
      }
      content += `\n`;
    }

    content += `[👉 Open Attendance Dashboard →](/admin/attendance)  
[📊 Export Attendance Report →](/admin/reports)`;
    suggestedFollowUps = ["Show student enrollment", "What is total pending fee?", "Which students have low attendance?"];
    return { content, quickLinks, suggestedFollowUps, metrics };
  }

  // =========================================================================
  // INTENT: General Summary / Overview
  // =========================================================================
  if (intent === "general_summary") {
    const data = toolData as any;
    const sStats = data?.studentStatistics || contextData?.studentStatistics || {};
    const fStats = data?.feeStatistics || contextData?.feeStatistics || {};
    const aStats = data?.attendanceStatistics || contextData?.attendanceStatistics || {};

    const totalStudents = sStats.totalStudents || 0;
    const activeStudents = sStats.activeStudents || totalStudents;
    const totalCollected = fStats.totalCollectedRupees || 0;
    const totalOutstanding = fStats.totalOutstandingRupees || fStats.totalOutstandingPaise
      ? fStats.totalOutstandingRupees || paiseToRupees(fStats.totalOutstandingPaise || 0)
      : 0;
    const defaultersCount = fStats.defaultersCount || 0;
    const attendanceRate = aStats.rate || aStats.overallAttendanceRate || null;
    const present = aStats.present || 0;
    const absent = aStats.absent || 0;
    const todayTotal = aStats.total || 0;

    metrics["Enrolled Students"] = activeStudents;
    metrics["Fee Collected"] = `₹${totalCollected.toLocaleString("en-IN")}`;
    metrics["Pending Dues"] = `₹${totalOutstanding.toLocaleString("en-IN")}`;
    if (attendanceRate !== null) metrics["Attendance"] = `${attendanceRate}%`;

    quickLinks = [
      { label: "Collect Fee", href: "/admin/fees/collect" },
      { label: "Defaulters Ledger", href: "/admin/fees/defaulters" },
      { label: "Attendance Desk", href: "/admin/attendance" },
      { label: "Student Roster", href: "/admin/students" },
    ];

    content = `## 🏫 School Overview & Live Summary

**School:** ${schoolName}  
**Date:** ${new Date().toLocaleDateString("en-IN", { dateStyle: "full" })}

### 📊 Key Metrics:

| Department | Metric | Details |
| :--- | :--- | :--- |
| **Students** | **${activeStudents} enrolled** | Active registration |
| **Fees Collected** | **₹${totalCollected.toLocaleString("en-IN")}** | Bank & Cash Received |
| **Pending Dues** | **₹${totalOutstanding.toLocaleString("en-IN")}** | ⚠️ ${defaultersCount} defaulters |
`;

    if (attendanceRate !== null && todayTotal > 0) {
      content += `| **Today's Attendance** | **${attendanceRate}%** | ${present} present, ${absent} absent out of ${todayTotal} |\n`;
    } else if (todayTotal === 0) {
      content += `| **Today's Attendance** | Not marked yet | [Mark now](/admin/attendance) |\n`;
    }

    // Class breakdown if available
    const byClass = sStats.byClass || contextData?.studentStatistics?.byClass || {};
    const classEntries = Object.entries(byClass);
    if (classEntries.length > 0) {
      content += `\n### 🏫 Class-Wise Student Distribution:\n\n| Class | Students |\n| :--- | :--- |\n`;
      classEntries.forEach(([cls, cnt]) => {
        content += `| ${cls} | ${cnt} |\n`;
      });
    }

    content += `

[👉 View Fee Defaulters →](/admin/fees/defaulters)  
[💰 Collect Fee →](/admin/fees/collect)  
[📋 Attendance Desk →](/admin/attendance)  
[🎓 Student Directory →](/admin/students)`;
    suggestedFollowUps = ["Show students with pending fees", "How much fee is pending?", "Show today's attendance", "Show this month's fee collection"];
    return { content, quickLinks, suggestedFollowUps, metrics };
  }

  // =========================================================================
  // INTENT: Class-wise Report
  // =========================================================================
  if (intent === "students_how_to_add") {
    const steps = [
      ["📋 Navigate to Students", "Open **Students** from your dashboard sidebar navigation."],
      ["➕ Click Add Student", "Press the **＋ Add Student** button in the top-right header."],
      ["📝 Fill Personal Info", "Enter Student Name, Date of Birth, Gender, and Blood Group."],
      ["🏫 Assign Class & Section", "Select the target Class & Section (e.g. Class 10 - A)."],
      ["👪 Enter Guardian Info", "Provide Father's name, Mother's name, and valid WhatsApp mobile number."],
      ["💾 Save & Register", "Click **Save**. The system auto-generates a Student ID and initializes the fee ledger account."],
    ];

    const isH = analysis.isHinglish;
    if (isH) {
      content = `## 🎓 Naya Student Admission Kaise Karein

Software mein naya student add karne ka process bahut hi aasan hai:

### 📝 Step-by-Step Admission Process:
${steps.map((s, i) => `${i + 1}. **${s[0]}:** ${s[1]}`).join("\n")}

[👉 Abhi Student Register Karein →](/admin/students)`;
    } else {
      content = `## 🎓 How to Register a New Student

### 📝 Step-by-Step Process:
${steps.map((s, i) => `${i + 1}. **${s[0]}:** ${s[1]}`).join("\n")}

[Open Student Directory →](/admin/students)`;
    }

    metrics["Admissions"] = "Open";
    quickLinks = [
      { label: "Student Directory", href: "/admin/students" },
      { label: "Fee Structures", href: "/admin/fees/structures" },
    ];
    suggestedFollowUps = ["How many students are enrolled?", "Show fee collection summary", "How to collect fees?"];
    return { content, quickLinks, suggestedFollowUps, metrics };
  }

  // =========================================================================
  // INTENT: Greeting / Help
  // =========================================================================
  if (intent === "greeting_help") {
    content = `## 👋 Hello! I Am Your School AI Assistant

I am your intelligent school administration assistant connected directly to your live school data. You can ask me questions in English or Hinglish anytime:

### 💡 What You Can Ask Me:
- **Fees & Ledger:** "Show students with pending fees", "How much fee is pending?", "Who has unpaid fees?"
- **Attendance:** "Show today's attendance", "Which students are absent?"
- **Students:** "How many students are enrolled?", "Show class-wise student strength"
- **Reports:** "Show fee collection this month", "Give me class-wise fee report"

Type your question below or click any suggestion chip to get started!

> ℹ️ I use your real school database with strict tenant isolation. No fake data.`;

    metrics["AI Copilot"] = "Ready";
    quickLinks = [
      { label: "Student Directory", href: "/admin/students" },
      { label: "Fee Management", href: "/admin/fees" },
      { label: "Attendance", href: "/admin/attendance" },
    ];
    suggestedFollowUps = [
      "Show students with pending fees",
      "How much fee is pending?",
      "Show today's attendance",
      "How many students are enrolled?",
      "Show this month's fee collection",
    ];
    return { content, quickLinks, suggestedFollowUps, metrics };
  }

  // =========================================================================
  // INTENT: How-to / Knowledge (printer, fees_how_to, timetable, etc.)
  // =========================================================================
  if (
    intent === "receipt_printer" ||
    intent === "fees_how_to_collect" ||
    intent === "timetable_schedule" ||
    intent === "exams_results" ||
    intent === "notices_circular" ||
    intent === "backup_sheets" ||
    intent === "attendance_how_to_mark"
  ) {
    // These are knowledge/help intents — use the system prompt's context for reference
    // But we still avoid hardcoded demo values
    return synthesizeHelpResponse(intent, contextData, schoolName, analysis.isHinglish);
  }

  // =========================================================================
  // FALLBACK: If we have data, try to render it; otherwise show data-unavailable state
  // =========================================================================
  if (toolData && toolData.error) {
    content = `## ⚠️ Data Unavailable

I couldn't retrieve the requested data. This could be because:

- Your Firestore connection is temporarily unavailable
- No records exist for this query
- You may need to refresh or try a more specific query

**Error:** ${toolData.error}

[Retry Query](javascript:location.reload())`;
    metrics["Status"] = "Error";
    quickLinks = [{ label: "Dashboard", href: portal === "school_admin" ? "/admin" : "/admin" }];
    suggestedFollowUps = ["Show student enrollment", "Show fee collection"];
    return { content, quickLinks, suggestedFollowUps, metrics };
  }

  if (toolData && typeof toolData === "object" && Object.keys(toolData).length > 0) {
    // We have data but no specific handler — render a generic data view
    content = `## Query Results

I retrieved the following information from your school database:

\`\`\`json
${JSON.stringify(toolData, null, 2)}
\`\`\`

*Note: I can provide more specific analysis if you ask about a particular topic like fees, attendance, or students.*`;
    quickLinks = [{ label: "Back to Dashboard", href: "/admin" }];
    suggestedFollowUps = ["Show students with pending fees", "How much fee is pending?", "Show today's attendance"];
    return { content, quickLinks, suggestedFollowUps, metrics };
  }

  // No data at all
  content = `## ℹ️ No Data Available

I don't have specific data to answer this query right now. This likely means:

- No records exist in your school database for this query
- The relevant module (fees, attendance, students) hasn't been set up yet

**Quick Actions:**
- [Go to Dashboard →](${portal === "school_admin" ? "/admin" : "/admin"})
- [Student Directory →](/admin/students)
- [Fee Management →](/admin/fees)
- [Attendance Desk →](/admin/attendance)`;
  metrics["Status"] = "No Data";
    quickLinks = [{ label: "Dashboard", href: "/admin" }];
    suggestedFollowUps = ["How many students are enrolled?", "Show fee collection summary", "Show today's attendance"];
  return { content, quickLinks, suggestedFollowUps, metrics };
}

// ============================================================================
// HELP RESPONSE GENERATOR (for knowledge/how-to intents)
// ============================================================================

function synthesizeHelpResponse(
  intent: NlpIntent,
  contextData: any,
  schoolName: string,
  isH: boolean
): { content: string; quickLinks: Array<{ label: string; href: string }>; suggestedFollowUps: string[]; metrics: Record<string, string | number> } {
  let content = "";
  let quickLinks: Array<{ label: string; href: string }> = [];
  let suggestedFollowUps: string[] = [];
  const metrics: Record<string, string | number> = {};
  const today = new Date().toLocaleDateString("en-IN", { dateStyle: "full" });

  switch (intent) {
    case "receipt_printer":
      metrics["Printer"] = "58mm Thermal";
      content = `## 🖨️ 58mm Mini Thermal Printer Setup (Wi-Fi / Bluetooth)

Your School Study portal is pre-configured with a native **58mm thermal POS receipt layout** compatible with standard portable mini printers.

### ⚙️ Setup Steps:
1. **Load Thermal Roll:** Insert standard 58mm thermal paper into your mini printer.
2. **Pair Device:**
   - **Bluetooth:** Open Bluetooth settings on your device, turn on the printer, and pair (Default PIN: \`0000\` or \`1234\`).
   - **Wi-Fi:** Connect to the printer's Wi-Fi network.
   - **USB:** Connect the USB cable to your computer and select the POS printer as destination.
3. **Print Receipt:** After collecting a fee in **Collect Fee**, click **Print Receipt**. Choose your 58mm thermal printer and set Margins to **None**.

[Open Fee Receipts →](/admin/fees/receipts)  
[Collect Fee & Test Print →](/admin/fees/collect)`;
      quickLinks = [
        { label: "Fee Receipts", href: "/admin/fees/receipts" },
        { label: "Collect Fee", href: "/admin/fees/collect" },
      ];
      suggestedFollowUps = ["How to collect a fee payment?", "Show pending fees and defaulters", "View today's collection"];
      break;

    case "fees_how_to_collect":
      metrics["Collect Fee Desk"] = "Live";
      content = `## 💳 How to Record and Collect Student Fees

### 📝 Step-by-Step Instructions:
1. **Navigate to Collect Fee:** Go to **Fee Management → Collect Fee** from your dashboard.
2. **Lookup Student:** Search by name, admission number, or filter by class and section.
3. **Select Fee Periods:** Check applicable months or fee heads (Tuition, Transport, Exam).
4. **Apply Concessions:** Enter authorized discounts or scholarships.
5. **Select Payment Mode:** Choose Cash, UPI/QR, Cheque, or Bank Transfer.
6. **Finalize & Print:** Click **Submit Payment**. Transaction is ledger-locked and a verified receipt is generated.

[Open Collect Fee Desk →](/admin/fees/collect)  
[Review Fee Defaulters →](/admin/fees/defaulters)`;
      quickLinks = [
        { label: "Collect Fee", href: "/admin/fees/collect" },
        { label: "Defaulters", href: "/admin/fees/defaulters" },
      ];
      suggestedFollowUps = ["Show students with pending fees", "What is total pending fee?", "How to setup mini printer?"];
      break;

    case "timetable_schedule":
      metrics["Timetable"] = "Active";
      content = `## 📅 Academic Timetable & Period Schedule

Class periods, bell timings, and room allocations are synchronized across the timetable engine.

[Manage Timetable & Bells →](/admin/timetable)  
[Classroom Allocations →](/admin/classes)`;
      quickLinks = [
        { label: "Timetable & Bells", href: "/admin/timetable" },
        { label: "Classes", href: "/admin/classes" },
      ];
      suggestedFollowUps = ["View today's attendance summary", "Teacher staff directory", "Show student enrollment"];
      break;

    case "exams_results":
      metrics["Exams Module"] = "Ready";
      content = `## 📝 Examination & Gradebook Management

Configure term exams, enter subject-wise marks, and generate official student report cards.

[Open Reports & Marksheet Console →](/admin/reports)`;
      quickLinks = [
        { label: "Reports & Marksheets", href: "/admin/reports" },
        { label: "Class Management", href: "/admin/classes" },
      ];
      suggestedFollowUps = ["View student roster", "Check fee defaulters", "Show today's attendance"];
      break;

    case "notices_circular":
      metrics["Notice Board"] = "Active";
      content = `## 📢 School Notices & Broadcast Circulars

Publish notices, holiday advisories, and exam schedules to Parents, Teachers, or Students in real-time.

1. Go to **Notices** from the sidebar.
2. Click **+ Create Notice**.
3. Enter Title and message content.
4. Select Target Audience (All, Parents, Teachers, Students).
5. Click **Publish** to send instantly.

[Open Notice Management →](/admin/notices)`;
      quickLinks = [{ label: "Notices & Announcements", href: "/admin/notices" }];
      suggestedFollowUps = ["Send fee reminders to parents", "Today's attendance summary", "Show student roster"];
      break;

    case "backup_sheets":
      metrics["Cloud Backup"] = "Available";
      content = `## ☁️ Automated Data Backup & Export

Export your school data to Google Sheets, Excel, or PDF at any time:

1. **Google Sheets Mirror:** Real-time sync to dedicated tabs for Students, Teachers, Attendance, and Fee Ledger.
2. **Excel/PDF Export:** Download raw data from any module.
3. **1-Click Sync:** Trigger a live sync from the Backup Console.

[Open Backup Console →](/admin/backup)`;
      quickLinks = [
        { label: "Backup Console", href: "/admin/backup" },
        { label: "Reports & Exports", href: "/admin/reports" },
      ];
      suggestedFollowUps = ["Show school summary", "View fee transactions", "Check student directory"];
      break;

    case "attendance_how_to_mark":
      metrics["Attendance"] = "Active";
      content = `## 📋 How to Take Daily Class Attendance

### 📝 Steps to Mark Attendance:
1. **Open Attendance:** Go to **Attendance** from the sidebar navigation.
2. **Select Class & Date:** Pick your division (e.g. Class 10-A) and select the date.
3. **Toggle Status:** All enrolled learners default to **Present (P)**. Tap once to mark **Absent (A)** or **Leave (L)**.
4. **Save & Sync:** Click **Save Attendance**. Updates in real-time and triggers parent notifications.

[Open Attendance Register →](/admin/attendance)  
[View Low Attendance Reports →](/admin/reports)`;
      quickLinks = [
        { label: "Attendance Desk", href: "/admin/attendance" },
        { label: "Reports", href: "/admin/reports" },
      ];
      suggestedFollowUps = ["Which students are absent today?", "Show student enrollment", "What is total pending fee?"];
      break;

    default:
      content = `## ℹ️ Help Information

For assistance with this topic, please refer to the relevant School Study dashboard:

[Back to Dashboard →](/admin)`;
      quickLinks = [{ label: "Dashboard", href: "/admin" }];
      suggestedFollowUps = ["Show students with pending fees", "How much fee is pending?", "Show today's attendance"];
  }

  return { content, quickLinks, suggestedFollowUps, metrics };
}

// Keep the old function name for backwards compatibility
import type { AiPortalType } from "@/types/ai";

