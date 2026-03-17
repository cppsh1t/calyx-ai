import type { Option } from '@/types'

const Some = <T>(value: T): Option<T> => ({ type: 'Some', value })
const None: Option<never> = { type: 'None' }

export { None, Some }
