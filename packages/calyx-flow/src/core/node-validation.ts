import type { NodeData, NodeDefinition, NodeInputPortInstance, NodeOutputPortInstance, Option } from '@/types'

function getOptionValues<T>(option: Option<T[]>): T[] {
  return option.type === 'Some' ? option.value : []
}

function getDuplicateValues(values: string[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value)
      continue
    }

    seen.add(value)
  }

  return Array.from(duplicates)
}

function formatQuotedValues(values: string[]): string {
  return values.map((value) => `"${value}"`).join(', ')
}

function validateNamedCollectionNamesAreUnique<T extends { name: string }>(nodeName: string, collectionLabel: string, collection: Option<T[]>): void {
  const duplicateNames = getDuplicateValues(getOptionValues(collection).map((item) => item.name))
  if (duplicateNames.length > 0) {
    throw new Error(`Duplicate ${collectionLabel} names found in node "${nodeName}": ${formatQuotedValues(duplicateNames)}`)
  }
}

function validatePortIdsAreUnique<T extends { id: string }>(nodeName: string, portKind: 'input' | 'output', ports: Option<T[]>): void {
  const duplicateIds = getDuplicateValues(getOptionValues(ports).map((port) => port.id))
  if (duplicateIds.length > 0) {
    throw new Error(`Duplicate ${portKind} port ids found in node "${nodeName}": ${formatQuotedValues(duplicateIds)}`)
  }
}

function validateNodeDefinitionNamesAreUnique(definition: NodeDefinition): void {
  validateNamedCollectionNamesAreUnique(definition.name, 'parameter definition', definition.parameters)
  validateNamedCollectionNamesAreUnique(definition.name, 'input port definition', definition.inputs)
  validateNamedCollectionNamesAreUnique(definition.name, 'output port definition', definition.outputs)
}

function validateNodeDataNamesAreUnique(nodeName: string, nodeData: NodeData): void {
  validateNamedCollectionNamesAreUnique(nodeName, 'parameter data', nodeData.parameters)
  validateNamedCollectionNamesAreUnique(nodeName, 'input port data', nodeData.inputs)
  validateNamedCollectionNamesAreUnique(nodeName, 'output port data', nodeData.outputs)
}

function validateNodePortIdsAreUnique(nodeName: string, inputs: Option<NodeInputPortInstance[]>, outputs: Option<NodeOutputPortInstance[]>): void {
  validatePortIdsAreUnique(nodeName, 'input', inputs)
  validatePortIdsAreUnique(nodeName, 'output', outputs)
}

function validateOutputRequiredInputsAreUnique(nodeName: string, outputs: Option<NodeOutputPortInstance[]>): void {
  for (const output of getOptionValues(outputs)) {
    if (output.requiredInputs.type === 'None') {
      continue
    }

    const duplicateRequiredInputs = getDuplicateValues(output.requiredInputs.value)
    if (duplicateRequiredInputs.length > 0) {
      throw new Error(`Duplicate requiredInputs found in output port "${output.name}" of node "${nodeName}": ${formatQuotedValues(duplicateRequiredInputs)}`)
    }
  }
}

function validateRequiredInputsDoNotExistWithoutInputs(
  nodeName: string,
  inputs: Option<NodeInputPortInstance[]>,
  outputs: Option<NodeOutputPortInstance[]>
): void {
  const inputNames = getOptionValues(inputs).map((input) => input.name)
  if (inputNames.length > 0) {
    return
  }

  for (const output of getOptionValues(outputs)) {
    if (output.requiredInputs.type === 'Some' && output.requiredInputs.value.length > 0) {
      throw new Error(`Output port "${output.name}" in node "${nodeName}" declares requiredInputs, but the node has no inputs`)
    }
  }
}

function validateOutputRequiredInputsReferenceExistingInputs(
  nodeName: string,
  inputs: Option<NodeInputPortInstance[]>,
  outputs: Option<NodeOutputPortInstance[]>
): void {
  const inputNames = new Set(getOptionValues(inputs).map((input) => input.name))

  for (const output of getOptionValues(outputs)) {
    if (output.requiredInputs.type === 'None') {
      continue
    }

    const missingRequiredInputs = output.requiredInputs.value.filter((requiredInputName) => !inputNames.has(requiredInputName))
    if (missingRequiredInputs.length > 0) {
      throw new Error(`Output port "${output.name}" in node "${nodeName}" references missing requiredInputs: ${formatQuotedValues(missingRequiredInputs)}`)
    }
  }
}

export {
  validateNodeDataNamesAreUnique,
  validateNodeDefinitionNamesAreUnique,
  validateNodePortIdsAreUnique,
  validateOutputRequiredInputsAreUnique,
  validateOutputRequiredInputsReferenceExistingInputs,
  validateRequiredInputsDoNotExistWithoutInputs,
}
