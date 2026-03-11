import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  memo,
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { Handle, Position, useUpdateNodeInternals, useViewport } from '@xyflow/react';
import { Minus, Plus, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  AUTO_REQUEST_ASPECT_RATIO,
  CANVAS_NODE_TYPES,
  DEFAULT_ASPECT_RATIO,
  EXPORT_RESULT_NODE_DEFAULT_WIDTH,
  EXPORT_RESULT_NODE_LAYOUT_HEIGHT,
  type ImageSize,
  type StoryboardRatioControlMode,
  type StoryboardGenNodeData,
} from '@/features/canvas/domain/canvasNodes';
import { EXPORT_RESULT_DISPLAY_NAME, resolveNodeDisplayName } from '@/features/canvas/domain/nodeDisplay';
import { useCanvasStore } from '@/stores/canvasStore';
import { useSettingsStore } from '@/stores/settingsStore';
import {
  canvasAiGateway,
  graphImageResolver,
} from '@/features/canvas/application/canvasServices';
import { resolveErrorContent, showErrorDialog } from '@/features/canvas/application/errorDialog';
import {
  detectAspectRatio,
  parseAspectRatio,
  resolveImageDisplayUrl,
} from '@/features/canvas/application/imageData';
import {
  buildGenerationErrorReport,
  CURRENT_RUNTIME_SESSION_ID,
  createReferenceImagePlaceholders,
  getRuntimeDiagnostics,
  type GenerationDebugContext,
} from '@/features/canvas/application/generationErrorReport';
import {
  sanitizeStoryboardPromptText,
  sanitizeStoryboardText,
} from '@/features/canvas/application/storyboardText';
import {
  findReferenceTokens,
  insertReferenceToken,
  removeTextRange,
  resolveReferenceAwareDeleteRange,
} from '@/features/canvas/application/referenceTokenEditing';
import {
  DEFAULT_IMAGE_MODEL_ID,
  getImageModel,
  listImageModels,
} from '@/features/canvas/models';
import { GRSAI_NANO_BANANA_PRO_MODEL_ID } from '@/features/canvas/models/image/grsai/nanoBananaPro';
import { FAL_NANO_BANANA_2_MODEL_ID } from '@/features/canvas/models/image/fal/nanoBanana2';
import { KIE_NANO_BANANA_2_MODEL_ID } from '@/features/canvas/models/image/kie/nanoBanana2';
import { ModelParamsControls } from '@/features/canvas/ui/ModelParamsControls';
import { CanvasNodeImage } from '@/features/canvas/ui/CanvasNodeImage';
import {
  UiButton,
} from '@/components/ui';
import { NodeHeader, NODE_HEADER_FLOATING_POSITION_CLASS } from '@/features/canvas/ui/NodeHeader';
import { NodeResizeHandle } from '@/features/canvas/ui/NodeResizeHandle';
import {
  NODE_CONTROL_CHIP_CLASS,
  NODE_CONTROL_ICON_CLASS,
  NODE_CONTROL_MODEL_CHIP_CLASS,
  NODE_CONTROL_PARAMS_CHIP_CLASS,
  NODE_CONTROL_PRIMARY_BUTTON_CLASS,
} from '@/features/canvas/ui/nodeControlStyles';

type StoryboardGenNodeProps = {
  id: string;
  data: StoryboardGenNodeData;
  selected?: boolean;
  width?: number;
  height?: number;
};

interface AspectRatioChoice {
  value: string;
  label: string;
}

interface PickerAnchor {
  left: number;
  top: number;
}

const AUTO_ASPECT_RATIO_OPTION: AspectRatioChoice = {
  value: AUTO_REQUEST_ASPECT_RATIO,
  label: '自动',
};
const PICKER_FALLBACK_ANCHOR: PickerAnchor = { left: 8, top: 8 };

const STORYBOARD_NODE_HORIZONTAL_PADDING_PX = 24;
const STORYBOARD_GRID_GAP_PX = 2;
const STORYBOARD_GRID_BASE_CELL_HEIGHT_PX = 78;
const STORYBOARD_GRID_MAX_WIDTH_PX = 320;
const STORYBOARD_CONTROL_ROW_WIDTH_PX = 274;
const STORYBOARD_PARAMS_ROW_WIDTH_PX = 286;
const STORYBOARD_GEN_NODE_MIN_WIDTH_PX = 520;
const STORYBOARD_GEN_NODE_MIN_HEIGHT_PX = 320;
const STORYBOARD_GEN_HEADER_ADJUST = { x: 0, y: 0, scale: 1 };
const STORYBOARD_GEN_ICON_ADJUST = { x: 0, y: 0, scale: 0.95 };
const STORYBOARD_GEN_TITLE_ADJUST = { x: 0, y: 0, scale: 1 };
const GRID_CONTROL_CONTAINER_CLASS = 'flex h-5 items-center gap-0.5 rounded-full border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.04)] px-1';
const GRID_CONTROL_LABEL_CLASS = 'text-[9px] text-text-muted';
const GRID_CONTROL_BUTTON_CLASS = 'flex h-3 w-3 items-center justify-center rounded text-text-muted transition-colors hover:bg-white/10 hover:text-text-dark';
const GRID_CONTROL_ICON_CLASS = 'h-1.5 w-1.5';
const GRID_CONTROL_VALUE_CLASS = 'min-w-[14px] text-center text-[9px] font-semibold text-text-dark';
const GRID_SUMMARY_CLASS = 'flex h-5 items-center rounded-full border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.05)] px-1.5 text-[9px] text-text-muted';
const FRAME_GRID_GAP_PX = 2;
const CONTROL_ROW_HEIGHT_PX = 20;
const CONTROL_ROW_MARGIN_BOTTOM_PX = 10;
const FRAME_GRID_MARGIN_BOTTOM_PX = 8;
const PARAM_ROW_HEIGHT_PX = 20;
const NODE_VERTICAL_PADDING_PX = 24;
const FRAME_CELL_MIN_WIDTH_PX = 24;
const FRAME_CELL_MIN_HEIGHT_PX = 16;
const GRID_LINE_THICKNESS_PERCENT = 0.4;
const RATIO_CONTROL_MODE_BUTTON_CLASS =
  'flex h-5 items-center rounded-full border px-1.5 text-[9px] transition-colors';
const FRIENDLY_ASPECT_RATIO_CANDIDATES = [
  '1:1',
  '16:9',
  '9:16',
  '4:3',
  '3:4',
  '21:9',
  '9:21',
  '3:2',
  '2:3',
  '5:4',
  '4:5',
];

