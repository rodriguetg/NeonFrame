const API_BASE = "https://neon-frame-delta.vercel.app";
const MAX_CHARS = 500;

const STYLES = [
  { id: "cyberpunk",  label: "Cyberpunk",  icon: "⚡", model: "flux",         desc: "Neon, dark city",       suffix: "cyberpunk aesthetic, neon lights, dark rainy city, futuristic, synthwave colors" },
  { id: "anime",      label: "Anime",      icon: "🌸", model: "flux-anime",   desc: "Japanese illustration", suffix: "anime style, vibrant colors, detailed manga illustration" },
  { id: "realism",    label: "Photo",      icon: "📷", model: "flux-realism", desc: "Ultra realistic",       suffix: "photorealistic, ultra detailed, professional photography, cinematic, 8K" },
  { id: "3d",         label: "3D/CGI",     icon: "🎮", model: "flux-3d",      desc: "Cinematic 3D render",   suffix: "3D render, CGI, octane render, ultra detailed, cinematic lighting" },
  { id: "dark",       label: "Dark",       icon: "🌑", model: "any-dark",     desc: "Gothic, mysterious",    suffix: "dark aesthetic, moody, dramatic lighting, gothic atmosphere" },
  { id: "fantasy",    label: "Fantasy",    icon: "✨", model: "flux",         desc: "Magic, epic worlds",    suffix: "epic fantasy, magical atmosphere, ethereal lighting, detailed digital art" },
  { id: "vaporwave",  label: "Vaporwave",  icon: "🌊", model: "flux",         desc: "Retro 80s, pastel",     suffix: "vaporwave aesthetic, pastel pink and purple, retro 80s, dreamlike" },
  { id: "minimal",    label: "Minimal",    icon: "◻",  model: "flux",         desc: "Clean, elegant",        suffix: "minimalist design, clean aesthetic, simple geometric composition, premium" },
  { id: "abstract",   label: "Abstract",   icon: "🔮", model: "flux",         desc: "Bold shapes, vivid",    suffix: "abstract art, bold shapes, vivid colors, dynamic composition" },
  { id: "nature",     label: "Nature",     icon: "🌿", model: "flux-realism", desc: "Organic, serene",       suffix: "nature photography, organic, lush, vibrant natural colors, macro detail" },
];

const FORMATS = [
  { id: "square",    label: "1:1",  desc: "Post",    w: 20, h: 20, estimate: 15 },
  { id: "four_five", label: "4:5",  desc: "Portrait", w: 16, h: 20, estimate: 18 },
  { id: "story",     label: "9:16", desc: "Story",   w: 11, h: 20, estimate: 25 },
];

const RANDOM_POOL = [
  { styleId: "cyberpunk", format: "square",    prompt: "Neon samurai warrior in a rainy Tokyo alley at midnight" },
  { styleId: "cyberpunk", format: "four_five", prompt: "Hacker in a dark room surrounded by holographic screens" },
  { styleId: "anime",     format: "square",    prompt: "Magical girl floating above a glowing city at night" },
  { styleId: "anime",     format: "story",     prompt: "Dragon soaring above a japanese shrine at sunrise" },
  { styleId: "realism",   format: "four_five", prompt: "Luxury sports car on a rain-soaked mountain road at sunset" },
  { styleId: "3d",        format: "square",    prompt: "Crystal geometric structure floating in deep black space" },
  { styleId: "dark",      format: "square",    prompt: "Cloaked figure standing in a misty gothic cathedral" },
  { styleId: "fantasy",   format: "story",     prompt: "A lone knight standing before a colossal stone gate at dawn" },
  { styleId: "vaporwave", format: "square",    prompt: "Retro arcade room bathed in pink and purple neon light" },
  { styleId: "minimal",   format: "square",    prompt: "Single glowing orb on a matte black infinite surface" },
  { styleId: "abstract",  format: "square",    prompt: "Explosion of liquid gold and obsidian in zero gravity" },
  { styleId: "nature",    format: "four_five", prompt: "Misty bamboo forest at dawn, soft light filtering through" },
];

