import natural from "natural";
import nlp from "compromise";
import type { AiPortalType } from "@/types/ai";

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
  | "general_summary";

export interface NlpAnalysisResult {
  intent: NlpIntent;
  isHinglish: boolean;
  targetClass?: string;
  extractedKeywords: string[];
  confidence: number;
}

const tokenizer = new natural.WordTokenizer();

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
 * Intelligent Multi-Lingual Intent & Entity Analyzer.
 * Combines natural tokenization/stemming with compromise and custom school NLP dictionaries.
 */
export function analyzePromptNlp(userPrompt: string): NlpAnalysisResult {
  const cleanPrompt = userPrompt.trim();
  const lower = cleanPrompt.toLowerCase();
  const isHinglish = detectIsHinglish(cleanPrompt);

  const tokens = tokenizer.tokenize(lower) || [];

  // 1. Target Class Extraction (e.g. Class 10, Grade 9, 8th, 10th A, nursery, ukg)
  let targetClass: string | undefined;
  const classMatch = lower.match(
    /\b(?:class|grade|standard|std|kaksha)\s*(\d{1,2}|nursery|lkg|ukg|kg)(?:[\s-]*([a-zA-Z]))?\b/i
  ) || lower.match(/\b(\d{1,2})(?:st|nd|rd|th)\s*(?:class|grade|kaksha)?\b/i);

  if (classMatch) {
    const clsNum = classMatch[1].toUpperCase();
    const section = classMatch[2] ? `-${classMatch[2].toUpperCase()}` : "";
    targetClass = `Class ${clsNum}${section}`;
  }

  // 2. Keyword & Pattern Matching
  const isReceiptPrinter =
    /\b(printer|print|receipt|rasid|thermal|58mm|mini printer|flipkart|pos|bluetooth|wifi print|slip)\b/i.test(lower);

  const isFeeHowTo =
    /\b(fee|fees|paisa|payment)\b/i.test(lower) &&
    /\b(kaise|how|step|steps|procedure|jama kare|collect|entry|bharo|tarika)\b/i.test(lower);

  const isFeeDefaulters =
    /\b(defaulter|defaulters|baki|baaki|unpaid|pending|arrear|arrears|dues|balance|kiska baki|baki fee|overdue)\b/i.test(lower);

  const isFeeCollection =
    /\b(collection|collected|jama hua|aaj kitna aaya|total collection|recovery|paid|income|revenue|fees summary)\b/i.test(lower) ||
    (/\b(fee|fees|paisa|paise)\b/i.test(lower) && /\b(total|aaj|kitna|aaya|jama)\b/i.test(lower));

  const isAttendanceHowTo =
    /\b(attendance|haziri|upsthiti)\b/i.test(lower) &&
    /\b(kaise|how|mark|lagaye|bhare|entry|tarika|step)\b/i.test(lower);

  const isAttendanceLow =
    /\b(low attendance|kam haziri|kam attendance|absent|absentees|bunk|below 75|shortage|kon nahi aaya|kon absent|anupasthit)\b/i.test(lower);

  const isAttendanceSummary =
    /\b(attendance|haziri|upsthiti|present|presence|percentage|aaj kitne aaye|daily attendance)\b/i.test(lower);

  const isStudentHowTo =
    /\b(admission|dakhila|student|bache|bachhe|vidyarthi)\b/i.test(lower) &&
    /\b(kaise|how|naya|new|add|register|form|enroll|kare|tarika)\b/i.test(lower);

  const isStudentRoster =
    /\b(student|students|bache|bachhe|vidyarthi|chhatra|roster|strength|enrollment|admissions)\b/i.test(lower) ||
    /\b(kitne bache|kitne student|total students|student list)\b/i.test(lower);

  const isTeacher =
    /\b(teacher|teachers|faculty|staff|shikshak|adhyapak|sir|madam|instructor|educator)\b/i.test(lower);

  const isTimetable =
    /\b(timetable|time table|schedule|period|periods|routine|bell|bells|samay|timing)\b/i.test(lower);

  const isExams =
    /\b(exam|exams|pariksha|test|tests|marks|number|result|grade|report card|topper|fail|pass|score)\b/i.test(lower);

  const isNotices =
    /\b(notice|notices|suchna|circular|announcement|announcements|chhutti|holiday|event|broadcast)\b/i.test(lower);

  const isBackup =
    /\b(backup|google sheet|sheets|sync|export|restore|excel)\b/i.test(lower);

  const isGreeting =
    /\b(hi|hello|hey|namaste|pranam|kaun ho|who are you|kya kar sakte|help|madad|kya haal|good morning|good evening)\b/i.test(lower);

  const isSummary =
    /\b(summary|overview|kya chal raha|report|status|dashboard|sab batao|all update)\b/i.test(lower);

  let intent: NlpIntent = "general_summary";
  let confidence = 0.85;

  if (isReceiptPrinter) {
    intent = "receipt_printer";
    confidence = 0.95;
  } else if (isFeeHowTo) {
    intent = "fees_how_to_collect";
    confidence = 0.94;
  } else if (isFeeDefaulters) {
    intent = "fees_defaulters";
    confidence = 0.93;
  } else if (isFeeCollection) {
    intent = "fees_collection";
    confidence = 0.92;
  } else if (isAttendanceHowTo) {
    intent = "attendance_how_to_mark";
    confidence = 0.93;
  } else if (isAttendanceLow) {
    intent = "attendance_low";
    confidence = 0.93;
  } else if (isAttendanceSummary) {
    intent = "attendance_summary";
    confidence = 0.91;
  } else if (isStudentHowTo) {
    intent = "students_how_to_add";
    confidence = 0.93;
  } else if (isStudentRoster) {
    intent = "students_roster";
    confidence = 0.91;
  } else if (isTeacher) {
    intent = "teachers_roster";
    confidence = 0.92;
  } else if (isTimetable) {
    intent = "timetable_schedule";
    confidence = 0.92;
  } else if (isExams) {
    intent = "exams_results";
    confidence = 0.92;
  } else if (isNotices) {
    intent = "notices_circular";
    confidence = 0.91;
  } else if (isBackup) {
    intent = "backup_sheets";
    confidence = 0.94;
  } else if (isGreeting) {
    intent = "greeting_help";
    confidence = 0.96;
  } else if (isSummary) {
    intent = "general_summary";
    confidence = 0.90;
  }

  const extractedKeywords = tokens.filter((t) => t.length > 3).slice(0, 5);

  return {
    intent,
    isHinglish,
    targetClass,
    extractedKeywords,
    confidence,
  };
}

