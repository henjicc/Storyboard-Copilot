import { memo, useEffect, useRef, useState } from 'react';

import type { GroupNodeData } from '@/features/canvas/domain/canvasNodes';
import { useCanvasStore } from '@/stores/canvasStore';

type GroupNodeProps = {
  id: string;
  data: GroupNodeData;
  selected?: boolean;
};

export const GroupNode = memo(({ id, data, selected }: GroupNodeProps) => {
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(data.label || '组');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditing) {
      return;
    }
    setDraftLabel(data.label || '组');
  }, [data.label, isEditing]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditing]);

  const commitLabel = () => {
    const nextLabel = draftLabel.trim() || '组';
    if (nextLabel !== (data.label || '组')) {
      updateNodeData(id, { label: nextLabel });
    }
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setDraftLabel(data.label || '组');
    setIsEditing(false);
  };

  return (
    <div
      className={`h-full w-full rounded-[18px] border bg-[rgba(255,255,255,0.03)] backdrop-blur-[1px] ${
        selected
          ? 'border-accent shadow-[0_0_0_1px_rgba(59,130,246,0.35)]'
          : 'border-[rgba(255,255,255,0.26)]'
      }`}
    >
      <div className="flex h-7 items-center rounded-t-[18px] border-b border-[rgba(255,255,255,0.16)] bg-[rgba(10,12,16,0.5)] px-2.5">
        {isEditing ? (
          <input
            ref={inputRef}
            value={draftLabel}
            onChange={(event) => setDraftLabel(event.target.value)}
            onBlur={commitLabel}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitLabel();
                return;
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                cancelEdit();
              }
            }}
            className="nodrag nowheel h-5 w-full rounded border border-[rgba(255,255,255,0.25)] bg-black/30 px-1.5 text-[11px] text-text-dark outline-none focus:border-accent/70"
          />
        ) : (
          <button
            type="button"
            className="h-5 w-full cursor-text truncate text-left text-[11px] font-medium text-text-muted"
            title={data.label || '组'}
            onDoubleClick={(event) => {
              event.stopPropagation();
              setIsEditing(true);
            }}
          >
            {data.label || '组'}
          </button>
        )}
      </div>
    </div>
  );
});

GroupNode.displayName = 'GroupNode';
