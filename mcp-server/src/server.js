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
 */
export function createServer() {
  const server = new McpServer({
    name: "exp_portal-mcp-server",
    version: "1.0.0"
  });

  // Register the get_students tool
  server.tool(
    "get_students",
    getStudentsDescription,
    getStudentsSchema,
    handleGetStudents
  );

  // Register the get_jobs tool
  server.tool(
    "get_jobs",
    getJobsDescription,
    getJobsSchema,
    handleGetJobs
  );

  return server;
}
