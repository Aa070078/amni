import { z } from "zod";
import { emailSchema } from "./auth.js";

export const MailTemplate = {
  VERIFICATION: "verification",
  RESET: "reset",
  WELCOME: "welcome",
  INVITATION: "invitation",
} as const;

export type MailTemplate = (typeof MailTemplate)[keyof typeof MailTemplate];

export const mailJobSchema = z.discriminatedUnion("template", [
  z.object({
    template: z.literal(MailTemplate.VERIFICATION),
    to: emailSchema,
    firstName: z.string().trim().min(1).max(80),
    token: z.string().min(1),
  }),
  z.object({
    template: z.literal(MailTemplate.RESET),
    to: emailSchema,
    firstName: z.string().trim().min(1).max(80),
    token: z.string().min(1),
  }),
  z.object({
    template: z.literal(MailTemplate.WELCOME),
    to: emailSchema,
    firstName: z.string().trim().min(1).max(80),
    companyName: z.string().trim().min(1).max(120),
  }),
  z.object({
    template: z.literal(MailTemplate.INVITATION),
    to: emailSchema,
    firstName: z.string().trim().min(1).max(80),
    companyName: z.string().trim().min(1).max(120),
    role: z.string().trim().min(1).max(40),
    token: z.string().min(1),
  }),
]);

export type MailJob = z.infer<typeof mailJobSchema>;
