const shell = document.querySelector(".hub-shell");
const linksEl = document.querySelector("#hub-links");
const emptyEl = document.querySelector("#hub-empty");

const labels = {
  website: "Website",
  facebook: "Facebook",
  instagram: "Instagram",
  menu: "Menu",
  contact: "Contact card",
};

function decodePayload() {
  const value = new URLSearchParams(location.hash.replace(/^#/, "")).get("data");
  if (!value) {
    return {};
  }

  try {
    let normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    normalized += "=".repeat((4 - (normalized.length % 4)) % 4);
    const json = decodeURIComponent(escape(atob(normalized)));
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function normalizeHref(key, value) {
  if (key === "contact" && !/^https?:\/\//i.test(value)) {
    const blob = new Blob([value], { type: "text/vcard" });
    return URL.createObjectURL(blob);
  }

  if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value) || /^tel:/i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

const payload = decodePayload();
const links = payload.links || {};
shell.dataset.preset = payload.preset || "minimal";

Object.entries(links).forEach(([key, value]) => {
  if (!value) {
    return;
  }

  const link = document.createElement("a");
  link.className = "hub-link";
  link.href = normalizeHref(key, value);
  link.textContent = labels[key] || key;
  link.target = "_blank";
  link.rel = "noreferrer";
  linksEl.append(link);
});

emptyEl.hidden = linksEl.children.length > 0;
