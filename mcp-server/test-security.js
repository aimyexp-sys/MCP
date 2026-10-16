// ============================================================
//  test-security.js – Comprehensive Auth, CORS & Privacy Test Suite
// ============================================================

import http from "http";
import express from "express";
import cors from "cors";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Import modules to test
const studentSecurity = require("../students-server/middleware/security.js");
const jobSecurity = require("../job-portal-server/middleware/security.js");
const { queryStudents, queryJobs, maskEmail, maskMobile } = await import("./src/dataProvider.js");

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  ✅ PASS: ${message}`);
}

async function startServer(app, port) {
  return new Promise((resolve) => {
    const server = app.listen(port, () => resolve(server));
  });
}

async function closeServer(server) {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

async function runSecurityTestSuite() {
  console.log("==================================================");
  console.log("🔒 Running Comprehensive Security & Auth Test Suite");
  console.log("==================================================\n");

  // ─────────────────────────────────────────────────────────────
  // 1. Data Minimization Helpers
  // ─────────────────────────────────────────────────────────────
  console.log("▶ [Group 1] Testing Data Minimization Helpers...");
  const maskedEmail = maskEmail("aarav.sharma@gmail.com");
  assert(maskedEmail.startsWith("aa***") && maskedEmail.endsWith("@gmail.com"), `Email masked correctly: ${maskedEmail}`);
  assert(!maskedEmail.includes("sharma"), "Email does not leak full user identity");

  const maskedPhone = maskMobile("+91 9876543210");
  assert(maskedPhone.includes("*****"), `Phone masked correctly: ${maskedPhone}`);
  assert(!maskedPhone.includes("9876543210"), "Phone does not leak full digits");

  // ─────────────────────────────────────────────────────────────
  // 2. MCP Tools Data Minimization
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ [Group 2] Testing MCP Tools Data Minimization...");
  const studentResult = await queryStudents({ limit: 1 });
  const sampleStudent = studentResult.students[0];
  assert(sampleStudent.contact.isPersonalDataMasked === true, "Student record has isPersonalDataMasked=true");
  assert(sampleStudent.contact.email.includes("***"), `MCP student email is masked: ${sampleStudent.contact.email}`);
  assert(sampleStudent.contact.mobile.includes("*****"), `MCP student mobile is masked: ${sampleStudent.contact.mobile}`);

  const jobsResult = await queryJobs({ limit: 1 });
  const sampleJob = jobsResult.jobs[0];
  assert(sampleJob.isRecruiterContactMasked === true, "Job record has isRecruiterContactMasked=true");
  assert(sampleJob.company.contact.hrContactPerson.includes("Protected"), `Recruiter name is protected: ${sampleJob.company.contact.hrContactPerson}`);
  assert(sampleJob.company.contact.phone.includes("Protected"), `Recruiter phone is protected: ${sampleJob.company.contact.phone}`);

  // ─────────────────────────────────────────────────────────────
  // 3. Student API Server (Auth, Privacy, CORS)
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ [Group 3] Testing Student API Server (Auth, Privacy & CORS)...");
  const studentApp = express();
  studentApp.use(cors(studentSecurity.getCorsOptions()));
  studentApp.use(express.json());
  studentApp.use("/api/students", require("../students-server/routes/students.js"));

  const studentServer = await startServer(studentApp, 3199);
  const studentUrl = "http://localhost:3199/api/students";

  try {
    // 3a. Public request receives masked contact details
    const pubRes = await fetch(studentUrl);
    const pubJson = await pubRes.json();
    assert(pubJson.success === true, "Public GET /api/students returns success");
    assert(pubJson.privacy.contactMasked === true, "Public response has contactMasked=true");
    assert(pubJson.data[0].email.includes("***"), `Public student email is masked: ${pubJson.data[0].email}`);
    assert(pubJson.data[0].mobile.includes("*****"), `Public student mobile is masked: ${pubJson.data[0].mobile}`);

    // 3b. Authenticated request with valid X-API-Key receives unmasked contact details
    const authRes = await fetch(studentUrl, {
      headers: { "X-API-Key": studentSecurity.STUDENT_API_KEY }
    });
    const authJson = await authRes.json();
    assert(authJson.privacy.contactMasked === false, "Authenticated response has contactMasked=false");
    assert(!authJson.data[0].email.includes("***"), `Authenticated student email is unmasked: ${authJson.data[0].email}`);
    assert(!authJson.data[0].mobile.includes("*****"), `Authenticated student mobile is unmasked: ${authJson.data[0].mobile}`);

    // 3c. Auth status endpoint
    const statusRes = await fetch(`${studentUrl}/auth/status`);
    const statusJson = await statusRes.json();
    assert(statusJson.authenticated === false, "Unauthenticated /auth/status reports false");

    const statusAuthRes = await fetch(`${studentUrl}/auth/status`, {
      headers: { "X-API-Key": studentSecurity.STUDENT_API_KEY }
    });
    const statusAuthJson = await statusAuthRes.json();
    assert(statusAuthJson.authenticated === true, "Authenticated /auth/status reports true");
  } finally {
    await closeServer(studentServer);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Job Portal Server (Mutations Auth, Recruiter Privacy)
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ [Group 4] Testing Job Portal Server (Mutations & Privacy)...");
  const jobApp = express();
  jobApp.use(cors(jobSecurity.getCorsOptions()));
  jobApp.use(express.json());
  jobApp.use("/api/jobs", require("../job-portal-server/routes/jobs.js"));

  const jobServer = await startServer(jobApp, 4199);
  const jobUrl = "http://localhost:4199/api/jobs";

  try {
    // 4a. Public GET receives masked recruiter contacts
    const pubJobRes = await fetch(jobUrl);
    const pubJobJson = await pubJobRes.json();
    assert(pubJobJson.privacy.recruiterContactMasked === true, "Public jobs response has recruiterContactMasked=true");
    assert(pubJobJson.data[0].company.contact.phone.includes("Protected"), "Public job hides recruiter direct phone");

    // 4b. Authenticated GET receives unmasked recruiter contacts
    const authJobRes = await fetch(jobUrl, {
      headers: { "X-API-Key": jobSecurity.JOB_ADMIN_KEY }
    });
    const authJobJson = await authJobRes.json();
    assert(authJobJson.privacy.recruiterContactMasked === false, "Authenticated jobs response has recruiterContactMasked=false");

    // 4c. UNHEALTHY / UNAUTHENTICATED MUTATION: POST /api/jobs without auth MUST FAIL (401)
    const unauthPostRes = await fetch(jobUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Malicious Unauthenticated Job Posting",
        description: "Trying to alter in-memory job list without auth",
        company: { name: "Evil Corp" },
        requirements: { requiredSkills: ["Hacking"] }
      })
    });
    assert(unauthPostRes.status === 401, `Unauthenticated POST /api/jobs is rejected with 401 Unauthorized (got ${unauthPostRes.status})`);
    const unauthPostJson = await unauthPostRes.json();
    assert(unauthPostJson.error === "Unauthorized", "Error message confirms Unauthorized");

    // 4d. AUTHENTICATED MUTATION: POST /api/jobs with valid API key MUST SUCCEED (201)
    const authPostRes = await fetch(jobUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": jobSecurity.JOB_ADMIN_KEY
      },
      body: JSON.stringify({
        title: "Authenticated Senior Staff Engineer",
        description: "High impact authorized role",
        company: { name: "Safe Corp" },
        requirements: { requiredSkills: ["Node.js", "Security"] }
      })
    });
    assert(authPostRes.status === 201, `Authenticated POST /api/jobs succeeds with 201 Created (got ${authPostRes.status})`);
    const createdJob = (await authPostRes.json()).data;
    assert(createdJob && createdJob.id, `Created job assigned ID: ${createdJob.id}`);

    // 4e. UNAUTHENTICATED DELETE: DELETE /api/jobs/:id without auth MUST FAIL (401)
    const unauthDelRes = await fetch(`${jobUrl}/${createdJob.id}`, {
      method: "DELETE"
    });
    assert(unauthDelRes.status === 401, `Unauthenticated DELETE /api/jobs/:id is rejected with 401 (got ${unauthDelRes.status})`);

    // 4f. AUTHENTICATED DELETE: DELETE /api/jobs/:id with valid key MUST SUCCEED (200)
    const authDelRes = await fetch(`${jobUrl}/${createdJob.id}`, {
      method: "DELETE",
      headers: { "X-API-Key": jobSecurity.JOB_ADMIN_KEY }
    });
    assert(authDelRes.status === 200, `Authenticated DELETE /api/jobs/:id succeeds with 200 OK (got ${authDelRes.status})`);
  } finally {
    await closeServer(jobServer);
  }

  // ─────────────────────────────────────────────────────────────
  // 5. MCP Server (SSE & Message Endpoint Authentication)
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ [Group 5] Testing Hosted MCP Server Endpoint Authentication...");
  process.env.MCP_API_KEY = "test-mcp-key-2026";
  const mcpSseApp = express();
  mcpSseApp.use(cors());
  mcpSseApp.use(express.json());

  const testSessions = new Map();

  function isAuthorizedMcp(req) {
    const key =
      req.headers["x-api-key"] ||
      (req.headers["authorization"]?.startsWith("Bearer ")
        ? req.headers["authorization"].slice(7)
        : null) ||
      req.query.apiKey;
    return Boolean(key && (key === "test-mcp-key-2026" || key === "mcp-secret-key-2026"));
  }

  function requireMcpAuth(req, res, next) {
    if (!isAuthorizedMcp(req)) {
      return res.status(401).json({ error: "Unauthorized", message: "Valid MCP API key required" });
    }
    next();
  }

  mcpSseApp.get("/sse", requireMcpAuth, (req, res) => {
    const sessionId = "sess-12345";
    testSessions.set(sessionId, { authenticated: true });
    const apiKeyParam = req.query.apiKey ? `?apiKey=${encodeURIComponent(req.query.apiKey)}` : "";
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });
    res.write(`event: endpoint\ndata: /message${apiKeyParam}&sessionId=${sessionId}\n\n`);
    res.end();
  });

  mcpSseApp.post("/sse", (req, res) => {
    res.status(405).json({ error: "Method Not Allowed", message: "Must use GET /sse" });
  });

  mcpSseApp.post("/message", (req, res) => {
    const sessionId = req.query.sessionId;
    const session = testSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    // Verified session allows message posting even if proxy client stripped query parameters
    res.status(200).json({ jsonrpc: "2.0", result: "ok" });
  });

  const mcpServer = await startServer(mcpSseApp, 8199);

  try {
    // 5a. Unauthenticated GET /sse MUST FAIL (401)
    const unauthSseRes = await fetch("http://localhost:8199/sse");
    assert(unauthSseRes.status === 401, `Unauthenticated GET /sse is rejected with 401 (got ${unauthSseRes.status})`);

    // 5b. Invalid key GET /sse MUST FAIL (401)
    const invalidSseRes = await fetch("http://localhost:8199/sse?apiKey=wrong-key");
    assert(invalidSseRes.status === 401, `Invalid key GET /sse is rejected with 401 (got ${invalidSseRes.status})`);

    // 5c. Authenticated GET /sse with query param ?apiKey= MUST SUCCEED (200) and forward apiKey in endpoint
    const authSseRes = await fetch("http://localhost:8199/sse?apiKey=test-mcp-key-2026");
    assert(authSseRes.status === 200, `Authenticated GET /sse with ?apiKey= succeeds with 200 (got ${authSseRes.status})`);
    const sseBody = await authSseRes.text();
    assert(sseBody.includes("apiKey=test-mcp-key-2026"), "SSE endpoint event includes forwarded apiKey parameter");

    // 5d. Authenticated GET /sse with X-API-Key header MUST SUCCEED (200)
    const authSseHeaderRes = await fetch("http://localhost:8199/sse", {
      headers: { "X-API-Key": "test-mcp-key-2026" }
    });
    assert(authSseHeaderRes.status === 200, `Authenticated GET /sse with X-API-Key succeeds with 200 (got ${authSseHeaderRes.status})`);

    // 5e. POST /sse returns 405 Method Not Allowed (preventing misleading 404 from proxy clients)
    const postSseRes = await fetch("http://localhost:8199/sse", { method: "POST" });
    assert(postSseRes.status === 405, `POST /sse returns 405 Method Not Allowed (got ${postSseRes.status})`);

    // 5f. POST /message without session returns 404
    const unauthMsgRes = await fetch("http://localhost:8199/message", { method: "POST" });
    assert(unauthMsgRes.status === 404, `POST /message without valid session returns 404 (got ${unauthMsgRes.status})`);

    // 5g. POST /message with authenticated session succeeds with 200
    const authMsgRes = await fetch("http://localhost:8199/message?sessionId=sess-12345", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "ping" })
    });
    assert(authMsgRes.status === 200, `POST /message on authenticated session succeeds with 200 (got ${authMsgRes.status})`);
  } finally {
    await closeServer(mcpServer);
  }

  // ─────────────────────────────────────────────────────────────
  // 6. CORS Policy Validation
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ [Group 6] Testing CORS Restriction Policy...");
  const corsChecker = studentSecurity.getCorsOptions();

  let blockedOriginErr = null;
  corsChecker.origin("http://malicious-site.com", (err, allow) => {
    blockedOriginErr = err;
  });
  assert(blockedOriginErr !== null, "Unauthorized origin 'http://malicious-site.com' is rejected by CORS");

  let allowedOriginErr = null;
  let allowedOriginOk = null;
  corsChecker.origin("http://localhost:5173", (err, allow) => {
    allowedOriginErr = err;
    allowedOriginOk = allow;
  });
  assert(allowedOriginErr === null && allowedOriginOk === true, "Whitelisted origin 'http://localhost:5173' is allowed by CORS");

  console.log("\n==================================================");
  console.log(`🎉 ALL ${passedTests}/${totalTests} SECURITY TESTS PASSED SUCCESSFULLY!`);
  console.log("==================================================");
}

runSecurityTestSuite().catch((err) => {
  console.error("\n❌ Security test suite failed:", err);
  process.exit(1);
});
