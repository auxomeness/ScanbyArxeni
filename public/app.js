const input = document.querySelector("#qr-input");
const level = document.querySelector("#level");
const margin = document.querySelector("#margin");
const size = document.querySelector("#size");
const dark = document.querySelector("#dark");
const light = document.querySelector("#light");
const preview = document.querySelector("#qr-preview");
const statusText = document.querySelector("#status");
const downloadPng = document.querySelector("#download-png");
const downloadSvg = document.querySelector("#download-svg");
const simplify = document.querySelector("#simplify");
const themeToggle = document.querySelector("#theme-toggle");
const shell = document.querySelector(".site-shell");
const levelButtons = Array.from(document.querySelectorAll("[data-level]"));
const levelIndexes = { L: 0, M: 1, Q: 2, H: 3 };

let debounceTimer;

function params(format) {
  const search = new URLSearchParams({
    format,
    data: input.value,
    level: level.value,
    margin: margin.value,
    width: size.value,
    dark: dark.value,
    light: light.value,
  });

  return `/api/qr?${search.toString()}`;
}

function setDisabled(disabled) {
  downloadPng.setAttribute("aria-disabled", String(disabled));
  downloadSvg.setAttribute("aria-disabled", String(disabled));
}

function syncLevelButtons() {
  const activeIndex = levelIndexes[level.value] ?? 1;
  const modeBar = document.querySelector(".mode-bar");
  modeBar.style.setProperty("--active-index", activeIndex);

  levelButtons.forEach((button) => {
    const selected = button.dataset.level === level.value;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function refresh() {
  const value = input.value.trim();

  if (!value) {
    preview.removeAttribute("src");
    statusText.textContent = "Enter text or a URL.";
    setDisabled(true);
    return;
  }

  const pngUrl = params("png");
  const svgUrl = params("svg");

  preview.src = pngUrl;
  downloadPng.href = pngUrl;
  downloadSvg.href = svgUrl;
  statusText.textContent = "Static code generated. No expiration is embedded.";
  setDisabled(false);
}

function scheduleRefresh() {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(refresh, 180);
}

[input, level, margin, size, dark, light].forEach((element) => {
  element.addEventListener("input", scheduleRefresh);
  element.addEventListener("change", scheduleRefresh);
});

levelButtons.forEach((button) => {
  button.addEventListener("click", () => {
    level.value = button.dataset.level;
    syncLevelButtons();
    scheduleRefresh();
  });
});

simplify.addEventListener("click", () => {
  level.value = "L";
  margin.value = "4";
  size.value = "768";
  syncLevelButtons();
  scheduleRefresh();
});

themeToggle.addEventListener("click", () => {
  const nextTheme = shell.dataset.theme === "dark" ? "light" : "dark";
  shell.dataset.theme = nextTheme;
  themeToggle.textContent = nextTheme === "dark" ? "Light" : "Dark";
});

preview.addEventListener("error", async () => {
  try {
    const response = await fetch(params("png"));
    const payload = await response.json();
    statusText.textContent = payload.error || "Could not generate this QR code.";
  } catch {
    statusText.textContent = "Could not generate this QR code.";
  }

  setDisabled(true);
});

syncLevelButtons();
refresh();
