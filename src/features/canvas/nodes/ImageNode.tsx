import { memo, useEffect, useMemo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Sparkles } from 'lucide-react';

import {
  DEFAULT_ASPECT_RATIO,
  DEFAULT_NODE_WIDTH,
  type ImageEditNodeData,
} from '@/features/canvas/domain/canvasNodes';
import { useCanvasStore } from '@/stores/canvasStore';

type ImageNodeProps = NodeProps & {
  id: string;
  data: ImageEditNodeData;
  selected?: boolean;
};

function toCssAspectRatio(aspectRatio: string): string {
  const [width = '1', height = '1'] = aspectRatio.split(':');
  return `${width} / ${height}`;
}

export const ImageNode = memo(({ id, data, selected }: ImageNodeProps) => {
  const setSelectedNode = useCanvasStore((state) => state.setSelectedNode);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!data.isGenerating) {
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 120);

    return () => {
      window.clearInterval(timer);
    };
  }, [data.isGenerating]);

  const simulatedProgress = useMemo(() => {
    if (!data.isGenerating) {
      return 0;
    }

    const startedAt = data.generationStartedAt ?? Date.now();
    const duration = Math.max(1000, data.generationDurationMs ?? 60000);
    const elapsed = Math.max(0, now - startedAt);

    return Math.min(elapsed / duration, 0.96);
  }, [data.generationDurationMs, data.generationStartedAt, data.isGenerating, now]);

  return (
    <div
      className={`
        w-[220px] rounded-[24px] border bg-surface-dark/85 p-1 transition-all duration-150
        ${selected
          ? 'border-accent shadow-[0_0_0_1px_rgba(59,130,246,0.32)]'
          : 'border-[rgba(255,255,255,0.22)] hover:border-[rgba(255,255,255,0.34)]'}
      `}
      onClick={() => setSelectedNode(id)}
    >
      <div
        className="relative overflow-hidden rounded-[19px] bg-bg-dark"
        style={{
          width: DEFAULT_NODE_WIDTH - 8,
          aspectRatio: toCssAspectRatio(data.aspectRatio || DEFAULT_ASPECT_RATIO),
        }}
      >
        {data.imageUrl ? (
          <img src={data.imageUrl} alt="Generated" className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-text-muted/85">
            <Sparkles className="h-7 w-7 opacity-60" />
            <span className="px-4 text-center text-[12px] leading-6">选中后在下方输入提示词生成或编辑图片</span>
          </div>
        )}

        {data.isGenerating && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[19px]">
            <div className="absolute inset-0 bg-bg-dark/55" />
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-[rgba(255,255,255,0.4)] to-[rgba(255,255,255,0.06)] transition-[width] duration-100 ease-linear"
              style={{ width: `${simulatedProgress * 100}%` }}
            />
          </div>
        )}
      </div>

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

ImageNode.displayName = 'ImageNode';
