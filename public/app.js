const input = document.querySelector("#qr-input");
const level = document.querySelector("#level");
const margin = document.querySelector("#margin");
const size = document.querySelector("#size");
const dark = document.querySelector("#dark");
const light = document.querySelector("#light");
const gradient = document.querySelector("#gradient");
const accent = document.querySelector("#accent");
const transparent = document.querySelector("#transparent");
const bodyShape = document.querySelector("#body-shape");
const outerEyeShape = document.querySelector("#outer-eye-shape");
const innerEyeShape = document.querySelector("#inner-eye-shape");
const logo = document.querySelector("#logo");
const removeLogo = document.querySelector("#remove-logo");
const preview = document.querySelector("#qr-preview");
const statusText = document.querySelector("#status");
const downloadPng = document.querySelector("#download-png");
const downloadSvg = document.querySelector("#download-svg");
const simplify = document.querySelector("#simplify");
const themeToggle = document.querySelector("#theme-toggle");
const shell = document.querySelector(".site-shell");
const preset = document.querySelector("#preset");
const levelButtons = Array.from(document.querySelectorAll("[data-level]"));
const modeButtons = Array.from(document.querySelectorAll("[data-mode]"));
const singlePanels = Array.from(document.querySelectorAll(".single-panel"));
const hubPanels = Array.from(document.querySelectorAll(".hub-panel"));
const identifyPanels = Array.from(document.querySelectorAll(".identify-panel"));
const hubInputs = {
  website: document.querySelector("#hub-website"),
  facebook: document.querySelector("#hub-facebook"),
  instagram: document.querySelector("#hub-instagram"),
  menu: document.querySelector("#hub-menu"),
  contact: document.querySelector("#hub-contact"),
};
const identifyFile = document.querySelector("#identify-file");
const identifyDropzone = document.querySelector("#identify-dropzone");
const startCamera = document.querySelector("#start-camera");
const stopCamera = document.querySelector("#stop-camera");
const scannerVideo = document.querySelector("#scanner-video");
const decodedResult = document.querySelector("#decoded-result");
const identifyResult = document.querySelector(".identify-result");
const useDecoded = document.querySelector("#use-decoded");
const openDecoded = document.querySelector("#open-decoded");
const copyDecoded = document.querySelector("#copy-decoded");
const levelIndexes = { L: 0, M: 1, Q: 2, H: 3 };
const MATRIX_UNAVAILABLE = "MATRIX_UNAVAILABLE";

const presets = {
  minimal: {
    dark: "#111827",
    light: "#ffffff",
    accent: "#64748b",
    gradient: false,
    level: "M",
    margin: 2,
    size: 512,
    bodyShape: "square",
    outerEyeShape: "square",
    innerEyeShape: "square",
  },
  japanese: {
    dark: "#1f2933",
    light: "#fff7ed",
    accent: "#dc2626",
    gradient: true,
    level: "Q",
    margin: 3,
    size: 768,
    bodyShape: "rounded",
    outerEyeShape: "rounded",
    innerEyeShape: "circle",
  },
  luxury: {
    dark: "#17120b",
    light: "#fbf7ed",
    accent: "#b68a2c",
    gradient: true,
    level: "Q",
    margin: 3,
    size: 768,
    bodyShape: "diamond",
    outerEyeShape: "rounded",
    innerEyeShape: "diamond",
  },
  cyberpunk: {
    dark: "#09090b",
    light: "#f8fafc",
    accent: "#06b6d4",
    gradient: true,
    level: "H",
    margin: 3,
    size: 768,
    bodyShape: "bars",
    outerEyeShape: "square",
    innerEyeShape: "square",
  },
  corporate: {
    dark: "#0f172a",
    light: "#f8fafc",
    accent: "#2563eb",
    gradient: true,
    level: "M",
    margin: 3,
    size: 768,
    bodyShape: "square",
    outerEyeShape: "rounded",
    innerEyeShape: "square",
  },
  event: {
    dark: "#261326",
    light: "#fff7fb",
    accent: "#d946ef",
    gradient: true,
    level: "Q",
    margin: 3,
    size: 768,
    bodyShape: "dots",
    outerEyeShape: "circle",
    innerEyeShape: "circle",
  },
  wedding: {
    dark: "#3f342c",
    light: "#fffaf5",
    accent: "#d4a373",
    gradient: true,
    level: "Q",
    margin: 4,
    size: 768,
    bodyShape: "rounded",
    outerEyeShape: "circle",
    innerEyeShape: "diamond",
  },
};

