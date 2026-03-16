// NeonFrame Content Script — Instagram Integration
// Injects a floating button + side panel on instagram.com

const API_BASE = "https://neon-frame-delta.vercel.app";

const STYLES = [
  { id: "cyberpunk",  label: "Cyberpunk",  icon: "⚡", model: "flux",         suffix: "cyberpunk aesthetic, neon lights, dark rainy city, futuristic" },
  { id: "anime",      label: "Anime",      icon: "🌸", model: "flux-anime",   suffix: "anime style, vibrant colors, detailed manga illustration" },
  { id: "realism",    label: "Photo",      icon: "📷", model: "flux-realism", suffix: "photorealistic, ultra detailed, professional photography, cinematic" },
  { id: "3d",         label: "3D/CGI",     icon: "🎮", model: "flux-3d",      suffix: "3D render, CGI, octane render, cinematic lighting" },
  { id: "dark",       label: "Dark",       icon: "🌑", model: "any-dark",     suffix: "dark aesthetic, moody, dramatic lighting, gothic atmosphere" },
  { id: "fantasy",    label: "Fantasy",    icon: "✨", model: "flux",         suffix: "epic fantasy, magical atmosphere, ethereal lighting" },
  { id: "vaporwave",  label: "Vaporwave",  icon: "🌊", model: "flux",         suffix: "vaporwave aesthetic, pastel pink and purple, retro 80s" },
  { id: "minimal",    label: "Minimal",    icon: "◻",  model: "flux",         suffix: "minimalist design, clean aesthetic, elegant" },
  { id: "abstract",   label: "Abstract",   icon: "🔮", model: "flux",         suffix: "abstract art, bold shapes, vivid colors, dynamic" },
  { id: "nature",     label: "Nature",     icon: "🌿", model: "flux-realism", suffix: "nature photography, organic, lush, vibrant natural colors" },
];

const FORMATS = [
  { id: "square",    label: "1:1",  desc: "Post",    w: 20, h: 20, estimate: 15 },
  { id: "four_five", label: "4:5",  desc: "Portrait", w: 16, h: 20, estimate: 18 },
  { id: "story",     label: "9:16", desc: "Story",   w: 11, h: 20, estimate: 25 },
];

const RANDOM_POOL = [
  { styleId: "cyberpunk", format: "square",    prompt: "Neon samurai warrior in a rainy Tokyo alley at midnight" },
  { styleId: "anime",     format: "square",    prompt: "Magical girl floating above a glowing city at night" },
  { styleId: "realism",   format: "four_five", prompt: "Luxury sports car on a rain-soaked mountain road at sunset" },
  { styleId: "3d",        format: "square",    prompt: "Crystal geometric structure floating in deep black space" },
  { styleId: "dark",      format: "square",    prompt: "Cloaked figure standing in a misty gothic cathedral" },
  { styleId: "fantasy",   format: "story",     prompt: "A lone knight before a colossal stone gate at dawn" },
  { styleId: "vaporwave", format: "square",    prompt: "Retro arcade room bathed in pink and purple neon" },
  { styleId: "abstract",  format: "square",    prompt: "Explosion of liquid gold and obsidian in zero gravity" },
];

// ─── State ────────────────────────────────────────────────────────────────────
let selectedStyle = STYLES[0];
let selectedFormat = FORMATS[0];
let currentImageUrl = "";
let isLoading = false;
let timerInterval = null;
let elapsed = 0;

// ─── Inject UI ────────────────────────────────────────────────────────────────
function inject() {
  if (document.getElementById("nf-toggle")) return;

  // Floating toggle button
  const toggle = document.createElement("button");
  toggle.id = "nf-toggle";
  toggle.title = "NeonFrame Generator";
  toggle.textContent = "◈";
  document.body.appendChild(toggle);

  // Side panel
  const panel = document.createElement("div");
  panel.id = "nf-panel";
  panel.innerHTML = buildPanelHTML();
  document.body.appendChild(panel);

  // Toggle logic
  toggle.addEventListener("click", () => {
    const open = panel.classList.toggle("open");
    toggle.classList.toggle("open", open);
  });

  // Close button
  panel.querySelector(".nf-close").addEventListener("click", () => {
    panel.classList.remove("open");
    toggle.classList.remove("open");
  });

  initPanel(panel);
}

