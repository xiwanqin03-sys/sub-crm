# Sunnybridge CRM REST API 设计文档

## 基础信息

- **Base URL**: `https://api.sunnybridge.runan.qzz.io/api/v1`
- **认证方式**: Bearer Token (JWT)
- **数据格式**: JSON
- **字符编码**: UTF-8

---

## 通用规范

### 请求头

```
Content-Type: application/json
Authorization: Bearer <token>
Accept: application/json
```

### 响应格式

#### 成功响应

```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2026-04-01T12:00:00Z",
    "request_id": "abc123"
  }
}
```

#### 分页响应

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 100,
    "pages": 5,
    "has_next": true,
    "has_prev": false
  },
  "links": {
    "self": "/api/v1/students?page=1",
    "next": "/api/v1/students?page=2",
    "prev": null
  }
}
```

#### 错误响应

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": [
      {
        "field": "name",
        "message": "姓名不能为空"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-04-01T12:00:00Z",
    "request_id": "abc123"
  }
}
```

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 删除成功（无内容） |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 冲突（如重复创建） |
| 422 | 验证失败 |
| 500 | 服务器错误 |

---

## API 端点

### 1. Students（学生）

#### 1.1 获取学生列表

```
GET /api/v1/students
```

**查询参数**：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | int | 1 | 页码 |
| page_size | int | 20 | 每页数量（最大100） |
| search | string | - | 搜索姓名或电话 |
| status | string | - | 筛选状态：active/inactive/graduated |
| sort | string | created_at | 排序字段 |
| order | string | desc | 排序方向：asc/desc |

**响应示例**：

```json
{
  "data": [
    {
      "id": 1,
      "name": "张小明",
      "phone": "13800138000",
      "email": "parent@example.com",
      "age": 10,
      "grade": "四年级",
      "parent_name": "张三",
      "notes": "周一、周三上课",
      "status": "active",
      "package_summary": {
        "total_hours": 60,
        "used_hours": 12,
        "remaining_hours": 48
      },
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-03-20T14:30:00Z",
      "_links": {
        "self": "/api/v1/students/1",
        "packages": "/api/v1/students/1/packages",
        "classes": "/api/v1/students/1/classes",
        "payments": "/api/v1/students/1/payments"
      }
    }
  ],
  "pagination": { ... }
}
```

#### 1.2 获取单个学生

```
GET /api/v1/students/{id}
```

**响应示例**：

```json
{
  "data": {
    "id": 1,
    "name": "张小明",
    "phone": "13800138000",
    "email": "parent@example.com",
    "age": 10,
    "grade": "四年级",
    "parent_name": "张三",
    "notes": "周一、周三上课",
    "status": "active",
    "package_summary": {
      "total_hours": 60,
      "used_hours": 12,
      "remaining_hours": 48,
      "packages": [
        {
          "id": 1,
          "name": "60节套餐",
          "remaining": 48,
          "expire_date": "2026-12-31"
        }
      ]
    },
    "class_stats": {
      "total": 12,
      "this_month": 4
    },
    "payment_stats": {
      "total": 7200.00,
      "this_month": 0
    },
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-03-20T14:30:00Z",
    "_links": {
      "self": "/api/v1/students/1",
      "packages": "/api/v1/students/1/packages",
      "classes": "/api/v1/students/1/classes",
      "payments": "/api/v1/students/1/payments"
    }
  }
}
```

#### 1.3 创建学生

```
POST /api/v1/students
```

**请求体**：

```json
{
  "name": "张小明",
  "phone": "13800138000",
  "email": "parent@example.com",
  "age": 10,
  "grade": "四年级",
  "parent_name": "张三",
  "notes": "周一、周三上课"
}
```

**响应**：HTTP 201

```json
{
  "data": {
    "id": 1,
    "name": "张小明",
    "status": "active",
    "created_at": "2026-04-01T12:00:00Z",
    "_links": {
      "self": "/api/v1/students/1"
    }
  }
}
```

#### 1.4 更新学生

