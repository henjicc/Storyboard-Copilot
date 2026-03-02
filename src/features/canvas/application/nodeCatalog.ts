import { canvasNodeDefinitions, getMenuNodeDefinitions } from '../domain/nodeRegistry';
import type { CanvasNodeType } from '../domain/canvasNodes';
import type { NodeCatalog } from './ports';

export const nodeCatalog: NodeCatalog = {
  getDefinition: (type: CanvasNodeType) => canvasNodeDefinitions[type],
  getMenuDefinitions: getMenuNodeDefinitions,
};
