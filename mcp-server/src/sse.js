import express from "express";
import cors from "cors";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer } from "./server.js";
import {
  extractBearerToken,
  verifyAuth0Token,
  getOAuthProtectedResourceMetadata,
  getAuthorizationServerMetadata,
  handleDynamicClientRegistration
} from "./auth.js";

const app = express();
const PORT = process.env.PORT || 8080;

// ── Strict CORS Policy (SEC-03) ──────────────────────────────────
// Reject '*', configure exact allowed origins, credentials: false
const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://localhost:4000",
  "http://localhost:8080",
  "https://students-portal.onrender.com",
  "https://job-portal-web.onrender.com",
  "https://exp-portal-mcp-server.onrender.com"
];

const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter((s) => s && s !== "*") // Reject '*' wildcard
  : [];

const allowedOriginsSet = new Set([...defaultOrigins, ...envOrigins]);

const corsOptions = {
  origin: (origin, callback) => {
    // Non-browser callers without Origin (curl, CLI) pass CORS check,
    // but protected operations still require Authorization: Bearer <token>.
    if (!origin) return callback(null, true);
    if (allowedOriginsSet.has(origin)) {
      return callback(null, true);
    }

    try {
      const url = new URL(origin);
      if (
        url.hostname.endsWith(".onrender.com") &&
        (url.hostname.startsWith("students-portal") ||
         url.hostname.startsWith("job-portal-web") ||
         url.hostname.startsWith("exp-portal-mcp-server") ||
         url.hostname.startsWith("job-portal-server") ||
         url.hostname.startsWith("students-server"))
      ) {
        return callback(null, true);
      }
    } catch (e) {}

    // Unconfigured browser origins do NOT receive CORS headers
    return callback(null, false);
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false // SEC-03: Disable credentialed CORS
};

app.use(cors(corsOptions));
app.use(express.json());

// ── Redact Authorization header from logs (SEC-06) ──────────────
function getBaseUrl(req) {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.get("host") || `localhost:${PORT}`;
  return `${protocol}://${host}`;
}

// ── OAuth Challenge Helper (SEC-01) ─────────────────────────────
function sendOAuthChallenge(req, res, errorDescription = "Authentication required") {
  const baseUrl = getBaseUrl(req);
  res.setHeader(
    "WWW-Authenticate",
    `Bearer error="invalid_token", error_description="${errorDescription}", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource", scope="read:students read:jobs"`
  );
  return res.status(401).json({
    error: "Unauthorized",
    message: `${errorDescription}. Provide a valid Auth0 OAuth access token in 'Authorization: Bearer <token>' header.`,
    protocol: "Model Context Protocol (MCP)",
    transport: "HTTP/SSE"
  });
}

// ── Authentication Middleware (SEC-01 & SEC-06) ──────────────────
async function requireMcpAuth(req, res, next) {
  // SEC-06: Accept tokens ONLY in Authorization: Bearer header. Query keys are rejected.
  const token = extractBearerToken(req);
  if (!token) {
    return sendOAuthChallenge(req, res, "Missing Bearer token");
  }

  try {
    const userSession = await verifyAuth0Token(token);
    req.mcpUser = userSession;
    next();
  } catch (err) {
    return sendOAuthChallenge(req, res, `Invalid token: ${err.message}`);
  }
}

// ── OAuth Discovery & DCR Endpoints (SEC-01 & SEC-08) ───────────

// RFC 9470 OAuth Protected Resource Metadata
app.get("/.well-known/oauth-protected-resource", (req, res) => {
  const baseUrl = getBaseUrl(req);
  res.status(200).json(getOAuthProtectedResourceMetadata(baseUrl));
});

// RFC 8414 Authorization Server Metadata / OpenID Configuration
app.get(["/.well-known/oauth-authorization-server", "/.well-known/openid-configuration"], (req, res) => {
  const baseUrl = getBaseUrl(req);
  res.status(200).json(getAuthorizationServerMetadata(baseUrl));
});

// RFC 7591 Dynamic Client Registration (SEC-08)
app.post("/register", (req, res) => {
  handleDynamicClientRegistration(req, res);
});

// ── Health Check and Root Descriptor ────────────────────────────
app.get("/", async (req, res) => {
  const token = extractBearerToken(req);
  let authenticated = false;
  let user = null;
  if (token) {
    try {
      user = await verifyAuth0Token(token);
      authenticated = true;
    } catch (e) {
      authenticated = false;
    }
  }

  const baseUrl = getBaseUrl(req);
  res.status(200).json({
    status: "ok",
    server: "exp_portal-mcp-server",
    protocol: "Model Context Protocol (MCP)",
    transport: "HTTP/SSE",
    authentication: {
      type: "OAuth 2.0 / Auth0",
      required: true,
      authenticated,
      user: user ? { sub: user.sub, scopes: user.scopes } : null,
      supportedMethod: "Header: Authorization: Bearer <token>"
    },
    oauthDiscovery: {
      protectedResourceMetadata: `${baseUrl}/.well-known/oauth-protected-resource`,
      authorizationServerMetadata: `${baseUrl}/.well-known/oauth-authorization-server`,
      dynamicClientRegistration: `${baseUrl}/register`
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

app.get("/auth/status", async (req, res) => {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(200).json({
      authenticated: false,
      role: "unauthenticated",
      message: "No Authorization: Bearer token detected."
    });
  }

  try {
    const user = await verifyAuth0Token(token);
    res.status(200).json({
      authenticated: true,
      role: "authorized_mcp_client",
      sub: user.sub,
      scopes: user.scopes,
      message: "Valid Auth0 OAuth token verified."
    });
  } catch (err) {
    res.status(200).json({
      authenticated: false,
      role: "invalid_token",
      error: err.message
    });
  }
});

// Map active client sessions
const sessions = new Map();

// SSE subscription endpoint [PROTECTED BY AUTH0 OAUTH]
app.get("/sse", requireMcpAuth, async (req, res) => {
  console.log(`[exp_portal-mcp-server] Authorized client connected on /sse (sub: ${req.mcpUser.sub})`);

  // Scope-checked server instance (SEC-08)
  const server = createServer({ user: req.mcpUser, scopes: req.mcpUser.scopes });

  // Clean message endpoint URL without query parameters or credentials (SEC-06)
  const messageEndpoint = "/message";
  const transport = new SSEServerTransport(messageEndpoint, res);

  sessions.set(transport.sessionId, {
    transport,
    server,
    userSession: req.mcpUser,
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

// Handle POST to /sse (return 405 Method Not Allowed)
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

// POST message endpoint for client JSON-RPC commands [PROTECTED BY SESSION & OAUTH]
app.post("/message", async (req, res) => {
  const sessionId = req.query.sessionId;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: "Session not found or expired" });
  }

  // If client provides explicit Bearer token on POST, verify it
  const explicitToken = extractBearerToken(req);
  if (explicitToken) {
    try {
      await verifyAuth0Token(explicitToken);
    } catch (err) {
      return sendOAuthChallenge(req, res, `Invalid token: ${err.message}`);
    }
  }

  if (!session.authenticated) {
    return sendOAuthChallenge(req, res, "Session unauthenticated");
  }

  await session.transport.handlePostMessage(req, res, req.body);
});

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 exp_portal-mcp-server (HTTP/SSE) active`);
  console.log(`🔒 Authentication: ENABLED (Auth0 OAuth 2.0 Protected)`);
  console.log(`🌐 Port: ${PORT}`);
  console.log(`📡 SSE Endpoint: http://localhost:${PORT}/sse`);
  console.log(`📩 Message Endpoint: http://localhost:${PORT}/message`);
  console.log(`=================================================`);
});
