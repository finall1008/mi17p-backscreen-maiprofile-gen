# maimai DX 背景卡生成器

一个基于 Vue 3 + TypeScript + Vite 的桌面端网页工具，用于快速组合本地 `assets/` 目录中的 maimai DX 框体、名牌、头像、段位、友人对战称号等素材，实时预览并导出 PNG 背景卡。

## ✨ 核心特性
- **素材检索与预览**：框体、名牌、头像等素材基于 ID 自动索引，支持模糊搜索与快速预览。
- **称号管理**：称号背景与名称映射自动完成，支持稀有度筛选与收藏。
- **个性化设置**：输入 rating、用户名（自动转换为全角字符）、段位、友人对战等级等信息并实时预览。
- **收藏 & 记忆**：常用素材支持收藏并置顶展示；上次的选择自动保存在浏览器 `localStorage` 中。
- **高质量导出**：自定义画布组合所有图层，点击即可导出透明背景的 PNG 图片（文件名自动包含用户名与 rating）。

## 🧱 项目结构
```
├─ assets/                # 静态素材源文件（不会随构建发布）
│  ├─ title_raw/          # 官方称号原始切片及描述
│  └─ ...
├─ public/                # 直接拷贝到构建产物的公共资源
├─ src/
│  ├─ components/         # UI 组件（资产选择器等）
│  ├─ lib/                # 资产目录、缓存、存储等辅助逻辑
│  ├─ App.vue             # 主应用：表单、预览、画布渲染、导出
│  └─ main.ts             # 入口文件
├─ README.md
├─ package.json
└─ vite.config.ts
```

## 🛠 环境要求
- Node.js ≥ 18.x（建议使用 LTS 版本）
- npm ≥ 9.x（或使用兼容的 pnpm / yarn，自行替换命令）

## 🚀 快速开始
```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5173/）
npm run dev
```
启动后，将浏览器打开到输出的本地地址即可实时体验。素材目录位于仓库根目录的 `assets/`，需要确保该目录存在并包含对应文件。

## 📦 生产构建
```bash
npm run build
```
构建结果将输出到 `dist/` 目录，可通过任意静态资源服务器进行部署。首次构建可能会提示 Rollup chunk size warning，属于预期行为（资源体积较大），如需消除可在 `vite.config.ts` 中调整 `build.chunkSizeWarningLimit` 或进一步拆分代码。

## 🧑‍💻 使用指南
1. **选择素材**：在左侧选择框中输入 ID 或滚动挑选框体、名牌、头像、称号等素材。收藏的条目会置顶显示。
2. **配置信息**：填写 rating、用户名（自动转为全角字符）、段位、友人对战等级等信息，右侧画布将实时渲染。
3. **收藏与记忆**：常用素材点击星标即可收藏；系统会自动在本地存储上次的完整选择，下次打开页面自动恢复。
4. **下载图片**：当所有必要信息填写完成后，点击页脚的“下载合成图片”即可导出 PNG 文件。

## 🪙 素材说明
- 项目默认只读取本地 `assets/` 目录中的图片与 JSON 数据，不包含线上请求。
- 如需添加新素材，只需按照现有命名规则放入指定目录并重启开发服务器；`import.meta.glob` 会自动扫描并收录。
- `assets/title.json` 由 `assets/extract_titles.py` 生成，包含称号与稀有度映射，可根据需要重新抽取。

## 🐳 Docker 部署
本项目提供多阶段构建的 `Dockerfile`：第一阶段使用 Node 构建，第二阶段使用 Nginx 提供静态文件。现在配置为：
- 生产镜像中包含编译后的 `dist/`。
- 同时额外复制原始 `assets/` 到 ` /usr/share/nginx/html/assets`，方便调试或后续改造成运行时动态加载（如果不需要可以在 `Dockerfile` 中删除对应 `COPY` 行）。

### 构建镜像
```bash
docker build -t maiprofile-gen:latest .
```

### 运行容器
```bash
docker run -d --name maiprofile -p 8080:80 maiprofile-gen:latest
```
访问：http://localhost:8080/

### 自定义 Nginx 配置
```bash
docker run -d -p 8080:80 \
  -v $(pwd)/my-nginx.conf:/etc/nginx/conf.d/app.conf:ro \
  maiprofile-gen:latest
```

### 常见问题
- 更新/新增素材不生效：需要重新构建镜像（因为引用是构建时解析的）。
- 不想暴露原始素材：移除 `COPY --from=build /app/assets ...`。
- 想减小镜像：同上或把素材放外部对象存储。

