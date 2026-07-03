import { App, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder, requestUrl, Modal } from "obsidian";

// ── Settings ──────────────────────────────────────────────────────

interface ArchaeoDocParserSettings {
	mineruToken: string;
	defaultLanguage: string;
	outputFolder: string;
	autoOpen: boolean;
}

const DEFAULT_SETTINGS: ArchaeoDocParserSettings = {
	mineruToken: "",
	defaultLanguage: "ch",
	outputFolder: "parsed",
	autoOpen: true,
};

// ── MinerU Client ─────────────────────────────────────────────────

const FREE_BASE = "https://mineru.net/api/v1";
const PRO_BASE = "https://mineru.net/api/v4";

interface TaskResult {
	state: string;
	[key: string]: unknown;
}

class MinerUClient {
	private token: string;
	private timeout: number;

	constructor(token: string, timeout = 300000) {
		this.token = token;
		this.timeout = timeout;
	}

	get usePro(): boolean {
		return !!this.token;
	}

	private proHeaders(): Record<string, string> {
		return {
			"Content-Type": "application/json",
			Authorization: `Bearer ${this.token}`,
		};
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((r) => setTimeout(r, ms));
	}

	// ── Free API ──

	private async freeSubmitUrl(url: string, language: string, pages?: string): Promise<string> {
		const body: Record<string, string> = { url, language };
		if (pages) body.page_range = pages;
		const resp = await requestUrl({ url: `${FREE_BASE}/agent/parse/url`, method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
		const result = resp.json;
		if (result.code !== 0) throw new Error(`Submit failed: ${result.msg}`);
		return result.data.task_id;
	}

	private async freeSubmitFile(fileName: string, fileData: ArrayBuffer, language: string, pages?: string): Promise<string> {
		// Get upload URL
		const body: Record<string, string> = { file_name: fileName, language };
		if (pages) body.page_range = pages;
		const resp = await requestUrl({ url: `${FREE_BASE}/agent/parse/file`, method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
		const result = resp.json;
		if (result.code !== 0) throw new Error(`Upload URL failed: ${result.msg}`);
		const taskId = result.data.task_id;
		const uploadUrl = result.data.file_url;
		// Upload file
		await requestUrl({ url: uploadUrl, method: "PUT", body: fileData });
		return taskId;
	}

	private async freePoll(taskId: string, onProgress?: (msg: string) => void): Promise<string> {
		const start = Date.now();
		const labels: Record<string, string> = { uploading: "Downloading", pending: "Queued", running: "Parsing" };
		while (Date.now() - start < this.timeout) {
			const resp = await requestUrl({ url: `${FREE_BASE}/agent/parse/${taskId}` });
			const result = resp.json;
			const state = result.data.state;
			const elapsed = Math.round((Date.now() - start) / 1000);
			if (state === "done") {
				const mdUrl = result.data.markdown_url;
				try {
					const mdResp = await requestUrl({ url: mdUrl });
					return mdResp.text;
				} catch {
					return `Parse complete. Result URL: ${mdUrl}`;
				}
			}
			if (state === "failed") throw new Error(`Parse failed: ${result.data.err_msg || "unknown"}`);
			onProgress?.(`[${elapsed}s] ${labels[state] || state}...`);
			await this.sleep(3000);
		}
		throw new Error(`Timed out after ${this.timeout / 1000}s`);
	}

	// ── Pro API ──

	private async proSubmitUrl(url: string, language: string, pages?: string): Promise<string> {
		const body: Record<string, unknown> = { url, model_version: "vlm", language };
		if (pages) body.page_ranges = pages;
		const resp = await requestUrl({ url: `${PRO_BASE}/extract/task`, method: "POST", body: JSON.stringify(body), headers: this.proHeaders() });
		const result = resp.json;
		if (result.code !== 0) throw new Error(`Pro submit failed: ${result.msg}`);
		return result.data.task_id;
	}

	private async proSubmitFile(fileName: string, fileData: ArrayBuffer, language: string, pages?: string): Promise<string> {
		const body: Record<string, unknown> = { files: [{ name: fileName }], model_version: "vlm", language };
		if (pages) body.page_ranges = pages;
		const resp = await requestUrl({ url: `${PRO_BASE}/file-urls/batch`, method: "POST", body: JSON.stringify(body), headers: this.proHeaders() });
		const result = resp.json;
		if (result.code !== 0) throw new Error(`Pro upload URL failed: ${result.msg}`);
		const batchId = result.data.batch_id;
		const uploadUrl = result.data.file_urls[0];
		await requestUrl({ url: uploadUrl, method: "PUT", body: fileData });
		return batchId;
	}

	private async proPollTask(taskId: string, onProgress?: (msg: string) => void): Promise<TaskResult> {
		const start = Date.now();
		while (Date.now() - start < this.timeout) {
			const resp = await requestUrl({ url: `${PRO_BASE}/extract/task/${taskId}`, headers: this.proHeaders() });
			const result = resp.json;
			const data = result.data;
			if (data.state === "done") return data;
			if (data.state === "failed") throw new Error(`Pro parse failed: ${data.err_msg || "unknown"}`);
			const progress = data.extract_progress;
			const elapsed = Math.round((Date.now() - start) / 1000);
			if (progress) {
				onProgress?.(`[${elapsed}s] Parsing... ${progress.extracted_pages}/${progress.total_pages} pages`);
			} else {
				onProgress?.(`[${elapsed}s] ${data.state}...`);
			}
			await this.sleep(3000);
		}
		throw new Error(`Timed out after ${this.timeout / 1000}s`);
	}

	private async proPollBatch(batchId: string, onProgress?: (msg: string) => void): Promise<TaskResult[]> {
		const start = Date.now();
		while (Date.now() - start < this.timeout) {
			const resp = await requestUrl({ url: `${PRO_BASE}/extract-results/batch/${batchId}`, headers: this.proHeaders() });
			const result = resp.json;
			const items = result.data.extract_result as TaskResult[];
			if (items.every((r) => r.state === "done" || r.state === "failed")) return items;
			const doneCount = items.filter((r) => r.state === "done").length;
			onProgress?.(`${doneCount}/${items.length} completed`);
			await this.sleep(5000);
		}
		throw new Error(`Batch timed out after ${this.timeout / 1000}s`);
	}

	private async proDownloadMarkdown(zipUrl: string): Promise<string> {
		const resp = await requestUrl({ url: zipUrl });
		// The ZIP contains full.md — but Obsidian can't unzip natively.
		// Pro API also returns individual file URLs; try full_zip_url → full.md
		// For now, return the text if it's markdown, or a notice
		const text = resp.text;
		if (text && !text.startsWith("PK")) return text;
		return "Parse complete. Download the result ZIP for full content.";
	}

	// ── Public API ──

	async parseUrl(url: string, language: string, pages?: string, onProgress?: (msg: string) => void): Promise<string> {
		if (this.usePro) {
			const taskId = await this.proSubmitUrl(url, language, pages);
			onProgress?.(`Pro task: ${taskId}`);
			const data = await this.proPollTask(taskId, onProgress);
			return await this.proDownloadMarkdown(data.full_zip_url as string);
		} else {
			const taskId = await this.freeSubmitUrl(url, language, pages);
			onProgress?.(`Task: ${taskId}`);
			return await this.freePoll(taskId, onProgress);
		}
	}

	async parseFile(fileName: string, fileData: ArrayBuffer, language: string, pages?: string, onProgress?: (msg: string) => void): Promise<string> {
		if (this.usePro) {
			const batchId = await this.proSubmitFile(fileName, fileData, language, pages);
			onProgress?.(`Pro batch: ${batchId}`);
			const items = await this.proPollBatch(batchId, onProgress);
			const r = items[0];
			if (r.state !== "done") throw new Error(`Parse failed: ${r.err_msg || "unknown"}`);
			return await this.proDownloadMarkdown(r.full_zip_url as string);
		} else {
			const taskId = await this.freeSubmitFile(fileName, fileData, language, pages);
			onProgress?.(`Task: ${taskId}`);
			return await this.freePoll(taskId, onProgress);
		}
	}
}

// ── Plugin ────────────────────────────────────────────────────────

const SUPPORTED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "jp2", "webp", "gif", "bmp", "docx", "pptx", "xlsx"];

export default class ArchaeoDocParserPlugin extends Plugin {
	settings: ArchaeoDocParserSettings;
	client: MinerUClient;

	async onload() {
		await this.loadSettings();
		this.client = new MinerUClient(this.settings.mineruToken);

		// Command: parse current file
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
			},
		});

		// Command: parse from URL
		this.addCommand({
			id: "parse-from-url",
			name: "Parse document from URL",
			callback: () => new UrlInputModal(this.app, (url) => this.parseUrl(url)).open(),
		});

		// Right-click context menu on files
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (file instanceof TFile && SUPPORTED_EXTENSIONS.includes(file.extension)) {
					menu.addItem((item) => {
						item.setTitle("Parse to Markdown").setIcon("file-text").onClick(() => this.parseFile(file));
					});
				}
			})
		);

		// Settings tab
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

	private async parseFile(file: TFile) {
		const notice = new Notice("Parsing document...", 0);
		try {
			const fileData = await this.app.vault.readBinary(file);
			const result = await this.client.parseFile(
				file.name,
				fileData,
				this.settings.defaultLanguage,
				undefined,
				(msg) => (notice.setMessage(msg))
			);
			notice.hide();
			await this.saveResult(file.basename, result);
		} catch (e) {
			notice.hide();
			new Notice(`Parse failed: ${e instanceof Error ? e.message : String(e)}`, 5000);
		}
	}

	private async parseUrl(url: string) {
		const notice = new Notice("Parsing URL...", 0);
		try {
			const result = await this.client.parseUrl(
				url,
				this.settings.defaultLanguage,
				undefined,
				(msg) => (notice.setMessage(msg))
			);
			notice.hide();
			const name = new URL(url).hostname.replace(/\./g, "-") + "-" + Date.now();
			await this.saveResult(name, result);
		} catch (e) {
			notice.hide();
			new Notice(`Parse failed: ${e instanceof Error ? e.message : String(e)}`, 5000);
		}
	}

	private async saveResult(basename: string, markdown: string) {
		const folder = this.settings.outputFolder;
		// Ensure output folder exists
		if (folder && !this.app.vault.getAbstractFileByPath(folder)) {
			await this.app.vault.createFolder(folder);
		}
		const filePath = folder ? `${folder}/${basename}.md` : `${basename}.md`;

		// Handle name collision
		let finalPath = filePath;
		let i = 1;
		while (this.app.vault.getAbstractFileByPath(finalPath)) {
			const ext = ".md";
			finalPath = filePath.replace(ext, `-${i}${ext}`);
			i++;
		}

		const file = await this.app.vault.create(finalPath, markdown);
		new Notice(`Saved: ${finalPath}`, 3000);
		if (this.settings.autoOpen) {
			await this.app.workspace.openLinkText(file.path, "", true);
		}
	}
}

