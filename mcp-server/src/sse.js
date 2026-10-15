import express from "express";
import cors from "cors";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer } from "./server.js";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());

// Health check and root descriptor for Render
app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    server: "exp_portal-mcp-server",
    protocol: "Model Context Protocol (MCP)",
    transport: "HTTP/SSE",
    endpoints: {
      sse: "/sse",
      message: "/message",
      health: "/health"
    },
    tools: ["get_students", "get_jobs"]
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Map active client sessions
const sessions = new Map();

// SSE subscription endpoint
app.get("/sse", async (req, res) => {
  console.log("[exp_portal-mcp-server] Incoming client connection on /sse");
  
  const server = createServer();
  const transport = new SSEServerTransport("/message", res);

  sessions.set(transport.sessionId, { transport, server });

  req.on("close", async () => {
    console.log(`[exp_portal-mcp-server] Client disconnected (session: ${transport.sessionId})`);
    sessions.delete(transport.sessionId);
    await server.close();
  });

  await server.connect(transport);
});

// POST message endpoint for client JSON-RPC commands
app.post("/message", async (req, res) => {
  const sessionId = req.query.sessionId;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: "Session not found or expired" });
  }

  await session.transport.handlePostMessage(req, res);
});

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 exp_portal-mcp-server (HTTP/SSE) active`);
  console.log(`🌐 Port: ${PORT}`);
  console.log(`📡 SSE Endpoint: http://localhost:${PORT}/sse`);
  console.log(`📩 Message Endpoint: http://localhost:${PORT}/message`);
  console.log(`=================================================`);
});
