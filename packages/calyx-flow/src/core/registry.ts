import type { NodeDefinition, Option } from '@/types'
import { NodeDefinitionSchema } from '@/types/core/node.ts'
import { None, Some } from '@/utils/structure'

// Node registry key type: namespace/group
type NodeRegistryKey = `${string}/${string}`

// Node registry entry
type NodeRegistryEntry = {
  key: NodeRegistryKey
  namespace: string
  group: string
  definition: NodeDefinition
}

// Node registry class
class NodeRegistry {
  private registry: Map<NodeRegistryKey, NodeRegistryEntry> = new Map()

  /**
   * Register a single Node definition
   * @param key - Registry key in format: namespace/group
   * @param definition - Node definition
   */
  register(key: NodeRegistryKey, definition: NodeDefinition): void {
    const [namespace, group] = key.split('/')
    if (!namespace || !group) {
      throw new Error(`Invalid registry key: ${key}. Expected format: namespace/group`)
    }

    // Validate definition with Zod schema
    const result = NodeDefinitionSchema.safeParse(definition)
    if (!result.success) {
      throw new Error(`Invalid NodeDefinition for key "${key}": ${result.error.message}`)
    }

    const entry: NodeRegistryEntry = {
      key,
      namespace,
      group,
      definition,
    }

    this.registry.set(key, entry)
  }

  /**
   * Register multiple Node definitions in batch
   * @param entries - Array of entries with key and definition
   */
  registerMany(entries: Array<{ key: NodeRegistryKey; definition: NodeDefinition }>): void {
    for (const entry of entries) {
      this.register(entry.key, entry.definition)
    }
  }

  /**
   * Get all registered keys
   * @returns Array of all registered keys
   */
  getKeys(): NodeRegistryKey[] {
    return Array.from(this.registry.keys())
  }

  /**
   * Check if a key is registered
   * @param key - Key to check
   * @returns Whether the key is registered
   */
  has(key: NodeRegistryKey): boolean {
    return this.registry.has(key)
  }

  /**
   * Get all registered entries
   * @returns Array of all registry entries
   */
  getAll(): NodeRegistryEntry[] {
    return Array.from(this.registry.values())
  }

  /**
   * Get all entries for a specific namespace
   * @param namespace - Namespace name
   * @returns Array of entries in the namespace
   */
  getByNamespace(namespace: string): NodeRegistryEntry[] {
    return this.getAll().filter((entry) => entry.namespace === namespace)
  }

  /**
   * Get all entries for a specific group
   * @param group - Group name
   * @returns Array of entries in the group
   */
  getByGroup(group: string): NodeRegistryEntry[] {
    return this.getAll().filter((entry) => entry.group === group)
  }

  /**
   * Read Node definition (interface reserved)
   * @param key - Key to read
   */
  get(key: NodeRegistryKey): Option<NodeRegistryEntry> {
    const result = this.registry.get(key)
    return result ? Some(result) : None
  }

  /**
   * Clear all registered entries
   */
  clear(): void {
    this.registry.clear()
  }
}

export { NodeRegistry }
export type { NodeRegistryEntry, NodeRegistryKey }
