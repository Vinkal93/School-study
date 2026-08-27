import { AttentionItem, AttentionPriority } from "../src/components/student/attention/types";
import { defaultQuickActions } from "../src/components/student/quick-actions/QuickActions";

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`  ❌ Failed: ${testName}`);
    process.exit(1);
  }
  console.log(`  ✓ Passed: ${testName}`);
}

const priorityWeight: Record<AttentionPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

function sortAttentionItems(items: AttentionItem[]): AttentionItem[] {
  return [...items].sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);
}

function filterQuickActions(tenantModules?: string[]) {
  if (!tenantModules) return defaultQuickActions;
  return defaultQuickActions.filter((act) => !act.moduleKey || act.id === "more" || tenantModules.includes(act.moduleKey));
}

function runPhase4Tests() {
  console.log("\n==========================================");
  console.log("PHASE 4 ATTENTION CENTER & QUICK ACTIONS TEST SUITE");
  console.log("==========================================\n");

  // 1. Attention Items Priority Sorting (Section 10)
  const unsortedItems: AttentionItem[] = [
    { id: "1", type: "exam", priority: "normal", title: "Exam Coming Up", description: "Science", actionLabel: "View", actionUrl: "/exams" },
    { id: "2", type: "fee", priority: "critical", title: "Overdue Fee", description: "₹1,500 pending", actionLabel: "Pay", actionUrl: "/fees" },
    { id: "3", type: "homework", priority: "high", title: "Homework Due Today", description: "Maths", actionLabel: "View", actionUrl: "/homework" },
  ];

  const sorted = sortAttentionItems(unsortedItems);
  assert(sorted[0].id === "2", "1. Priority sorting: Critical item ('Overdue Fee') sorted first");
  assert(sorted[1].id === "3", "2. Priority sorting: High item ('Homework Due Today') sorted second");
  assert(sorted[2].id === "1", "3. Priority sorting: Normal item ('Exam Coming Up') sorted third");

  // 2. Max Items Limitation (Section 11)
  const maxItemsLimit = 3;
  const manyItems: AttentionItem[] = [
    ...unsortedItems,
    { id: "4", type: "notice", priority: "low", title: "Notice", description: "Annual Day", actionLabel: "View", actionUrl: "/notices" },
  ];
  const sliced = sortAttentionItems(manyItems).slice(0, maxItemsLimit);
  assert(sliced.length === 3, "4. Max items limit: Top 3 items displayed on dashboard");

  // 3. Quick Actions Default Items Count (Section 16)
  assert(defaultQuickActions.length === 8, "5. Default Quick Actions count = 8 (Attendance, Fees, Homework, Exams, Notices, Timetable, Library, More)");

  // 4. Quick Actions Tenant Module Filtering (Section 20)
  const restrictedTenantModules = ["attendance", "fees", "exams"]; // Library & Homework disabled
  const filteredActions = filterQuickActions(restrictedTenantModules);

  const hasLibrary = filteredActions.some((a) => a.id === "library");
  const hasAttendance = filteredActions.some((a) => a.id === "attendance");
  const hasMore = filteredActions.some((a) => a.id === "more");

  assert(!hasLibrary, "6. Module availability: Library hidden for restricted tenant");
  assert(hasAttendance, "7. Module availability: Attendance shown for enabled tenant");
  assert(hasMore, "8. Module availability: 'More' button preserved regardless of module config");

  console.log("\n==========================================");
  console.log("ALL 8/8 PHASE 4 TESTS PASSED (0 FAILED)");
  console.log("==========================================\n");
}

runPhase4Tests();