// ─── State ────────────────────────────────────────────────────────────────────
let selectedStyle = STYLES[0];
let selectedFormat = FORMATS[0];
let currentImageUrl = "";
let isLoading = false;
let elapsed = 0;
let timerInterval = null;

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const styleGrid     = document.getElementById("styleGrid");
const styleDescEl   = document.getElementById("styleDesc");
const formatRow     = document.getElementById("formatRow");
const promptEl      = document.getElementById("prompt");
const charCountEl   = document.getElementById("charCount");
const generateBtn   = document.getElementById("generateBtn");
const randomBtn     = document.getElementById("randomBtn");
const progressWrap  = document.getElementById("progressWrap");
const progressBar   = document.getElementById("progressBar");
const previewWrap   = document.getElementById("previewWrap");
const previewEmpty  = document.getElementById("previewEmpty");
const previewIcon   = document.getElementById("previewIcon");
const previewImg    = document.getElementById("previewImg");
const actions       = document.getElementById("actions");
const downloadBtn   = document.getElementById("downloadBtn");
const copyImgBtn    = document.getElementById("copyImgBtn");
const captionBtn    = document.getElementById("captionBtn");
const captionResult = document.getElementById("captionResult");
const captionText   = document.getElementById("captionText");
const hashtagsWrap  = document.getElementById("hashtagsWrap");
const copyCaptionBtn   = document.getElementById("copyCaptionBtn");
const copyHashtagsBtn  = document.getElementById("copyHashtagsBtn");
const errorMsg      = document.getElementById("errorMsg");

// ─── Build style grid ─────────────────────────────────────────────────────────
STYLES.forEach((s) => {
  const btn = document.createElement("button");
  btn.className = "style-card" + (s.id === selectedStyle.id ? " active" : "");
  btn.innerHTML = `<span class="style-icon">${s.icon}</span><span class="style-lbl">${s.label}</span>`;
  btn.addEventListener("click", () => {
    selectedStyle = s;
    document.querySelectorAll(".style-card").forEach((el) => el.classList.remove("active"));
    btn.classList.add("active");
    styleDescEl.textContent = s.desc;
    previewIcon.textContent = s.icon;
  });
  styleGrid.appendChild(btn);
});
styleDescEl.textContent = selectedStyle.desc;

// ─── Build format buttons ─────────────────────────────────────────────────────
FORMATS.forEach((f) => {
  const btn = document.createElement("button");
  btn.className = "format-btn" + (f.id === selectedFormat.id ? " active" : "");
  btn.innerHTML = `
    <div class="ratio-box" style="width:${f.w}px;height:${f.h}px"></div>
    <span class="f-ratio">${f.label}</span>
    <span class="f-desc">${f.desc}</span>`;
  btn.addEventListener("click", () => {
    selectedFormat = f;
    document.querySelectorAll(".format-btn").forEach((el) => el.classList.remove("active"));
    btn.classList.add("active");
  });
  formatRow.appendChild(btn);
});

// ─── Char counter ─────────────────────────────────────────────────────────────
promptEl.addEventListener("input", () => {
  const len = promptEl.value.length;
  charCountEl.textContent = `${len}/${MAX_CHARS}`;
  charCountEl.style.color = len > 450 ? "#ef4444" : len > 350 ? "#f59e0b" : "#334155";
});

// ─── Ctrl+Enter ───────────────────────────────────────────────────────────────
promptEl.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    handleGenerate();
  }
});

// ─── Random ───────────────────────────────────────────────────────────────────
randomBtn.addEventListener("click", () => {
  const pick = RANDOM_POOL[Math.floor(Math.random() * RANDOM_POOL.length)];
  const style = STYLES.find((s) => s.id === pick.styleId) ?? STYLES[0];
  const format = FORMATS.find((f) => f.id === pick.format) ?? FORMATS[0];

  promptEl.value = pick.prompt;
  charCountEl.textContent = `${pick.prompt.length}/${MAX_CHARS}`;

  selectedStyle = style;
  selectedFormat = format;

  document.querySelectorAll(".style-card").forEach((el, i) => {
    el.classList.toggle("active", STYLES[i].id === style.id);
  });
  document.querySelectorAll(".format-btn").forEach((el, i) => {
    el.classList.toggle("active", FORMATS[i].id === format.id);
  });
  styleDescEl.textContent = style.desc;
  previewIcon.textContent = style.icon;

  handleGenerate();
});

