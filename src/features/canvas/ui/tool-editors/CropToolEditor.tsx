import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import type { ToolSelectField } from '@/features/canvas/tools';
import type { VisualToolEditorProps } from './types';

function parsePresetRatio(value: string): number | null {
  if (!value.includes(':')) {
    return null;
  }

  const [rawW, rawH] = value.split(':').map((item) => Number(item));
  if (!Number.isFinite(rawW) || !Number.isFinite(rawH) || rawW <= 0 || rawH <= 0) {
    return null;
  }

  return rawW / rawH;
}

function parseCustomRatio(value: string): number | null {
  const input = value.trim();
  if (!input) {
    return null;
  }

  if (input.includes(':')) {
    return parsePresetRatio(input);
  }

  const numeric = Number(input);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return numeric;
}

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toImageSpaceCrop(
  crop: PixelCrop,
  renderedWidth: number,
  renderedHeight: number,
  naturalWidth: number,
  naturalHeight: number
) {
  const scaleX = naturalWidth / renderedWidth;
  const scaleY = naturalHeight / renderedHeight;

  return {
    cropX: Math.round(crop.x * scaleX),
    cropY: Math.round(crop.y * scaleY),
    cropWidth: Math.round(crop.width * scaleX),
    cropHeight: Math.round(crop.height * scaleY),
  };
}

function toRenderedCrop(
  cropX: number,
  cropY: number,
  cropWidth: number,
  cropHeight: number,
  renderedWidth: number,
  renderedHeight: number,
  naturalWidth: number,
  naturalHeight: number
): Crop {
  const scaleX = renderedWidth / naturalWidth;
  const scaleY = renderedHeight / naturalHeight;

  return {
    unit: 'px',
    x: Math.max(0, cropX * scaleX),
    y: Math.max(0, cropY * scaleY),
    width: Math.max(1, cropWidth * scaleX),
    height: Math.max(1, cropHeight * scaleY),
  };
}

function buildDefaultCrop(width: number, height: number, aspect: number | undefined): Crop {
  if (!aspect) {
    return { unit: 'px', x: 0, y: 0, width, height };
  }

  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 88,
      },
      aspect,
      width,
      height
    ),
    width,
    height
  );
}

