import type { NextApiRequest, NextApiResponse } from "next";
import {
  buildPollinationsExternalUrl,
  type InstagramFormat,
} from "../../lib/pollinationsService";

const ALLOWED_TYPES: InstagramFormat[] = ["square", "four_five", "story"];

function getSingleQueryParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, error: "Method not allowed. Use GET." });
  }

  const prompt = getSingleQueryParam(req.query.prompt).trim();
  const format = getSingleQueryParam(req.query.format).trim() as InstagramFormat;
  const model = getSingleQueryParam(req.query.model).trim() || "flux";
  const mode = getSingleQueryParam(req.query.mode).trim() || "artistic";

  if (!prompt) {
    return res.status(400).json({ success: false, error: "Missing prompt." });
  }

  if (!ALLOWED_TYPES.includes(format)) {
    return res.status(400).json({ success: false, error: "Invalid format." });
  }

  const upstreamUrl = buildPollinationsExternalUrl({
    prompt,
    format,
    model,
    mode,
  });

  const apiKey = process.env.POLLINATIONS_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ success: false, error: "Missing POLLINATIONS_API_KEY in server environment." });
  }

  // Retry on provider throttling/transient failures.
  let lastStatus = 500;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(upstreamUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "image/*",
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      lastStatus = response.status;

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "image/png";
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "private, no-store");
        return res.status(200).send(buffer);
      }

      if (response.status === 429 || response.status >= 500) {
        await sleep(700 * attempt);
        continue;
      }

      const details = await response.text().catch(() => "");
      return res.status(502).json({
        success: false,
        error: `Pollinations upstream error (${response.status}). ${details || "No details."}`,
      });
    } catch {
      await sleep(700 * attempt);
    }
  }

  return res.status(502).json({
    success: false,
    error: `Pollinations unavailable after retries (last status: ${lastStatus}).`,
  });
}
