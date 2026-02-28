import type { KeyEvent } from '@opentui/core'

export enum ElementBindPriorityEnum {
  PAGE = 0,
  COMMAND = 1,
  DIALOG = 2,
}

export type ElementBindPriority = number | ElementBindPriorityEnum

export type KeyEventFilter = Pick<KeyEvent, 'name' | 'ctrl' | 'shift' | 'meta'>

export type ElementLayer = {
  id: string
  filter: KeyEventFilter
  priority: ElementBindPriority
}

const layers: ElementLayer[] = []

export function checkLayerOperationPremission(param: ElementLayer): boolean {
  const filteredLayers = layers.filter((layer) => {
    return JSON.stringify(layer.filter) === JSON.stringify(param.filter)
  })

  const hasBiggerPriority = filteredLayers.some((layer) => layer.priority > param.priority)
  return !hasBiggerPriority
}

export function registerLayer(layer: { id: string; filter: KeyEventFilter; priority: ElementBindPriority }) {
  layers.push(layer)
  layers.sort((a, b) => a.priority - b.priority)

  const checkHelper = () => {
    return checkLayerOperationPremission(layer)
  }
  return {
    unregister: () => {
      unregisterLayer(layer.id)
    },
    check: checkHelper,
  }
}

export function unregisterLayer(id: string): void {
  const index = layers.findIndex((layer) => layer.id === id)
  if (index !== -1) {
    layers.splice(index, 1)
  }
}
