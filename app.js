const sampleTargets = [
  { id: "280310048", ra_deg: "114.825217", dec_deg: "5.224936", vmag: "0.3332", teff_k: "6583.95" },
  { id: "267211065", ra_deg: "6.435112", dec_deg: "-77.254246", vmag: "2.82", teff_k: "5839.18" },
  { id: "43255143", ra_deg: "250.321778", dec_deg: "31.60275", vmag: "2.806", teff_k: "5795.47" },
  { id: "51735845", ra_deg: "190.4151684", dec_deg: "-1.449297385", vmag: "2.73969", teff_k: "7146.95" },
  { id: "399665349", ra_deg: "72.46004322", dec_deg: "6.961274785", vmag: "3.18465", teff_k: "6398" },
  { id: "38511251", ra_deg: "55.8120785", dec_deg: "-9.763381987", vmag: "3.51773", teff_k: "5037" },
  { id: "460067868", ra_deg: "266.6146773", dec_deg: "27.72061094", vmag: "3.40843", teff_k: "5559" },
  { id: "150226696", ra_deg: "143.2143259", dec_deg: "51.67728891", vmag: "3.17886", teff_k: "6182" },
  { id: "35229531", ra_deg: "126.415", dec_deg: "-3.92", vmag: "4.04", teff_k: "5340" },
  { id: "59476871", ra_deg: "211.71", dec_deg: "18.34", vmag: "4.77", teff_k: "4900" },
  { id: "188401533", ra_deg: "32.81", dec_deg: "-11.18", vmag: "5.02", teff_k: "4620" }
];

let targets = [];
let hotspots = [];

let papers = [
  {
    targetId: "280310048",
    title: "Interferometric characterization of nearby habitable-zone targets",
    source: "arXiv",
    year: 2026,
    url: "https://arxiv.org/",
    summary: "围绕邻近恒星的宜居带角距离、成像可行性和干涉阵列观测策略展开，目标与任务规划关联度高。"
  },
  {
    targetId: "267211065",
    title: "Stellar activity constraints for direct imaging candidate stars",
    source: "ADS",
    year: 2025,
    url: "https://ui.adsabs.harvard.edu/",
    summary: "论文关注恒星活动性对直接成像候选目标筛选的影响，可用于修正观测优先级。"
  },
  {
    targetId: "35229531",
    title: "Exoplanet yield estimates for optical interferometry missions",
    source: "arXiv",
    year: 2024,
    url: "https://arxiv.org/",
    summary: "研究给出光学干涉任务的候选目标收益估计，对目标热度评分有中等支撑。"
  },
  {
    targetId: "59476871",
    title: "Nearby stellar sample refinement for biosignature searches",
    source: "ADS",
    year: 2024,
    url: "https://ui.adsabs.harvard.edu/",
    summary: "论文涉及生命指征搜索的邻近恒星样本筛选，相关目标出现频率较低但方向明确。"
  }
];

let topicSummary = null;
let currentTopic = "分布式光干涉";
let paperRecords = new Map();
let parseTasks = new Map();
let activeParsePolls = new Set();

const targetRows = document.querySelector("#targetRows");
const paperGrid = document.querySelector("#paperGrid");
const summaryGrid = document.querySelector("#summaryGrid");

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
const hotspotList = document.querySelector("#hotspotList");
const jsonPreview = document.querySelector("#jsonPreview");
const checks = document.querySelector("#checks");

function heatFor(id) {
  return hotspots.find((item) => String(item.id) === String(id))?.heat ?? hotspots.find((item) => String(item.id) === String(id))?.seed_heat ?? null;
}

function matchedHotspots() {
  const ids = new Set(targets.map((item) => String(item.id)));
  return hotspots.map((item) => ({ ...item, matched: ids.has(String(item.id)) }));
}

function enrichedHotspots() {
  const targetMap = new Map(targets.map((item) => [String(item.id), item]));
  return matchedHotspots().map((item) => ({
    id: String(item.id),
    name: targetMap.get(String(item.id))?.name ?? null,
    heat: Number(item.heat),
    matched: item.matched,
    papers: item.papers?.length
      ? item.papers
      : papers
      .filter((paper) => paper.targetId === String(item.id))
      .map((paper) => ({ title: paper.title, year: paper.year, url: paper.url })),
    summary: item.summary || (item.matched
      ? "目标在近期文献中具有可追溯的研究关注度，可进入候选目标热度排序。"
      : item.comment ?? "热点结果中的目标 ID 未在当前观测序列中找到。"),
    updated_at: item.updated_at || new Date().toISOString().slice(0, 10),
    timeframe_months: item.timeframe_months || selectedTimeframeMonths(),
    score_breakdown: item.score_breakdown || {},
    warnings: item.warnings || []
  }));
}

function renderTargets(selectedId = targets[0]?.id) {
  targetRows.innerHTML = "";
  if (!targets.length) {
    targetRows.innerHTML = `
      <tr>
        <td colspan="5">暂无从文献中提取的候选目标</td>
      </tr>
    `;
    return;
  }
  targets.forEach((target) => {
    const heat = heatFor(target.id);
    const tr = document.createElement("tr");
    tr.className = String(target.id) === String(selectedId) ? "selected" : "";
    tr.innerHTML = `
      <td>${target.id}</td>
      <td>${target.ra_deg ?? (target.in_reference_catalog ? "是" : "否")}</td>
      <td>${target.dec_deg ?? target.related_paper_count ?? "-"}</td>
      <td>${target.vmag ?? target.source ?? "-"}</td>
      <td><span class="pill ${heat === null ? "empty" : ""}">${heat === null ? "未匹配" : heat}</span></td>
    `;
    tr.addEventListener("click", () => selectTarget(target.id));
    targetRows.appendChild(tr);
  });
}