// ─── Build panel HTML ─────────────────────────────────────────────────────────
function buildPanelHTML() {
  const styleCards = STYLES.map((s, i) => `
    <button class="nf-style-card${i === 0 ? " active" : ""}" data-style-id="${s.id}" title="${s.label}">
      <span class="nf-style-icon">${s.icon}</span>
      <span class="nf-style-lbl">${s.label}</span>
    </button>`).join("");

  const formatBtns = FORMATS.map((f, i) => `
    <button class="nf-format-btn${i === 0 ? " active" : ""}" data-format-id="${f.id}">
      <div class="nf-ratio-box" style="width:${f.w}px;height:${f.h}px"></div>
      <span class="nf-f-ratio">${f.label}</span>
      <span class="nf-f-desc">${f.desc}</span>
    </button>`).join("");

  return `
    <div class="nf-header">
      <span class="nf-logo">◈ NeonFrame</span>
      <button class="nf-close" title="Close">✕</button>
    </div>
    <div class="nf-body">
      <div>
        <div class="nf-label">Style</div>
        <div class="nf-style-grid">${styleCards}</div>
      </div>
      <div>
        <div class="nf-label">Prompt</div>
        <textarea class="nf-textarea" id="nf-prompt" rows="3" placeholder="Describe your Instagram visual..."></textarea>
      </div>
      <div>
        <div class="nf-label">Format</div>
        <div class="nf-format-row">${formatBtns}</div>
      </div>
      <div class="nf-btn-row">
        <button class="nf-random-btn" id="nf-random" title="Random">🎲</button>
        <button class="nf-generate-btn" id="nf-generate">Generate image</button>
      </div>
      <div class="nf-progress-wrap nf-hidden" id="nf-progress-wrap">
        <div class="nf-progress-bar" id="nf-progress-bar"></div>
      </div>
      <div class="nf-preview" id="nf-preview">
        <div class="nf-preview-empty" id="nf-preview-empty">
          <span class="nf-preview-empty-icon" id="nf-preview-icon">⚡</span>
          <p>Your image will appear here</p>
        </div>
        <img class="nf-preview-img nf-hidden" id="nf-preview-img" alt="Generated" />
      </div>
      <div class="nf-actions nf-hidden" id="nf-actions">
        <button class="nf-action-btn" id="nf-download">↓ Download</button>
        <button class="nf-action-btn" id="nf-copy-img">⎘ Copy image</button>
        <button class="nf-action-btn accent" id="nf-caption-btn">✨ Caption & Hashtags</button>
      </div>
      <div class="nf-caption-result nf-hidden" id="nf-caption-result">
        <div class="nf-caption-block">
          <div class="nf-caption-header">
            <span class="nf-caption-label">Caption</span>
            <button class="nf-copy-small" id="nf-copy-caption">Copy</button>
          </div>
          <p class="nf-caption-text" id="nf-caption-text"></p>
        </div>
        <div class="nf-caption-block">
          <div class="nf-caption-header">
            <span class="nf-caption-label">Hashtags</span>
            <button class="nf-copy-small" id="nf-copy-hashtags">Copy all</button>
          </div>
          <div class="nf-hashtags-wrap" id="nf-hashtags-wrap"></div>
        </div>
      </div>
      <p class="nf-error nf-hidden" id="nf-error"></p>
    </div>`;
}

