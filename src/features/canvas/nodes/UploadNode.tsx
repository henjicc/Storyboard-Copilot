import {
  memo,
  useCallback,
  useEffect,
  useRef,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Upload } from 'lucide-react';

import {
  DEFAULT_ASPECT_RATIO,
  DEFAULT_NODE_WIDTH,
  type UploadImageNodeData,
} from '@/features/canvas/domain/canvasNodes';
import { canvasEventBus } from '@/features/canvas/application/canvasServices';
import { detectAspectRatio, readFileAsDataUrl } from '@/features/canvas/application/imageData';
import { useCanvasStore } from '@/stores/canvasStore';

type UploadNodeProps = NodeProps & {
  id: string;
  data: UploadImageNodeData;
  selected?: boolean;
};

function toCssAspectRatio(aspectRatio: string): string {
  const [width = '1', height = '1'] = aspectRatio.split(':');
  return `${width} / ${height}`;
}

export const UploadNode = memo(({ id, data, selected }: UploadNodeProps) => {
  const setSelectedNode = useCanvasStore((state) => state.setSelectedNode);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      const imageUrl = await readFileAsDataUrl(file);
      const aspectRatio = await detectAspectRatio(imageUrl);
      updateNodeData(id, {
        imageUrl,
        aspectRatio: aspectRatio || DEFAULT_ASPECT_RATIO,
      });
    },
    [id, updateNodeData]
  );

  const handleDrop = useCallback(
    async (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith('image/')) {
        return;
      }

      await processFile(file);
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !file.type.startsWith('image/')) {
        return;
      }

      await processFile(file);
      event.target.value = '';
    },
    [processFile]
  );

  useEffect(() => {
    return canvasEventBus.subscribe('upload-node/reupload', ({ nodeId }) => {
      if (nodeId !== id) {
        return;
      }
      inputRef.current?.click();
    });
  }, [id]);

  const handleNodeClick = useCallback(() => {
    setSelectedNode(id);
    if (!data.imageUrl) {
      inputRef.current?.click();
    }
  }, [data.imageUrl, id, setSelectedNode]);

  return (
    <div
      className={`
        w-[220px] rounded-[24px] border bg-surface-dark/85 p-1 transition-all duration-150
        ${selected
          ? 'border-accent shadow-[0_0_0_1px_rgba(59,130,246,0.32)]'
          : 'border-[rgba(255,255,255,0.22)] hover:border-[rgba(255,255,255,0.34)]'}
      `}
      onClick={handleNodeClick}
    >
      {data.imageUrl ? (
        <div
          className="block overflow-hidden rounded-[19px] border border-[rgba(255,255,255,0.14)] bg-bg-dark"
          style={{
            width: DEFAULT_NODE_WIDTH - 8,
            aspectRatio: toCssAspectRatio(data.aspectRatio || DEFAULT_ASPECT_RATIO),
          }}
        >
          <img src={data.imageUrl} alt="Uploaded" className="h-full w-full object-cover" />
        </div>
      ) : (
        <label
          className="block overflow-hidden rounded-[19px] border border-[rgba(255,255,255,0.14)] bg-bg-dark"
          style={{
            width: DEFAULT_NODE_WIDTH - 8,
            aspectRatio: toCssAspectRatio(data.aspectRatio || DEFAULT_ASPECT_RATIO),
          }}
          onDrop={handleDrop}
          onDragOver={(event) => event.preventDefault()}
        >
          <div className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 text-text-muted/85">
            <Upload className="h-7 w-7 opacity-60" />
            <span className="px-3 text-center text-[12px] leading-6">点击或拖拽上传图片</span>
          </div>
        </label>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-surface-dark !bg-accent"
      />
    </div>
  );
});

UploadNode.displayName = 'UploadNode';
