const input = document.querySelector("#qr-input");
const level = document.querySelector("#level");
const margin = document.querySelector("#margin");
const size = document.querySelector("#size");
const dark = document.querySelector("#dark");
const light = document.querySelector("#light");
const logo = document.querySelector("#logo");
const removeLogo = document.querySelector("#remove-logo");
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
let refreshId = 0;
let logoDataUrl = "";
let pngObjectUrl = "";
let svgObjectUrl = "";

function revokeDownloads() {
  if (pngObjectUrl) {
    URL.revokeObjectURL(pngObjectUrl);
    pngObjectUrl = "";
  }

  if (svgObjectUrl) {
    URL.revokeObjectURL(svgObjectUrl);
    svgObjectUrl = "";
  }
}

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

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function logoRatio() {
  const ratios = { L: 0.12, M: 0.16, Q: 0.2, H: 0.24 };
  return ratios[level.value] || ratios.H;
}

async function buildLogoPng(qrUrl) {
  const response = await fetch(qrUrl);

  if (!response.ok) {
    throw new Error("Could not generate this QR code.");
  }

  const qrImage = await loadImage(await blobToDataUrl(await response.blob()));
  const logoImage = await loadImage(logoDataUrl);
  const canvas = document.createElement("canvas");
  const canvasSize = qrImage.naturalWidth || Number(size.value) || 512;
  const context = canvas.getContext("2d");
  const markSize = Math.round(canvasSize * logoRatio());
  const pad = Math.max(8, Math.round(markSize * 0.18));
  const boxSize = markSize + pad * 2;
  const boxX = Math.round((canvasSize - boxSize) / 2);
  const boxY = boxX;
  const logoX = Math.round((canvasSize - markSize) / 2);
  const logoY = logoX;

  canvas.width = canvasSize;
  canvas.height = canvasSize;

  context.drawImage(qrImage, 0, 0, canvasSize, canvasSize);
  context.fillStyle = light.value || "#ffffff";
  context.fillRect(boxX, boxY, boxSize, boxSize);
  context.drawImage(logoImage, logoX, logoY, markSize, markSize);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not export the logo QR code."));
      }
    }, "image/png");
  });
}

async function buildLogoSvg(svgUrl) {
  const response = await fetch(svgUrl);

  if (!response.ok) {
    throw new Error("Could not generate this QR code.");
  }

  const original = await response.text();
  const widthMatch = original.match(/<svg[^>]*\swidth="([^"]+)"/);
  const viewBoxMatch = original.match(/<svg[^>]*\sviewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1].split(/\s+/).map(Number) : [0, 0, Number(widthMatch?.[1]) || 512, Number(widthMatch?.[1]) || 512];
  const svgSize = viewBox[2] || Number(size.value) || 512;
  const markSize = svgSize * logoRatio();
  const pad = Math.max(8, markSize * 0.18);
  const boxSize = markSize + pad * 2;
  const boxX = (svgSize - boxSize) / 2;
  const logoX = (svgSize - markSize) / 2;
  const logoTag = [
    `<rect x="${boxX}" y="${boxX}" width="${boxSize}" height="${boxSize}" fill="${light.value || "#ffffff"}"/>`,
    `<image href="${logoDataUrl}" x="${logoX}" y="${logoX}" width="${markSize}" height="${markSize}" preserveAspectRatio="xMidYMid meet"/>`,
  ].join("");

  return new Blob([original.replace("</svg>", `${logoTag}</svg>`)], { type: "image/svg+xml" });
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

async function refresh() {
  const currentRefresh = ++refreshId;
  const value = input.value.trim();

  if (!value) {
    revokeDownloads();
    preview.removeAttribute("src");
    downloadPng.removeAttribute("href");
    downloadSvg.removeAttribute("href");
    statusText.textContent = "Enter text or a URL.";
    setDisabled(true);
    return;
  }

  const pngUrl = params("png");
  const svgUrl = params("svg");

  try {
    revokeDownloads();

    if (!logoDataUrl) {
      preview.src = pngUrl;
      downloadPng.href = pngUrl;
      downloadSvg.href = svgUrl;
      statusText.textContent = "Static code generated. No expiration is embedded.";
      setDisabled(false);
      return;
    }

    const [pngBlob, svgBlob] = await Promise.all([buildLogoPng(pngUrl), buildLogoSvg(svgUrl)]);

    if (currentRefresh !== refreshId) {
      return;
    }

    pngObjectUrl = URL.createObjectURL(pngBlob);
    svgObjectUrl = URL.createObjectURL(svgBlob);
    preview.src = pngObjectUrl;
    downloadPng.href = pngObjectUrl;
    downloadSvg.href = svgObjectUrl;
    statusText.textContent = "Logo QR generated with high error correction.";
    setDisabled(false);
  } catch (error) {
    if (currentRefresh !== refreshId) {
      return;
    }

    statusText.textContent = error.message || "Could not generate this QR code.";
    setDisabled(true);
  }
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

logo.addEventListener("change", async () => {
  const file = logo.files?.[0];

  if (!file) {
    return;
  }

  try {
    logoDataUrl = await fileToDataUrl(file);
    removeLogo.hidden = false;
    level.value = "H";
    syncLevelButtons();
    scheduleRefresh();
  } catch {
    logoDataUrl = "";
    logo.value = "";
    removeLogo.hidden = true;
    statusText.textContent = "Could not load that logo file.";
  }
});

removeLogo.addEventListener("click", () => {
  logoDataUrl = "";
  logo.value = "";
  removeLogo.hidden = true;
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