function setScoreValue(valueId, barId, value, max) {
  const numeric = Number(value || 0);
  document.querySelector(valueId).textContent = Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
  document.querySelector(barId).value = Math.max(0, Math.min(max, numeric));
}

function renderScoreBreakdown(breakdown = {}) {
  setScoreValue("#scorePaperCount", "#scorePaperCountBar", breakdown.paper_count, 35);
  setScoreValue("#scoreRecent", "#scoreRecentBar", breakdown.recent_attention, 25);
  setScoreValue("#scoreRelevance", "#scoreRelevanceBar", breakdown.llm_relevance, 25);
  setScoreValue("#scoreRepresentative", "#scoreRepresentativeBar", breakdown.representative, 15);
}

function selectTarget(id) {
  if (!targets.length) {
    document.querySelector("#detailTitle").textContent = "暂无候选目标";
    document.querySelector("#detailSubtitle").textContent = "请先输入话题并生成分析";
    document.querySelector("#detailHeat").textContent = "--";
    document.querySelector(".score-ring").style.background = "conic-gradient(var(--green) 0 0deg, #e8edf2 0deg 360deg)";
    renderScoreBreakdown();
    document.querySelector("#detailSummary").textContent = "当文献中识别到目标名、星表编号或可交叉匹配对象后，这里会显示目标热度说明和代表性文献。";
    document.querySelector("#detailPapersTitle").textContent = "代表性文献";
    document.querySelector("#detailPapers").innerHTML = `<div class="paper-item"><strong>暂无代表性文献</strong><span>等待话题文献检索结果</span></div>`;
    return;
  }
  const target = targets.find((item) => String(item.id) === String(id)) ?? targets[0];
  const heat = heatFor(target.id) ?? 0;
  const hotspot = hotspots.find((item) => String(item.id) === String(target.id));
  document.querySelector("#detailTitle").textContent = target.id;
  const relatedPaperCount = hotspot?.related_paper_count ?? target.related_paper_count ?? 0;
  const mentionCount = hotspot?.mention_count ?? target.mention_count ?? 0;
  const referenceText = hotspot?.in_reference_catalog
    ? `参考表ID ${hotspot.reference_catalog_id || hotspot.matched_catalog_id}`
    : "未命中221参考表";
  document.querySelector("#detailSubtitle").textContent = `${target.name || "TIC " + target.id} · 热度 ${heat || "未匹配"} · 相关文献 ${relatedPaperCount} 篇 · 文本提及 ${mentionCount} 次 · ${referenceText}`;
  document.querySelector("#detailHeat").textContent = heat || "--";
  document.querySelector(".score-ring").style.background = `conic-gradient(var(--green) 0 ${Math.min(360, heat * 3.6)}deg, #e8edf2 ${Math.min(360, heat * 3.6)}deg 360deg)`;
  renderScoreBreakdown(hotspot?.score_breakdown);
  document.querySelector("#detailSummary").textContent = hotspot?.summary || (heat
    ? "近期论文集中讨论该目标的观测可行性、科学收益或目标样本价值，适合进入后续候选目标筛选。"
    : "当前热点结果未覆盖该目标，后续检索可优先补充目标别名、坐标和星表交叉匹配。");
  const related = hotspot?.papers?.length
    ? hotspot.papers.map((paper) => ({ ...paper, targetId: target.id, source: paper.source || "文献源" }))
    : papers.filter((paper) => paper.targetId === String(target.id));
  document.querySelector("#detailPapersTitle").textContent = `代表性文献 ${related.length}/${hotspot?.related_paper_count ?? related.length}`;
  document.querySelector("#detailPapers").innerHTML = related.length
    ? related.map(renderPaperItem).join("")
    : `<div class="paper-item"><strong>暂无代表性文献</strong><span>等待检索或摘要分析结果</span></div>`;
  renderTargets(target.id);
  if (window.lucide) window.lucide.createIcons();
}

function recordForPaper(paper) {
  if (!paper) return null;
  if (paper.paper_record) return paper.paper_record;
  if (paper.paper_id && paperRecords.has(paper.paper_id)) return paperRecords.get(paper.paper_id);
  return null;
}

function paperFetchStatus(record) {
  if (!record) {
    return { label: "PDF未获取", className: "pending", title: "尚未尝试获取开放全文或预印本 PDF" };
  }
  if (record.fetch_status === "success") {
    const source = record.source_url ? `来源：${record.source_url}` : "已保存到本地";
    return { label: "PDF已保存", className: "ok", title: source };
  }
  if (record.fetch_status === "no_open_fulltext") {
    return { label: "无开放全文", className: "warn", title: record.failure_reason || "未发现开放 PDF 链接" };
  }
  if (record.fetch_status === "download_failed") {
    return { label: "下载失败", className: "error", title: record.failure_reason || "PDF 下载失败" };
  }
  if (record.fetch_status === "fetching") {
    return { label: "获取中", className: "pending", title: "正在尝试获取 PDF" };
  }
  return { label: "PDF未获取", className: "pending", title: record.failure_reason || "尚未尝试获取 PDF" };
}

