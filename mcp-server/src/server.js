import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getStudentsSchema,
  getStudentsDescription,
  handleGetStudents
} from "./tools/studentsTool.js";
import {
  getJobsSchema,
  getJobsDescription,
  handleGetJobs
} from "./tools/jobsTool.js";

/**
 * Instantiate and configure the Model Context Protocol (MCP) server
 * Supports scope-checked tool execution (SEC-01 & SEC-08)
 */
export function createServer(sessionContext = {}) {
  const server = new McpServer({
    name: "exp_portal-mcp-server",
    version: "2.0.0"
  });

  const scopes = sessionContext.scopes || [];

  // Register the get_students tool
  server.tool(
    "get_students",
    getStudentsDescription,
    getStudentsSchema,
    async (args) => {
      // SEC-01 & SEC-08: Validate read:students scope
      if (scopes.length > 0 && !scopes.includes("read:students")) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Forbidden: Token lacks required scope 'read:students'."
            }
          ]
        };
      }
      return await handleGetStudents(args);
    }
  );

  // Register the get_jobs tool
  server.tool(
    "get_jobs",
    getJobsDescription,
    getJobsSchema,
    async (args) => {
      // SEC-01 & SEC-08: Validate read:jobs scope
      if (scopes.length > 0 && !scopes.includes("read:jobs")) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Forbidden: Token lacks required scope 'read:jobs'."
            }
          ]
        };
      }
      return await handleGetJobs(args);
    }
  );

  return server;
}
