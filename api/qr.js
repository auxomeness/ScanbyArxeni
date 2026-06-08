const QRCode = require("qrcode");

function getOptions(query) {
  const errorCorrectionLevel = query.level || "M";
  const margin = Math.min(8, Math.max(0, Number(query.margin || 2)));
  const width = Math.min(2048, Math.max(128, Number(query.width || 512)));
  const dark = query.dark || "#111827";
  const light = query.light || "#ffffff";

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

module.exports = async function handler(req, res) {
  const data = req.query.data || "";
  const format = req.query.format === "svg" ? "svg" : "png";

  if (!data.trim()) {
    res.status(400).json({ error: "Enter text or a URL to generate a QR code." });
    return;
  }

  try {
    const options = getOptions(req.query);

    if (format === "svg") {
      const svg = await QRCode.toString(data, { ...options, type: "svg" });
      res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
      res.status(200).send(svg);
      return;
    }

    const png = await QRCode.toBuffer(data, { ...options, type: "png" });
    res.setHeader("Content-Type", "image/png");
    res.status(200).send(png);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
