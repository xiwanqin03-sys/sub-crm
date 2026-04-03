#!/bin/bash
# Sunnybridge CRM 部署脚本

set -e

echo "🚀 Sunnybridge CRM 部署开始..."

cd /home/billow/.openclaw/workspace/projects/sunnybridge-crm

# 检查是否有更改
if git diff-index --quiet HEAD --; then
    echo "✅ 没有需要提交的更改"
else
    echo "📦 提交更改..."
    git add -A
    
    # 获取提交信息
    if [ -z "$1" ]; then
        echo "请输入提交信息:"
        read -r commit_msg
    else
        commit_msg="$1"
    fi
    
    git commit -m "$commit_msg"
    echo "✅ 已提交: $commit_msg"
fi

# 推送到 GitHub
echo "🌐 推送到 GitHub..."
git push
echo "✅ 已推送到 GitHub"

# 检查后端是否有修改
echo ""
echo "是否需要部署后端 API？(y/n)"
read -r deploy_backend

if [ "$deploy_backend" = "y" ] || [ "$deploy_backend" = "Y" ]; then
    echo "🚀 部署后端 API..."
    cd api
    npx wrangler deploy
    echo "✅ 后端 API 已部署"
fi

echo ""
echo "🎉 部署完成！"
echo "⏳ 等待 1-2 分钟后硬刷新页面（Ctrl+Shift+R）"
