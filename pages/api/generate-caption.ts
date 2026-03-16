import type { NextApiRequest, NextApiResponse } from "next";

type CaptionResponse =
  | { success: true; caption: string; hashtags: string[] }
  | { success: false; error: string };

type OpenAIResponse = {
  choices: { message: { content: string } }[];
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CaptionResponse>,
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Use POST." });
  }

  const body = req.body as { prompt?: string; style?: string };
  const prompt = cleanText(body.prompt);
  const style = cleanText(body.style) || "artistic";

  if (!prompt) {
    return res.status(400).json({ success: false, error: "Missing prompt." });
  }

  const userMessage =
    `Write an Instagram caption and hashtags for this AI-generated image.\n` +
    `Style: ${style}\n` +
    `Image: ${prompt}\n\n` +
    `Reply in EXACTLY this format on one line:\n` +
    `CAPTION: [2 punchy sentences with 2-3 emojis] | HASHTAGS: #tag1 #tag2 #tag3 #tag4 #tag5 #tag6 #tag7 #tag8 #tag9 #tag10 #tag11 #tag12 #tag13 #tag14 #tag15 #tag16 #tag17 #tag18 #tag19 #tag20`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const response = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      return res.status(502).json({ success: false, error: "Text generation failed." });
    }

    const json = (await response.json()) as OpenAIResponse;
    const content = json.choices?.[0]?.message?.content?.trim() ?? "";

    // Parse CAPTION and HASHTAGS — split on " | " or newlines
    const normalized = content.replace(/\n/g, " | ");

    const captionMatch = normalized.match(/CAPTION:\s*(.+?)(?:\s*\|\s*HASHTAGS:|$)/i);
    const hashtagsMatch = normalized.match(/HASHTAGS:\s*(.+)/i);

    const caption = captionMatch?.[1]?.trim() ?? content.split("|")[0]?.trim() ?? "Stunning visual. ✨";
    const hashtagsRaw = hashtagsMatch?.[1]?.trim() ?? "";

    const hashtags = hashtagsRaw
      .split(/\s+/)
      .map((h) => (h.startsWith("#") ? h : `#${h}`))
      .filter((h) => h.length > 1)
      .slice(0, 20);

    return res.status(200).json({ success: true, caption, hashtags });
  } catch (err) {
    const msg = err instanceof Error && err.name === "AbortError"
      ? "Caption generation timed out. Try again."
      : "Caption generation failed.";
    return res.status(500).json({ success: false, error: msg });
  }
}
