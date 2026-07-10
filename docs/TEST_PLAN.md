# 文献助手测试文档

版本：v2  
日期：2026-06-17

## 1. 测试目标

验证文献助手在本地和可部署环境中的核心功能：

- 服务可启动。
- 前端页面可访问。
- 221 条参考目标表可读取。
- 话题检索可返回文献。
- 时间范围均衡采样有效。
- 综合分析只调用一次大模型。
- 文献列表展示原始摘要。
- 单篇文献按需调用大模型详细分析。
- 热点目标 JSON 格式有效。
- Docker 部署可用。

## 2. 测试环境

推荐环境：

- Windows 10/11 + Python 3.11+
- Linux/macOS + Python 3.11+
- Docker 24+

可选环境变量：

```text
DEEPSEEK_API_KEY
DEEPSEEK_BASE_URL
DEEPSEEK_MODEL
ADS_API_KEY
```

## 3. 静态检查

### 3.1 Python 编译检查

命令：

```bash
python -m py_compile server.py
```

预期：

- 命令退出码为 0。
- 无语法错误。

### 3.2 前端语法检查

命令：

```bash
node --check app.js
```

预期：

- 命令退出码为 0。
- 无 JavaScript 语法错误。

说明：

- 如果部署环境未安装 Node.js，可跳过该项；它只用于开发侧检查。

## 4. 单元测试

命令：

```bash
python -m unittest discover -s tests -v
```

当前测试覆盖：

- 读取 221 条目标表。
- 校验样例热点 JSON。
- 生成热点输出并检查字段契约。

预期：

```text
Ran 3 tests
OK
```

## 5. 服务启动测试

### 5.1 本地启动

命令：

```bash
python server.py --host 127.0.0.1 --port 5179
```

访问：

```text
http://127.0.0.1:5179/index.html
```

健康检查：

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

### 5.2 Windows 一键启动

命令：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\launch_literature_assistant.ps1
```

预期：

- 浏览器自动打开。
- 页面地址为 `http://127.0.0.1:5179/index.html`。
- 服务日志写入 `logs/`。

### 5.3 Linux/macOS 启动

命令：

```bash
chmod +x start_literature_assistant.sh
HOST=127.0.0.1 PORT=5179 ./start_literature_assistant.sh
```

预期：

- 服务正常启动。
- `/api/status` 返回 `ok: true`。

## 6. 话题检索测试

### 6.1 基础话题

请求：

```bash
curl -X POST http://127.0.0.1:5179/api/run \
  -H "Content-Type: application/json" \
  -d "{\"topic\":\"stellar activity\",\"timeframe_months\":24,\"max_papers\":4}"
```

预期：

- `papers.length` 为 4。
- `topic_summary.paper_count` 为 4。
- `topic_summary.analysis_provider` 为 `deepseek` 或 `local_fallback`。
- 每篇文献包含 `title`、`abstract`、`year`、`url`。
- 默认不批量返回 `chinese_summary`。
- 生成 `outputs/literature_corpus.md`。
- 生成 `outputs/hotspots.json`。

### 6.2 多领域话题

建议测试话题：

- `stellar activity`
- `direct imaging exoplanets`
- `distributed optical interferometry`
- `galaxy formation`
- `gravitational wave interferometry`

每个话题使用：

```json
{
  "timeframe_months": 24,
  "max_papers": 4
}
```

验收标准：

- 服务不返回 500。
- 至少返回 1 篇文献。
- 若返回 4 篇，年份应尽量分布在 2025 和 2026 两个桶。
- 原始摘要可在文献列表中展示。

## 7. 时间分桶测试

测试请求：

```json
{
  "topic": "exoplanet",
  "timeframe_months": 24,
  "max_papers": 30
}
```

预期：

- 当前年份为 2026 时，结果应尽量均衡覆盖 2025 和 2026。
- 示例验收：

```text
2025: 15
2026: 15
```

允许偏差：

- 某些话题在某一年候选不足时，系统可从其他年份补足。

## 8. 综合分析测试

前提：

- 配置 `DEEPSEEK_API_KEY`。

操作：

1. 在界面输入话题。
2. 选择两年。
3. 文献上限选择 4 或 12。
4. 点击“生成分析”。

预期：

- 只等待一次综合分析。
- 话题摘要区显示中文综合分析。
- `outputs/literature_corpus.md` 包含全部原始文献信息。
- 文献卡片显示原始英文摘要，而不是预生成中文摘要。

## 9. 单篇详细分析测试

操作：

1. 在文献列表或摘要页选择一篇文献。
2. 点击“详细分析”。

预期：

- 弹窗打开。
- 弹窗先显示“正在调用大模型生成详细分析...”。
- 成功后显示中文详细分析。
- 返回内容包含：
  - `analysis`
  - `key_points`
  - `target_relevance`
  - `mentioned_targets`

接口测试：

```bash
curl -X POST http://127.0.0.1:5179/api/paper/analyze \
  -H "Content-Type: application/json" \
  -d "{\"topic\":\"stellar activity\",\"paper\":{\"title\":\"Example\",\"abstract\":\"Stellar flares affect exoplanet atmospheres.\",\"year\":2026,\"authors\":[\"A\"],\"source\":\"test\"}}"
```

预期：

- 配置 DeepSeek 时 `provider` 为 `deepseek`。
- 未配置 DeepSeek 时 `provider` 为 `local_fallback`。

## 10. 热点 JSON 测试

命令：

```bash
python - <<'PY'
import json
from pathlib import Path
items = json.loads(Path("outputs/hotspots.json").read_text(encoding="utf-8"))
assert isinstance(items, list)
for item in items:
    assert "id" in item
    assert "heat" in item
    assert "papers" in item
print("OK")
PY
```

预期：

```text
OK
```

## 11. Docker 测试

构建并启动：

```bash
docker compose up -d --build
```

健康检查：

```bash
curl http://127.0.0.1:5179/api/status
```

预期：

- `ok` 为 `true`。
- `targets` 为 221。

停止：

```bash
docker compose down
```

## 12. 打包测试

命令：

```bash
python build_package.py --version test
```

预期：

- 生成 `dist/literature_assistant_v2_test.zip`。
- zip 中不包含 `.env`。
- zip 中不包含 `logs/`、`outputs/`、`data/cache/`。
- zip 中包含：
  - `server.py`
  - `index.html`
  - `app.js`
  - `styles.css`
  - `Dockerfile`
  - `docker-compose.yml`
  - `DEPLOYMENT.md`
  - `docs/DESIGN_REPORT.md`
  - `docs/TEST_PLAN.md`

## 13. 回归测试清单

每次发布前执行：

```bash
python -m py_compile server.py
python -m unittest discover -s tests -v
node --check app.js
python build_package.py
```

然后任选一个话题做端到端验证。

## 14. 风险与处理

| 风险 | 表现 | 处理 |
|---|---|---|
| arXiv 限流 | 请求超时或部分结果缺失 | 降低文献上限，稍后重试 |
| DeepSeek 未配置 | 综合分析为本地兜底 | 配置 `.env` 或界面设置 |
| DeepSeek 响应慢 | 生成综合分析等待较久 | 降低文献上限或依赖缓存 |
| 文献太多 | 大模型上下文不足 | 后端会截断单篇摘要长度 |
| 目标抽取漏检 | 热点目标偏少 | 补充命名规则或自定义星表 |
