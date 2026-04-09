import { z } from 'zod'

export type Option<T> = { type: 'Some'; value: T } | { type: 'None' }

export const optionSchema = <T extends z.ZodTypeAny>(inner: T) =>
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('Some'),
      value: inner,
    }),
    z.object({
      type: z.literal('None'),
    }),
  ])
