# calyx-memo

A lightweight tree-structured memory system for programming agents. Provides hierarchical storage with type/name/symbol queries, filtering, auto-expiration via tickers, deep cloning, and tree visualization.

## Installation

```bash
bun add calyx-memo
```

## Core Concepts

### MemoTree

A tree node — the fundamental unit of the memory system. Each node contains:

| Field         | Type                  | Description                                                   |
| ------------- | --------------------- | ------------------------------------------------------------- |
| `id`          | `string`              | Auto-generated unique ID (nanoid, 6 chars)                    |
| `name`        | `string`              | Node name                                                     |
| `type`        | `string[]`            | Type tags, e.g. `['task', 'pending']`, `['note', 'volatile']` |
| `symbol`      | `string`              | Short symbol identifier, e.g. `T1`, `PL`                      |
| `description` | `string`              | Description                                                   |
| `content`     | `string`              | Body content                                                  |
| `data`        | `Record<string, any>` | Custom data payload (deep-cloned for isolation)               |
| `subTrees`    | `MemoTree[]`          | Child nodes                                                   |
| `createdAt`   | `string`              | Creation time, format `YYYY-MM-DD HH:mm:ss`                   |
| `updatedAt`   | `string`              | Last updated time                                             |

### Memo

The operational instance that wraps a root tree. Provides querying, CRUD, filtering, ticker-based expiration, deep cloning, and visualization. All writes to `type`, `data`, and `subTrees` are deep-cloned to guarantee data isolation between nodes.

## API

### Creation

#### `createMemoTree(params)`

Creates a tree node. `id`, `createdAt`, and `updatedAt` are auto-generated. The passed `type`, `data`, and `subTrees` are deep-cloned.

```ts
import { createMemoTree } from 'calyx-memo'

const node = createMemoTree({
  name: 'my-task',
  type: ['task', 'pending'],
  symbol: 'T1',
  description: 'first task',
  content: 'implement the auth module',
  data: { priority: 1, assignee: 'agent-a' },
  subTrees: [],
})
```

#### `createMemo(root)`

Wraps a root tree into a `Memo` instance.

```ts
import { createMemo, createMemoTree } from 'calyx-memo'

const root = createMemoTree({
  name: 'project',
  type: ['root'],
  symbol: 'PR',
  description: 'my project',
  content: '',
  data: {},
  subTrees: [node],
})

const memo = createMemo(root)
```

### Querying

All query methods search only the subtree, not the root itself (except `getSubTreeById`).

#### `memo.getSubTreeById(id)`

Finds a node by ID. Also supports looking up the root node.

```ts
const found = memo.getSubTreeById('some-id') // MemoTree | null
```

#### `memo.getSubTreesByType(type)`

Finds all nodes matching a type tag.

```ts
const pendingTasks = memo.getSubTreesByType('pending')
// [{ name: 'task-1', type: ['task', 'pending'], ... }, ...]
```

#### `memo.getSubTreesByName(name)`

Finds nodes by exact name match.

```ts
const plans = memo.getSubTreesByName('plan')
```

#### `memo.getSubTreesBySymbol(symbol)`

Finds nodes by exact symbol match.

```ts
const tasks = memo.getSubTreesBySymbol('T1')
```

#### `memo.getSubTreesByPredicate(predicate)`

Finds nodes using a custom predicate.

```ts
const highPriority = memo.getSubTreesByPredicate((node) => node.data.priority > 3)
```

### Mutations

#### `memo.addSubTree(parentId, subUnit)`

Adds a child to the specified parent. The `updatedAt` of all ancestors is automatically refreshed.

```ts
const newTask = createMemoTree({
  name: 'task-3',
  type: ['task', 'pending'],
  symbol: 'T3',
  description: 'third task',
  content: '',
  data: {},
  subTrees: [],
})

memo.addSubTree(planNode.id, newTask)
```

#### `memo.updateSubTree(id, updatedFields)`

Updates partial fields on a node. `type`, `data`, and `subTrees` are deep-cloned. `id` is immutable. `updatedAt` is auto-refreshed.

```ts
memo.updateSubTree(taskId, {
  name: 'task-1-done',
  type: ['task', 'done'],
  content: 'auth module completed',
})
```

#### `memo.deleteSubTree(id)`

Removes a node (and its entire subtree) from its parent. The root node cannot be deleted.

```ts
memo.deleteSubTree(taskId)
```

### Filtering

#### `memo.filterSubTree(predicate)`

Returns a filtered copy of the tree. Only matching nodes and their ancestor paths are preserved. The original tree is not mutated.

