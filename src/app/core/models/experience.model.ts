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

export interface ARExperience {
  id: string;
  name: string;
  markerPreset: string;
  markerLabel?: string;
  scanImage: string;
  layer: Layer;
}
