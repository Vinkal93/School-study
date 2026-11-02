import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cjsScript = path.resolve(__dirname, "test-subscription-communication.cjs");

execSync(`node "${cjsScript}"`, { stdio: "inherit" });
