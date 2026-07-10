# 安装与启动说明

## 1. Windows 桌面启动

推荐方式：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\launch_literature_assistant.ps1
```

脚本会：

1. 检查 Python。
2. 启动本地服务。
3. 等待 `/api/status` 可用。
4. 打开浏览器访问页面。

访问地址：

```text
http://127.0.0.1:5179/index.html
```

停止服务：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\stop_literature_assistant.ps1
```

创建桌面快捷方式：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\create_desktop_shortcut.ps1
```

## 2. Linux/macOS 启动

```bash
chmod +x start_literature_assistant.sh
HOST=127.0.0.1 PORT=5179 ./start_literature_assistant.sh
```

如果需要局域网访问：

```bash
HOST=0.0.0.0 PORT=5179 ./start_literature_assistant.sh
```

## 3. Python 直接启动

```bash
python server.py --host 127.0.0.1 --port 5179
```

局域网部署：

```bash
python server.py --host 0.0.0.0 --port 5179
```

## 4. Docker 启动

```bash
cp .env.example .env
docker compose up -d --build
```

访问：

```text
http://127.0.0.1:5179/index.html
```

停止：

```bash
docker compose down
```

## 5. DeepSeek 配置

方法一：编辑 `.env`

```text
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_BASE_URL=https://api.deepseek.com/chat/completions
DEEPSEEK_MODEL=deepseek-chat
```

方法二：在页面中点击 DeepSeek 配置按钮并保存。

配置变更后建议重启服务。

## 6. 验证

```bash
curl http://127.0.0.1:5179/api/status
```

预期：

```json
{
  "ok": true,
  "targets": 221
}
```

## 7. 常见问题

### Python 未找到

请安装 Python 3.11 或更高版本，并确认 `python` 或 `python3` 可在命令行中执行。

### DeepSeek 没有生效

检查：

- `.env` 是否存在。
- `DEEPSEEK_API_KEY` 是否填写。
- 服务是否已重启。
- `/api/status` 中 `deepseek_enabled` 是否为 `true`。

### arXiv 检索慢或失败

arXiv 可能限流或断流。可以降低文献上限，稍后重试。

### 端口被占用

换一个端口：

```bash
python server.py --port 5180
```
