import Head from "next/head";
import { FormEvent, useEffect, useRef, useState, useMemo } from "react";

type Lang = "en" | "fr";
type InstagramFormat = "square" | "four_five" | "story";
type StylePreset = {
  id: string; label: string; icon: string; model: string;
  desc: { en: string; fr: string }; promptSuffix: string;
};
type ApiSuccessResponse = { success: true; imageUrl: string };
type ApiErrorResponse = { success: false; error: string };
type ApiResponse = ApiSuccessResponse | ApiErrorResponse;
type CaptionResponse =
  | { success: true; caption: string; hashtags: string[] }
  | { success: false; error: string };

const MAX_CHARS = 500;
const MAX_HISTORY = 8;
const HISTORY_KEY = "ig_prompt_history";

// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  en: {
    heroTitle: "AI Image Generator for Instagram",
    heroDesc: "Pick a visual style, describe your idea, and generate professional-quality images ready to post — powered by the best open-source AI models.",
    heroTip: "No account required · Free to use",
    styleLabel: "Visual style",
    promptLabel: "Your prompt",
    promptPlaceholder: "Describe the image you want to create...",
    promptHint: "Be specific: subject, mood, lighting, colors, composition.",
    formatLabel: "Instagram format",
    formatSquare: "Square", formatFourFive: "Portrait", formatStory: "Story",
    generateBtn: "Generate image",
    generating: "Generating",
    randomBtn: "🎲 Random",
    regenerate: "Regenerate",
    download: "Download",
    preview: "Preview",
    emptyPreview: "Your image will appear here",
    styleModel: "Model",
    recent: "Recent prompts",
    clearHistory: "Clear",
    captionBtn: "✨ Generate caption & hashtags",
    captionGenerating: "Generating caption...",
    captionTitle: "Caption",
    hashtagsTitle: "Hashtags",
    copy: "Copy", copied: "Copied!",
    copyAll: "Copy all",
    footerPowered: "Powered by Pollinations AI",
    footerMade: "Made by",
    errorEmpty: "Please enter a prompt before generating.",
    errorFallback: "An error occurred. Please try again.",
    errorRateLimit: "Too many requests. Wait a moment.",
    imageError: "Image could not be loaded. Try regenerating.",
  },
  fr: {
    heroTitle: "Générateur d'images IA pour Instagram",
    heroDesc: "Choisis un style visuel, décris ton idée, et génère des images de qualité professionnelle prêtes à publier — propulsé par les meilleurs modèles IA open-source.",
    heroTip: "Aucun compte requis · Gratuit",
    styleLabel: "Style visuel",
    promptLabel: "Ton prompt",
    promptPlaceholder: "Décris l'image que tu veux créer...",
    promptHint: "Sois précis : sujet, ambiance, lumière, couleurs, composition.",
    formatLabel: "Format Instagram",
    formatSquare: "Carré", formatFourFive: "Portrait", formatStory: "Story",
    generateBtn: "Générer l'image",
    generating: "Génération",
    randomBtn: "🎲 Aléatoire",
    regenerate: "Régénérer",
    download: "Télécharger",
    preview: "Aperçu",
    emptyPreview: "Ton image apparaîtra ici",
    styleModel: "Modèle",
    recent: "Prompts récents",
    clearHistory: "Effacer",
    captionBtn: "✨ Générer caption & hashtags",
    captionGenerating: "Génération de la caption...",
    captionTitle: "Caption",
    hashtagsTitle: "Hashtags",
    copy: "Copier", copied: "Copié !",
    copyAll: "Tout copier",
    footerPowered: "Powered by Pollinations AI",
    footerMade: "Créé par",
    errorEmpty: "Entre un prompt avant de générer.",
    errorFallback: "Une erreur est survenue. Réessaie.",
    errorRateLimit: "Trop de requêtes. Patiente un instant.",
    imageError: "Impossible de charger l'image. Réessaie.",
  },
} as const;

