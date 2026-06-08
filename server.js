const http = require("http");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
const publicDir = path.join(__dirname, "public");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload), "application/json; charset=utf-8");
}

function getOptions(searchParams) {
  const errorCorrectionLevel = searchParams.get("level") || "M";
  const margin = Math.min(8, Math.max(0, Number(searchParams.get("margin") || 2)));
  const width = Math.min(2048, Math.max(128, Number(searchParams.get("width") || 512)));
  const dark = searchParams.get("dark") || "#111827";
  const light = searchParams.get("light") || "#ffffff";

  return {
    errorCorrectionLevel,
    margin,
    width,
    color: {
      dark,
      light,
    },
  };
}

async function handleQr(req, res, url) {
  const data = url.searchParams.get("data") || "";
  const format = url.pathname.endsWith(".svg") ? "svg" : "png";

  if (!data.trim()) {
    sendJson(res, 400, { error: "Enter text or a URL to generate a QR code." });
    return;
  }

  try {
    const options = getOptions(url.searchParams);

    if (format === "svg") {
      const svg = await QRCode.toString(data, { ...options, type: "svg" });
      send(res, 200, svg, "image/svg+xml; charset=utf-8");
      return;
    }

    const png = await QRCode.toBuffer(data, { ...options, type: "png" });
    res.writeHead(200, { "Content-Type": "image/png" });
    res.end(png);
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

function serveStatic(req, res, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, "Not found");
      return;
    }

    const type = mimeTypes[path.extname(filePath)] || "application/octet-stream";
    send(res, 200, data, type);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/qr.png" || url.pathname === "/api/qr.svg") {
    handleQr(req, res, url);
    return;
  }

  serveStatic(req, res, url);
});

server.listen(port, host, () => {
  console.log(`Scan by Arxeni running at http://${host}:${port}`);
});