function paperParseStatus(record, task = null) {
  if (task && ["queued", "running"].includes(task.status)) {
    return { label: task.status === "queued" ? "排队中" : "解析中", className: "pending", title: task.progress_stage || task.message || "MinerU 解析任务正在执行" };
  }
  if (!record || record.fetch_status !== "success") {
    return { label: "未解析", className: "pending", title: "请先成功获取 PDF" };
  }
  if (record.parse_status === "success") {
    return { label: "解析成功", className: "ok", title: record.markdown_path || "Markdown 已保存" };
  }
  if (record.parse_status === "need_review") {
    return { label: "需复核", className: "warn", title: record.parse_error || "MinerU 已生成结果，但需人工复核" };
  }
  if (record.parse_status === "failed") {
    return { label: "解析失败", className: "error", title: record.parse_error || "MinerU 解析失败" };
  }
  if (record.parse_status === "running") {
    return { label: "解析中", className: "pending", title: "MinerU 解析任务正在执行" };
  }
  return { label: "未解析", className: "pending", title: "尚未启动 MinerU 解析" };
}

function taskTimestamp(task) {
  return Date.parse(task?.updated_at || task?.created_at || "") || 0;
}

function mergeParseTask(task) {
  if (!task?.task_id) return;
  const key = task.paper_id || task.task_id;
  const existing = parseTasks.get(key);
  if (existing && existing.task_id !== task.task_id && taskTimestamp(task) < taskTimestamp(existing)) {
    return;
  }
  parseTasks.set(key, task);
  if (task.record) mergePaperRecord(task.record);
}

function taskForPaper(record) {
  if (!record?.paper_id) return null;
  return parseTasks.get(record.paper_id) || null;
}

function latestTaskForPaperId(paperId) {
  if (!paperId) return null;
  return parseTasks.get(paperId) || null;
}

function parseProgressText(task) {
  if (!task || !["queued", "running"].includes(task.status)) return "";
  const percent = Number(task.progress_percent);
  const prefix = Number.isFinite(percent) ? `${Math.max(0, Math.min(100, percent)).toFixed(1)}%` : "";
  return [prefix, task.progress_stage || task.message || "解析中"].filter(Boolean).join(" · ");
}

async function restoreActiveParseTask(record) {
  if (!record?.paper_id || record.fetch_status !== "success" || record.parse_status === "success") return;
  try {
    const response = await fetch(`/api/paper/parse-task?paper_id=${encodeURIComponent(record.paper_id)}`);
    if (!response.ok) return;
    const payload = await response.json();
    const task = (payload.items || []).find((item) => ["queued", "running"].includes(item.status));
    if (!task?.task_id) return;
    mergeParseTask(task);
    pollParseTask(task.task_id, null, "解析PDF");
  } catch (error) {
    console.warn("parse task restore unavailable", error);
  }
}

function mergePaperRecord(record) {
  if (!record?.paper_id) return;
  paperRecords.set(record.paper_id, record);
  const paper = papers.find((item) =>
    item.paper_id === record.paper_id || (item.title === record.title && !item.paper_id)
  );
  if (paper) {
    paper.paper_id = record.paper_id;
    paper.paper_record = record;
    paper.fetch_status = record.fetch_status;
    paper.pdf_path = record.pdf_path;
    paper.parse_status = record.parse_status;
    paper.markdown_path = record.markdown_path;
  }
}

function refreshPaperViews() {
  renderPapers(document.querySelector("#paperSearch")?.value || "");
  renderSummaries();
  const selectedId = document.querySelector("#targetRows tr.selected td")?.textContent;
  if (selectedId) selectTarget(selectedId);
  renderExport();
  if (window.lucide) window.lucide.createIcons();
}

function renderPaperItem(paper) {
  const index = papers.findIndex((item) => item.title === paper.title && item.url === paper.url);
  const paperIndex = index >= 0 ? index : "";
  const record = recordForPaper(paper);
  const status = paperFetchStatus(record);
  const task = taskForPaper(record);
  const parseStatus = paperParseStatus(record, task);
  const progressText = parseProgressText(task);
  const progressValue = Math.max(0, Math.min(100, Number(task?.progress_percent || 0)));
  const pdfHref = record?.fetch_status === "success" && record.paper_id
    ? `/api/paper/pdf?paper_id=${encodeURIComponent(record.paper_id)}`
    : "";
  const canPreviewMarkdown = record?.paper_id && record?.markdown_path && ["success", "need_review"].includes(record?.parse_status);
  return `
    <article class="paper-item" data-paper-index="${paperIndex}">
      <strong>${escapeHtml(paper.title)}</strong>
      <span>${escapeHtml(paper.source || "文献源")} · ${paper.year || "-"} · 目标 ${escapeHtml(paper.targetId || "-")}</span>
      <div class="paper-status-row">
        <div class="paper-fetch-status ${status.className}" title="${escapeHtml(status.title)}">${escapeHtml(status.label)}</div>
        <div class="paper-fetch-status ${parseStatus.className}" title="${escapeHtml(parseStatus.title)}">${escapeHtml(parseStatus.label)}</div>
      </div>
      ${progressText ? `<div class="parse-progress"><progress value="${progressValue}" max="100"></progress><span>${escapeHtml(progressText)}</span></div>` : ""}
      <div class="paper-actions">
        <button class="inline-analysis-button" data-paper-index="${paperIndex}" type="button">
          <i data-lucide="sparkles"></i>
          <span>详细分析</span>
        </button>
        <button class="fetch-pdf-button" data-paper-index="${paperIndex}" type="button">
          <i data-lucide="file-down"></i>
          <span>${record?.fetch_status === "success" ? "重新获取PDF" : "获取PDF"}</span>
        </button>
        ${pdfHref ? `<a class="open-pdf-link" href="${pdfHref}" target="_blank" rel="noopener"><i data-lucide="file-text"></i><span>打开PDF</span></a>` : ""}
        <button class="parse-pdf-button" data-paper-index="${paperIndex}" type="button" ${record?.fetch_status === "success" ? "" : "disabled"}>
          <i data-lucide="file-cog"></i>
          <span>${record?.parse_status === "success" ? "重新解析" : "解析PDF"}</span>
        </button>
        ${canPreviewMarkdown ? `<button class="preview-markdown-button" data-paper-id="${escapeHtml(record.paper_id)}" type="button"><i data-lucide="book-open-text"></i><span>预览Markdown</span></button>` : ""}
      </div>
    </article>
  `;
}

