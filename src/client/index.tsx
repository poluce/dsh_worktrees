import { useEffect, useSyncExternalStore, useState } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// 声明合并触发器：把 ui-conversation 的 SlotMap 加载进 program
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'

export const inject = ['slots', 'sessions']

/** host 路由返回的 worktree 信息。 */
interface WorktreeInfo {
  repoRoot: string
  worktreePath: string
  branch: string | null
  head: string
  dirty: boolean
  isMain: boolean
}

/** 订阅当前会话 id。 */
function useCurrentSession(ctx: ClientContext): string | undefined {
  const sessions = ctx.get('sessions') as { list: { getSnapshot(): { current?: string }; subscribe(fn: () => void): () => void } } | undefined
  const list = sessions?.list
  if (!list) return undefined
  return useSyncExternalStore(
    (fn) => list.subscribe(fn),
    () => list.getSnapshot().current,
  )
}

/** 查询某会话绑定的 worktree。 */
function fetchWorktree(sessionId: string, signal: AbortSignal): Promise<WorktreeInfo | null> {
  return fetch(`/plugins/dsh-worktrees/session-worktree?sessionId=${encodeURIComponent(sessionId)}`, { signal })
    .then((res) => res.json() as Promise<{ worktree: WorktreeInfo | null }>)
    .then((data) => data.worktree)
    .catch(() => null)
}

export function apply(ctx: ClientContext): void {
  const WorktreeBadge = (): React.ReactElement | null => {
    const sessionId = useCurrentSession(ctx)
    const [info, setInfo] = useState<WorktreeInfo | null | undefined>(undefined)

    useEffect(() => {
      if (!sessionId) {
        setInfo(undefined)
        return
      }
      const controller = new AbortController()
      let cancelled = false
      fetchWorktree(sessionId, controller.signal).then((wt) => {
        if (!cancelled) setInfo(wt)
      })
      return () => {
        cancelled = true
        controller.abort()
      }
    }, [sessionId])

    // 无会话 / 查询中 / 主 worktree / 非 git 仓库：不显示徽标
    if (!info || info.isMain) return null

    return (
      <span
        title={`worktree: ${info.worktreePath} @ ${info.head}${info.dirty ? '（有未提交改动）' : ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 999,
          background: info.dirty ? '#f59e0b22' : '#3b82f622',
          color: info.dirty ? '#d97706' : '#3b82f6',
          fontSize: 12,
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ opacity: 0.7 }}>⎇</span>
        {info.branch ?? info.head}
        {info.dirty && <span style={{ width: 6, height: 6, borderRadius: 3, background: '#d97706' }} />}
      </span>
    )
  }

  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'dsh-worktrees-badge',
    order: 10,
  }, WorktreeBadge))
}
