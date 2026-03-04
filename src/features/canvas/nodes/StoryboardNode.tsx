import {
  memo,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useViewport, type NodeProps } from '@xyflow/react';
import { Download, ImagePlus, PenSquare } from 'lucide-react';

import {
  mergeStoryboardImages,
  type MergeStoryboardImagesResult,
} from '@/commands/image';
import { NodeHeader, NODE_HEADER_FLOATING_POSITION_CLASS } from '@/features/canvas/ui/NodeHeader';
import type {
  CanvasNode,
  StoryboardExportOptions,
  StoryboardFrameItem,
  StoryboardSplitNodeData,
} from '@/features/canvas/domain/canvasNodes';
import { isExportImageNode, isImageEditNode, isUploadNode } from '@/features/canvas/domain/canvasNodes';
import {
  canvasToDataUrl,
  loadImageElement,
  parseAspectRatio,
  prepareNodeImage,
  persistImageLocally,
  reduceAspectRatio,
  resolveImageDisplayUrl,
  shouldUseOriginalImageByZoom,
} from '@/features/canvas/application/imageData';
import { UiButton, UiCheckbox, UiInput, UiSelect } from '@/components/ui';
import { useCanvasStore } from '@/stores/canvasStore';

type StoryboardNodeProps = NodeProps & {
  id: string;
  data: StoryboardSplitNodeData;
  selected?: boolean;
};

const STORYBOARD_NODE_WIDTH_PX = 318;
const STORYBOARD_GRID_GAP_PX = 1;
const EXPORT_MAX_DIMENSION = 4096;
const EXPORT_TRACE_PREFIX = '[StoryboardExport]';
const STORYBOARD_SPLIT_HEADER_ADJUST = { x: 0, y: 0, scale: 1 };
const STORYBOARD_SPLIT_ICON_ADJUST = { x: 0, y: 0, scale: 1 };
const STORYBOARD_SPLIT_TITLE_ADJUST = { x: 0, y: 0, scale: 1 };

function SplitResultIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 0c1.66 0 3 1.34 3 3v3l2.4-1.5a3.003 3.003 0 0 1 3 5.2a3.003 3.003 0 0 1-4.452-2.051l-.952.55v6.8h-2v-5.65l-4.01 2.32l-.988-1.73l5-2.94v-1.17a2.996 2.996 0 0 1-4-2.829c0-1.66 1.34-3 3-3zM9 3a1 1 0 0 0 2 0a1 1 0 0 0-2 0m7 4a1 1 0 0 0 2 0a1 1 0 0 0-2 0M2.97 19h2v-2h-2V9h3V7h-3c-1.1 0-2 .895-2 2v8c0 1.1.895 2 2 2m6 0h-2v-2h2zm4-2c0 1.1-.895 2-2 2v-2z" />
    </svg>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toCssAspectRatio(aspectRatio: string): string {
  const [rawWidth = '1', rawHeight = '1'] = aspectRatio.split(':');
  const width = Number(rawWidth);
  const height = Number(rawHeight);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return '1 / 1';
  }

  return `${width} / ${height}`;
}

function createDefaultExportOptions(): StoryboardExportOptions {
  return {
    showFrameIndex: false,
    showFrameNote: false,
    notePlacement: 'overlay',
    imageFit: 'cover',
    frameIndexPrefix: 'S',
    cellGap: 8,
    outerPadding: 0,
    fontSize: 4,
    backgroundColor: '#0f1115',
    textColor: '#f8fafc',
  };
}

function resolveExportOptions(options: StoryboardSplitNodeData['exportOptions']): StoryboardExportOptions {
  const merged = {
    ...createDefaultExportOptions(),
    ...(options ?? {}),
  };

  const rawFontSize = Number.isFinite(merged.fontSize) ? merged.fontSize : 4;
  const normalizedFontPercent = rawFontSize > 20
    ? Math.round(rawFontSize / 6)
    : rawFontSize;

  return {
    ...merged,
    fontSize: clamp(Math.round(normalizedFontPercent), 1, 20),
  };
}