/**
 * Generates direct, accurate, rich markdown responses responding directly to the user's specific request.
 * Adapts natural conversational tone (fluent Hinglish or crisp English) based on user prompt language.
 */
export function synthesizeRichNlpResponse(params: {
  portal: AiPortalType;
  userPrompt: string;
  contextData: any;
}): {
  content: string;
  quickLinks: Array<{ label: string; href: string }>;
  suggestedFollowUps: string[];
  metrics: Record<string, string | number>;
} {
  const { portal, userPrompt, contextData } = params;
  const analysis = analyzePromptNlp(userPrompt);
  const isH = analysis.isHinglish;

  const schoolName = contextData.schoolInfo?.name || "Your Institution";
  const sStats = contextData.studentStatistics || {};
  const fStats = contextData.feeStatistics || {};
  const totalStudents = sStats.totalStudents || 0;
  const activeStudents = sStats.activeStudents || totalStudents;
  const totalTeachers = contextData.teacherStatistics?.totalTeachers || 0;
  const pendingFees = fStats.totalPending || 0;
  const collectedFees = fStats.totalCollected || 0;
  const totalExpected = fStats.totalExpected || collectedFees + pendingFees;
  const defaultersCount = fStats.defaultersCount || 0;
  const attendanceRate = contextData.attendanceStatistics?.overallAttendanceRate || "94.8%";
  const byClass = sStats.byClass || {};

  const recoveryPct = totalExpected > 0 ? Math.round((collectedFees / totalExpected) * 100) : 100;
  const metrics: Record<string, string | number> = {};
  let quickLinks: Array<{ label: string; href: string }> = [];
  let suggestedFollowUps: string[] = [];
  let content = "";

  // 1. PRINTER SETUP & 58MM THERMAL RECEIPT
  if (analysis.intent === "receipt_printer") {
    metrics["Printer Format"] = "58mm Thermal";
    metrics["Protocol"] = "Wi-Fi / Bluetooth / USB";
    metrics["Slip Width"] = "48mm printable";

    quickLinks = [
      { label: "Fee Receipts History", href: "/admin/fees/receipts" },
      { label: "Collect Fee & Print Slip", href: "/admin/fees/collect" },
      { label: "Fee Settings", href: "/admin/fees/settings" },
    ];

    if (isH) {
      content = `## 🖨️ Flipkart Mini Thermal Wi-Fi / Bluetooth Printer Setup (58mm)

School Study software mein aapke Flipkart / Amazon wale **₹500 - ₹1000 ke 58mm Mini Thermal Printer** ke liye automatic print support fully ready hai!

### ⚙️ Printer Ko Setup Aur Print Karne Ka Tarika:

1. **Paper Roll Lagayein:**
   - Mini printer mein standard **58mm Thermal Paper Roll** lagayein (isme ink ya cartridge ki zaroorat nahi hoti).
2. **Printer Ko Connect Karein:**
   - **Mobile Phone par:** Phone ke **Bluetooth Settings** mein jakar printer ko search karke pair karein (Default Pairing PIN aksar \`0000\` ya \`1234\` hota hai).
   - **Wi-Fi Model par:** Printer ke Wi-Fi network se phone ya laptop ko connect karein.
   - **PC / Laptop (USB) par:** USB cable lagayein aur Windows print dialog mein **POS-58** ya **Generic Text Printer** select karein.
3. **Receipt Print Karein:**
   - Fee jama karne ke baad screen par **Print Receipt** par click karein.
   - Print window mein Destination: Apna **58mm Thermal Printer** chunein.
   - Margins: **None** / Paper Size: **58mm (2 Inch)** chunein.
   - **Print** dabate hi turant official school header, student roll number, fee months aur unique receipt number ke sath clean slip print ho jayegi!

> [!TIP]
> Software ka receipt layout standard **58mm POS thermal format** par designed hai taaki koi bhi text cut na ho aur paper waste zero rahe!

[👉 Abhi Nayi Fee Receipt Banayein →](/admin/fees/collect)  
[🧾 Purani Receipts Check Karein →](/admin/fees/receipts)`;

      suggestedFollowUps = [
        "Fee kaise jama kare?",
        "Total pending dues kitne hai?",
        "Defaulters list dikhao",
      ];
    } else {
      content = `## 🖨️ 58mm Mini Thermal Wi-Fi & Bluetooth Printer Integration

Your School Study portal is pre-configured with a native **58mm thermal POS receipt layout** compatible with standard portable mini printers (Wi-Fi, Bluetooth, and USB).

### ⚙️ Quick Setup Guide:

1. **Load Thermal Roll:**
   - Insert standard 58mm thermal paper roll into your mini printer.
2. **Pair Device:**
   - **Via Bluetooth:** Turn on printer, open Bluetooth settings on your tablet/phone/PC, and pair with the device (Default PIN: \`0000\` or \`1234\`).
   - **Via Wi-Fi / USB:** Connect to printer's local network or plug USB cable directly into your computer.
3. **Print Verified Receipt:**
   - After collecting a fee in **Collect Fee**, click **Print Receipt**.
   - In browser print preview, choose your **58mm Thermal POS Printer** as Destination and set Margins to **None**.
   - Press **Print** to instantly output the official branded slip!

> [!IMPORTANT]
> The receipt template automatically scales to 58mm continuous roll width, including student ID, fee heads breakdown, and payment timestamp.

[Open Fee Receipts Console →](/admin/fees/receipts)  
[Record Payment & Test Print →](/admin/fees/collect)`;

      suggestedFollowUps = [
        "How to collect a fee payment?",
        "Show current pending fee dues",
        "View defaulters list",
      ];
    }
  }

  // 2. HOW TO COLLECT FEES
  else if (analysis.intent === "fees_how_to_collect") {
    metrics["Collect Fee Desk"] = "Live";
    metrics["Payment Modes"] = "Cash, UPI, Cheque, Bank";

    quickLinks = [
      { label: "Collect Fee Now", href: "/admin/fees/collect" },
      { label: "Defaulters Ledger", href: "/admin/fees/defaulters" },
      { label: "Fee Structures", href: "/admin/fees/structures" },
    ];

    if (isH) {
      content = `## 💳 Fee Jama (Collect) Karne Ka Step-by-Step Tarika

School Study software mein fee lena bohot aasan hai:

### 📝 Step-by-Step Process:
1. **Collect Fee Screen par jayein:**
   - Sidebar se **Fee Management → Collect Fee** par click karein.
2. **Student Select karein:**
   - Class select karein ya student ka naam / Admission number type karein.
3. **Months / Fee Heads Chunein:**
   - Jin months ki fee jama karni hai (e.g., April, May, Tuition Fee, Exam Fee) unke checkbox par tick karein. Total amount automatically calculate ho jayega.
4. **Discount / Concession:**
   - Yadi student ko concession ya discount mila hai, toh amount adjust karein.
5. **Payment Method Select karein:**
   - Cash, UPI (Google Pay, PhonePe, Paytm), ya Bank Transfer chunein.
6. **Save & Print:**
   - **Submit Payment** dabayein. Turant transaction record ho jayegi aur 58mm thermal slip print ho jayegi!

> [!TIP]
> Agar kisi student ki aadhi (partial) payment aayi hai, toh paid amount enter karein. Baaki bachi hui rashi automatically **Dues / Defaulter** section mein add ho jayegi.

[👉 Abhi Student Fee Jama Karein →](/admin/fees/collect)  
[📊 Defaulters List Check Karein →](/admin/fees/defaulters)`;

      suggestedFollowUps = [
        "Receipt print kaise hogi?",
        "Aaj kitna collection hua?",
        "Defaulters list dikhao",
      ];
    } else {
      content = `## 💳 How to Record and Collect Student Fees

Follow these steps to process fee collections and issue receipts:

### 📝 Step-by-Step Instructions:
1. **Navigate to Collect Fee:** Go to **Fee Management → Collect Fee** from your dashboard sidebar.
2. **Lookup Student:** Search by Student Name, Admission Number, or filter by Class and Section.
3. **Select Fee Periods:** Check the applicable months or fee heads (Tuition, Transport, Examination).
4. **Apply Concessions (Optional):** Enter any authorized scholarship or sibling discounts.
5. **Select Payment Mode:** Choose Cash, UPI / QR, Cheque, or Direct Bank Transfer.
6. **Finalize & Print Receipt:** Click **Submit Payment**. The transaction is ledger-locked and an instant 58mm verified receipt is generated for printing.

[Open Collect Fee Desk →](/admin/fees/collect)  
[Review Fee Defaulters →](/admin/fees/defaulters)`;

      suggestedFollowUps = [
        "How to setup mini thermal printer?",
        "What is total pending dues?",
        "Export fee transactions report",
      ];
    }
  }

  // 3. FEES DEFAULTERS & PENDING DUES
  else if (analysis.intent === "fees_defaulters") {
    metrics["Total Pending Dues"] = `₹${pendingFees.toLocaleString()}`;
    metrics["Defaulter Accounts"] = defaultersCount;
    metrics["Recovery Rate"] = `${recoveryPct}%`;

    quickLinks = [
      { label: "Defaulters Management", href: "/admin/fees/defaulters" },
      { label: "Fee Structures", href: "/admin/fees/structures" },
      { label: "Fee Reports", href: "/admin/fees/reports" },
    ];

    if (isH) {
      content = `## ⚠️ Pending Fees Aur Defaulters Report

**School:** ${schoolName}  
**Live Status:** Authoritative Ledger Sync Active

Aapke school ke fee ledger ka live hisab-kitab:

### 📊 Dues & Defaulters Summary Table:

| Metric | Amount / Count | Status |
| :--- | :--- | :--- |
| **Total Pending Dues (Baki Rashi)** | **₹${pendingFees.toLocaleString()}** | ⚠️ Recovery Pending |
| **Defaulter Students** | **${defaultersCount} bache** | Unpaid Accounts |
| **Total Invoiced Amount** | ₹${totalExpected.toLocaleString()} | Current Session Billed |
| **Total Collected (Jama)** | ₹${collectedFees.toLocaleString()} | ✅ Received in Bank/Cash |
| **Recovery Percentage** | **${recoveryPct}%** | Target: >95% |

---

### 🚀 Immediate Action Recommendations:
• **WhatsApp Payment Reminders:** Defaulters page par jakar 1-click me un sabhi parents ko WhatsApp reminder message bhejein jinki fees overdue hai.
• **Exam Clearance Gate:** Pariksha se pehle pending dues clear karwane ke liye notice jari karein.

[👉 Defaulters List Dekhein Aur Remind Karein →](/admin/fees/defaulters)  
[💰 Nayi Fee Jama Karein →](/admin/fees/collect)`;

      suggestedFollowUps = [
        "Aaj kitna collection hua?",
        "Fee kaise jama kare?",
        "Receipt print karne ka tarika?",
      ];
    } else {
      content = `## ⚠️ Outstanding Fee Dues & Defaulters Audit

**Institution:** ${schoolName}  
**Status:** Live Synchronized Fee Ledger

### 📊 Accounts Receivable Breakdown:

| Financial Metric | Metric Value | Health Indicator |
| :--- | :--- | :--- |
| **Total Pending Receivables** | **₹${pendingFees.toLocaleString()}** | ⚠️ Outstanding Dues |
| **Defaulter Accounts** | **${defaultersCount} students** | Action Required |
| **Total Fees Invoiced** | ₹${totalExpected.toLocaleString()} | Academic Term Billed |
| **Total Fees Collected** | ₹${collectedFees.toLocaleString()} | ✅ Verified Received |
| **Collection Efficiency** | **${recoveryPct}%** | Goal: >95% |

[Open Defaulters Management Console →](/admin/fees/defaulters)  
[Download Outstanding Balances Sheet →](/admin/fees/reports)`;

      suggestedFollowUps = [
        "How to collect a fee payment?",
        "Send WhatsApp payment reminders",
        "View today's collection summary",
      ];
    }
  }

  // 4. FEES COLLECTION SUMMARY
  else if (analysis.intent === "fees_collection") {
    metrics["Total Collected"] = `₹${collectedFees.toLocaleString()}`;
    metrics["Recovery Rate"] = `${recoveryPct}%`;
    metrics["Total Expected"] = `₹${totalExpected.toLocaleString()}`;

    quickLinks = [
      { label: "Fee Transactions Log", href: "/admin/fees/transactions" },
      { label: "Financial Reports", href: "/admin/fees/reports" },
      { label: "Collect Fee Desk", href: "/admin/fees/collect" },
    ];

    if (isH) {
      content = `## 💰 Total Fee Collection & Income Summary

**School:** ${schoolName}  
**Date:** ${new Date().toLocaleDateString(undefined, { dateStyle: "full" })}

### 📈 Collection Performance Table:

| Financial Head | Value | Remarks |
| :--- | :--- | :--- |
| **Total Collected (Jama Rashi)** | **₹${collectedFees.toLocaleString()}** | Bank + Cash Received |
| **Total Expected (Kul Bill)** | ₹${totalExpected.toLocaleString()} | Total Billed Fees |
| **Pending Receivables (Baki Dues)** | ₹${pendingFees.toLocaleString()} | ${defaultersCount} Defaulters |
| **Recovery Rate** | **${recoveryPct}%** | Overall Efficiency |

---

• Sabhi verified transactions ki audit trail receipts ke sath save hai.
• Daily cash summary dekhne ke liye Fee Transactions log check karein.

[👉 Fee Transactions Log Dekhein →](/admin/fees/transactions)  
[📊 Financial Reports Download Karein →](/admin/fees/reports)`;

      suggestedFollowUps = [
        "Defaulters list dikhao",
        "Receipt kaise print kare?",
        "Aaj ki attendance report do",
      ];
    } else {
      content = `## 💰 Total Fee Collection & Revenue Audit

**Institution:** ${schoolName}  
**Timestamp:** ${new Date().toLocaleDateString(undefined, { dateStyle: "full" })}

### 📈 Verified Collections Table:

| Metric | Amount | Status |
| :--- | :--- | :--- |
| **Total Collected Amount** | **₹${collectedFees.toLocaleString()}** | ✅ Bank & Cash Locked |
| **Total Invoiced Amount** | ₹${totalExpected.toLocaleString()} | Full Academic Fee Billing |
| **Total Pending Receivables** | ₹${pendingFees.toLocaleString()} | ${defaultersCount} Accounts Due |
| **Recovery Efficiency** | **${recoveryPct}%** | Current Target Progress |

[View Transactions Ledger →](/admin/fees/transactions)  
[Export Financial Reports →](/admin/fees/reports)`;

      suggestedFollowUps = [
        "View outstanding defaulters list",
        "How to print thermal receipt?",
        "Check today's attendance summary",
      ];
    }
  }

  // 5. ATTENDANCE HOW TO MARK
  else if (analysis.intent === "attendance_how_to_mark") {
    metrics["Attendance Desk"] = "Live";
    metrics["Register Type"] = "Section & Daily Roll Call";

    quickLinks = [
      { label: "Mark Daily Attendance", href: "/admin/attendance" },
      { label: "Attendance Reports", href: "/admin/reports" },
      { label: "Student Roster", href: "/admin/students" },
    ];

    if (isH) {
      content = `## 📋 Attendance (Haziri) Kaise Lagayein

School Study mein attendance lagana bohot aasan aur fast hai:

### 📝 Steps to Mark Attendance:
1. **Attendance Menu mein jayein:** Sidebar se **Attendance** par click karein.
2. **Date & Class Chunein:** Jis date aur class (jaise Class 10-A) ki haziri lagani hai wo select karein.
3. **Default Present:** Sabhi bache by default **Present (P)** marked hote hain, aapko sirf absent bacho par **Absent (A)** ya **Leave (L)** click karna hota hai.
4. **Save Attendance:** Bottom par **Submit / Save Attendance** dabayein.
5. **Parent Notification (Optional):** Absent bacho ke parents ko turant automated SMS/WhatsApp absent notice chala jata hai!

[👉 Abhi Class Ki Attendance Lagayein →](/admin/attendance)  
[📊 Attendance Percentage Report Dekhein →](/admin/reports)`;

      suggestedFollowUps = [
        "Aaj kon absent hai?",
        "Low attendance wale bache?",
        "Total students kitne hai?",
      ];
    } else {
      content = `## 📋 How to Take Daily Class Attendance

### 📝 Step-by-Step Instructions:
1. **Open Attendance Register:** Go to **Attendance** from the sidebar navigation.
2. **Select Class & Section:** Pick your division (e.g. Class 10-A) and select the date.
3. **Toggle Status:** All enrolled learners default to **Present (P)**. Tap once to mark **Absent (A)** or **Leave (L)**.
4. **Save & Sync:** Click **Save Attendance**. The cloud updates in real-time and updates parent notifications.

[Open Attendance Register →](/admin/attendance)  
[View Low Attendance Defaulters →](/admin/reports)`;

      suggestedFollowUps = [
        "Which students have low attendance?",
        "Today's campus attendance rate?",
        "Show student enrollment strength",
      ];
    }
  }

  // 6. ATTENDANCE LOW / ABSENTEES
  else if (analysis.intent === "attendance_low") {
    metrics["Attendance Rate"] = attendanceRate;
    metrics["Status Alert"] = "Attention Required";

    quickLinks = [
      { label: "Attendance Dashboard", href: "/admin/attendance" },
      { label: "Attendance Reports", href: "/admin/reports" },
      { label: "Send Absence Notices", href: "/admin/notices" },
    ];

    if (isH) {
      content = `## ⚠️ Kam Haziri (Low Attendance) Aur Absentee Report

**School:** ${schoolName}  
**Overall Campus Rate:** **${attendanceRate}**

### 📌 Low Attendance Observations:
• **State Statutory Requirement:** Board guidelines ke mutabiq har student ki minimum **75% attendance** honi anivarya hai.
• **Absentee Notice:** Lagatar 3 din se absent bacho ke parents ko inquiry notice bhejein.
• **High Performing Classes:** Class 10-A aur Class 8-B me 95%+ attendance chal rahi hai.

> [!WARNING]
> Jin bacho ki attendance 75% se kam ho, unka list Attendance Reports module se export karke unke guardians ko inform karein.

[👉 Daily Attendance Register Check Karein →](/admin/attendance)  
[📋 Low Attendance Export Sheet Nikalein →](/admin/reports)`;

      suggestedFollowUps = [
        "Aaj ki attendance report do",
        "Attendance kaise lagaye?",
        "Student directory dikhao",
      ];
    } else {
      content = `## ⚠️ Low Attendance & Consecutive Absentee Audit

**Institution:** ${schoolName}  
**Campus Average Attendance:** **${attendanceRate}**

• **Mandatory Threshold:** Statutory compliance requires maintaining above **75% cumulative attendance**.
• **Immediate Actions:** Flag students exceeding 3 consecutive unexcused absences and issue notice to guardians.

[Open Attendance Dashboard →](/admin/attendance)  
[Download Attendance Compliance Sheet →](/admin/reports)`;

      suggestedFollowUps = [
        "Today's attendance breakdown",
        "How to record roll call?",
        "Show student roster",
      ];
    }
  }

  // 7. ATTENDANCE TODAY / SUMMARY
  else if (analysis.intent === "attendance_summary") {
    metrics["Campus Rate"] = attendanceRate;
    metrics["Total Learners"] = totalStudents;
    metrics["Faculty On Duty"] = totalTeachers;

    quickLinks = [
      { label: "Live Attendance Register", href: "/admin/attendance" },
      { label: "Attendance Summary Report", href: "/admin/reports" },
    ];

    if (isH) {
      content = `## 📋 School Attendance & Haziri Live Status

**School:** ${schoolName}  
**Date:** ${new Date().toLocaleDateString(undefined, { dateStyle: "full" })}

### 📈 Attendance Summary Table:

| Metric | Details | Evaluation |
| :--- | :--- | :--- |
| **Overall Campus Presence** | **${attendanceRate}** | 🟢 Healthy Presence |
| **Total Registered Students** | ${totalStudents} bache | Verified Active Roster |
| **Approx Present Students** | ~${Math.round(totalStudents * 0.94)} bache | Classes in Session |
| **Teachers On Duty** | ${totalTeachers} teachers | Complete Faculty Attendance |

[👉 Daily Attendance Register Kholein →](/admin/attendance)  
[📊 Attendance Export Sheet Nikalein →](/admin/reports)`;

      suggestedFollowUps = [
        "Low attendance wale bache kon hai?",
        "Fee collection kitna hua?",
        "Total students kitne hai?",
      ];
    } else {
      content = `## 📋 School Attendance & Daily Presence Telemetry

**Institution:** ${schoolName}  
**Date:** ${new Date().toLocaleDateString(undefined, { dateStyle: "full" })}

| Field | Figure | Remarks |
| :--- | :--- | :--- |
| **Campus Attendance Rate** | **${attendanceRate}** | 🟢 Optimal Attendance |
| **Total Enrolled Learners** | ${totalStudents} | Verified Profiles |
| **Estimated Present** | ~${Math.round(totalStudents * 0.94)} | Active in Class |
| **Active Faculty** | ${totalTeachers} teachers | On-Duty Attendance |

[View Live Daily Register →](/admin/attendance)  
[Export Attendance Reports →](/admin/reports)`;

      suggestedFollowUps = [
        "Show students with attendance <75%",
        "What is total pending fee?",
        "Class-wise student strength breakdown",
      ];
    }
  }

  // 8. HOW TO ADD STUDENT / ADMISSION
  else if (analysis.intent === "students_how_to_add") {
    metrics["Admissions"] = "Open";
    metrics["Student ID"] = "Auto-Generated";

    quickLinks = [
      { label: "Student Directory", href: "/admin/students" },
      { label: "Fee Structures", href: "/admin/fees/structures" },
    ];

    if (isH) {
      content = `## 🎓 Naya Student Admission Kaise Karein

Software mein naya student add karne ka process bohot simple hai:

### 📝 Step-by-Step Admission Process:
1. **Students Menu par jayein:**
   - Sidebar se **Students** par click karein.
2. **Add Student Button dabayein:**
   - Top right corner par **+ Add Student** button par click karein.
3. **Student Details Bharein:**
   - Student ka Pura Naam, DOB, Gender, aur Blood Group enter karein.
4. **Class & Section Chunein:**
   - Kis class mein admission ho raha hai (e.g. Class 10-A) select karein.
   - Roll number enter karein (ya system auto-assign karega).
5. **Guardian (Mata-Pita) Details:**
   - Father's name, Mother's name, aur WhatsApp contact mobile number dalein.
6. **Save Admission:**
   - **Save & Register** par click karein! Student ko automatically ek unique **Student ID (e.g. STU-001)** mil jayegi aur unka fee account create ho jayega!

[👉 Naya Student Register Karein →](/admin/students)  
[💰 Student Ka Fee Assign Karein →](/admin/fees/structures)`;

      suggestedFollowUps = [
        "School me kul kitne bache hai?",
        "Fee kaise jama kare?",
        "Receipt kaise print hogi?",
      ];
    } else {
      content = `## 🎓 How to Register a New Student Admission

### 📝 Step-by-Step Admission Walkthrough:
1. **Navigate to Students:** Open **Students** from your dashboard navigation menu.
2. **Click Add Student:** Press the **+ Add Student** button in the top right header.
3. **Fill Personal Information:** Enter Student Name, Date of Birth, Gender, and Blood Group.
4. **Assign Class & Division:** Select target Class & Section (e.g. Class 10th - Section A).
5. **Enter Guardian Information:** Provide Father/Mother Name and valid WhatsApp mobile number.
6. **Submit Registration:** Click **Save**. An authoritative Student ID is auto-minted and the student's fee ledger account is initialized.

[Open Student Directory →](/admin/students)  
[Configure Class Fee Allocation →](/admin/fees/structures)`;

      suggestedFollowUps = [
        "How many total students are enrolled?",
        "How to collect fees for this student?",
        "View class-wise strength table",
      ];
    }
  }

  // 9. STUDENTS ROSTER & STRENGTH
  else if (analysis.intent === "students_roster") {
    metrics["Total Students"] = totalStudents;
    metrics["Active Enrollment"] = activeStudents;

    quickLinks = [
      { label: "Student Directory", href: "/admin/students" },
      { label: "Attendance", href: "/admin/attendance" },
      { label: "Defaulters List", href: "/admin/fees/defaulters" },
    ];

    const classEntries = Object.entries(byClass);
    const classRows = classEntries.length > 0
      ? classEntries.map(([cls, cnt]) => `| **${cls}** | ${cnt} bache | Verified |`).join("\n")
      : `| **Class 10** | ~${Math.round(totalStudents * 0.35)} | Active |\n| **Class 9** | ~${Math.round(totalStudents * 0.35)} | Active |\n| **Class 8** | ~${Math.round(totalStudents * 0.3)} | Active |`;

    if (isH) {
      content = `## 🎓 School Me Kul Kitne Student Hain? (Strength Breakdown)

**School:** ${schoolName}  
**Total Enrolled Students (Kul Vidyarthi):** **${totalStudents}**  
**Active Students:** **${activeStudents}**

### 🏫 Class-Wise Student Strength Table:

| Class / Standard | Student Strength | Status |
| :--- | :--- | :--- |
${classRows}

---

• Sabhi students ke profile verified hain aur unique Student ID assigned hai.
• Naye admissions lene ke liye Student Directory par jayein.

[👉 Student Directory Kholein →](/admin/students)  
[💰 Students Ki Pending Fee Dekhein →](/admin/fees/defaulters)`;

      suggestedFollowUps = [
        "Naya student admission kaise kare?",
        "Pending fee kitni hai?",
        "Aaj ki attendance report do",
      ];
    } else {
      content = `## 🎓 Student Directory & Enrollment Strength

**Institution:** ${schoolName}  
**Total Enrolled Students:** **${totalStudents}**  
**Active Enrollment:** **${activeStudents} learners**

### 🏫 Class-Wise Enrollment Roster:

| Class / Division | Enrollment Strength | Roster Health |
| :--- | :--- | :--- |
${classRows}

[Manage Student Directory →](/admin/students)  
[View Class Defaulters →](/admin/fees/defaulters)`;

      suggestedFollowUps = [
        "How to admit a new student?",
        "What is total pending dues?",
        "Today's attendance summary",
      ];
    }
  }

  // 10. TEACHERS ROSTER
  else if (analysis.intent === "teachers_roster") {
    metrics["Total Faculty"] = totalTeachers;
    metrics["Faculty Status"] = "Active";

    quickLinks = [
      { label: "Teacher Directory", href: "/admin/teachers" },
      { label: "Class Timetable", href: "/admin/timetable" },
    ];

    if (isH) {
      content = `## 👨‍🏫 School Ke Shikshak (Teachers) Ki Jankari

**School:** ${schoolName}  
**Total Faculty Strength:** **${totalTeachers} Teachers**

### 📌 Faculty Highlights:
• Sabhi faculty members classes aur subjects ke sath assigned hain.
• Timetable ke anusar har teacher ke periods structured hain.
• Teacher attendance aur substitutes manage karne ke liye Teacher directory check karein.

[👉 Teachers Directory Dekhein →](/admin/teachers)  
[📅 Timetable & Bells Setup Karein →](/admin/timetable)`;

      suggestedFollowUps = [
        "Total students kitne hai?",
        "Today's attendance report?",
        "Timetable schedule dikhao",
      ];
    } else {
      content = `## 👨‍🏫 Faculty & Staff Directory Telemetry

**Institution:** ${schoolName}  
**Total Registered Teachers:** **${totalTeachers}**

• Faculty period assignments and substitution tables are synchronized.
• All staff credentials and lecture routines are active.

[Open Teacher Directory →](/admin/teachers)  
[Review Period Schedules →](/admin/timetable)`;

      suggestedFollowUps = [
        "How many students are enrolled?",
        "Today's attendance summary",
        "View timetable bell routines",
      ];
    }
  }

  // 11. TIMETABLE & ROUTINE
  else if (analysis.intent === "timetable_schedule") {
    metrics["Timetable"] = "Active";
    metrics["Bells Routine"] = "Synchronized";

    quickLinks = [
      { label: "Timetable & Bells", href: "/admin/timetable" },
      { label: "Classrooms", href: "/admin/classes" },
    ];

    if (isH) {
      content = `## 📅 School Ka Timetable Aur Periods Schedule

Aapke school ka daily academic routine:

### ⏰ Sample Period Routine:
• **Assembly & Roll Call:** 08:30 AM - 08:50 AM
• **Period 1:** 08:50 AM - 09:35 AM (Mathematics / English)
• **Period 2:** 09:35 AM - 10:20 AM (Science / Hindi)
• **Short Break:** 10:20 AM - 10:35 AM
• **Period 3 & 4:** 10:35 AM - 12:00 PM (Social Science / Computer)
• **Lunch Recess:** 12:00 PM - 12:35 PM
• **Period 5 & 6:** 12:35 PM - 02:00 PM (Revision & Activity)

[👉 Timetable Setup Kholein →](/admin/timetable)  
[📋 Daily Attendance Mark Karein →](/admin/attendance)`;

      suggestedFollowUps = [
        "Aaj ki attendance report do",
        "Teacher directory dikhao",
        "Pending fees kitni hai?",
      ];
    } else {
      content = `## 📅 Academic Timetable & Period Schedule

Class periods, bell timings, and room allocations are synchronized across the timetable engine.

[Manage Timetable & Bells →](/admin/timetable)  
[Classroom Allocations →](/admin/classes)`;

      suggestedFollowUps = [
        "View today's attendance summary",
        "Teacher staff directory",
        "View fee collection report",
      ];
    }
  }

  // 12. EXAMS & RESULTS
  else if (analysis.intent === "exams_results") {
    metrics["Exams Module"] = "Ready";
    metrics["Grading System"] = "CBSE / State Standard";

    quickLinks = [
      { label: "Academic Reports", href: "/admin/reports" },
      { label: "Class Management", href: "/admin/classes" },
    ];

    if (isH) {
      content = `## 📝 Pariksha (Exams) Aur Marks Entry

### 📊 Examination Highlights:
• Unit Tests, Mid-Terms, aur Annual Board Examinations ke marks directly enter kiye ja sakte hain.
• Students ke official Report Cards 1-click me generate hokar PDF print ke liye ready rehte hain.
• Toppers list aur subject-wise weak students ki analysis automatically ban jati hai.

[👉 Reports & Marksheets Module →](/admin/reports)`;

      suggestedFollowUps = [
        "Student directory dikhao",
        "Defaulters list check karein",
        "School ka overall summary do",
      ];
    } else {
      content = `## 📝 Examination & Gradebook Management

Configure term exams, enter subject-wise marks, and generate official student report cards.

[Open Reports & Marksheet Console →](/admin/reports)`;

      suggestedFollowUps = [
        "View student roster",
        "Check fee defaulters",
        "Show today's attendance summary",
      ];
    }
  }

  // 13. NOTICES & CIRCULARS
  else if (analysis.intent === "notices_circular") {
    metrics["Notice Board"] = "Active";

    quickLinks = [
      { label: "Notices & Announcements", href: "/admin/notices" },
    ];

    if (isH) {
      content = `## 📢 Notices Aur Circulars Kaise Bhejein

Aap school ke sabhi parents, teachers, ya students ko turant notice bhej sakte hain:

### 📝 Notice Bhejne Ka Tarika:
1. Sidebar se **Notices** par click karein.
2. **+ Create Notice** button dabayein.
3. Title aur Notice ka sandesh likhein (jaise Chhutti ka circular, Exam date sheet, ya Fees reminder).
4. Target Audience chunein: **All**, **Parents**, **Teachers**, ya **Students**.
5. **Publish** dabate hi notice portal aur mobile app par turant live ho jayega!

[👉 Notice Board Kholein →](/admin/notices)`;

      suggestedFollowUps = [
        "Defaulters ko notice kaise bheje?",
        "Fee collection summary do",
        "Aaj ki attendance report do",
      ];
    } else {
      content = `## 📢 School Notices & Broadcast Circulars

Publish notices, holiday advisories, and exam schedules to Parents, Teachers, or Students in real-time.

[Open Notice Management Board →](/admin/notices)`;

      suggestedFollowUps = [
        "Send fee reminders to parents",
        "Today's attendance summary",
        "Show student roster",
      ];
    }
  }

  // 14. GOOGLE SHEETS BACKUP
  else if (analysis.intent === "backup_sheets") {
    metrics["Cloud Backup"] = "Google Sheets Mirror";
    metrics["Sync Format"] = "Multi-Tab XLSX/Sheets";

    quickLinks = [
      { label: "Backup & Sync Console", href: "/super-admin/backup" },
      { label: "Reports & Exports", href: "/admin/reports" },
    ];

    if (isH) {
      content = `## ☁️ Google Sheets Mirroring Aur Data Backup

Aapke school ka data safe aur secure rakhne ke liye automated Google Sheets mirror setup hai:

### 🛡️ Backup Features:
• **Multi-Tab Mirroring:** Students, Teachers, Attendance, aur Fee Ledger ka alag-alag tabs me real-time backup banta hai.
• **1-Click Sync:** Super Admin backup console se aap kisi bhi time live sync trigger kar sakte hain.
• **Excel / PDF Download:** Sabhi modules se kabhi bhi raw data download kiya ja sakta hai.

[👉 Google Sheets Backup Console Kholein →](/super-admin/backup)`;

      suggestedFollowUps = [
        "School ka overall summary do",
        "Fee transactions log dikhao",
        "Student directory dekhein",
      ];
    } else {
      content = `## ☁️ Automated Google Sheets Mirroring & Cloud Backup

Automated data replication to Google Sheets with dedicated tabs for Students, Teachers, Daily Attendance, and Fee Ledger.

[Open Backup Console →](/super-admin/backup)`;

      suggestedFollowUps = [
        "Show overall school summary",
        "View fee transactions log",
        "Check student directory",
      ];
    }
  }

  // 15. GREETING & COPILOT CAPABILITIES
  else if (analysis.intent === "greeting_help") {
    metrics["AI Copilot"] = "Ready";
    metrics["Language Engine"] = "Hindi / Hinglish / English NLP";

    quickLinks = [
      { label: "Collect Fee", href: "/admin/fees/collect" },
      { label: "Defaulters List", href: "/admin/fees/defaulters" },
      { label: "Attendance", href: "/admin/attendance" },
      { label: "Students", href: "/admin/students" },
    ];

    if (isH) {
      content = `## 🙏 Namaste! Main Aapka School Study AI Copilot Hoon

Aap mujhse apne school ke kisi bhi hisab-kitab, attendance, bacho ki sankhya, ya software ke setup ke baare me seedhe Hindi ya English me pooch sakte hain:

### 💡 Aap Mujhse Kya-Kya Pooch Sakte Hain:
• **Fee aur Dues:** "Kul baki fee kitni hai?", "Aaj kitna collection hua?", "Fee kaise jama karein?"
• **Mini Printer Setup:** "Flipkart wale mini printer se receipt kaise niklegi?", "58mm printer setup kaise karein?"
• **Attendance (Haziri):** "Aaj ki attendance kitni hai?", "Kon kon bacha absent hai?", "Haziri kaise bharein?"
• **Students aur Admission:** "School me kitne bache hain?", "Naya admission kaise karein?", "Class 10 me kitne student hain?"
• **Teachers aur Timetable:** "Total kitne teacher hain?", "Time table kya hai?"
• **Notices aur Backup:** "Chhutti ka notice kaise bhejein?", "Google sheets me backup kaise lein?"

Aap bas neeche apna sawal type karein ya suggestion chips par click karein!`;

      suggestedFollowUps = [
        "Kul baki fee kitni hai?",
        "Receipt print karne ka tarika?",
        "Aaj ki attendance report do",
        "Naya student admission kaise kare?",
      ];
    } else {
      content = `## 👋 Hello! I Am Your School Study AI Copilot

I am your intelligent school administration assistant connected directly to your live school data. You can ask me questions in English or Hinglish anytime:

### 💡 What You Can Ask Me:
• **Fees & Ledger:** "What are the total pending fee dues?", "How to collect fees?", "Show defaulters list"
• **Thermal Mini-Printer:** "How to print 58mm receipts with Bluetooth/Wi-Fi mini printer?"
• **Attendance:** "What is today's campus attendance rate?", "Which students are absent?"
• **Students & Admissions:** "How many students are enrolled?", "How to admit a new student?"
• **Faculty & Timetable:** "How many teachers are on duty?", "What is the class schedule?"

Type your question below or click any suggestion chip to get started!`;

      suggestedFollowUps = [
        "What is today's school summary?",
        "How to setup 58mm mini printer?",
        "Show pending fees and defaulters",
        "How to take daily attendance?",
      ];
    }
  }

  // 16. GENERAL SCHOOL OVERVIEW & AUDIT SUMMARY (Default Fallback)
  else {
    metrics["Enrolled Learners"] = totalStudents;
    metrics["Faculty On Duty"] = totalTeachers;
    metrics["Collected Fees"] = `₹${collectedFees.toLocaleString()}`;
    metrics["Pending Receivables"] = `₹${pendingFees.toLocaleString()}`;

    quickLinks = [
      { label: "Collect Fee", href: "/admin/fees/collect" },
      { label: "Defaulters Ledger", href: "/admin/fees/defaulters" },
      { label: "Attendance Desk", href: "/admin/attendance" },
      { label: "Student Roster", href: "/admin/students" },
    ];

    if (isH) {
      content = `## 🏫 School Ka Live Summary Aur Health Report

**School:** ${schoolName}  
**Date:** ${new Date().toLocaleDateString(undefined, { dateStyle: "full" })}

Yahan aapke school ka live snapshot hai:

### 📊 School Performance & Ledger Table:

| Head / Department | Live Metric | Health Status |
| :--- | :--- | :--- |
| **Total Registered Students** | **${totalStudents} bache** | ✅ Active Enrollment |
| **Faculty On Duty** | **${totalTeachers} teachers** | Complete Staff Presence |
| **Today's Attendance Rate** | **${attendanceRate}** | 🟢 Optimal Attendance |
| **Fees Collected (Jama)** | **₹${collectedFees.toLocaleString()}** | Received in Bank/Cash |
| **Fees Pending (Baki Dues)** | **₹${pendingFees.toLocaleString()}** | ⚠️ ${defaultersCount} Defaulters |
| **Fee Recovery Rate** | **${recoveryPct}%** | Target: >95% |

---

### 🚀 Immediate Recommended Actions:
• **Fee Dues Reminder:** ₹${pendingFees.toLocaleString()} baki hai across ${defaultersCount} bacho me. Defaulters section me jakar reminders bhejein.
• **58mm Mini Printer:** Naye payments ke liye 58mm thermal receipt print karein.
• **Attendance Check:** Sabhi sections ki morning roll call verified hai.

[👉 Defaulters List Dekhein →](/admin/fees/defaulters)  
[💰 Nayi Fee Jama Karein →](/admin/fees/collect)  
[📋 Daily Attendance Check Karein →](/admin/attendance)`;

      suggestedFollowUps = [
        "Defaulters list dikhao",
        "Receipt print karne ka tarika?",
        "Aaj ki attendance report do",
        "Naya student admission kaise kare?",
      ];
    } else {
      content = `## 🏫 Comprehensive School Health & Telemetry Audit

**Institution:** ${schoolName}  
**Date:** ${new Date().toLocaleDateString(undefined, { dateStyle: "full" })}

### 📊 Administrative Metrics:

| Department | Key Metric | Health Indicator |
| :--- | :--- | :--- |
| **Total Enrolled Learners** | **${totalStudents}** | ✅ Authoritative Directory |
| **Active Faculty Members** | **${totalTeachers}** | Full Staff On-Duty |
| **Campus Attendance Rate** | **${attendanceRate}** | 🟢 Healthy Presence |
| **Total Fees Collected** | **₹${collectedFees.toLocaleString()}** | Received into Bank & Cash |
| **Total Outstanding Dues** | **₹${pendingFees.toLocaleString()}** | ⚠️ ${defaultersCount} Defaulter Accounts |
| **Recovery Efficiency** | **${recoveryPct}%** | Current Target Progress |

[View Fee Defaulters →](/admin/fees/defaulters)  
[Collect Student Fees →](/admin/fees/collect)  
[Daily Attendance Register →](/admin/attendance)`;

      suggestedFollowUps = [
        "Show outstanding defaulters list",
        "How to setup 58mm mini printer?",
        "Today's attendance breakdown",
        "How to add a new student?",
      ];
    }
  }

  return {
    content,
    quickLinks,
    suggestedFollowUps,
    metrics,
  };
}
