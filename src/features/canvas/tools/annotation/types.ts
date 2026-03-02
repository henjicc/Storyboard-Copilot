export type AnnotationToolType = 'select' | 'rect' | 'ellipse' | 'arrow' | 'pen' | 'text';

export interface AnnotationStyle {
  stroke: string;
  lineWidth: number;
}

export interface RectAnnotation extends AnnotationStyle {
  id: string;
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EllipseAnnotation extends AnnotationStyle {
  id: string;
  type: 'ellipse';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArrowAnnotation extends AnnotationStyle {
  id: string;
  type: 'arrow';
  points: [number, number, number, number];
}

export interface PenAnnotation extends AnnotationStyle {
  id: string;
  type: 'pen';
  points: number[];
}

export interface TextAnnotation {
  id: string;
  type: 'text';
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
}

export type AnnotationItem =
  | RectAnnotation
  | EllipseAnnotation
  | ArrowAnnotation
  | PenAnnotation
  | TextAnnotation;