let mode = "single";
let debounceTimer;
let refreshId = 0;
let logoDataUrl = "";
let pngObjectUrl = "";
let svgObjectUrl = "";
let scannerStream;
let scannerFrame;
let decodedText = "";

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

function encodeHubData(data) {
  const json = JSON.stringify(data);
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function getHubLinks() {
  return Object.fromEntries(
    Object.entries(hubInputs)
      .map(([key, element]) => [key, element.value.trim()])
      .filter(([, value]) => value),
  );
}

function getHubUrl() {
  const payload = {
    preset: preset.value,
    links: getHubLinks(),
  };
  return `${location.origin}/hub.html#data=${encodeHubData(payload)}`;
}

function getQrData() {
  if (mode === "hub") {
    return getHubUrl();
  }

  return input.value.trim();
}

function shouldRenderClientSide() {
  return true;
}

function params(format) {
  const search = new URLSearchParams({
    format,
    data: getQrData(),
    level: level.value,
    margin: margin.value,
    width: size.value,
    dark: shouldRenderClientSide() ? "#000000" : dark.value,
    light: shouldRenderClientSide() ? "#ffffff" : light.value,
  });

  return `/api/qr?${search.toString()}`;
}

function matrixParams() {
  const search = new URLSearchParams({
    data: getQrData(),
    level: level.value,
  });

  return `/api/qr-matrix?${search.toString()}`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function hexToRgb(hex) {
  const value = (hex || "#ffffff").replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function logoRatio() {
  const ratios = { L: 0.12, M: 0.16, Q: 0.2, H: 0.24 };
  return ratios[level.value] || ratios.H;
}

async function fetchMatrix() {
  const response = await fetch(matrixParams());

  if (!response.ok) {
    const error = new Error("Styled QR rendering is unavailable on this server.");
    error.code = MATRIX_UNAVAILABLE;
    throw error;
  }

  return response.json();
}

function isFinderModule(x, y, matrixSize) {
  const inTop = y < 7;
  const inLeft = x < 7;
  const inRight = x >= matrixSize - 7;
  const inBottom = y >= matrixSize - 7;

  return (inTop && inLeft) || (inTop && inRight) || (inBottom && inLeft);
}

function roundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function drawCanvasShape(context, shape, x, y, unit) {
  if (shape === "dots") {
    context.beginPath();
    context.arc(x + unit / 2, y + unit / 2, unit * 0.42, 0, Math.PI * 2);
    context.fill();
    return;
  }

  if (shape === "rounded") {
    roundedRect(context, x + unit * 0.08, y + unit * 0.08, unit * 0.84, unit * 0.84, unit * 0.22);
    context.fill();
    return;
  }

  if (shape === "diamond") {
    context.beginPath();
    context.moveTo(x + unit / 2, y + unit * 0.04);
    context.lineTo(x + unit * 0.96, y + unit / 2);
    context.lineTo(x + unit / 2, y + unit * 0.96);
    context.lineTo(x + unit * 0.04, y + unit / 2);
    context.closePath();
    context.fill();
    return;
  }

  if (shape === "bars") {
    roundedRect(context, x + unit * 0.2, y, unit * 0.6, unit, unit * 0.22);
    context.fill();
    return;
  }

  context.fillRect(x, y, unit, unit);
}

function clearCanvasArea(context, x, y, width, height, shape = "square", radius = 0) {
  context.save();
  if (shape === "circle") {
    context.beginPath();
    context.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2);
    context.clip();
  } else if (shape === "rounded") {
    roundedRect(context, x, y, width, height, radius);
    context.clip();
  }

  if (transparent.checked) {
    context.clearRect(x - 1, y - 1, width + 2, height + 2);
  } else {
    context.fillStyle = light.value || "#ffffff";
    context.fillRect(x - 1, y - 1, width + 2, height + 2);
  }
  context.restore();
}

function drawCanvasEye(context, startX, startY, unit, codeFill) {
  const x = startX * unit;
  const y = startY * unit;
  const outer = outerEyeShape.value;
  const inner = innerEyeShape.value;

  context.fillStyle = codeFill;
  if (outer === "circle") {
    context.beginPath();
    context.arc(x + unit * 3.5, y + unit * 3.5, unit * 3.5, 0, Math.PI * 2);
    context.fill();
    clearCanvasArea(context, x + unit, y + unit, unit * 5, unit * 5, "circle");
  } else if (outer === "rounded") {
    roundedRect(context, x, y, unit * 7, unit * 7, unit * 1.35);
    context.fill();
    clearCanvasArea(context, x + unit, y + unit, unit * 5, unit * 5, "rounded", unit * 0.9);
  } else {
    context.fillRect(x, y, unit * 7, unit * 7);
    clearCanvasArea(context, x + unit, y + unit, unit * 5, unit * 5);
  }

  context.fillStyle = codeFill;
  if (inner === "circle") {
    context.beginPath();
    context.arc(x + unit * 3.5, y + unit * 3.5, unit * 1.5, 0, Math.PI * 2);
    context.fill();
  } else if (inner === "diamond") {
    context.beginPath();
    context.moveTo(x + unit * 3.5, y + unit * 2);
    context.lineTo(x + unit * 5, y + unit * 3.5);
    context.lineTo(x + unit * 3.5, y + unit * 5);
    context.lineTo(x + unit * 2, y + unit * 3.5);
    context.closePath();
    context.fill();
  } else {
    context.fillRect(x + unit * 2, y + unit * 2, unit * 3, unit * 3);
  }
}

async function buildStyledPng() {
  const matrix = await fetchMatrix();
  const canvas = document.createElement("canvas");
  const canvasSize = Number(size.value) || 512;
  const context = canvas.getContext("2d");
  const quietZone = Math.min(8, Math.max(0, Number(margin.value) || 0));
  const totalModules = matrix.size + quietZone * 2;
  const unit = canvasSize / totalModules;
  const codeGradient = context.createLinearGradient(0, 0, canvasSize, canvasSize);

  canvas.width = canvasSize;
  canvas.height = canvasSize;
  codeGradient.addColorStop(0, dark.value || "#111827");
  codeGradient.addColorStop(1, gradient.checked ? accent.value || dark.value : dark.value || "#111827");

  context.clearRect(0, 0, canvasSize, canvasSize);
  if (!transparent.checked) {
    context.fillStyle = light.value || "#ffffff";
    context.fillRect(0, 0, canvasSize, canvasSize);
  }

  context.fillStyle = codeGradient;
  for (let y = 0; y < matrix.size; y += 1) {
    for (let x = 0; x < matrix.size; x += 1) {
      if (!matrix.data[y * matrix.size + x] || isFinderModule(x, y, matrix.size)) {
        continue;
      }
      drawCanvasShape(context, bodyShape.value, (x + quietZone) * unit, (y + quietZone) * unit, unit);
    }
  }

  drawCanvasEye(context, quietZone, quietZone, unit, codeGradient);
  drawCanvasEye(context, quietZone + matrix.size - 7, quietZone, unit, codeGradient);
  drawCanvasEye(context, quietZone, quietZone + matrix.size - 7, unit, codeGradient);

  if (logoDataUrl) {
    const logoImage = await loadImage(logoDataUrl);
    const markSize = Math.round(canvasSize * logoRatio());
    const pad = Math.max(8, Math.round(markSize * 0.18));
    const boxSize = markSize + pad * 2;
    const boxX = Math.round((canvasSize - boxSize) / 2);
    const logoX = Math.round((canvasSize - markSize) / 2);

    context.fillStyle = light.value || "#ffffff";
    context.fillRect(boxX, boxX, boxSize, boxSize);
    context.drawImage(logoImage, logoX, logoX, markSize, markSize);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not export the QR code."));
      }
    }, "image/png");
  });
}

