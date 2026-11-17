import { z } from 'zod';

/** Route params of every `/:id` endpoint; ids are UUIDs (v7). */
export const idParamsSchema = z.object({ id: z.uuid() });
