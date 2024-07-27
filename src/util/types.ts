export type BrushStroke = {
    xPos: number;
    yPos: number;
  }

export class Stroke {
    x: number;
    y: number;
    color: string;
    size: number;
  
    constructor(x: number, y: number, color: string, size: number) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.size = size;
    }
      
  }
  