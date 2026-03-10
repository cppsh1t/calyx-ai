import zod from 'zod'
import './index.css'

const testschema = zod.object({
  filePath: zod.string().meta({ description: '文件地址' }),
  line: zod.number().optional().meta({ description: '读取的行数, 不填则为所有行' }),
})

export function App() {
  return (
    <div>
      <div> {JSON.stringify(testschema.toJSONSchema({ target: 'openapi-3.0' }), null, 2)}</div>
      <div> {JSON.stringify(testschema.toJSONSchema({ target: 'draft-04' }), null, 2)}</div>
      <div> {JSON.stringify(testschema.toJSONSchema({ target: 'draft-07' }), null, 2)}</div>
      <div> {JSON.stringify(testschema.toJSONSchema({ target: 'draft-2020-12' }), null, 2)}</div>
    </div>
  )
}

export default App
