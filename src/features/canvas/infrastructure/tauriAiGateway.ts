import { generateImage, setApiKey } from '@/commands/ai';

import type { AiGateway, GenerateImagePayload } from '../application/ports';

export const tauriAiGateway: AiGateway = {
  setApiKey,
  generateImage: async (payload: GenerateImagePayload) =>
    await generateImage({
      prompt: payload.prompt,
      model: payload.model,
      size: payload.size,
      aspect_ratio: payload.aspectRatio,
      reference_images: payload.referenceImages,
    }),
};