function trimTextToWidth(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  const safeText = text.trim();
  if (!safeText) {
    return '';
  }

  if (context.measureText(safeText).width <= maxWidth) {
    return safeText;
  }

  let content = safeText;
  while (content.length > 1) {
    content = content.slice(0, -1);
    const withEllipsis = `${content}...`;
    if (context.measureText(withEllipsis).width <= maxWidth) {
      return withEllipsis;
    }
  }

  return '...';
}

async function applyStoryboardTextOverlay(
  imageSource: string,
  frames: StoryboardFrameItem[],
  options: StoryboardExportOptions,
  rows: number,
  cols: number,
  layout: MergeStoryboardImagesResult
): Promise<string> {
  if (!options.showFrameIndex && !options.showFrameNote) {
    return imageSource;
  }

  const image = await loadImageElement(imageSource);
  const canvas = document.createElement('canvas');
  canvas.width = layout.canvasWidth;
  canvas.height = layout.canvasHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('导出画布初始化失败');
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  context.textBaseline = 'middle';
  context.textAlign = 'left';
  context.font = `${Math.max(500, Math.round(layout.fontSize * 1.2))} ${layout.fontSize}px sans-serif`;

  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    const row = Math.floor(index / Math.max(1, cols));
    const col = index % Math.max(1, cols);
    if (row >= rows) {
      break;
    }

    const x = layout.padding + col * (layout.cellWidth + layout.gap);
    const y = layout.padding + row * (layout.cellHeight + layout.noteHeight + layout.gap);

    if (options.showFrameIndex) {
      const label = `${options.frameIndexPrefix || 'S'}${index + 1}`;
      const badgePaddingX = Math.max(6, Math.round(layout.fontSize * 0.35));
      const badgeHeight = Math.max(18, Math.round(layout.fontSize * 1.15));
      const textWidth = context.measureText(label).width;
      const badgeWidth = Math.round(textWidth + badgePaddingX * 2);

      context.fillStyle = 'rgba(0,0,0,0.65)';
      context.fillRect(x + 6, y + 6, badgeWidth, badgeHeight);
      context.fillStyle = options.textColor;
      context.fillText(label, x + 6 + badgePaddingX, y + 6 + badgeHeight / 2);
    }

    if (options.showFrameNote) {
      const note = trimTextToWidth(
        context,
        frame.note || '',
        Math.max(20, layout.cellWidth - 14)
      );

      if (!note) {
        continue;
      }

      if (options.notePlacement === 'overlay') {
        const overlayHeight = Math.max(18, Math.round(layout.fontSize * 1.35));
        const overlayY = y + layout.cellHeight - overlayHeight;
        context.fillStyle = 'rgba(0, 0, 0, 0.6)';
        context.fillRect(x, overlayY, layout.cellWidth, overlayHeight);
        context.fillStyle = options.textColor;
        context.fillText(note, x + 7, overlayY + overlayHeight / 2);
      } else if (layout.noteHeight > 0) {
        const noteY = y + layout.cellHeight + layout.noteHeight / 2;
        context.fillStyle = options.textColor;
        context.fillText(note, x + 4, noteY);
      }
    }
  }

  return canvasToDataUrl(canvas);
}

interface FrameCardProps {
  nodeId: string;
  frame: StoryboardFrameItem;
  index: number;
  frameAspectRatioCss: string;
  imageFit: StoryboardExportOptions['imageFit'];
  draggedFrameId: string | null;
  dropTargetFrameId: string | null;
  onSortStart: (frameId: string) => void;
  onSortHover: (frameId: string) => void;
  onTogglePicker: (frameId: string, x: number, y: number) => void;
  onEditFrame: (frame: StoryboardFrameItem) => void;
}

