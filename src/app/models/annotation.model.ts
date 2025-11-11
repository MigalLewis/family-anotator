export type Point = { xPct: number; yPct: number };
export type AnnotationType = 'point' | 'polygon';


export interface Annotation {
    id: string;
    name: string;
    type: AnnotationType;
    points: Point[]; // For 'point', use a single point. For 'polygon', list vertices in order.
    color?: string; // Optional highlight color
    note?: string; // Optional extra info
    createdAt: string;
}