// ── URL Input Modal ───────────────────────────────────────────────

class UrlInputModal extends Modal {
	private onSubmit: (url: string) => void;

	constructor(app: App, onSubmit: (url: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: "Parse document from URL" });
		const input = contentEl.createEl("input", {
			type: "text",
			placeholder: "https://example.com/paper.pdf",
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
}

// ── Settings Tab ──────────────────────────────────────────────────

class ArchaeoDocParserSettingTab extends PluginSettingTab {
	plugin: ArchaeoDocParserPlugin;

	constructor(app: App, plugin: ArchaeoDocParserPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "Archaeo Doc Parser" });

		new Setting(containerEl)
			.setName("MinerU token")
			.setDesc("Pro API token from mineru.net. Leave empty for free tier (10MB/20 pages).")
			.addText((text) =>
				text
					.setPlaceholder("Optional — leave empty for free")
					.setValue(this.plugin.settings.mineruToken)
					.onChange(async (value) => {
						this.plugin.settings.mineruToken = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Default language")
			.setDesc("OCR language hint: ch (Chinese), en, japan, korean, etc.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("ch", "Chinese (ch)")
					.addOption("en", "English (en)")
					.addOption("japan", "Japanese (japan)")
					.addOption("korean", "Korean (korean)")
					.setValue(this.plugin.settings.defaultLanguage)
					.onChange(async (value) => {
						this.plugin.settings.defaultLanguage = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Output folder")
			.setDesc("Folder for parsed Markdown notes. Leave empty for vault root.")
			.addText((text) =>
				text
					.setPlaceholder("parsed")
					.setValue(this.plugin.settings.outputFolder)
					.onChange(async (value) => {
						this.plugin.settings.outputFolder = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Auto-open result")
			.setDesc("Automatically open the parsed note after saving.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.autoOpen).onChange(async (value) => {
					this.plugin.settings.autoOpen = value;
					await this.plugin.saveSettings();
				})
			);

		containerEl.createEl("p", {
			text: "Supported formats: PDF, PNG, JPG, DOCX, PPTX, XLSX",
		}).style.color = "var(--text-muted)";
	}
}
