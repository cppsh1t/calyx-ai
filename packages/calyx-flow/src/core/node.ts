import type { NodeInputPortData, NodeParameter, NodeParameterData } from '@/types/core/node.ts'
import { NodeParameterDataSchema, NodeParameterSchema } from '@/types/core/node.ts'
import type { Option } from '@/types/structure'
import { None, Some } from '@/utils/structure'
import z from 'zod'

function createNodeParameterBuilder(data?: Partial<NodeParameterData>) {
  let state: Partial<NodeParameterData> = {
    name: data?.name,
    description: data?.description,
    schema: data?.schema,
    value: data?.value,
  }

  return {
    setName(name: NodeParameterData['name']) {
      state.name = name
      return this
    },
    setDescription(description: NodeParameterData['description']) {
      state.description = description
      return this
    },
    setSchema(schema: NodeParameterData['schema']) {
      state.schema = schema
      return this
    },
    setValue(value: NodeParameterData['value']) {
      state.value = value
      return this
    },
    from(obj: object) {
      const result = NodeParameterDataSchema.safeParse(obj)
      if (!result.success) {
        throw new Error(`Invalid NodeParameterData: ${result.error.message}`)
      }
      state = result.data
      return this
    },
    build(): NodeParameter {
      const result = NodeParameterDataSchema.safeParse(state)
      if (!result.success) {
        throw new Error(`Invalid NodeParameterData: ${result.error.message}`)
      }

      const validatedData = result.data
      const zodSchema = z.fromJSONSchema(validatedData.schema)

      let optionValue: Option<unknown>
      if (validatedData.value === undefined || validatedData.value === null) {
        optionValue = None
      } else {
        const valueResult = zodSchema.safeParse(validatedData.value)
        if (!valueResult.success) {
          throw new Error(`Invalid NodeParameter value for "${validatedData.name}": ${valueResult.error.message}`)
        }
        optionValue = Some(valueResult.data)
      }

      const combine = {
        ...validatedData,
        schema: zodSchema,
        value: optionValue,
      }
      const combineResult = NodeParameterSchema.safeParse(combine)
      if (!combineResult.success) {
        throw new Error(`Invalid NodeParameter: ${combineResult.error.message}`)
      }
      return combineResult.data as NodeParameter
    },
  }
}


export { createNodeParameterBuilder }
