const catalogUrl = "./data/catalog.json";

const state = {
  books: [],
  query: "",
  series: "all",
  openIds: new Set(),
};

const elements = {
  sidebarToggle: document.querySelector("#sidebarToggle"),
  searchInput: document.querySelector("#searchInput"),
  filters: [...document.querySelectorAll(".filter")],
  bookList: document.querySelector("#bookList"),
  emptyState: document.querySelector("#emptyState"),
  activeLabel: document.querySelector("#activeLabel"),
};

const seriesLabels = {
  all: "全部文献",
  nsbd: "南水北调",
  hebei: "河北",
};

async function init() {
  const response = await fetch(catalogUrl);
  if (!response.ok) {
    throw new Error(`Could not load ${catalogUrl}`);
  }

  const data = await response.json();
  state.books = data.books.map((book) => ({
    ...book,
    pdfUrl: book.pdfUrl || `${data.pdfBaseUrl}${book.filename}`,
    markdownUrl: book.markdownUrl || buildOptionalUrl(data.markdownBaseUrl, book.markdownFilename),
    csvUrl: book.csvUrl || buildOptionalUrl(data.csvBaseUrl, book.csvFilename || `${book.id}.csv`),
  }));

  elements.sidebarToggle.addEventListener("click", () => {
    const shouldOpen = document.body.classList.contains("is-sidebar-collapsed");
    setSidebarOpen(shouldOpen);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setSidebarOpen(false);
    }
  });

  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    render();
  });

  elements.filters.forEach((button) => {
    button.addEventListener("click", () => {
      state.series = button.dataset.series;
      elements.filters.forEach((item) => item.classList.toggle("is-active", item === button));
      render();
    });
  });

  render();
}

function getVisibleBooks() {
  return state.books.filter((book) => {
    const matchesSeries = state.series === "all" || book.series === state.series;
    const haystack = [book.title, book.subtitle, book.filename, book.id, book.tags?.join(" ")]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return matchesSeries && haystack.includes(state.query);
  });
}

function render() {
  const visibleBooks = getVisibleBooks();
  const visibleIds = new Set(visibleBooks.map((book) => book.id));
  state.openIds.forEach((id) => {
    if (!visibleIds.has(id)) {
      state.openIds.delete(id);
    }
  });

  elements.activeLabel.textContent = seriesLabels[state.series];
  elements.emptyState.hidden = visibleBooks.length > 0;

  elements.bookList.replaceChildren(...visibleBooks.map(createBookRow));
}

function setSidebarOpen(isOpen) {
  document.body.classList.toggle("is-sidebar-collapsed", !isOpen);
  elements.sidebarToggle.setAttribute("aria-expanded", String(isOpen));
}

function createBookRow(book) {
  const isOpen = state.openIds.has(book.id);
  const row = document.createElement("div");
  row.className = "book-row";
  row.classList.toggle("is-expanded", isOpen);

  const button = document.createElement("button");
  button.className = "book-card";
  button.type = "button";
  button.dataset.id = book.id;
  button.setAttribute("aria-expanded", String(isOpen));
  button.classList.toggle("is-selected", isOpen);
  button.addEventListener("click", () => {
    if (state.openIds.has(book.id)) {
      state.openIds.delete(book.id);
    } else {
      state.openIds.add(book.id);
    }
    render();
  });

  const title = document.createElement("strong");
  title.textContent = book.title;

  const meta = document.createElement("span");
  meta.className = "book-meta";
  meta.textContent = [seriesLabels[book.series], book.filename].filter(Boolean).join(" / ");

  const node = document.createElement("span");
  node.className = "book-node";
  node.setAttribute("aria-hidden", "true");

  const actions = document.createElement("div");
  actions.className = "book-actions";
  actions.setAttribute("aria-label", `${book.title} 下载选项`);
  actions.hidden = !isOpen;
  actions.append(
    createActionLink("下载 PDF 原文", book.pdfUrl),
    createActionDivider(),
    createActionLink("解析结果(.md)", book.markdownUrl),
    createActionLink("解析数据(.csv)", book.csvUrl),
  );

  button.append(title, meta);
  row.append(button, node, actions);
  return row;
}

function buildOptionalUrl(baseUrl, filename) {
  return baseUrl && filename ? `${baseUrl}${filename}` : "";
}

function createActionLink(label, url) {
  const link = document.createElement("a");
  link.className = "action-link";
  link.textContent = label;
  link.target = "_blank";
  link.rel = "noreferrer";

  if (isUsableUrl(url)) {
    link.href = url;
  } else {
    link.classList.add("is-disabled");
    link.setAttribute("aria-disabled", "true");
    link.setAttribute("tabindex", "-1");
  }

  return link;
}

function createActionDivider() {
  const divider = document.createElement("span");
  divider.className = "action-divider";
  divider.setAttribute("aria-hidden", "true");
  return divider;
}

function isUsableUrl(url) {
  return Boolean(url) && !url.includes("YOUR-BUNNY-CDN-HOSTNAME");
}

init().catch((error) => {
  elements.bookList.innerHTML = "";
  elements.emptyState.hidden = false;
  elements.emptyState.textContent = `目录加载失败：${error.message}`;
});
