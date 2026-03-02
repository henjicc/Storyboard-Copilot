import type { AnnotationItem } from './types';

export function normalizeAnnotationRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function sanitizeAnnotation(item: unknown): AnnotationItem | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const raw = item as Record<string, unknown>;
  const id = typeof raw.id === 'string' ? raw.id : null;
  const type = typeof raw.type === 'string' ? raw.type : null;
  if (!id || !type) {
    return null;
  }

  if (type === 'rect' || type === 'ellipse') {
    if (
      !isFiniteNumber(raw.x) ||
      !isFiniteNumber(raw.y) ||
      !isFiniteNumber(raw.width) ||
      !isFiniteNumber(raw.height)
    ) {
      return null;
    }

    return {
      id,
      type,
      x: raw.x,
      y: raw.y,
      width: Math.max(0, raw.width),
      height: Math.max(0, raw.height),
      stroke: typeof raw.stroke === 'string' ? raw.stroke : '#ff4d4f',
      lineWidth: isFiniteNumber(raw.lineWidth) ? Math.max(1, raw.lineWidth) : 3,
    };
  }

  if (type === 'arrow') {
    if (!Array.isArray(raw.points) || raw.points.length !== 4 || !raw.points.every(isFiniteNumber)) {
      return null;
    }

    return {
      id,
      type,
      points: [raw.points[0], raw.points[1], raw.points[2], raw.points[3]],
      stroke: typeof raw.stroke === 'string' ? raw.stroke : '#ff4d4f',
      lineWidth: isFiniteNumber(raw.lineWidth) ? Math.max(1, raw.lineWidth) : 3,
    };
  }

  if (type === 'pen') {
    if (!Array.isArray(raw.points) || raw.points.length < 4 || !raw.points.every(isFiniteNumber)) {
      return null;
    }

    return {
      id,
      type,
      points: raw.points,
      stroke: typeof raw.stroke === 'string' ? raw.stroke : '#ff4d4f',
      lineWidth: isFiniteNumber(raw.lineWidth) ? Math.max(1, raw.lineWidth) : 3,
    };
  }

  if (type === 'text') {
    if (!isFiniteNumber(raw.x) || !isFiniteNumber(raw.y) || typeof raw.text !== 'string') {
      return null;
    }

    return {
      id,
      type,
      x: raw.x,
      y: raw.y,
      text: raw.text,
      color: typeof raw.color === 'string' ? raw.color : '#ffffff',
      fontSize: isFiniteNumber(raw.fontSize) ? Math.max(10, raw.fontSize) : 28,
    };
  }

  return null;
}

export function parseAnnotationItems(value: unknown): AnnotationItem[] {
  let source: unknown = value;
  if (typeof value === 'string') {
    try {
      source = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(source)) {
    return [];
  }

  return source
    .map((item) => sanitizeAnnotation(item))
    .filter((item): item is AnnotationItem => item !== null);
}

export function stringifyAnnotationItems(items: AnnotationItem[]): string {
  return JSON.stringify(items);
}
