import { z } from "zod";

export const aspectRatioSchema = z.enum(["16:9", "9:16"]);

export const promptRequestSchema = z.object({
  topic: z.string().trim().min(1).max(500),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]),
});

export const generationRequestSchema = z.object({
  projectId: z.string().uuid(),
  prompt: z.string().trim().min(10).max(8000),
  aspectRatio: aspectRatioSchema,
  durationSeconds: z.coerce.number().int().min(3).max(10),
  idempotencyKey: z.string().min(16).max(128),
  confirmBillable: z.literal(true),
  dryRun: z.boolean().optional().default(false),
});

const blockedPatterns = [
  /(?:minor|child|underage|미성년).{0,30}(?:sexual|nude|성적|나체)/i,
  /(?:non-consensual|비동의).{0,30}(?:intimate|sexual|성적|사적)/i,
  /(?:impersonat|사칭).{0,40}(?:fraud|scam|사기)/i,
  /(?:deceptive|기만).{0,40}(?:political|election|정치|선거)/i,
];

export function isBlockedPrompt(prompt: string) {
  return blockedPatterns.some((pattern) => pattern.test(prompt));
}