// ─── Style presets ────────────────────────────────────────────────────────────
const STYLE_PRESETS: StylePreset[] = [
  { id: "cyberpunk", label: "Cyberpunk", icon: "⚡", model: "flux",
    desc: { en: "Neon, dark city, futuristic", fr: "Néon, ville sombre, futuriste" },
    promptSuffix: "cyberpunk aesthetic, neon lights, dark rainy city, futuristic, synthwave colors, high contrast" },
  { id: "anime", label: "Anime", icon: "🌸", model: "flux-anime",
    desc: { en: "Japanese illustration", fr: "Illustration japonaise" },
    promptSuffix: "anime style, vibrant colors, detailed manga illustration, beautiful composition" },
  { id: "realism", label: "Photo", icon: "📷", model: "flux-realism",
    desc: { en: "Ultra realistic", fr: "Ultra réaliste" },
    promptSuffix: "photorealistic, ultra detailed, professional photography, cinematic, 8K resolution" },
  { id: "3d", label: "3D / CGI", icon: "🎮", model: "flux-3d",
    desc: { en: "Cinematic 3D render", fr: "Rendu 3D cinématique" },
    promptSuffix: "3D render, CGI, octane render, ultra detailed, cinematic lighting, studio quality" },
  { id: "dark", label: "Dark", icon: "🌑", model: "any-dark",
    desc: { en: "Gothic, moody, mysterious", fr: "Sombre, gothique, mystérieux" },
    promptSuffix: "dark aesthetic, moody, dramatic lighting, gothic atmosphere, deep shadows" },
  { id: "fantasy", label: "Fantasy", icon: "✨", model: "flux",
    desc: { en: "Magical, epic worlds", fr: "Monde magique, épique" },
    promptSuffix: "epic fantasy, magical atmosphere, ethereal lighting, highly detailed digital art" },
  { id: "vaporwave", label: "Vaporwave", icon: "🌊", model: "flux",
    desc: { en: "Retro 80s, pastel, dreamlike", fr: "Rétro 80s, pastel, dreamlike" },
    promptSuffix: "vaporwave aesthetic, pastel pink and purple, retro 80s, dreamlike surreal, glitch art" },
  { id: "minimal", label: "Minimal", icon: "◻", model: "flux",
    desc: { en: "Clean, elegant, premium", fr: "Épuré, élégant, premium" },
    promptSuffix: "minimalist design, clean aesthetic, simple geometric composition, elegant, premium" },
  { id: "abstract", label: "Abstract", icon: "🔮", model: "flux",
    desc: { en: "Bold shapes, vivid colors", fr: "Formes audacieuses, couleurs vives" },
    promptSuffix: "abstract art, bold shapes, vivid colors, dynamic composition, artistic" },
  { id: "nature", label: "Nature", icon: "🌿", model: "flux-realism",
    desc: { en: "Organic, lush, serene", fr: "Organique, naturel, serein" },
    promptSuffix: "nature photography, organic, lush, vibrant natural colors, macro detail, serene" },
];

// ─── Random pool ──────────────────────────────────────────────────────────────
const RANDOM_POOL: { styleId: string; format: InstagramFormat; prompt: string }[] = [
  { styleId: "cyberpunk", format: "square", prompt: "Neon samurai warrior in a rainy Tokyo alley at midnight" },
  { styleId: "cyberpunk", format: "four_five", prompt: "Hacker in a dark room surrounded by holographic screens" },
  { styleId: "cyberpunk", format: "story", prompt: "Futuristic megacity skyline with flying cars and neon billboards" },
  { styleId: "anime", format: "square", prompt: "Magical girl floating above a glowing city at night" },
  { styleId: "anime", format: "story", prompt: "Ancient dragon soaring above a japanese shrine at sunrise" },
  { styleId: "realism", format: "four_five", prompt: "Luxury sports car on a rain-soaked mountain road at sunset" },
  { styleId: "realism", format: "square", prompt: "Serene lake at golden hour with mountains perfectly reflected" },
  { styleId: "3d", format: "square", prompt: "Crystal geometric structure floating in deep black space" },
  { styleId: "3d", format: "four_five", prompt: "Futuristic helmet with glowing visor on a dark reflective surface" },
  { styleId: "dark", format: "square", prompt: "Cloaked figure standing in a misty gothic cathedral" },
  { styleId: "dark", format: "story", prompt: "Ancient ruined castle on a cliff during a lightning storm" },
  { styleId: "fantasy", format: "square", prompt: "Giant luminous tree in the center of an enchanted forest" },
  { styleId: "fantasy", format: "story", prompt: "A lone knight standing before a colossal stone gate at dawn" },
  { styleId: "vaporwave", format: "square", prompt: "Retro arcade room bathed in pink and purple neon light" },
  { styleId: "minimal", format: "square", prompt: "Single glowing orb on a matte black infinite surface" },
  { styleId: "abstract", format: "square", prompt: "Explosion of liquid gold and obsidian in zero gravity" },
  { styleId: "abstract", format: "story", prompt: "Electric fractal patterns in deep violet and electric blue" },
  { styleId: "nature", format: "square", prompt: "Macro close-up of morning dewdrops on a spiderweb" },
  { styleId: "nature", format: "four_five", prompt: "Misty bamboo forest at dawn, soft light filtering through" },
];

