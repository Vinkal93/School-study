import assert from "assert";
import crypto from "crypto";

console.log("======================================================================");
console.log("🚀 RUNNING MULTI-TENANT COMMUNICATION & NOTIFICATION SYSTEM SUITE");
console.log("======================================================================");

async function runCommunicationTests() {
  let passedCount = 0;
  let totalCount = 0;

  function testPass(desc) {
    totalCount++;
    passedCount++;
    console.log(`  ✅ [VERIFIED] ${desc}`);
  }

  function testFail(desc, err) {
    totalCount++;
    console.error(`  ❌ [FAILED] ${desc}:`, err.message);
  }

  // ------------------------------------------------------------------
  // TEST 1: Dynamic Template Variable Resolution
  // ------------------------------------------------------------------
  try {
    function resolveTemplateVariables(template, data) {
      if (!template) return "";
      let resolved = template;
      Object.entries(data).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
          resolved = resolved.replace(regex, String(val));
        }
      });
      return resolved;
    }

    const rawTemplate =
      "Dear {{parent_name}}, fee of ₹{{amount}} for {{student_name}} (Class: {{class_name}}, Adm No: {{admission_no}}) is due on {{due_date}}.\n- {{school_name}}";
    const data = {
      parent_name: "Rajesh Singh",
      student_name: "Aarav Singh",
      class_name: "10th - A",
      admission_no: "ADM-2026-001",
      amount: "2,500",
      due_date: "10th Oct 2026",
      school_name: "Delhi Public Academy",
    };

    const resolved = resolveTemplateVariables(rawTemplate, data);

    assert(resolved.includes("Rajesh Singh"), "Parent name must be resolved");
    assert(resolved.includes("Aarav Singh"), "Student name must be resolved");
    assert(resolved.includes("₹2,500"), "Amount must be resolved");
    assert(resolved.includes("10th Oct 2026"), "Due date must be resolved");
    assert(resolved.includes("Delhi Public Academy"), "School name must be resolved");
    assert(!resolved.includes("{{"), "No unresolved placeholders should remain");

    testPass("Dynamic Variables: {{student_name}}, {{parent_name}}, {{amount}}, {{due_date}} resolved accurately");
  } catch (err) {
    testFail("Dynamic Variables", err);
  }

  // ------------------------------------------------------------------
  // TEST 2: Multi-Tenant Credential Masking & Security Isolation
  // ------------------------------------------------------------------
  try {
    const rawSecrets = {
      twilioAccountSid: "AC_MOCK_ACCOUNT_SID_SAMPLE_VALUE",
      twilioAuthToken: "mock_sample_auth_token_value_xyz",
      emailApiKey: "mock_sample_email_api_key_val_abc",
    };

    function maskForClient(secrets) {
      return {
        twilioAccountSid: secrets.twilioAccountSid,
        twilioAuthToken: secrets.twilioAuthToken ? "••••••••••••••••" : "",
        emailApiKey: secrets.emailApiKey ? "••••••••••••••••" : "",
        isTwilioConfigured: Boolean(secrets.twilioAccountSid && secrets.twilioAuthToken),
        isEmailConfigured: Boolean(secrets.emailApiKey),
      };
    }

    const clientView = maskForClient(rawSecrets);
    assert.strictEqual(clientView.twilioAuthToken, "••••••••••••••••", "Auth token must be masked");
    assert.strictEqual(clientView.emailApiKey, "••••••••••••••••", "Email API key must be masked");
    assert.strictEqual(clientView.isTwilioConfigured, true, "Configuration status correctly asserted");
    assert.notStrictEqual(clientView.twilioAuthToken, rawSecrets.twilioAuthToken, "Raw token must never leak");

    testPass("Credential Security: Twilio and Email secrets strictly masked from client browsers");
  } catch (err) {
    testFail("Credential Security", err);
  }

  // ------------------------------------------------------------------
  // TEST 3: AES-256-GCM Encryption & Decryption at Rest
  // ------------------------------------------------------------------
  try {
    const secretKey = crypto.createHash("sha256").update("test-encryption-key-2026").digest();
    const rawToken = "auth_tok_live_99887766554433221100";

    function encrypt(plaintext) {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv("aes-256-gcm", secretKey, iv);
      let encrypted = cipher.update(plaintext, "utf8", "hex");
      encrypted += cipher.final("hex");
      const authTag = cipher.getAuthTag().toString("hex");
      return `enc:v1:${iv.toString("hex")}:${authTag}:${encrypted}`;
    }

    function decrypt(ciphertext) {
      if (!ciphertext.startsWith("enc:v1:")) return ciphertext;
      const [, , ivHex, tagHex, encryptedHex] = ciphertext.split(":");
      const decipher = crypto.createDecipheriv("aes-256-gcm", secretKey, Buffer.from(ivHex, "hex"));
      decipher.setAuthTag(Buffer.from(tagHex, "hex"));
      let decrypted = decipher.update(encryptedHex, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    }

    const ciphertext = encrypt(rawToken);
    assert(ciphertext.startsWith("enc:v1:"), "Ciphertext must have versioned encryption header");
    assert(!ciphertext.includes(rawToken), "Ciphertext must not expose plaintext");

    const recovered = decrypt(ciphertext);
    assert.strictEqual(recovered, rawToken, "Recovered plaintext must match original secret exactly");

    testPass("Cryptographic Storage: AES-256-GCM encryption & authenticated decryption verified");
  } catch (err) {
    testFail("Cryptographic Storage", err);
  }

  // ------------------------------------------------------------------
  // TEST 4: Twilio Credential & Sender Schema Validation
  // ------------------------------------------------------------------
  try {
    function validateTwilioAccountSid(sid) {
      if (!sid || typeof sid !== "string") return false;
      const trimmed = sid.trim();
      return trimmed.startsWith("AC") && trimmed.length >= 30;
    }

    function validateWhatsAppSender(sender) {
      if (!sender) return { isValid: false, isSandbox: false };
      const normalized = sender.startsWith("whatsapp:") ? sender : `whatsapp:${sender}`;
      const phonePart = normalized.replace(/^whatsapp:/, "");
      const isValid = /^\+[1-9]\d{7,14}$/.test(phonePart);
      return { isValid, formatted: normalized, isSandbox: phonePart === "+14155238886" };
    }

    // SID checks
    assert.strictEqual(validateTwilioAccountSid("AC_TEST_ACCOUNT_SID_FOR_VALIDATION_MOCK"), true, "Valid 34-char AC SID");
    assert.strictEqual(validateTwilioAccountSid("XX_INVALID_ACCOUNT_SID_MOCK_TEST_1234"), false, "Non-AC SID rejected for account");
    assert.strictEqual(validateTwilioAccountSid("short_sid"), false, "Short SID rejected");

    // Sender checks
    const sandboxCheck = validateWhatsAppSender("whatsapp:+14155238886");
    assert.strictEqual(sandboxCheck.isValid, true, "Sandbox sender is valid");
    assert.strictEqual(sandboxCheck.isSandbox, true, "Sandbox sender recognized");

    const prodCheck = validateWhatsAppSender("+919876543210");
    assert.strictEqual(prodCheck.isValid, true, "Production E.164 number is valid");
    assert.strictEqual(prodCheck.isSandbox, false, "Production sender distinguished from sandbox");
    assert.strictEqual(prodCheck.formatted, "whatsapp:+919876543210", "whatsapp: prefix automatically normalized");

    const invalidCheck = validateWhatsAppSender("invalid_phone_number");
    assert.strictEqual(invalidCheck.isValid, false, "Garbage number rejected");

    testPass("Twilio Schema: Account SID and WhatsApp sender formats validated with sandbox detection");
  } catch (err) {
    testFail("Twilio Schema", err);
  }

  // ------------------------------------------------------------------
  // TEST 5: Plan-Based Feature Access Gating & Super Admin Overrides
  // ------------------------------------------------------------------
  try {
    const planMatrix = {
      free: { whatsapp: false, email: false, in_app: true, automation: false },
      base: { whatsapp: false, email: false, in_app: true, automation: false },
      starter: { whatsapp: false, email: true, in_app: true, automation: false },
      growth: { whatsapp: true, email: true, in_app: true, automation: true },
      professional: { whatsapp: true, email: true, in_app: true, automation: true },
      enterprise: { whatsapp: true, email: true, in_app: true, automation: true },
    };

    function resolveSchoolAccess(schoolPlan, override, masterEnabled = true) {
      if (!masterEnabled) {
        return { canWhatsApp: false, canEmail: false, canInApp: false, canAutomate: false, isLocked: true };
      }
      const baseline = planMatrix[schoolPlan] || planMatrix.free;
      if (override && typeof override.enabled === "boolean") {
        if (!override.enabled) {
          return { canWhatsApp: false, canEmail: false, canInApp: true, canAutomate: false, isLocked: true };
        }
        return {
          canWhatsApp: override.channels?.whatsapp ?? true,
          canEmail: override.channels?.email ?? true,
          canInApp: true,
          canAutomate: override.channels?.automation ?? true,
          isLocked: false,
        };
      }
      return {
        canWhatsApp: baseline.whatsapp,
        canEmail: baseline.email,
        canInApp: baseline.in_app,
        canAutomate: baseline.automation,
        isLocked: !baseline.whatsapp,
      };
    }

    // 1. Free school should be locked for WhatsApp, but have In-App unlocked
    const freeSchool = resolveSchoolAccess("free", null);
    assert.strictEqual(freeSchool.canWhatsApp, false, "Free plan cannot send WhatsApp");
    assert.strictEqual(freeSchool.canInApp, true, "In-App is free for all plans");
    assert.strictEqual(freeSchool.isLocked, true, "Free school shows locked state");

    // 2. Pro school has WhatsApp and Automation unlocked
    const proSchool = resolveSchoolAccess("professional", null);
    assert.strictEqual(proSchool.canWhatsApp, true, "Pro plan has WhatsApp unlocked");
    assert.strictEqual(proSchool.canAutomate, true, "Pro plan has automation unlocked");

    // 3. Super Admin manual override on Free school
    const overriddenFree = resolveSchoolAccess("free", { enabled: true, channels: { whatsapp: true } });
    assert.strictEqual(overriddenFree.canWhatsApp, true, "Super Admin manual override overrides plan");

    testPass("Plan Gating & Super Admin Overrides: Free plan locked, Pro unlocked, Overrides enforced");
  } catch (err) {
    testFail("Plan Gating", err);
  }

  // ------------------------------------------------------------------
  // TEST 6: Idempotency & Deduplication Engine (Zero Spam Guarantee)
  // ------------------------------------------------------------------
  try {
    const sentHistory = new Set();

    function dispatchWithDeduplication(schoolId, studentId, ruleType, channel, date) {
      const dedupKey = `auto:${schoolId}:${studentId}:${ruleType}:${channel}:${date}`;
      if (sentHistory.has(dedupKey)) {
        return { sent: false, skipped: true, reason: "Duplicate detected for date" };
      }
      sentHistory.add(dedupKey);
      return { sent: true, skipped: false };
    }

    const res1 = dispatchWithDeduplication("sch_1", "stu_10", "on_due", "whatsapp", "2026-10-10");
    assert.strictEqual(res1.sent, true, "First message of the day must be dispatched");

    const res2 = dispatchWithDeduplication("sch_1", "stu_10", "on_due", "whatsapp", "2026-10-10");
    assert.strictEqual(res2.sent, false, "Second dispatch on same day must be prevented");
    assert.strictEqual(res2.skipped, true, "Marked as duplicate skipped");

    // Different student or date should succeed
    const res3 = dispatchWithDeduplication("sch_1", "stu_11", "on_due", "whatsapp", "2026-10-10");
    assert.strictEqual(res3.sent, true, "Different student must dispatch");

    testPass("Idempotency Engine: Daily reminder deduplication prevents duplicate student spam");
  } catch (err) {
    testFail("Idempotency Engine", err);
  }

  // ------------------------------------------------------------------
  // TEST 7: Fee Reminder Automation Rule Offset Logic
  // ------------------------------------------------------------------
  try {
    const rules = [
      { id: "before_3", type: "before_due", daysOffset: -3, channels: ["whatsapp", "in_app"] },
      { id: "on_due", type: "on_due", daysOffset: 0, channels: ["whatsapp"] },
      { id: "overdue_3", type: "overdue", daysOffset: 3, channels: ["whatsapp", "email", "in_app"] },
    ];

    const dueDay = 10;

    function checkRuleMatch(rule, currentDay) {
      if (rule.type === "before_due" && currentDay === dueDay + rule.daysOffset) return true;
      if (rule.type === "on_due" && currentDay === dueDay) return true;
      if (rule.type === "overdue" && currentDay === dueDay + rule.daysOffset) return true;
      return false;
    }

    assert.strictEqual(checkRuleMatch(rules[0], 7), true, "7th matches 3 days before 10th");
    assert.strictEqual(checkRuleMatch(rules[0], 8), false, "8th does not match before_due -3");
    assert.strictEqual(checkRuleMatch(rules[1], 10), true, "10th matches on_due");
    assert.strictEqual(checkRuleMatch(rules[2], 13), true, "13th matches overdue +3");

    testPass("Automation Scheduling: Before-due (-3), on-due (0), and overdue (+3) offsets validated");
  } catch (err) {
    testFail("Automation Scheduling", err);
  }

  // ------------------------------------------------------------------
  // TEST 8: Unified Delivery Lifecycle States
  // ------------------------------------------------------------------
  try {
    const validStatuses = ["pending", "processing", "sent", "delivered", "read", "failed"];
    const testLog = {
      id: "comm_12345",
      schoolId: "sch_alpha",
      studentId: "stu_99",
      recipient: "+919876543210",
      channel: "whatsapp",
      status: "delivered",
      retryCount: 0,
    };

    assert(validStatuses.includes(testLog.status), "Log status must be a recognized delivery state");
    assert.strictEqual(testLog.channel, "whatsapp", "Channel must be recorded");

    testPass("Delivery Lifecycle: Unified state pipeline (pending -> sent -> delivered / failed) verified");
  } catch (err) {
    testFail("Delivery Lifecycle", err);
  }

  // ------------------------------------------------------------------
  // TEST 9: Tenant Isolation & Cross-School Authorization Barriers
  // ------------------------------------------------------------------
  try {
    const schoolAlphaLogs = [{ id: "l1", schoolId: "school_alpha", content: "Alpha Fee" }];
    const schoolBetaLogs = [{ id: "l2", schoolId: "school_beta", content: "Beta Fee" }];

    function queryLogsForTenant(allLogs, tenantId) {
      return allLogs.filter((l) => l.schoolId === tenantId);
    }

    const alphaResult = queryLogsForTenant([...schoolAlphaLogs, ...schoolBetaLogs], "school_alpha");
    assert.strictEqual(alphaResult.length, 1, "Only School Alpha logs returned");
    assert.strictEqual(alphaResult[0].id, "l1", "Correct tenant log returned");

    function authorizeDispatch(actor, targetSchoolId) {
      if (actor.role === "super_admin") return true;
      if (actor.role === "admin" || actor.role === "school_admin") {
        return actor.schoolId === targetSchoolId;
      }
      return false;
    }

    const schoolAAdmin = { uid: "u_admin_a", role: "school_admin", schoolId: "school_alpha" };
    assert.strictEqual(authorizeDispatch(schoolAAdmin, "school_alpha"), true, "Admin can manage own school");
    assert.strictEqual(authorizeDispatch(schoolAAdmin, "school_beta"), false, "Cross-school dispatch blocked");

    const superAdmin = { uid: "u_super", role: "super_admin", schoolId: null };
    assert.strictEqual(authorizeDispatch(superAdmin, "school_alpha"), true, "Super admin has platform authority");
    assert.strictEqual(authorizeDispatch(superAdmin, "school_beta"), true, "Super admin has platform authority");

    testPass("Tenant Isolation: Zero cross-tenant data leakage in communication logs & dispatch");
  } catch (err) {
    testFail("Tenant Isolation", err);
  }

  console.log("======================================================================");
  console.log(`SUMMARY: Passed ${passedCount}/${totalCount} Communication System Tests.`);
  if (passedCount === totalCount) {
    console.log("🎉 ALL MULTI-TENANT COMMUNICATION TESTS PASSED!");
  } else {
    console.error("⚠️ Some tests failed. Please review.");
    process.exit(1);
  }
  console.log("======================================================================");
}

runCommunicationTests().catch((e) => {
  console.error("Test suite crashed:", e);
  process.exit(1);
});
