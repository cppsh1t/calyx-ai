import { beforeEach, describe, expect, test } from 'bun:test'
import { createMemo, createMemoTree } from '../src/index.ts'
import type { Memo, MemoTree } from '../src/types.ts'

// --- Helper: build a reusable tree fixture ---

let memo: Memo
let rootNode: MemoTree
let childA: MemoTree
let childB: MemoTree
let grandchildA1: MemoTree
let grandchildA2: MemoTree
let grandchildB1: MemoTree

beforeEach(() => {
  grandchildA1 = createMemoTree({
    name: 'task-1',
    type: ['task', 'pending'],
    symbol: 'T1',
    description: 'first task',
    content: '',
    data: { priority: 1 },
    subTrees: [],
  })

  grandchildA2 = createMemoTree({
    name: 'task-2',
    type: ['task', 'done'],
    symbol: 'T2',
    description: 'second task',
    content: '',
    data: { priority: 2 },
    subTrees: [],
  })

  grandchildB1 = createMemoTree({
    name: 'bug-1',
    type: ['bug', 'pending'],
    symbol: 'B1',
    description: 'a bug',
    content: '',
    data: { severity: 'high' },
    subTrees: [],
  })

  childA = createMemoTree({
    name: 'plan',
    type: ['plan', 'running'],
    symbol: 'PL',
    description: 'the plan',
    content: 'plan content',
    data: { version: 1 },
    subTrees: [grandchildA1, grandchildA2],
  })

  childB = createMemoTree({
    name: 'notes',
    type: ['note', 'volatile'],
    symbol: 'NT',
    description: 'some notes',
    content: 'note content',
    data: { count: 3 },
    subTrees: [grandchildB1],
  })

  rootNode = createMemoTree({
    name: 'project',
    type: ['root', 'constant'],
    symbol: 'PR',
    description: 'the project',
    content: 'root content',
    data: { owner: 'test' },
    subTrees: [childA, childB],
  })

  memo = createMemo(rootNode)
})

// ============================================================
// createMemoTree
// ============================================================

describe('createMemoTree', () => {
  test('creates a node with auto-generated id, createdAt, updatedAt', () => {
    const node = createMemoTree({
      name: 'test',
      type: ['a'],
      symbol: 'x',
      description: 'desc',
      content: 'ct',
      data: {},
      subTrees: [],
    })

    expect(node.id).toBeTruthy()
    expect(node.createdAt).toBeTruthy()
    expect(node.updatedAt).toBeTruthy()
    expect(node.createdAt).toBe(node.updatedAt)
  })

  test('preserves all passed fields', () => {
    const data = { key: 'val' }
    const sub = createMemoTree({
      name: 'sub',
      type: ['x'],
      symbol: 'S',
      description: 'd',
      content: 'c',
      data: {},
      subTrees: [],
    })

    const node = createMemoTree({
      name: 'top',
      type: ['a', 'b'],
      symbol: 'X',
      description: 'hello',
      content: 'world',
      data,
      subTrees: [sub],
    })

    expect(node.name).toBe('top')
    expect(node.type).toEqual(['a', 'b'])
    expect(node.symbol).toBe('X')
    expect(node.description).toBe('hello')
    expect(node.content).toBe('world')
    expect(node.data).toEqual({ key: 'val' })
    expect(node.subTrees).toHaveLength(1)
    expect(node.subTrees[0]!.name).toBe('sub')
  })

  test('clones type array so it is not shared', () => {
    const typeArr = ['a', 'b']
    const node = createMemoTree({
      name: 'n',
      type: typeArr,
      symbol: 's',
      description: '',
      content: '',
      data: {},
      subTrees: [],
    })

    expect(node.type).toEqual(typeArr)
    expect(node.type).not.toBe(typeArr)
  })

  test('clones subTrees array so it is not shared', () => {
    const subTrees: MemoTree[] = []
    const node = createMemoTree({
      name: 'n',
      type: [],
      symbol: 's',
      description: '',
      content: '',
      data: {},
      subTrees,
    })

    expect(node.subTrees).not.toBe(subTrees)
  })

  test('deep clones data so nested objects are not shared', () => {
    const data = { nested: { value: 42 } }
    const node = createMemoTree({
      name: 'n',
      type: [],
      symbol: 's',
      description: '',
      content: '',
      data,
      subTrees: [],
    })

    expect(node.data).toEqual(data)
    expect(node.data).not.toBe(data)
    expect(node.data.nested).not.toBe(data.nested)
  })
})