```
PATCH /api/v1/students/{id}
```

**请求体**：部分字段

```json
{
  "phone": "13900139000",
  "notes": "周二、周四上课"
}
```

#### 1.5 删除学生

```
DELETE /api/v1/students/{id}
```

**响应**：HTTP 204（无内容）

**注意**：级联删除关联的课时包、上课记录、付款记录

---

### 2. Packages（课时包）

#### 2.1 获取学生的课时包

```
GET /api/v1/students/{student_id}/packages
```

**响应示例**：

```json
{
  "data": [
    {
      "id": 1,
      "name": "60节套餐",
      "total": 60,
      "used": 12,
      "remaining": 48,
      "price": 7200.00,
      "purchase_date": "2026-01-15",
      "expire_date": "2026-12-31",
      "status": "active",
      "created_at": "2026-01-15T10:00:00Z",
      "_links": {
        "self": "/api/v1/packages/1",
        "student": "/api/v1/students/1"
      }
    }
  ],
  "summary": {
    "total_hours": 60,
    "used_hours": 12,
    "remaining_hours": 48
  }
}
```

#### 2.2 创建课时包

```
POST /api/v1/students/{student_id}/packages
```

**请求体**：

```json
{
  "name": "60节套餐",
  "total": 60,
  "price": 7200.00,
  "expire_date": "2026-12-31",
  "notes": "促销活动购买"
}
```

#### 2.3 更新课时包

```
PATCH /api/v1/packages/{id}
```

#### 2.4 删除课时包

```
DELETE /api/v1/packages/{id}
```

---

### 3. Classes（上课记录）

#### 3.1 获取学生的上课记录

```
GET /api/v1/students/{student_id}/classes
```

**查询参数**：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | int | 1 | 页码 |
| page_size | int | 20 | 每页数量 |
| start_date | string | - | 开始日期 |
| end_date | string | - | 结束日期 |
| status | string | - | 状态筛选 |

**响应示例**：

```json
{
  "data": [
    {
      "id": 1,
      "student_id": 1,
      "package_id": 1,
      "teacher": "李老师",
      "subject": "英语口语",
      "hours": 1,
      "date": "2026-03-20",
      "start_time": "14:00",
      "end_time": "15:00",
      "content": "练习日常对话",
      "homework": "复习课文",
      "status": "completed",
      "created_at": "2026-03-20T15:00:00Z",
      "_links": {
        "self": "/api/v1/classes/1",
        "student": "/api/v1/students/1",
        "package": "/api/v1/packages/1"
      }
    }
  ],
  "pagination": { ... }
}
```

#### 3.2 创建上课记录

```
POST /api/v1/students/{student_id}/classes
```

**请求体**：

```json
{
  "package_id": 1,
  "teacher": "李老师",
  "subject": "英语口语",
  "hours": 1,
  "date": "2026-04-01",
  "start_time": "14:00",
  "end_time": "15:00",
  "content": "练习日常对话",
  "homework": "复习课文"
}
```

**注意**：创建 `completed` 状态的记录会自动扣减课时

#### 3.3 更新上课记录

```
PATCH /api/v1/classes/{id}
```

#### 3.4 取消上课记录

```
PATCH /api/v1/classes/{id}
```

**请求体**：

```json
{
  "status": "cancelled"
}
```

**注意**：取消 `completed` 记录会自动恢复课时

---

### 4. Payments（付款记录）

#### 4.1 获取学生的付款记录

```
GET /api/v1/students/{student_id}/payments
```

#### 4.2 创建付款记录

```
POST /api/v1/students/{student_id}/payments
```

**请求体**：

```json
{
  "amount": 7200.00,
  "payment_method": "wechat",
  "package_id": 1,
  "description": "购买60节套餐",
  "receipt_number": "R20260401001"
}
```

#### 4.3 删除付款记录

```
DELETE /api/v1/payments/{id}
```

---

### 5. Teachers（教师）

#### 5.1 获取教师列表

```
GET /api/v1/teachers
```

