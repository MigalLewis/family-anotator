export type Point = { xPct: number; yPct: number };
export type AnnotationType = 'point' | 'polygon';


export interface Annotation {
  id: string;
  name: string;
  label: number;
  start: { 
    xPct: number; 
    yPct: number; 
  };
  end: { 
    xPct: number; 
    yPct: number; 
  };
}

export interface NameDialogData {
  title: string;
  name?: string;
}