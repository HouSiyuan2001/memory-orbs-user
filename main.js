var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => MemoryOrbsPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_EMOTIONS = [
  { key: "Joy", label: "\u5FEB\u4E50", character: "\u4E50\u4E50", color: "#fbeb37" },
  { key: "sad", label: "\u4F24\u5FC3", character: "\u5FE7\u5FE7", color: "#8abdf5" },
  { key: "angry", label: "\u751F\u6C14", character: "\u6012\u6012", color: "#ff9185" },
  { key: "disgust", label: "\u8BA8\u538C", character: "\u538C\u538C", color: "#75eaa6" },
  { key: "fear", label: "\u5BB3\u6015", character: "\u6015\u6015", color: "#df94ff" },
  { key: "anxiety", label: "\u7126\u8651", character: "\u7126\u7126", color: "#ffa947" },
  { key: "envy", label: "\u6155\u6155", character: "\u6155\u6155", color: "#1affd1" },
  { key: "embarrassed", label: "\u5C34\u5C2C", character: "\u5C2C\u5C2C", color: "#ffa8d4" },
  { key: "ennui", label: "\u65E0\u804A", character: "\u4E27\u4E27", color: "#6f94b8" },
  { key: "nostalgia", label: "\u6000\u65E7", character: "\u6000\u65E7\u5976\u5976", color: "#cccccc" }
];
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}
function lighten(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const lr = Math.min(255, r + (255 - r) * amount);
  const lg = Math.min(255, g + (255 - g) * amount);
  const lb = Math.min(255, b + (255 - b) * amount);
  return `#${Math.round(lr).toString(16).padStart(2, "0")}${Math.round(lg).toString(16).padStart(2, "0")}${Math.round(lb).toString(16).padStart(2, "0")}`;
}
function darken(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  return `#${Math.round(r * (1 - amount)).toString(16).padStart(2, "0")}${Math.round(g * (1 - amount)).toString(16).padStart(2, "0")}${Math.round(b * (1 - amount)).toString(16).padStart(2, "0")}`;
}
function makeGlow(hex, alpha = 0.6) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function makeGradient(hex) {
  const highlight = lighten(hex, 0.85);
  const mid = hex;
  const dark1 = darken(hex, 0.15);
  const dark2 = darken(hex, 0.4);
  return `radial-gradient(circle at 35% 30%, ${highlight}, ${mid} 40%, ${dark1} 80%, ${dark2})`;
}
var DiaryParser = class {
  constructor(app, diaryDir, moodTagPrefix, coreTagKey, emotions) {
    this.fileCache = /* @__PURE__ */ new Map();
    this.app = app;
    this.diaryDir = diaryDir;
    this.moodTagPrefix = moodTagPrefix;
    this.coreTagKey = coreTagKey;
    this.emotionMap = new Map(emotions.map((e) => [e.key.toLowerCase(), e]));
  }
  async parseFile(file) {
    const cached = this.fileCache.get(file.path);
    if (cached && cached.mtime === file.stat.mtime) {
      return cached.entries;
    }
    const content = await this.app.vault.cachedRead(file);
    const date = file.basename;
    const entries = [];
    const escapedPrefixes = this.moodTagPrefix.split(",").map((s) => s.trim()).filter((s) => s.length > 0).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`(?:${escapedPrefixes.join("|")})(\\S+)`, "g");
    const lines = content.split("\n");
    for (const line of lines) {
      const matches = [...line.matchAll(regex)];
      if (matches.length === 0) continue;
      const isCore = matches.some((m) => m[1].toLowerCase() === this.coreTagKey.toLowerCase());
      const emotions = [];
      for (const m of matches) {
        const key = m[1].toLowerCase();
        if (key === this.coreTagKey.toLowerCase()) continue;
        const def = this.emotionMap.get(key);
        if (!def) continue;
        if (!emotions.some((e) => e.key.toLowerCase() === def.key.toLowerCase())) {
          emotions.push(def);
        }
      }
      if (emotions.length === 0) continue;
      if (emotions.length > 3) emotions.length = 3;
      const emotion = emotions[0];
      let text = line.replace(new RegExp(`(?:${escapedPrefixes.join("|")})\\S+`, "g"), "").replace(/!\[.*?\]\(.*?\)/g, "").replace(/\[.*?\]\[.*?\]/g, "").replace(/#{1,6}\s/g, "").replace(/- /g, "").replace(/\*\*/g, "").replace(/\*/g, "").replace(/~~.*?~~/g, "").replace(/>\s*\[!.*?\].*?\n/g, "").replace(/⏰\s*\d{1,2}:\d{2}[:：]\s*/g, "").trim();
      if (text.length > 120) {
        text = text.substring(0, 117) + "...";
      }
      if (text.length > 0) {
        entries.push({ emotion, emotions, text, date, fileName: file.name, isCore });
      }
    }
    this.fileCache.set(file.path, { mtime: file.stat.mtime, entries });
    return entries;
  }
  async getMemories(startDate, endDate) {
    const files = this.app.vault.getFiles();
    const results = [];
    const diaryFiles = files.filter((f) => {
      if (!f.extension || f.extension !== "md") return false;
      if (!f.path.startsWith(this.diaryDir + "/") && f.path !== this.diaryDir) return false;
      const basename = f.basename;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(basename)) return false;
      return basename >= startDate && basename <= endDate;
    }).sort((a, b) => a.basename.localeCompare(b.basename));
    for (const file of diaryFiles) {
      const entries = await this.parseFile(file);
      if (entries.length > 0) {
        results.push({ date: file.basename, entries });
      }
    }
    return results;
  }
  async getAllEmotionFiles() {
    const files = this.app.vault.getFiles();
    const result = [];
    const escapedPrefixes = this.moodTagPrefix.split(",").map((s) => s.trim()).filter((s) => s.length > 0).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(escapedPrefixes.join("|"));
    for (const file of files) {
      if (file.extension !== "md") continue;
      const content = await this.app.vault.cachedRead(file);
      if (regex.test(content)) {
        result.push(file);
      }
    }
    return result;
  }
};
var VIEW_TYPE_MEMORY_ORBS = "memory-orbs-view";
var MemoryOrbsEmbedRenderer = class {
  constructor(plugin, containerEl, initialDate) {
    this.cleanupFns = [];
    this.renderVersion = 0;
    this.plugin = plugin;
    this.containerEl = containerEl;
    this.currentDate = initialDate || this.getTodayString();
    this.parser = new DiaryParser(
      plugin.app,
      plugin.settings.diaryDir,
      plugin.settings.moodTagPrefix,
      plugin.settings.coreTagKey,
      plugin.settings.customEmotions
    );
  }
  getTodayString() {
    const d = /* @__PURE__ */ new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  getDateRange(date, mode) {
    const d = /* @__PURE__ */ new Date(date + "T00:00:00");
    let start;
    let end;
    switch (mode) {
      case "day":
        start = new Date(d);
        end = new Date(d);
        break;
      case "week": {
        const day = d.getDay();
        const diff = day === 0 ? 6 : day - 1;
        start = new Date(d);
        start.setDate(d.getDate() - diff);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      }
      case "month":
      default:
        start = new Date(d.getFullYear(), d.getMonth(), 1);
        end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        break;
    }
    const fmt = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    return { start: fmt(start), end: fmt(end) };
  }
  calculateEmbedMaxBallsPerRow(containerWidth) {
    const BALL_DIAMETER = 52;
    const GAP = this.plugin.settings.orbGap || 4;
    const PADDING = 24;
    const availableWidth = Math.max(0, containerWidth - PADDING * 2);
    const ballWithGap = BALL_DIAMETER + GAP;
    return Math.max(1, Math.floor(availableWidth / ballWithGap));
  }
  createEmbedPipelines(parent, entries, tooltipEl) {
    const group = parent.createDiv({ cls: "mo-embed-pipeline-group" });
    const estimatedWidth = parent.clientWidth || this.containerEl.clientWidth || 800;
    const maxBallsPerRow = this.calculateEmbedMaxBallsPerRow(estimatedWidth);
    const rows = Math.ceil(entries.length / maxBallsPerRow);
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const startIdx = rowIndex * maxBallsPerRow;
      const endIdx = Math.min(startIdx + maxBallsPerRow, entries.length);
      const rowEntries = entries.slice(startIdx, endIdx);
      const pipeline = group.createDiv({ cls: "mo-pipeline mo-embed-pipeline" });
      pipeline.createDiv({ cls: "mo-pipeline-floor" });
      const row = pipeline.createDiv({ cls: "mo-orbs-row mo-embed-orbs-row" });
      for (const entry of rowEntries) {
        row.appendChild(this.createSimpleOrb(entry, tooltipEl));
      }
    }
  }
  createSimpleOrb(entry, tooltipEl) {
    const color = entry.emotion.color;
    const glow = makeGlow(color);
    const { r, g, b } = hexToRgb(color);
    const isBlended = entry.emotions.length > 1;
    const isGlass = this.plugin.settings.visualTheme === "glass";
    const isCosmos = this.plugin.settings.visualTheme === "cosmos";
    const wrapper = this.containerEl.ownerDocument.createElement("div");
    wrapper.addClass("mo-orb-wrapper");
    wrapper.addClass("mo-embed-orb-wrapper");
    const orb = wrapper.createDiv({
      cls: `mo-orb mo-embed-orb${entry.isCore ? " mo-orb-core" : ""}${isBlended ? " mo-orb-blended" : ""}`
    });
    if (isBlended) {
      const blendColors = entry.emotions.map((e) => e.color);
      const seg = 360 / blendColors.length;
      const stops = blendColors.map((c, i) => `${c} ${i * seg}deg ${(i + 1) * seg}deg`).join(", ");
      orb.style.background = `radial-gradient(circle at 35% 25%, rgba(255,255,255,0.45) 0%, transparent 40%), conic-gradient(${stops})`;
    } else if (isGlass) {
      const h = lighten(color, 0.55);
      const d = darken(color, 0.12);
      orb.style.background = `radial-gradient(circle at 30% 22%, rgba(255,255,255,0.88), rgba(255,255,255,0.2) 20%, transparent 40%), linear-gradient(145deg, ${h} 0%, ${color} 45%, ${d} 100%)`;
      orb.style.border = `2px solid rgba(${Math.min(r + 70, 255)}, ${Math.min(g + 70, 255)}, ${Math.min(b + 70, 255)}, 0.45)`;
    } else {
      orb.style.background = makeGradient(color);
    }
    if (entry.isCore) {
      orb.style.boxShadow = `0 0 20px ${glow}, 0 0 42px ${glow}, inset 0 -3px 8px rgba(0,0,0,0.1), inset 0 3px 8px rgba(255,255,255,0.35)`;
    } else {
      orb.style.boxShadow = `0 0 12px ${glow}, 0 0 24px ${glow}, inset 0 -3px 8px rgba(0,0,0,0.12), inset 0 3px 8px rgba(255,255,255,0.3)`;
    }
    const innerGlow = orb.createDiv({ cls: "mo-orb-inner-glow" });
    if (isGlass) {
      innerGlow.style.background = `radial-gradient(circle at 28% 22%, rgba(255,255,255,0.55), transparent 45%)`;
    } else if (isCosmos) {
      innerGlow.style.background = `radial-gradient(circle at 32% 22%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.08) 28%, transparent 50%)`;
    } else {
      innerGlow.style.background = `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.7), transparent 50%)`;
    }
    orb.createDiv({ cls: "mo-orb-highlight" });
    if (entry.isCore) {
      const pulse = orb.createDiv({ cls: "mo-orb-core-pulse" });
      pulse.style.background = glow;
    }
    const showTooltip = () => {
      const rect = orb.getBoundingClientRect();
      tooltipEl.textContent = entry.text;
      tooltipEl.style.left = `${rect.left + rect.width / 2}px`;
      tooltipEl.style.top = `${rect.top - 8}px`;
      tooltipEl.style.transform = "translate(-50%, -100%)";
      requestAnimationFrame(() => {
        tooltipEl.classList.add("mo-tooltip-visible");
      });
    };
    const hideTooltip = () => {
      tooltipEl.classList.remove("mo-tooltip-visible");
    };
    wrapper.addEventListener("mouseenter", showTooltip);
    wrapper.addEventListener("mouseleave", hideTooltip);
    orb.addEventListener("click", (e) => {
      if (!e.metaKey && !e.ctrlKey) return;
      e.preventDefault();
      e.stopPropagation();
      const file = this.plugin.app.vault.getFiles().find((f) => f.name === entry.fileName);
      if (file instanceof import_obsidian.TFile) {
        this.plugin.app.workspace.getLeaf(false).openFile(file);
      }
    });
    return wrapper;
  }
  async render(config) {
    const renderVersion = ++this.renderVersion;
    for (const fn of this.cleanupFns) fn();
    this.cleanupFns = [];
    this.currentDate = config.date || this.currentDate;
    this.containerEl.empty();
    this.containerEl.addClass("memory-orbs-embed");
    const theme = config.theme || this.plugin.settings.visualTheme;
    this.containerEl.toggleClass("mo-theme-cosmos", theme === "cosmos");
    this.containerEl.toggleClass("mo-theme-classic", theme === "classic");
    this.containerEl.toggleClass("mo-theme-sketch", theme === "sketch");
    this.containerEl.toggleClass("mo-theme-glass", theme === "glass");
    this.containerEl.style.fontSize = `${this.plugin.settings.fontSize}px`;
    const body = this.containerEl.createDiv({ cls: "mo-embed-body" });
    const loading = body.createDiv({ cls: "mo-loading", text: "\u6B63\u5728\u63D0\u53D6\u8BB0\u5FC6..." });
    const tooltipEl = this.containerEl.ownerDocument.createElement("div");
    tooltipEl.className = "mo-pipeline-tooltip mo-embed-tooltip";
    this.containerEl.ownerDocument.body.appendChild(tooltipEl);
    this.cleanupFns.push(() => tooltipEl.remove());
    try {
      const range = config.start && config.end ? { start: config.start, end: config.end } : this.getDateRange(this.currentDate, config.mode);
      const dayMemories = await this.parser.getMemories(range.start, range.end);
      if (renderVersion !== this.renderVersion) return;
      loading.remove();
      const isLimited = !this.plugin.settings.activated;
      let displayDays = dayMemories;
      if (isLimited) {
        const today = this.getTodayString();
        displayDays = dayMemories.filter((d) => d.date === today);
      }
      const allEntries = displayDays.flatMap((day) => day.entries);
      if (allEntries.length === 0) {
        const empty = body.createDiv({ cls: "mo-empty" });
        empty.createSpan({ text: "\u8FD9\u4E2A\u65F6\u95F4\u6BB5\u8FD8\u6CA1\u6709\u8BB0\u5FC6\u7403 \u2728" });
        if (isLimited) {
          empty.createDiv({
            cls: "mo-activation-banner",
            text: "\u{1F511} \u672A\u6FC0\u6D3B\uFF0C\u4EC5\u5C55\u793A\u4ECA\u5929\u3002\u8BF7\u6FC0\u6D3B\u4EE5\u89E3\u9501\u5168\u90E8\u529F\u80FD\u3002"
          });
        }
        return;
      }
      this.createEmbedPipelines(body, allEntries, tooltipEl);
      if (isLimited) {
        body.createDiv({
          cls: "mo-activation-banner mo-activation-banner-embed",
          text: "\u{1F511} \u672A\u6FC0\u6D3B\uFF0C\u4EC5\u5C55\u793A\u4ECA\u5929\u3002\u8BF7\u5728\u63D2\u4EF6\u8BBE\u7F6E\u4E2D\u6FC0\u6D3B\u3002"
        });
      }
    } catch (e) {
      loading.remove();
      body.createDiv({ cls: "mo-empty", text: "\u5D4C\u5165\u8BB0\u5FC6\u7403\u52A0\u8F7D\u5931\u8D25\u4E86 \u{1F622}" });
    }
  }
};
var MemoryOrbsView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.currentMode = "week";
    this.currentDate = this.getTodayString();
    this._cleanupFns = [];
    this._renderCleanupFns = [];
    this._isActiveLeaf = false;
    this._wasDocumentHidden = false;
    this._parser = null;
    this._rangeCache = /* @__PURE__ */ new Map();
    this._renderVersion = 0;
    this.isUiCollapsed = false;
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_MEMORY_ORBS;
  }
  getDisplayText() {
    return "\u8BB0\u5FC6\u7403";
  }
  getIcon() {
    return "sparkles";
  }
  /** 获取当前活跃的情绪列表 */
  get emotions() {
    return this.plugin.settings.customEmotions;
  }
  get parser() {
    if (!this._parser) {
      this._parser = new DiaryParser(
        this.plugin.app,
        this.plugin.settings.diaryDir,
        this.plugin.settings.moodTagPrefix,
        this.plugin.settings.coreTagKey,
        this.emotions
      );
    }
    return this._parser;
  }
  getEmotionSignature() {
    return this.emotions.map((e) => `${e.key}:${e.color}:${e.label}:${e.character}`).join("|");
  }
  getRangeCacheKey(start, end) {
    return [
      start,
      end,
      this.plugin.settings.diaryDir,
      this.plugin.settings.moodTagPrefix,
      this.getEmotionSignature()
    ].join("::");
  }
  async getCachedMemories(start, end) {
    const key = this.getRangeCacheKey(start, end);
    const cached = this._rangeCache.get(key);
    if (cached) {
      return cached instanceof Promise ? cached : cached;
    }
    const pending = this.parser.getMemories(start, end).then((result) => {
      this._rangeCache.set(key, result);
      return result;
    }).catch((error) => {
      this._rangeCache.delete(key);
      throw error;
    });
    this._rangeCache.set(key, pending);
    return pending;
  }
  getTodayString() {
    const d = /* @__PURE__ */ new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  async onClose() {
    for (const fn of this._renderCleanupFns) fn();
    this._renderCleanupFns = [];
    for (const fn of this._cleanupFns) fn();
    this._cleanupFns = [];
    this._rangeCache.clear();
    this._parser = null;
  }
  getDateRange(mode = this.currentMode) {
    const d = /* @__PURE__ */ new Date(this.currentDate + "T00:00:00");
    let start;
    let end;
    switch (mode) {
      case "day":
        start = new Date(d);
        end = new Date(d);
        break;
      case "week": {
        const day = d.getDay();
        const diff = day === 0 ? 6 : day - 1;
        start = new Date(d);
        start.setDate(d.getDate() - diff);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      }
      case "month": {
        start = new Date(d.getFullYear(), d.getMonth(), 1);
        end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        break;
      }
    }
    const fmt = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { start: fmt(start), end: fmt(end) };
  }
  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("memory-orbs-container");
    await this.render();
    this._isActiveLeaf = true;
    this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => {
      const isActiveNow = !!leaf && leaf.view === this;
      if (isActiveNow && !this._isActiveLeaf) {
        this.resetAllBallPositions();
      }
      this._isActiveLeaf = isActiveNow;
    }));
    const doc = this.containerEl.ownerDocument;
    const win = doc.defaultView;
    if (win) {
      const onVisibilityChange = () => {
        if (doc.hidden) {
          this._wasDocumentHidden = true;
        } else if (this._wasDocumentHidden) {
          this._wasDocumentHidden = false;
          this.resetAllBallPositions();
        }
      };
      doc.addEventListener("visibilitychange", onVisibilityChange);
      this._cleanupFns.push(() => {
        doc.removeEventListener("visibilitychange", onVisibilityChange);
      });
    }
  }
  /** 重置所有管道内球的位置（清除物理偏移 + 清除残留 transition） */
  resetAllBallPositions() {
    const container = this.containerEl.children[1];
    if (!container || !container.hasClass("memory-orbs-container")) {
      return;
    }
    const wrappers = container.querySelectorAll(".mo-pipeline-track .mo-orb-wrapper");
    wrappers.forEach((w) => {
      const wrapper = w;
      const orb = wrapper.querySelector(".mo-orb");
      if (orb) {
        orb.style.transition = "";
      }
      wrapper.style.setProperty("--mx", "0px");
      wrapper.style.setProperty("--my", "0px");
      wrapper.style.transition = "";
    });
    const pipelines = container.querySelectorAll(".mo-pipeline");
    pipelines.forEach((p) => {
      if (p._resetBalls) {
        p._resetBalls();
      }
    });
  }
  async render() {
    const renderVersion = ++this._renderVersion;
    for (const fn of this._renderCleanupFns) fn();
    this._renderCleanupFns = [];
    const container = this.containerEl.children[1];
    const effectiveMode = this.currentMode;
    container.empty();
    container.addClass("memory-orbs-container");
    container.toggleClass("mo-ui-collapsed", this.isUiCollapsed);
    const isLimited = !this.plugin.settings.activated;
    const vt = isLimited ? "classic" : this.plugin.settings.visualTheme;
    container.toggleClass("mo-theme-cosmos", vt === "cosmos");
    container.toggleClass("mo-theme-classic", vt === "classic");
    container.toggleClass("mo-theme-sketch", vt === "sketch");
    container.toggleClass("mo-theme-glass", vt === "glass");
    container.style.fontSize = `${this.plugin.settings.fontSize}px`;
    container.style.setProperty("--mo-pipeline-row-gap", `${this.plugin.settings.pipelineRowGap}px`);
    container.style.setProperty("--mo-day-section-gap", `${this.plugin.settings.daySectionGap}px`);
    container.style.setProperty("--mo-week-section-gap", `${this.plugin.settings.weekSectionGap}px`);
    if (vt === "cosmos" && !isLimited) {
      const starField = container.createDiv({ cls: "mo-star-field" });
      for (let i = 0; i < 8; i++) {
        const star = starField.createDiv({ cls: "mo-star" });
        const left = Math.random() * 95 + "%";
        const top = Math.random() * 95 + "%";
        const size = Math.random() * 1.5 + 0.5 + "px";
        const delay = Math.random() * 3 + "s";
        const duration = Math.random() * 2 + 2 + "s";
        star.style.left = left;
        star.style.top = top;
        star.style.width = size;
        star.style.height = size;
        star.style.animationDelay = delay;
        star.style.animationDuration = duration;
        const colors = [
          "rgba(255, 255, 255, 0.8)",
          "rgba(255, 240, 200, 0.7)",
          "rgba(200, 220, 255, 0.7)",
          "rgba(255, 220, 220, 0.6)"
        ];
        star.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        star.style.boxShadow = `0 0 ${Math.random() * 6 + 3}px currentColor`;
      }
    }
    let toolbar = null;
    let prevBtn = null;
    let nextBtn = null;
    let statsBtn = null;
    if (isLimited) {
      toolbar = container.createDiv({ cls: "mo-toolbar" });
      const limitedNav = toolbar.createDiv({ cls: "mo-nav" });
      limitedNav.createDiv({ cls: "mo-nav-title", text: "\u4ECA\u65E5\u8BB0\u5FC6\u7403" });
      const activateBtn = toolbar.createEl("button", {
        cls: "mo-theme-btn mod-cta",
        text: "\u{1F511} \u6FC0\u6D3B\u4EE5\u89E3\u9501\u5168\u90E8\u529F\u80FD"
      });
      activateBtn.title = "\u6FC0\u6D3B Memory Orbs";
      activateBtn.addEventListener("click", () => {
        new ActivateModal(this.plugin.app, this.plugin).open();
      });
    } else {
      toolbar = container.createDiv({ cls: "mo-toolbar" });
      const nav = toolbar.createDiv({ cls: "mo-nav" });
      prevBtn = nav.createEl("button", { cls: "mo-nav-btn", text: "\u25C0" });
      const titleEl = nav.createDiv({ cls: "mo-nav-title" });
      nextBtn = nav.createEl("button", { cls: "mo-nav-btn", text: "\u25B6" });
      this.updateTitle(titleEl);
      const modeGroup = toolbar.createDiv({ cls: "mo-mode-group" });
      const modes = [
        { key: "day", label: "\u65E5" },
        { key: "week", label: "\u5468" },
        { key: "month", label: "\u6708" }
      ];
      for (const mode of modes) {
        const btn = modeGroup.createEl("button", {
          cls: `mo-mode-btn ${this.currentMode === mode.key ? "active" : ""}`,
          text: mode.label
        });
        btn.addEventListener("click", () => {
          this.currentMode = mode.key;
          this.render();
        });
      }
      const legend = toolbar.createDiv({ cls: "mo-legend" });
      for (const emotion of this.emotions) {
        const dot = legend.createDiv({ cls: "mo-legend-dot" });
        dot.style.backgroundColor = emotion.color;
        dot.style.boxShadow = `0 0 6px ${makeGlow(emotion.color)}`;
        dot.title = `${emotion.character} ${emotion.label}`;
        dot.addEventListener("click", () => {
          this.showEmotionDetail(emotion);
        });
      }
      const themeIcons = { cosmos: "\u{1F30C}", classic: "\u2600\uFE0F", sketch: "\u270F\uFE0F", glass: "\u{1F52E}" };
      const themeLabels = { cosmos: "\u661F\u7A7A", classic: "\u7ECF\u5178", sketch: "\u624B\u7ED8", glass: "\u73BB\u7483" };
      const themeCycle = ["cosmos", "classic", "sketch", "glass"];
      const currentVt = this.plugin.settings.visualTheme;
      const themeBtn = toolbar.createEl("button", {
        cls: "mo-theme-btn",
        text: `${themeIcons[currentVt]} ${themeLabels[currentVt]}`
      });
      themeBtn.title = `\u89C6\u89C9\u4E3B\u9898: ${themeLabels[currentVt]}`;
      themeBtn.addEventListener("click", async () => {
        const idx = themeCycle.indexOf(currentVt);
        const newVt = themeCycle[(idx + 1) % themeCycle.length];
        this.plugin.settings.visualTheme = newVt;
        await this.plugin.saveSettings();
        this.render();
      });
      statsBtn = toolbar.createEl("button", {
        cls: "mo-stats-btn",
        text: "\u{1F4CA} \u7EDF\u8BA1"
      });
      statsBtn.title = "\u67E5\u770B\u60C5\u7EEA\u7EDF\u8BA1";
      const refreshBtn = toolbar.createEl("button", { cls: "mo-theme-btn" });
      refreshBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;
      refreshBtn.title = "\u5237\u65B0\u8BB0\u5FC6\u7403";
      refreshBtn.addEventListener("click", () => {
        this._rangeCache.clear();
        this._parser = null;
        this.render();
      });
      const collapseBtn = toolbar.createEl("button", {
        cls: "mo-collapse-btn",
        text: this.isUiCollapsed ? "\u2922" : "\u2921"
      });
      collapseBtn.title = this.isUiCollapsed ? "\u6062\u590D\u754C\u9762" : "\u6536\u7F29\u754C\u9762";
      collapseBtn.addEventListener("click", () => {
        this.isUiCollapsed = !this.isUiCollapsed;
        this.render();
      });
      prevBtn.addEventListener("click", () => this.navigate(-1));
      nextBtn.addEventListener("click", () => this.navigate(1));
    }
    const orbsContainer = container.createDiv({ cls: "mo-orbs-wrapper" });
    const loading = orbsContainer.createDiv({ cls: "mo-loading", text: "\u6B63\u5728\u63D0\u53D6\u8BB0\u5FC6..." });
    try {
      const { start, end } = isLimited ? { start: this.getTodayString(), end: this.getTodayString() } : this.getDateRange(effectiveMode);
      const dayMemories = await this.getCachedMemories(start, end);
      if (renderVersion !== this._renderVersion) return;
      loading.remove();
      let displayMemories = dayMemories;
      if (isLimited) {
        const today = this.getTodayString();
        displayMemories = dayMemories.filter((d) => d.date === today);
      }
      if (displayMemories.length === 0) {
        const empty = orbsContainer.createDiv({ cls: "mo-empty" });
        empty.createDiv({ text: "\u8FD9\u4E2A\u65F6\u95F4\u6BB5\u8FD8\u6CA1\u6709\u8BB0\u5FC6\u7403\u5462 \u2728" });
        if (isLimited) {
          empty.createDiv({
            cls: "mo-activation-banner",
            text: "\u{1F511} \u672A\u6FC0\u6D3B\uFF0C\u4EC5\u5C55\u793A\u4ECA\u5929\u3002\u8BF7\u6FC0\u6D3B\u4EE5\u89E3\u9501\u5168\u90E8\u529F\u80FD\u3002"
          });
          const activateBtn = empty.createEl("button", {
            text: "\u6FC0\u6D3B Memory Orbs",
            cls: "mod-cta mo-activation-banner-btn"
          });
          activateBtn.addEventListener("click", () => {
            new ActivateModal(this.plugin.app, this.plugin).open();
          });
        }
        return;
      }
      if (isLimited) {
        this.renderByDay(orbsContainer, displayMemories);
      } else if (effectiveMode === "month") {
        this.renderByWeek(orbsContainer, displayMemories);
      } else {
        this.renderByDay(orbsContainer, displayMemories);
      }
      if (isLimited) {
        const banner = orbsContainer.createDiv({ cls: "mo-activation-banner" });
        banner.createSpan({ text: "\u{1F511} \u672A\u6FC0\u6D3B\uFF0C\u4EC5\u5C55\u793A\u4ECA\u5929\u7684\u8BB0\u5FC6\u7403\u3002" });
        const activateBtn = banner.createEl("button", {
          text: "\u6FC0\u6D3B\u4EE5\u89E3\u9501\u5168\u90E8\u529F\u80FD",
          cls: "mod-cta mo-activation-banner-btn"
        });
        activateBtn.addEventListener("click", () => {
          new ActivateModal(this.plugin.app, this.plugin).open();
        });
      }
      if (statsBtn) {
        statsBtn.addEventListener("click", () => {
          this.showStatsPanel(container, dayMemories, statsBtn);
        });
      }
    } catch (e) {
      loading.remove();
      console.error("Memory Orbs: render error", e);
      orbsContainer.createDiv({
        cls: "mo-empty",
        text: "\u52A0\u8F7D\u8BB0\u5FC6\u65F6\u51FA\u9519\u4E86 \u{1F622}"
      });
    }
  }
  createOrb(entry) {
    const color = entry.emotion.color;
    const isBlended = entry.emotions.length > 1;
    const blendColors = isBlended ? entry.emotions.map((e) => e.color) : [color];
    const glow = makeGlow(color);
    const blendGlows = blendColors.map((c) => makeGlow(c));
    const gradient = makeGradient(color);
    const isGlass = this.plugin.settings.visualTheme === "glass";
    const isCosmos = this.plugin.settings.visualTheme === "cosmos";
    const { r, g, b } = hexToRgb(color);
    const orbWrapper = this.containerEl.ownerDocument.createElement("div");
    orbWrapper.addClass("mo-orb-wrapper");
    const orb = orbWrapper.createDiv({
      cls: `mo-orb${entry.isCore ? " mo-orb-core" : ""}${isBlended ? " mo-orb-blended" : ""}`
    });
    if (isBlended) {
      orb.style.setProperty("--roll-deg", "0deg");
      const buildConicStops = (colors) => {
        const n = colors.length;
        const segDeg = 360 / n;
        const halfBlend = Math.max(8, Math.min(15, segDeg * 0.15));
        const stops = [];
        for (let i = 0; i < n; i++) {
          const boundaryDeg = i * segDeg;
          stops.push(`${colors[(i - 1 + n) % n]} ${boundaryDeg}deg`);
          stops.push(`${colors[i]} ${boundaryDeg + halfBlend * 2}deg`);
        }
        return stops.join(", ");
      };
      const conicBg = `conic-gradient(from var(--roll-deg, 0deg), ${buildConicStops(blendColors)})`;
      const sphereHighlight = `radial-gradient(circle at 35% 25%, rgba(255,255,255,0.5) 0%, transparent 45%)`;
      if (isGlass) {
        orb.style.background = `
					radial-gradient(circle at 35% 25%, rgba(255,255,255,0.6) 0%, transparent 28%),
					conic-gradient(from var(--roll-deg, 0deg), ${buildConicStops(blendColors.map((c) => lighten(c, 0.45)))})
				`;
        orb.style.border = `2px solid rgba(${Math.min(r + 80, 255)},${Math.min(g + 80, 255)},${Math.min(b + 80, 255)},0.5)`;
      } else {
        orb.style.background = `${sphereHighlight}, ${conicBg}`;
      }
      if (entry.isCore) {
        orb.style.boxShadow = `
					${blendGlows.map((g2) => `0 0 14px ${g2}`).join(", ")}, 0 0 30px ${blendGlows[0]},
					inset 0 -3px 8px rgba(0,0,0,0.1), inset 0 3px 8px rgba(255,255,255,0.35)
				`;
      } else {
        orb.style.boxShadow = `
					${blendGlows.map((g2) => `0 0 10px ${g2}`).join(", ")}, 0 0 22px ${blendGlows[0]},
					inset 0 -3px 8px rgba(0,0,0,0.12), inset 0 3px 8px rgba(255,255,255,0.3)
				`;
      }
    } else if (isGlass) {
      const h = lighten(color, 0.55);
      const m = color;
      const d = darken(color, 0.2);
      const dd = darken(color, 0.4);
      orb.style.background = `
				radial-gradient(circle at 35% 25%, rgba(255,255,255,0.7) 0%, transparent 28%),
				radial-gradient(circle at 50% 120%, ${h} 0%, ${m} 30%, ${d} 70%, ${dd} 100%)
			`;
      orb.style.border = `2px solid rgba(${Math.min(r + 80, 255)},${Math.min(g + 80, 255)},${Math.min(b + 80, 255)},0.5)`;
      if (entry.isCore) {
        orb.style.boxShadow = `
					0 0 14px rgba(${r},${g},${b},0.35), 0 0 30px rgba(${r},${g},${b},0.12),
					inset 0 0 18px rgba(${r},${g},${b},0.1),
					0 4px 16px rgba(0,0,0,0.08)
				`;
      } else {
        orb.style.boxShadow = `
					0 0 10px rgba(${r},${g},${b},0.3), 0 0 22px rgba(${r},${g},${b},0.1),
					inset 0 0 14px rgba(${r},${g},${b},0.08),
					0 3px 12px rgba(0,0,0,0.06)
				`;
      }
    } else {
      orb.style.background = gradient;
      if (entry.isCore) {
        orb.style.boxShadow = `
					0 0 20px ${glow}, 0 0 45px ${glow}, 0 0 80px ${glow},
					inset 0 -3px 8px rgba(0,0,0,0.1), inset 0 3px 8px rgba(255,255,255,0.4)
				`;
      } else {
        orb.style.boxShadow = `
					0 0 15px ${glow}, 0 0 30px ${glow},
					inset 0 -3px 8px rgba(0,0,0,0.15), inset 0 3px 8px rgba(255,255,255,0.3)
				`;
      }
    }
    orb.createDiv({ cls: "mo-orb-highlight" });
    const innerGlow = orb.createDiv({ cls: "mo-orb-inner-glow" });
    if (isGlass) {
      innerGlow.style.background = `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.08) 25%, transparent 50%)`;
    } else if (isCosmos) {
      innerGlow.style.background = `radial-gradient(circle at 32% 22%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.08) 28%, transparent 50%)`;
      orb.createDiv({ cls: "mo-orb-starburst" });
    } else {
      innerGlow.style.background = `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.7), transparent 50%)`;
    }
    if (entry.isCore) {
      const coreGlow = orb.createDiv({ cls: "mo-orb-core-pulse" });
      coreGlow.style.background = glow;
    }
    orb.style.setProperty("--bounce-dur", `${(2.5 + Math.random() * 2).toFixed(2)}s`);
    orb.style.setProperty("--bounce-delay", `${(Math.random() * 2).toFixed(2)}s`);
    orb.addEventListener("mouseenter", () => {
      const inPipeline = orb.closest(".mo-pipeline-track");
      if (!inPipeline) {
        orb.addClass("mo-orb-hover");
      }
      if (isGlass) {
        if (entry.isCore) {
          orb.style.boxShadow = `
						0 0 20px rgba(${r},${g},${b},0.45), 0 0 50px rgba(${r},${g},${b},0.18),
						inset 0 0 22px rgba(${r},${g},${b},0.15),
						0 6px 24px rgba(0,0,0,0.1)
					`;
        } else {
          orb.style.boxShadow = `
						0 0 16px rgba(${r},${g},${b},0.4), 0 0 38px rgba(${r},${g},${b},0.14),
						inset 0 0 18px rgba(${r},${g},${b},0.12),
						0 5px 18px rgba(0,0,0,0.08)
					`;
        }
      } else {
        if (entry.isCore) {
          orb.style.boxShadow = `
						0 0 35px ${glow}, 0 0 70px ${glow}, 0 0 110px ${glow}, 0 0 150px ${glow},
						inset 0 -3px 8px rgba(0,0,0,0.1), inset 0 3px 8px rgba(255,255,255,0.4)
					`;
        } else {
          orb.style.boxShadow = `
						0 0 25px ${glow}, 0 0 50px ${glow}, 0 0 80px ${glow},
						inset 0 -3px 8px rgba(0,0,0,0.15), inset 0 3px 8px rgba(255,255,255,0.3)
					`;
        }
      }
    });
    orb.addEventListener("mouseleave", () => {
      orb.removeClass("mo-orb-hover");
      if (isGlass) {
        if (entry.isCore) {
          orb.style.boxShadow = `
						0 0 14px rgba(${r},${g},${b},0.35), 0 0 30px rgba(${r},${g},${b},0.12),
						inset 0 0 18px rgba(${r},${g},${b},0.1),
						0 4px 16px rgba(0,0,0,0.08)
					`;
        } else {
          orb.style.boxShadow = `
						0 0 10px rgba(${r},${g},${b},0.3), 0 0 22px rgba(${r},${g},${b},0.1),
						inset 0 0 14px rgba(${r},${g},${b},0.08),
						0 3px 12px rgba(0,0,0,0.06)
					`;
        }
      } else {
        if (entry.isCore) {
          orb.style.boxShadow = `
						0 0 20px ${glow}, 0 0 45px ${glow}, 0 0 80px ${glow},
						inset 0 -3px 8px rgba(0,0,0,0.1), inset 0 3px 8px rgba(255,255,255,0.4)
					`;
        } else {
          orb.style.boxShadow = `
						0 0 15px ${glow}, 0 0 30px ${glow},
						inset 0 -3px 8px rgba(0,0,0,0.15), inset 0 3px 8px rgba(255,255,255,0.3)
					`;
        }
      }
    });
    orb.addEventListener("click", (e) => {
      if (!e.metaKey && !e.ctrlKey) return;
      e.preventDefault();
      e.stopPropagation();
      const file = this.app.vault.getFiles().find((f) => f.name === entry.fileName);
      if (file instanceof import_obsidian.TFile) {
        this.app.workspace.getLeaf(false).openFile(file);
      }
    });
    const label = orbWrapper.createDiv({ cls: "mo-orb-label" });
    label.textContent = entry.text;
    label.style.setProperty("--emotion-color", color);
    const charLabel = orbWrapper.createDiv({ cls: "mo-orb-char" });
    if (isBlended) {
      charLabel.textContent = entry.emotions.map((e) => e.character).join("+");
      label.style.setProperty("--emotion-colors", entry.emotions.map((e) => e.color).join(","));
    } else {
      charLabel.textContent = entry.emotion.character;
    }
    charLabel.style.color = color;
    return orbWrapper;
  }
  renderByDay(container, dayMemories) {
    const weekDays = ["\u65E5", "\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D"];
    for (const day of dayMemories) {
      const daySection = container.createDiv({ cls: "mo-day-section" });
      const dayHeader = daySection.createDiv({ cls: "mo-day-header" });
      const dayDate = /* @__PURE__ */ new Date(day.date + "T00:00:00");
      dayHeader.textContent = `${dayDate.getMonth() + 1}\u6708${dayDate.getDate()}\u65E5 \u5468${weekDays[dayDate.getDay()]}`;
      const estimatedWidth = daySection.clientWidth || 800;
      const maxBallsPerRow = this.calculateMaxBallsPerRow(estimatedWidth);
      if (day.entries.length > maxBallsPerRow) {
        this.createMultiPipelineContainer(day.entries, daySection, false);
      } else {
        const pipeline = daySection.createDiv({ cls: "mo-pipeline" });
        pipeline.createDiv({ cls: "mo-pipeline-floor" });
        const orbsRow = pipeline.createDiv({ cls: "mo-orbs-row mo-pipeline-track" });
        for (const entry of day.entries) {
          orbsRow.appendChild(this.createOrb(entry));
        }
        this.initPipelinePhysics(pipeline, orbsRow);
      }
    }
  }
  renderByWeek(container, dayMemories) {
    const weekGroups = /* @__PURE__ */ new Map();
    for (const day of dayMemories) {
      const d = /* @__PURE__ */ new Date(day.date + "T00:00:00");
      const dayOfWeek = d.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(d);
      monday.setDate(d.getDate() - diff);
      const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
      const group = weekGroups.get(weekKey);
      if (group) {
        group.push(...day.entries);
      } else {
        weekGroups.set(weekKey, [...day.entries]);
      }
    }
    const sortedKeys = [...weekGroups.keys()].sort();
    for (const weekKey of sortedKeys) {
      const weekSection = container.createDiv({ cls: "mo-week-section" });
      const weekHeader = weekSection.createDiv({ cls: "mo-week-header" });
      const monday = /* @__PURE__ */ new Date(weekKey + "T00:00:00");
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      weekHeader.textContent = `${monday.getMonth() + 1}\u6708${monday.getDate()}\u65E5 - ${sunday.getMonth() + 1}\u6708${sunday.getDate()}\u65E5`;
      const weekEntries = weekGroups.get(weekKey);
      const estimatedWidth = weekSection.clientWidth || 800;
      const maxBallsPerRow = this.calculateMaxBallsPerRow(estimatedWidth);
      if (weekEntries.length > maxBallsPerRow) {
        this.createMultiPipelineContainer(weekEntries, weekSection, true);
      } else {
        const pipeline = weekSection.createDiv({ cls: "mo-pipeline" });
        pipeline.createDiv({ cls: "mo-pipeline-floor" });
        const orbsRow = pipeline.createDiv({ cls: "mo-orbs-row mo-week-orbs mo-pipeline-track" });
        for (const entry of weekEntries) {
          orbsRow.appendChild(this.createOrb(entry));
        }
        this.initPipelinePhysics(pipeline, orbsRow);
      }
    }
  }
  /** 管道碰撞物理引擎 — 仅拖拽交互时驱动，不自动运行 */
  initPipelinePhysics(pipeline, track) {
    let disposed = false;
    const pendingTimeouts = [];
    const tryInit = (attempt) => {
      if (disposed) return;
      if (attempt > 10) {
        this._initPipelinePhysicsInner(pipeline, track);
        return;
      }
      const testEl = track.querySelector(".mo-orb");
      if (!testEl || testEl.getBoundingClientRect().width === 0) {
        const tid = window.setTimeout(() => tryInit(attempt + 1), 50);
        pendingTimeouts.push(tid);
        return;
      }
      const fid = requestAnimationFrame(() => {
        if (!disposed) this._initPipelinePhysicsInner(pipeline, track);
      });
      this._renderCleanupFns.push(() => cancelAnimationFrame(fid));
    };
    tryInit(0);
    this._renderCleanupFns.push(() => {
      disposed = true;
      for (const tid of pendingTimeouts) clearTimeout(tid);
    });
  }
  _initPipelinePhysicsInner(pipeline, track) {
    const wrappers = track.querySelectorAll(".mo-orb-wrapper");
    if (wrappers.length === 0) return;
    const pipelineContainer = pipeline.closest(".mo-pipeline-container");
    if (pipelineContainer && pipelineContainer.classList.contains("mo-multi-pipeline")) {
      this._initMultiPipelinePhysics(pipeline, track, wrappers);
      return;
    }
    const balls = [];
    const doc = this.containerEl.ownerDocument;
    const GAP = 4;
    for (let i = 0; i < wrappers.length; i++) {
      const w = wrappers[i];
      const orbEl = w.querySelector(".mo-orb");
      if (!orbEl) continue;
      const rect = orbEl.getBoundingClientRect();
      const radius = rect.width > 0 ? rect.width / 2 : 26;
      const prevBall = balls.length > 0 ? balls[balls.length - 1] : null;
      const restX = prevBall ? prevBall.restX + prevBall.radius * 2 + GAP : GAP;
      balls.push({
        el: w,
        orbEl,
        restX,
        x: 0,
        y: 0,
        // 初始贴底
        vx: 0,
        vy: 0,
        radius,
        mass: Math.PI * radius * radius
        // 质量正比于面积（2D碰撞）
      });
    }
    if (balls.length === 0) return;
    const FRICTION = 0.94;
    const BOUNCE = 0.65;
    const MIN_VX = 0.03;
    const MIN_VY = 0.03;
    const DRAG_FORCE = 0.85;
    const GRAVITY = 0.18;
    const WALL_FRICTION = 0.55;
    const MAX_VX = 25;
    let animFrameId = null;
    let isRunning = false;
    const getGlobalX = (ball) => ball.restX + ball.x;
    const applyPositions = () => {
      for (const ball of balls) {
        ball.el.style.setProperty("--mx", `${ball.x}px`);
        ball.el.style.setProperty("--my", `${-ball.y}px`);
        if (ball.orbEl.classList.contains("mo-orb-blended")) {
          const deg = ball.x / ball.radius * (180 / Math.PI);
          ball.orbEl.style.setProperty("--roll-deg", `${deg}deg`);
        }
      }
    };
    const RESTITUTION = 0.75;
    const resolveCollisions = () => {
      const sortedBalls = [...balls].sort((a, b) => getGlobalX(a) - getGlobalX(b));
      for (let i = 0; i < sortedBalls.length - 1; i++) {
        const a = sortedBalls[i];
        const b = sortedBalls[i + 1];
        const aRight = getGlobalX(a) + a.radius;
        const bLeft = getGlobalX(b) - b.radius;
        const overlap = aRight - bLeft;
        if (overlap <= 0) continue;
        const relVel = a.vx - b.vx;
        if (relVel <= 0.02) {
          const correction = overlap * 0.5;
          a.x -= correction;
          b.x += correction;
          if (Math.abs(relVel) < 0.08) {
            a.vx *= 0.4;
            b.vx *= 0.4;
          }
          continue;
        }
        const e = RESTITUTION;
        const m1 = a.mass;
        const m2 = b.mass;
        const mSum = m1 + m2;
        const v1 = a.vx;
        const v2 = b.vx;
        a.vx = ((m1 - e * m2) * v1 + (1 + e) * m2 * v2) / mSum;
        b.vx = ((m2 - e * m1) * v2 + (1 + e) * m1 * v1) / mSum;
        const totalOverlap = overlap;
        a.x -= totalOverlap * (m2 / mSum);
        b.x += totalOverlap * (m1 / mSum);
      }
    };
    const resolveCeilingFloor = () => {
      const pipelineRect = pipeline.getBoundingClientRect();
      const trackRect = track.getBoundingClientRect();
      const pipelineInnerH = trackRect.height;
      for (const ball of balls) {
        const diameter = ball.radius * 2;
        const maxY = pipelineInnerH - diameter;
        if (ball.y > maxY) {
          ball.y = maxY;
          ball.vy = -Math.abs(ball.vy) * BOUNCE;
        }
        if (ball.y < 0) {
          ball.y = 0;
          ball.vy = Math.abs(ball.vy) * BOUNCE;
          if (Math.abs(ball.vy) < 0.5) ball.vy = 0;
        }
      }
    };
    const resolveWalls = () => {
      const trackWidth = track.clientWidth;
      for (const ball of balls) {
        const globalX = getGlobalX(ball);
        if (globalX < 0) {
          ball.x = -ball.restX;
          ball.vx = Math.abs(ball.vx) * BOUNCE;
          pipeline.addClass("mo-pipeline-track-at-start");
          setTimeout(() => pipeline.removeClass("mo-pipeline-track-at-start"), 200);
        }
        if (globalX + ball.radius * 2 > trackWidth) {
          ball.x = trackWidth - ball.radius * 2 - ball.restX;
          ball.vx = -Math.abs(ball.vx) * BOUNCE;
        }
      }
    };
    const step = () => {
      let anyMoving = false;
      for (const ball of balls) {
        ball.vx *= FRICTION;
        if (Math.abs(ball.vx) < MIN_VX) {
          ball.vx = 0;
        } else {
          ball.vx = Math.max(-MAX_VX, Math.min(MAX_VX, ball.vx));
          anyMoving = true;
        }
        if (ball.y > 0) {
          ball.vy -= GRAVITY;
          ball.vy *= WALL_FRICTION;
        } else {
          ball.vy = 0;
        }
        if (Math.abs(ball.vy) < MIN_VY && ball.y <= 0) {
          ball.vy = 0;
        } else if (Math.abs(ball.vy) >= MIN_VY) {
          anyMoving = true;
        }
        ball.x += ball.vx;
        ball.y += ball.vy;
      }
      resolveCollisions();
      resolveWalls();
      resolveCeilingFloor();
      applyPositions();
      if (anyMoving) {
        animFrameId = requestAnimationFrame(step);
        return;
      }
      isRunning = false;
      animFrameId = null;
      const shouldSpringBack = balls.every(
        (b) => Math.abs(b.x) < 2 && Math.abs(b.y) < 2
      );
      if (shouldSpringBack) {
        springBack();
      }
    };
    const springBack = () => {
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
        isRunning = false;
      }
      for (const ball of balls) {
        if (Math.abs(ball.x) > 0.5 || Math.abs(ball.y) > 0.5) {
          ball.x = 0;
          ball.y = 0;
          ball.vx = 0;
          ball.vy = 0;
          ball.orbEl.style.transition = "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)";
          applyPositions();
          const onEnd = () => {
            ball.orbEl.style.transition = "";
            ball.orbEl.removeEventListener("transitionend", onEnd);
          };
          ball.orbEl.addEventListener("transitionend", onEnd);
          setTimeout(() => {
            ball.orbEl.style.transition = "";
            ball.orbEl.removeEventListener("transitionend", onEnd);
          }, 800);
        }
      }
    };
    pipeline._resetBalls = springBack;
    const startPhysics = () => {
      if (!isRunning) {
        isRunning = true;
        animFrameId = requestAnimationFrame(step);
      }
    };
    const findBallAtX = (clientX, clientY) => {
      const trackRect = track.getBoundingClientRect();
      const trackStyle = getComputedStyle(track);
      const paddingLeft = parseFloat(trackStyle.paddingLeft) || 0;
      const localX = clientX - trackRect.left + track.scrollLeft - paddingLeft;
      const localY = clientY - trackRect.top;
      let closest = null;
      let closestDist = Infinity;
      for (const ball of balls) {
        const centerX = getGlobalX(ball) + ball.radius;
        const ballTopPx = trackRect.height - ball.radius * 2 + ball.y;
        const centerY = ballTopPx + ball.radius;
        const distX = Math.abs(localX - centerX);
        const distY = Math.abs(localY - centerY);
        const dist = Math.sqrt(distX * distX + distY * distY);
        if (dist < ball.radius * 1.2 && dist < closestDist) {
          closest = ball;
          closestDist = dist;
        }
      }
      return closest;
    };
    const isPointerInTrack = (clientX, clientY) => {
      const rect = track.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    };
    let draggedBall = null;
    let hoveredBall = null;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let isDragging = false;
    const updateHoveredBall = (clientX, clientY) => {
      const hoverBall = isPointerInTrack(clientX, clientY) ? findBallAtX(clientX, clientY) : null;
      if (hoverBall !== hoveredBall) {
        if (hoveredBall) hoveredBall.el.removeClass("mo-pipeline-hover");
        hoveredBall = hoverBall;
        if (hoveredBall) hoveredBall.el.addClass("mo-pipeline-hover");
      }
    };
    const onMouseMove = (e) => {
      if (isDragging && (e.buttons & 1) === 0) {
        isDragging = false;
        draggedBall = null;
        track.style.cursor = "";
      }
      if (!isDragging || !draggedBall) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      draggedBall.x += dx * DRAG_FORCE;
      draggedBall.vx = Math.max(-MAX_VX, Math.min(MAX_VX, dx * DRAG_FORCE));
      draggedBall.y -= dy * DRAG_FORCE;
      draggedBall.vy = -dy * DRAG_FORCE;
      startPhysics();
    };
    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        draggedBall = null;
        track.style.cursor = "";
        startPhysics();
      }
    };
    const onTouchStart = (e) => {
      const ball = findBallAtX(e.touches[0].clientX, e.touches[0].clientY);
      if (!ball) return;
      draggedBall = ball;
      isDragging = true;
      lastMouseX = e.touches[0].clientX;
      lastMouseY = e.touches[0].clientY;
    };
    const onTouchMove = (e) => {
      if (!isDragging || !draggedBall) return;
      const dx = e.touches[0].clientX - lastMouseX;
      const dy = e.touches[0].clientY - lastMouseY;
      lastMouseX = e.touches[0].clientX;
      lastMouseY = e.touches[0].clientY;
      draggedBall.x += dx * DRAG_FORCE;
      draggedBall.vx = Math.max(-MAX_VX, Math.min(MAX_VX, dx * DRAG_FORCE));
      draggedBall.y -= dy * DRAG_FORCE;
      draggedBall.vy = -dy * DRAG_FORCE;
      startPhysics();
    };
    const onTouchEnd = () => {
      if (isDragging) {
        isDragging = false;
        draggedBall = null;
        startPhysics();
      }
    };
    track.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      const ball = findBallAtX(e.clientX, e.clientY);
      if (!ball) return;
      e.preventDefault();
      draggedBall = ball;
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      track.style.cursor = "grabbing";
    });
    doc.addEventListener("mousemove", onMouseMove);
    doc.addEventListener("mouseup", onMouseUp);
    track.addEventListener("touchstart", onTouchStart, { passive: true });
    track.addEventListener("touchmove", onTouchMove, { passive: true });
    track.addEventListener("touchend", onTouchEnd, { passive: true });
    applyPositions();
    const tooltipEl = doc.createElement("div");
    tooltipEl.className = "mo-pipeline-tooltip";
    doc.body.appendChild(tooltipEl);
    let tooltipTimer = null;
    const showTooltip = (wrapper) => {
      const orb = wrapper.querySelector(".mo-orb");
      const label = wrapper.querySelector(".mo-orb-label");
      if (!orb || !label) return;
      const emotionColor = label.style.getPropertyValue("--emotion-color") || "#888888";
      const emotionColors = label.style.getPropertyValue("--emotion-colors") || "";
      const text = label.textContent || "";
      if (!text) return;
      const rgb = hexToRgb(emotionColor);
      const luminance = (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) / 255;
      const isLight = luminance > 0.55;
      tooltipEl.textContent = text;
      if (emotionColors) {
        const colors = emotionColors.split(",");
        const stops = colors.map((c, i) => {
          const pct = Math.round(i / (colors.length - 1) * 100);
          const { r: cr, g: cg, b: cb } = hexToRgb(c);
          return `rgba(${cr},${cg},${cb},0.82) ${pct}%`;
        }).join(", ");
        tooltipEl.style.background = `linear-gradient(90deg, ${stops})`;
      } else {
        tooltipEl.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.82)`;
      }
      tooltipEl.style.color = isLight ? "rgba(0,0,0,0.75)" : "#fff";
      tooltipEl.style.textShadow = isLight ? "none" : "0 1px 3px rgba(0,0,0,0.3)";
      const rect = orb.getBoundingClientRect();
      tooltipEl.style.left = `${rect.left + rect.width / 2}px`;
      tooltipEl.style.top = `${rect.top - 8}px`;
      tooltipEl.style.transform = "translate(-50%, -100%)";
      requestAnimationFrame(() => {
        tooltipEl.classList.add("mo-tooltip-visible");
      });
    };
    const hideTooltip = () => {
      tooltipEl.classList.remove("mo-tooltip-visible");
    };
    const onMouseLeaveTrack = () => {
      if (hoveredBall) {
        hoveredBall.el.removeClass("mo-pipeline-hover");
        hoveredBall = null;
      }
      if (tooltipTimer) clearTimeout(tooltipTimer);
      tooltipTimer = null;
      hideTooltip();
    };
    const onTrackMouseMoveTooltip = (e) => {
      updateHoveredBall(e.clientX, e.clientY);
      if (tooltipTimer) clearTimeout(tooltipTimer);
      const hoverBall = findBallAtX(e.clientX, e.clientY);
      if (hoverBall) {
        tooltipTimer = setTimeout(() => showTooltip(hoverBall.el), 120);
      } else {
        hideTooltip();
      }
    };
    track.addEventListener("mouseleave", onMouseLeaveTrack);
    track.addEventListener("mousemove", onTrackMouseMoveTooltip);
    const observer = new MutationObserver(() => {
      if (!doc.body.contains(track)) {
        if (animFrameId !== null) cancelAnimationFrame(animFrameId);
        tooltipEl.remove();
        observer.disconnect();
      }
    });
    observer.observe(doc.body, { childList: true, subtree: true });
    this._renderCleanupFns.push(() => {
      if (animFrameId !== null) cancelAnimationFrame(animFrameId);
      doc.removeEventListener("mousemove", onMouseMove);
      doc.removeEventListener("mouseup", onMouseUp);
      track.removeEventListener("mouseleave", onMouseLeaveTrack);
      track.removeEventListener("mousemove", onTrackMouseMoveTooltip);
      tooltipEl.remove();
      observer.disconnect();
    });
  }
  /** 显示浮动统计窗口 */
  showStatsPanel(container, dayMemories, anchor) {
    const existing = container.querySelector(".mo-stats-panel");
    if (existing) {
      existing.remove();
      return;
    }
    const doc = this.containerEl.ownerDocument;
    const emotionStats = /* @__PURE__ */ new Map();
    let totalOrbs = 0;
    let totalCore = 0;
    const dayCount = dayMemories.length;
    const emotionByDay = /* @__PURE__ */ new Map();
    for (const day of dayMemories) {
      const dayMap = /* @__PURE__ */ new Map();
      for (const entry of day.entries) {
        totalOrbs++;
        for (const em of entry.emotions) {
          const stat = emotionStats.get(em.key);
          if (stat) {
            stat.total++;
            if (entry.isCore) stat.core++;
          } else {
            emotionStats.set(em.key, { emotion: em, total: 1, core: entry.isCore ? 1 : 0 });
          }
          dayMap.set(em.key, (dayMap.get(em.key) || 0) + 1);
        }
        if (entry.isCore) totalCore++;
      }
      emotionByDay.set(day.date, dayMap);
    }
    if (totalOrbs === 0) return;
    const totalNormal = totalOrbs - totalCore;
    const avgPerDay = (totalOrbs / dayCount).toFixed(1);
    const sorted = [...emotionStats.values()].sort((a, b) => b.total - a.total);
    const topEmotion = sorted[0];
    const leastEmotion = sorted[sorted.length - 1];
    let richestDay = dayMemories[0].date;
    let richestCount = 0;
    for (const day of dayMemories) {
      const count = emotionByDay.get(day.date)?.size || 0;
      if (count > richestCount) {
        richestCount = count;
        richestDay = day.date;
      }
    }
    const panel = container.createDiv({ cls: "mo-stats-panel" });
    const closeBtn = panel.createEl("button", { cls: "mo-stats-close", text: "\u2715" });
    closeBtn.addEventListener("click", () => panel.remove());
    const outsideClick = (e) => {
      if (!panel.contains(e.target) && !anchor.contains(e.target)) {
        panel.remove();
        doc.removeEventListener("click", outsideClick);
      }
    };
    setTimeout(() => doc.addEventListener("click", outsideClick), 0);
    const overview = panel.createDiv({ cls: "mo-stats-section" });
    overview.createDiv({ cls: "mo-stats-section-title", text: "\u{1F4CB} \u6982\u89C8" });
    const grid = overview.createDiv({ cls: "mo-stats-grid" });
    const gridItems = [
      { label: "\u603B\u8BB0\u5FC6", value: `${totalOrbs}`, color: "" },
      { label: "\u6838\u5FC3\u8BB0\u5FC6", value: `${totalCore}`, color: "#ffd700" },
      { label: "\u666E\u901A\u8BB0\u5FC6", value: `${totalNormal}`, color: "" },
      { label: "\u7EDF\u8BA1\u5929\u6570", value: `${dayCount}`, color: "" },
      { label: "\u65E5\u5747\u8BB0\u5FC6", value: avgPerDay, color: "" },
      { label: "\u60C5\u7EEA\u79CD\u7C7B", value: `${emotionStats.size}`, color: "" }
    ];
    for (const item of gridItems) {
      const card = grid.createDiv({ cls: "mo-stats-card" });
      const val = card.createDiv({ cls: "mo-stats-card-value" });
      val.textContent = item.value;
      if (item.color) val.style.color = item.color;
      card.createDiv({ cls: "mo-stats-card-label", text: item.label });
    }
    const ranking = panel.createDiv({ cls: "mo-stats-section" });
    ranking.createDiv({ cls: "mo-stats-section-title", text: "\u{1F3C6} \u60C5\u7EEA\u6392\u884C" });
    const bars = ranking.createDiv({ cls: "mo-stats-bars" });
    const isCoreMode = totalCore > 0;
    const maxVal = sorted[0].total;
    for (const item of sorted) {
      const value = item.total;
      const pct = Math.round(value / totalOrbs * 100);
      const barWidth = Math.max(Math.round(value / maxVal * 100), 8);
      const color = item.emotion.color;
      const glow = makeGlow(color);
      const barRow = bars.createDiv({ cls: "mo-stats-bar-row" });
      const rank = bars.querySelectorAll(".mo-stats-bar-row").length;
      const barLabel = barRow.createDiv({ cls: "mo-stats-bar-label" });
      barLabel.textContent = `${rank}. ${item.emotion.character}`;
      barLabel.style.color = color;
      const barTrack = barRow.createDiv({ cls: "mo-stats-bar-track" });
      if (isCoreMode && item.total > item.core) {
        const coreWidth = Math.round(item.core / item.total * barWidth);
        const normalFill = barTrack.createDiv({ cls: "mo-stats-bar-fill" });
        normalFill.style.width = `${barWidth - coreWidth}%`;
        normalFill.style.backgroundColor = color;
        normalFill.style.opacity = "0.4";
        const coreFill = barTrack.createDiv({ cls: "mo-stats-bar-fill mo-stats-bar-core" });
        coreFill.style.width = `${coreWidth}%`;
        coreFill.style.backgroundColor = color;
        coreFill.style.boxShadow = `0 0 8px ${glow}`;
      } else {
        const fill = barTrack.createDiv({ cls: `mo-stats-bar-fill${item.core > 0 ? " mo-stats-bar-core" : ""}` });
        fill.style.width = `${barWidth}%`;
        fill.style.backgroundColor = color;
        fill.style.boxShadow = `0 0 8px ${glow}`;
      }
      const barCount = barRow.createDiv({ cls: "mo-stats-bar-count" });
      if (isCoreMode && item.core > 0 && item.total > item.core) {
        barCount.innerHTML = `<span class="mo-stats-core-num">${item.core}</span>/${item.total}`;
      } else {
        barCount.textContent = `${value}`;
      }
      barRow.createDiv({ cls: "mo-stats-bar-pct", text: `${pct}%` });
    }
    if (totalCore > 0) {
      const coreSection = panel.createDiv({ cls: "mo-stats-section" });
      coreSection.createDiv({ cls: "mo-stats-section-title", text: "\u2728 \u6838\u5FC3\u8BB0\u5FC6\u5206\u5E03" });
      const coreSorted = [...emotionStats.values()].filter((s) => s.core > 0).sort((a, b) => b.core - a.core);
      const totalCoreEmotions = coreSorted.reduce((sum, s) => sum + s.core, 0);
      const coreBars = coreSection.createDiv({ cls: "mo-stats-bars" });
      const coreMax = coreSorted[0].core;
      const pieCanvas = coreSection.createEl("canvas", { cls: "mo-stats-pie" });
      pieCanvas.width = 160;
      pieCanvas.height = 160;
      const ctx = pieCanvas.getContext("2d");
      const cx = 80, cy = 80, r = 65;
      let startAngle = -Math.PI / 2;
      for (const item of coreSorted) {
        const slice = item.core / totalCoreEmotions * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startAngle, startAngle + slice);
        ctx.closePath();
        ctx.fillStyle = item.emotion.color;
        ctx.fill();
        startAngle += slice;
      }
      ctx.beginPath();
      ctx.arc(cx, cy, 38, 0, Math.PI * 2);
      ctx.fillStyle = getComputedStyle(panel).backgroundColor || "transparent";
      ctx.fill();
      ctx.fillStyle = getComputedStyle(panel).color;
      ctx.font = 'bold 22px "SmileySans", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${totalCore}`, cx, cy - 6);
      ctx.font = '10px "SmileySans", sans-serif';
      ctx.fillText("\u6838\u5FC3", cx, cy + 12);
      const pieLegend = coreSection.createDiv({ cls: "mo-stats-pie-legend" });
      for (const item of coreSorted) {
        const row = pieLegend.createDiv({ cls: "mo-stats-pie-legend-row" });
        const dot = row.createDiv({ cls: "mo-stats-pie-dot" });
        dot.style.backgroundColor = item.emotion.color;
        row.createDiv({ cls: "mo-stats-pie-label", text: item.emotion.character });
        row.createDiv({ cls: "mo-stats-pie-val", text: `${item.core}` });
      }
    }
    const fun = panel.createDiv({ cls: "mo-stats-section" });
    fun.createDiv({ cls: "mo-stats-section-title", text: "\u{1F3AF} \u8DA3\u5473\u53D1\u73B0" });
    const funList = fun.createDiv({ cls: "mo-stats-fun" });
    const funItems = [
      { text: `\u6700\u591A\u60C5\u7EEA\uFF1A${topEmotion.emotion.character}\uFF08${topEmotion.total}\u6B21\uFF09`, color: topEmotion.emotion.color },
      { text: `\u6700\u5C11\u60C5\u7EEA\uFF1A${leastEmotion.emotion.character}\uFF08${leastEmotion.total}\u6B21\uFF09`, color: leastEmotion.emotion.color },
      { text: `\u60C5\u7EEA\u6700\u4E30\u5BCC\u7684\u4E00\u5929\uFF1A${richestDay}\uFF08${richestCount}\u79CD\u60C5\u7EEA\uFF09`, color: "" }
    ];
    if (topEmotion.emotion.key === leastEmotion.emotion.key) {
      funItems.shift();
    }
    for (const item of funItems) {
      const row = funList.createDiv({ cls: "mo-stats-fun-item" });
      row.innerHTML = item.text;
      if (item.color) {
        row.style.borderLeftColor = item.color;
      }
    }
  }
  showEmotionDetail(emotion) {
    const modal = new EmotionDetailModal(this.app, emotion, this.parser);
    modal.open();
  }
  updateTitle(el) {
    const d = /* @__PURE__ */ new Date(this.currentDate + "T00:00:00");
    switch (this.currentMode) {
      case "day":
        el.textContent = `${d.getFullYear()}\u5E74${d.getMonth() + 1}\u6708${d.getDate()}\u65E5`;
        break;
      case "week": {
        const day = d.getDay();
        const diff = day === 0 ? 6 : day - 1;
        const start = new Date(d);
        start.setDate(d.getDate() - diff);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        el.textContent = `${start.getMonth() + 1}\u6708${start.getDate()}\u65E5 - ${end.getMonth() + 1}\u6708${end.getDate()}\u65E5`;
        break;
      }
      case "month":
        el.textContent = `${d.getFullYear()}\u5E74${d.getMonth() + 1}\u6708`;
        break;
    }
  }
  navigate(direction) {
    const d = /* @__PURE__ */ new Date(this.currentDate + "T00:00:00");
    switch (this.currentMode) {
      case "day":
        d.setDate(d.getDate() + direction);
        break;
      case "week":
        d.setDate(d.getDate() + direction * 7);
        break;
      case "month":
        d.setMonth(d.getMonth() + direction);
        break;
    }
    this.currentDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    this.render();
  }
  // =============================
  // 多排管道辅助函数
  // =============================
  /**
   * 计算每排能容纳的最大球数
   * 基于管道宽度、球体直径和间隙
   */
  calculateMaxBallsPerRow(pipelineWidth) {
    const BALL_DIAMETER = 52;
    const GAP = this.plugin.settings.orbGap || 4;
    const PADDING = 24;
    const availableWidth = pipelineWidth - PADDING * 2;
    const ballWithGap = BALL_DIAMETER + GAP;
    const maxBalls = Math.floor(availableWidth / ballWithGap);
    return Math.max(1, maxBalls);
  }
  /**
   * 创建多排管道容器
   * @param entries 记忆条目数组
   * @param parentContainer 父容器（daySection 或 weekSection）
   * @param isWeek 是否为周视图
   * @returns 多排管道容器元素
   */
  createMultiPipelineContainer(entries, parentContainer, isWeek = false) {
    const multiPipelineContainer = parentContainer.createDiv({
      cls: "mo-multi-pipeline mo-pipeline-container"
    });
    const estimatedWidth = parentContainer.clientWidth || 800;
    const maxBallsPerRow = this.calculateMaxBallsPerRow(estimatedWidth);
    const requiredRows = Math.ceil(entries.length / maxBallsPerRow);
    multiPipelineContainer.dataset.totalRows = requiredRows.toString();
    for (let rowIndex = 0; rowIndex < requiredRows; rowIndex++) {
      const startIdx = rowIndex * maxBallsPerRow;
      const endIdx = Math.min(startIdx + maxBallsPerRow, entries.length);
      const rowEntries = entries.slice(startIdx, endIdx);
      const rowContainer = multiPipelineContainer.createDiv({
        cls: "mo-pipeline-row"
      });
      rowContainer.dataset.rowIndex = rowIndex.toString();
      if (rowIndex === 0) {
        rowContainer.addClass("mo-pipeline-row-top");
      } else if (rowIndex === requiredRows - 1) {
        rowContainer.addClass("mo-pipeline-row-bottom");
      } else {
        rowContainer.addClass("mo-pipeline-row-middle");
      }
      const pipeline = rowContainer.createDiv({ cls: "mo-pipeline" });
      pipeline.createDiv({ cls: "mo-pipeline-floor" });
      const orbsRow = pipeline.createDiv({ cls: "mo-orbs-row mo-pipeline-track" });
      for (const entry of rowEntries) {
        orbsRow.appendChild(this.createOrb(entry));
      }
      this.initPipelinePhysics(pipeline, orbsRow);
    }
    return multiPipelineContainer;
  }
  // =============================
  // 多排管道物理引擎
  // =============================
  _initMultiPipelinePhysics(pipeline, track, wrappers) {
    const pipelineContainer = pipeline.closest(".mo-pipeline-container");
    const rowIndex = parseInt(pipelineContainer?.dataset.rowIndex || "0");
    const totalRows = parseInt(pipelineContainer?.dataset.totalRows || "1");
    const balls = [];
    const doc = this.containerEl.ownerDocument;
    const GAP = 4;
    for (let i = 0; i < wrappers.length; i++) {
      const w = wrappers[i];
      const orbEl = w.querySelector(".mo-orb");
      if (!orbEl) continue;
      const rect = orbEl.getBoundingClientRect();
      const radius = rect.width > 0 ? rect.width / 2 : 26;
      const prevBall = balls.length > 0 ? balls[balls.length - 1] : null;
      const restX = prevBall ? prevBall.restX + prevBall.radius * 2 + GAP : GAP;
      balls.push({
        el: w,
        orbEl,
        restX,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius,
        mass: Math.PI * radius * radius,
        centerX: 0,
        centerY: 0
      });
    }
    if (balls.length === 0) return;
    const GRAVITY = 0.1;
    const AIR_RESISTANCE = 0.99;
    const FRICTION = 0.98;
    const BOUNCE = 0.8;
    const STOP_THRESHOLD = 0.01;
    const COLLISION_SLOP = 0.5;
    const getGlobalX = (ball) => ball.restX + ball.x;
    const applyPositions = () => {
      const trackRect = track.getBoundingClientRect();
      const trackStyle = getComputedStyle(track);
      const paddingLeft = parseFloat(trackStyle.paddingLeft) || 0;
      for (const ball of balls) {
        ball.el.style.setProperty("--mx", `${ball.x}px`);
        ball.el.style.setProperty("--my", `${-ball.y}px`);
        if (ball.orbEl.classList.contains("mo-orb-blended")) {
          const deg = ball.x / ball.radius * (180 / Math.PI);
          ball.orbEl.style.setProperty("--roll-deg", `${deg}deg`);
        }
        ball.centerX = trackRect.left + paddingLeft + getGlobalX(ball) + ball.radius;
        ball.centerY = trackRect.bottom - ball.radius - ball.y;
      }
    };
    let isRunning = false;
    let animFrameId = null;
    const hasLeftCollision = (row, total) => {
      if (total === 1) return true;
      return row === 0;
    };
    const hasRightCollision = (row, total) => {
      if (total === 1) return true;
      return row === total - 1;
    };
    const step = () => {
      if (!isRunning) return;
      const trackWidth = track.clientWidth;
      const trackHeight = track.clientHeight;
      let anyMoving = false;
      for (const ball of balls) {
        ball.vx *= AIR_RESISTANCE;
        if (Math.abs(ball.vx) < STOP_THRESHOLD) {
          ball.vx = 0;
        } else {
          anyMoving = true;
        }
        if (ball.y > 0 || Math.abs(ball.vy) >= STOP_THRESHOLD) {
          ball.vy -= GRAVITY;
          ball.vy *= AIR_RESISTANCE;
          anyMoving = true;
        } else {
          ball.vy = 0;
        }
        ball.x += ball.vx;
        ball.y += ball.vy;
        if (ball.y > trackHeight - ball.radius * 2) {
          ball.y = trackHeight - ball.radius * 2;
          ball.vy = -Math.abs(ball.vy) * BOUNCE;
          ball.vx *= FRICTION;
        }
        if (ball.y < 0) {
          ball.y = 0;
          ball.vy = Math.abs(ball.vy) > 0.35 ? Math.abs(ball.vy) * BOUNCE : 0;
        }
        const globalX = getGlobalX(ball);
        if (globalX < 0) {
          if (hasLeftCollision(rowIndex, totalRows)) {
            ball.x = -ball.restX;
            ball.vx = Math.abs(ball.vx) * BOUNCE;
            pipeline.addClass("mo-pipeline-track-at-start");
            setTimeout(() => pipeline.removeClass("mo-pipeline-track-at-start"), 200);
          } else {
            ball.x = -ball.restX;
            ball.vx = Math.abs(ball.vx) * BOUNCE;
          }
        }
        if (globalX + ball.radius * 2 > trackWidth) {
          if (hasRightCollision(rowIndex, totalRows)) {
            ball.x = trackWidth - ball.radius * 2 - ball.restX;
            ball.vx = -Math.abs(ball.vx) * BOUNCE;
          } else {
            ball.x = trackWidth - ball.radius * 2 - ball.restX;
            ball.vx = -Math.abs(ball.vx) * BOUNCE;
          }
        }
        if (Math.abs(ball.vx) < STOP_THRESHOLD && Math.abs(ball.vy) < STOP_THRESHOLD && ball.y <= 0) {
          ball.vx = 0;
          ball.vy = 0;
        }
      }
      const sortedBalls = [...balls].sort((a, b) => getGlobalX(a) - getGlobalX(b));
      for (let i = 0; i < sortedBalls.length - 1; i++) {
        const a = sortedBalls[i];
        const b = sortedBalls[i + 1];
        const aRight = getGlobalX(a) + a.radius;
        const bLeft = getGlobalX(b) - b.radius;
        const overlap = aRight - bLeft;
        if (overlap > COLLISION_SLOP) {
          const relVel = a.vx - b.vx;
          const correction = (overlap - COLLISION_SLOP) * 0.5;
          a.x -= correction;
          b.x += correction;
          if (relVel > 0.02) {
            const e = 0.55;
            const m1 = a.mass;
            const m2 = b.mass;
            const mSum = m1 + m2;
            const v1 = a.vx;
            const v2 = b.vx;
            a.vx = ((m1 - e * m2) * v1 + (1 + e) * m2 * v2) / mSum;
            b.vx = ((m2 - e * m1) * v2 + (1 + e) * m1 * v1) / mSum;
            anyMoving = true;
          } else if (Math.abs(relVel) < 0.08) {
            a.vx *= 0.4;
            b.vx *= 0.4;
          }
        }
      }
      applyPositions();
      if (anyMoving) {
        animFrameId = requestAnimationFrame(step);
      } else {
        isRunning = false;
        animFrameId = null;
      }
    };
    pipeline._resetBalls = () => {
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      isRunning = false;
      for (const ball of balls) {
        ball.x = 0;
        ball.y = 0;
        ball.vx = 0;
        ball.vy = 0;
        ball.el.style.setProperty("--mx", "0px");
        ball.el.style.setProperty("--my", "0px");
        if (ball.orbEl.classList.contains("mo-orb-blended")) {
          ball.orbEl.style.setProperty("--roll-deg", "0deg");
        }
      }
    };
    const startPhysics = () => {
      if (!isRunning) {
        isRunning = true;
        animFrameId = requestAnimationFrame(step);
      }
    };
    const findBallAtPoint = (clientX, clientY) => {
      let closest = null;
      let closestDist = Infinity;
      for (const ball of balls) {
        const distX = clientX - ball.centerX;
        const distY = clientY - ball.centerY;
        const dist = Math.sqrt(distX * distX + distY * distY);
        if (dist <= ball.radius * 1.2 && dist < closestDist) {
          closest = ball;
          closestDist = dist;
        }
      }
      return closest;
    };
    const isPointerInTrack = (clientX, clientY) => {
      const rect = track.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    };
    let draggedBall = null;
    let hoveredBall = null;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let isDragging = false;
    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      const ball = findBallAtPoint(e.clientX, e.clientY);
      if (!ball) return;
      draggedBall = ball;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      isDragging = true;
      e.preventDefault();
    };
    const onMouseMove = (e) => {
      if (isDragging && (e.buttons & 1) === 0) {
        isDragging = false;
        draggedBall = null;
      }
      if (!isDragging || !draggedBall) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      const maxY = track.clientHeight - draggedBall.radius * 2;
      draggedBall.x += dx * 0.5;
      draggedBall.y = Math.max(0, Math.min(maxY, draggedBall.y - dy * 0.5));
      draggedBall.vx = dx * 0.5;
      draggedBall.vy = -dy * 0.5;
      startPhysics();
    };
    const onMouseUp = () => {
      isDragging = false;
      draggedBall = null;
      startPhysics();
    };
    const onMouseLeaveTrack = () => {
      if (hoveredBall) {
        hoveredBall.el.removeClass("mo-pipeline-hover");
        hoveredBall = null;
      }
      if (tooltipTimer) clearTimeout(tooltipTimer);
      tooltipTimer = null;
      hideTooltip();
    };
    const tooltipEl = doc.createElement("div");
    tooltipEl.className = "mo-pipeline-tooltip";
    doc.body.appendChild(tooltipEl);
    let tooltipTimer = null;
    const showTooltip = (wrapper) => {
      const orb = wrapper.querySelector(".mo-orb");
      const label = wrapper.querySelector(".mo-orb-label");
      if (!orb || !label) return;
      const emotionColor = label.style.getPropertyValue("--emotion-color") || "#888888";
      const emotionColors = label.style.getPropertyValue("--emotion-colors") || "";
      const text = label.textContent || "";
      if (!text) return;
      const rgb = hexToRgb(emotionColor);
      const luminance = (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) / 255;
      const isLight = luminance > 0.55;
      tooltipEl.textContent = text;
      if (emotionColors) {
        const colors = emotionColors.split(",");
        const stops = colors.map((c, i) => {
          const pct = Math.round(i / (colors.length - 1) * 100);
          const { r: cr, g: cg, b: cb } = hexToRgb(c);
          return `rgba(${cr},${cg},${cb},0.82) ${pct}%`;
        }).join(", ");
        tooltipEl.style.background = `linear-gradient(90deg, ${stops})`;
      } else {
        tooltipEl.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.82)`;
      }
      tooltipEl.style.color = isLight ? "rgba(0,0,0,0.75)" : "#fff";
      tooltipEl.style.textShadow = isLight ? "none" : "0 1px 3px rgba(0,0,0,0.3)";
      const rect = orb.getBoundingClientRect();
      tooltipEl.style.left = `${rect.left + rect.width / 2}px`;
      tooltipEl.style.top = `${rect.top - 8}px`;
      tooltipEl.style.transform = "translate(-50%, -100%)";
      requestAnimationFrame(() => {
        tooltipEl.classList.add("mo-tooltip-visible");
      });
    };
    const hideTooltip = () => {
      tooltipEl.classList.remove("mo-tooltip-visible");
    };
    const updateHoveredBall = (clientX, clientY) => {
      const hoverBall = isPointerInTrack(clientX, clientY) ? findBallAtPoint(clientX, clientY) : null;
      if (hoverBall !== hoveredBall) {
        if (hoveredBall) hoveredBall.el.removeClass("mo-pipeline-hover");
        hoveredBall = hoverBall;
        if (hoveredBall) hoveredBall.el.addClass("mo-pipeline-hover");
      }
    };
    const onTrackMouseMoveTooltip = (e) => {
      updateHoveredBall(e.clientX, e.clientY);
      if (tooltipTimer) clearTimeout(tooltipTimer);
      const hoverBall = findBallAtPoint(e.clientX, e.clientY);
      if (hoverBall) {
        tooltipTimer = setTimeout(() => showTooltip(hoverBall.el), 120);
      } else {
        hideTooltip();
      }
    };
    track.addEventListener("mousedown", onMouseDown);
    track.addEventListener("mouseleave", onMouseLeaveTrack);
    track.addEventListener("mousemove", onTrackMouseMoveTooltip);
    doc.addEventListener("mousemove", onMouseMove);
    doc.addEventListener("mouseup", onMouseUp);
    const observer = new MutationObserver(() => {
      if (!doc.body.contains(track)) {
        if (animFrameId !== null) cancelAnimationFrame(animFrameId);
        tooltipEl.remove();
        observer.disconnect();
      }
    });
    observer.observe(doc.body, { childList: true, subtree: true });
    this._renderCleanupFns.push(() => {
      if (animFrameId !== null) cancelAnimationFrame(animFrameId);
      track.removeEventListener("mousedown", onMouseDown);
      track.removeEventListener("mouseleave", onMouseLeaveTrack);
      track.removeEventListener("mousemove", onTrackMouseMoveTooltip);
      doc.removeEventListener("mousemove", onMouseMove);
      doc.removeEventListener("mouseup", onMouseUp);
      tooltipEl.remove();
      observer.disconnect();
    });
    applyPositions();
  }
};
var EmotionDetailModal = class extends import_obsidian.Modal {
  constructor(app, emotion, parser) {
    super(app);
    this.emotion = emotion;
    this.parser = parser;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("mo-modal");
    contentEl.innerHTML = `
			<div class="mo-modal-header" style="color: ${this.emotion.color}; text-shadow: 0 0 10px ${makeGlow(this.emotion.color)}">
				${this.emotion.character} \xB7 ${this.emotion.label}
			</div>
			<div class="mo-modal-loading">\u52A0\u8F7D\u4E2D...</div>
		`;
    this.loadRecentMemories();
  }
  async loadRecentMemories() {
    const { contentEl } = this;
    const today = /* @__PURE__ */ new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dayMemories = await this.parser.getMemories(fmt(thirtyDaysAgo), fmt(today));
    const filtered = [];
    for (const day of dayMemories) {
      for (const entry of day.entries) {
        if (entry.emotions.some((em) => em.key.toLowerCase() === this.emotion.key.toLowerCase())) {
          filtered.push(entry);
        }
      }
    }
    const loading = contentEl.querySelector(".mo-modal-loading");
    if (loading) loading.remove();
    const listEl = contentEl.createDiv({ cls: "mo-modal-list" });
    if (filtered.length === 0) {
      listEl.createDiv({ cls: "mo-modal-empty", text: "\u6700\u8FD1 30 \u5929\u6CA1\u6709\u8FD9\u4E2A\u60C5\u7EEA\u7684\u8BB0\u5FC6" });
      return;
    }
    for (const entry of filtered.reverse()) {
      const item = listEl.createDiv({ cls: "mo-modal-item" });
      const dot = item.createDiv({ cls: "mo-modal-dot" });
      dot.style.backgroundColor = this.emotion.color;
      dot.style.boxShadow = `0 0 6px ${makeGlow(this.emotion.color)}`;
      const info = item.createDiv({ cls: "mo-modal-info" });
      info.createDiv({ cls: "mo-modal-date", text: entry.date });
      info.createDiv({ cls: "mo-modal-text", text: entry.text });
      item.addEventListener("click", () => {
        const file = this.app.vault.getFiles().find((f) => f.name === entry.fileName);
        if (file instanceof import_obsidian.TFile) {
          this.close();
          this.app.workspace.getLeaf(false).openFile(file);
        }
      });
    }
  }
};
var DEFAULT_SETTINGS = {
  diaryDir: "01. Daily/Day",
  moodTagPrefix: "#Note/life/mood/",
  coreTagKey: "core",
  orbGap: 3,
  pipelineRowGap: 9,
  daySectionGap: 12,
  weekSectionGap: 0,
  fontSize: 16,
  visualTheme: "classic",
  customEmotions: [...DEFAULT_EMOTIONS],
  activated: false,
  activatedEmail: "",
  activationCode: "",
  lastVerifiedAt: 0,
  verifyFailCount: 0
};
var WORKER_BASE = "https://memory-orbs-activation.531442151.workers.dev";
var ACTIVATION_WORKER_URL = WORKER_BASE + "/activate";
var VERIFY_WORKER_URL = WORKER_BASE + "/verify";
var VERIFY_INTERVAL = 24 * 60 * 60 * 1e3;
var MAX_VERIFY_FAILS = 3;
async function requestActivation(email, code) {
  try {
    const resp = await fetch(ACTIVATION_WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code })
    });
    const data = await resp.json();
    if (data.valid) {
      return { success: true };
    }
    return { success: false, error: data.reason || "unknown_error" };
  } catch (e) {
    return { success: false, error: "network_error" };
  }
}
async function checkActivation(plugin) {
  if (!plugin.settings.activated) return;
  const now = Date.now();
  const last = plugin.settings.lastVerifiedAt || 0;
  if (now - last < VERIFY_INTERVAL) return;
  try {
    const resp = await fetch(VERIFY_WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: plugin.settings.activatedEmail,
        code: plugin.settings.activationCode
      })
    });
    const data = await resp.json();
    if (data.valid) {
      plugin.settings.lastVerifiedAt = now;
      plugin.settings.verifyFailCount = 0;
      await plugin.saveSettings();
      return;
    }
    handleVerifyFail(plugin);
  } catch (err) {
    console.log("Memory Orbs: \u590D\u9A8C\u7F51\u7EDC\u9519\u8BEF", err);
  }
}
function handleVerifyFail(plugin) {
  plugin.settings.verifyFailCount = (plugin.settings.verifyFailCount || 0) + 1;
  if (plugin.settings.verifyFailCount >= MAX_VERIFY_FAILS) {
    plugin.settings.activated = false;
    plugin.settings.activatedEmail = "";
    plugin.settings.activationCode = "";
    plugin.settings.verifyFailCount = 0;
    plugin.settings.lastVerifiedAt = 0;
    plugin.saveSettings();
    new Notice("\u26A0\uFE0F Memory Orbs \u6FC0\u6D3B\u5DF2\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u6FC0\u6D3B");
    return;
  }
  plugin.saveSettings();
}
var MemoryOrbsSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "\u{1F511} \u6FC0\u6D3B" });
    const statusEl = containerEl.createDiv({ cls: "mo-activation-status" });
    const updateActivationStatus = () => {
      statusEl.empty();
      if (this.plugin.settings.activated) {
        statusEl.createEl("p", {
          text: `\u2705 \u5DF2\u6FC0\u6D3B \u2014 ${this.plugin.settings.activatedEmail}`,
          cls: "mo-activation-active"
        });
        const deactivateBtn = statusEl.createEl("button", {
          text: "\u53D6\u6D88\u6FC0\u6D3B",
          cls: "mo-deactivation-btn"
        });
        deactivateBtn.style.marginTop = "8px";
        deactivateBtn.addEventListener("click", async () => {
          this.plugin.settings.activated = false;
          this.plugin.settings.activatedEmail = "";
          this.plugin.settings.activationCode = "";
          this.plugin.settings.lastVerifiedAt = 0;
          this.plugin.settings.verifyFailCount = 0;
          await this.plugin.saveSettings();
          updateActivationStatus();
          const leaf = this.plugin.app.workspace.getLeavesOfType(VIEW_TYPE_MEMORY_ORBS)[0];
          if (leaf && leaf.view instanceof MemoryOrbsView) {
            leaf.view.render();
          }
        });
      } else {
        statusEl.createEl("p", {
          text: "\u26A0\uFE0F \u672A\u6FC0\u6D3B \u2014 \u4EC5\u5C55\u793A\u4ECA\u5929\u7684\u8BB0\u5FC6\u7403\uFF0C\u8BF7\u6FC0\u6D3B\u540E\u89E3\u9501\u5168\u90E8\u529F\u80FD",
          cls: "mo-activation-expired"
        });
      }
    };
    updateActivationStatus();
    const emailInput = containerEl.createEl("input", {
      type: "email",
      placeholder: "\u8D2D\u4E70\u65F6\u4F7F\u7528\u7684\u90AE\u7BB1",
      cls: "mo-activation-input"
    });
    emailInput.style.width = "100%";
    emailInput.style.marginBottom = "8px";
    const codeInput = containerEl.createEl("input", {
      type: "text",
      placeholder: "\u6FC0\u6D3B\u7801\uFF08\u683C\u5F0F\uFF1AXXXXX-XXXXX-XXXXX-XXXXX\uFF09",
      cls: "mo-activation-input"
    });
    codeInput.style.width = "100%";
    codeInput.style.marginBottom = "12px";
    const activateBtn = containerEl.createEl("button", {
      text: "\u6FC0\u6D3B",
      cls: "mo-activation-btn mod-cta"
    });
    activateBtn.style.width = "100%";
    activateBtn.style.marginBottom = "12px";
    const msgEl = containerEl.createDiv({ cls: "mo-activation-msg" });
    activateBtn.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      const code = codeInput.value.trim();
      if (!email || !email.includes("@")) {
        msgEl.setText("\u8BF7\u8F93\u5165\u6709\u6548\u7684\u90AE\u7BB1\u5730\u5740");
        msgEl.addClass("mo-activation-error");
        return;
      }
      if (!code) {
        msgEl.setText("\u8BF7\u8F93\u5165\u6FC0\u6D3B\u7801");
        msgEl.addClass("mo-activation-error");
        return;
      }
      msgEl.removeClass("mo-activation-error");
      msgEl.setText("\u6B63\u5728\u8FDE\u63A5\u670D\u52A1\u5668\u9A8C\u8BC1...");
      const result = await requestActivation(email, code);
      if (result.success) {
        this.plugin.settings.activated = true;
        this.plugin.settings.activatedEmail = email;
        this.plugin.settings.activationCode = code;
        this.plugin.settings.lastVerifiedAt = Date.now();
        this.plugin.settings.verifyFailCount = 0;
        await this.plugin.saveSettings();
        msgEl.setText("\u{1F389} \u6FC0\u6D3B\u6210\u529F\uFF01");
        msgEl.removeClass("mo-activation-error");
        updateActivationStatus();
        const leaf = this.plugin.app.workspace.getLeavesOfType(VIEW_TYPE_MEMORY_ORBS)[0];
        if (leaf && leaf.view instanceof MemoryOrbsView) {
          leaf.view.render();
        }
      } else {
        const reason = result.error === "email_not_authorized" ? "\u8BE5\u90AE\u7BB1\u672A\u6388\u6743\uFF0C\u8BF7\u786E\u8BA4\u5DF2\u5728 B\u7AD9\u5DE5\u574A\u8D2D\u4E70" : result.error === "invalid_code" ? "\u6FC0\u6D3B\u7801\u9519\u8BEF\uFF0C\u8BF7\u68C0\u67E5\u540E\u91CD\u8BD5" : result.error === "network_error" ? "\u7F51\u7EDC\u8FDE\u63A5\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5" : "\u6FC0\u6D3B\u5931\u8D25\uFF1A" + (result.error || "\u672A\u77E5\u9519\u8BEF");
        msgEl.setText("\u274C " + reason);
        msgEl.addClass("mo-activation-error");
      }
    });
    new import_obsidian.Setting(containerEl).setName("\u65E5\u8BB0\u76EE\u5F55").setDesc("\u5B58\u653E\u65E5\u8BB0\u6587\u4EF6\u7684\u6587\u4EF6\u5939\u8DEF\u5F84\uFF08\u76F8\u5BF9\u4E8E\u5E93\u6839\u76EE\u5F55\uFF09").addText((text) => {
      text.setValue(this.plugin.settings.diaryDir);
      text.onChange(async (value) => {
        this.plugin.settings.diaryDir = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Mood \u6807\u7B7E\u524D\u7F00").setDesc("\u7528\u4E8E\u8BC6\u522B\u60C5\u7EEA\u7684\u6807\u7B7E\u524D\u7F00\uFF0C\u65E5\u8BB0\u4E2D\u5982 `#Note/life/mood/Joy`").addText((text) => {
      text.setValue(this.plugin.settings.moodTagPrefix);
      text.onChange(async (value) => {
        this.plugin.settings.moodTagPrefix = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("\u6838\u5FC3\u8BB0\u5FC6\u6807\u7B7E").setDesc("\u6807\u8BB0\u6838\u5FC3\u8BB0\u5FC6\u7684\u6807\u7B7E key\uFF08\u9ED8\u8BA4 core\uFF09\uFF0C\u4F8B\u5982\u65E5\u8BB0\u4E2D\u7684 `#Note/life/mood/core`").addText((text) => {
      text.setValue(this.plugin.settings.coreTagKey);
      text.onChange(async (value) => {
        this.plugin.settings.coreTagKey = value;
        await this.plugin.saveSettings();
      });
    });
    containerEl.createEl("h3", { text: "\u754C\u9762\u8BBE\u7F6E" });
    const refreshView = () => {
      const leaf = this.plugin.app.workspace.getLeavesOfType(VIEW_TYPE_MEMORY_ORBS)[0];
      if (leaf && leaf.view instanceof MemoryOrbsView) {
        leaf.view.render();
      }
    };
    new import_obsidian.Setting(containerEl).setName("\u8BB0\u5FC6\u7403\u95F4\u8DDD").setDesc(`\u5F53\u524D\u503C: ${this.plugin.settings.orbGap}px`).addSlider((slider) => {
      slider.setLimits(0, 30, 1).setValue(this.plugin.settings.orbGap).setDynamicTooltip().onChange(async (value) => {
        this.plugin.settings.orbGap = value;
        await this.plugin.saveSettings();
        refreshView();
      });
    });
    new import_obsidian.Setting(containerEl).setName("\u591A\u6392\u7BA1\u9053\u884C\u95F4\u8DDD").setDesc(`\u5F53\u524D\u503C: ${this.plugin.settings.pipelineRowGap}px`).addSlider((slider) => {
      slider.setLimits(0, 40, 1).setValue(this.plugin.settings.pipelineRowGap).setDynamicTooltip().onChange(async (value) => {
        this.plugin.settings.pipelineRowGap = value;
        await this.plugin.saveSettings();
        refreshView();
      });
    });
    new import_obsidian.Setting(containerEl).setName("\u6BCF\u5929\u7BA1\u9053\u95F4\u8DDD").setDesc(`\u5F53\u524D\u503C: ${this.plugin.settings.daySectionGap}px`).addSlider((slider) => {
      slider.setLimits(0, 60, 1).setValue(this.plugin.settings.daySectionGap).setDynamicTooltip().onChange(async (value) => {
        this.plugin.settings.daySectionGap = value;
        await this.plugin.saveSettings();
        refreshView();
      });
    });
    new import_obsidian.Setting(containerEl).setName("\u6BCF\u5468\u7BA1\u9053\u95F4\u8DDD").setDesc(`\u5F53\u524D\u503C: ${this.plugin.settings.weekSectionGap}px`).addSlider((slider) => {
      slider.setLimits(0, 80, 1).setValue(this.plugin.settings.weekSectionGap).setDynamicTooltip().onChange(async (value) => {
        this.plugin.settings.weekSectionGap = value;
        await this.plugin.saveSettings();
        refreshView();
      });
    });
    new import_obsidian.Setting(containerEl).setName("UI \u5B57\u4F53\u5927\u5C0F").setDesc(`\u5F53\u524D\u503C: ${this.plugin.settings.fontSize}px`).addSlider((slider) => {
      slider.setLimits(10, 20, 1).setValue(this.plugin.settings.fontSize).setDynamicTooltip().onChange(async (value) => {
        this.plugin.settings.fontSize = value;
        await this.plugin.saveSettings();
        refreshView();
      });
    });
    new import_obsidian.Setting(containerEl).setName("\u89C6\u89C9\u4E3B\u9898").setDesc("\u8BB0\u5FC6\u7403\u7684\u89C6\u89C9\u98CE\u683C").addDropdown((dropdown) => {
      dropdown.addOption("cosmos", "\u{1F30C} \u661F\u7A7A\uFF08\u9ED8\u8BA4\u6697\u8272\uFF09").addOption("classic", "\u2600\uFE0F \u7ECF\u5178\uFF08\u4EAE\u8272\uFF09").addOption("sketch", "\u270F\uFE0F \u624B\u7ED8\uFF08\u7EB8\u9762\u98CE\u683C\uFF09").addOption("glass", "\u{1F52E} \u73BB\u7483\uFF08\u901A\u900F\u8D28\u611F\uFF09").setValue(this.plugin.settings.visualTheme).onChange(async (value) => {
        this.plugin.settings.visualTheme = value;
        await this.plugin.saveSettings();
        refreshView();
      });
    });
    containerEl.createEl("h3", { text: "\u60C5\u7EEA\u914D\u8272" });
    containerEl.createEl("p", {
      text: "\u81EA\u5B9A\u4E49\u60C5\u7EEA\u7684\u540D\u79F0\u3001\u6807\u7B7E key \u548C\u989C\u8272\u3002\u6807\u7B7E key \u5BF9\u5E94\u65E5\u8BB0\u4E2D Mood \u6807\u7B7E\u7684\u6700\u540E\u4E00\u90E8\u5206\u3002"
    });
    const emotionListEl = containerEl.createDiv({ cls: "mo-emotion-list" });
    const renderEmotionList = () => {
      emotionListEl.empty();
      for (let i = 0; i < this.plugin.settings.customEmotions.length; i++) {
        const emotion = this.plugin.settings.customEmotions[i];
        const rowEl = emotionListEl.createDiv({ cls: "mo-emotion-row" });
        const colorInput = rowEl.createEl("input", { type: "color" });
        colorInput.value = emotion.color;
        colorInput.addClass("mo-color-picker");
        colorInput.addEventListener("input", async (e) => {
          this.plugin.settings.customEmotions[i].color = e.target.value;
          await this.plugin.saveSettings();
          refreshView();
        });
        const charInput = rowEl.createEl("input", { type: "text" });
        charInput.value = emotion.character;
        charInput.placeholder = "\u89D2\u8272\u540D";
        charInput.addClass("mo-emotion-input");
        charInput.style.width = "70px";
        charInput.addEventListener("change", async (e) => {
          this.plugin.settings.customEmotions[i].character = e.target.value;
          await this.plugin.saveSettings();
          refreshView();
        });
        const keyInput = rowEl.createEl("input", { type: "text" });
        keyInput.value = emotion.key;
        keyInput.placeholder = "\u6807\u7B7Ekey";
        keyInput.addClass("mo-emotion-input");
        keyInput.style.width = "90px";
        keyInput.addEventListener("change", async (e) => {
          this.plugin.settings.customEmotions[i].key = e.target.value;
          await this.plugin.saveSettings();
          refreshView();
        });
        const labelInput = rowEl.createEl("input", { type: "text" });
        labelInput.value = emotion.label;
        labelInput.placeholder = "\u663E\u793A\u540D";
        labelInput.addClass("mo-emotion-input");
        labelInput.style.width = "60px";
        labelInput.addEventListener("change", async (e) => {
          this.plugin.settings.customEmotions[i].label = e.target.value;
          await this.plugin.saveSettings();
          refreshView();
        });
        const delBtn = rowEl.createEl("button", {
          text: "\u2715",
          cls: "mo-emotion-del-btn"
        });
        delBtn.title = "\u5220\u9664\u6B64\u60C5\u7EEA";
        delBtn.addEventListener("click", async () => {
          this.plugin.settings.customEmotions.splice(i, 1);
          await this.plugin.saveSettings();
          renderEmotionList();
          refreshView();
        });
      }
    };
    renderEmotionList();
    new import_obsidian.Setting(containerEl).setName("\u6DFB\u52A0\u65B0\u60C5\u7EEA").setDesc("\u6DFB\u52A0\u4E00\u4E2A\u81EA\u5B9A\u4E49\u60C5\u7EEA\uFF08\u989C\u8272\u53EF\u7A0D\u540E\u5728\u5217\u8868\u4E2D\u4FEE\u6539\uFF09").addButton((btn) => {
      btn.setButtonText("\u2795 \u6DFB\u52A0").setClass("mod-cta").onClick(async () => {
        const randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
        this.plugin.settings.customEmotions.push({
          key: "new",
          label: "\u65B0\u60C5\u7EEA",
          character: "\u65B0\u89D2\u8272",
          color: randomColor
        });
        await this.plugin.saveSettings();
        renderEmotionList();
        refreshView();
      });
    });
    new import_obsidian.Setting(containerEl).setName("\u91CD\u7F6E\u4E3A\u9ED8\u8BA4\u60C5\u7EEA").setDesc("\u6062\u590D\u5230\u521D\u59CB\u7684\u60C5\u7EEA\u5217\u8868\u548C\u914D\u8272").addButton((btn) => {
      btn.setButtonText("\u{1F504} \u91CD\u7F6E").setWarning().onClick(async () => {
        this.plugin.settings.customEmotions = DEFAULT_EMOTIONS.map((e) => ({ ...e }));
        await this.plugin.saveSettings();
        renderEmotionList();
        refreshView();
      });
    });
  }
};
var ActivateModal = class extends import_obsidian.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("mo-activate-modal");
    contentEl.createEl("h2", { text: "\u{1F511} \u6FC0\u6D3B Memory Orbs" });
    if (this.plugin.settings.activated) {
      contentEl.createEl("p", {
        text: `\u2705 \u5DF2\u6FC0\u6D3B \u2014 ${this.plugin.settings.activatedEmail}`,
        cls: "mo-activation-active"
      });
    } else {
      contentEl.createEl("p", {
        text: "\u26A0\uFE0F \u672A\u6FC0\u6D3B\u72B6\u6001\u4E0B\u4EC5\u5C55\u793A\u4ECA\u5929\u7684\u8BB0\u5FC6\u7403\u3002\u8BF7\u8F93\u5165\u8D2D\u4E70\u65F6\u4F7F\u7528\u7684\u90AE\u7BB1\u548C\u6FC0\u6D3B\u7801\u3002",
        cls: "mo-activation-expired"
      });
    }
    const emailInput = contentEl.createEl("input", {
      type: "email",
      placeholder: "\u8D2D\u4E70\u65F6\u4F7F\u7528\u7684\u90AE\u7BB1",
      cls: "mo-activation-input"
    });
    emailInput.style.width = "100%";
    emailInput.style.marginBottom = "8px";
    const codeInput = contentEl.createEl("input", {
      type: "text",
      placeholder: "\u6FC0\u6D3B\u7801\uFF08\u683C\u5F0F\uFF1AXXXXX-XXXXX-XXXXX-XXXXX\uFF09",
      cls: "mo-activation-input"
    });
    codeInput.style.width = "100%";
    codeInput.style.marginBottom = "12px";
    const msgEl = contentEl.createDiv({ cls: "mo-activation-msg" });
    const btnRow = contentEl.createDiv({ cls: "mo-activation-btn-row" });
    const activateBtn = btnRow.createEl("button", {
      text: "\u6FC0\u6D3B",
      cls: "mod-cta"
    });
    activateBtn.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      const code = codeInput.value.trim();
      if (!email || !email.includes("@")) {
        msgEl.setText("\u8BF7\u8F93\u5165\u6709\u6548\u7684\u90AE\u7BB1\u5730\u5740");
        msgEl.addClass("mo-activation-error");
        return;
      }
      if (!code) {
        msgEl.setText("\u8BF7\u8F93\u5165\u6FC0\u6D3B\u7801");
        msgEl.addClass("mo-activation-error");
        return;
      }
      msgEl.removeClass("mo-activation-error");
      msgEl.setText("\u6B63\u5728\u8FDE\u63A5\u670D\u52A1\u5668\u9A8C\u8BC1...");
      const result = await requestActivation(email, code);
      if (result.success) {
        this.plugin.settings.activated = true;
        this.plugin.settings.activatedEmail = email;
        this.plugin.settings.activationCode = code;
        this.plugin.settings.lastVerifiedAt = Date.now();
        this.plugin.settings.verifyFailCount = 0;
        await this.plugin.saveSettings();
        msgEl.setText("\u{1F389} \u6FC0\u6D3B\u6210\u529F\uFF01");
        msgEl.removeClass("mo-activation-error");
        setTimeout(() => this.close(), 2e3);
        const leaf = this.plugin.app.workspace.getLeavesOfType(VIEW_TYPE_MEMORY_ORBS)[0];
        if (leaf && leaf.view instanceof MemoryOrbsView) {
          leaf.view.render();
        }
      } else {
        const reason = result.error === "email_not_authorized" ? "\u8BE5\u90AE\u7BB1\u672A\u6388\u6743\uFF0C\u8BF7\u786E\u8BA4\u5DF2\u5728 B\u7AD9\u5DE5\u574A\u8D2D\u4E70" : result.error === "invalid_code" ? "\u6FC0\u6D3B\u7801\u9519\u8BEF\uFF0C\u8BF7\u68C0\u67E5\u540E\u91CD\u8BD5" : result.error === "network_error" ? "\u7F51\u7EDC\u8FDE\u63A5\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5" : "\u6FC0\u6D3B\u5931\u8D25\uFF1A" + (result.error || "\u672A\u77E5\u9519\u8BEF");
        msgEl.setText("\u274C " + reason);
        msgEl.addClass("mo-activation-error");
      }
    });
    const cancelBtn = btnRow.createEl("button", { text: "\u53D6\u6D88" });
    cancelBtn.addEventListener("click", () => this.close());
    const whereDesc = contentEl.createDiv({ cls: "mo-activation-where" });
    whereDesc.createEl("p", {
      text: "\u{1F4A1} \u83B7\u53D6\u6FC0\u6D3B\u8D44\u683C\uFF1A\u8BF7\u5728 B\u7AD9\u5DE5\u574A\u641C\u7D22\u300CMemory Orbs\u300D\u8D2D\u4E70\u540E\uFF0C\u7528\u4E0B\u5355\u90AE\u7BB1\u6FC0\u6D3B\u3002"
    });
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
};
var MemoryOrbsPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
  }
  async onload() {
    await this.loadSettings();
    checkActivation(this);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_MEMORY_ORBS);
    this.registerView(VIEW_TYPE_MEMORY_ORBS, (leaf) => new MemoryOrbsView(leaf, this));
    await this.loadCustomFont();
    this.addRibbonIcon("sparkles", "\u8BB0\u5FC6\u7403", () => {
      this.activateView();
    });
    this.addCommand({
      id: "open-memory-orbs",
      name: "\u6253\u5F00\u8BB0\u5FC6\u7403",
      callback: () => this.activateView()
    });
    this.addCommand({
      id: "activate-memory-orbs",
      name: "\u6FC0\u6D3B Memory Orbs",
      callback: () => new ActivateModal(this.app, this).open()
    });
    this.addSettingTab(new MemoryOrbsSettingTab(this.app, this));
    this.registerMarkdownCodeBlockProcessor("memory-orbs", async (source, el, _ctx) => {
      const config = this.parseEmbedConfig(source);
      const renderer = new MemoryOrbsEmbedRenderer(this, el, config.date);
      await renderer.render(config);
    });
    this.registerMarkdownCodeBlockProcessor("memory-orbs-builder", async (_source, el, _ctx) => {
      this.renderEmbedBuilder(el);
    });
  }
  async loadCustomFont() {
    try {
      const fontPath = ".obsidian/plugins/memory-orbs/SmileySans-Oblique.ttf";
      const data = await this.app.vault.adapter.readBinary(fontPath);
      if (data.byteLength > 1e4) {
        await this.registerFontFromBuffer(data);
        console.log("Memory Orbs: \u5F97\u610F\u9ED1\u5B57\u4F53\u52A0\u8F7D\u6210\u529F");
        return;
      }
      console.warn("Memory Orbs: \u5B57\u4F53\u6587\u4EF6\u5F02\u5E38\uFF08\u8FC7\u5C0F\uFF09\uFF0C\u5C06\u4F7F\u7528\u7CFB\u7EDF\u9ED8\u8BA4\u5B57\u4F53");
    } catch (e) {
      console.warn("Memory Orbs: \u672A\u627E\u5230 SmileySans-Oblique.ttf\uFF0C\u5C06\u4F7F\u7528\u7CFB\u7EDF\u9ED8\u8BA4\u5B57\u4F53");
    }
  }
  async registerFontFromBuffer(buffer) {
    const blob = new Blob([buffer], { type: "font/ttf" });
    const blobUrl = URL.createObjectURL(blob);
    const fontFace = new FontFace(
      "SmileySans",
      `url(${blobUrl})`,
      { style: "normal", weight: "1 1000" }
    );
    await fontFace.load();
    document.fonts.add(fontFace);
  }
  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_MEMORY_ORBS);
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (!this.settings.customEmotions || this.settings.customEmotions.length === 0) {
      this.settings.customEmotions = DEFAULT_EMOTIONS.map((e) => ({ ...e }));
    }
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  parseEmbedConfig(source) {
    const today = /* @__PURE__ */ new Date();
    const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const config = {
      date: defaultDate,
      mode: "day",
      theme: void 0,
      minimal: true
    };
    for (const rawLine of source.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim().toLowerCase();
      const value = line.slice(idx + 1).trim();
      switch (key) {
        case "date":
          if (/^\d{4}-\d{2}-\d{2}$/.test(value)) config.date = value;
          break;
        case "start":
          if (/^\d{4}-\d{2}-\d{2}$/.test(value)) config.start = value;
          break;
        case "end":
          if (/^\d{4}-\d{2}-\d{2}$/.test(value)) config.end = value;
          break;
        case "mode":
          if (["day", "week", "month"].includes(value)) config.mode = value;
          break;
        case "theme":
          if (["cosmos", "classic", "sketch", "glass"].includes(value)) config.theme = value;
          break;
        case "minimal":
          config.minimal = ["true", "yes", "1", "on"].includes(value.toLowerCase());
          break;
      }
    }
    return config;
  }
  buildEmbedCode(config) {
    const lines = ["```memory-orbs"];
    if (config.start && config.end) {
      lines.push(`start: ${config.start}`);
      lines.push(`end: ${config.end}`);
    } else {
      lines.push(`date: ${config.date}`);
      lines.push(`mode: ${config.mode}`);
    }
    if (config.theme) lines.push(`theme: ${config.theme}`);
    if (config.minimal) lines.push("minimal: true");
    lines.push("```");
    return lines.join("\n");
  }
  renderEmbedBuilder(el, initial) {
    const today = /* @__PURE__ */ new Date();
    const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const state = {
      date: initial?.date || defaultDate,
      mode: initial?.mode || "day",
      theme: initial?.theme || this.settings.visualTheme,
      minimal: initial?.minimal ?? true
    };
    el.empty();
    el.addClass("mo-embed-builder");
    const controls = el.createDiv({ cls: "mo-embed-builder-controls" });
    const codeWrap = el.createDiv({ cls: "mo-embed-builder-code-wrap" });
    const previewWrap = el.createDiv({ cls: "mo-embed-builder-preview" });
    const dateSetting = new import_obsidian.Setting(controls).setName("\u65E5\u671F");
    dateSetting.setDesc("day/week/month \u65F6\u81EA\u52A8\u8BA1\u7B97\u8303\u56F4");
    dateSetting.addText((text) => {
      text.inputEl.type = "date";
      text.inputEl.addClass("mo-embed-date-input");
      text.setValue(state.date);
      text.onChange((value) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          state.date = value;
          update();
        }
      });
    });
    const startSetting = new import_obsidian.Setting(controls).setName("\u5F00\u59CB\u65E5\u671F");
    startSetting.addText((text) => {
      text.inputEl.type = "date";
      text.inputEl.addClass("mo-embed-date-input");
      text.setValue(state.start || "");
      text.onChange((value) => {
        state.start = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : void 0;
        update();
      });
    });
    const endSetting = new import_obsidian.Setting(controls).setName("\u7ED3\u675F\u65E5\u671F");
    endSetting.addText((text) => {
      text.inputEl.type = "date";
      text.inputEl.addClass("mo-embed-date-input");
      text.setValue(state.end || "");
      text.onChange((value) => {
        state.end = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : void 0;
        update();
      });
    });
    const modeSetting = new import_obsidian.Setting(controls).setName("\u8303\u56F4\u6A21\u5F0F");
    modeSetting.addDropdown((dropdown) => {
      dropdown.addOption("day", "Day").addOption("week", "Week").addOption("month", "Month").addOption("custom", "\u81EA\u5B9A\u4E49");
      dropdown.setValue(state.mode);
      dropdown.onChange((value) => {
        state.mode = value;
        update();
      });
    });
    const themeSetting = new import_obsidian.Setting(controls).setName("\u4E3B\u9898");
    themeSetting.addDropdown((dropdown) => {
      dropdown.addOption("cosmos", "Cosmos").addOption("classic", "Classic").addOption("sketch", "Sketch").addOption("glass", "Glass");
      dropdown.setValue(state.theme || this.settings.visualTheme);
      dropdown.onChange((value) => {
        state.theme = value;
        update();
      });
    });
    const codeEl = codeWrap.createEl("pre", { cls: "mo-embed-builder-code" });
    const codeText = codeEl.createEl("code");
    const copyBtn = codeWrap.createEl("button", { cls: "mo-embed-builder-copy-btn", text: "\u{1F4CB} \u590D\u5236" });
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(codeText.textContent || "");
        copyBtn.textContent = "\u2705 \u5DF2\u590D\u5236";
        setTimeout(() => {
          copyBtn.textContent = "\u{1F4CB} \u590D\u5236";
        }, 2e3);
      } catch {
        copyBtn.textContent = "\u274C \u590D\u5236\u5931\u8D25";
      }
    });
    const previewTitle = previewWrap.createDiv({ cls: "mo-embed-builder-preview-title", text: "\u9884\u89C8" });
    const previewBody = previewWrap.createDiv({ cls: "mo-embed-builder-preview-body" });
    const update = () => {
      const isCustom = state.mode === "custom";
      dateSetting.settingEl.toggleClass("mo-builder-hidden", isCustom);
      startSetting.settingEl.toggleClass("mo-builder-hidden", !isCustom);
      endSetting.settingEl.toggleClass("mo-builder-hidden", !isCustom);
      const genCode = isCustom ? this.buildEmbedCode({ date: state.date, mode: "day", theme: state.theme, minimal: state.minimal, start: state.start, end: state.end }) : this.buildEmbedCode({ date: state.date, mode: state.mode, theme: state.theme, minimal: state.minimal });
      codeText.textContent = genCode;
      previewBody.empty();
      const previewConfig = {
        date: state.date,
        mode: isCustom ? "day" : state.mode,
        theme: state.theme,
        minimal: state.minimal,
        start: isCustom ? state.start : void 0,
        end: isCustom ? state.end : void 0
      };
      const renderer = new MemoryOrbsEmbedRenderer(this, previewBody, state.date);
      renderer.render(previewConfig);
    };
    update();
  }
  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_MEMORY_ORBS)[0];
    if (!leaf) {
      leaf = workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE_MEMORY_ORBS, active: true });
    }
    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }
};