interface IncomingImageItem {
  imageUrl: string;
  previewImageUrl: string | null;
  displayUrl: string;
  label: string;
}

const FrameCard = memo(
  ({
    nodeId,
    frame,
    index,
    frameAspectRatioCss,
    imageFit,
    draggedFrameId,
    dropTargetFrameId,
    onSortStart,
    onSortHover,
    onTogglePicker,
    onEditFrame,
  }: FrameCardProps) => {
    const updateStoryboardFrame = useCanvasStore((state) => state.updateStoryboardFrame);
    const { zoom } = useViewport();

    const imageSource = useMemo(() => {
      const preferOriginal = shouldUseOriginalImageByZoom(zoom);
      const picked = preferOriginal
        ? frame.imageUrl || frame.previewImageUrl
        : frame.previewImageUrl || frame.imageUrl;
      return picked ? resolveImageDisplayUrl(picked) : null;
    }, [frame.imageUrl, frame.previewImageUrl, zoom]);

    const dragging = draggedFrameId === frame.id;
    const asDropTarget = dropTargetFrameId === frame.id && !dragging;

    return (
      <div
        onPointerEnter={(event) => {
          event.stopPropagation();
          onSortHover(frame.id);
        }}
        onPointerMove={(event) => {
          event.stopPropagation();
          onSortHover(frame.id);
        }}
        onMouseDown={(event) => event.stopPropagation()}
        className={`nodrag relative bg-bg-dark/85 transition-all ${dragging
          ? 'z-10 opacity-55 ring-1 ring-accent/65'
          : asDropTarget
            ? 'z-10 ring-1 ring-emerald-400/70'
            : ''
          }`}
      >
        <div
          className={`group/frame relative overflow-hidden bg-surface-dark ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ aspectRatio: frameAspectRatioCss }}
          onPointerDown={(event) => {
            if (event.button !== 0) {
              return;
            }
            event.preventDefault();
            event.stopPropagation();
            onSortStart(frame.id);
          }}
        >
          {frame.imageUrl ? (
            <img
              src={imageSource ?? ''}
              alt={`Frame ${index + 1}`}
              className={`h-full w-full ${imageFit === 'contain' ? 'object-contain' : 'object-cover'}`}
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[11px] text-text-muted">
              空分镜
            </div>
          )}

          <button
            type="button"
            className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white opacity-0 transition-all duration-150 hover:bg-black/75 group-hover/frame:opacity-100"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onEditFrame(frame);
            }}
            title="单独编辑此格"
          >
            <PenSquare className="h-3 w-3" />
          </button>

          <button
            type="button"
            className="absolute bottom-1 right-1 rounded bg-black/60 p-1 text-white opacity-0 transition-all duration-150 hover:bg-black/75 group-hover/frame:opacity-100"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onTogglePicker(frame.id, event.clientX, event.clientY);
            }}
            title="从输入图片替换"
          >
            <ImagePlus className="h-3 w-3" />
          </button>
        </div>

        <textarea
          value={frame.note}
          onChange={(event) =>
            updateStoryboardFrame(nodeId, frame.id, {
              note: event.target.value,
            })
          }
          onMouseDown={(event) => event.stopPropagation()}
          placeholder={`分镜 ${index + 1} 描述`}
          className="ui-scrollbar nodrag nowheel h-10 w-full resize-none overflow-y-auto border-0 border-t border-[rgba(255,255,255,0.12)] bg-bg-dark/90 px-2 py-1 text-[11px] text-text-dark outline-none focus:border-accent"
        />
      </div>
    );
  }
);

FrameCard.displayName = 'FrameCard';

export const StoryboardNode = memo(({ id, data, selected }: StoryboardNodeProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const pickerMenuRef = useRef<HTMLDivElement>(null);
  const setSelectedNode = useCanvasStore((state) => state.setSelectedNode);
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const reorderStoryboardFrame = useCanvasStore((state) => state.reorderStoryboardFrame);
  const addDerivedExportNode = useCanvasStore((state) => state.addDerivedExportNode);
  const addEdge = useCanvasStore((state) => state.addEdge);
  const updateStoryboardFrame = useCanvasStore((state) => state.updateStoryboardFrame);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);

  const [draggedFrameId, setDraggedFrameId] = useState<string | null>(null);
  const [dropTargetFrameId, setDropTargetFrameId] = useState<string | null>(null);
  const [pickerState, setPickerState] = useState<{ frameId: string; x: number; y: number } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const orderedFrames = useMemo(
    () => [...data.frames].sort((a, b) => a.order - b.order),
    [data.frames]
  );

  const frameAspectRatio = useMemo(() => {
    return (
      data.frameAspectRatio ??
      orderedFrames.find((frame) => typeof frame.aspectRatio === 'string')?.aspectRatio ??
      '1:1'
    );
  }, [data.frameAspectRatio, orderedFrames]);

  const frameAspectRatioCss = useMemo(
    () => toCssAspectRatio(frameAspectRatio),
    [frameAspectRatio]
  );

  const aspectValue = useMemo(
    () => clamp(parseAspectRatio(frameAspectRatio), 0.15, 6),
    [frameAspectRatio]
  );

  const gridCols = Math.max(1, data.gridCols);
  const gridRows = Math.max(1, data.gridRows);
  const totalFrames = orderedFrames.length;

  const gridMetrics = useMemo(() => {
    const contentWidth = STORYBOARD_NODE_WIDTH_PX - 16;
    const gap = STORYBOARD_GRID_GAP_PX;
    const cellWidth = Math.max(
      26,
      Math.floor((contentWidth - Math.max(0, gridCols - 1) * gap) / gridCols)
    );

    return {
      gap,
      cellWidth,
      cellHeight: Math.max(18, Math.round(cellWidth / aspectValue)),
    };
  }, [aspectValue, gridCols]);

  const exportOptions = useMemo(
    () => resolveExportOptions(data.exportOptions),
    [data.exportOptions]
  );

  const incomingImageRefs = useMemo(() => {
    const nodeById = new Map(nodes.map((node) => [node.id, node] as const));
    const sourceNodeIds = edges
      .filter((edge) => edge.target === id)
      .map((edge) => edge.source);

    const dedupedByImageUrl = new Map<string, { imageUrl: string; previewImageUrl: string | null }>();
    for (const sourceNodeId of sourceNodeIds) {
      const sourceNode = nodeById.get(sourceNodeId) as CanvasNode | undefined;
      if (!sourceNode) {
        continue;
      }
      if (!isUploadNode(sourceNode) && !isImageEditNode(sourceNode) && !isExportImageNode(sourceNode)) {
        continue;
      }
      const imageUrl = sourceNode.data.imageUrl;
      if (!imageUrl) {
        continue;
      }
      if (!dedupedByImageUrl.has(imageUrl)) {
        dedupedByImageUrl.set(imageUrl, {
          imageUrl,
          previewImageUrl: sourceNode.data.previewImageUrl ?? null,
        });
      }
    }

    return Array.from(dedupedByImageUrl.values());
  }, [edges, id, nodes]);

  const incomingImageItems = useMemo<IncomingImageItem[]>(
    () =>
      incomingImageRefs.map((item, index) => ({
        imageUrl: item.imageUrl,
        previewImageUrl: item.previewImageUrl,
        displayUrl: resolveImageDisplayUrl(item.previewImageUrl || item.imageUrl),
        label: `图${index + 1}`,
      })),
    [incomingImageRefs]
  );

  useEffect(() => {
    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (!rootRef.current) {
        return;
      }
      if (
        rootRef.current.contains(event.target as Node) ||
        pickerMenuRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      setPickerState(null);
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
    };
  }, []);

  const patchExportOptions = useCallback(
    (patch: Partial<StoryboardExportOptions>) => {
      updateNodeData(id, {
        exportOptions: {
          ...exportOptions,
          ...patch,
        },
      });
    },
    [exportOptions, id, updateNodeData]
  );

  const handleSortStart = useCallback((frameId: string) => {
    setDraggedFrameId(frameId);
    setDropTargetFrameId(frameId);
    setPickerState(null);
  }, []);

  const handleSortHover = useCallback(
    (frameId: string) => {
      if (!draggedFrameId) {
        return;
      }
      setDropTargetFrameId(frameId);
    },
    [draggedFrameId]
  );

  const finalizeSort = useCallback(() => {
    if (!draggedFrameId) {
      return;
    }

    if (dropTargetFrameId && dropTargetFrameId !== draggedFrameId) {
      reorderStoryboardFrame(id, draggedFrameId, dropTargetFrameId);
    }

    setDraggedFrameId(null);
    setDropTargetFrameId(null);
  }, [draggedFrameId, dropTargetFrameId, id, reorderStoryboardFrame]);

  useEffect(() => {
    if (!draggedFrameId) {
      return;
    }

    const handlePointerUp = () => {
      finalizeSort();
    };

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [draggedFrameId, finalizeSort]);

  const handleEditFrame = useCallback(
    async (frame: StoryboardFrameItem) => {
      try {
        const sourceImage = frame.imageUrl ?? frame.previewImageUrl;
        if (!sourceImage) {
          setExportError('该分镜没有可编辑图片');
          return;
        }

        const prepared = await prepareNodeImage(sourceImage);
        const createdNodeId = addDerivedExportNode(
          id,
          prepared.imageUrl,
          prepared.aspectRatio,
          prepared.previewImageUrl
        );

        if (createdNodeId) {
          addEdge(id, createdNodeId);
        }
      } catch (error) {
        setExportError(error instanceof Error ? error.message : '创建编辑节点失败');
      }
    },
    [addDerivedExportNode, addEdge, id]
  );

  const handleExport = useCallback(async () => {
    if (isExporting) {
      return;
    }

    const traceId = `${id}-${Date.now()}`;
    const traceStart = performance.now();
    console.info(`${EXPORT_TRACE_PREFIX} start`, {
      traceId,
      nodeId: id,
      rows: gridRows,
      cols: gridCols,
      frameCount: orderedFrames.length,
    });

    setIsExporting(true);
    setExportError(null);

    try {
      const stageFrameStart = performance.now();
      const frameSources = orderedFrames.map(
        (frame) => frame.imageUrl ?? frame.previewImageUrl ?? ''
      );
      if (frameSources.every((source) => !source)) {
        throw new Error('没有可导出的图片');
      }
      console.info(`${EXPORT_TRACE_PREFIX} frame-sources-ready`, {
        traceId,
        elapsedMs: Math.round(performance.now() - stageFrameStart),
        nonEmptyFrames: frameSources.filter((source) => source.length > 0).length,
      });

      const options = exportOptions;
      const rawGap = clamp(Math.round(options.cellGap), 0, 120);
      const rawPadding = 0;
      const fontPercent = clamp(Number.isFinite(options.fontSize) ? options.fontSize : 4, 1, 20);
      const firstFrameSource = frameSources.find((source) => source.length > 0) ?? null;
      let referenceFrameHeight = 1024;
      if (firstFrameSource) {
        const fontProbeStart = performance.now();
        try {
          const referenceImage = await loadImageElement(firstFrameSource);
          referenceFrameHeight = Math.max(
            64,
            referenceImage.naturalHeight || referenceImage.height || referenceFrameHeight
          );
        } catch {
          // Keep fallback size when reference frame cannot be read.
        }
        console.info(`${EXPORT_TRACE_PREFIX} font-reference-resolved`, {
          traceId,
          elapsedMs: Math.round(performance.now() - fontProbeStart),
          referenceFrameHeight,
        });
      }
      const rawFontSize = clamp(
        Math.round(referenceFrameHeight * (fontPercent / 100)),
        10,
        240
      );
      const rawNoteHeight =
        options.showFrameNote && options.notePlacement === 'bottom'
          ? Math.max(Math.round(rawFontSize * 1.7), 24)
          : 0;

      const mergeStart = performance.now();
      const mergeResult = await mergeStoryboardImages({
        frameSources,
        rows: gridRows,
        cols: gridCols,
        cellGap: rawGap,
        outerPadding: rawPadding,
        noteHeight: rawNoteHeight,
        fontSize: rawFontSize,
        backgroundColor: options.backgroundColor,
        maxDimension: EXPORT_MAX_DIMENSION,
        showFrameIndex: options.showFrameIndex,
        showFrameNote: options.showFrameNote,
        notePlacement: options.notePlacement,
        imageFit: options.imageFit,
        frameIndexPrefix: options.frameIndexPrefix,
        textColor: options.textColor,
        frameNotes: orderedFrames.map((frame) => frame.note ?? ''),
      });
      console.info(`${EXPORT_TRACE_PREFIX} merge-done`, {
        traceId,
        elapsedMs: Math.round(performance.now() - mergeStart),
        canvasWidth: mergeResult.canvasWidth,
        canvasHeight: mergeResult.canvasHeight,
        textOverlayApplied: mergeResult.textOverlayApplied,
      });

      const aspectRatio = reduceAspectRatio(mergeResult.canvasWidth, mergeResult.canvasHeight);
      const needsOverlay = (options.showFrameIndex || options.showFrameNote) && !mergeResult.textOverlayApplied;
      let finalImagePath = mergeResult.imagePath;
      let finalPreviewPath = mergeResult.imagePath;

      if (needsOverlay) {
        const overlayStart = performance.now();
        const mergedBlob = await applyStoryboardTextOverlay(
          mergeResult.imagePath,
          orderedFrames,
          options,
          gridRows,
          gridCols,
          mergeResult
        );
        console.info(`${EXPORT_TRACE_PREFIX} overlay-done`, {
          traceId,
          elapsedMs: Math.round(performance.now() - overlayStart),
          dataUrlLength: mergedBlob.length,
        });
        const persistStart = performance.now();
        finalImagePath = await persistImageLocally(mergedBlob);
        finalPreviewPath = finalImagePath;
        console.info(`${EXPORT_TRACE_PREFIX} overlay-persisted`, {
          traceId,
          elapsedMs: Math.round(performance.now() - persistStart),
          persistedPath: finalImagePath,
        });
      }

      const createNodeStart = performance.now();
      const createdNodeId = addDerivedExportNode(
        id,
        finalImagePath,
        aspectRatio,
        finalPreviewPath
      );
      console.info(`${EXPORT_TRACE_PREFIX} derived-node-created`, {
        traceId,
        elapsedMs: Math.round(performance.now() - createNodeStart),
        createdNodeId,
      });

      if (createdNodeId) {
        addEdge(id, createdNodeId);
      }
      console.info(`${EXPORT_TRACE_PREFIX} done`, {
        traceId,
        totalElapsedMs: Math.round(performance.now() - traceStart),
      });
    } catch (error) {
      console.error(`${EXPORT_TRACE_PREFIX} failed`, {
        traceId,
        elapsedMs: Math.round(performance.now() - traceStart),
        error,
      });
      setExportError(error instanceof Error ? error.message : '导出失败');
    } finally {
      setIsExporting(false);
    }
  }, [
    addDerivedExportNode,
    addEdge,
    exportOptions,
    gridCols,
    gridRows,
    id,
    isExporting,
    orderedFrames,
  ]);

  const handleTogglePicker = useCallback((frameId: string, x: number, y: number) => {
    setPickerState((previous) => {
      if (previous?.frameId === frameId) {
        return null;
      }
      return { frameId, x, y };
    });
  }, []);

  const handleReplaceFromInput = useCallback(
    (frameId: string, imageUrl: string) => {
      setExportError(null);
      const matched = incomingImageItems.find((item) => item.imageUrl === imageUrl);
      updateStoryboardFrame(id, frameId, {
        imageUrl: matched?.imageUrl ?? imageUrl,
        previewImageUrl: matched?.previewImageUrl ?? matched?.imageUrl ?? imageUrl,
      });
      setPickerState(null);
    },
    [id, incomingImageItems, updateStoryboardFrame]
  );

  return (
    <div
      ref={rootRef}
      className={`
        relative overflow-visible rounded-[var(--node-radius)] border bg-surface-dark/90 p-2 transition-all duration-150
        ${selected
          ? 'border-accent shadow-[0_0_0_1px_rgba(59,130,246,0.32)]'
          : 'border-[rgba(255,255,255,0.22)] hover:border-[rgba(255,255,255,0.34)]'}
      `}
      style={{ width: `${STORYBOARD_NODE_WIDTH_PX}px` }}
      onClick={() => setSelectedNode(id)}
    >
      <NodeHeader
        className={NODE_HEADER_FLOATING_POSITION_CLASS}
        icon={<SplitResultIcon className="h-3.5 w-3.5" />}
        titleText="切割结果"
        headerAdjust={STORYBOARD_SPLIT_HEADER_ADJUST}
        iconAdjust={STORYBOARD_SPLIT_ICON_ADJUST}
        titleAdjust={STORYBOARD_SPLIT_TITLE_ADJUST}
      />

      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="text-[11px] text-text-muted/80">
          {gridRows} x {gridCols} | {totalFrames} 格 | 单格约 {gridMetrics.cellWidth} x {gridMetrics.cellHeight}px
        </div>
        <UiButton
          size="sm"
          variant="primary"
          className="nodrag h-8 gap-1 px-2.5"
          onClick={(event) => {
            event.stopPropagation();
            void handleExport();
          }}
          disabled={isExporting}
        >
          <Download className="h-3.5 w-3.5" />
          {isExporting ? '导出中...' : '导出'}
        </UiButton>
      </div>

      <div className="ui-scrollbar max-h-[420px] overflow-auto">
        <div
          className="grid overflow-hidden rounded-lg border border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.14)]"
          style={{
            gap: `${STORYBOARD_GRID_GAP_PX}px`,
            gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
          }}
        >
          {orderedFrames.map((frame, index) => (
            <FrameCard
              key={frame.id}
              nodeId={id}
              frame={frame}
              index={index}
              frameAspectRatioCss={frameAspectRatioCss}
              imageFit={exportOptions.imageFit}
              draggedFrameId={draggedFrameId}
              dropTargetFrameId={dropTargetFrameId}
              onSortStart={handleSortStart}
              onSortHover={handleSortHover}
              onTogglePicker={handleTogglePicker}
              onEditFrame={(targetFrame) => {
                void handleEditFrame(targetFrame);
              }}
            />
          ))}
        </div>
      </div>

      {pickerState && typeof document !== 'undefined'
        ? createPortal(
          <div
            ref={pickerMenuRef}
            className="fixed z-[140] w-[120px] overflow-hidden rounded-xl border border-[rgba(255,255,255,0.16)] bg-surface-dark shadow-xl"
            style={{ left: `${pickerState.x}px`, top: `${pickerState.y}px` }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {incomingImageItems.length > 0 ? (
              <div className="ui-scrollbar max-h-[180px] overflow-y-auto">
                {incomingImageItems.map((item) => (
                  <button
                    key={`${pickerState.frameId}-${item.imageUrl}`}
                    type="button"
                    className="flex w-full items-center gap-2 border border-transparent bg-bg-dark/70 px-2 py-2 text-left text-sm text-text-dark transition-colors hover:border-[rgba(255,255,255,0.18)]"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleReplaceFromInput(pickerState.frameId, item.imageUrl);
                    }}
                    title={item.label}
                  >
                    <img
                      src={item.displayUrl}
                      alt={item.label}
                      className="h-8 w-8 rounded object-cover"
                      draggable={false}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-2 py-2 text-sm text-text-muted">
                暂无输入图片
              </div>
            )}
          </div>,
          document.body
        )
        : null}

      <details
        className="nodrag mt-2 rounded-lg border border-[rgba(255,255,255,0.12)] bg-bg-dark/55 p-2"
        onClick={(event) => event.stopPropagation()}
      >
        <summary className="cursor-pointer select-none text-xs text-text-muted">导出设置</summary>

        <div className="mt-2 space-y-2 text-xs text-text-muted">
          <label className="flex items-center gap-2">
            <UiCheckbox
              checked={exportOptions.showFrameIndex}
              onCheckedChange={(checked) => patchExportOptions({ showFrameIndex: checked })}
            />
            显示分镜序号
          </label>

          <label className="flex items-center gap-2">
            <UiCheckbox
              checked={exportOptions.showFrameNote}
              onCheckedChange={(checked) => patchExportOptions({ showFrameNote: checked })}
            />
            显示分镜描述
          </label>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="mb-1">图片填充</div>
              <UiSelect
                value={exportOptions.imageFit}
                onChange={(event) =>
                  patchExportOptions({
                    imageFit: event.target.value === 'contain' ? 'contain' : 'cover',
                  })
                }
              >
                <option value="cover">填充满格子</option>
                <option value="contain">完整显示</option>
              </UiSelect>
            </div>
            <div>
              <div className="mb-1">序号前缀</div>
              <UiInput
                value={exportOptions.frameIndexPrefix}
                maxLength={4}
                className="h-8"
                onChange={(event) => patchExportOptions({ frameIndexPrefix: event.target.value })}
              />
            </div>
            <div>
              <div className="mb-1">描述位置</div>
              <UiSelect
                value={exportOptions.notePlacement}
                onChange={(event) =>
                  patchExportOptions({
                    notePlacement: event.target.value === 'bottom' ? 'bottom' : 'overlay',
                  })
                }
              >
                <option value="overlay">图上遮罩</option>
                <option value="bottom">图下文字</option>
              </UiSelect>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="mb-1">间距</div>
              <UiInput
                type="number"
                min={0}
                max={120}
                value={exportOptions.cellGap}
                className="h-8"
                onChange={(event) =>
                  patchExportOptions({ cellGap: Number(event.target.value) || 0 })
                }
              />
            </div>
            <div>
              <div className="mb-1">字号(%)</div>
              <UiInput
                type="number"
                min={1}
                max={20}
                value={exportOptions.fontSize}
                className="h-8"
                onChange={(event) =>
                  patchExportOptions({ fontSize: Number(event.target.value) || 4 })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2">
              <span>背景</span>
              <input
                type="color"
                value={exportOptions.backgroundColor}
                onChange={(event) => patchExportOptions({ backgroundColor: event.target.value })}
                className="h-7 w-full rounded border border-[rgba(255,255,255,0.14)] bg-transparent"
              />
            </label>
            <label className="flex items-center gap-2">
              <span>文字</span>
              <input
                type="color"
                value={exportOptions.textColor}
                onChange={(event) => patchExportOptions({ textColor: event.target.value })}
                className="h-7 w-full rounded border border-[rgba(255,255,255,0.14)] bg-transparent"
              />
            </label>
          </div>
        </div>
      </details>

      {exportError && <div className="mt-2 text-xs text-red-400">{exportError}</div>}

      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-surface-dark !bg-accent"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-surface-dark !bg-accent"
      />
    </div>
  );
});

StoryboardNode.displayName = 'StoryboardNode';
