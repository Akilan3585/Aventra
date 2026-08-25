import { z } from "zod";

const currentYear = new Date().getFullYear();
const databaseIdentifierPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const departmentIdentifierSchema = z
  .string()
  .trim()
  .regex(databaseIdentifierPattern, "Select a valid department.");

export const studentOnboardingSchema = z.object({
  admissionYear: z.coerce.number().int().min(2000).max(currentYear + 1),
  departmentId: departmentIdentifierSchema,
  displayName: z.string().trim().min(2, "Enter your full name.").max(120),
  semester: z.coerce.number().int().min(1).max(16),
  studentNumber: z
    .string()
    .trim()
    .min(2, "Enter your college student number.")
    .max(40)
    .regex(/^[A-Za-z0-9/_-]+$/, "Use only letters, numbers, /, _ or -."),
});

export type StudentOnboardingInput = z.infer<typeof studentOnboardingSchema>;

export type StudentOnboardingState = {
  message: string;
  status: "idle" | "error" | "success";
};

export const initialStudentOnboardingState: StudentOnboardingState = {
  message: "",
  status: "idle",
};

export function canSubmitStudentOnboarding({
  role,
  status,
}: {
  role: string | null;
  status: string;
}) {
  return (role === null || role === "student") &&
    (status === "unlinked" || status === "pending");
}
