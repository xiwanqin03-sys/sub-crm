# 前后端 API 对应关系检查

## Students 学生 API ✅
| 前端调用 | 后端路由 | 状态 |
|---------|---------|------|
| `GET /students` | `GET /students` | ✅ |
| `GET /students/:id` | `GET /students/:id` | ✅ |
| `POST /students` | `POST /students` | ✅ |
| `PATCH /students/:id` | `PATCH /students/:id` | ✅ |
| `DELETE /students/:id` | `DELETE /students/:id` | ✅ |
| `GET /students?search=xxx` | `GET /students?search=xxx` | ✅ |

## Packages 课时包 API ✅
| 前端调用 | 后端路由 | 状态 |
|---------|---------|------|
| `GET /packages` | `GET /packages` | ✅ |
| `GET /packages/student/:student_id` | `GET /packages/student/:student_id` | ✅ |
| `POST /packages/student/:student_id` | `POST /packages/student/:student_id` | ✅ |
| `PATCH /packages/:id` | `PATCH /packages/:id` | ✅ |
| `DELETE /packages/:id` | `DELETE /packages/:id` | ✅ |

## Classes 上课记录 API ✅
| 前端调用 | 后端路由 | 状态 |
|---------|---------|------|
| `GET /classes` | `GET /classes` | ✅ |
| `GET /classes?student_id=xxx` | `GET /classes?student_id=xxx` | ✅ |
| `GET /classes/student/:student_id` | `GET /classes/student/:student_id` | ✅ |
| `POST /classes/student/:student_id` | `POST /classes/student/:student_id` | ✅ |
| `PATCH /classes/:id` | `PATCH /classes/:id` | ✅ |
| `DELETE /classes/:id` | `DELETE /classes/:id` | ✅ |

## Payments 付款记录 API ✅（已修复）
| 前端调用 | 后端路由 | 状态 |
|---------|---------|------|
| `GET /payments` | `GET /payments` | ✅ |
| `GET /payments/student/:student_id` | `GET /payments/student/:student_id` | ✅ 已修复 |
| `POST /payments/student/:student_id` | `POST /payments/student/:student_id` | ✅ 已修复 |
| `DELETE /payments/:id` | `DELETE /payments/:id` | ✅ |

## Dashboard 统计 API ✅
| 前端调用 | 后端路由 | 状态 |
|---------|---------|------|
| `GET /dashboard/stats` | `GET /dashboard/stats` | ✅ |
| `GET /dashboard/today` | `GET /dashboard/today` | ✅ |

## Search 搜索 API ✅
| 前端调用 | 后端路由 | 状态 |
|---------|---------|------|
| `GET /search?q=xxx&type=xxx` | `GET /search?q=xxx&type=xxx` | ✅ |

## 修复记录
1. **2026-04-03**: 修复 Payments API 前端调用
   - `GET /payments?student_id=xxx` → `GET /payments/student/:student_id`
   - `POST /students/:student_id/payments` → `POST /payments/student/:student_id`

2. **2026-04-03**: 修复日期格式验证
   - 支持 `YYYY/MM/DD` 格式转换为 `YYYY-MM-DD`