function getTextareaCaretOffset(
  textarea: HTMLTextAreaElement,
  caretIndex: number
): PickerAnchor {
  const mirror = document.createElement('div');
  const computed = window.getComputedStyle(textarea);
  const mirrorStyle = mirror.style;

  mirrorStyle.position = 'absolute';
  mirrorStyle.visibility = 'hidden';
  mirrorStyle.pointerEvents = 'none';
  mirrorStyle.whiteSpace = 'pre-wrap';
  mirrorStyle.overflowWrap = 'break-word';
  mirrorStyle.wordBreak = 'break-word';
  mirrorStyle.boxSizing = computed.boxSizing;
  mirrorStyle.width = `${textarea.clientWidth}px`;
  mirrorStyle.font = computed.font;
  mirrorStyle.lineHeight = computed.lineHeight;
  mirrorStyle.letterSpacing = computed.letterSpacing;
  mirrorStyle.padding = computed.padding;
  mirrorStyle.border = computed.border;
  mirrorStyle.textTransform = computed.textTransform;
  mirrorStyle.textIndent = computed.textIndent;

  mirror.textContent = textarea.value.slice(0, caretIndex);

  const marker = document.createElement('span');
  marker.textContent = textarea.value.slice(caretIndex, caretIndex + 1) || ' ';
  mirror.appendChild(marker);

  document.body.appendChild(mirror);

  const left = marker.offsetLeft - textarea.scrollLeft;
  const top = marker.offsetTop - textarea.scrollTop;

  document.body.removeChild(mirror);

  return {
    left: Math.max(0, left),
    top: Math.max(0, top),
  };
}

function resolvePickerAnchor(
  container: HTMLDivElement | null,
  textarea: HTMLTextAreaElement,
  caretIndex: number,
  zoom: number
): PickerAnchor {
  if (!container) {
    return PICKER_FALLBACK_ANCHOR;
  }

  const containerRect = container.getBoundingClientRect();
  const textareaRect = textarea.getBoundingClientRect();
  const caretOffset = getTextareaCaretOffset(textarea, caretIndex);
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;

  return {
    left: Math.max(0, (textareaRect.left - containerRect.left) / safeZoom + caretOffset.left),
    top: Math.max(0, (textareaRect.top - containerRect.top) / safeZoom + caretOffset.top),
  };
}

function resolvePointerAnchor(
  container: HTMLDivElement | null,
  clientX: number,
  clientY: number,
  zoom: number
): PickerAnchor {
  if (!container) {
    return PICKER_FALLBACK_ANCHOR;
  }

  const containerRect = container.getBoundingClientRect();
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;

  return {
    left: Math.max(0, (clientX - containerRect.left) / safeZoom),
    top: Math.max(0, (clientY - containerRect.top) / safeZoom),
  };
}

function resolveReferenceIndexFromDescription(
  description: string,
  maxImageCount: number
): number | null {
  const firstReference = findReferenceTokens(description, maxImageCount)[0];
  if (!firstReference) {
    return null;
  }

  return firstReference.value - 1;
}

function renderFrameDescriptionWithHighlights(description: string, maxImageCount: number): ReactNode {
  if (!description) {
    return ' ';
  }

  const segments: ReactNode[] = [];
  let lastIndex = 0;
  const referenceTokens = findReferenceTokens(description, maxImageCount);
  for (const token of referenceTokens) {
    const matchStart = token.start;
    const matchText = token.token;

    if (matchStart > lastIndex) {
      segments.push(
        <span key={`plain-${lastIndex}`}>{description.slice(lastIndex, matchStart)}</span>
      );
    }

    segments.push(
      <span
        key={`ref-${matchStart}`}
        className="relative z-0 text-white [text-shadow:0.24px_0_currentColor,-0.24px_0_currentColor] before:absolute before:-inset-x-[4px] before:-inset-y-[1px] before:-z-10 before:rounded-[7px] before:bg-accent/55 before:content-['']"
      >
        {matchText}
      </span>
    );

    lastIndex = matchStart + matchText.length;
  }

  if (lastIndex < description.length) {
    segments.push(<span key={`plain-${lastIndex}`}>{description.slice(lastIndex)}</span>);
  }

  return segments;
}

function buildFrameDescriptionDrafts(
  frames: StoryboardGenNodeData['frames']
): Record<string, string> {
  const drafts: Record<string, string> = {};
  for (const frame of frames) {
    drafts[frame.id] = frame.description;
  }
  return drafts;
}

function areFrameDescriptionDraftsEqual(
  left: Record<string, string>,
  right: Record<string, string>
): boolean {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  if (leftEntries.length !== rightEntries.length) {
    return false;
  }

  for (const [key, value] of leftEntries) {
    if (right[key] !== value) {
      return false;
    }
  }

  return true;
}

type GridStepperControlProps = {
  label: string;
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
};

function GridStepperControl({
  label,
  value,
  onDecrease,
  onIncrease,
}: GridStepperControlProps) {
  return (
    <div className={GRID_CONTROL_CONTAINER_CLASS}>
      <span className={GRID_CONTROL_LABEL_CLASS}>{label}</span>
      <button
        type="button"
        className={GRID_CONTROL_BUTTON_CLASS}
        onClick={(event) => {
          event.stopPropagation();
          onDecrease();
        }}
      >
        <Minus className={GRID_CONTROL_ICON_CLASS} />
      </button>
      <span className={GRID_CONTROL_VALUE_CLASS}>{value}</span>
      <button
        type="button"
        className={GRID_CONTROL_BUTTON_CLASS}
        onClick={(event) => {
          event.stopPropagation();
          onIncrease();
        }}
      >
        <Plus className={GRID_CONTROL_ICON_CLASS} />
      </button>
    </div>
  );
}

function pickClosestAspectRatio(
  targetRatio: number,
  supportedAspectRatios: string[]
): string {
  const supported = supportedAspectRatios.length > 0 ? supportedAspectRatios : ['1:1'];
  let bestValue = supported[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const aspectRatio of supported) {
    const ratio = parseAspectRatio(aspectRatio);
    const distance = Math.abs(Math.log(ratio / targetRatio));
    if (distance < bestDistance) {
      bestDistance = distance;
      bestValue = aspectRatio;
    }
  }

  return bestValue;
}

function ratioValueToAspectRatioString(ratioValue: number): string {
  if (!Number.isFinite(ratioValue) || ratioValue <= 0) {
    return DEFAULT_ASPECT_RATIO;
  }

  const scaledWidth = Math.max(1, Math.round(ratioValue * 1000));
  const scaledHeight = 1000;
  const gcd = (left: number, right: number): number => {
    let a = Math.abs(left);
    let b = Math.abs(right);
    while (b !== 0) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a || 1;
  };

  const divisor = gcd(scaledWidth, scaledHeight);
  return `${Math.round(scaledWidth / divisor)}:${Math.round(scaledHeight / divisor)}`;
}

function formatFriendlyAspectRatio(ratioValue: number): string {
  if (!Number.isFinite(ratioValue) || ratioValue <= 0) {
    return DEFAULT_ASPECT_RATIO;
  }

  const snapped = pickClosestAspectRatio(ratioValue, FRIENDLY_ASPECT_RATIO_CANDIDATES);
  const snappedValue = parseAspectRatio(snapped);
  const snapDistance = Math.abs(Math.log(snappedValue / ratioValue));
  if (snapDistance <= Math.log(1.04)) {
    return snapped;
  }

  if (ratioValue >= 1) {
    return `${ratioValue.toFixed(2)}:1`;
  }

  return `1:${(1 / ratioValue).toFixed(2)}`;
}