const PROMPT_EXAMPLES: Record<string, string[]> = {
  cyberpunk: ["Neon samurai warrior in a rainy Tokyo alley", "Hacker surrounded by holographic screens", "Futuristic skyline with flying cars and neon signs"],
  anime: ["Magical girl floating above a glowing city", "Dragon soaring above a japanese shrine at sunrise", "Space explorer on an alien planet with two moons"],
  realism: ["Luxury sports car on a rain-soaked mountain road", "Serene lake at golden hour, mountains reflected", "Wolf's eye with a winter forest reflected inside"],
  "3d": ["Crystal geometric structure in deep black space", "Futuristic helmet with glowing visor", "Abstract metallic sculpture, dramatic studio lighting"],
  dark: ["Cloaked figure in a misty gothic cathedral", "Black roses on cracked marble under moonlight", "Ruined castle on a cliff during a lightning storm"],
  fantasy: ["Giant luminous tree in an enchanted forest", "Wizard casting a glowing portal in the mountains", "Knight standing before a colossal stone gate at dawn"],
  vaporwave: ["Retro arcade bathed in pink and purple neon", "Sunset grid with palm trees and a glowing orb", "Dreamlike pastel city with floating platforms"],
  minimal: ["Single glowing orb on a matte black surface", "Gold geometric line art on deep navy blue", "White marble with a single perfect black circle"],
  abstract: ["Explosion of liquid gold and obsidian in zero gravity", "Electric fractal patterns in violet and electric blue", "Flowing neon paint streaks on a black canvas"],
  nature: ["Macro dewdrops on a spiderweb at sunrise", "Misty bamboo forest at dawn, soft light filtering through", "Aerial view of a turquoise lagoon and white sand"],
};

const FORMAT_META: Record<InstagramFormat, { ratio: string; px: string; w: number; h: number }> = {
  square:    { ratio: "1 / 1",  px: "1080×1080", w: 20, h: 20 },
  four_five: { ratio: "4 / 5",  px: "1080×1350", w: 16, h: 20 },
  story:     { ratio: "9 / 16", px: "1080×1920", w: 11, h: 20 },
};