function escapeSvg(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character]);
}

function svgShape(shape, x, y, unit, fill) {
  const safeFill = escapeSvg(fill);
  if (shape === "dots") {
    return `<circle cx="${x + unit / 2}" cy="${y + unit / 2}" r="${unit * 0.42}" fill="${safeFill}"/>`;
  }
  if (shape === "rounded") {
    return `<rect x="${x + unit * 0.08}" y="${y + unit * 0.08}" width="${unit * 0.84}" height="${unit * 0.84}" rx="${unit * 0.22}" fill="${safeFill}"/>`;
  }
  if (shape === "diamond") {
    return `<path d="M ${x + unit / 2} ${y + unit * 0.04} L ${x + unit * 0.96} ${y + unit / 2} L ${x + unit / 2} ${y + unit * 0.96} L ${x + unit * 0.04} ${y + unit / 2} Z" fill="${safeFill}"/>`;
  }
  if (shape === "bars") {
    return `<rect x="${x + unit * 0.2}" y="${y}" width="${unit * 0.6}" height="${unit}" rx="${unit * 0.22}" fill="${safeFill}"/>`;
  }
  return `<rect x="${x}" y="${y}" width="${unit}" height="${unit}" fill="${safeFill}"/>`;
}

function svgInnerEye(shape, x, y, unit, fill) {
  const safeFill = escapeSvg(fill);
  if (shape === "circle") {
    return `<circle cx="${x + unit * 3.5}" cy="${y + unit * 3.5}" r="${unit * 1.5}" fill="${safeFill}"/>`;
  }
  if (shape === "diamond") {
    return `<path d="M ${x + unit * 3.5} ${y + unit * 2} L ${x + unit * 5} ${y + unit * 3.5} L ${x + unit * 3.5} ${y + unit * 5} L ${x + unit * 2} ${y + unit * 3.5} Z" fill="${safeFill}"/>`;
  }
  return `<rect x="${x + unit * 2}" y="${y + unit * 2}" width="${unit * 3}" height="${unit * 3}" fill="${safeFill}"/>`;
}

