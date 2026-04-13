import type { Option } from '@/types'

const Some = <T>(value: T): Option<T> => ({ type: 'Some', value })
const None: Option<never> = { type: 'None' }
const unwrap = <T>(option: Option<T>): T => {
  if (option.type === 'Some') return option.value
  throw new Error('Cannot unwrap a None value')
}
const unwrapOr = <T>(option: Option<T>, defaultValue: T): T => {
  return option.type === 'Some' ? option.value : defaultValue
}

export { None, Some, unwrap, unwrapOr }
