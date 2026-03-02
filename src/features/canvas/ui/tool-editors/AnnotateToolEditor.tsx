import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Brush, Circle, Square, Type, Undo2, Trash2 } from 'lucide-react';
import { Image as KonvaImage, Layer, Line, Rect, Stage, Text, Ellipse, Arrow } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';

import type { ToolOptions } from '@/features/canvas/tools';
import {
  normalizeAnnotationRect,
  parseAnnotationItems,
  stringifyAnnotationItems,
  type AnnotationItem,
  type AnnotationToolType,
} from '@/features/canvas/tools/annotation';
import type { VisualToolEditorProps } from './types';

type DraftState = {
  tool: Exclude<AnnotationToolType, 'text'>;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  points?: number[];
};

const TOOL_BUTTONS: Array<{ type: AnnotationToolType; label: string; icon: typeof Square }> = [
  { type: 'rect', label: '矩形', icon: Square },
  { type: 'ellipse', label: '圆形', icon: Circle },
  { type: 'arrow', label: '箭头', icon: ArrowRight },
  { type: 'pen', label: '画笔', icon: Brush },
  { type: 'text', label: '文本', icon: Type },
];

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toText(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function createAnnotationId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function renderAnnotation(item: AnnotationItem, scale: number, opacity = 1) {
  if (item.type === 'rect') {
    return (
      <Rect
        key={item.id}
        x={item.x * scale}
        y={item.y * scale}
        width={item.width * scale}
        height={item.height * scale}
        stroke={item.stroke}
        strokeWidth={Math.max(1, item.lineWidth * scale)}
        opacity={opacity}
      />
    );
  }

  if (item.type === 'ellipse') {
    return (
      <Ellipse
        key={item.id}
        x={(item.x + item.width / 2) * scale}
        y={(item.y + item.height / 2) * scale}
        radiusX={(item.width / 2) * scale}
        radiusY={(item.height / 2) * scale}
        stroke={item.stroke}
        strokeWidth={Math.max(1, item.lineWidth * scale)}
        opacity={opacity}
      />
    );
  }

  if (item.type === 'arrow') {
    return (
      <Arrow
        key={item.id}
        points={item.points.map((value) => value * scale)}
        stroke={item.stroke}
        fill={item.stroke}
        strokeWidth={Math.max(1, item.lineWidth * scale)}
        pointerLength={Math.max(10, item.lineWidth * 4) * scale}
        pointerWidth={Math.max(10, item.lineWidth * 3) * scale}
        opacity={opacity}
      />
    );
  }

  if (item.type === 'pen') {
    return (
      <Line
        key={item.id}
        points={item.points.map((value) => value * scale)}
        stroke={item.stroke}
        strokeWidth={Math.max(1, item.lineWidth * scale)}
        lineJoin="round"
        lineCap="round"
        opacity={opacity}
      />
    );
  }

  return (
    <Text
      key={item.id}
      x={item.x * scale}
      y={item.y * scale}
      text={item.text}
      fill={item.color}
      fontStyle="bold"
      fontSize={Math.max(8, item.fontSize * scale)}
      opacity={opacity}
    />
  );
}

export function AnnotateToolEditor({ options, onOptionsChange, sourceImageUrl }: VisualToolEditorProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<AnnotationToolType>('rect');
  const [annotations, setAnnotations] = useState<AnnotationItem[]>(() =>
    parseAnnotationItems(options.annotations)
  );
  const [draft, setDraft] = useState<DraftState | null>(null);

  const stageRef = useRef<import('konva/lib/Stage').Stage | null>(null);

  const color = toText(options.color, '#ff4d4f');
  const lineWidth = Math.max(1, toNumber(options.lineWidth, 4));
  const textTemplate = toText(options.text, '标注文本').trim() || '标注文本';
  const fontSize = Math.max(10, toNumber(options.fontSize, 28));

  useEffect(() => {
    const nextAnnotations = parseAnnotationItems(options.annotations);
    setAnnotations(nextAnnotations);
  }, [options.annotations]);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
    img.src = sourceImageUrl;
  }, [sourceImageUrl]);

  const { stageWidth, stageHeight, scale } = useMemo(() => {
    if (!image) {
      return { stageWidth: 820, stageHeight: 480, scale: 1 };
    }

    const maxWidth = 880;
    const maxHeight = 500;
    const ratio = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight, 1);
    return {
      stageWidth: Math.max(1, Math.round(image.naturalWidth * ratio)),
      stageHeight: Math.max(1, Math.round(image.naturalHeight * ratio)),
      scale: ratio,
    };
  }, [image]);

  const updateOptions = useCallback(
    (next: Partial<ToolOptions>, nextAnnotations: AnnotationItem[]) => {
      onOptionsChange({
        ...options,
        ...next,
        annotations: stringifyAnnotationItems(nextAnnotations),
      });
      setAnnotations(nextAnnotations);
    },
    [onOptionsChange, options]
  );

  const getImagePoint = useCallback(() => {
    if (!image || !stageRef.current) {
      return null;
    }

    const pointer = stageRef.current.getPointerPosition();
    if (!pointer || scale <= 0) {
      return null;
    }

    return {
      x: clamp(pointer.x / scale, 0, image.naturalWidth),
      y: clamp(pointer.y / scale, 0, image.naturalHeight),
    };
  }, [image, scale]);

  const buildDraftAnnotation = useCallback(
    (currentX: number, currentY: number): AnnotationItem | null => {
      if (!draft) {
        return null;
      }

      if (draft.tool === 'pen') {
        const points = [...(draft.points ?? [draft.startX, draft.startY]), currentX, currentY];
        return {
          id: 'draft-pen',
          type: 'pen',
          points,
          stroke: color,
          lineWidth,
        };
      }

      if (draft.tool === 'arrow') {
        return {
          id: 'draft-arrow',
          type: 'arrow',
          points: [draft.startX, draft.startY, currentX, currentY],
          stroke: color,
          lineWidth,
        };
      }

      const rect = normalizeAnnotationRect(draft.startX, draft.startY, currentX, currentY);

      if (draft.tool === 'rect') {
        return {
          id: 'draft-rect',
          type: 'rect',
          ...rect,
          stroke: color,
          lineWidth,
        };
      }

      return {
        id: 'draft-ellipse',
        type: 'ellipse',
        ...rect,
        stroke: color,
        lineWidth,
      };
    },
    [color, draft, lineWidth]
  );

  const draftAnnotation = useMemo(() => {
    if (!draft) {
      return null;
    }

    if (draft.tool === 'pen') {
      return {
        id: 'draft-pen',
        type: 'pen',
        points: draft.points ?? [draft.startX, draft.startY],
        stroke: color,
        lineWidth,
      } as AnnotationItem;
    }

    return null;
  }, [color, draft, lineWidth]);

  const handlePointerDown = useCallback(
    (_event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const point = getImagePoint();
      if (!point || !image) {
        return;
      }

      if (tool === 'text') {
        const next: AnnotationItem = {
          id: createAnnotationId(),
          type: 'text',
          x: point.x,
          y: point.y,
          text: textTemplate,
          color,
          fontSize,
        };
        updateOptions({}, [...annotations, next]);
        return;
      }

      setDraft({
        tool: tool as Exclude<AnnotationToolType, 'text'>,
        startX: point.x,
        startY: point.y,
        currentX: point.x,
        currentY: point.y,
        points: tool === 'pen' ? [point.x, point.y] : undefined,
      });
    },
    [annotations, color, fontSize, getImagePoint, image, textTemplate, tool, updateOptions]
  );

  const handlePointerMove = useCallback(
    (_event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!draft) {
        return;
      }

      const point = getImagePoint();
      if (!point) {
        return;
      }

      if (draft.tool === 'pen') {
        setDraft((previous) => {
          if (!previous || previous.tool !== 'pen') {
            return previous;
          }
          return {
            ...previous,
            currentX: point.x,
            currentY: point.y,
            points: [...(previous.points ?? [previous.startX, previous.startY]), point.x, point.y],
          };
        });
      } else {
        setDraft((previous) =>
          previous
            ? {
                ...previous,
                currentX: point.x,
                currentY: point.y,
              }
            : previous
        );
      }
    },
    [draft, getImagePoint]
  );

  const handlePointerUp = useCallback(
    (_event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!draft) {
        return;
      }

      const point = getImagePoint();
      const finalX = point?.x ?? draft.currentX;
      const finalY = point?.y ?? draft.currentY;
      const nextItem = buildDraftAnnotation(finalX, finalY);
      if (!nextItem) {
        setDraft(null);
        return;
      }

      if ((nextItem.type === 'rect' || nextItem.type === 'ellipse') && (nextItem.width < 4 || nextItem.height < 4)) {
        setDraft(null);
        return;
      }

      if (nextItem.type === 'arrow') {
        const [x1, y1, x2, y2] = nextItem.points;
        const distance = Math.hypot(x2 - x1, y2 - y1);
        if (distance < 4) {
          setDraft(null);
          return;
        }
      }

      if (nextItem.type === 'pen' && nextItem.points.length < 6) {
        setDraft(null);
        return;
      }

      updateOptions({}, [...annotations, { ...nextItem, id: createAnnotationId() } as AnnotationItem]);
      setDraft(null);
    },
    [annotations, buildDraftAnnotation, draft, getImagePoint, updateOptions]
  );

  const previewAnnotation = useMemo(() => {
    if (!draft) {
      return null;
    }

    if (draft.tool === 'pen') {
      return draftAnnotation;
    }

    return buildDraftAnnotation(draft.currentX, draft.currentY);
  }, [buildDraftAnnotation, draft, draftAnnotation]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {TOOL_BUTTONS.map((button) => {
          const Icon = button.icon;
          const active = tool === button.type;
          return (
            <button
              key={button.type}
              type="button"
              onClick={() => setTool(button.type)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                active
                  ? 'border-accent/45 bg-accent/15 text-text-dark'
                  : 'border-[rgba(255,255,255,0.14)] text-text-muted hover:bg-bg-dark'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {button.label}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(event) => onOptionsChange({ ...options, color: event.target.value })}
            className="h-9 w-10 cursor-pointer rounded-md border border-[rgba(255,255,255,0.18)] bg-transparent p-1"
          />
          <input
            type="range"
            min={1}
            max={16}
            step={1}
            value={lineWidth}
            onChange={(event) =>
              onOptionsChange({ ...options, lineWidth: Number(event.target.value) })
            }
          />
          <span className="w-6 text-xs text-text-muted">{lineWidth}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={textTemplate}
          onChange={(event) => onOptionsChange({ ...options, text: event.target.value })}
          placeholder="文本工具点击画布时使用"
          className="h-9 min-w-[260px] flex-1 rounded-lg border border-[rgba(255,255,255,0.14)] bg-bg-dark/80 px-3 text-sm text-text-dark outline-none"
        />
        <input
          type="number"
          min={10}
          max={120}
          step={1}
          value={fontSize}
          onChange={(event) => onOptionsChange({ ...options, fontSize: Number(event.target.value) })}
          className="h-9 w-24 rounded-lg border border-[rgba(255,255,255,0.14)] bg-bg-dark/80 px-2 text-sm text-text-dark outline-none"
        />
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-[rgba(255,255,255,0.14)] px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-dark"
          onClick={() => {
            const next = annotations.slice(0, -1);
            updateOptions({}, next);
          }}
          disabled={annotations.length === 0}
        >
          <Undo2 className="h-3.5 w-3.5" />
          撤销
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-[rgba(255,255,255,0.14)] px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-dark"
          onClick={() => updateOptions({}, [])}
          disabled={annotations.length === 0}
        >
          <Trash2 className="h-3.5 w-3.5" />
          清空
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[rgba(255,255,255,0.12)] bg-bg-dark">
        <Stage
          ref={stageRef}
          width={stageWidth}
          height={stageHeight}
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          onMouseMove={handlePointerMove}
          onTouchMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onTouchEnd={handlePointerUp}
          className={tool === 'text' ? 'cursor-text' : 'cursor-crosshair'}
        >
          <Layer>
            {image && (
              <KonvaImage
                image={image}
                width={stageWidth}
                height={stageHeight}
              />
            )}
          </Layer>
          <Layer>
            {annotations.map((item) => renderAnnotation(item, scale))}
            {previewAnnotation && renderAnnotation(previewAnnotation, scale, 0.75)}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