export function CropToolEditor({ plugin, sourceImageUrl, options, onOptionsChange }: VisualToolEditorProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [customRatioInput, setCustomRatioInput] = useState(
    typeof options.customAspectRatio === 'string' ? options.customAspectRatio : ''
  );

  const ratioOptions = useMemo(() => {
    const field = plugin.fields.find((item) => item.type === 'select' && item.key === 'aspectRatio');
    if (!field) {
      return [
        { label: '自由', value: 'free' },
        { label: '1:1', value: '1:1' },
        { label: '16:9', value: '16:9' },
        { label: '9:16', value: '9:16' },
        { label: '4:3', value: '4:3' },
        { label: '3:4', value: '3:4' },
      ];
    }

    return (field as ToolSelectField).options;
  }, [plugin.fields]);

  const aspectMode = typeof options.aspectRatio === 'string' ? options.aspectRatio : 'free';
  const resolvedAspect = useMemo(() => {
    if (aspectMode === 'free') {
      return undefined;
    }

    if (aspectMode === 'custom') {
      return parseCustomRatio(customRatioInput) ?? undefined;
    }

    return parsePresetRatio(aspectMode) ?? undefined;
  }, [aspectMode, customRatioInput]);

  const customRatioError = useMemo(() => {
    if (aspectMode !== 'custom') {
      return null;
    }
    if (!customRatioInput.trim()) {
      return '请输入比例，例如 3:2 或 1.5';
    }
    if (!parseCustomRatio(customRatioInput)) {
      return '比例格式无效';
    }
    return null;
  }, [aspectMode, customRatioInput]);

  useEffect(() => {
    setCustomRatioInput(typeof options.customAspectRatio === 'string' ? options.customAspectRatio : '');
  }, [options.customAspectRatio]);

  const syncCropToOptions = useCallback(
    (pixelCrop: PixelCrop) => {
      const image = imageRef.current;
      if (!image || image.width <= 0 || image.height <= 0) {
        return;
      }

      const imageCrop = toImageSpaceCrop(
        pixelCrop,
        image.width,
        image.height,
        image.naturalWidth,
        image.naturalHeight
      );

      onOptionsChange({
        ...options,
        aspectRatio: aspectMode,
        customAspectRatio: customRatioInput,
        ...imageCrop,
      });
    },
    [aspectMode, customRatioInput, onOptionsChange, options]
  );

  const resetCropByMode = useCallback(() => {
    const image = imageRef.current;
    if (!image || image.width <= 0 || image.height <= 0) {
      return;
    }

    const next = buildDefaultCrop(image.width, image.height, resolvedAspect);
    setCrop(next);

    syncCropToOptions({
      unit: 'px',
      x: Math.round(next.x ?? 0),
      y: Math.round(next.y ?? 0),
      width: Math.round(next.width ?? image.width),
      height: Math.round(next.height ?? image.height),
    });
  }, [resolvedAspect, syncCropToOptions]);

  const handleImageLoad = useCallback(() => {
    const image = imageRef.current;
    if (!image) {
      return;
    }

    const cropX = toNumber(options.cropX);
    const cropY = toNumber(options.cropY);
    const cropWidth = toNumber(options.cropWidth);
    const cropHeight = toNumber(options.cropHeight);

    if (
      cropX !== null &&
      cropY !== null &&
      cropWidth !== null &&
      cropHeight !== null &&
      cropWidth > 0 &&
      cropHeight > 0
    ) {
      setCrop(
        toRenderedCrop(
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          image.width,
          image.height,
          image.naturalWidth,
          image.naturalHeight
        )
      );
      return;
    }

    resetCropByMode();
  }, [options.cropHeight, options.cropWidth, options.cropX, options.cropY, resetCropByMode]);

  useEffect(() => {
    if (!imageRef.current) {
      return;
    }
    resetCropByMode();
  }, [resolvedAspect, resetCropByMode]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {ratioOptions.map((item) => {
          const active = item.value === aspectMode;
          return (
            <button
              key={item.value}
              type="button"
              className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                active
                  ? 'border-accent/45 bg-accent/15 text-text-dark'
                  : 'border-[rgba(255,255,255,0.15)] text-text-muted hover:bg-bg-dark'
              }`}
              onClick={() =>
                onOptionsChange({
                  ...options,
                  aspectRatio: item.value,
                })
              }
            >
              {item.label}
            </button>
          );
        })}

        <button
          type="button"
          className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
            aspectMode === 'custom'
              ? 'border-accent/45 bg-accent/15 text-text-dark'
              : 'border-[rgba(255,255,255,0.15)] text-text-muted hover:bg-bg-dark'
          }`}
          onClick={() =>
            onOptionsChange({
              ...options,
              aspectRatio: 'custom',
            })
          }
        >
          自定义
        </button>
      </div>

      {aspectMode === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={customRatioInput}
            onChange={(event) => {
              const next = event.target.value;
              setCustomRatioInput(next);
              onOptionsChange({
                ...options,
                aspectRatio: 'custom',
                customAspectRatio: next,
              });
            }}
            placeholder="输入比例，如 3:2 或 1.5"
            className="h-9 w-[220px] rounded-lg border border-[rgba(255,255,255,0.15)] bg-bg-dark/80 px-3 text-sm text-text-dark outline-none"
          />
          {customRatioError && <span className="text-xs text-red-400">{customRatioError}</span>}
        </div>
      )}

      <div className="max-h-[520px] overflow-auto rounded-xl border border-[rgba(255,255,255,0.12)] bg-bg-dark p-3">
        <ReactCrop
          crop={crop}
          onChange={(nextCrop) => setCrop(nextCrop)}
          onComplete={(pixelCrop) => syncCropToOptions(pixelCrop)}
          aspect={resolvedAspect}
          minWidth={24}
          minHeight={24}
          keepSelection
          ruleOfThirds
        >
          <img
            ref={imageRef}
            src={sourceImageUrl}
            alt="Crop Source"
            className="max-h-[480px] w-auto max-w-full object-contain"
            onLoad={handleImageLoad}
          />
        </ReactCrop>
      </div>
    </div>
  );
}
