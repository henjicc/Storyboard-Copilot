import type { AnnotationItem } from './types';

function drawArrowHead(
  context: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  lineWidth: number
) {
  const headLength = Math.max(10, lineWidth * 4);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const leftX = x2 - headLength * Math.cos(angle - Math.PI / 6);
  const leftY = y2 - headLength * Math.sin(angle - Math.PI / 6);
  const rightX = x2 - headLength * Math.cos(angle + Math.PI / 6);
  const rightY = y2 - headLength * Math.sin(angle + Math.PI / 6);

  context.beginPath();
  context.moveTo(x2, y2);
  context.lineTo(leftX, leftY);
  context.lineTo(rightX, rightY);
  context.closePath();
  context.fillStyle = color;
  context.fill();
}

export function drawAnnotations(
  context: CanvasRenderingContext2D,
  items: AnnotationItem[]
): void {
  for (const item of items) {
    if (item.type === 'rect') {
      context.save();
      context.strokeStyle = item.stroke;
      context.lineWidth = item.lineWidth;
      context.strokeRect(item.x, item.y, item.width, item.height);
      context.restore();
      continue;
    }

    if (item.type === 'ellipse') {
      context.save();
      context.strokeStyle = item.stroke;
      context.lineWidth = item.lineWidth;
      context.beginPath();
      context.ellipse(
        item.x + item.width / 2,
        item.y + item.height / 2,
        Math.max(1, item.width / 2),
        Math.max(1, item.height / 2),
        0,
        0,
        Math.PI * 2
      );
      context.stroke();
      context.restore();
      continue;
    }

    if (item.type === 'arrow') {
      const [x1, y1, x2, y2] = item.points;
      context.save();
      context.strokeStyle = item.stroke;
      context.lineWidth = item.lineWidth;
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
      drawArrowHead(context, x1, y1, x2, y2, item.stroke, item.lineWidth);
      context.restore();
      continue;
    }

    if (item.type === 'pen') {
      context.save();
      context.strokeStyle = item.stroke;
      context.lineWidth = item.lineWidth;
      context.lineJoin = 'round';
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(item.points[0], item.points[1]);
      for (let index = 2; index < item.points.length; index += 2) {
        context.lineTo(item.points[index], item.points[index + 1]);
      }
      context.stroke();
      context.restore();
      continue;
    }

    if (item.type === 'text') {
      context.save();
      context.fillStyle = item.color;
      context.font = `600 ${item.fontSize}px sans-serif`;
      context.textBaseline = 'top';
      context.fillText(item.text, item.x, item.y);
      context.restore();
    }
  }
}
