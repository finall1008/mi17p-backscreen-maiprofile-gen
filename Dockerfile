# ---- 构建阶段 ----
FROM node:20-alpine AS build

# 设置工作目录
WORKDIR /app

# 仅复制依赖声明以利用缓存
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

# 安装依赖（优先使用 npm；如需切换可手动修改）
RUN npm install --frozen-lockfile || npm install

# 复制全部源码与资源（assets 已纳入镜像）
COPY . .

# 构建（会生成 dist/）
RUN npm run build

# ---- 运行阶段 ----
FROM nginx:1.27-alpine AS runtime

# 删除默认站点配置
RUN rm -f /etc/nginx/conf.d/default.conf

# 自定义 nginx 配置: gzip + 缓存头 + 单页应用回退
COPY nginx.conf /etc/nginx/conf.d/app.conf

# 复制构建产物
COPY --from=build /app/dist /usr/share/nginx/html
# 复制原始资产供可能的动态/调试用途（如果不需要可删除以下行）
COPY --from=build /app/assets /usr/share/nginx/html/assets

# 可以根据需要关闭对原始 assets 的浏览目录，当前保持默认（不列目录，仅静态文件直接访问）。

# 暴露端口
EXPOSE 80

# 健康检查（可选，可按需取消注释）
# HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
