import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Upload, Sparkles, LayoutGrid } from 'lucide-react';

import type { CanvasNodeType } from '@/features/canvas/domain/canvasNodes';
import { nodeCatalog } from '@/features/canvas/application/nodeCatalog';
import type { MenuIconKey } from '@/features/canvas/domain/nodeRegistry';

interface NodeSelectionMenuProps {
  position: { x: number; y: number };
  onSelect: (type: CanvasNodeType) => void;
  onClose: () => void;
}

const iconMap: Record<MenuIconKey, typeof Upload> = {
  upload: Upload,
  sparkles: Sparkles,
  layout: LayoutGrid,
};

export function NodeSelectionMenu({ position, onSelect, onClose }: NodeSelectionMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const menuItems = useMemo(() => nodeCatalog.getMenuDefinitions(), []);

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 150);
  }, [onClose]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      handleClose();
    };

    document.addEventListener('mousedown', onPointerDown, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown, true);
    };
  }, [handleClose]);

  return (
    <div
      ref={menuRef}
      className={`
        absolute z-50 min-w-[220px] overflow-hidden rounded-lg border border-border-dark bg-surface-dark shadow-xl
        transition-all duration-150
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}
      `}
      style={{ left: position.x, top: position.y }}
    >
      {menuItems.map((item, index) => {
        const Icon = iconMap[item.menuIcon] ?? Image;
        return (
          <button
            key={item.type}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-dark"
            style={{ transitionDelay: isVisible ? `${index * 30}ms` : '0ms' }}
            onClick={() => {
              handleClose();
              setTimeout(() => onSelect(item.type), 160);
            }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-bg-dark">
              <Icon className="h-4 w-4 text-accent" />
            </div>
            <span className="text-sm text-text-dark">{t(item.menuLabelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
