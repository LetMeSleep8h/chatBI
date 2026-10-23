# 具身智能数据采集平台（最小原型）

具身智能数据采集工厂的运营系统（数据工厂 MES）：管理 **采集任务 → 工位设备 → 采集数据 → 质检交付** 的完整循环。本期最小原型聚焦核心循环可运行、可演示：任务派发、数据上传、质检打回/通过、统计看板全部线上化。

## 架构

```
┌─────────────────────── 单容器（agent-demo:8000）───────────────────────┐
│                                                                       │
│  FastAPI (Python 3.11)                                                │
│   ├─ /api/*        REST 接口（登录/任务/数据/统计，HMAC token 鉴权）    │
│   ├─ /agent/*      React 构建产物静态托管（StaticFiles）               │
│   ├─ SQLite ./data/app.db    ← volume 持久化                          │
│   └─ ./uploads/*             ← volume 持久化                          │
│                                                                       │
│  前端：Vite + React 18 + TypeScript + antd（base=/agent/）             │
└───────────────────────────────────────────────────────────────────────┘
        ▲                                ▲
        │ http://host:8000/agent/        │ （可选）域名 443
        └── 浏览器                        └── 人工粘贴 nginx-location.conf
```

## 页面结构

| 路由 | 页面 | 说明 |
|---|---|---|
| /agent/login | 登录页 | token 存 localStorage |
| /agent/ | 任务看板（主页） | 顶部 4 统计卡片 + 四栏任务卡片（待分配/采集中/待质检/已交付）；admin 右上角新建任务；operator 卡片上传数据 |
| /agent/tasks/:id | 任务详情 | 任务信息 + 数据条目表格（操作员/类型/时间/状态/意见/下载）+ reviewer 通过/打回（打回必填原因） |
| 弹窗 | 上传数据 | operator：选任务 + 文件 + 元数据（数据类型/工位号/采集时间/备注），FormData 带进度 |

## 状态机（服务端集中校验，非法跳转 409）

```
任务：  待分配 ─分配▶ 采集中 ─上传条数达标▶ 待质检 ─通过数达标▶ 已交付
记录：  待质检 ─▶ 通过 / 被打回 ；  被打回 ─重传▶ 已重传（原记录，审计链）
```

审核通过：`collected_count + 1`，达标自动 `待质检 → 已交付`。通过/打回均记录 `reviewed_by` + `reviewed_at`。

## 本地跑通

### 方式一：Docker（推荐）

```bash
cd agent-demo
AUTH_SECRET=your-random-secret docker compose up -d --build
# 打开 http://localhost:8000/agent/
```

### 方式二：本地开发（前端 5180 / 后端 8070）

```bash
# 在 chatBI 仓库根目录执行（首次需先装依赖：
#   backend: python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
#   frontend: npm install）
./agent-demo/dev.sh
# 自动拉起后端 :8070 和前端 :5180，并打开浏览器 http://localhost:5180/agent/
# 再执行会先杀掉旧进程，幂等可重复

# 或手动分开跑：
#   后端: cd agent-demo/backend && .venv/bin/uvicorn app.main:app --port 8070
#   前端: cd agent-demo/frontend && npm run dev
```

## 默认账号

| 用户名 | 密码 | 角色 |
|---|---|---|
| admin | 12345678 | reviewer（管理端：建任务/分配/审核） |
| operator1 | 12345678 | operator（上传/重传） |
| user | 12345678 | operator（普通用户） |

> 说明：默认管理员账号的角色值为 `reviewer`，拥有建任务/分配/审核全部管理能力（`require_manager` 同时放行 admin/reviewer），与种子账号设计一致。

## 种子数据

首次启动自动写入：3 个任务（采集中 1/4、待质检 2/3、已交付 3/3）+ 10 条不同状态的数据条目（通过/待质检/被打回/已重传均有覆盖）+ 3 个工位（A-01、B-02、C-01）。看板打开不为空。

## 服务器部署

1. 服务器上构建启动：`AUTH_SECRET=<随机串> docker compose up -d --build`
2. 需要挂域名时，把 `nginx-location.conf` 的 `location /agent/ {}` 片段人工粘贴进服务器 nginx 的 `server{}` 块，reload nginx。
3. 数据落盘在宿主机 `./data/`（SQLite）与 `./uploads/`，升级镜像不丢数据。

## 权限矩阵

| 接口 | operator | reviewer/admin |
|---|---|---|
| POST /api/auth/login | ✅ 免登录 | ✅ 免登录 |
| GET /api/auth/me | ✅ | ✅ |
| GET /api/tasks | 仅分配给自己的 | 全部 |
| POST /api/tasks · PATCH assign | ❌ 403 | ✅ |
| GET /api/tasks/{id} | 仅自己的任务 | 全部 |
| POST /api/records | ✅ 仅自己的任务（防水平越权） | ❌ 403 |
| GET /api/records | 仅自己上传的 | 全部（可按 task_id 过滤） |
| PATCH /api/records/{id}/review | ❌ 403 | ✅ |
| GET /api/records/{id}/download | 仅自己的记录 | ✅ |
| GET /api/stats | ✅ | ✅ |

越权访问统一 403，资源不存在统一 404，非法状态跳转 409，打回缺 comment 422，文件超 50MB 413。

## WebSocket 实时推送

管理端看板通过 WebSocket（`/agent/ws/dashboard`）订阅数据流入事件，operator 产出数据（mock 上传/采集会话/工位模拟）入库成功后，服务端广播 `record_new` 事件，看板 1 秒内实时更新（流入列表 + 每分钟折线图 + 统计卡片），无需手动刷新。断开后前端 3 秒自动重连，连接状态在看板角落显示。

operator 侧另有"工位控制台"（`/agent/console`）：开启采集会话后每 2 秒自动产出一条，进度条实时推进，达标自动停止。

**nginx 部署注意**（WebSocket 握手必需，缺了会握手失败）：`/agent/` 的 location 需要
加上升级头与长连接超时：

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 300s;
```

## 三账号隔离对比

数据隔离是本平台的演示重点：同一套接口，不同角色看到的数据范围完全不同。

| 账号 | 角色 | 登录后看板 | 能看到的数据条目 | 越权访问 |
|---|---|---|---|---|
| `admin` | reviewer | 全局视图（全部任务） | 所有任务的数据 | —（管理端） |
| `operator1` | operator | 只显示分配给自己的任务 | 只显示自己上传的记录 | 访问他人资源返回 **403** |
| `user` | operator | **空看板（未分配任何任务）** | 空 | —（**隔离对照组**，保持不动） |

- 演示方法：三个账号分别登录，对比看板卡片数量与任务详情页数据条目；
  `user` 始终为空，即为隔离效果的对照组。
- 服务端强制约束：operator 的任务/记录/下载接口均按 `assignee_id`/`operator_id`
  过滤，直接用 token 请求他人资源返回 403（防水平越权），与前端展示无关。
- mock 说明：工位产出（admin 的"模拟工位产出"）与操作员 mock 上传生成的文件
  在 `./uploads/mock/` 下，内容含记录 id、时间戳与模拟传感器采样数组。

## 本次实现范围与后续范围

**本期（P0）**：登录鉴权、任务四态流转、多模态数据上传（视频/触觉/关节角度）、质检通过/打回、统计看板、种子数据、单容器部署。

**后续范围（未实现，勿当缺失）**：
- 设备管理页 + 真实设备心跳接入（stats 中在线工位数为假数据，`GET /api/stats` 接口已留好）
- 交付管线（客户交付单、导出打包）
- 多租户、WebSocket 实时推送
