# 文献助手工具

文献助手是面向天文观测目标筛选前置调研的本地 Web 工具。用户输入研究话题和时间范围后，系统检索开放文献，生成中文综合分析，抽取文献中出现的恒星或宿主星热点目标，并导出 `hotspots.json` 供后续目标筛选与排序使用。

## 当前能力

- 按话题检索 arXiv 文献。
- 支持一个月、半年、一年、两年、三年、五年和自定义时间范围。
- 支持 200、500、1000 篇和无上限采集。
- 按年份桶均衡采样，避免结果只集中在最新年份。
- 将全部文献写入 `outputs/literature_corpus.md`。
- 只调用一次 DeepSeek 对整个文献包做综合分析。
- 默认展示每篇文献的原始英文摘要。
- 用户点击某篇文献后，再按需调用 DeepSeek 生成详细中文分析。
- 从文献中抽取恒星、宿主星或星表目标，生成热点目标 JSON。
- 标记热点目标是否命中原始 221 条参考 CSV。
- 支持 Windows 一键启动、Linux/macOS 启动和 Docker 部署。

## 快速启动

```bash
python server.py --host 127.0.0.1 --port 5179
```

打开：

```text
http://127.0.0.1:5179/index.html
```

Windows 一键启动：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\launch_literature_assistant.ps1
```

首次使用 MinerU 解析 PDF 前，启动脚本会自动预下载 `pipeline` 模型。也可以手动执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\prepare_mineru_models.ps1
```

Linux/macOS：

```bash
chmod +x start_literature_assistant.sh
HOST=127.0.0.1 PORT=5179 ./start_literature_assistant.sh
```

Docker：

```bash
cp .env.example .env
docker compose up -d --build
```

## API Key 配置

复制 `.env.example`：

```bash
cp .env.example .env
```

填写：

```text
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_BASE_URL=https://api.deepseek.com/chat/completions
DEEPSEEK_MODEL=deepseek-chat
ADS_API_KEY=
```

也可以在前端界面中打开 DeepSeek 配置弹窗保存。

未配置 DeepSeek 时，系统仍可检索 arXiv 并生成本地启发式热点结果。

## 主要输出

```text
outputs/literature_corpus.md
outputs/hotspots.json
```

- `literature_corpus.md`：当前话题检索到的全部文献包，包含题名、作者、年份、URL 和原始摘要。
- `hotspots.json`：后续天文目标筛选工具读取的热点目标 JSON。

## 打包

```bash
python build_package.py
```

输出：

```text
dist/literature_assistant_v2_YYYYMMDD.zip
```

打包时会排除 `.env`、缓存、日志和输出结果。

## 文档

- [部署说明](DEPLOYMENT.md)
- [设计报告](docs/DESIGN_REPORT.md)
- [测试文档](docs/TEST_PLAN.md)

## 测试

```bash
python -m py_compile server.py
python -m unittest discover -s tests -v
node --check app.js
```

## 项目结构

```text
server.py                         后端服务
index.html / app.js / styles.css  前端界面
221_targets_literature_search_enriched.csv  参考目标表
outputs/                          运行输出
data/cache/                       本地缓存
tests/                            单元测试
docs/                             设计与测试文档
Dockerfile / docker-compose.yml   容器化部署
build_package.py                  打包脚本
```
