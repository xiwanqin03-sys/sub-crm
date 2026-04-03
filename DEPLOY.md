# 部署指南

## 前端部署
```bash
cd /home/billow/.openclaw/workspace/projects/sunnybridge-crm
git add -A
git commit -m "Simplify package form and fix API routes"
git push
```
等待 Cloudflare Pages 自动部署（约 1-2 分钟）

## 后端部署
```bash
cd /home/billow/.openclaw/workspace/projects/sunnybridge-crm/api
npx wrangler deploy
```

## 验证
1. 硬刷新页面（Ctrl+Shift+R）
2. 测试添加课时包功能
3. 检查 Network 标签确认 API 调用正确

## 修复记录
- 2026-04-03: 简化添加课时包表单（只保留总课时字段）
- 2026-04-03: 修复 Payments API 路由
- 2026-04-03: 修复日期格式验证
