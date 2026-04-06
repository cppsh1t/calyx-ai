import type { FishMemo, FishMemoTree } from '@/types.ts'
import dayjs from 'dayjs'
import { nanoid } from 'nanoid'
import rfdc from 'rfdc'

const clone = rfdc()

function createFishMemo(root: FishMemoTree): FishMemo {
  const tickers: Array<(param: FishMemoTree) => boolean> = []

  function findNodeAndParent(tree: FishMemoTree, id: string, parent: FishMemoTree | null = null): { node: FishMemoTree; parent: FishMemoTree | null } | null {
    for (const child of tree.subTrees) {
      if (child.id === id) return { node: child, parent: tree }
      const found = findNodeAndParent(child, id, tree)
      if (found) return found
    }
    return null
  }

  function findAllMatching(tree: FishMemoTree, predicate: (node: FishMemoTree) => boolean): FishMemoTree[] {
    const result: FishMemoTree[] = []
    for (const child of tree.subTrees) {
      if (predicate(child)) result.push(child)
      result.push(...findAllMatching(child, predicate))
    }
    return result
  }

  function forEachSubTree(tree: FishMemoTree, fn: (node: FishMemoTree) => void): void {
    for (const child of tree.subTrees) {
      fn(child)
      forEachSubTree(child, fn)
    }
  }

  function updateAncestorTimestamps(targetId: string): void {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    function walk(tree: FishMemoTree): boolean {
      for (const child of tree.subTrees) {
        if (child.id === targetId) {
          tree.updatedAt = now
          return true
        }
        if (walk(child)) {
          tree.updatedAt = now
          return true
        }
      }
      return false
    }
    walk(root)
  }

  function filterTree(node: FishMemoTree, predicate: (node: FishMemoTree) => boolean): FishMemoTree | null {
    const filteredChildren: FishMemoTree[] = []
    for (const child of node.subTrees) {
      const filtered = filterTree(child, predicate)
      if (filtered) filteredChildren.push(filtered)
    }
    if (filteredChildren.length > 0) {
      return { ...node, subTrees: filteredChildren }
    }
    return predicate(node) ? { ...node, subTrees: [] } : null
  }

  function formatNodeLines(node: FishMemoTree, prefix: string = '', isLast: boolean = true, isRoot: boolean = true): string[] {
    const typeTags = node.type.map((t) => `<${t}>`).join('')
    const desc = node.description ? `(${node.description})` : ''
    const header = isRoot ? `{${node.id}}[${node.name}]${typeTags}${desc}` : `${isLast ? '└─' : '├─'}{${node.id}}[${node.name}]${typeTags}${desc}`

    const lines: string[] = [prefix + header]
    const childPrefix = isRoot ? '' : prefix + (isLast ? '   ' : '│  ')

    for (let i = 0; i < node.subTrees.length; i++) {
      const child = node.subTrees[i]
      if (!child) continue
      const childIsLast = i === node.subTrees.length - 1
      lines.push(...formatNodeLines(child, childPrefix, childIsLast, false))
    }

    return lines
  }

  return {
    root,

    getSubTreeById(id: string): FishMemoTree | null {
      if (root.id === id) return root
      const result = findNodeAndParent(root, id)
      return result ? result.node : null
    },

    getSubTreesByType(type: string): FishMemoTree[] {
      return findAllMatching(root, (node) => node.type.includes(type))
    },

    getSubTreesByName(name: string): FishMemoTree[] {
      return findAllMatching(root, (node) => node.name === name)
    },

    getSubTreesBySymbol(symbol: string): FishMemoTree[] {
      return findAllMatching(root, (node) => node.symbol === symbol)
    },

    getSubTreesByPredicate(predicate: (subTree: FishMemoTree) => boolean): FishMemoTree[] {
      return findAllMatching(root, predicate)
    },

    addSubTree(parentId: string, subUnit: FishMemoTree): void {
      if (root.id === parentId) {
        root.subTrees.push(subUnit)
        updateAncestorTimestamps(subUnit.id)
        return
      }
      const result = findNodeAndParent(root, parentId)
      if (result) {
        result.node.subTrees.push(subUnit)
        updateAncestorTimestamps(subUnit.id)
      }
    },

    updateSubTree(id: string, updatedFields: Omit<Partial<FishMemoTree>, 'id'>): void {
      const result = findNodeAndParent(root, id)
      if (result) {
        const node = result.node
        const { subTrees, type, data, ...rest } = updatedFields
        Object.assign(node, rest)
        if (type) {
          node.type = clone(type)
        }
        if (data) {
          node.data = clone(data)
        }
        if (subTrees) {
          node.subTrees = clone(subTrees)
        }
        node.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
        updateAncestorTimestamps(id)
      }
    },

    deleteSubTree(id: string): void {
      if (root.id === id) return
      const result = findNodeAndParent(root, id)
      if (result && result.parent) {
        const idx = result.parent.subTrees.findIndex((child) => child.id === id)
        if (idx !== -1) {
          result.parent.subTrees.splice(idx, 1)
        }
      }
    },

    filterSubTree(predicate: (subTree: FishMemoTree) => boolean): FishMemoTree {
      const filtered = filterTree(root, predicate)
      return filtered ?? { ...root, subTrees: [] }
    },

    tick(): void {
      const toDelete = new Set<string>()
      for (const ticker of tickers) {
        if (!ticker(root)) {
          toDelete.add(root.id)
        }
        forEachSubTree(root, (node) => {
          if (!ticker(node)) {
            toDelete.add(node.id)
          }
        })
      }
      for (const id of toDelete) {
        this.deleteSubTree(id)
      }
    },

    registerTicker(ticker: (param: FishMemoTree) => boolean): void {
      tickers.push(ticker)
    },

    tickBy(ticker: (param: FishMemoTree) => boolean): void {
      forEachSubTree(root, (node) => {
        if (ticker(node)) {
          node.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
        }
      })
    },

    deepClone(): FishMemo {
      const clonedRoot = clone(root)
      return createFishMemo(clonedRoot)
    },

    formatToString(subTree: FishMemoTree): string {
      return formatNodeLines(subTree).join('\n')
    },
  }
}

function createFishMemoTree(params: Omit<FishMemoTree, 'id' | 'createdAt' | 'updatedAt'>): FishMemoTree {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return {
    ...params,
    type: [...params.type],
    data: clone(params.data),
    subTrees: [...params.subTrees],
    id: nanoid(6),
    createdAt: now,
    updatedAt: now,
  }
}
export { createFishMemo, createFishMemoTree }