// ─── Estimated duration per format ───────────────────────────────────────────
const FORMAT_ESTIMATE: Record<InstagramFormat, number> = {
  square: 15, four_five: 18, story: 25,
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [lang, setLang] = useState<Lang>("en");
  const t = T[lang];

  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<InstagramFormat>("square");
  const [style, setStyle] = useState<StylePreset>(STYLE_PRESETS[0]);

  const [imageUrl, setImageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);

  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [captionLoading, setCaptionLoading] = useState(false);
  const [captionError, setCaptionError] = useState("");
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);

  const captionRef = useRef<HTMLDivElement>(null);

  const aspectRatio = useMemo(() => FORMAT_META[format].ratio, [format]);
  const examples = PROMPT_EXAMPLES[style.id] ?? [];
  const estimate = FORMAT_ESTIMATE[format];
  const charCount = prompt.length;
  const charColor = charCount > 450 ? "#ef4444" : charCount > 350 ? "#f59e0b" : "#334155";

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored) as string[]);
    } catch {}
  }, []);

  // Elapsed timer during generation
  useEffect(() => {
    if (!isLoading) { setElapsed(0); return; }
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(id);
  }, [isLoading]);

  function addToHistory(p: string) {
    if (!p.trim()) return;
    setHistory((prev) => {
      const next = [p, ...prev.filter((h) => h !== p)].slice(0, MAX_HISTORY);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function clearHistory() {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
  }

  async function generate(
    overridePrompt?: string,
    overrideFormat?: InstagramFormat,
    overrideStyle?: StylePreset,
  ) {
    const p = overridePrompt ?? prompt;
    const f = overrideFormat ?? format;
    const s = overrideStyle ?? style;

    if (!p.trim()) { setError(t.errorEmpty); return; }
    setIsLoading(true);
    setError("");
    setImageUrl("");
    setCaption("");
    setHashtags([]);
    setCaptionError("");

    addToHistory(p);

    try {
      const res = await fetch("/api/generate-instagram-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p, type: f, model: s.model, promptSuffix: s.promptSuffix }),
      });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok || !data.success) {
        const msg = "error" in data ? data.error : t.errorFallback;
        throw new Error(res.status === 429 ? t.errorRateLimit : msg);
      }
      setImageUrl(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorFallback);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerateCaption() {
    setCaptionLoading(true);
    setCaptionError("");
    // Scroll into view immediately so user sees the loading state
    setTimeout(() => captionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    try {
      const res = await fetch("/api/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style: style.label }),
      });
      const data = (await res.json()) as CaptionResponse;
      if (!res.ok || !data.success) throw new Error("error" in data ? data.error : "Failed");
      setCaption(data.caption);
      setHashtags(data.hashtags);
    } catch {
      setCaptionError("Caption generation failed. Try again.");
    } finally {
      setCaptionLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void generate();
  }

  // Ctrl+Enter to generate
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void generate();
    }
  }

  function handleRandom() {
    const pick = RANDOM_POOL[Math.floor(Math.random() * RANDOM_POOL.length)];
    const newStyle = STYLE_PRESETS.find((s) => s.id === pick.styleId) ?? STYLE_PRESETS[0];
    setPrompt(pick.prompt);
    setFormat(pick.format);
    setStyle(newStyle);
    setError("");
    void generate(pick.prompt, pick.format, newStyle);
  }

  function handleDownload() {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `ig-${style.id}-${format}-${Date.now()}.png`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }

  function copyText(text: string, setCopied: (v: boolean) => void) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <Head>
        <title>IG Image Generator — AI visuals for Instagram</title>
        <meta name="description" content="Generate stunning AI images for Instagram. Cyberpunk, anime, 3D, dark, fantasy and more." />
        <meta name="theme-color" content="#080c14" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="IG Gen" />
        <meta property="og:title" content="IG Image Generator" />
        <meta property="og:description" content="Generate AI images for Instagram — cyberpunk, anime, 3D and more." />
      </Head>

      <div className="page">
        {/* HEADER */}
        <header className="header">
          <div className="logo">
            <span className="logoIcon">◈</span>
            <strong>IG Image Generator</strong>
          </div>
          <div className="langToggle">
            <button type="button" className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
            <button type="button" className={lang === "fr" ? "active" : ""} onClick={() => setLang("fr")}>FR</button>
          </div>
        </header>

        {/* HERO */}
        <section className="hero">
          <h1>{t.heroTitle}</h1>
          <p className="heroDesc">{t.heroDesc}</p>
          <span className="heroBadge">{t.heroTip}</span>
        </section>

        {/* MAIN */}
        <main className="main">
          {/* LEFT */}
          <section className="leftPanel">

            {/* Style grid */}
            <div className="card">
              <p className="cardLabel">{t.styleLabel}</p>
              <div className="styleGrid">
                {STYLE_PRESETS.map((s) => (
                  <button key={s.id} type="button"
                    className={`styleCard ${style.id === s.id ? "active" : ""}`}
                    onClick={() => { setStyle(s); setError(""); }}
                    disabled={isLoading} title={s.desc[lang]}>
                    <span className="styleIcon">{s.icon}</span>
                    <span className="styleLabel">{s.label}</span>
                  </button>
                ))}
              </div>
              <p className="styleDesc">{style.desc[lang]} · <span className="modelTag">{style.model}</span></p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="card form">

              {/* Prompt */}
              <div className="fieldGroup">
                <div className="promptHeader">
                  <label className="fieldLabel">{t.promptLabel}</label>
                  <span className="charCount" style={{ color: charColor }}>
                    {charCount}/{MAX_CHARS}
                  </span>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_CHARS) setPrompt(e.target.value);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={t.promptPlaceholder}
                  rows={4}
                  className="promptInput"
                  disabled={isLoading}
                  maxLength={MAX_CHARS}
                />
                <p className="hint">{t.promptHint} · Ctrl+Enter {lang === "en" ? "to generate" : "pour générer"}</p>
              </div>

              {/* Prompt examples */}
              {examples.length > 0 && (
                <div className="examples">
                  {examples.map((ex, i) => (
                    <button key={i} type="button" className="exampleChip"
                      onClick={() => { setPrompt(ex); setError(""); }}
                      disabled={isLoading}>{ex}</button>
                  ))}
                </div>
              )}

              {/* Recent history */}
              {history.length > 0 && (
                <div className="historySection">
                  <div className="historyHeader">
                    <button type="button" className="historyToggle"
                      onClick={() => setShowHistory((v) => !v)}>
                      {t.recent} ({history.length}) {showHistory ? "▲" : "▼"}
                    </button>
                    <button type="button" className="clearBtn" onClick={clearHistory}>
                      {t.clearHistory}
                    </button>
                  </div>
                  {showHistory && (
                    <div className="historyList">
                      {history.map((h, i) => (
                        <button key={i} type="button" className="historyChip"
                          onClick={() => { setPrompt(h); setError(""); }}
                          disabled={isLoading}>{h}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Format */}
              <div className="fieldGroup">
                <label className="fieldLabel">{t.formatLabel}</label>
                <div className="formatButtons">
                  {(["square", "four_five", "story"] as InstagramFormat[]).map((f) => {
                    const m = FORMAT_META[f];
                    return (
                      <button key={f} type="button"
                        className={`formatBtn ${format === f ? "active" : ""}`}
                        onClick={() => setFormat(f)} disabled={isLoading}>
                        <div className="ratioBox" style={{ width: m.w, height: m.h }} />
                        <span className="fRatio">{f === "square" ? "1:1" : f === "four_five" ? "4:5" : "9:16"}</span>
                        <span className="fDesc">{f === "square" ? t.formatSquare : f === "four_five" ? t.formatFourFive : t.formatStory}</span>
                        <span className="fPx">{m.px}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="btnRow">
                <button type="button" className="randomBtn" onClick={handleRandom} disabled={isLoading}>
                  {t.randomBtn}
                </button>
                <button type="submit" className="generateBtn" disabled={isLoading || !prompt.trim()}>
                  {isLoading
                    ? <><span className="spinner" /> {t.generating}… {elapsed}s</>
                    : t.generateBtn}
                </button>
              </div>

              {/* Progress bar */}
              {isLoading && (
                <div className="progressWrap">
                  <div className="progressBar" style={{ width: `${Math.min((elapsed / estimate) * 100, 95)}%` }} />
                  <span className="progressLabel">~{estimate}s {lang === "en" ? "estimated" : "estimé"}</span>
                </div>
              )}
            </form>
          </section>

          {/* RIGHT */}
          <section className="rightPanel">
            <div className="previewHeader">
              <span className="previewTitle">{t.preview}</span>
              <div className="previewActions">
                <button type="button" className="actionBtn"
                  onClick={() => void generate()} disabled={isLoading || !imageUrl}>
                  {t.regenerate}
                </button>
                <button type="button" className="actionBtn primary"
                  onClick={handleDownload} disabled={!imageUrl || isLoading}>
                  {t.download}
                </button>
              </div>
            </div>

            <div className="previewFrame" style={{ aspectRatio }}>
              {isLoading && (
                <div className="loadingOverlay">
                  <div className="loadingDots"><span /><span /><span /></div>
                  <p>{style.icon} {t.generating}… {elapsed}s</p>
                </div>
              )}
              {!isLoading && imageUrl && (
                <img src={imageUrl} alt="Generated visual"
                  onError={() => setError(t.imageError)} />
              )}
              {!isLoading && !imageUrl && !error && (
                <div className="emptyState">
                  <span className="emptyIcon">{style.icon}</span>
                  <p>{t.emptyPreview}</p>
                </div>
              )}
              {!isLoading && error && (
                <div className="emptyState errState">
                  <span className="emptyIcon">⚠</span>
                  <p>{error}</p>
                </div>
              )}
            </div>

            {/* Caption & Hashtags */}
            {imageUrl && !isLoading && (
              <div className="captionSection" ref={captionRef}>
                {!caption && !captionLoading && (
                  <button type="button" className="captionBtn" onClick={() => void handleGenerateCaption()}>
                    {t.captionBtn}
                  </button>
                )}
                {captionLoading && (
                  <div className="captionLoading">
                    <span className="spinner dark" /> {t.captionGenerating}
                  </div>
                )}
                {captionError && <p className="captionErr">{captionError}</p>}
                {caption && (
                  <div className="captionResult">
                    <div className="captionBlock">
                      <div className="captionBlockHeader">
                        <span className="captionBlockLabel">{t.captionTitle}</span>
                        <button type="button" className="copySmallBtn"
                          onClick={() => copyText(caption, setCopiedCaption)}>
                          {copiedCaption ? t.copied : t.copy}
                        </button>
                      </div>
                      <p className="captionText">{caption}</p>
                    </div>
                    {hashtags.length > 0 && (
                      <div className="captionBlock">
                        <div className="captionBlockHeader">
                          <span className="captionBlockLabel">{t.hashtagsTitle}</span>
                          <button type="button" className="copySmallBtn"
                            onClick={() => copyText(hashtags.join(" "), setCopiedHashtags)}>
                            {copiedHashtags ? t.copied : t.copyAll}
                          </button>
                        </div>
                        <div className="hashtagsWrap">
                          {hashtags.map((h, i) => (
                            <span key={i} className="hashtagChip">{h}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        </main>

        {/* FOOTER */}
        <footer className="footer">
          <span>{t.footerMade} <a href="https://www.linkedin.com/in/rodrigue-gbadou/" target="_blank" rel="noopener noreferrer">Rodrigue Gbadou</a></span>
          <span className="sep">·</span>
          <span className="poweredBy">{t.footerPowered}</span>
        </footer>
      </div>

      <style jsx>{`
        :global(*) { box-sizing: border-box; margin: 0; padding: 0; }
        :global(body) {
          font-family: "Segoe UI", system-ui, sans-serif;
          background: #080c14; color: #e2e8f0; min-height: 100vh;
        }
        .page { min-height: 100vh; display: flex; flex-direction: column; }

        /* HEADER */
        .header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 0.85rem 1.5rem;
          border-bottom: 1px solid rgba(0,240,255,0.1);
          background: rgba(8,12,20,0.96); backdrop-filter: blur(12px);
          position: sticky; top: 0; z-index: 10;
        }
        .logo { display: flex; align-items: center; gap: 0.6rem; }
        .logoIcon { font-size: 1.4rem; color: #00f0ff; text-shadow: 0 0 10px #00f0ff; }
        .logo strong { font-size: 0.95rem; color: #f1f5f9; }
        .langToggle { display: flex; border: 1px solid rgba(255,255,255,0.12); border-radius: 999px; overflow: hidden; }
        .langToggle button {
          border: none; background: transparent; padding: 0.35rem 0.75rem;
          cursor: pointer; font-size: 0.75rem; font-weight: 700; color: #64748b; transition: all 0.15s;
        }
        .langToggle button.active { background: #00f0ff; color: #080c14; }

        /* HERO */
        .hero {
          text-align: center; padding: 2.5rem 1.5rem 1.75rem;
          border-bottom: 1px solid rgba(0,240,255,0.07);
          background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,240,255,0.06) 0%, transparent 70%);
        }
        .hero h1 {
          font-size: clamp(1.3rem, 3vw, 1.9rem); font-weight: 800;
          color: #f1f5f9; letter-spacing: -0.02em; margin-bottom: 0.75rem;
        }
        .heroDesc { max-width: 580px; margin: 0 auto 1rem; font-size: 0.88rem; color: #64748b; line-height: 1.65; }
        .heroBadge {
          display: inline-block; font-size: 0.7rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em; color: #00f0ff;
          border: 1px solid rgba(0,240,255,0.25); padding: 0.28rem 0.75rem;
          border-radius: 999px; background: rgba(0,240,255,0.05);
        }

        /* LAYOUT */
        .main {
          display: grid; grid-template-columns: 1fr;
          gap: 1.25rem; padding: 1.25rem;
          max-width: 1280px; margin: 0 auto; width: 100%; flex: 1;
        }
        @media (min-width: 960px) {
          .main { grid-template-columns: 450px 1fr; padding: 1.5rem; gap: 1.5rem; }
        }

        /* CARDS */
        .leftPanel { display: flex; flex-direction: column; gap: 1rem; }
        .card {
          background: rgba(15,20,35,0.8);
          border: 1px solid rgba(0,240,255,0.1);
          border-radius: 16px; padding: 1.25rem;
        }
        .cardLabel {
          font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: #00f0ff; margin-bottom: 0.85rem;
        }

        /* STYLE GRID */
        .styleGrid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.45rem; margin-bottom: 0.7rem; }
        .styleCard {
          display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
          border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.02);
          border-radius: 10px; padding: 0.55rem 0.3rem; cursor: pointer; transition: all 0.15s;
        }
        .styleCard:hover:not(:disabled) { border-color: rgba(0,240,255,0.3); background: rgba(0,240,255,0.05); }
        .styleCard.active { border-color: #00f0ff; background: rgba(0,240,255,0.1); box-shadow: 0 0 10px rgba(0,240,255,0.12); }
        .styleCard:disabled { opacity: 0.4; cursor: not-allowed; }
        .styleIcon { font-size: 1.2rem; }
        .styleLabel { font-size: 0.62rem; font-weight: 600; color: #94a3b8; text-align: center; }
        .styleCard.active .styleLabel { color: #00f0ff; }
        .styleDesc { font-size: 0.73rem; color: #475569; }
        .modelTag {
          font-family: monospace; font-size: 0.68rem; color: #7c3aed;
          background: rgba(124,58,237,0.12); padding: 0.1rem 0.4rem; border-radius: 4px;
        }

        /* FORM */
        .form { display: flex; flex-direction: column; gap: 1rem; }
        .fieldGroup { display: flex; flex-direction: column; gap: 0.4rem; }
        .promptHeader { display: flex; justify-content: space-between; align-items: baseline; }
        .fieldLabel { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #00f0ff; }
        .charCount { font-size: 0.68rem; font-weight: 600; transition: color 0.2s; }
        .promptInput {
          width: 100%; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
          padding: 0.7rem 0.9rem; font: inherit; font-size: 0.88rem;
          color: #e2e8f0; resize: vertical; min-height: 100px;
          transition: border-color 0.2s; line-height: 1.6;
        }
        .promptInput:focus { outline: none; border-color: rgba(0,240,255,0.4); box-shadow: 0 0 0 3px rgba(0,240,255,0.05); }
        .promptInput::placeholder { color: #2d3f55; }
        .hint { font-size: 0.7rem; color: #334155; }

        /* EXAMPLES */
        .examples { display: flex; flex-direction: column; gap: 0.3rem; }
        .exampleChip {
          text-align: left; background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05); border-radius: 8px;
          padding: 0.42rem 0.65rem; font-size: 0.74rem; color: #475569;
          cursor: pointer; transition: all 0.15s;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .exampleChip:hover:not(:disabled) { border-color: rgba(0,240,255,0.2); color: #94a3b8; }
        .exampleChip:disabled { opacity: 0.4; cursor: not-allowed; }

        /* HISTORY */
        .historySection { border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.75rem; }
        .historyHeader { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
        .historyToggle {
          background: none; border: none; font-size: 0.7rem; font-weight: 700;
          color: #475569; cursor: pointer; letter-spacing: 0.06em; text-transform: uppercase;
          transition: color 0.15s;
        }
        .historyToggle:hover { color: #94a3b8; }
        .clearBtn {
          background: none; border: none; font-size: 0.68rem; color: #334155;
          cursor: pointer; transition: color 0.15s;
        }
        .clearBtn:hover { color: #ef4444; }
        .historyList { display: flex; flex-direction: column; gap: 0.3rem; }
        .historyChip {
          text-align: left; background: rgba(124,58,237,0.05);
          border: 1px solid rgba(124,58,237,0.15); border-radius: 8px;
          padding: 0.4rem 0.65rem; font-size: 0.73rem; color: #7c3aed;
          cursor: pointer; transition: all 0.15s;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .historyChip:hover:not(:disabled) { background: rgba(124,58,237,0.1); color: #a78bfa; }
        .historyChip:disabled { opacity: 0.4; cursor: not-allowed; }

        /* FORMAT BUTTONS */
        .formatButtons { display: flex; gap: 0.5rem; }
        .formatBtn {
          flex: 1; border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.02); border-radius: 10px;
          padding: 0.6rem 0.3rem; cursor: pointer;
          display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
          transition: all 0.15s;
        }
        .formatBtn:hover:not(:disabled) { border-color: rgba(0,240,255,0.3); background: rgba(0,240,255,0.05); }
        .formatBtn.active { border-color: #00f0ff; background: rgba(0,240,255,0.1); box-shadow: 0 0 8px rgba(0,240,255,0.1); }
        .formatBtn:disabled { opacity: 0.4; cursor: not-allowed; }
        .ratioBox {
          border: 1.5px solid currentColor; border-radius: 2px;
          color: #475569; background: rgba(255,255,255,0.03);
        }
        .formatBtn.active .ratioBox { color: #00f0ff; background: rgba(0,240,255,0.1); }
        .fRatio { font-size: 0.88rem; font-weight: 800; color: #f1f5f9; }
        .formatBtn.active .fRatio { color: #00f0ff; }
        .fDesc { font-size: 0.6rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
        .fPx { font-size: 0.58rem; color: #334155; }

        /* BUTTON ROW */
        .btnRow { display: flex; gap: 0.6rem; }
        .randomBtn {
          padding: 0.78rem 1rem; border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.04); border-radius: 10px;
          font-size: 0.82rem; font-weight: 700; color: #94a3b8;
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .randomBtn:hover:not(:disabled) { border-color: rgba(255,255,255,0.25); color: #e2e8f0; background: rgba(255,255,255,0.07); }
        .randomBtn:disabled { opacity: 0.4; cursor: not-allowed; }
        .generateBtn {
          flex: 1; padding: 0.78rem; border: none; border-radius: 10px;
          background: linear-gradient(135deg, #00f0ff 0%, #7c3aed 100%);
          color: #080c14; font-weight: 800; font-size: 0.88rem;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          transition: opacity 0.2s, transform 0.1s;
        }
        .generateBtn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .generateBtn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        /* PROGRESS */
        .progressWrap {
          position: relative; height: 4px;
          background: rgba(255,255,255,0.06); border-radius: 999px; overflow: visible;
        }
        .progressBar {
          height: 100%; border-radius: 999px;
          background: linear-gradient(90deg, #00f0ff, #7c3aed);
          transition: width 0.8s ease; min-width: 4px;
          box-shadow: 0 0 8px rgba(0,240,255,0.4);
        }
        .progressLabel {
          position: absolute; right: 0; top: 8px;
          font-size: 0.65rem; color: #334155;
        }

        /* SPINNER */
        .spinner {
          width: 14px; height: 14px; border: 2px solid rgba(8,12,20,0.3);
          border-top-color: #080c14; border-radius: 50%;
          animation: spin 0.7s linear infinite; display: inline-block; flex-shrink: 0;
        }
        .spinner.dark {
          border-color: rgba(255,255,255,0.1); border-top-color: #94a3b8;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* RIGHT PANEL */
        .rightPanel { display: flex; flex-direction: column; gap: 0.75rem; }
        .previewHeader { display: flex; justify-content: space-between; align-items: center; }
        .previewTitle { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #475569; }
        .previewActions { display: flex; gap: 0.5rem; }
        .actionBtn {
          border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03);
          border-radius: 8px; padding: 0.38rem 0.8rem; font-size: 0.78rem; color: #64748b;
          cursor: pointer; transition: all 0.15s;
        }
        .actionBtn:hover:not(:disabled) { border-color: rgba(255,255,255,0.2); color: #e2e8f0; }
        .actionBtn.primary { border-color: rgba(0,240,255,0.3); color: #00f0ff; background: rgba(0,240,255,0.05); }
        .actionBtn.primary:hover:not(:disabled) { background: rgba(0,240,255,0.1); }
        .actionBtn:disabled { opacity: 0.35; cursor: not-allowed; }

        /* PREVIEW FRAME */
        .previewFrame {
          width: 100%; background: rgba(12,16,28,0.8);
          border: 1px solid rgba(0,240,255,0.08); border-radius: 16px; overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          max-height: 70vh;
        }
        .previewFrame img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .loadingOverlay { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem; }
        .loadingOverlay p { font-size: 0.82rem; color: #475569; }
        .loadingDots { display: flex; gap: 0.45rem; }
        .loadingDots span {
          width: 9px; height: 9px; border-radius: 50%; background: #00f0ff;
          animation: pulse 1.2s ease-in-out infinite;
        }
        .loadingDots span:nth-child(2) { animation-delay: 0.2s; }
        .loadingDots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes pulse {
          0%, 100% { opacity: 0.15; transform: scale(0.75); }
          50% { opacity: 1; transform: scale(1); }
        }
        .emptyState { display: flex; flex-direction: column; align-items: center; gap: 0.65rem; padding: 3rem 2rem; text-align: center; }
        .emptyIcon { font-size: 2.2rem; color: #1e293b; }
        .emptyState p { font-size: 0.83rem; color: #1e293b; }
        .errState .emptyIcon { color: #7f1d1d; }
        .errState p { color: #fca5a5; }

        /* CAPTION SECTION */
        .captionSection {
          background: rgba(15,20,35,0.8);
          border: 1px solid rgba(0,240,255,0.1);
          border-radius: 14px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;
        }
        .captionBtn {
          width: 100%; padding: 0.7rem; border: 1px solid rgba(0,240,255,0.25);
          background: rgba(0,240,255,0.05); border-radius: 10px;
          font-size: 0.84rem; font-weight: 700; color: #00f0ff;
          cursor: pointer; transition: all 0.15s;
        }
        .captionBtn:hover { background: rgba(0,240,255,0.1); }
        .captionLoading { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #64748b; }
        .captionErr { font-size: 0.78rem; color: #fca5a5; }
        .captionResult { display: flex; flex-direction: column; gap: 0.75rem; }
        .captionBlock { display: flex; flex-direction: column; gap: 0.4rem; }
        .captionBlockHeader { display: flex; justify-content: space-between; align-items: center; }
        .captionBlockLabel { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #475569; }
        .copySmallBtn {
          font-size: 0.68rem; font-weight: 700; color: #00f0ff;
          background: rgba(0,240,255,0.08); border: 1px solid rgba(0,240,255,0.2);
          border-radius: 5px; padding: 0.18rem 0.5rem; cursor: pointer; transition: all 0.15s;
        }
        .copySmallBtn:hover { background: rgba(0,240,255,0.15); }
        .captionText { font-size: 0.83rem; color: #94a3b8; line-height: 1.6; }
        .hashtagsWrap { display: flex; flex-wrap: wrap; gap: 0.35rem; }
        .hashtagChip {
          font-size: 0.72rem; color: #7c3aed; background: rgba(124,58,237,0.1);
          border: 1px solid rgba(124,58,237,0.2); border-radius: 5px; padding: 0.18rem 0.5rem;
        }

        /* FOOTER */
        .footer {
          border-top: 1px solid rgba(255,255,255,0.04);
          padding: 0.85rem 1.5rem; display: flex; align-items: center;
          justify-content: center; gap: 0.6rem; flex-wrap: wrap;
          font-size: 0.75rem; color: #334155;
        }
        .footer a { color: #475569; text-decoration: none; font-weight: 600; transition: color 0.15s; }
        .footer a:hover { color: #94a3b8; }
        .sep { color: #1e293b; }
        .poweredBy { color: #1e293b; font-size: 0.68rem; }
      `}</style>
    </>
  );
}
