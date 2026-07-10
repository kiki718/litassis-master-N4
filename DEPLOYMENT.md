# 文献助手部署说明

## 1. 部署包内容

部署包包含前端页面、Python 后端服务、221 条示例观测目标表、配置模板、Docker 文件、测试用例和项目文档。

不会打包以下内容：

- `.env`：避免泄露 API Key。
- `data/cache/`：本地缓存。
- `logs/`：运行日志。
- `outputs/`：检索输出和热点结果。
- `__pycache__/`：Python 临时文件。

## 2. 环境要求

本地运行：

- Python 3.11 或更高版本。
- 可访问 arXiv API 的网络环境。
- 可选：DeepSeek API Key。
- 可选：ADS API Key。

Docker 运行：

- Docker 24+。
- 可选：Docker Compose v2。

## 3. 本地部署

解压部署包后进入目录：

```bash
cd literature_assistant_v2
```

复制环境变量模板：

```bash
cp .env.example .env
```

按需编辑 `.env`：

```text
DEEPSEEK_API_KEY=你的 DeepSeek Key
DEEPSEEK_BASE_URL=https://api.deepseek.com/chat/completions
ADS_API_KEY=
```

启动服务：

```bash
python server.py --host 0.0.0.0 --port 5179
```

访问：

```text
http://服务器IP:5179/index.html
```

Linux/macOS 也可以使用：

```bash
chmod +x start_literature_assistant.sh
HOST=0.0.0.0 PORT=5179 ./start_literature_assistant.sh
```

Windows 可以使用：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\launch_literature_assistant.ps1
```

## 4. Docker 部署

复制 `.env.example` 为 `.env`，填入 API Key 后运行：

```bash
docker compose up -d --build
```

访问：

```text
http://服务器IP:5179/index.html
```

停止服务：

```bash
docker compose down
```

查看日志：

```bash
docker logs -f literature-assistant
```

## 5. 云平台部署建议

适合部署到支持 Docker 的平台，例如：

- 内网 Linux 服务器。
- 云服务器 ECS/CVM。
- Docker Compose 环境。
- 轻量应用服务器。
- Kubernetes 集群。

生产环境建议：

- 使用 Nginx/Caddy 做反向代理。
- 通过 HTTPS 暴露服务。
- 将 `.env` 改为平台 Secret/环境变量。
- 将 `outputs/`、`logs/`、`data/cache/` 挂载为持久化目录。
- 限制公网访问或增加认证层。

## 6. 打包命令

在项目根目录运行：

```bash
python build_package.py
```

生成文件：

```text
dist/literature_assistant_v2_YYYYMMDD.zip
```

指定版本号：

```bash
python build_package.py --version 20260617
```

## 7. 健康检查

服务启动后访问：

```text
http://127.0.0.1:5179/api/status
```

正常返回示例：

```json
{
  "ok": true,
  "targets": 221,
  "deepseek_enabled": true
}
```

## 8. 输出文件

运行分析后默认生成：

```text
outputs/hotspots.json
outputs/literature_corpus.md
```

其中：

- `hotspots.json`：供后续天文目标筛选工具读取的热点目标 JSON。
- `literature_corpus.md`：当前话题检索到的全部文献包，包含题名、作者、年份、链接和原始摘要。
