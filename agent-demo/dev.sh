#!/bin/zsh
# 具身智能数据采集平台 · 本地一键启动
# 用法：在 chatBI 仓库任意位置执行  ./agent-demo/dev.sh
# 后端 http://localhost:8070  前端 http://localhost:5180/agent/

BASE="$(cd "$(dirname "$0")" && pwd)"

# 若已在运行则先停掉，保证幂等
pkill -f "uvicorn app.main:app" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 1

# 后端：FastAPI :8070
(cd "$BASE/backend" && .venv/bin/uvicorn app.main:app --port 8070 > /tmp/agent-demo-8070.log 2>&1 &)

# 前端：Vite :5180（/agent/api 已代理到 8070）
(cd "$BASE/frontend" && npm run dev > /tmp/agent-demo-front.log 2>&1 &)

sleep 4
echo "后端  http://localhost:8070/agent/      (日志 /tmp/agent-demo-8070.log)"
echo "前端  http://localhost:5180/agent/      (日志 /tmp/agent-demo-front.log)"
echo "账号  admin / demo-admin-2026   operator1 / demo-operator-2026"

# 自动打开浏览器
open "http://localhost:5180/agent/"
