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
  downloadNote: document.querySelector("#downloadNote"),
  downloadMarkdown: document.querySelector("#downloadMarkdown"),
  downloadPdf: document.querySelector("#downloadPdf"),
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

  const title = document.createElement("strong");
  title.textContent = book.title;

  const meta = document.createElement("span");
  meta.className = "book-meta";
  meta.textContent = [seriesLabels[book.series], book.filename].filter(Boolean).join(" / ");

  button.append(title, meta);
  return button;
}

function renderReader(book) {
  if (!book) {
    elements.readerSeries.textContent = "请选择文献";
    elements.readerTitle.textContent = "从目录中选择文献";
    elements.downloadNote.textContent = "请先从目录中选择一项文献。";
    setDownloadLink(elements.downloadMarkdown, null);
    setDownloadLink(elements.downloadPdf, null);
    return;
  }

  elements.readerSeries.textContent = seriesLabels[book.series];
  elements.readerTitle.textContent = getReaderTitle(book);
  elements.readerTitle.title = book.title;
  elements.downloadNote.textContent = "可下载 OCR 文本与 PDF 原文。";

  setDownloadLink(elements.downloadMarkdown, book.markdownUrl);
  setDownloadLink(elements.downloadPdf, book.pdfUrl);
}

function buildOptionalUrl(baseUrl, filename) {
  return baseUrl && filename ? `${baseUrl}${filename}` : "";
}

function getReaderTitle(book) {
  const number = book.id?.match(/\d+$/)?.[0];
  if (book.series === "nsbd" && number) {
    return `南水北调${number}`;
  }
  if (book.series === "hebei" && number) {
    return `河北${number}`;
  }
  return book.title;
}

function setDownloadLink(element, url) {
  const isUsable = isUsableUrl(url);
  element.classList.toggle("is-disabled", !isUsable);

  if (isUsable) {
    element.href = url;
    element.removeAttribute("aria-disabled");
    element.removeAttribute("tabindex");
  } else {
    element.removeAttribute("href");
    element.setAttribute("aria-disabled", "true");
    element.setAttribute("tabindex", "-1");
  }
}

function isUsableUrl(url) {
  return Boolean(url) && !url.includes("YOUR-BUNNY-CDN-HOSTNAME");
}

init().catch((error) => {
  elements.bookList.innerHTML = "";
  elements.emptyState.hidden = false;
  elements.emptyState.textContent = `目录加载失败：${error.message}`;
});
