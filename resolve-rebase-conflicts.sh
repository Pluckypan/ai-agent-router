#!/bin/bash
# 解决 rebase 冲突脚本 - 自动处理 SQLite 临时文件冲突

echo "检查 rebase 状态..."

if [ ! -d .git/rebase-merge ] && [ ! -d .git/rebase-apply ]; then
    echo "错误: 当前没有进行中的 rebase"
    exit 1
fi

echo "发现 rebase 冲突，正在解决..."

# 删除 SQLite 临时文件
rm -f gateway.db-shm gateway.db-wal

# 从 Git 中移除这些文件
git rm gateway.db-shm gateway.db-wal 2>/dev/null || true

# 如果文件在冲突列表中，标记为已解决
if git status --porcelain | grep -q "gateway.db-shm\|gateway.db-wal"; then
    echo "已解决 gateway.db-shm 和 gateway.db-wal 的冲突"
    git add gateway.db-shm gateway.db-wal 2>/dev/null || git rm gateway.db-shm gateway.db-wal 2>/dev/null || true
fi

echo "冲突已解决，继续 rebase..."
GIT_EDITOR=true git rebase --continue
