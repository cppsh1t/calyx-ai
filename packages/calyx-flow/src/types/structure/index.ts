import { z } from 'zod'

export type TypeSome<T> = {type: 'Some'; value: T} 
export type TypeNone = {type: 'None'}
export type Option<T> = TypeSome<T> | TypeNone

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
