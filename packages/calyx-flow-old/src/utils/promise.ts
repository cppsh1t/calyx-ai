type SuccesResult<T> = { type: 'success'; value: T }
type ErrorResult = { type: 'failed'; error: Error }
type Result<T> = SuccesResult<T> | ErrorResult

export async function catchPromise<T>(promise: Promise<T>): Promise<Result<T>> {
  const result = await promise.then(
    (res) => ({ type: 'success', value: res }) as const,
    (reason) => ({ type: 'failed', error: new Error(JSON.stringify(reason)) } as const)
  )
  return result
}