function svgEye(startX, startY, unit, fill, id) {
  const x = startX * unit;
  const y = startY * unit;
  const safeFill = escapeSvg(fill);
  const maskId = `eyeMask${id}`;
  const outer = outerEyeShape.value;
  const cutout = outer === "circle"
    ? `<circle cx="${x + unit * 3.5}" cy="${y + unit * 3.5}" r="${unit * 2.5}" fill="black"/>`
    : `<rect x="${x + unit}" y="${y + unit}" width="${unit * 5}" height="${unit * 5}" rx="${outer === "rounded" ? unit * 0.9 : 0}" fill="black"/>`;
  const outerShape = outer === "circle"
    ? `<circle cx="${x + unit * 3.5}" cy="${y + unit * 3.5}" r="${unit * 3.5}" fill="${safeFill}" mask="url(#${maskId})"/>`
    : `<rect x="${x}" y="${y}" width="${unit * 7}" height="${unit * 7}" rx="${outer === "rounded" ? unit * 1.35 : 0}" fill="${safeFill}" mask="url(#${maskId})"/>`;

  return [
    `<mask id="${maskId}"><rect width="100%" height="100%" fill="black"/>`,
    outer === "circle"
      ? `<circle cx="${x + unit * 3.5}" cy="${y + unit * 3.5}" r="${unit * 3.5}" fill="white"/>`
      : `<rect x="${x}" y="${y}" width="${unit * 7}" height="${unit * 7}" rx="${outer === "rounded" ? unit * 1.35 : 0}" fill="white"/>`,
    cutout,
    `</mask>`,
    outerShape,
    svgInnerEye(innerEyeShape.value, x, y, unit, fill),
  ].join("");
}

async function buildStyledSvg() {
  const matrix = await fetchMatrix();
  const svgSize = Number(size.value) || 512;
  const quietZone = Math.min(8, Math.max(0, Number(margin.value) || 0));
  const totalModules = matrix.size + quietZone * 2;
  const unit = svgSize / totalModules;
  const defs = gradient.checked
    ? `<defs><linearGradient id="qrGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${dark.value || "#111827"}"/><stop offset="100%" stop-color="${accent.value || dark.value || "#111827"}"/></linearGradient></defs>`
    : "";
  const codeFill = gradient.checked ? "url(#qrGradient)" : dark.value || "#111827";
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}" shape-rendering="geometricPrecision">`,
    defs,
  ];

  if (!transparent.checked) {
    parts.push(`<rect width="100%" height="100%" fill="${escapeSvg(light.value || "#ffffff")}"/>`);
  }

  for (let y = 0; y < matrix.size; y += 1) {
    for (let x = 0; x < matrix.size; x += 1) {
      if (!matrix.data[y * matrix.size + x] || isFinderModule(x, y, matrix.size)) {
        continue;
      }
      parts.push(svgShape(bodyShape.value, (x + quietZone) * unit, (y + quietZone) * unit, unit, codeFill));
    }
  }

  parts.push(svgEye(quietZone, quietZone, unit, codeFill, "TopLeft"));
  parts.push(svgEye(quietZone + matrix.size - 7, quietZone, unit, codeFill, "TopRight"));
  parts.push(svgEye(quietZone, quietZone + matrix.size - 7, unit, codeFill, "BottomLeft"));

  if (logoDataUrl) {
    const markSize = svgSize * logoRatio();
    const pad = Math.max(8, markSize * 0.18);
    const boxSize = markSize + pad * 2;
    const boxX = (svgSize - boxSize) / 2;
    const logoX = (svgSize - markSize) / 2;
    const logoTag = [
      `<rect x="${boxX}" y="${boxX}" width="${boxSize}" height="${boxSize}" fill="${light.value || "#ffffff"}"/>`,
      `<image href="${escapeSvg(logoDataUrl)}" x="${logoX}" y="${logoX}" width="${markSize}" height="${markSize}" preserveAspectRatio="xMidYMid meet"/>`,
    ].join("");
    parts.push(logoTag);
  }

  parts.push("</svg>");
  return new Blob([parts.join("")], { type: "image/svg+xml" });
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

