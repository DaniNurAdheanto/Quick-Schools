import { z } from "zod";

export const CreateStudentSchema = z.object({
  studentCode: z.string().min(1, "Student code is required"),
  dateOfBirth: z.date(),
  userId: z.string().cuid(),
  schoolId: z.string().cuid(),
});

export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;