// ─── Generate ─────────────────────────────────────────────────────────────────
generateBtn.addEventListener("click", handleGenerate);

async function handleGenerate() {
  const prompt = promptEl.value.trim();
  if (!prompt || isLoading) return;

  setLoading(true);
  hideError();
  resetCaption();
  currentImageUrl = "";

  try {
    const res = await fetch(`${API_BASE}/api/generate-instagram-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        type: selectedFormat.id,
        model: selectedStyle.model,
        promptSuffix: selectedStyle.suffix,
      }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Generation failed.");

    currentImageUrl = data.imageUrl.startsWith("/")
      ? API_BASE + data.imageUrl
      : data.imageUrl;

    showImage(currentImageUrl);
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

// ─── Download ─────────────────────────────────────────────────────────────────
downloadBtn.addEventListener("click", () => {
  if (!currentImageUrl) return;
  const a = document.createElement("a");
  a.href = currentImageUrl;
  a.download = `neonframe-${selectedStyle.id}-${Date.now()}.png`;
  a.target = "_blank";
  a.click();
});

// ─── Copy image to clipboard ──────────────────────────────────────────────────
copyImgBtn.addEventListener("click", async () => {
  if (!currentImageUrl) return;
  try {
    const res = await fetch(currentImageUrl);
    const blob = await res.blob();
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    copyImgBtn.textContent = "✓ Copied!";
    setTimeout(() => { copyImgBtn.textContent = "⎘ Copy image"; }, 2000);
  } catch {
    copyImgBtn.textContent = "⚠ Failed";
    setTimeout(() => { copyImgBtn.textContent = "⎘ Copy image"; }, 2000);
  }
});

// ─── Generate Caption ─────────────────────────────────────────────────────────
captionBtn.addEventListener("click", async () => {
  captionBtn.textContent = "Generating...";
  captionBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/generate-caption`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: promptEl.value.trim(),
        style: selectedStyle.label,
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    captionText.textContent = data.caption;
    hashtagsWrap.innerHTML = data.hashtags
      .map((h) => `<span class="hashtag">${h}</span>`)
      .join("");

    captionResult.classList.remove("hidden");
  } catch {
    showError("Caption generation failed. Try again.");
  } finally {
    captionBtn.textContent = "✨ Regenerate caption";
    captionBtn.disabled = false;
  }
});

copyCaptionBtn.addEventListener("click", () => {
  copyToClipboard(captionText.textContent, copyCaptionBtn, "Copy", "Copied!");
});

copyHashtagsBtn.addEventListener("click", () => {
  const tags = [...hashtagsWrap.querySelectorAll(".hashtag")].map((el) => el.textContent).join(" ");
  copyToClipboard(tags, copyHashtagsBtn, "Copy all", "Copied!");
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setLoading(loading) {
  isLoading = loading;
  generateBtn.disabled = loading;
  generateBtn.textContent = loading ? "Generating..." : "Generate image";

  if (loading) {
    elapsed = 0;
    progressWrap.classList.remove("hidden");
    progressBar.style.width = "0%";
    timerInterval = setInterval(() => {
      elapsed++;
      const pct = Math.min((elapsed / selectedFormat.estimate) * 100, 92);
      progressBar.style.width = pct + "%";
      generateBtn.textContent = `Generating... ${elapsed}s`;
    }, 1000);
  } else {
    clearInterval(timerInterval);
    progressBar.style.width = "100%";
    setTimeout(() => {
      progressWrap.classList.add("hidden");
      progressBar.style.width = "0%";
    }, 600);
  }
}

function showImage(url) {
  previewEmpty.classList.add("hidden");
  previewImg.src = url;
  previewImg.classList.remove("hidden");
  actions.classList.remove("hidden");
}

function resetCaption() {
  captionResult.classList.add("hidden");
  captionBtn.textContent = "✨ Caption & Hashtags";
  captionBtn.disabled = false;
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove("hidden");
}

function hideError() {
  errorMsg.classList.add("hidden");
}

function copyToClipboard(text, btn, defaultLabel, successLabel) {
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = successLabel;
    setTimeout(() => { btn.textContent = defaultLabel; }, 2000);
  });
}