function applyPreset(name) {
  const selected = presets[name] || presets.minimal;
  dark.value = selected.dark;
  light.value = selected.light;
  accent.value = selected.accent;
  gradient.checked = selected.gradient;
  level.value = selected.level;
  margin.value = selected.margin;
  size.value = selected.size;
  bodyShape.value = selected.bodyShape;
  outerEyeShape.value = selected.outerEyeShape;
  innerEyeShape.value = selected.innerEyeShape;
  shell.dataset.preset = name;
  syncLevelButtons();
  scheduleRefresh();
}

function setMode(nextMode) {
  mode = nextMode;
  shell.dataset.mode = mode;
  stopScanner();

  modeButtons.forEach((button) => {
    const selected = button.dataset.mode === mode;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  singlePanels.forEach((panel) => {
    panel.hidden = mode !== "single";
  });
  hubPanels.forEach((panel) => {
    panel.hidden = mode !== "hub";
  });
  identifyPanels.forEach((panel) => {
    panel.hidden = mode !== "identify";
  });

  if (mode === "identify") {
    revokeDownloads();
    preview.removeAttribute("src");
    downloadPng.removeAttribute("href");
    downloadSvg.removeAttribute("href");
    statusText.textContent = "Upload a QR image or start the camera.";
    setDisabled(true);
  } else {
    scheduleRefresh();
  }
}

async function refresh() {
  const currentRefresh = ++refreshId;
  const value = getQrData();

  if (mode === "identify") {
    return;
  }

  if (!value) {
    revokeDownloads();
    preview.removeAttribute("src");
    downloadPng.removeAttribute("href");
    downloadSvg.removeAttribute("href");
    statusText.textContent = mode === "hub" ? "Add at least one hub destination." : "Enter text or a URL.";
    setDisabled(true);
    return;
  }

  try {
    revokeDownloads();
    shell.classList.toggle("is-transparent", transparent.checked);

    const [pngBlob, svgBlob] = await Promise.all([buildStyledPng(), buildStyledSvg()]);

    if (currentRefresh !== refreshId) {
      return;
    }

    pngObjectUrl = URL.createObjectURL(pngBlob);
    svgObjectUrl = URL.createObjectURL(svgBlob);
    preview.src = pngObjectUrl;
    downloadPng.href = pngObjectUrl;
    downloadSvg.href = svgObjectUrl;
    statusText.textContent = mode === "hub" ? "Styled QR Hub generated." : "Styled QR generated. Test before printing.";
    setDisabled(false);
  } catch (error) {
    if (currentRefresh !== refreshId) {
      return;
    }

    if (error.code === MATRIX_UNAVAILABLE) {
      const pngUrl = params("png");
      const svgUrl = params("svg");
      preview.src = pngUrl;
      downloadPng.href = pngUrl;
      downloadSvg.href = svgUrl;
      statusText.textContent = "Basic QR generated. Restart the server to enable styled shapes.";
      setDisabled(false);
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

function setDecodedResult(text) {
  decodedText = text;
  decodedResult.textContent = text;
  identifyResult.hidden = false;
  openDecoded.href = /^https?:\/\//i.test(text) ? text : `https://www.google.com/search?q=${encodeURIComponent(text)}`;
  statusText.textContent = "QR code identified.";
}

async function decodeCanvas(canvas) {
  if ("BarcodeDetector" in window) {
    try {
      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      const results = await detector.detect(canvas);
      if (results[0]?.rawValue) {
        return results[0].rawValue;
      }
    } catch {
      // Fall through to jsQR.
    }
  }

  const context = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const result = window.jsQR?.(imageData.data, imageData.width, imageData.height);
  return result?.data || "";
}

async function decodeImageFile(file) {
  const image = await loadImage(await fileToDataUrl(file));
  const canvas = document.createElement("canvas");
  const maxSize = 1200;
  const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));

  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);

  return decodeCanvas(canvas);
}

function firstImageFile(files) {
  return Array.from(files || []).find((file) => file.type.startsWith("image/"));
}

async function identifyImageFile(file) {
  if (!file) {
    statusText.textContent = "Drop, paste, or upload a QR image.";
    return;
  }

  statusText.textContent = "Reading QR image...";
  try {
    const result = await decodeImageFile(file);

    if (result) {
      setDecodedResult(result);
    } else {
      statusText.textContent = "No QR code found in that image.";
    }
  } catch {
    statusText.textContent = "Could not read that image.";
  }
}

async function scanCameraFrame() {
  if (!scannerStream) {
    return;
  }

  if (scannerVideo.readyState >= 2) {
    const canvas = document.createElement("canvas");
    canvas.width = scannerVideo.videoWidth;
    canvas.height = scannerVideo.videoHeight;
    canvas.getContext("2d").drawImage(scannerVideo, 0, 0, canvas.width, canvas.height);
    const result = await decodeCanvas(canvas);

    if (result) {
      setDecodedResult(result);
      stopScanner();
      return;
    }
  }

  scannerFrame = window.requestAnimationFrame(scanCameraFrame);
}

async function startScanner() {
  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    scannerVideo.srcObject = scannerStream;
    scannerVideo.hidden = false;
    startCamera.hidden = true;
    stopCamera.hidden = false;
    await scannerVideo.play();
    statusText.textContent = "Point the camera at a QR code.";
    scanCameraFrame();
  } catch {
    statusText.textContent = "Camera unavailable. Upload a QR image instead.";
  }
}

function stopScanner() {
  if (scannerFrame) {
    window.cancelAnimationFrame(scannerFrame);
    scannerFrame = undefined;
  }

  if (scannerStream) {
    scannerStream.getTracks().forEach((track) => track.stop());
    scannerStream = undefined;
  }

  scannerVideo.hidden = true;
  scannerVideo.srcObject = null;
  startCamera.hidden = false;
  stopCamera.hidden = true;
}

[input, level, margin, size, dark, light, gradient, accent, transparent, bodyShape, outerEyeShape, innerEyeShape, ...Object.values(hubInputs)].forEach((element) => {
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

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode);
  });
});

