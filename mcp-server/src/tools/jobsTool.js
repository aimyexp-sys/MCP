import { z } from "zod";
import { queryJobs } from "../dataProvider.js";

export const getJobsSchema = {
  job_id: z
    .string()
    .optional()
    .describe("Specific Job ID (e.g., 'JOB-001', 'JOB-045') to fetch a single vacancy record"),
  search: z
    .string()
    .optional()
    .describe("Keyword search across job title, company name, description, required skills, and preferred qualifications"),
  tech_stack: z
    .enum(["MERN", "MEAN", "Python", "Android", "iOS"])
    .optional()
    .describe("Filter job vacancies by primary tech stack or category"),
  experience_level: z
    .enum(["Junior", "Mid-Level", "Senior", "Lead"])
    .optional()
    .describe("Filter vacancies by required experience level"),
  job_type: z
    .enum(["Full-Time", "Part-Time", "Contract", "Remote", "Hybrid"])
    .optional()
    .describe("Filter by work arrangement / employment type"),
  location: z
    .string()
    .optional()
    .describe("Filter by location string (e.g. 'Remote', 'New York', 'San Francisco')"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(10)
    .optional()
    .describe("Maximum number of job records to return (default: 10, max: 100)"),
  offset: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe("Number of records to skip for pagination (default: 0)")
};

export const getJobsDescription =
  "Retrieve job vacancies from the Job Portal directory. Includes company details, HR contacts, job role descriptions, technical requirements (required & preferred skills, experience level, education), salary ranges, and work arrangements. Supports keyword search, category/stack filtering, experience level filtering, and pagination.";

export async function handleGetJobs(args) {
  try {
    const result = await queryJobs(args);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Error retrieving job postings: ${error.message}`
        }
      ]
    };
  }
}