// ============================================================
// createMemo — root
// ============================================================

describe('createMemo', () => {
  describe('root', () => {
    test('returns the root tree', () => {
      expect(memo.root).toBe(rootNode)
    })
  })
})

// ============================================================
// getSubTreeById
// ============================================================

describe('getSubTreeById', () => {
  test('finds a node by id at the root level', () => {
    expect(memo.getSubTreeById(rootNode.id)).toBe(rootNode)
  })

  test('finds a node by id at child level', () => {
    expect(memo.getSubTreeById(childA.id)).toBe(childA)
  })

  test('finds a node by id at grandchild level', () => {
    expect(memo.getSubTreeById(grandchildA1.id)).toBe(grandchildA1)
  })

  test('returns null for missing id', () => {
    expect(memo.getSubTreeById('nonexistent-id')).toBeNull()
  })
})

// ============================================================
// getSubTreesByType
// ============================================================

describe('getSubTreesByType', () => {
  test('finds all nodes with a matching type tag', () => {
    const results = memo.getSubTreesByType('pending')
    const names = results.map((n) => n.name)
    expect(names).toContain('task-1')
    expect(names).toContain('bug-1')
    expect(names).not.toContain('plan')
    expect(names).not.toContain('task-2')
  })

  test('returns empty array when no nodes match', () => {
    expect(memo.getSubTreesByType('nonexistent')).toEqual([])
  })
})

// ============================================================
// getSubTreesByName
// ============================================================

describe('getSubTreesByName', () => {
  test('finds nodes by exact name match', () => {
    const results = memo.getSubTreesByName('plan')
    expect(results).toHaveLength(1)
    expect(results[0]!.id).toBe(childA.id)
  })

  test('returns empty array when no nodes match', () => {
    expect(memo.getSubTreesByName('nonexistent')).toEqual([])
  })
})

// ============================================================
// getSubTreesBySymbol
// ============================================================

describe('getSubTreesBySymbol', () => {
  test('finds nodes by exact symbol match', () => {
    const results = memo.getSubTreesBySymbol('PL')
    expect(results).toHaveLength(1)
    expect(results[0]!.name).toBe('plan')
  })

  test('returns empty array when no nodes match', () => {
    expect(memo.getSubTreesBySymbol('NONEXISTENT')).toEqual([])
  })
})

// ============================================================
// getSubTreesByPredicate
// ============================================================

describe('getSubTreesByPredicate', () => {
  test('matches nodes with custom predicate on type array', () => {
    const results = memo.getSubTreesByPredicate((p) => p.type.includes('done'))
    expect(results).toHaveLength(1)
    expect(results[0]!.name).toBe('task-2')
  })

  test('matches nodes by symbol prefix', () => {
    const results = memo.getSubTreesByPredicate((p) => p.symbol.startsWith('T'))
    expect(results).toHaveLength(2)
    expect(results.map((n) => n.name)).toEqual(['task-1', 'task-2'])
  })

  test('returns empty array when no nodes match', () => {
    const results = memo.getSubTreesByPredicate((p) => p.name === 'nonexistent')
    expect(results).toEqual([])
  })
})

// ============================================================
// addSubTree
// ============================================================