document.querySelectorAll("[data-footer-mode]").forEach((link) => {
  link.addEventListener("click", () => {
    setMode(link.dataset.footerMode);
  });
});

preset.addEventListener("change", () => {
  applyPreset(preset.value);
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

identifyFile.addEventListener("change", async () => {
  await identifyImageFile(firstImageFile(identifyFile.files));
});

identifyDropzone.addEventListener("click", () => {
  identifyDropzone.focus();
  statusText.textContent = "Paste a QR image with Ctrl+V, or drag one into the box.";
});

identifyDropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  identifyDropzone.classList.add("is-dragging");
});

identifyDropzone.addEventListener("dragleave", () => {
  identifyDropzone.classList.remove("is-dragging");
});

identifyDropzone.addEventListener("drop", async (event) => {
  event.preventDefault();
  identifyDropzone.classList.remove("is-dragging");
  await identifyImageFile(firstImageFile(event.dataTransfer?.files));
});

identifyDropzone.addEventListener("paste", async (event) => {
  const file = firstImageFile(Array.from(event.clipboardData?.items || [])
    .map((item) => (item.kind === "file" ? item.getAsFile() : undefined))
    .filter(Boolean));

  if (file) {
    event.preventDefault();
    await identifyImageFile(file);
  } else {
    statusText.textContent = "Clipboard does not contain a QR image.";
  }
});

startCamera.addEventListener("click", startScanner);
stopCamera.addEventListener("click", stopScanner);

useDecoded.addEventListener("click", () => {
  input.value = decodedText;
  setMode("single");
});

copyDecoded.addEventListener("click", async () => {
  await navigator.clipboard.writeText(decodedText);
  statusText.textContent = "Decoded result copied.";
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

shell.dataset.preset = preset.value;
shell.dataset.mode = mode;
syncLevelButtons();
refresh();