// ─── Init panel interactions ──────────────────────────────────────────────────
function initPanel(panel) {
  const $ = (id) => panel.querySelector(`#${id}`);

  // Style selection
  panel.querySelectorAll(".nf-style-card").forEach((card) => {
    card.addEventListener("click", () => {
      const s = STYLES.find((x) => x.id === card.dataset.styleId);
      if (!s) return;
      selectedStyle = s;
      panel.querySelectorAll(".nf-style-card").forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      $("nf-preview-icon").textContent = s.icon;
    });
  });

  // Format selection
  panel.querySelectorAll(".nf-format-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const f = FORMATS.find((x) => x.id === btn.dataset.formatId);
      if (!f) return;
      selectedFormat = f;
      panel.querySelectorAll(".nf-format-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // Random
  $("nf-random").addEventListener("click", () => {
    const pick = RANDOM_POOL[Math.floor(Math.random() * RANDOM_POOL.length)];
    const style = STYLES.find((s) => s.id === pick.styleId) ?? STYLES[0];
    const format = FORMATS.find((f) => f.id === pick.format) ?? FORMATS[0];

    $("nf-prompt").value = pick.prompt;
    selectedStyle = style;
    selectedFormat = format;

    panel.querySelectorAll(".nf-style-card").forEach((c) => {
      c.classList.toggle("active", c.dataset.styleId === style.id);
    });
    panel.querySelectorAll(".nf-format-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.formatId === format.id);
    });
    $("nf-preview-icon").textContent = style.icon;

    handleGenerate(panel);
  });

  // Ctrl+Enter
  $("nf-prompt").addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleGenerate(panel);
    }
  });

  // Generate
  $("nf-generate").addEventListener("click", () => handleGenerate(panel));

  // Download
  $("nf-download").addEventListener("click", () => {
    if (!currentImageUrl) return;
    const a = document.createElement("a");
    a.href = currentImageUrl;
    a.download = `neonframe-${selectedStyle.id}-${Date.now()}.png`;
    a.target = "_blank";
    a.click();
  });

  // Copy image
  $("nf-copy-img").addEventListener("click", async () => {
    if (!currentImageUrl) return;
    const btn = $("nf-copy-img");
    try {
      const res = await fetch(currentImageUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      btn.textContent = "✓ Copied!";
      setTimeout(() => { btn.textContent = "⎘ Copy image"; }, 2000);
    } catch {
      btn.textContent = "⚠ Failed";
      setTimeout(() => { btn.textContent = "⎘ Copy image"; }, 2000);
    }
  });

  // Caption
  $("nf-caption-btn").addEventListener("click", async () => {
    const btn = $("nf-caption-btn");
    btn.textContent = "Generating...";
    btn.disabled = true;
    try {
      const res = await fetch(`${API_BASE}/api/generate-caption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: $("nf-prompt").value.trim(), style: selectedStyle.label }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      $("nf-caption-text").textContent = data.caption;
      $("nf-hashtags-wrap").innerHTML = data.hashtags
        .map((h) => `<span class="nf-hashtag">${h}</span>`).join("");
      $("nf-caption-result").classList.remove("nf-hidden");
    } catch {
      showError(panel, "Caption generation failed.");
    } finally {
      btn.textContent = "✨ Regenerate caption";
      btn.disabled = false;
    }
  });

  // Copy caption / hashtags
  $("nf-copy-caption").addEventListener("click", () => {
    copyText($("nf-caption-text").textContent, $("nf-copy-caption"), "Copy", "Copied!");
  });

  $("nf-copy-hashtags").addEventListener("click", () => {
    const tags = [...$("nf-hashtags-wrap").querySelectorAll(".nf-hashtag")]
      .map((el) => el.textContent).join(" ");
    copyText(tags, $("nf-copy-hashtags"), "Copy all", "Copied!");
  });
}

// ─── Generate ─────────────────────────────────────────────────────────────────
async function handleGenerate(panel) {
  const $ = (id) => panel.querySelector(`#${id}`);
  const prompt = $("nf-prompt").value.trim();
  if (!prompt || isLoading) return;

  isLoading = true;
  currentImageUrl = "";
  $("nf-generate").disabled = true;
  $("nf-generate").textContent = "Generating...";
  $("nf-actions").classList.add("nf-hidden");
  $("nf-caption-result").classList.add("nf-hidden");
  $("nf-error").classList.add("nf-hidden");

  // Start timer
  elapsed = 0;
  const progressWrap = $("nf-progress-wrap");
  const progressBar = $("nf-progress-bar");
  progressWrap.classList.remove("nf-hidden");
  progressBar.style.width = "0%";

  timerInterval = setInterval(() => {
    elapsed++;
    const pct = Math.min((elapsed / selectedFormat.estimate) * 100, 92);
    progressBar.style.width = pct + "%";
    $("nf-generate").textContent = `Generating... ${elapsed}s`;
  }, 1000);

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

    $("nf-preview-empty").classList.add("nf-hidden");
    const img = $("nf-preview-img");
    img.src = currentImageUrl;
    img.classList.remove("nf-hidden");
    $("nf-actions").classList.remove("nf-hidden");
  } catch (err) {
    showError(panel, err.message);
  } finally {
    clearInterval(timerInterval);
    progressBar.style.width = "100%";
    setTimeout(() => {
      progressWrap.classList.add("nf-hidden");
      progressBar.style.width = "0%";
    }, 600);
    isLoading = false;
    $("nf-generate").disabled = false;
    $("nf-generate").textContent = "Generate image";
  }
}

function showError(panel, msg) {
  const el = panel.querySelector("#nf-error");
  el.textContent = msg;
  el.classList.remove("nf-hidden");
}

function copyText(text, btn, defaultLabel, successLabel) {
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = successLabel;
    setTimeout(() => { btn.textContent = defaultLabel; }, 2000);
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inject);
} else {
  inject();
}
