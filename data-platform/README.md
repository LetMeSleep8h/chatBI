# 数据采集平台 MVP

Spring Boot 3.3 + MyBatis-Plus + MySQL 8 + JJWT 的数据采集平台后端。

## 启动

1. 准备 MySQL 8，连接信息见 `src/main/resources/application.yml`（库不存在会自动创建）。
2. 配置 JWT 密钥（可选，默认有开发用值）：

```bash
export JWT_SECRET="your-random-secret-at-least-32-bytes-long"
```

3. 启动：

```bash
cd data-platform
./mvnw spring-boot:run    # 或 mvn spring-boot:run
```

4. Swagger 文档：<http://localhost:8081/doc.html>

## 前端启动

```bash
cd frontend
npm install
npm run dev        # http://localhost:5175，已配置 /api 代理到后端 8081，无需处理跨域
npm run build      # 产物在 frontend/dist/，部署方式由人工处理
```

前端包含 3 个页面：登录页（/login）、任务看板（/）、任务详情（/tasks/:id，含上传弹窗）。

## 默认账号

| 用户名 | 密码 | 角色 |
|---|---|---|
| admin | admin123 | reviewer（可审核 + 管理任务） |
| operator1 | operator123 | operator |

## 接口一览

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| POST | /auth/register | 免 | 注册，默认 operator；用户名冲突 409 |
| POST | /auth/login | 免 | 返回 token + name + role |
| POST | /tasks | admin | 创建任务（名称/工位/目标条数） |
| GET | /tasks | 登录 | 任务列表，operator 只见自己的 |
| PATCH | /tasks/{id}/assign | admin | 分配操作员，待分配 → 采集中 |
| GET | /tasks/{id} | 登录 | 详情：完成数/目标数 + 数据条目列表 |
| POST | /records | operator | multipart 上传，≤50MB（超限 413） |
| GET | /records?status=待质检 | reviewer/admin | 数据列表，可按状态过滤 |
| GET | /records/mine | 登录 | 我的上传记录 |
| PATCH | /records/{id}/review | reviewer/admin | 审核 {result: 通过\|打回, comment} |

所有需登录接口带请求头 `Authorization: Bearer <token>`。

## 状态机

```
任务：  待分配 ──分配──▶ 采集中 ──通过数=目标数──▶ 已完成

记录：  待质检 ──审核通过──▶ 通过
          │
          └──审核打回──▶ 被打回 ──operator重传──▶ 已重传（原记录，保留审计链）
                        （重传产生的新记录重新进入 待质检）
```

非法流转统一返回 409 + 明确错误信息（见 `statemachine/StateMachine`）。

## 权限矩阵

| 接口 | operator | reviewer | admin |
|---|---|---|---|
| POST /auth/register · /auth/login | ✅（免登录） | ✅（免登录） | ✅（免登录） |
| POST /tasks | ❌ 403 | ❌ 403 | ✅ |
| GET /tasks | ✅ 仅自己的 | ✅ 全部 | ✅ 全部 |
| PATCH /tasks/{id}/assign | ❌ 403 | ❌ 403 | ✅ |
| GET /tasks/{id} | ✅ 仅自己的 | ✅ | ✅ |
| POST /records | ✅ 仅自己任务 | ❌ 403 | ❌ 403 |
| GET /records | ❌ 403 | ✅ | ✅ |
| GET /records/mine | ✅ 仅自己的 | ✅ 全部 | ✅ 全部 |
| PATCH /records/{id}/review | ❌ 403 | ✅ | ✅ |

越权访问统一 403；资源不存在统一 404。

## 业务规则要点

- **幂等**：同一 operator 对同一 task 的同一文件名在「待质检」状态重复上传 → 409。
- **重传审计**：被打回后重新上传会新增记录，原「被打回」记录改为「已重传」，全链路可查。
- **自动完成**：审核通过数达到目标数时，任务自动 采集中 → 已完成。
- **鉴权实现**：`HandlerInterceptor` 校验 JWT 并写入 ThreadLocal；请求结束在
  `afterCompletion` 中 `remove()`，防止线程池复用导致的身份串用与内存泄漏。
