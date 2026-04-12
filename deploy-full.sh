#!/bin/bash
# 一键部署：前端 + 后端

set -e

echo "🚀 Sunnybridge CRM 一键部署..."

cd /home/billow/.openclaw/workspace/projects/sunnybridge-crm

# 提交并推送前端
if git diff-index --quiet HEAD --; then
    echo "✅ 前端无更改"
else
    echo "📦 提交前端更改..."
    git add -A
    
    if [ -z "$1" ]; then
        echo "请输入提交信息:"
        read -r commit_msg
    else
        commit_msg="$1"
    fi
    
    git commit -m "$commit_msg"
    git push
    echo "✅ 前端已推送"
fi

# 部署后端
echo "🚀 部署后端 API..."
cd api
npx wrangler deploy
echo "✅ 后端 API 已部署"

echo ""
echo "🎉 部署完成！"
echo "⏳ 等待 1-2 分钟后硬刷新页面（Ctrl+Shift+R）"
