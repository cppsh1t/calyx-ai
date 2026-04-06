type FishMemoTree = {
  id: string
  name: string
  type: string[]
  symbol: string
  description: string
  content: string
  createdAt: string //YYYY-MM-DD HH:mm:ss
  updatedAt: string
  data: Record<string, any>
  subTrees: FishMemoTree[]
}

type FishMemoPredicate = Pick<FishMemoTree, 'id' | 'name' | 'type' | 'symbol'>

type FishMemo = {
  root: FishMemoTree //read only
  getSubTreeById: (id: string) => FishMemoTree | null
  getSubTreesByType: (type: string) => FishMemoTree[]
  getSubTreesByName: (name: string) => FishMemoTree[]
  getSubTreesBySymbol: (symbol: string) => FishMemoTree[]
  getSubTreesByPredicate: (predicate: (subTree: FishMemoTree) => boolean) => FishMemoTree[]
  addSubTree: (parentId: string, subUnit: FishMemoTree) => void
  updateSubTree: (id: string, updatedFields: Omit<Partial<FishMemoTree>, 'id'>) => void
  deleteSubTree: (id: string) => void
  filterSubTree: (predicate: (subTree: FishMemoTree) => boolean) => FishMemoTree
  tick: () => void
  registerTicker: (ticker: (param: FishMemoTree) => boolean) => void
  tickBy: (ticker: (param: FishMemoTree) => boolean) => void
  deepClone: () => FishMemo

  /**
   * Formats a sub-tree as a string.
   * @example
   * {id}[project name]<constant>(the project name)
   *  ├─{id}[project info]<constant>(the project info)                                                                                                                                                                                                            
      ├─{id}[refactor plan]<plan><running>(the plan for refactoring the project)
      │  └─{id}[refactor task 1]<task><pending>(the first task for refactoring)
      │  └─{id}[refactor task 2]<task><pending>(the second task for refactoring)
      ├─{id}[typescript type data]<type><constant>(the type data for the project)
      ├─{id}[build results]<result><volatile>(the build results for the project)
      └─{id}[bug notes]<note><volatile><bug>(the bug notes for the project)
         └─{id}[bug 1]<bug><pending>(the first bug note)
   * 
   */
  formatToString: (subTree: FishMemoTree) => string
}

export type { FishMemo, FishMemoPredicate, FishMemoTree }
