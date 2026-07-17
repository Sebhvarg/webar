export interface LayerElement {
  id: string;
  name: string;
  glb: string;
  png: string;
  desc: string;
}

export interface Layer {
  id: string;
  name: string;
  mainImage: string;
  backgroundImage: string;
  foregroundImage: string;
  elements: LayerElement[];
}

export interface ARModel {
  name: string;
  markerPreset: string;
  type: string;
  url?: string;
  modelUrl?: string;
  width?: number;
  height?: number;
  scale: string;
  position: string;
  rotation: string;
  emoji: string;
}
