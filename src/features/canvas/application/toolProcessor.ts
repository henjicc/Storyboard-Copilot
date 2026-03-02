import {
  NODE_TOOL_TYPES,
  type NodeToolType,
  type StoryboardFrameItem,
} from '../domain/canvasNodes';
import {
  canvasToDataUrl,
  extractBase64Payload,
  imageUrlToDataUrl,
  loadImageElement,
  parseAspectRatio,
} from './imageData';
import { drawAnnotations, parseAnnotationItems } from '../tools/annotation';
import type {
  IdGenerator,
  ImageSplitGateway,
  ToolProcessor,
  ToolProcessorResult,
} from './ports';

export class CanvasToolProcessor implements ToolProcessor {
  constructor(
    private readonly splitGateway: ImageSplitGateway,
    private readonly idGenerator: IdGenerator
  ) {}

  async process(
    toolType: NodeToolType,
    sourceImageUrl: string,
    options: Record<string, unknown>
  ): Promise<ToolProcessorResult> {
    const normalizedSource = await imageUrlToDataUrl(sourceImageUrl);

    switch (toolType) {
      case NODE_TOOL_TYPES.crop:
        return {
          outputImageUrl: await this.cropImage(normalizedSource, options),
        };
      case NODE_TOOL_TYPES.annotate:
        return {
          outputImageUrl: await this.annotateImage(normalizedSource, options),
        };
      case NODE_TOOL_TYPES.splitStoryboard:
        return await this.splitStoryboard(
          normalizedSource,
          Number(options.rows ?? 3),
          Number(options.cols ?? 3)
        );
      default:
        throw new Error('不支持的工具类型');
    }
  }

  private async cropImage(sourceImage: string, options: Record<string, unknown>): Promise<string> {
    const aspectRatio = String(options.aspectRatio ?? '1:1');
    const targetRatio = parseAspectRatio(aspectRatio);
    const image = await loadImageElement(sourceImage);

    const cropX = Number(options.cropX);
    const cropY = Number(options.cropY);
    const cropWidthOption = Number(options.cropWidth);
    const cropHeightOption = Number(options.cropHeight);

    const hasManualCropArea =
      Number.isFinite(cropX) &&
      Number.isFinite(cropY) &&
      Number.isFinite(cropWidthOption) &&
      Number.isFinite(cropHeightOption) &&
      cropWidthOption > 0 &&
      cropHeightOption > 0;

    let cropWidth = image.naturalWidth;
    let cropHeight = image.naturalHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (hasManualCropArea) {
      offsetX = Math.min(image.naturalWidth - 1, Math.max(0, Math.floor(cropX)));
      offsetY = Math.min(image.naturalHeight - 1, Math.max(0, Math.floor(cropY)));
      cropWidth = Math.max(1, Math.min(Math.floor(cropWidthOption), image.naturalWidth - offsetX));
      cropHeight = Math.max(1, Math.min(Math.floor(cropHeightOption), image.naturalHeight - offsetY));
    } else if (aspectRatio === 'free') {
      offsetX = 0;
      offsetY = 0;
      cropWidth = image.naturalWidth;
      cropHeight = image.naturalHeight;
    } else {
      const sourceRatio = image.naturalWidth / image.naturalHeight;
      if (sourceRatio > targetRatio) {
        cropWidth = image.naturalHeight * targetRatio;
      } else {
        cropHeight = image.naturalWidth / targetRatio;
      }

      offsetX = (image.naturalWidth - cropWidth) / 2;
      offsetY = (image.naturalHeight - cropHeight) / 2;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(cropWidth));
    canvas.height = Math.max(1, Math.floor(cropHeight));

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('无法初始化画布');
    }

    context.drawImage(
      image,
      offsetX,
      offsetY,
      cropWidth,
      cropHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvasToDataUrl(canvas);
  }

  private async annotateImage(
    sourceImage: string,
    options: Record<string, unknown>
  ): Promise<string> {
    const image = await loadImageElement(sourceImage);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('无法初始化画布');
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const annotations = parseAnnotationItems(options.annotations);

    if (annotations.length > 0) {
      drawAnnotations(context, annotations);
    } else {
      const text = String(options.text ?? '').trim();
      const position = String(options.position ?? 'bottom');
      const color = String(options.color ?? '#FFFFFF');

      if (!text) {
        return canvasToDataUrl(canvas);
      }

      const fontSize = Math.max(24, Math.round(canvas.width * 0.04));
      context.font = `600 ${fontSize}px sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      const textWidth = context.measureText(text).width;
      const paddingX = Math.round(fontSize * 0.8);
      const paddingY = Math.round(fontSize * 0.6);
      const boxWidth = textWidth + paddingX * 2;
      const boxHeight = fontSize + paddingY * 2;

      const x = canvas.width / 2;
      const y = this.resolveAnnotateY(position, canvas.height, boxHeight);

      context.fillStyle = 'rgba(0, 0, 0, 0.45)';
      context.fillRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight);
      context.fillStyle = color;
      context.fillText(text, x, y);
    }

    return canvasToDataUrl(canvas);
  }

  private resolveAnnotateY(position: string, canvasHeight: number, boxHeight: number): number {
    if (position === 'top') {
      return boxHeight / 2 + 24;
    }

    if (position === 'center') {
      return canvasHeight / 2;
    }

    return canvasHeight - boxHeight / 2 - 24;
  }

  private async splitStoryboard(
    sourceImage: string,
    rows: number,
    cols: number
  ): Promise<ToolProcessorResult> {
    if (rows <= 0 || cols <= 0) {
      throw new Error('分镜行列必须大于 0');
    }

    const base64Payload = extractBase64Payload(sourceImage);

    let outputs: string[];
    try {
      outputs = await this.splitGateway.split(base64Payload, rows, cols);
    } catch {
      outputs = await this.localSplit(sourceImage, rows, cols);
    }

    const frames: StoryboardFrameItem[] = outputs.map((imageUrl, index) => ({
      id: this.idGenerator.next(),
      imageUrl,
      note: '',
      order: index,
    }));

    return {
      storyboardFrames: frames,
      rows,
      cols,
    };
  }

  private async localSplit(sourceImage: string, rows: number, cols: number): Promise<string[]> {
    const image = await loadImageElement(sourceImage);
    const cellWidth = Math.floor(image.naturalWidth / cols);
    const cellHeight = Math.floor(image.naturalHeight / rows);

    const canvas = document.createElement('canvas');
    canvas.width = cellWidth;
    canvas.height = cellHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('无法初始化画布');
    }

    const results: string[] = [];

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(
          image,
          col * cellWidth,
          row * cellHeight,
          cellWidth,
          cellHeight,
          0,
          0,
          cellWidth,
          cellHeight
        );
        results.push(canvasToDataUrl(canvas));
      }
    }

    return results;
  }
}
