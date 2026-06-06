# Sunnybridge CRM API

Sunnybridge CRM REST API - 英语培训学校客户管理系统后端 API

## 技术栈

- **运行时**: Cloudflare Workers
- **框架**: Hono
- **数据库**: Cloudflare D1 (SQLite)
- **验证**: Zod

## 项目结构

```
api/
├── src/
│   ├── index.js           # 入口文件
│   ├── routes/            # 路由处理
│   │   ├── students.js    # 学生管理
│   │   ├── packages.js    # 课时包管理
│   │   ├── classes.js     # 上课记录
│   │   ├── payments.js    # 付款记录
│   │   ├── teachers.js    # 教师管理
│   │   ├── settings.js    # 系统设置
│   │   ├── search.js      # 搜索
│   │   └── dashboard.js   # 仪表板统计
│   ├── middleware/        # 中间件
│   │   ├── auth.js        # CORS & 认证
│   │   └── errorHandler.js # 错误处理
│   └── utils/             # 工具函数
│       ├── response.js    # 响应格式
│       └── validation.js  # 请求验证
├── schema.sql             # 数据库 Schema
├── wrangler.toml          # Cloudflare 配置
└── package.json
```

## 本地开发

```bash
# 安装依赖
cd api
npm install

# 初始化本地数据库
npx wrangler d1 execute sunnybridge-crm --local --file=./schema.sql

# 启动开发服务器
npm run dev
# 或
npx wrangler dev --local
```

## 部署到 Cloudflare

```bash
# 创建远程 D1 数据库
npx wrangler d1 create sunnybridge-crm

# 获取数据库 ID 并更新 wrangler.toml

# 初始化远程数据库
npx wrangler d1 execute sunnybridge-crm --remote --file=./schema.sql

# 部署
npm run deploy
# 或
npx wrangler deploy
```

## API 端点

### Students (学生)
- `GET /api/v1/students` - 获取学生列表
- `GET /api/v1/students/:id` - 获取单个学生
- `POST /api/v1/students` - 创建学生
- `PATCH /api/v1/students/:id` - 更新学生
- `DELETE /api/v1/students/:id` - 删除学生

### Packages (课时包)
- `GET /api/v1/packages/student/:student_id` - 获取学生的课时包
- `GET /api/v1/packages/:id` - 获取课时包详情
- `POST /api/v1/packages/student/:student_id` - 创建课时包
- `PATCH /api/v1/packages/:id` - 更新课时包
- `DELETE /api/v1/packages/:id` - 删除课时包

### Classes (上课记录)
- `GET /api/v1/classes/student/:student_id` - 获取上课记录
- `POST /api/v1/classes/student/:student_id` - 创建上课记录
- `PATCH /api/v1/classes/:id` - 更新上课记录
- `DELETE /api/v1/classes/:id` - 删除上课记录

### Payments (付款记录)
- `GET /api/v1/payments/student/:student_id` - 获取付款记录
- `POST /api/v1/payments/student/:student_id` - 创建付款记录
- `PATCH /api/v1/payments/:id` - 更新付款记录
- `DELETE /api/v1/payments/:id` - 删除付款记录

### Teachers (教师)
- `GET /api/v1/teachers` - 获取教师列表
- `GET /api/v1/teachers/:id` - 获取教师详情
- `POST /api/v1/teachers` - 创建教师
- `PATCH /api/v1/teachers/:id` - 更新教师
- `DELETE /api/v1/teachers/:id` - 删除教师

### Dashboard (仪表板)
- `GET /api/v1/dashboard/stats` - 获取统计数据
- `GET /api/v1/dashboard/today` - 获取今日课程
- `GET /api/v1/dashboard/overview` - 获取概览数据

### Search (搜索)
- `GET /api/v1/search?q=关键词` - 全局搜索

### Settings (设置)
- `GET /api/v1/settings` - 获取所有设置
- `PATCH /api/v1/settings` - 批量更新设置

## 请求示例

```bash
# 创建学生
curl -X POST http://localhost:8787/api/v1/students \
  -H "Content-Type: application/json" \
  -d '{"name": "张三", "phone": "13800138000", "grade": "三年级"}'

# 获取学生列表（带分页）
curl "http://localhost:8787/api/v1/students?page=1&page_size=20"

# 创建课时包
curl -X POST http://localhost:8787/api/v1/packages/student/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "60节套餐", "total": 60, "price": 7200}'

# 创建上课记录（自动扣减课时）
curl -X POST http://localhost:8787/api/v1/classes/student/1 \
  -H "Content-Type: application/json" \
  -d '{"teacher": "李老师", "subject": "英语", "hours": 1, "package_id": 1}'

# 获取统计数据
curl http://localhost:8787/api/v1/dashboard/stats
```

## 认证

API 使用简单的 API Key 认证：

```bash
# 在请求头中添加
Authorization: Bearer <your-api-key>
```

开发环境默认 API Key: `dev-api-key`

可在 `wrangler.toml` 中配置生产环境的 API_KEY：

```toml
[vars]
API_KEY = "your-production-api-key"
```

## 环境变量

- `API_KEY` - API 认证密钥
- `DEBUG` - 调试模式开关
- `ALLOWED_ORIGINS` - 允许的 CORS 域名（逗号分隔）

## 注意事项

1. 创建 `completed` 状态的上课记录会自动扣减关联课时包的剩余课时
2. 取消 `completed` 状态的上课记录会自动恢复课时
3. 删除学生时会级联删除其关联的课时包、上课记录和付款记录
4. SQLite/D1 不支持某些 PostgreSQL 特性（如外键约束的 ON DELETE CASCADE 需要手动实现）