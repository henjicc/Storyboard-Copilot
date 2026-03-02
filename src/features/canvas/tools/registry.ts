import type { CanvasNode, NodeToolType } from '../domain/canvasNodes';
import { builtInToolPlugins } from './builtInTools';
import type { CanvasToolPlugin } from './types';

const toolRegistry = new Map<NodeToolType, CanvasToolPlugin>(
  builtInToolPlugins.map((plugin) => [plugin.type, plugin])
);

export function getToolPlugin(toolType: NodeToolType): CanvasToolPlugin | null {
  return toolRegistry.get(toolType) ?? null;
}

export function getNodeToolPlugins(node: CanvasNode): CanvasToolPlugin[] {
  return builtInToolPlugins.filter((plugin) => plugin.supportsNode(node));
}