function renderPapers(filter = "") {
  const value = filter.trim().toLowerCase();
  const sourcePapers = papers.length
    ? papers
    : hotspots.flatMap((item) => (item.papers || []).map((paper) => ({ ...paper, targetId: item.id })));
  const filtered = sourcePapers.filter((paper) =>
    [paper.title, paper.source, paper.targetId].some((field) => String(field).toLowerCase().includes(value))
  );
  paperGrid.innerHTML = filtered.map(renderPaperItem).join("");
  if (window.lucide) window.lucide.createIcons();
}

function renderSummaries() {
  const summaries = papers.length
    ? papers.map((paper, index) => ({
        targetId: paper.year || `#${index + 1}`,
        title: paper.title,
        summary: paper.abstract || "该文献未提供原始摘要。",
        index
      }))
    : hotspots.map((item) => ({
        targetId: item.id,
        title: item.name || `TIC ${item.id}`,
        summary: item.summary || item.comment || "等待摘要分析结果。"
      }));
  summaryGrid.innerHTML = summaries
    .map(
      (paper) => `
        <article class="summary-item" data-paper-index="${paper.index ?? ""}">
          <strong>${escapeHtml(paper.targetId)}</strong>
          <span>${escapeHtml(paper.title)}</span>
          <p>${escapeHtml(paper.summary)}</p>
          ${paper.index !== undefined ? `<button class="inline-analysis-button" data-paper-index="${paper.index}" type="button"><i data-lucide="sparkles"></i><span>调用大模型详细分析</span></button>` : ""}
        </article>
      `
    )
    .join("");
  if (window.lucide) window.lucide.createIcons();
}

function selectedPaperLimit() {
  return Number(document.querySelector("#paperLimitSelect")?.value ?? 200);
}

function paperLimitLabel(value = selectedPaperLimit()) {
  return Number(value) === 0 ? "无上限" : `${value}篇`;
}

function renderHotspots() {
  hotspotList.innerHTML = enrichedHotspots()
    .sort((a, b) => b.heat - a.heat)
    .map(
      (item) => `
        <article class="hotspot-item">
          <strong>${item.heat.toFixed(1)}</strong>
          <div>
            <strong>${item.id}</strong>
            <span>${item.matched ? "已匹配观测序列" : "未匹配观测序列"}</span>
          </div>
          <div class="heat-bar"><span style="width:${Math.min(100, item.heat)}%"></span></div>
        </article>
      `
    )
    .join("");
}

function renderExport() {
  const output = enrichedHotspots();
  jsonPreview.textContent = JSON.stringify(output, null, 2);
  const unmatched = output.filter((item) => !item.matched);
  checks.innerHTML = `
    <div class="check-item"><i data-lucide="check-circle-2"></i><div><strong>ID 字段</strong><br><span>所有记录包含 id</span></div></div>
    <div class="check-item"><i data-lucide="check-circle-2"></i><div><strong>热度字段</strong><br><span>所有记录包含 heat</span></div></div>
    <div class="check-item ${unmatched.length ? "warn" : ""}"><i data-lucide="${unmatched.length ? "circle-alert" : "check-circle-2"}"></i><div><strong>目标匹配</strong><br><span>${unmatched.length ? `${unmatched.length} 个 ID 未匹配` : "全部匹配"}</span></div></div>
    <div class="check-item"><i data-lucide="check-circle-2"></i><div><strong>更新时间</strong><br><span>${new Date().toISOString().slice(0, 10)}</span></div></div>
  `;
}

function renderMetrics() {
  const matched = matchedHotspots();
  const matchedCount = matched.filter((item) => item.matched).length;
  const unmatchedCount = matched.length - matchedCount;
  document.querySelector("#targetCount").textContent = hotspots.length;
  document.querySelector("#matchedCount").textContent = matchedCount;
  document.querySelector("#unmatchedCount").textContent = unmatchedCount;
  const paperTotal = hotspots.reduce((sum, item) => sum + (item.papers?.length || 0), 0) || papers.length;
  document.querySelector("#paperCount").textContent = paperTotal;
  document.querySelector("#topHeat").textContent = Math.max(0, ...hotspots.map((item) => Number(item.heat) || 0)).toFixed(1);
}

function setNotice(message, type = "") {
  const notice = document.querySelector("#runNotice");
  if (!notice) return;
  notice.textContent = message;
  notice.className = `notice-bar ${type}`.trim();
}

