const catalogUrl = "./data/catalog.json";

const state = {
  books: [],
  query: "",
  series: "all",
  selectedId: null,
};

const elements = {
  sidebarToggle: document.querySelector("#sidebarToggle"),
  searchInput: document.querySelector("#searchInput"),
  filters: [...document.querySelectorAll(".filter")],
  bookList: document.querySelector("#bookList"),
  emptyState: document.querySelector("#emptyState"),
  activeLabel: document.querySelector("#activeLabel"),
  readerSeries: document.querySelector("#readerSeries"),
  readerTitle: document.querySelector("#readerTitle"),
  openPdf: document.querySelector("#openPdf"),
  pdfFrame: document.querySelector("#pdfFrame"),
  readerBlank: document.querySelector("#readerBlank"),
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
  }));
  state.selectedId = state.books[0]?.id || null;

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
  if (!visibleBooks.some((book) => book.id === state.selectedId)) {
    state.selectedId = visibleBooks[0]?.id || null;
  }

  elements.activeLabel.textContent = seriesLabels[state.series];
  elements.emptyState.hidden = visibleBooks.length > 0;

  elements.bookList.replaceChildren(...visibleBooks.map(createBookButton));
  renderReader(visibleBooks.find((book) => book.id === state.selectedId));
}

function setSidebarOpen(isOpen) {
  document.body.classList.toggle("is-sidebar-collapsed", !isOpen);
  elements.sidebarToggle.setAttribute("aria-expanded", String(isOpen));
}

function createBookButton(book) {
  const button = document.createElement("button");
  button.className = "book-card";
  button.type = "button";
  button.dataset.id = book.id;
  button.classList.toggle("is-selected", book.id === state.selectedId);
  button.addEventListener("click", () => {
    state.selectedId = book.id;
    render();
  });

  const code = document.createElement("span");
  code.className = "book-code";
  code.textContent = book.id;

  const title = document.createElement("strong");
  title.textContent = book.title;

  const meta = document.createElement("span");
  meta.className = "book-meta";
  meta.textContent = [seriesLabels[book.series], book.filename].filter(Boolean).join(" / ");

  button.append(code, title, meta);
  return button;
}

function renderReader(book) {
  const hasBook = Boolean(book);
  const canOpenPdf = hasBook && isUsablePdfUrl(book.pdfUrl);

  elements.readerBlank.hidden = canOpenPdf;
  elements.pdfFrame.hidden = !canOpenPdf;
  elements.openPdf.classList.toggle("is-disabled", !canOpenPdf);

  if (!book) {
    elements.readerSeries.textContent = "请选择文献";
    elements.readerTitle.textContent = "从目录中选择 PDF";
    elements.openPdf.removeAttribute("href");
    elements.pdfFrame.removeAttribute("src");
    elements.readerBlank.querySelector("strong").textContent = "尚未选择文献";
    elements.readerBlank.querySelector("span").textContent = "请在目录中检索或筛选，然后选择一篇 PDF 预览。";
    return;
  }

  elements.readerSeries.textContent = seriesLabels[book.series];
  elements.readerTitle.textContent = book.title;
  elements.readerBlank.querySelector("strong").textContent = "PDF 地址尚未配置";
  elements.readerBlank.querySelector("span").textContent = "请在 data/catalog.json 中把 pdfBaseUrl 改为 Bunny CDN 域名。";

  if (canOpenPdf) {
    elements.openPdf.href = book.pdfUrl;
    elements.pdfFrame.src = book.pdfUrl;
  } else {
    elements.openPdf.removeAttribute("href");
    elements.pdfFrame.removeAttribute("src");
  }
}

function isUsablePdfUrl(url) {
  return Boolean(url) && !url.includes("YOUR-BUNNY-CDN-HOSTNAME");
}

init().catch((error) => {
  elements.bookList.innerHTML = "";
  elements.emptyState.hidden = false;
  elements.emptyState.textContent = `目录加载失败：${error.message}`;
});
