import { memo, useMemo } from 'react';
import { NodeToolbar as ReactFlowNodeToolbar, Position } from '@xyflow/react';
import { Crop, PenLine, RefreshCw, Scissors } from 'lucide-react';

import { isUploadNode, type CanvasNode } from '@/features/canvas/domain/canvasNodes';
import { getNodeDefinition } from '@/features/canvas/domain/nodeRegistry';
import { canvasEventBus } from '@/features/canvas/application/canvasServices';
import { getNodeToolPlugins } from '@/features/canvas/tools';
import type { ToolIconKey } from '@/features/canvas/tools';
import { UiChipButton, UiPanel } from '@/components/ui';

interface NodeActionToolbarProps {
  node: CanvasNode;
}

const toolIconMap: Record<ToolIconKey, typeof Crop> = {
  crop: Crop,
  annotate: PenLine,
  split: Scissors,
};

export const NodeActionToolbar = memo(({ node }: NodeActionToolbarProps) => {
  const definition = getNodeDefinition(node.type);
  const tools = useMemo(() => getNodeToolPlugins(node), [node]);
  const canReupload = isUploadNode(node) && Boolean(node.data.imageUrl);
  const hasActions = tools.length > 0 || canReupload;

  if (!definition.capabilities.toolbar || !hasActions) {
    return null;
  }

  return (
    <ReactFlowNodeToolbar
      nodeId={node.id}
      isVisible
      position={Position.Top}
      align="center"
      offset={12}
      className="pointer-events-auto"
    >
      <UiPanel className="flex items-center gap-1 rounded-full p-1">
        {tools.map((tool) => {
          const Icon = toolIconMap[tool.icon] ?? Crop;

          return (
            <UiChipButton
              key={tool.type}
              className="h-8 rounded-full px-2.5 text-xs"
              onClick={() =>
                canvasEventBus.publish('tool-dialog/open', {
                  nodeId: node.id,
                  toolType: tool.type,
                })
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {tool.label}
            </UiChipButton>
          );
        })}
        {canReupload && (
          <UiChipButton
            key="upload-reupload"
            className="h-8 rounded-full px-2.5 text-xs"
            onClick={() =>
              canvasEventBus.publish('upload-node/reupload', {
                nodeId: node.id,
              })
            }
          >
            <RefreshCw className="h-3.5 w-3.5" />
            重新上传
          </UiChipButton>
        )}
      </UiPanel>
    </ReactFlowNodeToolbar>
  );
});

NodeActionToolbar.displayName = 'NodeActionToolbar';
