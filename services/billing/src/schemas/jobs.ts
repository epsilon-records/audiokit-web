// Request schemas for the job routes. Exported so they can be unit-tested.
import { z } from 'zod';

export const JOB_OPERATIONS = [
  'probe',
  'loudness',
  'waveform',
  'transcode',
  'preview',
  'tempo',
  'key',
  'fingerprint',
  'analyze',
  'tags',
] as const;

export const submitJobSchema = z.object({
  job_id: z.string().min(1).max(200),
  operation: z.enum(JOB_OPERATIONS),
  input: z.object({
    url: z.string().url(),
    sha256: z.string().optional(),
  }),
  webhook: z
    .object({
      url: z.string().url(),
    })
    .optional(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export const listJobsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(['queued', 'running', 'succeeded', 'failed', 'canceled']).optional(),
  operation: z.enum(JOB_OPERATIONS).optional(),
});

export type SubmitJobInput = z.infer<typeof submitJobSchema>;
export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>;