function selectedTimeframeMonths() {
  const value = document.querySelector("#timeframeSelect")?.value || "12";
  if (value === "custom") {
    const custom = Number(document.querySelector("#customMonthsInput")?.value || 12);
    return Math.max(1, Math.min(240, custom));
  }
  return Number(value);
}

function timeframeLabel(months = selectedTimeframeMonths()) {
  const value = Number(months);
  if (value === 1) return "一个月";
  if (value === 6) return "半年";
  if (value === 12) return "一年";
  if (value === 24) return "两年";
  if (value === 36) return "三年";
  if (value === 60) return "五年";
  if (value % 12 === 0) return `${value / 12}年`;
  return `${value}个月`;
}

function updateCustomMonthsVisibility() {
  const wrap = document.querySelector("#customMonthsWrap");
  const isCustom = document.querySelector("#timeframeSelect")?.value === "custom";
  wrap?.classList.toggle("visible", isCustom);
}

function applyStatusTimeframe(months) {
  const select = document.querySelector("#timeframeSelect");
  const custom = document.querySelector("#customMonthsInput");
  const known = ["1", "6", "12", "24", "36", "60"];
  const value = String(months || 12);
  if (known.includes(value)) {
    select.value = value;
  } else {
    select.value = "custom";
    custom.value = value;
  }
  updateCustomMonthsVisibility();
}

function renderAll() {
  renderMetrics();
  renderTargets();
  selectTarget(targets[0]?.id);
  renderPapers();
  renderSummaries();
  renderHotspots();
  renderExport();
  if (window.lucide) window.lucide.createIcons();
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = lines.shift().split(",").map((item) => item.trim());
  return lines.map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, cells[index]?.trim() ?? ""]));
  });
}

function downloadHotspots() {
  if (location.protocol.startsWith("http")) {
    location.href = "/api/export";
    return;
  }
  const blob = new Blob([JSON.stringify(enrichedHotspots(), null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "hotspots.json";
  link.click();
  URL.revokeObjectURL(url);
}

function normalizeServerTarget(item) {
  return {
    id: String(item.id),
    name: item.name,
    aliases: item.aliases || [],
    ra_deg: item.ra_deg,
    dec_deg: item.dec_deg,
    vmag: item.vmag,
    teff_k: item.teff_k,
    seed_heat: item.seed_heat
  };
}

function normalizeHotspots(items) {
  hotspots = (items || []).map((item) => ({
    ...item,
    id: String(item.id),
    heat: Number(item.heat || 0)
  }));
  targets = hotspots.map((item) => ({
    id: String(item.id),
    name: item.name,
    matched_catalog_id: item.matched_catalog_id,
    reference_catalog_id: item.reference_catalog_id,
    in_reference_catalog: item.in_reference_catalog,
    mention_count: item.mention_count,
    related_paper_count: item.related_paper_count,
    source: item.analysis_provider || "literature",
    seed_heat: item.heat
  }));
  papers = hotspots.flatMap((item) =>
    (item.papers || []).map((paper) => ({
      ...paper,
      targetId: item.id,
      abstract: paper.abstract || item.summary || ""
    }))
  );
  papers.forEach((paper) => {
    if (paper.paper_record) mergePaperRecord(paper.paper_record);
    if (paper.paper_id && paperRecords.has(paper.paper_id)) paper.paper_record = paperRecords.get(paper.paper_id);
  });
}

function renderTopicSummary(topic, summary) {
  const title = document.querySelector("#topicSummaryTitle");
  const text = document.querySelector("#topicSummaryText");
  title.textContent = topic || "未设置话题";
  text.textContent = summary?.summary || "输入话题并点击“生成分析”后，这里会显示面向跨专业用户的中文摘要。";
}

function openPaperAnalysisModal(paper) {
  const modal = document.querySelector("#paperAnalysisModal");
  if (!modal || !paper) return;
  modal.hidden = false;
  document.querySelector("#paperAnalysisTitle").textContent = paper.title || "文献详细分析";
  document.querySelector("#paperAnalysisMeta").textContent = `${paper.year || "-"} · ${paper.source || "文献源"}`;
  document.querySelector("#paperAnalysisBody").textContent = "正在调用大模型生成详细分析...";
  document.querySelector("#paperAnalysisPoints").innerHTML = "";
  document.querySelector("#paperAnalysisTargets").textContent = "";
  analyzePaperWithLLM(paper);
}

function closePaperAnalysisModal() {
  const modal = document.querySelector("#paperAnalysisModal");
  if (modal) modal.hidden = true;
}

async function analyzePaperWithLLM(paper) {
  try {
    const response = await fetch("/api/paper/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: currentTopic, paper })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    document.querySelector("#paperAnalysisBody").textContent = payload.analysis || "未生成详细分析。";
    const points = payload.key_points || [];
    document.querySelector("#paperAnalysisPoints").innerHTML = points.length
      ? points.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
      : "";
    const targets = payload.mentioned_targets || [];
    const relevance = payload.target_relevance || "";
    document.querySelector("#paperAnalysisTargets").textContent = [relevance, targets.length ? `涉及目标：${targets.join("、")}` : ""].filter(Boolean).join(" ");
  } catch (error) {
    document.querySelector("#paperAnalysisBody").textContent = `详细分析失败：${error.message}`;
  }
}

async function loadPaperRecords() {
  try {
    const response = await fetch("/api/paper-records");
    if (!response.ok) return;
    const payload = await response.json();
    paperRecords = new Map((payload.items || []).map((record) => [record.paper_id, record]));
    papers.forEach((paper) => {
      if (paper.paper_id && paperRecords.has(paper.paper_id)) paper.paper_record = paperRecords.get(paper.paper_id);
    });
    (payload.items || []).forEach((record) => restoreActiveParseTask(record));
  } catch (error) {
    console.warn("paper records unavailable", error);
  }
}

async function fetchPaperPdf(paper, button) {
  if (!paper) return;
  const label = button?.querySelector("span");
  const originalLabel = label?.textContent || "获取PDF";
  if (button) button.disabled = true;
  if (label) label.textContent = "获取中...";
  setNotice(`正在尝试获取《${paper.title || "文献"}》的开放 PDF。`);
  try {
    const response = await fetch("/api/paper/fetch-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paper })
    });
    const payload = await response.json();
    if (payload.record) mergePaperRecord(payload.record);
    if (!response.ok || !payload.ok) {
      const reason = payload.record?.failure_reason || payload.error || `HTTP ${response.status}`;
      setNotice(`PDF 获取未完成：${reason}`, response.status === 404 ? "warn" : "error");
    } else {
      setNotice("PDF 已保存到 outputs/pdfs，可在文献卡片中打开。", "ok");
    }
    refreshPaperViews();
  } catch (error) {
    setNotice(`PDF 获取失败：${error.message}`, "error");
  } finally {
    if (button) button.disabled = false;
    if (label) label.textContent = originalLabel;
  }
}

async function parsePaperPdf(paper, button) {
  const record = recordForPaper(paper);
  if (!record?.paper_id || record.fetch_status !== "success") {
    setNotice("请先成功获取 PDF，再启动 MinerU 解析。", "warn");
    return;
  }
  const label = button?.querySelector("span");
  const originalLabel = label?.textContent || "解析PDF";
  if (button) button.disabled = true;
  if (label) label.textContent = "排队中...";
  setNotice(`已提交《${paper.title || "文献"}》的 MinerU 解析任务，正在等待状态更新。`);
  try {
    const response = await fetch("/api/paper/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paper_id: record.paper_id, paper })
    });
    const payload = await response.json();
    if (payload.record) mergePaperRecord(payload.record);
    if (payload.task) mergeParseTask(payload.task);
    refreshPaperViews();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.task?.message || payload.error || `HTTP ${response.status}`);
    }
    if (payload.task?.task_id && ["queued", "running"].includes(payload.task.status)) {
      pollParseTask(payload.task.task_id, button, originalLabel);
    } else {
      const status = payload.task?.parse_status || payload.record?.parse_status;
      setNotice(status === "success" ? "Markdown 已存在，已复用解析结果。" : (payload.task?.message || "解析任务已完成。"), status === "success" ? "ok" : "warn");
    }
  } catch (error) {
    setNotice(`解析任务启动失败：${error.message}`, "error");
    if (button) button.disabled = false;
    if (label) label.textContent = originalLabel;
  }
}

