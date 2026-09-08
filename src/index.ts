import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import { findWorktreeForCwd } from './git.ts'

// 插件 id，必须与 cordis.patch.yml 里的行 id 一致
export const name = 'dsh-worktrees'
// 需要会话存储：查 header.cwd
export const inject = ['sessions']

// webServer（新版）/ httpServer（旧版）服务键兼容
type WebRouteHost = {
  register(route: { kind: 'exact' | 'prefix'; path: string; handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void> }): () => void
}

export function apply(ctx: Context): void {
  // webServer 可能晚于本插件挂载：先取，取不到等服务出现
  const web = (ctx.get('webServer') ?? ctx.get('httpServer')) as WebRouteHost | undefined
  if (web) {
    ctx.effect(() => registerRoutes(web, ctx), 'dsh-worktrees: routes')
    return
  }
  ctx.on('internal/service', (name: string) => {
    if (name !== 'webServer' && name !== 'httpServer') return
    const w = (ctx.get('webServer') ?? ctx.get('httpServer')) as WebRouteHost | undefined
    if (w) ctx.effect(() => registerRoutes(w, ctx), 'dsh-worktrees: routes')
  })
}

function registerRoutes(web: WebRouteHost, ctx: Context): () => void {
  const disposers: Array<() => void> = []
  disposers.push(web.register({
    kind: 'exact',
    path: '/plugins/dsh-worktrees/session-worktree',
    handler: async (req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const sessionId = url.searchParams.get('sessionId')
      const worktree = await sessionWorktree(ctx, sessionId)
      writeJson(res, 200, { worktree })
    },
  }))
  return () => {
    for (const dispose of disposers) dispose()
  }
}

/** 查一个会话 cwd 所属的 worktree；会话不存在 / 无 cwd / 非 git 仓库返回 null。 */
async function sessionWorktree(ctx: Context, sessionId: string | null): Promise<unknown> {
  if (!sessionId) return null
  const sessions = ctx.get('sessions') as { get(id: string): { header: { cwd?: string } } | undefined } | undefined
  const cwd = sessions?.get(sessionId)?.header.cwd
  if (!cwd) return null
  return findWorktreeForCwd(cwd)
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(body))
}
