import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NodeToolbar as ReactFlowNodeToolbar, Position } from '@xyflow/react';
import { Copy, Crop, Download, FolderOpen, PenLine, RefreshCw, Scissors, Trash2, Unlink2 } from 'lucide-react';
import { save } from '@tauri-apps/plugin-dialog';

import {
  isExportImageNode,
  isGroupNode,
  isImageEditNode,
  isUploadNode,
  type CanvasNode,
} from '@/features/canvas/domain/canvasNodes';
import { canvasEventBus } from '@/features/canvas/application/canvasServices';
import { getNodeToolPlugins } from '@/features/canvas/tools';
import type { ToolIconKey } from '@/features/canvas/tools';
import { UiChipButton, UiPanel } from '@/components/ui';
import {
  copyImageSourceToClipboard,
  saveImageSourceToDirectory,
  saveImageSourceToPath,
} from '@/commands/image';
import { useSettingsStore } from '@/stores/settingsStore';
import { useCanvasStore } from '@/stores/canvasStore';

interface NodeActionToolbarProps {
  node: CanvasNode;
}

const toolIconMap: Record<ToolIconKey, typeof Crop> = {
  crop: Crop,
  annotate: PenLine,
  split: Scissors,
};

export const NodeActionToolbar = memo(({ node }: NodeActionToolbarProps) => {
  const tools = useMemo(() => getNodeToolPlugins(node), [node]);
  const deleteNode = useCanvasStore((state) => state.deleteNode);
  const ungroupNode = useCanvasStore((state) => state.ungroupNode);
  const canReupload = isUploadNode(node) && Boolean(node.data.imageUrl);
  const downloadPresetPaths = useSettingsStore((state) => state.downloadPresetPaths);
  const [downloadMenu, setDownloadMenu] = useState<{ x: number; y: number } | null>(null);
  const downloadMenuRef = useRef<HTMLDivElement | null>(null);
  const imageSource = useMemo(() => {
    if (isUploadNode(node) || isImageEditNode(node) || isExportImageNode(node)) {
      return node.data.imageUrl || node.data.previewImageUrl || null;
    }
    return null;
  }, [node]);
  const canHandleImage = Boolean(imageSource);

  useEffect(() => {
    if (!downloadMenu) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const menuElement = downloadMenuRef.current;
      if (!menuElement) {
        setDownloadMenu(null);
        return;
      }
      if (menuElement.contains(event.target as Node)) {
        return;
      }
      setDownloadMenu(null);
    };

    window.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [downloadMenu]);

  const handleCopyImage = useCallback(async () => {
    if (!imageSource) {
      return;
    }

    try {
      await copyImageSourceToClipboard(imageSource);
    } catch (error) {
      console.error('Failed to copy image to clipboard', error);
    }
  }, [imageSource]);

  const handleDownloadSaveAs = useCallback(async () => {
    if (!imageSource) {
      return;
    }

    try {
      const selectedPath = await save({
        defaultPath: `node-${node.id}.png`,
      });
      if (!selectedPath || Array.isArray(selectedPath)) {
        return;
      }
      await saveImageSourceToPath(imageSource, selectedPath);
      setDownloadMenu(null);
    } catch (error) {
      console.error('Failed to save image with save-as', error);
    }
  }, [imageSource, node.id]);

  const handleDownloadToPreset = useCallback(
    async (targetDir: string) => {
      if (!imageSource) {
        return;
      }
      try {
        await saveImageSourceToDirectory(imageSource, targetDir, `node-${node.id}`);
        setDownloadMenu(null);
      } catch (error) {
        console.error('Failed to save image to preset dir', error);
      }
    },
    [imageSource, node.id]
  );

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
        {canHandleImage && (
          <UiChipButton
            key="image-copy"
            className="h-8 rounded-full px-2.5 text-xs"
            onClick={() => {
              void handleCopyImage();
            }}
          >
            <Copy className="h-3.5 w-3.5" />
            复制
          </UiChipButton>
        )}
        {canHandleImage && (
          <UiChipButton
            key="image-download"
            className="h-8 rounded-full px-2.5 text-xs"
            onClick={(event) => {
              event.stopPropagation();
              if (downloadPresetPaths.length === 0) {
                void handleDownloadSaveAs();
                return;
              }
              setDownloadMenu({
                x: event.clientX,
                y: event.clientY,
              });
            }}
          >
            <Download className="h-3.5 w-3.5" />
            下载
          </UiChipButton>
        )}
        {isGroupNode(node) && (
          <UiChipButton
            key="group-ungroup"
            className="h-8 rounded-full border-amber-500/45 bg-amber-500/15 px-2.5 text-xs text-amber-300 hover:bg-amber-500/25"
            onClick={(event) => {
              event.stopPropagation();
              setDownloadMenu(null);
              ungroupNode(node.id);
            }}
          >
            <Unlink2 className="h-3.5 w-3.5" />
            解散
          </UiChipButton>
        )}
        <UiChipButton
          key="node-delete"
          className="h-8 rounded-full border-red-500/45 bg-red-500/15 px-2.5 text-xs text-red-300 hover:bg-red-500/25"
          onClick={(event) => {
            event.stopPropagation();
            setDownloadMenu(null);
            deleteNode(node.id);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          删除
        </UiChipButton>
      </UiPanel>

      {downloadMenu && (
        <div
          ref={downloadMenuRef}
          className="fixed z-[120] min-w-[280px] rounded-xl border border-[rgba(255,255,255,0.18)] bg-surface-dark/95 p-2 shadow-2xl backdrop-blur-sm"
          style={{ left: `${downloadMenu.x}px`, top: `${downloadMenu.y}px` }}
        >
          <button
            type="button"
            className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm text-text-dark transition-colors hover:bg-bg-dark"
            onClick={() => {
              void handleDownloadSaveAs();
            }}
          >
            <Download className="h-4 w-4" />
            另存为...
          </button>

          {downloadPresetPaths.length > 0 ? (
            <div className="mt-1 space-y-1 border-t border-[rgba(255,255,255,0.1)] pt-2">
              {downloadPresetPaths.map((path) => (
                <button
                  key={path}
                  type="button"
                  className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs text-text-dark transition-colors hover:bg-bg-dark"
                  onClick={() => {
                    void handleDownloadToPreset(path);
                  }}
                  title={path}
                >
                  <FolderOpen className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                  <span className="truncate">{path}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-1 border-t border-[rgba(255,255,255,0.1)] px-2.5 pt-2 text-xs text-text-muted">
              暂无预设路径，请在设置 - 通用中添加
            </div>
          )}
        </div>
      )}
    </ReactFlowNodeToolbar>
  );
});

NodeActionToolbar.displayName = 'NodeActionToolbar';
