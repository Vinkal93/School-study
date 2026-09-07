import fs from "fs";
import path from "path";

async function runTests() {
  console.log("=== RUNNING LIQUID GLASS & STUDENT NAV TESTS ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  }

  // 1. Check student-navigation.ts
  const navFilePath = path.resolve("src/lib/config/student-navigation.ts");
  const navContent = fs.readFileSync(navFilePath, "utf8");
  assert(navContent.includes('"home"') && navContent.includes('"study"') && navContent.includes('"attendance"') && navContent.includes('"fees"') && navContent.includes('"more"'), "student-navigation.ts contains all 5 bottom nav items");

  // 2. Check PortalUIVersion in src/types/portal-ui.ts
  const typesFilePath = path.resolve("src/types/portal-ui.ts");
  const typesContent = fs.readFileSync(typesFilePath, "utf8");
  assert(typesContent.includes('"liquid_glass"'), "src/types/portal-ui.ts includes 'liquid_glass'");

  // 3. Check portal-ui service normalization
  const serviceFilePath = path.resolve("src/lib/services/portal-ui.service.ts");
  const serviceContent = fs.readFileSync(serviceFilePath, "utf8");
  assert(serviceContent.includes('val === "liquid_glass" || val === "liquid"'), "src/lib/services/portal-ui.service.ts normalizes 'liquid_glass'");

  // 4. Check super-admin portal-ui API route
  const routeFilePath = path.resolve("src/app/api/super-admin/portal-ui/route.ts");
  const routeContent = fs.readFileSync(routeFilePath, "utf8");
  assert(routeContent.includes('"liquid_glass"'), "API route supports 'liquid_glass'");

  // 5. Check super-admin portal-ui page 3 options
  const portalUiPagePath = path.resolve("src/app/(dashboard)/super-admin/portal-ui/page.tsx");
  const portalUiPageContent = fs.readFileSync(portalUiPagePath, "utf8");
  assert(portalUiPageContent.includes('"liquid_glass"'), "super-admin/portal-ui page has liquid_glass selector");
  assert(portalUiPageContent.includes("Droplets"), "super-admin/portal-ui page has Droplets icon");

  // 6. Check StudentNavDrawer exists and has all essential features
  const drawerFilePath = path.resolve("src/components/student/navigation/StudentNavDrawer.tsx");
  const drawerContent = fs.readFileSync(drawerFilePath, "utf8");
  assert(drawerContent.includes("useMobileNav"), "StudentNavDrawer uses useMobileNav");
  assert(drawerContent.includes("signOut"), "StudentNavDrawer has logout functionality");
  assert(drawerContent.includes("Sign Out of Student Account"), "StudentNavDrawer has sign out label");
  assert(drawerContent.includes("academicLinks"), "StudentNavDrawer has academic links");

  // 7. Check shells mount StudentNavDrawer
  const studentShellPath = path.resolve("src/components/student/StudentShell.tsx");
  const studentShellContent = fs.readFileSync(studentShellPath, "utf8");
  assert(studentShellContent.includes("<StudentNavDrawer />"), "StudentShell mounts StudentNavDrawer");

  const newStudentShellPath = path.resolve("src/components/portal-ui/shells/NewStudentShell.tsx");
  const newStudentShellContent = fs.readFileSync(newStudentShellPath, "utf8");
  assert(newStudentShellContent.includes("<StudentNavDrawer />"), "NewStudentShell mounts StudentNavDrawer");

  // 8. Check Liquid Glass shells exist
  const lqStudentPath = path.resolve("src/components/portal-ui/shells/LiquidGlassStudentShell.tsx");
  const lqStudentContent = fs.readFileSync(lqStudentPath, "utf8");
  assert(lqStudentContent.includes("LiquidGlassStudentShell"), "LiquidGlassStudentShell created");
  assert(lqStudentContent.includes("<StudentNavDrawer />"), "LiquidGlassStudentShell mounts StudentNavDrawer");

  const lqDashboardPath = path.resolve("src/components/portal-ui/shells/LiquidGlassDashboardShell.tsx");
  const lqDashboardContent = fs.readFileSync(lqDashboardPath, "utf8");
  assert(lqDashboardContent.includes("LiquidGlassDashboardShell"), "LiquidGlassDashboardShell created");

  const lqLandingPath = path.resolve("src/components/landing/LiquidGlassLandingPage.tsx");
  const lqLandingContent = fs.readFileSync(lqLandingPath, "utf8");
  assert(lqLandingContent.includes("LiquidGlassLandingPage"), "LiquidGlassLandingPage created");

  // 9. Check layout and switches
  const dashLayoutPath = path.resolve("src/app/(dashboard)/layout.tsx");
  const dashLayoutContent = fs.readFileSync(dashLayoutPath, "utf8");
  assert(dashLayoutContent.includes("LiquidGlassDashboardShell"), "layout.tsx switches to LiquidGlassDashboardShell");

  const studentSwitchPath = path.resolve("src/app/(dashboard)/student/StudentShellSwitch.tsx");
  const studentSwitchContent = fs.readFileSync(studentSwitchPath, "utf8");
  assert(studentSwitchContent.includes("LiquidGlassStudentShell"), "StudentShellSwitch switches to LiquidGlassStudentShell");

  console.log(`\nResults: ${passed} PASSED, ${failed} FAILED`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
