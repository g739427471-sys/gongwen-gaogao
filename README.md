# 公文高高 — 智能公文写作辅助工具

在线地址：[https://www.xzcdd.com](https://www.xzcdd.com)（前端）  
API 文档：部署后访问 `/docs`

## 功能

- **智能写作**：输入主题 → 自动生成公文框架 → 流式生成正文（SSE）
- **15种法定文种**：决议、决定、命令、公报、公告、通告、意见、通知、通报、报告、请示、批复、议案、函、纪要
- **知识库**：政策法规 + 重要讲话 + 权威文章 + 规范表述，支持搜索
- **文稿润色**：上传文稿 → 语言润色 + 逻辑审核 + 格式校对
- **用户系统**：注册/登录，每人独立写作空间

## 架构

| 层 | 技术 | 部署位置 |
|----|------|----------|
| 前端 | React + TypeScript + Tailwind + Vite | GitHub Pages |
| 后端 | Python FastAPI + SQLite + Claude API | Railway / Render |

```
用户浏览器 ──→ GitHub Pages (前端静态文件)
                  │
                  ↓ API调用 (JWT认证)
           Railway (FastAPI后端)
                  │
                  ↓
           Anthropic Claude API
```

## 本地开发

### 1. 环境
- Python 3.11+ 
- Node.js 18+
- Anthropic API Key → [console.anthropic.com](https://console.anthropic.com)

### 2. 配置
```bash
cd backend
copy .env.example .env
# 编辑 .env，填入 ANTHROPIC_API_KEY
```

### 3. 启动后端
```bash
cd backend
pip install -r requirements.txt
python init_knowledge.py
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 4. 启动前端
```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173

## 部署到生产环境

### 后端 → Railway

1. 在 [Railway.app](https://railway.app) 创建账号
2. 新建项目，选择 "Deploy from GitHub repo"
3. 选择本仓库的 `backend/` 目录
4. 在 Railway 面板设置环境变量：
   - `ANTHROPIC_API_KEY` = 你的API密钥
   - `JWT_SECRET_KEY` = 生成一个随机字符串
   - `FRONTEND_URL` = `https://www.xzcdd.com`
5. Railway 会自动读取 `Procfile` 和 `nixpacks.toml` 部署
6. 记下 Railway 给你的后端 URL（如 `https://xxx.railway.app`）

### 前端 → GitHub Pages

1. 在 GitHub 仓库 Settings → Secrets 添加：
   - `VITE_API_BASE` = Railway 后端 URL（如 `https://xxx.railway.app`）
2. 修改 `frontend/.env.production` 中的 `VITE_API_BASE` 为实际后端 URL
3. Push 到 main 分支，GitHub Actions 自动部署
4. 在仓库 Settings → Pages 确认指向 `gh-pages` 分支

如果你的域名 `www.xzcdd.com` 已经在用 GitHub Pages，只需确保：
- 仓库名是 `username.github.io`（用户页面）
- 或者 `www.xzcdd.com` 的 CNAME 指向 GitHub Pages

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| GET | `/api/auth/me` | 当前用户信息 |
| POST | `/api/writing/generate-framework` | 生成框架 |
| POST | `/api/writing/generate-content` | 生成内容（SSE） |
| POST | `/api/writing/refine` | 润色文稿 |
| GET | `/api/knowledge/search?q=` | 搜索知识库 |
| GET | `/api/knowledge/categories` | 知识库统计 |
| GET | `/api/documents` | 文稿列表 |
| GET | `/api/documents/{id}` | 获取文稿 |
| DELETE | `/api/documents/{id}` | 删除文稿 |

## 质量标准

生成内容严格遵循：
1. 文风庄重严肃 — 杜绝俚语口语
2. 逻辑严密周全 — 论证严谨充分
3. 用语标准规范 — 禁用模糊词语  
4. 文字精炼严实 — 删减一切废话
5. 政治明确 — 符合方针政策
