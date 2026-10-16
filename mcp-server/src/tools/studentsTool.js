import { z } from "zod";
import { queryStudents } from "../dataProvider.js";

export const getStudentsSchema = {
  student_id: z
    .number()
    .optional()
    .describe("Specific student ID (1-100) to fetch a single student record"),
  search: z
    .string()
    .optional()
    .describe("Search keyword to match against student name, email, or skills"),
  tech_stack: z
    .enum(["MERN", "MEAN", "Python", "Android", "iOS"])
    .optional()
    .describe("Filter students by their primary technical stack"),
  skill: z
    .string()
    .optional()
    .describe("Filter by specific technical sub-skill (e.g. 'React', 'Docker', 'FastAPI', 'SwiftUI', 'Kotlin')"),
  proficiency: z
    .enum(["Beginner", "Intermediate", "Advanced"])
    .optional()
    .describe("Filter students who possess skills at a specific proficiency level"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(10)
    .optional()
    .describe("Maximum number of records to return (default: 10, max: 100)"),
  offset: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe("Number of records to skip for pagination (default: 0)")
};

export const getStudentsDescription =
  "Retrieve student directory records including privacy-minimized contact details (masked email and masked mobile number), enrolled/graduation years, and technical skill profiles with proficiency levels and sub-skills across MERN, MEAN, Python, Android, and iOS stacks. Supports searching, filtering by stack or sub-skill, and pagination.";

export async function handleGetStudents(args) {
  try {
    const result = await queryStudents(args);
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
          text: `Error retrieving student records: ${error.message}`
        }
      ]
    };
  }
}