describe('addSubTree', () => {
  test('adds a child to the specified parent', () => {
    const newChild = createMemoTree({
      name: 'new-child',
      type: ['x'],
      symbol: 'NC',
      description: '',
      content: '',
      data: {},
      subTrees: [],
    })

    memo.addSubTree(childA.id, newChild)

    expect(childA.subTrees).toHaveLength(3)
    expect(childA.subTrees[2]!.id).toBe(newChild.id)
  })

  test('updates updatedAt on parent and ancestors when adding', () => {
    const oldChildUpdated = childA.updatedAt
    const oldRootUpdated = rootNode.updatedAt

    // Small delay to ensure timestamp differs
    const start = Date.now()
    while (Date.now() - start < 1100) {
      // wait ~1.1s to cross second boundary
    }

    const newChild = createMemoTree({
      name: 'new-child',
      type: ['x'],
      symbol: 'NC',
      description: '',
      content: '',
      data: {},
      subTrees: [],
    })

    memo.addSubTree(childA.id, newChild)

    expect(childA.updatedAt).not.toBe(oldChildUpdated)
    expect(rootNode.updatedAt).not.toBe(oldRootUpdated)
  })

  test('is a no-op when parentId is not found', () => {
    const initialLength = rootNode.subTrees.length

    const newChild = createMemoTree({
      name: 'orphan',
      type: ['x'],
      symbol: 'OR',
      description: '',
      content: '',
      data: {},
      subTrees: [],
    })

    memo.addSubTree('nonexistent-id', newChild)

    expect(rootNode.subTrees.length).toBe(initialLength)
  })
})

// ============================================================
// updateSubTree
// ============================================================

describe('updateSubTree', () => {
  test('updates fields on a node', () => {
    memo.updateSubTree(childA.id, {
      name: 'updated-plan',
      description: 'new description',
    })

    expect(childA.name).toBe('updated-plan')
    expect(childA.description).toBe('new description')
  })

  test('clones type array on update', () => {
    const newType = ['plan', 'done']
    memo.updateSubTree(childA.id, { type: newType })

    expect(childA.type).toEqual(newType)
    expect(childA.type).not.toBe(newType)
  })

  test('clones data object on update', () => {
    const newData = { version: 2, extra: true }
    memo.updateSubTree(childA.id, { data: newData })

    expect(childA.data).toEqual(newData)
    expect(childA.data).not.toBe(newData)
  })

  test('clones subTrees array on update', () => {
    const newSubTrees: MemoTree[] = [grandchildA1]
    memo.updateSubTree(childA.id, { subTrees: newSubTrees })

    expect(childA.subTrees).toHaveLength(1)
    expect(childA.subTrees).not.toBe(newSubTrees)
  })

  test('updates updatedAt on ancestors and the node itself', () => {
    const oldChildUpdated = childA.updatedAt
    const oldRootUpdated = rootNode.updatedAt

    const start = Date.now()
    while (Date.now() - start < 1100) {}

    memo.updateSubTree(childA.id, { description: 'changed' })

    expect(childA.updatedAt).not.toBe(oldChildUpdated)
    expect(rootNode.updatedAt).not.toBe(oldRootUpdated)
  })

  test('is a no-op when id is not found', () => {
    const originalName = childA.name
    memo.updateSubTree('nonexistent-id', { name: 'should-not-change' })
    expect(childA.name).toBe(originalName)
  })
})

// ============================================================
// deleteSubTree
// ============================================================

describe('deleteSubTree', () => {
  test('removes a node from its parent subTrees', () => {
    expect(rootNode.subTrees.map((s) => s.id)).toContain(childA.id)

    memo.deleteSubTree(childA.id)

    expect(rootNode.subTrees.map((s) => s.id)).not.toContain(childA.id)
    expect(rootNode.subTrees).toHaveLength(1)
  })

  test('is a no-op when trying to delete root', () => {
    const rootId = rootNode.id
    memo.deleteSubTree(rootId)
    expect(memo.root.id).toBe(rootId)
  })

  test('is a no-op when id is not found', () => {
    const originalLength = rootNode.subTrees.length
    memo.deleteSubTree('nonexistent-id')
    expect(rootNode.subTrees.length).toBe(originalLength)
  })

  test('removes a deeply nested node', () => {
    expect(childA.subTrees.map((s) => s.id)).toContain(grandchildA1.id)

    memo.deleteSubTree(grandchildA1.id)

    expect(childA.subTrees.map((s) => s.id)).not.toContain(grandchildA1.id)
    expect(childA.subTrees).toHaveLength(1)
  })
})

