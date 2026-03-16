import type { NextApiRequest, NextApiResponse } from "next";
import {
  generatePollinationsImage,
  type InstagramFormat,
} from "../../lib/pollinationsService";
import { isRateLimited } from "../../lib/rateLimiter";

type GenerateRequestBody = {
  prompt?: string;
  type?: InstagramFormat;
  model?: string;
  promptSuffix?: string;
};

type GenerateSuccessResponse = { success: true; imageUrl: string };
type GenerateErrorResponse = { success: false; error: string };
type GenerateResponse = GenerateSuccessResponse | GenerateErrorResponse;

const ALLOWED_TYPES: InstagramFormat[] = ["square", "four_five", "story"];

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildFinalPrompt(userPrompt: string, styleSuffix: string, format: InstagramFormat): string {
  const formatLabel =
    format === "square" ? "Instagram square post 1:1"
    : format === "four_five" ? "Instagram portrait post 4:5"
    : "Instagram story 9:16";

  const parts = [userPrompt];
  if (styleSuffix) parts.push(styleSuffix);
  parts.push(`${formatLabel}, high resolution, ultra detailed.`);
  parts.push("No text, no letters, no logos, no watermarks. Strong composition, social-media-ready.");

  return parts.join(", ");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateResponse>,
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "unknown").split(",")[0].trim();
  if (isRateLimited(ip)) {
    return res.status(429).json({ success: false, error: "Too many requests. Please wait a moment before generating again." });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Method not allowed. Use POST." });
  }

  const body = (req.body ?? {}) as GenerateRequestBody;
  const userPrompt = cleanText(body.prompt);
  const type = (body.type ?? "square") as InstagramFormat;
  const model = cleanText(body.model) || "flux";
  const promptSuffix = cleanText(body.promptSuffix);

  if (!userPrompt) {
    return res.status(400).json({ success: false, error: "Please provide a prompt." });
  }
  if (!ALLOWED_TYPES.includes(type)) {
    return res.status(400).json({ success: false, error: "Invalid format type." });
  }

  const finalPrompt = buildFinalPrompt(userPrompt, promptSuffix, type);

  const result = await generatePollinationsImage({ prompt: finalPrompt, format: type, model });

  if (!result.success) {
    return res.status(500).json(result);
  }

  return res.status(200).json({ success: true, imageUrl: result.imageUrl });
}
