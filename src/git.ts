import { execFile } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { sep } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

interface GitExecError extends Error {
  code?: number
  stderr?: string
}

/** 在指定目录执行 git 命令，返回 stdout。失败时抛出带 stderr 详情的错误。 */
export async function git(cwd: string, args: string[], signal?: AbortSignal): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      signal,
    })
    return stdout
  } catch (err) {
    const e = err as GitExecError
    const detail = (e.stderr ?? '').trim() || e.message
    throw new Error(`git ${args.join(' ')} 失败: ${detail}`)
  }
}

/** 从任意目录向上解析 git 仓库根（绝对路径）。 */
export async function findRepoRoot(cwd: string): Promise<string> {
  const out = await git(cwd, ['rev-parse', '--show-toplevel'])
  const root = out.trim()
  if (!root) throw new Error(`不是 git 仓库: ${cwd}`)
  return root
}

/** 一个 worktree 的摘要信息。 */
export interface WorktreeInfo {
  path: string
  branch: string | null
  head: string
}

/** 解析 `git worktree list --porcelain` 输出。 */
function parseWorktreeList(out: string): WorktreeInfo[] {
  const entries: WorktreeInfo[] = []
  let current: WorktreeInfo | null = null
  for (const line of out.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current) entries.push(current)
      current = { path: line.slice('worktree '.length), branch: null, head: '' }
    } else if (line.startsWith('branch ')) {
      if (current) current.branch = line.slice('branch '.length).replace(/^refs\/heads\//, '')
    } else if (line.startsWith('HEAD ')) {
      if (current) current.head = line.slice('HEAD '.length).slice(0, 7)
    } else if (line === '' && current) {
      entries.push(current)
      current = null
    }
  }
  if (current) entries.push(current)
  return entries
}

/** 一个目录所属 worktree 的判定结果。 */
export interface WorktreeMatch {
  /** git 仓库根（主 worktree 路径）。 */
  repoRoot: string
  /** 匹配到的 worktree 路径。 */
  worktreePath: string
  /** 分支名；detached HEAD 时为 null。 */
  branch: string | null
  /** HEAD 短提交。 */
  head: string
  /** 是否有未提交改动或未跟踪文件。 */
  dirty: boolean
  /** 是否主 worktree（cwd 在仓库根内但不是其他 worktree 下）。 */
  isMain: boolean
}

/**
 * 判定一个目录属于哪个 worktree。
 * 规则：cwd 规范化后等于某 worktree 路径或在其下 → 该 worktree；
 * 否则若 cwd 在仓库根内（任意子目录）→ 主 worktree；否则返回 null。
 * 不是 git 仓库时返回 null。
 */
export async function findWorktreeForCwd(cwd: string, signal?: AbortSignal): Promise<WorktreeMatch | null> {
  let toplevel: string
  try {
    toplevel = await findRepoRoot(cwd)
  } catch {
    return null
  }
  const out = await git(toplevel, ['worktree', 'list', '--porcelain'], signal)
  const entries = parseWorktreeList(out)
  if (entries.length === 0) return null
  // git 保证第一条是主 worktree（仓库根）
  const repoRoot = entries[0]!.path

  let norm: string
  try {
    norm = realpathSync(cwd)
  } catch {
    norm = cwd
  }

  const inside = (dir: string): boolean =>
    norm === dir || norm.startsWith(dir + sep)

  let match = entries.find(e => inside(e.path))
  if (!match && inside(repoRoot)) {
    // 仓库内子目录，不属于任何 worktree → 主 worktree
    match = entries[0]!
  }
  if (!match) return null

  let dirty = false
  try {
    dirty = (await git(match.path, ['status', '--porcelain'], signal)).trim().length > 0
  } catch {
    // worktree 目录可能已消失，dirty 保持 false
  }
  return {
    repoRoot,
    worktreePath: match.path,
    branch: match.branch,
    head: match.head,
    dirty,
    isMain: match.path === repoRoot,
  }
}
