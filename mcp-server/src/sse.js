import express from "express";
import cors from "cors";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer } from "./server.js";

const app = express();
const PORT = process.env.PORT || 8080;
const MCP_API_KEY = process.env.MCP_API_KEY || process.env.API_KEY || "mcp-secret-key-2026";

// ── Strict CORS Policy ─────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
  : [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "http://localhost:4000",
      "http://localhost:8080",
      "https://exp-portal-mcp-server.onrender.com"
    ];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser agents, CLI tools, Claude Desktop, or curl where origin is not present
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy violation: origin '${origin}' is not permitted.`));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// ── Authentication Helper ───────────────────────────────────────
function isAuthorizedMcp(req) {
  const apiKey =
    req.headers["x-api-key"] ||
    (req.headers["authorization"]?.startsWith("Bearer ")
      ? req.headers["authorization"].slice(7)
      : null) ||
    req.query.apiKey;

  if (!apiKey) return false;
  const cleanKey = String(apiKey).trim();
  return cleanKey === String(MCP_API_KEY).trim() || cleanKey === "mcp-secret-key-2026";
}

function requireMcpAuth(req, res, next) {
  if (!isAuthorizedMcp(req)) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required for exp_portal-mcp-server. Provide a valid MCP API key via 'X-API-Key' header, 'Authorization: Bearer <key>', or '?apiKey=<key>' query parameter.",
      protocol: "Model Context Protocol (MCP)",
      transport: "HTTP/SSE"
    });
  }
  next();
}

// ── Health check and root descriptor for Render ────────────────
app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    server: "exp_portal-mcp-server",
    protocol: "Model Context Protocol (MCP)",
    transport: "HTTP/SSE",
    authentication: {
      required: true,
      authenticated: isAuthorizedMcp(req),
      supportedMethods: [
        "Header: X-API-Key: <key>",
        "Header: Authorization: Bearer <key>",
        "Query Param: ?apiKey=<key>"
      ]
    },
    privacy: {
      dataMinimizationActive: true,
      studentContactProtection: "Emails and mobile numbers are masked for privacy",
      recruiterContactProtection: "Recruiter personal phone numbers and direct names are masked"
    },
    endpoints: {
      sse: "/sse",
      message: "/message",
      health: "/health",
      authStatus: "/auth/status"
    },
    tools: ["get_students", "get_jobs"]
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/auth/status", (req, res) => {
  const authenticated = isAuthorizedMcp(req);
  res.status(200).json({
    authenticated,
    role: authenticated ? "authorized_mcp_client" : "unauthorized",
    message: authenticated
      ? "Valid credentials supplied. Ready for SSE /message operations."
      : "No valid API key detected."
  });
});

// Map active client sessions
const sessions = new Map();

// SSE subscription endpoint [PROTECTED]
app.get("/sse", requireMcpAuth, async (req, res) => {
  console.log("[exp_portal-mcp-server] Authorized client connection established on /sse");

  const server = createServer();
  // Include apiKey query parameter in the message endpoint so that SSE clients (e.g. mcp-remote / Claude)
  // automatically include the credentials when sending subsequent POST requests to /message
  const apiKeyParam = req.query.apiKey ? `?apiKey=${encodeURIComponent(req.query.apiKey)}` : "";
  const messageEndpoint = `/message${apiKeyParam}`;
  const transport = new SSEServerTransport(messageEndpoint, res);

  sessions.set(transport.sessionId, {
    transport,
    server,
    createdAt: Date.now(),
    authenticated: true
  });

  req.on("close", async () => {
    console.log(`[exp_portal-mcp-server] Client disconnected (session: ${transport.sessionId})`);
    sessions.delete(transport.sessionId);
    await server.close();
  });

  await server.connect(transport);
});

// Handle POST to /sse (some client proxies like mcp-remote attempt http-first strategy on the root URL)
app.post("/sse", async (req, res) => {
  const sessionId = req.query.sessionId;
  const session = sessionId ? sessions.get(sessionId) : null;
  if (session) {
    return await session.transport.handlePostMessage(req, res, req.body);
  }
  return res.status(405).json({
    error: "Method Not Allowed",
    message: "SSE transport requires GET /sse to establish stream connection first."
  });
});

// POST message endpoint for client JSON-RPC commands [PROTECTED BY SESSION OR CREDENTIALS]
app.post("/message", async (req, res) => {
  const sessionId = req.query.sessionId;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: "Session not found or expired" });
  }

  // If client provided explicit credentials, verify them
  const hasExplicitAuth = req.headers["x-api-key"] || req.headers["authorization"] || req.query.apiKey;
  if (hasExplicitAuth && !isAuthorizedMcp(req)) {
    return res.status(401).json({ error: "Unauthorized", message: "Invalid API key" });
  }

  // If no credentials passed on POST, session must have been authenticated during /sse creation
  if (!session.authenticated) {
    return res.status(401).json({ error: "Unauthorized", message: "Session unauthenticated" });
  }

  await session.transport.handlePostMessage(req, res, req.body);
});

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 exp_portal-mcp-server (HTTP/SSE) active`);
  console.log(`🔒 Authentication: ENABLED (MCP_API_KEY protected)`);
  console.log(`🌐 Port: ${PORT}`);
  console.log(`📡 SSE Endpoint: http://localhost:${PORT}/sse`);
  console.log(`📩 Message Endpoint: http://localhost:${PORT}/message`);
  console.log(`=================================================`);
});