function resolveStoryboardAspectRatios(
  mode: StoryboardRatioControlMode,
  controlRatioValue: number,
  rows: number,
  cols: number
): {
  cellRatioValue: number;
  overallRatioValue: number;
  cellAspectRatio: string;
  overallAspectRatio: string;
  cellAspectRatioLabel: string;
  overallAspectRatioLabel: string;
} {
  const safeRows = Math.max(1, rows);
  const safeCols = Math.max(1, cols);
  const safeControl = Number.isFinite(controlRatioValue) && controlRatioValue > 0
    ? controlRatioValue
    : 1;

  const cellRatioValue = mode === 'cell'
    ? safeControl
    : safeControl * (safeRows / safeCols);
  const overallRatioValue = mode === 'overall'
    ? safeControl
    : safeControl * (safeCols / safeRows);

  return {
    cellRatioValue,
    overallRatioValue,
    cellAspectRatio: ratioValueToAspectRatioString(cellRatioValue),
    overallAspectRatio: ratioValueToAspectRatioString(overallRatioValue),
    cellAspectRatioLabel: formatFriendlyAspectRatio(cellRatioValue),
    overallAspectRatioLabel: formatFriendlyAspectRatio(overallRatioValue),
  };
}

function generateFrameId(): string {
  return `frame-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function toCssAspectRatio(aspectRatio: string): string {
  const [width = '1', height = '1'] = aspectRatio.split(':');
  return `${width} / ${height}`;
}

/**
 * 将 ImageSize 解析为像素宽度
 */
function resolveSizeToPixels(size: string): number {
  const sizeMap: Record<string, number> = {
    '0.5K': 512,
    '1K': 1024,
    '2K': 2048,
    '4K': 4096,
  };
  return sizeMap[size] ?? 1024;
}

/**
 * 生成网格图片的 dataURL
 * 根据用户设置的分辨率、行列数和比例生成白底黑线的网格图
 * 用于帮助 API 更好地生成分镜
 */
function generateGridImageDataUrl(
  aspectRatio: string,
  rows: number,
  cols: number,
  resolution: string,
  lineThicknessPercent: number = GRID_LINE_THICKNESS_PERCENT
): string {
  const [ratioW = '16', ratioH = '9'] = aspectRatio.split(':');
  const ratioWNum = parseFloat(ratioW);
  const ratioHNum = parseFloat(ratioH);

  // 根据分辨率计算画布的总像素尺寸
  const totalPixels = resolveSizeToPixels(resolution);

  // 根据比例计算画布的实际宽高
  // 宽度 = 总像素，高度根据比例计算
  const canvasWidth = totalPixels;
  const canvasHeight = Math.round(totalPixels * (ratioHNum / ratioWNum));
  const thickness = Math.max(
    1,
    Math.round((Math.min(canvasWidth, canvasHeight) * lineThicknessPercent) / 100)
  );

  // 计算单个格子的像素尺寸
  const cellWidth = canvasWidth / cols;
  const cellHeight = canvasHeight / rows;

  // 创建 canvas 并绘制
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to create canvas context');
  }

  // 白色背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 黑色线条
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = thickness;

  // 绘制内部垂直线 (不包含最左边和最右边)
  for (let i = 1; i < cols; i++) {
    const x = i * cellWidth;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
  }

  // 绘制内部水平线 (不包含最上边和最下边)
  for (let i = 1; i < rows; i++) {
    const y = i * cellHeight;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();
  }

  return canvas.toDataURL('image/png');
}

export const StoryboardGenNode = memo(({ id, data, selected, width, height }: StoryboardGenNodeProps) => {
  const { t } = useTranslation();
  const { zoom } = useViewport();
  const updateNodeInternals = useUpdateNodeInternals();
  const setSelectedNode = useCanvasStore((state) => state.setSelectedNode);
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const addNode = useCanvasStore((state) => state.addNode);
  const addEdge = useCanvasStore((state) => state.addEdge);
  const findNodePosition = useCanvasStore((state) => state.findNodePosition);
  const apiKeys = useSettingsStore((state) => state.apiKeys);
  const grsaiNanoBananaProModel = useSettingsStore((state) => state.grsaiNanoBananaProModel);
  const storyboardGenKeepStyleConsistent = useSettingsStore(
    (state) => state.storyboardGenKeepStyleConsistent
  );
  const storyboardGenDisableTextInImage = useSettingsStore(
    (state) => state.storyboardGenDisableTextInImage
  );
  const storyboardGenAutoInferEmptyFrame = useSettingsStore(
    (state) => state.storyboardGenAutoInferEmptyFrame
  );
  const ignoreAtTagWhenCopyingAndGenerating = useSettingsStore(
    (state) => state.ignoreAtTagWhenCopyingAndGenerating
  );
  const enableStoryboardGenGridPreviewShortcut = useSettingsStore(
    (state) => state.enableStoryboardGenGridPreviewShortcut
  );
  const showStoryboardGenAdvancedRatioControls = useSettingsStore(
    (state) => state.showStoryboardGenAdvancedRatioControls
  );

  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeFrameTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [pickerFrameIndex, setPickerFrameIndex] = useState<number | null>(null);
  const [pickerCursor, setPickerCursor] = useState<number | null>(null);
  const [pickerActiveIndex, setPickerActiveIndex] = useState(0);
  const [pickerAnchor, setPickerAnchor] = useState<PickerAnchor>(PICKER_FALLBACK_ANCHOR);
  const lastPointerAnchorRef = useRef<{ frameIndex: number; anchor: PickerAnchor } | null>(null);
  const frameTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const frameHighlightRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const nodeData = data as StoryboardGenNodeData;
  const [frameDescriptionDrafts, setFrameDescriptionDrafts] = useState<Record<string, string>>(() =>
    buildFrameDescriptionDrafts(nodeData.frames)
  );
  const frameDescriptionDraftsRef = useRef(frameDescriptionDrafts);
  const resolvedTitle = useMemo(
    () => resolveNodeDisplayName(CANVAS_NODE_TYPES.storyboardGen, nodeData),
    [nodeData]
  );

  const incomingImages = useMemo(
    () => graphImageResolver.collectInputImages(id, nodes, edges),
    [id, nodes, edges]
  );
  const incomingImageItems = useMemo(
    () =>
      incomingImages.map((imageUrl, index) => ({
        imageUrl,
        displayUrl: resolveImageDisplayUrl(imageUrl),
        label: `图${index + 1}`,
      })),
    [incomingImages]
  );
  const incomingImageViewerList = useMemo(
    () => incomingImageItems.map((item) => resolveImageDisplayUrl(item.imageUrl)),
    [incomingImageItems]
  );

  const imageModels = useMemo(() => listImageModels(), []);

  const selectedModel = useMemo(() => {
    const modelId = nodeData.model ?? DEFAULT_IMAGE_MODEL_ID;
    return getImageModel(modelId);
  }, [nodeData.model]);
  const providerApiKey = apiKeys[selectedModel.providerId] ?? '';

  const selectedResolution = useMemo((): AspectRatioChoice => {
    const nodeSize = nodeData.size;
    const found = nodeSize ? selectedModel.resolutions.find((item) => item.value === nodeSize) : undefined;
    return found ?? selectedModel.resolutions.find((item) => item.value === selectedModel.defaultResolution) ?? selectedModel.resolutions[0];
  }, [nodeData.size, selectedModel]);

  const aspectRatioOptions = useMemo<AspectRatioChoice[]>(
    () => [AUTO_ASPECT_RATIO_OPTION, ...selectedModel.aspectRatios],
    [selectedModel.aspectRatios]
  );

  const selectedAspectRatio = useMemo((): AspectRatioChoice => {
    const nodeAspectRatio = nodeData.requestAspectRatio;
    const found = nodeAspectRatio ? aspectRatioOptions.find((item) => item.value === nodeAspectRatio) : undefined;
    return found ?? AUTO_ASPECT_RATIO_OPTION;
  }, [aspectRatioOptions, nodeData.requestAspectRatio]);

  const ratioControlMode: StoryboardRatioControlMode = showStoryboardGenAdvancedRatioControls
    ? (nodeData.ratioControlMode === 'overall' ? 'overall' : 'cell')
    : 'cell';
  const controlAspectRatioValue = useMemo(() => {
    if (selectedAspectRatio.value === AUTO_REQUEST_ASPECT_RATIO) {
      return nodeData.aspectRatio || DEFAULT_ASPECT_RATIO;
    }
    return selectedAspectRatio.value || DEFAULT_ASPECT_RATIO;
  }, [nodeData.aspectRatio, selectedAspectRatio.value]);
  const resolvedAspectRatios = useMemo(
    () => resolveStoryboardAspectRatios(
      ratioControlMode,
      parseAspectRatio(controlAspectRatioValue),
      nodeData.gridRows,
      nodeData.gridCols
    ),
    [controlAspectRatioValue, nodeData.gridCols, nodeData.gridRows, ratioControlMode]
  );
  const frameAspectRatioValue = resolvedAspectRatios.cellAspectRatio;

  const baseFrameLayout = useMemo(() => {
    const aspectRatio = Math.max(0.1, parseAspectRatio(frameAspectRatioValue));
    let cellWidth = STORYBOARD_GRID_BASE_CELL_HEIGHT_PX * aspectRatio;
    let gridWidth = nodeData.gridCols * cellWidth + Math.max(0, nodeData.gridCols - 1) * STORYBOARD_GRID_GAP_PX;

    if (gridWidth > STORYBOARD_GRID_MAX_WIDTH_PX) {
      const scale = STORYBOARD_GRID_MAX_WIDTH_PX / gridWidth;
      cellWidth *= scale;
      gridWidth =
        nodeData.gridCols * cellWidth + Math.max(0, nodeData.gridCols - 1) * STORYBOARD_GRID_GAP_PX;
    }

    const roundedCellWidth = Math.max(FRAME_CELL_MIN_WIDTH_PX, Math.round(cellWidth));
    const roundedCellHeight = Math.max(FRAME_CELL_MIN_HEIGHT_PX, Math.round(roundedCellWidth / aspectRatio));
    const roundedGridWidth =
      nodeData.gridCols * roundedCellWidth + Math.max(0, nodeData.gridCols - 1) * STORYBOARD_GRID_GAP_PX;
    const roundedGridHeight =
      nodeData.gridRows * roundedCellHeight + Math.max(0, nodeData.gridRows - 1) * FRAME_GRID_GAP_PX;
    const nodeInnerWidth = Math.max(
      STORYBOARD_CONTROL_ROW_WIDTH_PX,
      STORYBOARD_PARAMS_ROW_WIDTH_PX,
      roundedGridWidth
    );
    const nodeWidth = Math.max(
      STORYBOARD_GEN_NODE_MIN_WIDTH_PX,
      Math.round(nodeInnerWidth + STORYBOARD_NODE_HORIZONTAL_PADDING_PX)
    );
    const nodeHeight = Math.max(
      STORYBOARD_GEN_NODE_MIN_HEIGHT_PX,
      Math.round(
      NODE_VERTICAL_PADDING_PX +
      CONTROL_ROW_HEIGHT_PX +
      CONTROL_ROW_MARGIN_BOTTOM_PX +
      roundedGridHeight +
      FRAME_GRID_MARGIN_BOTTOM_PX +
      PARAM_ROW_HEIGHT_PX
      )
    );

    return {
      nodeWidth,
      nodeHeight,
    };
  }, [frameAspectRatioValue, nodeData.gridCols, nodeData.gridRows]);

  const requestResolution = selectedModel.resolveRequest({
    referenceImageCount: incomingImages.length,
  });
  const showWebSearchToggle =
    selectedModel.id === FAL_NANO_BANANA_2_MODEL_ID ||
    selectedModel.id === KIE_NANO_BANANA_2_MODEL_ID;
  const webSearchEnabled = Boolean(nodeData.extraParams?.enable_web_search);

  const supportedAspectRatioValues = useMemo(
    () => selectedModel.aspectRatios.map((item) => item.value),
    [selectedModel.aspectRatios]
  );
  const mappedOverallRequestAspectRatio = useMemo(
    () =>
      pickClosestAspectRatio(
        resolvedAspectRatios.overallRatioValue,
        supportedAspectRatioValues
      ),
    [resolvedAspectRatios.overallRatioValue, supportedAspectRatioValues]
  );

  const totalFrames = useMemo(
    () => (nodeData.gridRows ?? 1) * (nodeData.gridCols ?? 1),
    [nodeData.gridRows, nodeData.gridCols]
  );
  const resolvedNodeWidth = Math.max(
    baseFrameLayout.nodeWidth,
    Math.round(width ?? baseFrameLayout.nodeWidth)
  );
  const resolvedNodeHeight = Math.max(
    baseFrameLayout.nodeHeight,
    Math.round(height ?? baseFrameLayout.nodeHeight)
  );
  const frameLayout = useMemo(() => {
    const cols = Math.max(1, nodeData.gridCols);
    const rows = Math.max(1, nodeData.gridRows);
    const aspectRatio = Math.max(0.1, parseAspectRatio(frameAspectRatioValue));
    const innerWidth = Math.max(120, resolvedNodeWidth - STORYBOARD_NODE_HORIZONTAL_PADDING_PX);
    const availableGridHeight = Math.max(
      72,
      resolvedNodeHeight
      - NODE_VERTICAL_PADDING_PX
      - CONTROL_ROW_HEIGHT_PX
      - CONTROL_ROW_MARGIN_BOTTOM_PX
      - FRAME_GRID_MARGIN_BOTTOM_PX
      - PARAM_ROW_HEIGHT_PX
    );
    const widthLimitedCellWidth =
      (innerWidth - Math.max(0, cols - 1) * STORYBOARD_GRID_GAP_PX) / cols;
    const heightLimitedCellHeight =
      (availableGridHeight - Math.max(0, rows - 1) * FRAME_GRID_GAP_PX) / rows;
    const heightLimitedCellWidth = heightLimitedCellHeight * aspectRatio;
    const resolvedCellWidth = Math.floor(Math.min(widthLimitedCellWidth, heightLimitedCellWidth));
    const cellWidth = Math.max(FRAME_CELL_MIN_WIDTH_PX, resolvedCellWidth);
    const gridWidth = cols * cellWidth + Math.max(0, cols - 1) * STORYBOARD_GRID_GAP_PX;
    const paramsRowWidth = Math.max(
      STORYBOARD_PARAMS_ROW_WIDTH_PX,
      Math.floor(innerWidth)
    );

    return {
      cellWidth,
      gridWidth,
      paramsRowWidth,
      cellAspectRatio: toCssAspectRatio(frameAspectRatioValue),
    };
  }, [frameAspectRatioValue, nodeData.gridCols, nodeData.gridRows, resolvedNodeHeight, resolvedNodeWidth]);

  useEffect(() => {
    frameDescriptionDraftsRef.current = frameDescriptionDrafts;
  }, [frameDescriptionDrafts]);

  useEffect(() => {
    const nextDrafts = buildFrameDescriptionDrafts(nodeData.frames);
    setFrameDescriptionDrafts((previous) =>
      areFrameDescriptionDraftsEqual(previous, nextDrafts) ? previous : nextDrafts
    );
  }, [nodeData.frames]);

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, resolvedNodeHeight, resolvedNodeWidth, updateNodeInternals]);

  // Sync model, size, aspect ratio with node data
  useEffect(() => {
    if (nodeData.model !== selectedModel.id) {
      updateNodeData(id, { model: selectedModel.id });
    }

    if (nodeData.size !== selectedResolution.value) {
      updateNodeData(id, { size: selectedResolution.value as ImageSize });
    }

    if (nodeData.requestAspectRatio !== selectedAspectRatio.value) {
      updateNodeData(id, { requestAspectRatio: selectedAspectRatio.value });
    }
  }, [
    id,
    nodeData,
    selectedModel.id,
    selectedResolution.value,
    selectedAspectRatio.value,
    updateNodeData,
  ]);

  useEffect(() => {
    if (incomingImages.length === 0) {
      setShowImagePicker(false);
      setPickerFrameIndex(null);
      setPickerCursor(null);
      setPickerActiveIndex(0);
      return;
    }

    setPickerActiveIndex((previous) => Math.min(previous, incomingImages.length - 1));
  }, [incomingImages.length]);

  useEffect(() => {
    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }

      setShowImagePicker(false);
      setPickerFrameIndex(null);
      setPickerCursor(null);
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
    };
  }, []);

  // Auto-generate frames when grid changes
  useEffect(() => {
    const currentFrames = nodeData.frames;
    const targetCount = totalFrames;

    if (currentFrames.length === targetCount) {
      return;
    }

    const newFrames: StoryboardGenNodeData['frames'] = [];
    for (let i = 0; i < targetCount; i++) {
      if (i < currentFrames.length) {
        newFrames.push(currentFrames[i]);
      } else {
        newFrames.push({
          id: generateFrameId(),
          description: '',
          referenceIndex: null,
        });
      }
    }

    updateNodeData(id, { frames: newFrames });
  }, [id, nodeData.frames, totalFrames, updateNodeData]);

  // Build prompt from frames
  const buildPrompt = useCallback((): string => {
    if (!nodeData) {
      return '';
    }

    const { gridRows, gridCols, frames } = nodeData;
    const parts: string[] = [];

    const promptDirectives: string[] = [
      `生成一张${gridRows}×${gridCols}的${gridRows * gridCols}宫格分镜图`,
    ];
    if (storyboardGenKeepStyleConsistent) {
      promptDirectives.push('图片风格与参考图保持一致');
    }
    if (storyboardGenDisableTextInImage) {
      promptDirectives.push('禁止添加描述文本');
    }
    parts.push(`${promptDirectives.join('，')}。`);

    frames.forEach((frame, index) => {
      const frameDescription = frameDescriptionDraftsRef.current[frame.id] ?? frame.description;
      const sanitizedDescription = sanitizeStoryboardPromptText(frameDescription);
      if (!sanitizedDescription) {
        if (storyboardGenAutoInferEmptyFrame) {
          parts.push(`分镜${index + 1}：依据之前的内容进行推测`);
        }
        return;
      }

      parts.push(`分镜${index + 1}：${sanitizedDescription}`);
    });

    return parts.join('\n');
  }, [
    nodeData,
    storyboardGenAutoInferEmptyFrame,
    storyboardGenDisableTextInImage,
    storyboardGenKeepStyleConsistent,
  ]);

  const resolveEffectiveRequestAspectRatio = useCallback(async (): Promise<string> => {
    const safeRows = Math.max(1, nodeData.gridRows);
    const safeCols = Math.max(1, nodeData.gridCols);
    if (selectedAspectRatio.value !== AUTO_REQUEST_ASPECT_RATIO) {
      return mappedOverallRequestAspectRatio;
    }

    let autoControlRatioValue = 1;
    if (incomingImages.length > 0) {
      try {
        const sourceAspectRatio = await detectAspectRatio(incomingImages[0]);
        autoControlRatioValue = Math.max(0.1, parseAspectRatio(sourceAspectRatio));
      } catch {
        autoControlRatioValue = 1;
      }
    }

    const autoResolvedRatios = resolveStoryboardAspectRatios(
      ratioControlMode,
      autoControlRatioValue,
      safeRows,
      safeCols
    );
    return pickClosestAspectRatio(
      autoResolvedRatios.overallRatioValue,
      supportedAspectRatioValues
    );
  }, [
    incomingImages,
    mappedOverallRequestAspectRatio,
    nodeData.gridCols,
    nodeData.gridRows,
    ratioControlMode,
    selectedAspectRatio.value,
    supportedAspectRatioValues,
  ]);

  const handleGenerate = useCallback(async (previewGridOnly = false) => {
    if (!nodeData) {
      return;
    }

    const safeRows = Math.max(1, nodeData.gridRows);
    const safeCols = Math.max(1, nodeData.gridCols);
    const resolvedRequestAspectRatio = await resolveEffectiveRequestAspectRatio();

    if (previewGridOnly) {
      const gridImageDataUrl = generateGridImageDataUrl(
        resolvedRequestAspectRatio,
        safeRows,
        safeCols,
        selectedResolution.value
      );
      const newNodePosition = findNodePosition(
        id,
        EXPORT_RESULT_NODE_DEFAULT_WIDTH,
        EXPORT_RESULT_NODE_LAYOUT_HEIGHT
      );
      const previewNodeId = addNode(
        CANVAS_NODE_TYPES.exportImage,
        newNodePosition,
        {
          displayName: t('node.storyboardGen.gridPreviewTitle'),
          resultKind: 'storyboardGenOutput',
          imageUrl: gridImageDataUrl,
          previewImageUrl: gridImageDataUrl,
          aspectRatio: resolvedRequestAspectRatio,
          isGenerating: false,
          generationStartedAt: null,
          requestAspectRatio: resolvedRequestAspectRatio,
        }
      );
      addEdge(id, previewNodeId);
      setSelectedNode(null);
      setError(null);
      return;
    }

    const prompt = buildPrompt();
    if (!prompt) {
      const errorMessage = '请填写至少一个分镜内容描述';
      setError(errorMessage);
      void showErrorDialog(errorMessage, '错误');
      return;
    }

    if (!providerApiKey) {
      const errorMessage = '请在设置中填写 API Key';
      setError(errorMessage);
      void showErrorDialog(errorMessage, '错误');
      return;
    }

    const generationDurationMs = selectedModel.expectedDurationMs ?? 60000;
    const generationStartedAt = Date.now();
    const runtimeDiagnostics = await getRuntimeDiagnostics();

    // Create new image node with generating state immediately
    // Use auto-positioning to avoid collisions with existing nodes
    const newNodePosition = findNodePosition(
      id,
      EXPORT_RESULT_NODE_DEFAULT_WIDTH,
      EXPORT_RESULT_NODE_LAYOUT_HEIGHT
    );
    const newNodeId = addNode(
      CANVAS_NODE_TYPES.exportImage,
      newNodePosition,
      {
        isGenerating: true,
        generationStartedAt,
        generationDurationMs,
        displayName: EXPORT_RESULT_DISPLAY_NAME.storyboardGenOutput,
        resultKind: 'storyboardGenOutput',
        prompt: '',
        model: selectedModel.id,
        size: selectedResolution.value as ImageSize,
        requestAspectRatio: mappedOverallRequestAspectRatio,
      }
    );

    // Connect the storyboard node to the new image node
    addEdge(id, newNodeId);

    setSelectedNode(null);
    setError(null);

    try {
      await canvasAiGateway.setApiKey(selectedModel.providerId, providerApiKey);

      // 生成网格图片作为最后一张参考图片
      const gridImageDataUrl = generateGridImageDataUrl(
        resolvedRequestAspectRatio,
        safeRows,
        safeCols,
        selectedResolution.value
      );

      // 将网格图片作为最后一张参考图片
      const allReferenceImages = [...incomingImages, gridImageDataUrl];

      const metadataFrameNotes = nodeData.frames
        .slice(0, safeRows * safeCols)
        .map((frame) => {
          const description = frameDescriptionDraftsRef.current[frame.id] ?? frame.description;
          return sanitizeStoryboardText(description, ignoreAtTagWhenCopyingAndGenerating);
        });

      const jobId = await canvasAiGateway.submitGenerateImageJob({
        prompt,
        model: requestResolution.requestModel,
        size: selectedResolution.value,
        aspectRatio: resolvedRequestAspectRatio,
        referenceImages: allReferenceImages,
        extraParams: {
          ...(nodeData.extraParams ?? {}),
          ...(selectedModel.id === GRSAI_NANO_BANANA_PRO_MODEL_ID
            ? { grsai_pro_model: grsaiNanoBananaProModel }
            : {}),
        },
      });
      const generationDebugContext: GenerationDebugContext = {
        sourceType: 'storyboardGen',
        providerId: selectedModel.providerId,
        requestModel: requestResolution.requestModel,
        requestSize: selectedResolution.value,
        requestAspectRatio: resolvedRequestAspectRatio,
        prompt,
        extraParams: {
          ...(nodeData.extraParams ?? {}),
          ...(selectedModel.id === GRSAI_NANO_BANANA_PRO_MODEL_ID
            ? { grsai_pro_model: grsaiNanoBananaProModel }
            : {}),
        },
        referenceImageCount: allReferenceImages.length,
        referenceImagePlaceholders: createReferenceImagePlaceholders(allReferenceImages.length),
        appVersion: runtimeDiagnostics.appVersion,
        osName: runtimeDiagnostics.osName,
        osVersion: runtimeDiagnostics.osVersion,
        osBuild: runtimeDiagnostics.osBuild,
        userAgent: runtimeDiagnostics.userAgent,
      };
      updateNodeData(newNodeId, {
        generationJobId: jobId,
        generationSourceType: 'storyboardGen',
        generationProviderId: selectedModel.providerId,
        generationClientSessionId: CURRENT_RUNTIME_SESSION_ID,
        generationDebugContext,
        generationStoryboardMetadata: {
          gridRows: safeRows,
          gridCols: safeCols,
          frameNotes: metadataFrameNotes,
        },
      });
    } catch (generationError) {
      const resolvedError = resolveErrorContent(generationError, '生成失败');
      const generationDebugContext: GenerationDebugContext = {
        sourceType: 'storyboardGen',
        providerId: selectedModel.providerId,
        requestModel: requestResolution.requestModel,
        requestSize: selectedResolution.value,
        requestAspectRatio: resolvedRequestAspectRatio,
        prompt,
        extraParams: {
          ...(nodeData.extraParams ?? {}),
          ...(selectedModel.id === GRSAI_NANO_BANANA_PRO_MODEL_ID
            ? { grsai_pro_model: grsaiNanoBananaProModel }
            : {}),
        },
        referenceImageCount: incomingImages.length + 1,
        referenceImagePlaceholders: createReferenceImagePlaceholders(incomingImages.length + 1),
        appVersion: runtimeDiagnostics.appVersion,
        osName: runtimeDiagnostics.osName,
        osVersion: runtimeDiagnostics.osVersion,
        osBuild: runtimeDiagnostics.osBuild,
        userAgent: runtimeDiagnostics.userAgent,
      };
      const reportText = buildGenerationErrorReport({
        errorMessage: resolvedError.message,
        errorDetails: resolvedError.details,
        context: generationDebugContext,
      });
      setError(resolvedError.message);
      void showErrorDialog(resolvedError.message, '错误', resolvedError.details, reportText);
      // Clear generating state and mark as failed
      updateNodeData(newNodeId, {
        isGenerating: false,
        generationStartedAt: null,
        generationJobId: null,
        generationProviderId: null,
        generationClientSessionId: null,
        generationStoryboardMetadata: undefined,
        generationError: resolvedError.message,
        generationErrorDetails: resolvedError.details ?? null,
        generationDebugContext,
      });
    }
  }, [
    providerApiKey,
    nodeData,
    incomingImages,
    requestResolution.requestModel,
    nodeData.extraParams,
    grsaiNanoBananaProModel,
    selectedModel.expectedDurationMs,
    selectedModel.id,
    selectedModel.providerId,
    supportedAspectRatioValues,
    setSelectedNode,
    selectedAspectRatio.value,
    selectedResolution.value,
    addNode,
    addEdge,
    buildPrompt,
    selectedModel.id,
    findNodePosition,
    updateNodeData,
    mappedOverallRequestAspectRatio,
    resolveEffectiveRequestAspectRatio,
    t,
    ignoreAtTagWhenCopyingAndGenerating,
  ]);

  const handleRowChange = useCallback(
    (delta: number) => {
      if (!nodeData) {
        return;
      }
      const newRows = Math.max(1, Math.min(9, nodeData.gridRows + delta));
      updateNodeData(id, { gridRows: newRows });
    },
    [nodeData, updateNodeData]
  );

  const handleColChange = useCallback(
    (delta: number) => {
      if (!nodeData) {
        return;
      }
      const newCols = Math.max(1, Math.min(9, nodeData.gridCols + delta));
      updateNodeData(id, { gridCols: newCols });
    },
    [nodeData, updateNodeData]
  );

  const handleFrameDescriptionChange = useCallback(
    (index: number, description: string) => {
      const frame = nodeData.frames[index];
      if (!frame) {
        return;
      }

      setFrameDescriptionDrafts((previous) =>
        previous[frame.id] === description
          ? previous
          : {
            ...previous,
            [frame.id]: description,
          }
      );

      const referenceIndex = resolveReferenceIndexFromDescription(description, incomingImages.length);
      if (frame.description === description && frame.referenceIndex === referenceIndex) {
        return;
      }

      const newFrames = [...nodeData.frames];
      newFrames[index] = { ...frame, description, referenceIndex };
      updateNodeData(id, { frames: newFrames });
    },
    [id, incomingImages.length, nodeData.frames, updateNodeData]
  );

  const closeImagePicker = useCallback(() => {
    setShowImagePicker(false);
    setPickerFrameIndex(null);
    setPickerCursor(null);
    setPickerActiveIndex(0);
  }, []);

  const syncFrameHighlightScroll = useCallback((frameId: string) => {
    const textarea = frameTextareaRefs.current[frameId];
    const highlight = frameHighlightRefs.current[frameId];
    if (!textarea || !highlight) {
      return;
    }

    highlight.scrollTop = textarea.scrollTop;
    highlight.scrollLeft = textarea.scrollLeft;
  }, []);

  const insertImageReference = useCallback((imageIndex: number) => {
    if (!nodeData || pickerFrameIndex === null) {
      return;
    }

    const frame = nodeData.frames[pickerFrameIndex];
    if (!frame) {
      closeImagePicker();
      return;
    }

    const marker = `@图${imageIndex + 1}`;
    const currentDescription = frameDescriptionDraftsRef.current[frame.id] ?? frame.description;
    const cursor = pickerCursor ?? currentDescription.length;
    const { nextText: nextDescription, nextCursor } = insertReferenceToken(
      currentDescription,
      cursor,
      marker
    );
    handleFrameDescriptionChange(pickerFrameIndex, nextDescription);
    closeImagePicker();

    requestAnimationFrame(() => {
      activeFrameTextareaRef.current?.focus();
      activeFrameTextareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  }, [closeImagePicker, handleFrameDescriptionChange, nodeData, pickerCursor, pickerFrameIndex]);

  const handleFrameDescriptionKeyDown = useCallback(
    (index: number, event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (showImagePicker && incomingImages.length > 0 && pickerFrameIndex === index) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setPickerActiveIndex((previous) => (previous + 1) % incomingImages.length);
          return;
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setPickerActiveIndex((previous) =>
            previous === 0 ? incomingImages.length - 1 : previous - 1
          );
          return;
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          insertImageReference(pickerActiveIndex);
          return;
        }
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        const frame = nodeData.frames[index];
        if (!frame) {
          return;
        }

        const currentDescription = frameDescriptionDraftsRef.current[frame.id] ?? frame.description;
        const selectionStart = event.currentTarget.selectionStart ?? currentDescription.length;
        const selectionEnd = event.currentTarget.selectionEnd ?? selectionStart;
        const deleteDirection = event.key === 'Backspace' ? 'backward' : 'forward';
        const deleteRange = resolveReferenceAwareDeleteRange(
          currentDescription,
          selectionStart,
          selectionEnd,
          deleteDirection,
          incomingImages.length
        );
        if (deleteRange) {
          event.preventDefault();
          const { nextText, nextCursor } = removeTextRange(currentDescription, deleteRange);
          handleFrameDescriptionChange(index, nextText);
          requestAnimationFrame(() => {
            activeFrameTextareaRef.current?.focus();
            activeFrameTextareaRef.current?.setSelectionRange(nextCursor, nextCursor);
            syncFrameHighlightScroll(frame.id);
          });
          return;
        }
      }

      if (event.key === '@' && incomingImages.length > 0) {
        event.preventDefault();
        const cursor = event.currentTarget.selectionStart ?? event.currentTarget.value.length;
        const pointerAnchor = lastPointerAnchorRef.current;
        if (pointerAnchor && pointerAnchor.frameIndex === index) {
          setPickerAnchor(pointerAnchor.anchor);
        } else {
          setPickerAnchor(resolvePickerAnchor(rootRef.current, event.currentTarget, cursor, zoom));
        }
        setPickerFrameIndex(index);
        setPickerCursor(cursor);
        setPickerActiveIndex(0);
        setShowImagePicker(true);
        activeFrameTextareaRef.current = event.currentTarget;
        return;
      }

      if (event.key === 'Escape' && showImagePicker) {
        event.preventDefault();
        closeImagePicker();
      }
    },
    [
      closeImagePicker,
      handleFrameDescriptionChange,
      incomingImages.length,
      insertImageReference,
      nodeData.frames,
      pickerActiveIndex,
      pickerFrameIndex,
      showImagePicker,
      syncFrameHighlightScroll,
      zoom,
    ]
  );

  if (!nodeData) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className={`
        group relative flex h-full flex-col overflow-visible rounded-[var(--node-radius)] border bg-surface-dark/95 p-3 transition-colors duration-150
        ${selected
          ? 'border-accent shadow-[0_0_0_1px_rgba(59,130,246,0.32)]'
          : 'border-[rgba(15,23,42,0.22)] hover:border-[rgba(15,23,42,0.34)] dark:border-[rgba(255,255,255,0.22)] dark:hover:border-[rgba(255,255,255,0.34)]'
        }
      `}
      style={{
        width: `${resolvedNodeWidth}px`,
        height: `${resolvedNodeHeight}px`,
      }}
      onClick={() => setSelectedNode(id)}
    >
      {/* Floating title */}
      <NodeHeader
        className={NODE_HEADER_FLOATING_POSITION_CLASS}
        icon={<Sparkles className="h-4 w-4" />}
        titleText={resolvedTitle}
        headerAdjust={STORYBOARD_GEN_HEADER_ADJUST}
        iconAdjust={STORYBOARD_GEN_ICON_ADJUST}
        titleAdjust={STORYBOARD_GEN_TITLE_ADJUST}
        editable
        onTitleChange={(nextTitle) => updateNodeData(id, { displayName: nextTitle })}
      />

      {/* Frame summary + grid settings */}
      <div className="mb-2.5 flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <GridStepperControl
            label={t('node.storyboardGen.rowsShort')}
            value={nodeData.gridRows}
            onDecrease={() => handleRowChange(-1)}
            onIncrease={() => handleRowChange(1)}
          />
          <GridStepperControl
            label={t('node.storyboardGen.colsShort')}
            value={nodeData.gridCols}
            onDecrease={() => handleColChange(-1)}
            onIncrease={() => handleColChange(1)}
          />
        </div>

        {showStoryboardGenAdvancedRatioControls && (
          <div className="min-w-0 flex-1 rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 text-center text-[10px] text-text-muted">
            <span>{t('node.storyboardGen.cellAspectRatio')}: {resolvedAspectRatios.cellAspectRatioLabel}</span>
            <span className="mx-1 text-[rgba(255,255,255,0.22)]">|</span>
            <span>{t('node.storyboardGen.overallAspectRatio')}: {resolvedAspectRatios.overallAspectRatioLabel}</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          {showStoryboardGenAdvancedRatioControls && (
            <div className="flex h-5 items-center rounded-full border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.04)] p-0.5">
              <button
                type="button"
                className={`${RATIO_CONTROL_MODE_BUTTON_CLASS} ${ratioControlMode === 'overall'
                  ? 'border-accent/55 bg-accent/18 text-text-dark'
                  : 'border-transparent bg-transparent text-text-muted hover:bg-white/5'
                  }`}
                onClick={(event) => {
                  event.stopPropagation();
                  updateNodeData(id, { ratioControlMode: 'overall' });
                }}
              >
                {t('node.storyboardGen.ratioModeOverall')}
              </button>
              <button
                type="button"
                className={`${RATIO_CONTROL_MODE_BUTTON_CLASS} ${ratioControlMode === 'cell'
                  ? 'border-accent/55 bg-accent/18 text-text-dark'
                  : 'border-transparent bg-transparent text-text-muted hover:bg-white/5'
                  }`}
                onClick={(event) => {
                  event.stopPropagation();
                  updateNodeData(id, { ratioControlMode: 'cell' });
                }}
              >
                {t('node.storyboardGen.ratioModeCell')}
              </button>
            </div>
          )}
          <div className={GRID_SUMMARY_CLASS}>
            {t('node.storyboardGen.frameCount', { count: totalFrames })}
          </div>
        </div>
      </div>

      {/* Frame Grid */}
      <div className="mb-2 flex min-h-0 flex-1 items-center justify-center">
        <div
          className="grid gap-0.5"
          style={{
            width: `${frameLayout.gridWidth}px`,
            gridTemplateColumns: `repeat(${nodeData.gridCols}, ${frameLayout.cellWidth}px)`,
          }}
        >
          {nodeData.frames.map((frame, index) => {
            const frameDescription = frameDescriptionDrafts[frame.id] ?? frame.description;
            return (
            <div
              key={frame.id}
              className="relative overflow-hidden rounded border border-[rgba(255,255,255,0.06)] bg-bg-dark/40"
              style={{ aspectRatio: frameLayout.cellAspectRatio }}
            >
              <div
                ref={(element) => {
                  frameHighlightRefs.current[frame.id] = element;
                }}
                aria-hidden="true"
                className="ui-scrollbar pointer-events-none absolute inset-0 overflow-y-auto overflow-x-hidden text-[10px] leading-4 text-text-dark"
                style={{ scrollbarGutter: 'stable' }}
              >
                <div className="min-h-full whitespace-pre-wrap break-words px-1.5 py-1 text-left">
                  {renderFrameDescriptionWithHighlights(frameDescription, incomingImages.length)}
                </div>
              </div>
              <textarea
                ref={(element) => {
                  frameTextareaRefs.current[frame.id] = element;
                }}
                value={frameDescription}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  handleFrameDescriptionChange(index, nextValue);
                }}
                onKeyDown={(event) => handleFrameDescriptionKeyDown(index, event)}
                onScroll={() => syncFrameHighlightScroll(frame.id)}
                onPointerDown={(event) => {
                  lastPointerAnchorRef.current = {
                    frameIndex: index,
                    anchor: resolvePointerAnchor(rootRef.current, event.clientX, event.clientY, zoom),
                  };
                }}
                onFocus={(event) => {
                  activeFrameTextareaRef.current = event.currentTarget;
                  syncFrameHighlightScroll(frame.id);
                }}
                placeholder={t('node.storyboardGen.framePlaceholder', {
                  index: String(index + 1).padStart(2, '0'),
                })}
                wrap="soft"
                className="ui-scrollbar nodrag nowheel relative z-10 h-full w-full resize-none overflow-y-auto overflow-x-hidden bg-transparent px-1.5 py-1 text-left text-[10px] leading-4 text-transparent caret-text-dark placeholder:text-text-muted/40 focus:border-accent/50 focus:outline-none whitespace-pre-wrap break-words"
                style={{ scrollbarGutter: 'stable' }}
              />
            </div>
            );
          })}
        </div>
      </div>

      {showImagePicker && incomingImageItems.length > 0 && (
        <div
          className="nowheel absolute z-30 w-[120px] overflow-hidden rounded-xl border border-[rgba(255,255,255,0.16)] bg-surface-dark shadow-xl"
          style={{ left: pickerAnchor.left, top: pickerAnchor.top }}
          onMouseDown={(event) => event.stopPropagation()}
          onWheelCapture={(event) => event.stopPropagation()}
        >
          <div
            className="ui-scrollbar nowheel max-h-[180px] overflow-y-auto"
            onWheelCapture={(event) => event.stopPropagation()}
          >
            {incomingImageItems.map((item, imageIndex) => (
              <button
                key={`${item.imageUrl}-${imageIndex}`}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  insertImageReference(imageIndex);
                }}
                onMouseEnter={() => setPickerActiveIndex(imageIndex)}
                className={`flex w-full items-center gap-2 border border-transparent bg-bg-dark/70 px-2 py-2 text-left text-sm text-text-dark transition-colors hover:border-[rgba(255,255,255,0.18)] ${pickerActiveIndex === imageIndex
                    ? 'border-[rgba(255,255,255,0.24)] bg-bg-dark'
                    : ''
                  }`}
              >
                <CanvasNodeImage
                  src={item.displayUrl}
                  alt={item.label}
                  viewerSourceUrl={resolveImageDisplayUrl(item.imageUrl)}
                  viewerImageList={incomingImageViewerList}
                  className="h-8 w-8 rounded object-cover"
                />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <div className="mb-1.5 shrink-0 text-[10px] text-red-400">{error}</div>}

      {/* AI Parameters */}
      <div
        className="relative mx-auto mt-auto flex shrink-0 items-center justify-between"
        style={{ width: `${frameLayout.paramsRowWidth}px` }}
      >
        <ModelParamsControls
          imageModels={imageModels}
          selectedModel={selectedModel}
          selectedResolution={selectedResolution}
          selectedAspectRatio={selectedAspectRatio}
          aspectRatioOptions={aspectRatioOptions}
          onModelChange={(modelId) => updateNodeData(id, { model: modelId })}
          onResolutionChange={(resolution) =>
            updateNodeData(id, { size: resolution as ImageSize })
          }
          onAspectRatioChange={(aspectRatio) =>
            updateNodeData(id, { requestAspectRatio: aspectRatio })
          }
          showWebSearchToggle={showWebSearchToggle}
          webSearchEnabled={webSearchEnabled}
          onWebSearchToggle={(enabled) =>
            updateNodeData(id, {
              extraParams: {
                ...(nodeData.extraParams ?? {}),
                enable_web_search: enabled,
              },
            })
          }
          triggerSize="sm"
          chipClassName={NODE_CONTROL_CHIP_CLASS}
          modelChipClassName={NODE_CONTROL_MODEL_CHIP_CLASS}
          paramsChipClassName={NODE_CONTROL_PARAMS_CHIP_CLASS}
          modelPanelAlign="center"
          paramsPanelAlign="center"
          modelPanelClassName="w-[360px] p-2"
          paramsPanelClassName="w-[420px] p-3"
        />

        <UiButton
          onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            const previewGridOnly =
              enableStoryboardGenGridPreviewShortcut && event.ctrlKey && event.altKey && event.shiftKey;
            void handleGenerate(previewGridOnly);
          }}
          variant="primary"
          size="sm"
          className={`!min-w-0 shrink-0 ${NODE_CONTROL_PRIMARY_BUTTON_CLASS}`}
        >
          <Sparkles className={NODE_CONTROL_ICON_CLASS} strokeWidth={2.8} />
          {t('canvas.generate')}
        </UiButton>
      </div>

      <Handle
        type="target"
        id="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-surface-dark !bg-accent"
      />
      <Handle
        type="source"
        id="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-surface-dark !bg-accent"
      />
      <NodeResizeHandle
        minWidth={baseFrameLayout.nodeWidth}
        minHeight={baseFrameLayout.nodeHeight}
        maxWidth={1800}
        maxHeight={1400}
      />
    </div>
  );
});

StoryboardGenNode.displayName = 'StoryboardGenNode';
