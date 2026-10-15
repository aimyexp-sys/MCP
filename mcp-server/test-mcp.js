import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createServer } from "./src/server.js";

async function runTestSuite() {
  console.log("==================================================");
  console.log("🧪 Running Portal MCP Server Automated Test Suite");
  console.log("==================================================\n");

  const server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client(
    { name: "test-mcp-client", version: "1.0.0" },
    { capabilities: {} }
  );

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  // 1. Verify Tool Registration
  console.log("▶ [Test 1] Listing Registered Tools...");
  const toolsResponse = await client.listTools();
  console.log(`  Found ${toolsResponse.tools.length} tool(s):`);
  for (const t of toolsResponse.tools) {
    console.log(`  - 🛠️  ${t.name}: ${t.description.slice(0, 70)}...`);
  }

  if (toolsResponse.tools.length !== 2) {
    throw new Error(`Expected 2 tools, got ${toolsResponse.tools.length}`);
  }

  // 2. Test get_students with tech_stack filter
  console.log("\n▶ [Test 2] Testing get_students with tech_stack = 'MERN' (limit = 2)...");
  const mernStudents = await client.callTool({
    name: "get_students",
    arguments: { tech_stack: "MERN", limit: 2 }
  });
  const mernData = JSON.parse(mernStudents.content[0].text);
  console.log(`  Total MERN Students Found: ${mernData.totalMatching}`);
  console.log(`  Returned: ${mernData.returnedCount} students`);
  console.log(`  Sample Student: ${mernData.students[0].name} (${mernData.students[0].contact.email})`);
  console.log(`  Skills Count: ${mernData.students[0].technicalSkills.length} stack(s)`);

  // 3. Test get_students single ID lookup
  console.log("\n▶ [Test 3] Testing get_students single ID lookup (student_id = 5)...");
  const singleStudent = await client.callTool({
    name: "get_students",
    arguments: { student_id: 5 }
  });
  const singleStudentData = JSON.parse(singleStudent.content[0].text);
  console.log(`  Student #5: ${singleStudentData.students[0].name}`);
  console.log(`  Mobile: ${singleStudentData.students[0].contact.mobile}`);

  // 4. Test get_jobs with tech_stack and experience_level
  console.log("\n▶ [Test 4] Testing get_jobs with tech_stack = 'Python', experience_level = 'Senior' (limit = 2)...");
  const seniorJobs = await client.callTool({
    name: "get_jobs",
    arguments: { tech_stack: "Python", experience_level: "Senior", limit: 2 }
  });
  const jobData = JSON.parse(seniorJobs.content[0].text);
  console.log(`  Total Matching Jobs: ${jobData.totalMatching}`);
  console.log(`  Returned: ${jobData.returnedCount} job(s)`);
  if (jobData.jobs.length > 0) {
    console.log(`  Sample Job: "${jobData.jobs[0].title}" at ${jobData.jobs[0].company.name}`);
    console.log(`  Salary: ${jobData.jobs[0].salary}`);
    console.log(`  Key Skills: ${jobData.jobs[0].requirements.requiredSkills.slice(0, 4).join(", ")}...`);
  }

  // 5. Test get_jobs single ID lookup
  console.log("\n▶ [Test 5] Testing get_jobs single ID lookup (job_id = 'JOB-001')...");
  const singleJob = await client.callTool({
    name: "get_jobs",
    arguments: { job_id: "JOB-001" }
  });
  const singleJobData = JSON.parse(singleJob.content[0].text);
  console.log(`  Job ID: ${singleJobData.jobs[0].id}`);
  console.log(`  Title: ${singleJobData.jobs[0].title}`);
  console.log(`  Company: ${singleJobData.jobs[0].company.name}`);
  console.log(`  HR Contact: ${singleJobData.jobs[0].company.contact.hrContactPerson}`);

  await client.close();
  await server.close();

  console.log("\n==================================================");
  console.log("✅ ALL TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================");
}

runTestSuite().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
