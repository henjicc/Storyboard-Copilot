import type { CanvasNode, NodeToolType } from '../domain/canvasNodes';
import type { ToolProcessorResult } from '../application/ports';

export type ToolOptionPrimitive = string | number | boolean;
export type ToolOptions = Record<string, ToolOptionPrimitive>;

interface ToolFieldBase {
  key: string;
  label: string;
}

export interface ToolTextField extends ToolFieldBase {
  type: 'text';
  placeholder?: string;
}

export interface ToolNumberField extends ToolFieldBase {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
}

export interface ToolSelectField extends ToolFieldBase {
  type: 'select';
  options: Array<{
    label: string;
    value: string;
  }>;
}

export interface ToolColorField extends ToolFieldBase {
  type: 'color';
}

export type ToolFieldSchema =
  | ToolTextField
  | ToolNumberField
  | ToolSelectField
  | ToolColorField;

export interface ToolExecutionContext {
  processTool: (
    toolType: NodeToolType,
    sourceImageUrl: string,
    options: Record<string, unknown>
  ) => Promise<ToolProcessorResult>;
}

export type ToolIconKey = 'crop' | 'annotate' | 'split';
export type ToolEditorKind = 'form' | 'crop' | 'annotate';

export interface CanvasToolPlugin {
  type: NodeToolType;
  label: string;
  icon: ToolIconKey;
  editor: ToolEditorKind;
  supportsNode: (node: CanvasNode) => boolean;
  createInitialOptions: (node: CanvasNode) => ToolOptions;
  fields: ToolFieldSchema[];
  execute: (
    sourceImageUrl: string,
    options: ToolOptions,
    context: ToolExecutionContext
  ) => Promise<ToolProcessorResult>;
}
