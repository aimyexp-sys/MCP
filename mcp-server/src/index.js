#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();

  // Handle process shutdown cleanly
  process.on("SIGINT", async () => {
    console.error("[exp_portal-mcp-server] Received SIGINT, shutting down...");
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.error("[exp_portal-mcp-server] Received SIGTERM, shutting down...");
    await server.close();
    process.exit(0);
  });

  // Connect over Standard Input/Output
  await server.connect(transport);
  console.error("=================================================");
  console.error("🚀 exp_portal-mcp-server running on stdio");
  console.error("🛠️  Exposed Tools: get_students, get_jobs");
  console.error("=================================================");
}

main().catch((error) => {
  console.error("[exp_portal-mcp-server] Fatal startup error:", error);
  process.exit(1);
});
