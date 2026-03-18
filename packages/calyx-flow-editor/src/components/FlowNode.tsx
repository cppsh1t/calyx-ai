/** @jsxImportSource react */

import { ComplexParameterControl } from '@/components/ComplexParameterControl.tsx'
import { PrimitiveParameterControl } from '@/components/PrimitiveParameterControl.tsx'
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

  return (
    <div className="flow-node">
      {/* Input handles - rendered on the left side */}
      {inputs.length > 0 && (
        <div className="flow-node__inputs">
          {inputs.map((port, index) => (
            <div key={port.id} className="flow-node__port flow-node__port--input" style={{ position: 'relative' }}>
              <Handle
                type="target"
                position={Position.Left}
                id={`in:${port.id}`}
                style={{
                  top: `${((index + 1) * 100) / (inputs.length + 1)}%`,
                }}
              />
              <span className="flow-node__port-label">{port.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Node content */}
      <div className="flow-node__content">
        <div className="flow-node__label">{data.label}</div>
        {data.description && <div className="flow-node__description">{data.description}</div>}

        {/* Primitive parameters - rendered inline */}
        {primitiveParams.length > 0 && onParameterChange && (
          <div className="flow-node__parameters">
            {primitiveParams.map((param) => (
              <PrimitiveParameterControl key={param.name} parameter={param} onChange={handleParameterChange(param)} />
            ))}
          </div>
        )}

        {/* Complex parameters - rendered with textarea preview + modal */}
        {complexParams.length > 0 && onParameterChange && (
          <div className="flow-node__complex-parameters">
            {complexParams.map((param) => (
              <ComplexParameterControl key={param.name} parameter={param} onChange={handleParameterChange(param)} />
            ))}
          </div>
        )}
      </div>

      {/* Output handles - rendered on the right side */}
      {outputs.length > 0 && (
        <div className="flow-node__outputs">
          {outputs.map((port, index) => (
            <div key={port.id} className="flow-node__port flow-node__port--output" style={{ position: 'relative' }}>
              <Handle
                type="source"
                position={Position.Right}
                id={`out:${port.id}`}
                style={{
                  top: `${((index + 1) * 100) / (outputs.length + 1)}%`,
                }}
              />
              <span className="flow-node__port-label">{port.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
