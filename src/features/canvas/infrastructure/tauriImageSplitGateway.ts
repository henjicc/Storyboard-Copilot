import { splitImage } from '@/commands/image';

import type { ImageSplitGateway } from '../application/ports';

export const tauriImageSplitGateway: ImageSplitGateway = {
  split: splitImage,
};
