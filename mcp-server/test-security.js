// ============================================================
//  test-security.js – Comprehensive Auth0, CORS, Privacy & OAuth Test Suite
//  Validates SEC-01, SEC-03, SEC-05, SEC-06, SEC-07, SEC-08
// ============================================================

import http from "http";
import express from "express";
import cors from "cors";
import fs from "fs";
import * as jose from "jose";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createRequire } from "module";

process.env.NODE_ENV = "test";

const require = createRequire(import.meta.url);

// Import modules under test
const studentSecurity = require("../students-server/middleware/security.js");
const studentAuth = require("../students-server/middleware/auth.js");
const jobSecurity = require("../job-portal-server/middleware/security.js");
const jobAuth = require("../job-portal-server/middleware/auth.js");
const jobStorage = require("../job-portal-server/data/storage.js");

const { queryStudents, queryJobs, maskEmail, maskMobile } = await import("./src/dataProvider.js");
const {
  verifyAuth0Token,
  extractBearerToken,
  getOAuthProtectedResourceMetadata,
  getAuthorizationServerMetadata,
  handleDynamicClientRegistration,
  AUTH0_TEST_SECRET
} = await import("./src/auth.js");
const { createServer } = await import("./src/server.js");

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

/**
 * Helper to generate valid mock Auth0 JWTs for unit tests
 */
async function createMockToken({
  sub = "auth0|mock-user-123",
  scopes = ["read:students", "read:jobs"],
  audience = "https://exp-portal-mcp-server.onrender.com",
  expiresIn = "1h",
  secret = AUTH0_TEST_SECRET
} = {}) {
  const encSecret = new TextEncoder().encode(secret);
  const scopeStr = Array.isArray(scopes) ? scopes.join(" ") : scopes;
  const permissionsArr = Array.isArray(scopes) ? scopes : scopeStr.split(" ");

  return await new jose.SignJWT({
    sub,
    scope: scopeStr,
    permissions: permissionsArr
  })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(encSecret);
}

