import {
  memo,
  useMemo,
  useState,
  useCallback,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { GripVertical, ImagePlus } from 'lucide-react';

import type {
  StoryboardFrameItem,
  StoryboardSplitNodeData,
} from '@/features/canvas/domain/canvasNodes';
import { readFileAsDataUrl } from '@/features/canvas/application/imageData';
import { useCanvasStore } from '@/stores/canvasStore';

type StoryboardNodeProps = NodeProps & {
  id: string;
  data: StoryboardSplitNodeData;
  selected?: boolean;
};

interface FrameCardProps {
  nodeId: string;
  frame: StoryboardFrameItem;
  index: number;
  draggedFrameId: string | null;
  onDragStart: (frameId: string) => void;
  onDropTo: (targetFrameId: string) => void;
  onDragEnd: () => void;
}

const FrameCard = memo(
  ({
    nodeId,
    frame,
    index,
    draggedFrameId,
    onDragStart,
    onDropTo,
    onDragEnd,
  }: FrameCardProps) => {
    const updateStoryboardFrame = useCanvasStore((state) => state.updateStoryboardFrame);

    const handleUpload = useCallback(
      async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) {
          return;
        }

        const imageUrl = await readFileAsDataUrl(file);
        updateStoryboardFrame(nodeId, frame.id, { imageUrl });
        event.target.value = '';
      },
      [frame.id, nodeId, updateStoryboardFrame]
    );

    return (
      <div
        draggable
        onDragStart={() => onDragStart(frame.id)}
        onDragEnd={onDragEnd}
        onDrop={(event) => {
          event.preventDefault();
          onDropTo(frame.id);
        }}
        onDragOver={(event: DragEvent<HTMLDivElement>) => event.preventDefault()}
        className={`
          rounded-lg border border-[rgba(255,255,255,0.12)] bg-bg-dark p-1 transition-all
          ${draggedFrameId === frame.id ? 'opacity-50' : 'opacity-100'}
        `}
      >
        <div className="relative overflow-hidden rounded-md bg-surface-dark" style={{ aspectRatio: '1 / 1' }}>
          {frame.imageUrl ? (
            <img src={frame.imageUrl} alt={`Frame ${index + 1}`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-text-muted">空分镜</div>
          )}

          <div className="absolute left-1 top-1 rounded bg-black/50 p-1 text-white">
            <GripVertical className="h-3.5 w-3.5" />
          </div>

          <label className="absolute bottom-1 right-1 cursor-pointer rounded bg-black/60 p-1 text-white">
            <ImagePlus className="h-3.5 w-3.5" />
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
        </div>

        <textarea
          value={frame.note}
          onChange={(event) =>
            updateStoryboardFrame(nodeId, frame.id, {
              note: event.target.value,
            })
          }
          placeholder={`分镜 ${index + 1} 描述`}
          className="mt-1 h-14 w-full resize-none rounded border border-[rgba(255,255,255,0.12)] bg-surface-dark/80 px-2 py-1 text-xs text-text-dark outline-none focus:border-accent"
        />
      </div>
    );
  }
);

FrameCard.displayName = 'FrameCard';

export const StoryboardNode = memo(({ id, data, selected }: StoryboardNodeProps) => {
  const setSelectedNode = useCanvasStore((state) => state.setSelectedNode);
  const reorderStoryboardFrame = useCanvasStore((state) => state.reorderStoryboardFrame);
  const [draggedFrameId, setDraggedFrameId] = useState<string | null>(null);

  const orderedFrames = useMemo(
    () => [...data.frames].sort((a, b) => a.order - b.order),
    [data.frames]
  );

  const handleDropTo = useCallback(
    (targetFrameId: string) => {
      if (!draggedFrameId || draggedFrameId === targetFrameId) {
        return;
      }

      reorderStoryboardFrame(id, draggedFrameId, targetFrameId);
    },
    [draggedFrameId, id, reorderStoryboardFrame]
  );

  return (
    <div
      className={`
        min-w-[320px] rounded-[20px] border bg-surface-dark/85 p-2 transition-all duration-150
        ${selected
          ? 'border-accent shadow-[0_0_0_1px_rgba(59,130,246,0.32)]'
          : 'border-[rgba(255,255,255,0.22)]'}
      `}
      onClick={() => setSelectedNode(id)}
    >
      <div className="mb-2 flex items-center justify-between px-1 text-xs text-text-muted">
        <span>分镜切割结果</span>
        <span>
          {data.gridRows} x {data.gridCols}
        </span>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, data.gridCols)}, minmax(0, 1fr))` }}
      >
        {orderedFrames.map((frame, index) => (
          <FrameCard
            key={frame.id}
            nodeId={id}
            frame={frame}
            index={index}
            draggedFrameId={draggedFrameId}
            onDragStart={setDraggedFrameId}
            onDropTo={handleDropTo}
            onDragEnd={() => setDraggedFrameId(null)}
          />
        ))}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-surface-dark !bg-accent"
      />
    </div>
  );
});

StoryboardNode.displayName = 'StoryboardNode';