```ts
// Keep only nodes whose type includes 'bug', plus their ancestors
const bugTree = memo.filterSubTree((node) => node.type.includes('bug'))

// Result preserves root -> notes -> bug-1
console.log(bugTree.name) // 'project'
console.log(bugTree.subTrees) // [{ name: 'notes', subTrees: [{ name: 'bug-1' }] }]
```

### Ticker (Auto-Expiration / Refresh)

#### `memo.registerTicker(ticker)`

Registers a ticker function. On each `tick()`, the ticker is evaluated against every node — returning `false` marks the node for deletion.

#### `memo.tick()`

Runs all registered tickers and deletes nodes whose tickers returned `false`.

```ts
// Expire volatile nodes older than 1 hour
memo.registerTicker((node) => {
  if (!node.type.includes('volatile')) return true
  const age = Date.now() - new Date(node.updatedAt).getTime()
  return age < 60 * 60 * 1000
})

// Run cleanup
memo.tick()
```

#### `memo.tickBy(ticker)`

Refreshes the `updatedAt` timestamp on matching nodes without performing any deletions.

```ts
memo.tickBy((node) => node.type.includes('running'))
```

### Deep Clone

#### `memo.deepClone()`

Returns a fully independent `Memo` instance that shares no references with the original. Useful for snapshots or branching experiments.

```ts
const snapshot = memo.deepClone()

// Mutating the snapshot does not affect the original
snapshot.deleteSubTree(taskId)
console.log(memo.getSubTreeById(taskId)) // still exists
```

### Visualization

#### `memo.formatToString(subTree)`

Formats a subtree as a string with box-drawing characters, suitable for logging and debugging.

```ts
console.log(memo.formatToString(memo.root))
```

Output example:

```
{abc123}[project]<root><constant>(my project)
 ├─{def456}[plan]<plan><running>(refactor plan)
 │  ├─{ghi789}[task-1]<task><pending>(first task)
 │  └─{jkl012}[task-2]<task><done>(second task)
 └─{mno345}[notes]<note><volatile>(notes)
    └─{pqr678}[bug-1]<bug><pending>(a bug)
```

Format: `{id}[name]<type1><type2>...(description)`

## Full Example

```ts
import { createMemo, createMemoTree } from 'calyx-memo'

// 1. Create leaf nodes
const task1 = createMemoTree({
  name: 'task-1',
  type: ['task', 'pending'],
  symbol: 'T1',
  description: 'implement login endpoint',
  content: 'POST /api/auth/login',
  data: { priority: 1 },
  subTrees: [],
})

const task2 = createMemoTree({
  name: 'task-2',
  type: ['task', 'done'],
  symbol: 'T2',
  description: 'write unit tests',
  content: '',
  data: { priority: 2 },
  subTrees: [],
})

// 2. Create a parent node
const plan = createMemoTree({
  name: 'sprint-1',
  type: ['plan', 'running'],
  symbol: 'S1',
  description: 'first iteration',
  content: '',
  data: { version: 1 },
  subTrees: [task1, task2],
})

// 3. Create root and wrap as Memo
const root = createMemoTree({
  name: 'auth-service',
  type: ['root'],
  symbol: 'AS',
  description: 'authentication service',
  content: '',
  data: {},
  subTrees: [plan],
})

const memo = createMemo(root)

// 4. Query
memo.getSubTreesByType('pending') // [task1]
memo.getSubTreesBySymbol('T2') // [task2]

// 5. Dynamically add a new task
const task3 = createMemoTree({
  name: 'task-3',
  type: ['task', 'pending'],
  symbol: 'T3',
  description: 'integrate Redis cache',
  content: '',
  data: { priority: 3 },
  subTrees: [],
})
memo.addSubTree(plan.id, task3)

// 6. Update task status
memo.updateSubTree(task1.id, {
  type: ['task', 'done'],
  content: 'login endpoint completed',
})

// 7. Filter: only pending tasks
const pending = memo.filterSubTree((n) => n.type.includes('pending'))

// 8. Register expiration: auto-cleanup volatile nodes after 1 hour
memo.registerTicker((node) => {
  if (!node.type.includes('volatile')) return true
  const age = Date.now() - new Date(node.updatedAt).getTime()
  return age < 60 * 60 * 1000
})

// 9. Visualize
console.log(memo.formatToString(memo.root))
```

## Dependencies

| Package  | Purpose                     |
| -------- | --------------------------- |
| `dayjs`  | Timestamp formatting        |
| `nanoid` | Node ID generation          |
| `rfdc`   | High-performance deep clone |