// ============================================================
// filterSubTree
// ============================================================

describe('filterSubTree', () => {
  test('returns a filtered clone containing only matching nodes and their ancestors', () => {
    // Keep only nodes with type 'bug'
    const filtered = memo.filterSubTree((p) => p.type.includes('bug'))

    // Should contain root, notes (parent of bug-1), and bug-1
    expect(filtered.name).toBe('project')
    expect(filtered.subTrees).toHaveLength(1) // only 'notes'
    expect(filtered.subTrees[0]!.name).toBe('notes')
    expect(filtered.subTrees[0]!.subTrees).toHaveLength(1)
    expect(filtered.subTrees[0]!.subTrees[0]!.name).toBe('bug-1')
  })

  test('keeps nodes that have matching descendants even if they do not match themselves', () => {
    const filtered = memo.filterSubTree((p) => p.name === 'task-1')

    // root and plan should be kept because plan is ancestor of task-1
    expect(filtered.subTrees).toHaveLength(1)
    expect(filtered.subTrees[0]!.name).toBe('plan')
    expect(filtered.subTrees[0]!.subTrees).toHaveLength(1)
    expect(filtered.subTrees[0]!.subTrees[0]!.name).toBe('task-1')
  })

  test('does not mutate the original tree', () => {
    const originalChildCount = rootNode.subTrees.length
    memo.filterSubTree(() => false)
    expect(rootNode.subTrees.length).toBe(originalChildCount)
  })

  test('returns empty subTrees when nothing matches', () => {
    const filtered = memo.filterSubTree(() => false)
    expect(filtered.name).toBe('project')
    expect(filtered.subTrees).toHaveLength(0)
  })
})

// ============================================================
// tick / registerTicker / tickBy
// ============================================================

describe('ticker', () => {
  describe('registerTicker', () => {
    test('adds a ticker that runs on tick()', () => {
      let ticked = false
      memo.registerTicker((node) => {
        if (node.name === 'task-1') {
          ticked = true
          return true
        }
        return false
      })

      memo.tick()
      expect(ticked).toBe(true)
    })
  })

  describe('tick', () => {
    test('runs all registered tickers', () => {
      const names: string[] = []
      memo.registerTicker((node) => {
        names.push(`ticker1-${node.name}`)
        return false
      })
      memo.registerTicker((node) => {
        names.push(`ticker2-${node.name}`)
        return false
      })

      memo.tick()

      // Both tickers should have visited all 6 nodes
      expect(names.filter((n) => n.startsWith('ticker1-'))).toHaveLength(6)
      expect(names.filter((n) => n.startsWith('ticker2-'))).toHaveLength(6)
    })
  })

  describe('tickBy', () => {
    test('updates updatedAt on nodes where ticker returns true', () => {
      const oldUpdated = grandchildA1.updatedAt

      const start = Date.now()
      while (Date.now() - start < 1100) {}

      memo.tickBy((node) => node.name === 'task-1')

      expect(grandchildA1.updatedAt).not.toBe(oldUpdated)
    })

    test('does not update updatedAt on nodes where ticker returns false', () => {
      const oldUpdated = childB.updatedAt

      memo.tickBy((node) => node.name === 'task-1')

      expect(childB.updatedAt).toBe(oldUpdated)
    })
  })
})

// ============================================================
// deepClone
// ============================================================