async function pollParseTask(taskId, button, originalLabel, attempt = 0) {
  if (attempt === 0 && activeParsePolls.has(taskId)) {
    if (button) button.disabled = false;
    const existingLabel = button?.querySelector("span");
    if (existingLabel) existingLabel.textContent = originalLabel;
    return;
  }
  if (attempt === 0) activeParsePolls.add(taskId);
  const label = button?.querySelector("span");
  try {
    const response = await fetch(`/api/paper/parse-task?task_id=${encodeURIComponent(taskId)}`);
    const task = await response.json();
    mergeParseTask(task);
    refreshPaperViews();
    if (["queued", "running"].includes(task.status) && attempt < 3600) {
      const progress = parseProgressText(task);
      if (label) label.textContent = task.status === "queued" ? "排队中..." : "解析中...";
      if (progress) setNotice(`MinerU ${progress}`);
      setTimeout(() => pollParseTask(taskId, button, originalLabel, attempt + 1), 2000);
      return;
    }
    activeParsePolls.delete(taskId);
    if (button) button.disabled = false;
    if (label) label.textContent = originalLabel;
    const latest = latestTaskForPaperId(task.paper_id);
    if (latest?.task_id && latest.task_id !== task.task_id && ["queued", "running"].includes(latest.status)) {
      return;
    }
    if (task.parse_status === "success") {
      setNotice("MinerU 解析完成，Markdown 已保存。", "ok");
    } else if (task.parse_status === "need_review") {
      setNotice(`MinerU 解析完成但需复核：${task.message || "请预览 Markdown 结构"}`, "warn");
    } else {
      setNotice(`MinerU 解析失败：${task.message || "未生成可用 Markdown"}`, "error");
    }
  } catch (error) {
    activeParsePolls.delete(taskId);
    if (button) button.disabled = false;
    if (label) label.textContent = originalLabel;
    setNotice(`解析状态读取失败：${error.message}`, "error");
  }
}

