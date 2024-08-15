export type BrushStroke = {
  xPos: number;
  yPos: number;
};

export type ImagePreview = {
  id: string;
  imageFile: ImageFile;
  artists: string[] | null;
};

export type ImageFile = {
  filename: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export class Stroke {
  x: number;
  y: number;
  px: number;
  py: number;
  color: string;
  size: number;

  constructor(
    x: number,
    y: number,
    px: number,
    py: number,
    color: string,
    size: number
  ) {
    this.x = x;
    this.y = y;
    this.px = px;
    this.py = py;
    this.color = color;
    this.size = size;
  }
}
