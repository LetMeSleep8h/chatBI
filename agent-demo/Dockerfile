# ---- 阶段一：构建前端 ----
FROM node:20-alpine AS fe
WORKDIR /fe
COPY frontend/package.json ./
RUN npm config set registry https://registry.npmmirror.com && npm install
COPY frontend ./
RUN npm run build

# ---- 阶段二：Python 运行时，托管 API + 静态文件 ----
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
COPY backend/app ./app
# 前端构建产物 → app/static，FastAPI StaticFiles 挂 /agent
COPY --from=fe /fe/dist ./static
ENV STATIC_DIR=/app/static \
    AUTH_SECRET=please-set-AUTH_SECRET-env-in-production
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
