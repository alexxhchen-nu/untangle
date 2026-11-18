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

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ArchaeoDocParserPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  mineruToken: "",
  defaultLanguage: "ch",
  outputFolder: "parsed",
  autoOpen: true
};
var FREE_BASE = "https://mineru.net/api/v1";
var PRO_BASE = "https://mineru.net/api/v4";
var MinerUClient = class {
  constructor(token, timeout = 3e5) {
    this.token = token;
    this.timeout = timeout;
  }
  get usePro() {
    return !!this.token;
  }
  proHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.token}`
    };
  }
  sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
  // ── Free API ──
  async freeSubmitUrl(url, language, pages) {
    const body = { url, language };
    if (pages) body.page_range = pages;
    const resp = await (0, import_obsidian.requestUrl)({ url: `${FREE_BASE}/agent/parse/url`, method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
    const result = resp.json;
    if (result.code !== 0) throw new Error(`Submit failed: ${result.msg}`);
    return result.data.task_id;
  }
  async freeSubmitFile(fileName, fileData, language, pages) {
    const body = { file_name: fileName, language };
    if (pages) body.page_range = pages;
    const resp = await (0, import_obsidian.requestUrl)({ url: `${FREE_BASE}/agent/parse/file`, method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
    const result = resp.json;
    if (result.code !== 0) throw new Error(`Upload URL failed: ${result.msg}`);
    const taskId = result.data.task_id;
    const uploadUrl = result.data.file_url;
    await (0, import_obsidian.requestUrl)({ url: uploadUrl, method: "PUT", body: fileData });
    return taskId;
  }
  async freePoll(taskId, onProgress) {
    const start = Date.now();
    const labels = { uploading: "Downloading", pending: "Queued", running: "Parsing" };
    while (Date.now() - start < this.timeout) {
      const resp = await (0, import_obsidian.requestUrl)({ url: `${FREE_BASE}/agent/parse/${taskId}` });
      const result = resp.json;
      const state = result.data.state;
      const elapsed = Math.round((Date.now() - start) / 1e3);
      if (state === "done") {
        const mdUrl = result.data.markdown_url;
        try {
          const mdResp = await (0, import_obsidian.requestUrl)({ url: mdUrl });
          return mdResp.text;
        } catch (e) {
          return `Parse complete. Result URL: ${mdUrl}`;
        }
      }
      if (state === "failed") throw new Error(`Parse failed: ${result.data.err_msg || "unknown"}`);
      onProgress == null ? void 0 : onProgress(`[${elapsed}s] ${labels[state] || state}...`);
      await this.sleep(3e3);
    }
    throw new Error(`Timed out after ${this.timeout / 1e3}s`);
  }
  // ── Pro API ──
  async proSubmitUrl(url, language, pages) {
    const body = { url, model_version: "vlm", language };
    if (pages) body.page_ranges = pages;
    const resp = await (0, import_obsidian.requestUrl)({ url: `${PRO_BASE}/extract/task`, method: "POST", body: JSON.stringify(body), headers: this.proHeaders() });
    const result = resp.json;
    if (result.code !== 0) throw new Error(`Pro submit failed: ${result.msg}`);
    return result.data.task_id;
  }
  async proSubmitFile(fileName, fileData, language, pages) {
    const body = { files: [{ name: fileName }], model_version: "vlm", language };
    if (pages) body.page_ranges = pages;
    const resp = await (0, import_obsidian.requestUrl)({ url: `${PRO_BASE}/file-urls/batch`, method: "POST", body: JSON.stringify(body), headers: this.proHeaders() });
    const result = resp.json;
    if (result.code !== 0) throw new Error(`Pro upload URL failed: ${result.msg}`);
    const batchId = result.data.batch_id;
    const uploadUrl = result.data.file_urls[0];
    await (0, import_obsidian.requestUrl)({ url: uploadUrl, method: "PUT", body: fileData });
    return batchId;
  }
  async proPollTask(taskId, onProgress) {
    const start = Date.now();
    while (Date.now() - start < this.timeout) {
      const resp = await (0, import_obsidian.requestUrl)({ url: `${PRO_BASE}/extract/task/${taskId}`, headers: this.proHeaders() });
      const result = resp.json;
      const data = result.data;
      if (data.state === "done") return data;
      if (data.state === "failed") throw new Error(`Pro parse failed: ${data.err_msg || "unknown"}`);
      const progress = data.extract_progress;
      const elapsed = Math.round((Date.now() - start) / 1e3);
      if (progress) {
        onProgress == null ? void 0 : onProgress(`[${elapsed}s] Parsing... ${progress.extracted_pages}/${progress.total_pages} pages`);
      } else {
        onProgress == null ? void 0 : onProgress(`[${elapsed}s] ${data.state}...`);
      }
      await this.sleep(3e3);
    }
    throw new Error(`Timed out after ${this.timeout / 1e3}s`);
  }
  async proPollBatch(batchId, onProgress) {
    const start = Date.now();
    while (Date.now() - start < this.timeout) {
      const resp = await (0, import_obsidian.requestUrl)({ url: `${PRO_BASE}/extract-results/batch/${batchId}`, headers: this.proHeaders() });
      const result = resp.json;
      const items = result.data.extract_result;
      if (items.every((r) => r.state === "done" || r.state === "failed")) return items;
      const doneCount = items.filter((r) => r.state === "done").length;
      onProgress == null ? void 0 : onProgress(`${doneCount}/${items.length} completed`);
      await this.sleep(5e3);
    }
    throw new Error(`Batch timed out after ${this.timeout / 1e3}s`);
  }
  async proDownloadMarkdown(zipUrl) {
    const resp = await (0, import_obsidian.requestUrl)({ url: zipUrl });
    const text = resp.text;
    if (text && !text.startsWith("PK")) return text;
    return "Parse complete. Download the result ZIP for full content.";
  }
  // ── Public API ──
  async parseUrl(url, language, pages, onProgress) {
    if (this.usePro) {
      const taskId = await this.proSubmitUrl(url, language, pages);
      onProgress == null ? void 0 : onProgress(`Pro task: ${taskId}`);
      const data = await this.proPollTask(taskId, onProgress);
      return await this.proDownloadMarkdown(data.full_zip_url);
    } else {
      const taskId = await this.freeSubmitUrl(url, language, pages);
      onProgress == null ? void 0 : onProgress(`Task: ${taskId}`);
      return await this.freePoll(taskId, onProgress);
    }
  }
  async parseFile(fileName, fileData, language, pages, onProgress) {
    if (this.usePro) {
      const batchId = await this.proSubmitFile(fileName, fileData, language, pages);
      onProgress == null ? void 0 : onProgress(`Pro batch: ${batchId}`);
      const items = await this.proPollBatch(batchId, onProgress);
      const r = items[0];
      if (r.state !== "done") throw new Error(`Parse failed: ${r.err_msg || "unknown"}`);
      return await this.proDownloadMarkdown(r.full_zip_url);
    } else {
      const taskId = await this.freeSubmitFile(fileName, fileData, language, pages);
      onProgress == null ? void 0 : onProgress(`Task: ${taskId}`);
      return await this.freePoll(taskId, onProgress);
    }
  }
};
var SUPPORTED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "jp2", "webp", "gif", "bmp", "docx", "pptx", "xlsx"];
var ArchaeoDocParserPlugin = class extends import_obsidian.Plugin {
  async onload() {
    await this.loadSettings();
    this.client = new MinerUClient(this.settings.mineruToken);
    this.addCommand({
      id: "parse-current-file",
      name: "Parse current document to Markdown",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (file && SUPPORTED_EXTENSIONS.includes(file.extension)) {
          if (!checking) this.parseFile(file);
          return true;
        }
        return false;
      }
    });
    this.addCommand({
      id: "parse-from-url",
      name: "Parse document from URL",
      callback: () => new UrlInputModal(this.app, (url) => this.parseUrl(url)).open()
    });
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (file instanceof import_obsidian.TFile && SUPPORTED_EXTENSIONS.includes(file.extension)) {
          menu.addItem((item) => {
            item.setTitle("Parse to Markdown").setIcon("file-text").onClick(() => this.parseFile(file));
          });
        }
      })
    );
    this.addSettingTab(new ArchaeoDocParserSettingTab(this.app, this));
    console.log("Archaeo Doc Parser loaded");
  }
  onunload() {
    console.log("Archaeo Doc Parser unloaded");
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.client = new MinerUClient(this.settings.mineruToken);
  }
  async saveSettings() {
    await this.saveData(this.settings);
    this.client = new MinerUClient(this.settings.mineruToken);
  }
  async parseFile(file) {
    const notice = new import_obsidian.Notice("Parsing document...", 0);
    try {
      const fileData = await this.app.vault.readBinary(file);
      const result = await this.client.parseFile(
        file.name,
        fileData,
        this.settings.defaultLanguage,
        void 0,
        (msg) => notice.setMessage(msg)
      );
      notice.hide();
      await this.saveResult(file.basename, result);
    } catch (e) {
      notice.hide();
      new import_obsidian.Notice(`Parse failed: ${e instanceof Error ? e.message : String(e)}`, 5e3);
    }
  }
  async parseUrl(url) {
    const notice = new import_obsidian.Notice("Parsing URL...", 0);
    try {
      const result = await this.client.parseUrl(
        url,
        this.settings.defaultLanguage,
        void 0,
        (msg) => notice.setMessage(msg)
      );
      notice.hide();
      const name = new URL(url).hostname.replace(/\./g, "-") + "-" + Date.now();
      await this.saveResult(name, result);
    } catch (e) {
      notice.hide();
      new import_obsidian.Notice(`Parse failed: ${e instanceof Error ? e.message : String(e)}`, 5e3);
    }
  }
  async saveResult(basename, markdown) {
    const folder = this.settings.outputFolder;
    if (folder && !this.app.vault.getAbstractFileByPath(folder)) {
      await this.app.vault.createFolder(folder);
    }
    const filePath = folder ? `${folder}/${basename}.md` : `${basename}.md`;
    let finalPath = filePath;
    let i = 1;
    while (this.app.vault.getAbstractFileByPath(finalPath)) {
      const ext = ".md";
      finalPath = filePath.replace(ext, `-${i}${ext}`);
      i++;
    }
    const file = await this.app.vault.create(finalPath, markdown);
    new import_obsidian.Notice(`Saved: ${finalPath}`, 3e3);
    if (this.settings.autoOpen) {
      await this.app.workspace.openLinkText(file.path, "", true);
    }
  }
};
var UrlInputModal = class extends import_obsidian.Modal {
  constructor(app, onSubmit) {
    super(app);
    this.onSubmit = onSubmit;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Parse document from URL" });
    const input = contentEl.createEl("input", {
      type: "text",
      placeholder: "https://example.com/paper.pdf"
    });
    input.style.width = "100%";
    input.style.marginBottom = "12px";
    input.focus();
    const btn = contentEl.createEl("button", { text: "Parse" });
    btn.addEventListener("click", () => {
      const url = input.value.trim();
      if (url) {
        this.close();
        this.onSubmit(url);
      }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const url = input.value.trim();
        if (url) {
          this.close();
          this.onSubmit(url);
        }
      }
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};
var ArchaeoDocParserSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Archaeo Doc Parser" });
    new import_obsidian.Setting(containerEl).setName("MinerU token").setDesc("Pro API token from mineru.net. Leave empty for free tier (10MB/20 pages).").addText(
      (text) => text.setPlaceholder("Optional \u2014 leave empty for free").setValue(this.plugin.settings.mineruToken).onChange(async (value) => {
        this.plugin.settings.mineruToken = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Default language").setDesc("OCR language hint: ch (Chinese), en, japan, korean, etc.").addDropdown(
      (dropdown) => dropdown.addOption("ch", "Chinese (ch)").addOption("en", "English (en)").addOption("japan", "Japanese (japan)").addOption("korean", "Korean (korean)").setValue(this.plugin.settings.defaultLanguage).onChange(async (value) => {
        this.plugin.settings.defaultLanguage = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Output folder").setDesc("Folder for parsed Markdown notes. Leave empty for vault root.").addText(
      (text) => text.setPlaceholder("parsed").setValue(this.plugin.settings.outputFolder).onChange(async (value) => {
        this.plugin.settings.outputFolder = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Auto-open result").setDesc("Automatically open the parsed note after saving.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.autoOpen).onChange(async (value) => {
        this.plugin.settings.autoOpen = value;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("p", {
      text: "Supported formats: PDF, PNG, JPG, DOCX, PPTX, XLSX"
    }).style.color = "var(--text-muted)";
  }
};
