import { memo, useMemo } from 'react';

import { useCanvasStore } from '@/stores/canvasStore';
import { getNodeDefinition } from '@/features/canvas/domain/nodeRegistry';
import { isImageEditNode } from '@/features/canvas/domain/canvasNodes';
import { NodeActionToolbar } from './NodeActionToolbar';
import { NodePromptInput } from './NodePromptInput';

export const SelectedNodeOverlay = memo(() => {
  const nodes = useCanvasStore((state) => state.nodes);
  const selectedNodeId = useCanvasStore((state) => state.selectedNodeId);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) {
      return null;
    }

    return nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [nodes, selectedNodeId]);

  if (!selectedNode) {
    return null;
  }

  const definition = getNodeDefinition(selectedNode.type);
  const hidePromptInput = isImageEditNode(selectedNode) && Boolean(selectedNode.data.isGenerating);

  return (
    <>
      <NodeActionToolbar node={selectedNode} />
      {definition.capabilities.promptInput && !hidePromptInput && <NodePromptInput node={selectedNode} />}
    </>
  );
});

SelectedNodeOverlay.displayName = 'SelectedNodeOverlay';
