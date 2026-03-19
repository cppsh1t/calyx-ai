/** @jsxImportSource react */

import { ComplexParameterControl } from '@/components/ComplexParameterControl.tsx'
import { PrimitiveParameterControl } from '@/components/PrimitiveParameterControl.tsx'
import { SchemaInfoPopover } from '@/components/SchemaInfoPopover.tsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx'
import { isComplex, isPrimitive } from '@/utils/classify.ts'
import { Handle, Position } from '@xyflow/react'
import type { NodeParameter, NodePort, Option } from 'calyx-flow/types'

/**
 * Data shape for FlowNode component props.
 * Mirrors the data structure created by domainNodeToXYFlowNode adapter.
 */
export type FlowNodeData = {
  label: string
  description?: string
  inputs?: NodePort[]
  outputs?: NodePort[]
  /** Node parameters for in-node editing */
  parameters?: NodeParameter[]
  /**
   * Callback invoked when a parameter value changes.
   * Passed up from PrimitiveParameterControl to parent FlowEditor.
   */
  onParameterChange?: (paramName: string, value: Option<unknown>) => void
}

/**
 * Check if a parameter value should use primitive in-node controls.
 * Returns true for string, number, boolean, undefined (for None values),
 * or any Some value containing a primitive.
 *
 * @param param - The node parameter to check
 * @returns true if the parameter should use primitive controls
 */
function isPrimitiveParameter(param: NodeParameter): boolean {
  // If parameter has no value (None), default to primitive (string input)
  if (param.value.type === 'None') {
    return true
  }
  // Check if the contained value is primitive
  return isPrimitive(param.value.value)
}

/**
 * Check if a parameter value should use complex parameter controls (textarea + modal).
 * Returns true for object, array, or null values.
 *
 * @param param - The node parameter to check
 * @returns true if the parameter should use complex controls
 */
function isComplexParameter(param: NodeParameter): boolean {
  // If parameter has no value (None), it defaults to primitive, not complex
  if (param.value.type === 'None') {
    return false
  }
  // Check if the contained value is complex (object, array, or null)
  return isComplex(param.value.value)
}

/**
 * Props for the FlowNode component.
 */
type FlowNodeProps = {
  data: FlowNodeData
}

/**
 * Custom node component that renders input/output port handles and primitive parameters.
 *
 * Input ports (type='target') render on the left side with handle ID format `in:{portId}`.
 * Output ports (type='source') render on the right side with handle ID format `out:{portId}`.
 * Primitive parameters render inline with appropriate controls (string/number/boolean inputs).
 *
 * Handles are rendered deterministically to match the adapter contract in flow-reactflow.ts.
 * Nodes without ports or parameters render safely.
 *
 * @example
 * ```tsx
 * <FlowNode
 *   data={{
 *     label: 'Process Node',
 *     inputs: [{ id: 'data', name: 'Data', schema: z.any(), direction: 'input', description: 'Input data', value: { type: 'None' } }],
 *     outputs: [{ id: 'result', name: 'Result', schema: z.any(), direction: 'output', description: 'Output result', value: { type: 'None' } }],
 *     parameters: [{ name: 'threshold', description: 'Threshold value', schema: z.number(), value: { type: 'Some', value: 0.5 } }],
 *     onParameterChange: (name, value) => console.log(`Param ${name} changed:`, value)
 *   }}
 * />
 * ```
 */
export function FlowNode({ data }: FlowNodeProps) {
  const inputs = data.inputs ?? []
  const outputs = data.outputs ?? []
  const parameters = data.parameters ?? []
  const onParameterChange = data.onParameterChange

  // Filter parameters by type
  const primitiveParams = parameters.filter(isPrimitiveParameter)
  const complexParams = parameters.filter(isComplexParameter)

  /**
   * Handle parameter value changes from PrimitiveParameterControl.
   * Wraps the callback to include the parameter name.
   */
  const handleParameterChange = (param: NodeParameter) => (value: Option<unknown>) => {
    onParameterChange?.(param.name, value)
  }

  const renderInputPort = (port: NodePort) => {
    return (
      <div
        key={port.id}
        className="group/port relative inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-sm"
      >
        <Handle
          type="target"
          position={Position.Left}
          id={`in:${port.id}`}
          style={{
            top: '50%',
            left: -7,
            width: 10,
            height: 10,
            borderRadius: 999,
            border: '1px solid #0f172a',
            background: '#f8fafc',
            transform: 'translateY(-50%)',
          }}
        />
        <span className="max-w-[88px] truncate">{port.name}</span>
        <SchemaInfoPopover title={port.name} schema={port.schema} description={port.description} className="opacity-80" />
      </div>
    )
  }

  const renderOutputPort = (port: NodePort) => {
    return (
      <div
        key={port.id}
        className="group/port relative inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-sm"
      >
        <span className="max-w-[88px] truncate">{port.name}</span>
        <SchemaInfoPopover title={port.name} schema={port.schema} description={port.description} className="opacity-80" />
        <Handle
          type="source"
          position={Position.Right}
          id={`out:${port.id}`}
          style={{
            top: '50%',
            right: -7,
            width: 10,
            height: 10,
            borderRadius: 999,
            border: '1px solid #0f172a',
            background: '#f8fafc',
            transform: 'translateY(-50%)',
          }}
        />
      </div>
    )
  }

  return (
    <div className="rounded-lg shadow-[0_14px_30px_-8px_rgba(0,0,0,0.75)]">
      <Card className="w-fit min-w-[180px] max-w-[360px] overflow-hidden rounded-lg backdrop-blur-sm">
        <div>
          <CardHeader className="rounded-t-lg bg-slate-900 px-3 py-1.5">
            <CardTitle className="truncate">{data.label}</CardTitle>
          </CardHeader>

          {onParameterChange && (primitiveParams.length > 0 || complexParams.length > 0) && (
            <CardContent className="max-h-72 space-y-1.5 overflow-x-hidden overflow-y-auto p-3">
              {primitiveParams.length > 0 && (
                <div className="space-y-2">
                  {primitiveParams.map((param) => (
                    <PrimitiveParameterControl key={param.name} parameter={param} onChange={handleParameterChange(param)} />
                  ))}
                </div>
              )}
              {complexParams.length > 0 && (
                <div className="space-y-2">
                  {complexParams.map((param) => (
                    <ComplexParameterControl key={param.name} parameter={param} onChange={handleParameterChange(param)} />
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </div>

        <div className="border-t border-slate-200/80 bg-slate-50/80 p-2">
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex min-w-0 max-w-[48%] flex-wrap gap-1.5">{inputs.map(renderInputPort)}</div>
            <div className="flex min-w-0 max-w-[48%] flex-wrap justify-end gap-1.5">{outputs.map(renderOutputPort)}</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
