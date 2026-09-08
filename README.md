# dsh_worktrees

DSH 插件开发仓库，使用 git worktree 管理多个并行开发分支。

## 目录结构

```
GitHub/
├── dsh_worktrees/              # 主 checkout（main 分支）
└── dsh_worktrees--worktrees/   # worktree 容器目录
    └── <name>--worktree/       # 每个分支一个 worktree
```

## 工作流

```bash
# 从主 checkout 添加一个新分支的 worktree
cd ~/GitHub/dsh_worktrees
git worktree add ../dsh_worktrees--worktrees/my-plugin--worktree -b feature/my-plugin

# 在 worktree 里开发、提交、推送
cd ../dsh_worktrees--worktrees/my-plugin--worktree
git push -u origin feature/my-plugin

# 用完删除
git worktree remove ../dsh_worktrees--worktrees/my-plugin--worktree
git branch -d feature/my-plugin
```

## 说明

- 主 checkout 只保留 `main` 分支，所有开发都在 worktree 里进行。
- 每个 worktree 是独立的插件工作区，互不干扰。
- MIT License。