#### 5.2 创建教师

```
POST /api/v1/teachers
```

**请求体**：

```json
{
  "name": "李老师",
  "phone": "13700137000",
  "email": "li@example.com",
  "subjects": ["英语口语", "英语写作"],
  "hourly_rate": 150.00
}
```

---

### 6. Dashboard（仪表板）

#### 6.1 获取统计数据

```
GET /api/v1/dashboard/stats
```

**响应示例**：

```json
{
  "data": {
    "today": {
      "classes": 5,
      "students": 3
    },
    "this_month": {
      "new_students": 8,
      "classes": 120,
      "revenue": 14400.00,
      "active_students": 45
    },
    "warnings": {
      "low_balance_students": [
        {
          "id": 5,
          "name": "王小红",
          "remaining_hours": 2
        }
      ],
      "expiring_packages": [
        {
          "id": 3,
          "student_name": "李小明",
          "package_name": "30节套餐",
          "expire_date": "2026-04-15",
          "remaining_hours": 10
        }
      ]
    },
    "trends": {
      "monthly_classes": [
        {"month": "2026-01", "count": 100},
        {"month": "2026-02", "count": 110},
        {"month": "2026-03", "count": 120}
      ],
      "monthly_revenue": [
        {"month": "2026-01", "amount": 12000},
        {"month": "2026-02", "amount": 13200},
        {"month": "2026-03", "amount": 14400}
      ]
    }
  }
}
```

#### 6.2 获取今日课程

```
GET /api/v1/dashboard/today
```

**响应示例**：

```json
{
  "data": [
    {
      "id": 1,
      "student_name": "张小明",
      "teacher": "李老师",
      "subject": "英语口语",
      "start_time": "14:00",
      "end_time": "15:00",
      "status": "scheduled"
    }
  ]
}
```

---

### 7. Search（搜索）

#### 7.1 全局搜索

```
GET /api/v1/search
```

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| q | string | 搜索关键词 |
| type | string | 搜索类型：student/class/payment |

**响应示例**：

```json
{
  "data": {
    "students": [
      {"id": 1, "name": "张小明", "phone": "13800138000"}
    ],
    "classes": [],
    "payments": []
  }
}
```

---

### 8. Settings（系统设置）

#### 8.1 获取设置

```
GET /api/v1/settings
```

#### 8.2 更新设置

```
PATCH /api/v1/settings
```

**请求体**：

```json
{
  "school_name": "阳光桥英语培训中心"
}
```

---

### 9. Export/Import（数据导入导出）

#### 9.1 导出数据

```
GET /api/v1/export
```

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| format | string | 导出格式：json/csv |
| tables | string | 导出表（逗号分隔） |

**响应**：文件下载

#### 9.2 导入数据

```
POST /api/v1/import
```

**请求体**：multipart/form-data

```
file: <json file>
mode: merge|replace
```

---

## 错误码

| 错误码 | 说明 |
|--------|------|
| VALIDATION_ERROR | 请求参数验证失败 |
| NOT_FOUND | 资源不存在 |
| DUPLICATE | 资源已存在 |
| FOREIGN_KEY_ERROR | 外键约束失败 |
| INSUFFICIENT_HOURS | 课时不足 |
| PACKAGE_EXPIRED | 课时包已过期 |
| UNAUTHORIZED | 未认证 |
| FORBIDDEN | 无权限 |

---

## 速率限制

- **默认**: 100 请求/分钟
- **响应头**:
  - `X-RateLimit-Limit`: 限制值
  - `X-RateLimit-Remaining`: 剩余配额
  - `X-RateLimit-Reset`: 重置时间

---

## 版本控制

使用 URL 版本控制：`/api/v1/`

破坏性变更时升级版本：
- `/api/v1/` → 稳定版本
- `/api/v2/` → 新版本（逐步迁移）

---

## 文件位置

- **API 设计文档**: `docs/api-design.md`
- **OpenAPI 规范**: `docs/openapi.yaml`（待创建）
