import type { Memo, MemoTree } from '@/types.ts'
import dayjs from 'dayjs'
import { nanoid } from 'nanoid'
import rfdc from 'rfdc'

const clone = rfdc()

function createMemo(root: MemoTree): Memo {
  const tickers: Array<(param: MemoTree) => boolean> = []

  function findNodeAndParent(tree: MemoTree, id: string, parent: MemoTree | null = null): { node: MemoTree; parent: MemoTree | null } | null {
    for (const child of tree.subTrees) {
      if (child.id === id) return { node: child, parent: tree }
      const found = findNodeAndParent(child, id, tree)
      if (found) return found
    }
    return null
  }

  function findAllMatching(tree: MemoTree, predicate: (node: MemoTree) => boolean): MemoTree[] {
    const result: MemoTree[] = []
    for (const child of tree.subTrees) {
      if (predicate(child)) result.push(child)
      result.push(...findAllMatching(child, predicate))
    }
    return result
  }

  function forEachSubTree(tree: MemoTree, fn: (node: MemoTree) => void): void {
    for (const child of tree.subTrees) {
      fn(child)
      forEachSubTree(child, fn)
    }
  }

  function updateAncestorTimestamps(targetId: string): void {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    function walk(tree: MemoTree): boolean {
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

  function filterTree(node: MemoTree, predicate: (node: MemoTree) => boolean): MemoTree | null {
    const filteredChildren: MemoTree[] = []
    for (const child of node.subTrees) {
      const filtered = filterTree(child, predicate)
      if (filtered) filteredChildren.push(filtered)
    }
    if (filteredChildren.length > 0) {
      return { ...node, subTrees: filteredChildren }
    }
    return predicate(node) ? { ...node, subTrees: [] } : null
  }

  function formatNodeLines(node: MemoTree, prefix: string = '', isLast: boolean = true, isRoot: boolean = true): string[] {
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

    getSubTreeById(id: string): MemoTree | null {
      if (root.id === id) return root
      const result = findNodeAndParent(root, id)
      return result ? result.node : null
    },

    getSubTreesByType(type: string): MemoTree[] {
      return findAllMatching(root, (node) => node.type.includes(type))
    },

    getSubTreesByName(name: string): MemoTree[] {
      return findAllMatching(root, (node) => node.name === name)
    },

    getSubTreesBySymbol(symbol: string): MemoTree[] {
      return findAllMatching(root, (node) => node.symbol === symbol)
    },

    getSubTreesByPredicate(predicate: (subTree: MemoTree) => boolean): MemoTree[] {
      return findAllMatching(root, predicate)
    },

    addSubTree(parentId: string, subUnit: MemoTree): void {
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

    updateSubTree(id: string, updatedFields: Omit<Partial<MemoTree>, 'id'>): void {
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

    filterSubTree(predicate: (subTree: MemoTree) => boolean): MemoTree {
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

    registerTicker(ticker: (param: MemoTree) => boolean): void {
      tickers.push(ticker)
    },

    tickBy(ticker: (param: MemoTree) => boolean): void {
      forEachSubTree(root, (node) => {
        if (ticker(node)) {
          node.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
        }
      })
    },

    deepClone(): Memo {
      const clonedRoot = clone(root)
      return createMemo(clonedRoot)
    },

    formatToString(subTree: MemoTree): string {
      return formatNodeLines(subTree).join('\n')
    },
  }
}

function createMemoTree(params: Omit<MemoTree, 'id' | 'createdAt' | 'updatedAt'>): MemoTree {
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
export { createMemo, createMemoTree }
