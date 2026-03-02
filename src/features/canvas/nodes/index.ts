import type { NodeTypes } from '@xyflow/react';

import { ImageNode } from './ImageNode';
import { StoryboardNode } from './StoryboardNode';
import { UploadNode } from './UploadNode';

export const nodeTypes: NodeTypes = {
  imageNode: ImageNode,
  storyboardNode: StoryboardNode,
  uploadNode: UploadNode,
};

export { ImageNode, StoryboardNode, UploadNode };
