import { useMemo, useState, useEffect, useCallback } from 'react';

import { isImageEditNode, isUploadNode } from '@/features/canvas/domain/canvasNodes';
import {
  canvasEventBus,
  canvasToolProcessor,
} from '@/features/canvas/application/canvasServices';
import { detectAspectRatio } from '@/features/canvas/application/imageData';
import { getToolPlugin, type ToolOptions } from '@/features/canvas/tools';
import { useCanvasStore } from '@/stores/canvasStore';
import { UiButton, UiModal } from '@/components/ui';
import { FormToolEditor } from './tool-editors/FormToolEditor';
import { CropToolEditor } from './tool-editors/CropToolEditor';
import { AnnotateToolEditor } from './tool-editors/AnnotateToolEditor';

export function NodeToolDialog() {
  const activeToolDialog = useCanvasStore((state) => state.activeToolDialog);
  const nodes = useCanvasStore((state) => state.nodes);
  const addDerivedUploadNode = useCanvasStore((state) => state.addDerivedUploadNode);
  const addStoryboardSplitNode = useCanvasStore((state) => state.addStoryboardSplitNode);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<ToolOptions>({});

  const sourceNode = useMemo(() => {
    if (!activeToolDialog) {
      return null;
    }

    return nodes.find((node) => node.id === activeToolDialog.nodeId) ?? null;
  }, [activeToolDialog, nodes]);

  const sourceImageUrl = useMemo(() => {
    if (!sourceNode) {
      return null;
    }

    if (isUploadNode(sourceNode) || isImageEditNode(sourceNode)) {
      return sourceNode.data.imageUrl;
    }

    return null;
  }, [sourceNode]);

  const activePlugin = useMemo(() => {
    if (!activeToolDialog) {
      return null;
    }

    return getToolPlugin(activeToolDialog.toolType);
  }, [activeToolDialog]);

  const dialogKey = activeToolDialog
    ? `${activeToolDialog.nodeId}:${activeToolDialog.toolType}`
    : null;

  useEffect(() => {
    if (!sourceNode || !activePlugin) {
      return;
    }

    setError(null);
    setOptions(activePlugin.createInitialOptions(sourceNode));
  }, [dialogKey, sourceNode, activePlugin]);

  const closeDialog = useCallback(() => {
    canvasEventBus.publish('tool-dialog/close', undefined);
  }, []);

  const handleApply = useCallback(async () => {
    if (!activeToolDialog || !sourceNode || !sourceImageUrl || !activePlugin) {
      setError('当前节点没有可处理的图片');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await activePlugin.execute(sourceImageUrl, options, {
        processTool: (toolType, imageUrl, toolOptions) =>
          canvasToolProcessor.process(toolType, imageUrl, toolOptions),
      });

      if (result.storyboardFrames && result.rows && result.cols) {
        addStoryboardSplitNode(
          sourceNode.id,
          result.rows,
          result.cols,
          result.storyboardFrames
        );
      } else if (result.outputImageUrl) {
        const aspectRatio = await detectAspectRatio(result.outputImageUrl);
        addDerivedUploadNode(sourceNode.id, result.outputImageUrl, aspectRatio);
      }

      closeDialog();
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : '处理失败');
    } finally {
      setIsProcessing(false);
    }
  }, [
    activeToolDialog,
    sourceNode,
    sourceImageUrl,
    activePlugin,
    options,
    addStoryboardSplitNode,
    addDerivedUploadNode,
    closeDialog,
  ]);

  const widthClassName = useMemo(() => {
    if (!activePlugin) {
      return 'w-[460px]';
    }
    if (activePlugin.editor === 'crop') {
      return 'w-[980px]';
    }
    if (activePlugin.editor === 'annotate') {
      return 'w-[1120px]';
    }
    return 'w-[460px]';
  }, [activePlugin]);

  const editorContent = useMemo(() => {
    if (!activePlugin) {
      return null;
    }

    if (activePlugin.editor === 'crop' && sourceImageUrl) {
      return (
        <CropToolEditor
          plugin={activePlugin}
          sourceImageUrl={sourceImageUrl}
          options={options}
          onOptionsChange={setOptions}
        />
      );
    }

    if (activePlugin.editor === 'annotate' && sourceImageUrl) {
      return (
        <AnnotateToolEditor
          plugin={activePlugin}
          sourceImageUrl={sourceImageUrl}
          options={options}
          onOptionsChange={setOptions}
        />
      );
    }

    return (
      <FormToolEditor
        plugin={activePlugin}
        fields={activePlugin.fields}
        options={options}
        onOptionsChange={setOptions}
      />
    );
  }, [activePlugin, options, sourceImageUrl]);

  const isOpen = Boolean(activeToolDialog && sourceNode && activePlugin);

  return (
    <UiModal
      isOpen={isOpen}
      title={`${activePlugin?.label ?? ''}工具`}
      onClose={closeDialog}
      widthClassName={widthClassName}
      footer={
        <>
          <UiButton variant="ghost" size="sm" onClick={closeDialog}>
            取消
          </UiButton>
          <UiButton size="sm" variant="primary" onClick={handleApply} disabled={isProcessing || !sourceImageUrl}>
            {isProcessing ? '处理中...' : '应用'}
          </UiButton>
        </>
      }
    >
      <div className="space-y-3">
        {editorContent}
        {error && <div className="text-xs text-red-400">{error}</div>}
      </div>
    </UiModal>
  );
}
