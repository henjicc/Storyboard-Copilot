import type { CSSProperties, ReactNode } from 'react';

type HeaderAdjust = {
  x?: number;
  y?: number;
  scale?: number;
};

type NodeHeaderProps = {
  icon?: ReactNode;
  titleText?: string;
  metaText?: string;
  title?: ReactNode;
  meta?: ReactNode;
  subtitle?: ReactNode;
  rightSlot?: ReactNode;
  className?: string;
  iconClassName?: string;
  toneClassName?: string;
  titleClassName?: string;
  metaClassName?: string;
  titleRowClassName?: string;
  subtitleClassName?: string;
  headerAdjust?: HeaderAdjust;
  iconAdjust?: HeaderAdjust;
  titleAdjust?: HeaderAdjust;
};

export const NODE_HEADER_TONE_CLASS = 'text-white/55';
export const NODE_HEADER_TITLE_CLASS = 'text-[14px] font-normal';
export const NODE_HEADER_META_CLASS = 'text-xs text-text-muted';
export const NODE_HEADER_FLOATING_POSITION_CLASS = 'absolute -top-7 left-1 z-10';

function composeTransformStyle(adjust?: HeaderAdjust): CSSProperties | undefined {
  if (!adjust) {
    return undefined;
  }

  const x = adjust.x ?? 0;
  const y = adjust.y ?? 0;
  const scale = adjust.scale ?? 1;

  if (x === 0 && y === 0 && scale === 1) {
    return undefined;
  }

  return {
    transform: `translate(${x}px, ${y}px) scale(${scale})`,
    transformOrigin: 'center',
  };
}

function joinClasses(...classes: Array<string | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function NodeHeader({
  icon,
  titleText,
  metaText,
  title,
  meta,
  subtitle,
  rightSlot,
  className,
  iconClassName,
  toneClassName,
  titleClassName,
  metaClassName,
  titleRowClassName,
  subtitleClassName,
  headerAdjust,
  iconAdjust,
  titleAdjust,
}: NodeHeaderProps) {
  const tone = toneClassName ?? NODE_HEADER_TONE_CLASS;
  const resolvedTitle = titleText
    ? <span className={joinClasses(NODE_HEADER_TITLE_CLASS, tone, titleClassName)}>{titleText}</span>
    : title;
  const resolvedMeta = metaText
    ? <span className={joinClasses(NODE_HEADER_META_CLASS, metaClassName)}>{metaText}</span>
    : meta;

  return (
    <div className={joinClasses('flex items-start justify-between gap-2', className)}>
      <div className="min-w-0" style={composeTransformStyle(headerAdjust)}>
        <div className={joinClasses('flex items-center gap-1', titleRowClassName)}>
          {icon ? (
            <span
              className={joinClasses('inline-flex items-center justify-center', tone, iconClassName)}
              style={composeTransformStyle(iconAdjust)}
            >
              {icon}
            </span>
          ) : null}
          <div className="flex items-baseline gap-2" style={composeTransformStyle(titleAdjust)}>
            {resolvedTitle}
            {resolvedMeta}
          </div>
        </div>
        {subtitle ? (
          <div className={joinClasses('text-[11px] text-text-muted/80', subtitleClassName)}>
            {subtitle}
          </div>
        ) : null}
      </div>
      {rightSlot}
    </div>
  );
}
