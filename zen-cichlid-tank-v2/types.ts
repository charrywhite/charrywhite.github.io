
export enum FishType {
  YELLOW_LAB = 'YELLOW_LAB', // Electric Yellow Cichlid
  DEMASONI = 'DEMASONI',     // Blue/Black Striped Cichlid
  PEACOCK = 'PEACOCK',       // Orange/Reddish Cichlid
  FRONTOSA = 'FRONTOSA',     // Black/White Striped with Blue Fins
}

export interface Point {
  x: number;
  y: number;
}

export interface Vector {
  x: number;
  y: number;
}

export interface BezierSegment {
  p0: Point;
  p1: Point;
  p2: Point;
}

export interface FishEntity {
  id: number;
  x: number;
  y: number;
  angle: number; // Current facing angle in radians
  size: number;
  type: FishType;
  phase: number; // For tail animation
  
  // Path Data (Continuous Bezier Loop)
  pathSegments?: BezierSegment[];
  currentSegment?: number;
  segmentStartTime?: number;
  segmentDuration?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
}

export interface RockConfig {
  points: Point[];
  color: string;
  highlight: string;
  shadow: string;
}