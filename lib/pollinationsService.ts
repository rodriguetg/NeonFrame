export type InstagramFormat = "square" | "four_five" | "story";

type PollinationsInput = {
  prompt: string;
  format: InstagramFormat;
  model?: string;
  mode?: string;
};

type PollinationsSuccess = {
  success: true;
  imageUrl: string;
};

type PollinationsError = {
  success: false;
  error: string;
};

type PollinationsResult = PollinationsSuccess | PollinationsError;

const POLLINATIONS_IMAGE_ENDPOINT = "https://gen.pollinations.ai/image";

// Add or tweak Instagram format dimensions here when new format variants are needed.
const FORMAT_TO_SIZE: Record<InstagramFormat, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  four_five: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
};

export function getFormatSize(format: InstagramFormat): { width: number; height: number } {
  return FORMAT_TO_SIZE[format];
}

// This builds the direct Pollinations URL used by the server proxy route.
// If Pollinations query parameters evolve, update this function.
export function buildPollinationsExternalUrl({
  prompt,
  format,
  model,
  mode,
}: PollinationsInput): string {
  const { width, height } = FORMAT_TO_SIZE[format];
  const safeSeed = Math.floor(Math.random() * 2_147_483_647) || 1;

  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    // Change the default Pollinations model here if you want a different baseline model.
    model: model || "flux",
    seed: String(safeSeed),
  });

  void mode;

  return `${POLLINATIONS_IMAGE_ENDPOINT}/${encodeURIComponent(prompt)}?${params.toString()}`;
}

// Frontend should load images through our own API route.
// This keeps provider details server-side and allows retries/error handling.
function buildProxyImageUrl({
  prompt,
  format,
  model,
  mode,
}: PollinationsInput): string {
  const params = new URLSearchParams({
    prompt,
    format,
    t: String(Date.now()),
  });

  void model;
  void mode;

  return `/api/pollinations-image?${params.toString()}`;
}

export async function generatePollinationsImage(input: PollinationsInput): Promise<PollinationsResult> {
  try {
    if (!input.prompt.trim()) {
      return {
        success: false,
        error: "Prompt is empty.",
      };
    }

    const imageUrl = buildProxyImageUrl(input);

    return {
      success: true,
      imageUrl,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unexpected error while generating image with Pollinations.",
    };
  }
}