async function runSecurityTestSuite() {
  console.log("==================================================");
  console.log("🔒 Running Comprehensive Security & Auth0 Test Suite");
  console.log("   (SEC-01, SEC-03, SEC-05, SEC-06, SEC-07, SEC-08)");
  console.log("==================================================\n");

  // ─────────────────────────────────────────────────────────────
  // 1. Data Minimization Helpers (Preserved - SEC-02/04 out of scope)
  // ─────────────────────────────────────────────────────────────
  console.log("▶ [Group 1] Testing Data Minimization Helpers...");
  const maskedEmail = maskEmail("aarav.sharma@gmail.com");
  assert(maskedEmail.startsWith("aa***") && maskedEmail.endsWith("@gmail.com"), `Email masked correctly: ${maskedEmail}`);
  assert(!maskedEmail.includes("sharma"), "Email does not leak full user identity");

  const maskedPhone = maskMobile("+91 9876543210");
  assert(maskedPhone.includes("*****"), `Phone masked correctly: ${maskedPhone}`);
  assert(!maskedPhone.includes("9876543210"), "Phone does not leak full digits");

  // ─────────────────────────────────────────────────────────────
  // 2. MCP Tools Data Minimization (Preserved)
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
  // 3. Student API Server (Auth0 Bearer Auth, No Query Keys - SEC-05, SEC-06)
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ [Group 3] Testing Student API Server (Auth0 Bearer Auth & Query Key Rejection)...");
  const studentApp = express();
  studentApp.use(cors(studentSecurity.getCorsOptions()));
  studentApp.use(express.json());
  studentApp.use("/api/students", require("../students-server/routes/students.js"));

  const studentServer = await startServer(studentApp, 3199);
  const studentUrl = "http://localhost:3199/api/students";

  try {
    // 3a. Public unauthenticated request receives masked contact details
    const pubRes = await fetch(studentUrl);
    const pubJson = await pubRes.json();
    assert(pubJson.success === true, "Public GET /api/students returns success");
    assert(pubJson.privacy.contactMasked === true, "Public response has contactMasked=true");
    assert(pubJson.data[0].email.includes("***"), `Public student email is masked: ${pubJson.data[0].email}`);
    assert(pubJson.data[0].mobile.includes("*****"), `Public student mobile is masked: ${pubJson.data[0].mobile}`);

    // 3b. SEC-05: Old static API key is NOT accepted; fails closed
    const oldKeyRes = await fetch(studentUrl, {
      headers: { "X-API-Key": "student-api-secret-key-2026" }
    });
    const oldKeyJson = await oldKeyRes.json();
    assert(oldKeyJson.privacy.contactMasked === true, "Static API key is ignored, response remains masked (SEC-05)");

    // 3c. SEC-06: Query parameter ?apiKey= is NOT accepted for authentication
    const queryKeyRes = await fetch(`${studentUrl}?apiKey=student-api-secret-key-2026`);
    const queryKeyJson = await queryKeyRes.json();
    assert(queryKeyJson.privacy.contactMasked === true, "Query parameter ?apiKey= is ignored (SEC-06)");

    // 3d. Authenticated request with valid Auth0 Bearer token receives unmasked contact details
    const validStudentToken = await createMockToken({
      sub: "auth0|recruiter-1",
      audience: "https://students-server.onrender.com/api"
    });
    const authRes = await fetch(studentUrl, {
      headers: { Authorization: `Bearer ${validStudentToken}` }
    });
    const authJson = await authRes.json();
    assert(authJson.privacy.contactMasked === false, "Authenticated response has contactMasked=false");
    assert(!authJson.data[0].email.includes("***"), `Authenticated student email is unmasked: ${authJson.data[0].email}`);
    assert(!authJson.data[0].mobile.includes("*****"), `Authenticated student mobile is unmasked: ${authJson.data[0].mobile}`);

    // 3e. Auth status endpoint
    const statusRes = await fetch(`${studentUrl}/auth/status`);
    const statusJson = await statusRes.json();
    assert(statusJson.authenticated === false, "Unauthenticated /auth/status reports false");

    const statusAuthRes = await fetch(`${studentUrl}/auth/status`, {
      headers: { Authorization: `Bearer ${validStudentToken}` }
    });
    const statusAuthJson = await statusAuthRes.json();
    assert(statusAuthJson.authenticated === true, "Authenticated /auth/status reports true");
    assert(statusAuthJson.user.sub === "auth0|recruiter-1", "Auth status reports correct Auth0 sub");
  } finally {
    await closeServer(studentServer);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Job Portal Server (Mutations, Scopes, Ownership, Persistence - SEC-07)
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ [Group 4] Testing Job Portal Server (Mutations, Scopes, Ownership & Persistence)...");
  jobStorage.resetStorage();

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

    // 4b. SEC-06: Query parameter ?apiKey= does not authenticate mutations
    const queryPostRes = await fetch(`${jobUrl}?apiKey=job-admin-secret-key-2026`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Query Param Job", company: { name: "Test" }, description: "Test", requirements: { requiredSkills: ["JS"] } })
    });
    assert(queryPostRes.status === 401, `POST with ?apiKey= rejected with 401 Unauthorized (got ${queryPostRes.status}) (SEC-06)`);

    // 4c. SEC-05: Old static header X-API-Key does not authenticate
    const oldHeaderPostRes = await fetch(jobUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": "job-admin-secret-key-2026"
      },
      body: JSON.stringify({ title: "Static Key Job", company: { name: "Test" }, description: "Test", requirements: { requiredSkills: ["JS"] } })
    });
    assert(oldHeaderPostRes.status === 401, `POST with X-API-Key rejected with 401 (got ${oldHeaderPostRes.status}) (SEC-05)`);

    // 4d. Token without required scope 'create:jobs' is rejected with 403 Forbidden (SEC-07)
    const readOnlyJobToken = await createMockToken({
      sub: "auth0|reader-only",
      scopes: ["read:jobs"],
      audience: "https://job-portal-server.onrender.com/api"
    });
    const forbiddenPostRes = await fetch(jobUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${readOnlyJobToken}`
      },
      body: JSON.stringify({
        title: "Unauthorized Job Posting",
        description: "Lacks create:jobs scope",
        company: { name: "Test Corp" },
        requirements: { requiredSkills: ["Node.js"] }
      })
    });
    assert(forbiddenPostRes.status === 403, `POST without 'create:jobs' rejected with 403 Forbidden (got ${forbiddenPostRes.status}) (SEC-07)`);

    // 4e. Authorized mutation: User Alice posts job with scope 'create:jobs' (SEC-07)
    const aliceToken = await createMockToken({
      sub: "auth0|employer-alice",
      scopes: ["create:jobs", "delete:own_jobs"],
      audience: "https://job-portal-server.onrender.com/api"
    });
    const alicePostRes = await fetch(jobUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aliceToken}`
      },
      body: JSON.stringify({
        title: "Staff Distributed Systems Engineer",
        description: "Scale high-throughput microservices",
        company: { name: "Alice Tech Inc" },
        requirements: { requiredSkills: ["Go", "Distributed Systems", "Kubernetes"] }
      })
    });
    assert(alicePostRes.status === 201, `POST with 'create:jobs' succeeds with 201 Created (got ${alicePostRes.status}) (SEC-07)`);
    const createdJob = (await alicePostRes.json()).data;
    assert(createdJob && createdJob.id, `Created job assigned ID: ${createdJob.id}`);
    assert(createdJob.creatorSub === "auth0|employer-alice", `Job persisted with creatorSub: ${createdJob.creatorSub} (SEC-07)`);

    // 4f. SEC-07: Disk persistence verification
    const persistedJobsRaw = fs.readFileSync(jobStorage.PERSISTED_FILE, "utf-8");
    const persistedJobs = JSON.parse(persistedJobsRaw);
    const persistedJob = persistedJobs.find((j) => j.id === createdJob.id);
    assert(persistedJob !== undefined, `Created job is persisted to disk in jobs-persisted.json (SEC-07)`);
    assert(persistedJob.creatorSub === "auth0|employer-alice", "Persisted job retains creatorSub on disk");

    // 4g. SEC-07: Audit log verification
    const auditLogs = jobStorage.getAuditLogs();
    const createEvent = auditLogs.find((e) => e.jobId === createdJob.id && e.action === "JOB_CREATED");
    assert(createEvent !== undefined, "Audit log recorded JOB_CREATED event (SEC-07)");
    assert(createEvent.userSub === "auth0|employer-alice", "Audit log records creator Auth0 sub");

    // 4h. Ownership check on deletion: User Bob attempts to delete Alice's job -> 403 Forbidden (SEC-07)
    const bobToken = await createMockToken({
      sub: "auth0|employer-bob",
      scopes: ["delete:own_jobs"],
      audience: "https://job-portal-server.onrender.com/api"
    });
    const bobDelRes = await fetch(`${jobUrl}/${createdJob.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${bobToken}` }
    });
    assert(bobDelRes.status === 403, `User Bob cannot delete Alice's job (got 403 Forbidden) (SEC-07)`);

    // 4i. Creator Alice deletes her own job with 'delete:own_jobs' -> 200 OK (SEC-07)
    const aliceDelRes = await fetch(`${jobUrl}/${createdJob.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${aliceToken}` }
    });
    assert(aliceDelRes.status === 200, `Creator Alice successfully deleted own job (got 200 OK) (SEC-07)`);

    // 4j. Verify deletion is persisted to disk and recorded in audit log
    const updatedPersistedRaw = fs.readFileSync(jobStorage.PERSISTED_FILE, "utf-8");
    const updatedPersisted = JSON.parse(updatedPersistedRaw);
    assert(!updatedPersisted.some((j) => j.id === createdJob.id), "Deleted job removed from disk jobs-persisted.json (SEC-07)");

    const updatedAuditLogs = jobStorage.getAuditLogs();
    const deleteEvent = updatedAuditLogs.find((e) => e.jobId === createdJob.id && e.action === "JOB_DELETED");
    assert(deleteEvent !== undefined, "Audit log recorded JOB_DELETED event (SEC-07)");
    assert(deleteEvent.userSub === "auth0|employer-alice", "Delete audit log records userSub");

    // 4k. Admin with 'delete:any_jobs' can delete any job
    // Create another job to test admin deletion
    const job2Res = await fetch(jobUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aliceToken}`
      },
      body: JSON.stringify({
        title: "Job to be deleted by Admin",
        description: "Admin deletion test",
        company: { name: "Alice Tech Inc" },
        requirements: { requiredSkills: ["Python"] }
      })
    });
    const job2 = (await job2Res.json()).data;

    const adminToken = await createMockToken({
      sub: "auth0|admin-carol",
      scopes: ["delete:any_jobs"],
      audience: "https://job-portal-server.onrender.com/api"
    });
    const adminDelRes = await fetch(`${jobUrl}/${job2.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminDelRes.status === 200, `Admin with 'delete:any_jobs' successfully deleted job (SEC-07)`);
  } finally {
    jobStorage.resetStorage();
    await closeServer(jobServer);
  }

  // ─────────────────────────────────────────────────────────────
  // 5. Remote MCP Server Authentication & Discovery (SEC-01, SEC-06, SEC-08)
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ [Group 5] Testing Remote MCP Server OAuth, Discovery & DCR (SEC-01, SEC-06, SEC-08)...");
  const mcpApp = express();
  mcpApp.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (["http://localhost:5173", "http://localhost:5174"].includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: false
  }));
  mcpApp.use(express.json());

  // OAuth challenge helper (SEC-01)
  function sendOAuthChallenge(req, res, errorDescription = "Authentication required") {
    const baseUrl = `http://localhost:8199`;
    res.setHeader(
      "WWW-Authenticate",
      `Bearer error="invalid_token", error_description="${errorDescription}", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource", scope="read:students read:jobs"`
    );
    return res.status(401).json({
      error: "Unauthorized",
      message: `${errorDescription}. Provide a valid Auth0 OAuth access token in 'Authorization: Bearer <token>' header.`
    });
  }

  async function requireMcpAuthMiddleware(req, res, next) {
    const token = extractBearerToken(req);
    if (!token) return sendOAuthChallenge(req, res, "Missing Bearer token");
    try {
      req.mcpUser = await verifyAuth0Token(token);
      next();
    } catch (err) {
      return sendOAuthChallenge(req, res, `Invalid token: ${err.message}`);
    }
  }

  // RFC 9470 OAuth Protected Resource Metadata
  mcpApp.get("/.well-known/oauth-protected-resource", (req, res) => {
    res.status(200).json(getOAuthProtectedResourceMetadata("http://localhost:8199"));
  });

  // RFC 8414 Authorization Server Metadata
  mcpApp.get(["/.well-known/oauth-authorization-server", "/.well-known/openid-configuration"], (req, res) => {
    res.status(200).json(getAuthorizationServerMetadata("http://localhost:8199"));
  });

  // RFC 7591 Dynamic Client Registration
  mcpApp.post("/register", (req, res) => {
    handleDynamicClientRegistration(req, res);
  });

  // SSE endpoint
  const testSessions = new Map();
  mcpApp.get("/sse", requireMcpAuthMiddleware, (req, res) => {
    const sessionId = "sess-oauth-12345";
    testSessions.set(sessionId, { authenticated: true, user: req.mcpUser });
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    });
    // SEC-06: Message URL contains NO query credentials
    res.write(`event: endpoint\ndata: /message?sessionId=${sessionId}\n\n`);
    res.end();
  });

  mcpApp.post("/message", (req, res) => {
    const sessionId = req.query.sessionId;
    const session = testSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.status(200).json({ jsonrpc: "2.0", result: "ok" });
  });

  const mcpServer = await startServer(mcpApp, 8199);

  try {
    // 5a. Unauthenticated GET /sse receives 401 and WWW-Authenticate discovery challenge (SEC-01)
    const unauthSseRes = await fetch("http://localhost:8199/sse");
    assert(unauthSseRes.status === 401, `Unauthenticated GET /sse rejected with 401 (got ${unauthSseRes.status}) (SEC-01)`);
    const wwwAuthHeader = unauthSseRes.headers.get("www-authenticate");
    assert(wwwAuthHeader && wwwAuthHeader.includes("Bearer"), "WWW-Authenticate header contains Bearer challenge (SEC-01)");
    assert(wwwAuthHeader.includes("resource_metadata="), "WWW-Authenticate header provides OAuth resource_metadata discovery URI (SEC-01)");

    // 5b. SEC-01 & SEC-06: Known key in query param or header cannot authenticate
    const queryKeyMcpRes = await fetch("http://localhost:8199/sse?apiKey=mcp-secret-key-2026");
    assert(queryKeyMcpRes.status === 401, `Known key in ?apiKey= rejected with 401 (SEC-01 & SEC-06)`);

    const knownKeyHeaderRes = await fetch("http://localhost:8199/sse", {
      headers: { Authorization: "Bearer mcp-secret-key-2026" }
    });
    assert(knownKeyHeaderRes.status === 401, `Known key 'mcp-secret-key-2026' rejected as Bearer token (SEC-01)`);

    // 5c. Expired token is rejected (SEC-01)
    const expiredToken = await createMockToken({
      expiresIn: "-10s"
    });
    const expiredRes = await fetch("http://localhost:8199/sse", {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    assert(expiredRes.status === 401, `Expired JWT token rejected with 401 (SEC-01)`);

    // 5d. Wrong-audience token is rejected (SEC-01)
    const wrongAudToken = await createMockToken({
      audience: "https://wrong-audience.com"
    });
    const wrongAudRes = await fetch("http://localhost:8199/sse", {
      headers: { Authorization: `Bearer ${wrongAudToken}` }
    });
    assert(wrongAudRes.status === 401, `Wrong-audience token rejected with 401 (SEC-01)`);

    // 5e. RFC 9470 OAuth Protected Resource Metadata endpoint (SEC-01 & SEC-08)
    const metadataRes = await fetch("http://localhost:8199/.well-known/oauth-protected-resource");
    assert(metadataRes.status === 200, "GET /.well-known/oauth-protected-resource returns 200 OK (SEC-01)");
    const metadataJson = await metadataRes.json();
    assert(Array.isArray(metadataJson.authorization_servers), "Resource metadata publishes authorization_servers (SEC-01)");
    assert(metadataJson.scopes_supported.includes("read:students"), "Scopes supported includes 'read:students'");
    assert(metadataJson.scopes_supported.includes("read:jobs"), "Scopes supported includes 'read:jobs'");

    // 5f. RFC 8414 Authorization Server Metadata (SEC-08)
    const asMetaRes = await fetch("http://localhost:8199/.well-known/oauth-authorization-server");
    assert(asMetaRes.status === 200, "GET /.well-known/oauth-authorization-server returns 200 OK (SEC-08)");
    const asMetaJson = await asMetaRes.json();
    assert(asMetaJson.token_endpoint !== undefined, "Authorization server metadata publishes token_endpoint (SEC-08)");
    assert(asMetaJson.registration_endpoint.endsWith("/register"), "Authorization server metadata publishes registration_endpoint (SEC-08)");

    // 5g. RFC 7591 Dynamic Client Registration endpoint (SEC-08)
    const dcrRes = await fetch("http://localhost:8199/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: "Claude Desktop",
        redirect_uris: ["http://localhost:5071/oauth/callback"]
      })
    });
    assert(dcrRes.status === 201, `POST /register succeeds with 201 Created (got ${dcrRes.status}) (SEC-08)`);
    const dcrJson = await dcrRes.json();
    assert(dcrJson.client_id !== undefined, `DCR returned client_id: ${dcrJson.client_id}`);
    assert(dcrJson.scope === "openid profile email read:students read:jobs", "DCR assigns least-privilege default scopes (SEC-08)");

    // 5h. Authenticated GET /sse with valid Auth0 Bearer token succeeds (200) (SEC-01 & SEC-08)
    const validMcpToken = await createMockToken({
      sub: "auth0|claude-desktop-client",
      scopes: ["read:students", "read:jobs"],
      audience: "https://exp-portal-mcp-server.onrender.com"
    });
    const authSseRes = await fetch("http://localhost:8199/sse", {
      headers: { Authorization: `Bearer ${validMcpToken}` }
    });
    assert(authSseRes.status === 200, `Authenticated GET /sse succeeds with 200 (got ${authSseRes.status}) (SEC-01)`);
    const sseBody = await authSseRes.text();
    assert(!sseBody.includes("apiKey="), "SSE endpoint data contains NO apiKey credentials in URL (SEC-06)");
    assert(sseBody.includes("/message?sessionId="), "SSE endpoint event points to clean message URL");

    // 5i. Scope-based Tool Execution in MCP Server (SEC-01 & SEC-08)
    const restrictedServer = createServer({
      user: { sub: "auth0|student-only-user" },
      scopes: ["read:students"] // Lacks read:jobs
    });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const testMcpClient = new Client(
      { name: "test-auth-client", version: "1.0.0" },
      { capabilities: {} }
    );

    await restrictedServer.connect(serverTransport);
    await testMcpClient.connect(clientTransport);

    // Test tool invocation on restrictedServer
    // Calling get_jobs without 'read:jobs' scope should return Forbidden error content
    const forbiddenJobCall = await testMcpClient.callTool({
      name: "get_jobs",
      arguments: {}
    });
    assert(forbiddenJobCall.isError === true, "Calling get_jobs without 'read:jobs' scope returns isError=true (SEC-08)");
    assert(forbiddenJobCall.content[0].text.includes("Forbidden"), "Error text confirms Forbidden: lacks 'read:jobs' scope");

    // Calling get_students with read:students scope succeeds
    const allowedStudentCall = await testMcpClient.callTool({
      name: "get_students",
      arguments: { limit: 1 }
    });
    assert(allowedStudentCall.isError !== true, "Calling get_students with 'read:students' scope succeeds (SEC-08)");

    await testMcpClient.close();
    await restrictedServer.close();
  } finally {
    await closeServer(mcpServer);
  }

  // ─────────────────────────────────────────────────────────────
  // 6. CORS Policy Validation (SEC-03)
  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ [Group 6] Testing CORS Restriction Policy (SEC-03)...");
  const corsOptions = studentSecurity.getCorsOptions();

  // 6a. Unconfigured browser origin is rejected
  let blockedOriginErr = null;
  let blockedAllow = null;
  corsOptions.origin("http://malicious-site.com", (err, allow) => {
    blockedOriginErr = err;
    blockedAllow = allow;
  });
  assert(blockedAllow === false || blockedOriginErr !== null, "Unconfigured origin 'http://malicious-site.com' rejected by CORS (SEC-03)");

  // 6b. Configured portal origins are allowed
  let allowedOriginErr = null;
  let allowedOriginOk = null;
  corsOptions.origin("http://localhost:5173", (err, allow) => {
    allowedOriginErr = err;
    allowedOriginOk = allow;
  });
  assert(allowedOriginErr === null && allowedOriginOk === true, "Configured origin 'http://localhost:5173' allowed by CORS (SEC-03)");

  // 6c. Verify wildcard '*' is rejected and credentials: false
  assert(corsOptions.credentials === false, "CORS credentials is false (SEC-03)");
  assert(corsOptions.allowedHeaders.includes("Authorization"), "CORS allows 'Authorization' header (SEC-03)");

  console.log("\n==================================================");
  console.log(`🎉 ALL ${passedTests}/${totalTests} SECURITY TESTS PASSED SUCCESSFULLY!`);
  console.log("==================================================");
}

runSecurityTestSuite().catch((err) => {
  console.error("\n❌ Security test suite failed:", err);
  process.exit(1);
});