async function openMarkdownPreview(paperId) {
  const modal = document.querySelector("#markdownPreviewModal");
  const body = document.querySelector("#markdownPreviewBody");
  const meta = document.querySelector("#markdownPreviewMeta");
  if (!modal || !body) return;
  modal.hidden = false;
  body.textContent = "正在读取 Markdown...";
  const record = paperRecords.get(paperId);
  meta.textContent = record?.markdown_path || paperId;
  try {
    const response = await fetch(`/api/paper/markdown?paper_id=${encodeURIComponent(paperId)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    body.textContent = await response.text();
    if (record?.parse_status === "need_review") {
      meta.textContent = `${record.markdown_path || paperId} · 需人工复核`;
    }
  } catch (error) {
    body.textContent = `Markdown 读取失败：${error.message}`;
  }
}

function closeMarkdownPreview() {
  const modal = document.querySelector("#markdownPreviewModal");
  if (modal) modal.hidden = true;
}

function resetAnalysisState(topic = "") {
  currentTopic = topic || currentTopic;
  hotspots = [];
  papers = [];
  targets = [];
  topicSummary = null;
  renderTopicSummary(topic, { summary: "正在检索相关文献，旧结果已清空。" });
  renderAll();
}

async function loadFromApi() {
  try {
    const [statusResponse, targetsResponse, hotspotsResponse] = await Promise.all([
      fetch("/api/status"),
      fetch("/api/targets"),
      fetch("/api/hotspots")
    ]);
    if (!targetsResponse.ok || !hotspotsResponse.ok) return;
    const status = statusResponse.ok ? await statusResponse.json() : null;
    if (status?.default_timeframe_months) applyStatusTimeframe(status.default_timeframe_months);
    const catalogTargets = (await targetsResponse.json()).map(normalizeServerTarget);
    const hotspotPayload = await hotspotsResponse.json();
    normalizeHotspots(hotspotPayload.items || hotspotPayload);
    await loadPaperRecords();
    if (hotspotPayload.topic_summary) {
      topicSummary = hotspotPayload.topic_summary;
      renderTopicSummary(hotspotPayload.topic, topicSummary);
    }
    document.querySelector("#sequenceFile").textContent = "221_targets_literature_search_enriched.csv";
    document.querySelector("#runLabel").textContent = "后端已连接";
    document.querySelector("#runMeta").textContent = `${catalogTargets.length} 个参考目标记录`;
    if (status?.deepseek_enabled) {
      setNotice(`DeepSeek 已启用。当前扒取时间范围：${timeframeLabel()}。`, "ok");
    } else {
      setNotice(`DeepSeek 未配置。当前扒取时间范围：${timeframeLabel()}；会使用 arXiv 检索和本地启发式分析。`, "warn");
    }
    renderAll();
  } catch (error) {
    console.warn("API unavailable, using local sample data", error);
    setNotice("后端服务不可用，当前显示本地样例数据。", "error");
  }
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`#${button.dataset.view}`).classList.add("active");
    renderExport();
    if (window.lucide) window.lucide.createIcons();
  });
});

document.querySelector("#csvInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  targets = parseCsv(await file.text()).filter((item) => item.id);
  document.querySelector("#sequenceFile").textContent = file.name;
  document.querySelector("#runLabel").textContent = "已导入序列";
  renderAll();
});

document.querySelector("#jsonInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  hotspots = JSON.parse(await file.text());
  document.querySelector("#runLabel").textContent = "已导入热点";
  renderAll();
});

document.querySelector("#simulateRun").addEventListener("click", async () => {
  const button = document.querySelector("#simulateRun");
  const label = button.querySelector("span");
  button.disabled = true;
  label.textContent = "分析中...";
  document.querySelector("#runLabel").textContent = "分析中";
  document.querySelector("#runMeta").textContent = "正在检索文献并计算热度";
  const timeframeMonths = selectedTimeframeMonths();
  const maxPapers = selectedPaperLimit();
  const topic = document.querySelector("#topicInput").value.trim();
  if (!topic) {
    setNotice("请先输入一个感兴趣的话题。", "error");
    button.disabled = false;
    label.textContent = "生成分析";
    return;
  }
  resetAnalysisState(topic);
  setNotice(`正在围绕“${topic}”生成分析，扒取最近${timeframeLabel(timeframeMonths)}的文献，采集上限：${paperLimitLabel(maxPapers)}。`);
  try {
    const response = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, limit: 12, use_seed: false, timeframe_months: timeframeMonths, max_papers: maxPapers })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    normalizeHotspots(payload.items || []);
    topicSummary = payload.topic_summary || null;
    papers = (payload.papers || []).map((paper) => ({
      ...paper,
      targetId: paper.target_id || "topic",
      summary: paper.abstract || "",
      chinese_summary: ""
    }));
    papers.forEach((paper) => {
      if (paper.paper_record) mergePaperRecord(paper.paper_record);
      if (paper.paper_id && paperRecords.has(paper.paper_id)) paper.paper_record = paperRecords.get(paper.paper_id);
    });
    renderTopicSummary(payload.topic || topic, topicSummary);
    const now = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    document.querySelector("#runLabel").textContent = "分析完成";
    document.querySelector("#runMeta").textContent = `${payload.validation?.hotspot_count || hotspots.length} 个热点 · ${timeframeLabel(timeframeMonths)} · ${now}`;
    const paperCount = payload.topic_summary?.paper_count ?? papers.length;
    const hotspotCount = payload.validation?.hotspot_count ?? hotspots.length;
    if (paperCount === 0) {
      setNotice(`未检索到“${topic}”在当前时间范围内的相关文献，目标热度已重置为 0。`, "warn");
    } else {
      setNotice(`分析完成：围绕“${topic}”采集 ${paperCount} 篇文献，生成 ${hotspotCount} 个目标热度。`, "ok");
    }
  } catch (error) {
    document.querySelector("#runLabel").textContent = "分析失败";
    document.querySelector("#runMeta").textContent = "请查看日志";
    setNotice(`生成分析失败：${error.message}。请确认后端服务正在运行。`, "error");
  } finally {
    button.disabled = false;
    label.textContent = "生成分析";
  }
  renderAll();
});