describe('deepClone', () => {
  test('returns a new Memo instance', () => {
    const clone = memo.deepClone()
    expect(clone).not.toBe(memo)
  })

  test('clone has the same structure as original', () => {
    const clone = memo.deepClone()
    expect(clone.root.name).toBe(memo.root.name)
    expect(clone.root.id).toBe(memo.root.id)
    expect(clone.root.subTrees).toHaveLength(memo.root.subTrees.length)
  })

  test('mutations to clone do not affect original', () => {
    const clone = memo.deepClone()
    const originalChildCount = memo.root.subTrees.length

    clone.addSubTree(
      clone.root.id,
      createMemoTree({
        name: 'clone-only',
        type: ['x'],
        symbol: 'CO',
        description: '',
        content: '',
        data: {},
        subTrees: [],
      })
    )

    expect(memo.root.subTrees.length).toBe(originalChildCount)
    expect(clone.root.subTrees.length).toBe(originalChildCount + 1)
  })

  test('updates to clone nodes do not affect original nodes', () => {
    const clone = memo.deepClone()
    const cloneChild = clone.getSubTreeById(childA.id)!

    const start = Date.now()
    while (Date.now() - start < 1100) {}

    clone.updateSubTree(cloneChild.id, { name: 'mutated' })

    expect(cloneChild.name).toBe('mutated')
    expect(childA.name).toBe('plan')
  })
})

// ============================================================
// formatToString
// ============================================================

describe('formatToString', () => {
  test('formats a tree with box-drawing characters and id prefix', () => {
    const result = memo.formatToString(rootNode)
    const lines = result.split('\n')

    // First line is the root with full format, starting with {id}
    expect(lines[0]).toMatch(/^\{[a-zA-Z0-9_-]+\}\[project\]<root><constant>\(the project\)$/)

    // Should contain box-drawing characters for children
    const fullOutput = lines.join('\n')
    expect(fullOutput).toContain('├─')
    expect(fullOutput).toContain('└─')
    expect(fullOutput).toContain('│')

    // Child lines should also contain id prefix wrapped in {}
    expect(lines[1]!.includes('[')).toBe(true)
    expect(lines[2]!.includes('[')).toBe(true)
    // Verify id pattern appears in child lines (between box-drawing and name)
    expect(/\{[a-zA-Z0-9_-]+\}\[/.test(lines[1]!)).toBe(true)
    expect(/\{[a-zA-Z0-9_-]+\}\[/.test(lines[2]!)).toBe(true)
  })

  test('formats node with type tags, description and id', () => {
    const result = memo.formatToString(childA)
    const lines = result.split('\n')

    // First line: childA name with full format and id
    expect(lines[0]).toMatch(/^\{[a-zA-Z0-9_-]+\}\[plan\]<plan><running>\(the plan\)$/)

    // Second line: grandchildA1 formatted with type tags, description and id
    expect(lines[1]).toContain('{')
    expect(lines[1]).toContain('}')
    expect(lines[1]).toContain('task-1')
    expect(lines[1]).toContain('<task>')
    expect(lines[1]).toContain('<pending>')
    expect(lines[1]).toContain('(first task)')
  })

  test('formats a leaf node with no children with id', () => {
    const result = memo.formatToString(grandchildA1)
    expect(result).toMatch(/^\{[a-zA-Z0-9_-]+\}\[task-1\]<task><pending>\(first task\)$/)
  })

  test('formats node without description without parentheses but with id', () => {
    const leafNoDesc = createMemoTree({
      name: 'no-desc',
      type: ['x'],
      symbol: 'ND',
      description: '',
      content: '',
      data: {},
      subTrees: [],
    })

    const parent = createMemoTree({
      name: 'parent',
      type: [],
      symbol: 'P',
      description: '',
      content: '',
      data: {},
      subTrees: [leafNoDesc],
    })

    const m = createMemo(parent)
    const result = m.formatToString(parent)
    const lines = result.split('\n')

    expect(lines[1]!.startsWith('└─{')).toBe(true)
    expect(lines[1]!.endsWith('[no-desc]<x>')).toBe(true)
    expect(lines[1]).not.toContain('(')
  })
})