document.querySelector("#paperSearch").addEventListener("input", (event) => renderPapers(event.target.value));

document.addEventListener("click", (event) => {
  const button = event.target.closest(".inline-analysis-button");
  if (!button) return;
  const index = Number(button.dataset.paperIndex);
  if (!Number.isInteger(index) || !papers[index]) return;
  openPaperAnalysisModal(papers[index]);
});

document.addEventListener("click", (event) => {
  const button = event.target.closest(".fetch-pdf-button");
  if (!button) return;
  const index = Number(button.dataset.paperIndex);
  if (!Number.isInteger(index) || !papers[index]) return;
  fetchPaperPdf(papers[index], button);
});

document.addEventListener("click", (event) => {
  const button = event.target.closest(".parse-pdf-button");
  if (!button) return;
  const index = Number(button.dataset.paperIndex);
  if (!Number.isInteger(index) || !papers[index]) return;
  parsePaperPdf(papers[index], button);
});

document.addEventListener("click", (event) => {
  const button = event.target.closest(".preview-markdown-button");
  if (!button?.dataset.paperId) return;
  openMarkdownPreview(button.dataset.paperId);
});
document.querySelector("#timeframeSelect").addEventListener("change", () => {
  updateCustomMonthsVisibility();
  setNotice(`已选择扒取最近${timeframeLabel()}的文献。点击“生成分析”后生效。`);
});
document.querySelector("#customMonthsInput").addEventListener("input", () => {
  setNotice(`已选择扒取最近${timeframeLabel()}的文献。点击“生成分析”后生效。`);
});
document.querySelector("#downloadJson").addEventListener("click", downloadHotspots);
document.querySelector("#downloadJsonAlt").addEventListener("click", downloadHotspots);

async function refreshDeepseekConfig() {
  try {
    const response = await fetch("/api/deepseek/config");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const config = await response.json();
    document.querySelector("#deepseekStatus").textContent = config.enabled ? "已配置 API Key" : "未配置 API Key";
    document.querySelector("#deepseekBaseUrl").value = config.base_url || "https://api.deepseek.com/chat/completions";
    document.querySelector("#deepseekModel").value = config.model || "deepseek-chat";
    document.querySelector("#deepseekConfigNotice").textContent = config.enabled
      ? "DeepSeek API Key 已配置。保存新 Key 可覆盖当前配置。"
      : "请输入 DeepSeek API Key，保存后会立即在当前服务中生效。";
    document.querySelector("#deepseekConfigNotice").className = `notice-bar ${config.enabled ? "ok" : "warn"}`;
  } catch (error) {
    document.querySelector("#deepseekStatus").textContent = "状态读取失败";
    document.querySelector("#deepseekConfigNotice").textContent = `读取配置失败：${error.message}`;
    document.querySelector("#deepseekConfigNotice").className = "notice-bar error";
  }
}

function openDeepseekModal() {
  document.querySelector("#deepseekModal").hidden = false;
  refreshDeepseekConfig();
  if (window.lucide) window.lucide.createIcons();
}

function closeDeepseekModal() {
  document.querySelector("#deepseekModal").hidden = true;
}

async function saveDeepseekConfig() {
  const button = document.querySelector("#saveDeepseekConfig");
  const label = button.querySelector("span");
  button.disabled = true;
  label.textContent = "保存中...";
  try {
    const response = await fetch("/api/deepseek/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: document.querySelector("#deepseekApiKey").value.trim(),
        base_url: document.querySelector("#deepseekBaseUrl").value.trim(),
        model: document.querySelector("#deepseekModel").value.trim()
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    document.querySelector("#deepseekApiKey").value = "";
    document.querySelector("#deepseekStatus").textContent = payload.enabled ? "已配置 API Key" : "未配置 API Key";
    document.querySelector("#deepseekConfigNotice").textContent = "DeepSeek 配置已保存，并已在当前服务中生效。";
    document.querySelector("#deepseekConfigNotice").className = "notice-bar ok";
    setNotice("DeepSeek 已启用。后续生成分析会调用 DeepSeek。", "ok");
  } catch (error) {
    document.querySelector("#deepseekConfigNotice").textContent = `保存失败：${error.message}`;
    document.querySelector("#deepseekConfigNotice").className = "notice-bar error";
  } finally {
    button.disabled = false;
    label.textContent = "保存配置";
  }
}

document.querySelector("#openDeepseekConfig").addEventListener("click", openDeepseekModal);
document.querySelector("#closeDeepseekConfig").addEventListener("click", closeDeepseekModal);
document.querySelector("#testDeepseekConfig").addEventListener("click", refreshDeepseekConfig);
document.querySelector("#saveDeepseekConfig").addEventListener("click", saveDeepseekConfig);
document.querySelector("#deepseekModal").addEventListener("click", (event) => {
  if (event.target.id === "deepseekModal") closeDeepseekModal();
});
document.querySelector("#closePaperAnalysis").addEventListener("click", closePaperAnalysisModal);
document.querySelector("#paperAnalysisModal").addEventListener("click", (event) => {
  if (event.target.id === "paperAnalysisModal") closePaperAnalysisModal();
});
document.querySelector("#closeMarkdownPreview").addEventListener("click", closeMarkdownPreview);
document.querySelector("#markdownPreviewModal").addEventListener("click", (event) => {
  if (event.target.id === "markdownPreviewModal") closeMarkdownPreview();
});

renderAll();
loadFromApi();
