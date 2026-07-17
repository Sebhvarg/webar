import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Layer, ARModel } from '../models/experience.model';

@Injectable({
  providedIn: 'root'
})
export class StateService {
  private arStartedSource = new BehaviorSubject<boolean>(false);
  arStarted$ = this.arStartedSource.asObservable();

  private activeModelIdSource = new BehaviorSubject<string>('robot');
  activeModelId$ = this.activeModelIdSource.asObservable();

  private markerVisibleSource = new BehaviorSubject<boolean>(false);
  markerVisible$ = this.markerVisibleSource.asObservable();

  private modelLoadedSource = new BehaviorSubject<boolean>(false);
  modelLoaded$ = this.modelLoadedSource.asObservable();

  private modelAnchoredSource = new BehaviorSubject<boolean>(false);
  modelAnchored$ = this.modelAnchoredSource.asObservable();

  private interiorActiveSource = new BehaviorSubject<boolean>(false);
  interiorActive$ = this.interiorActiveSource.asObservable();

  private activeLayerIndexSource = new BehaviorSubject<number>(0);
  activeLayerIndex$ = this.activeLayerIndexSource.asObservable();

  private activeElementIdSource = new BehaviorSubject<string>('valdivia');
  activeElementId$ = this.activeElementIdSource.asObservable();

  // Layer-based Experience Data Pattern
  public layers: Layer[] = [
    {
      id: 'layer_choza',
      name: 'Entorno Choza',
      mainImage: 'assets/img/choza.webp',
      backgroundImage: 'assets/img/interiorchoza.webp',
      foregroundImage: 'assets/entorno/mesa.png',
      elements: [
        {
          id: 'valdivia',
          name: 'Estatuilla Valdivia',
          glb: 'assets/models/valdivia.glb',
          png: 'assets/models/valdivia.png',
          desc: 'Figura cerámica de la cultura Valdivia, representando la fertilidad y el arte precolombino.'
        },
        {
          id: 'pato',
          name: 'Pato Silbato',
          glb: 'assets/models/duck.glb',
          png: 'assets/models/valdivia.png',
          desc: 'Instrumento ceremonial musical zoomorfo recreado en modelado 3D.'
        }
      ]
    }
  ];

  public models: { [key: string]: ARModel } = {
    robot: {
      name: 'Choza RealAlto',
      markerPreset: 'hiro',
      type: 'image',
      url: '#choza-img',
      width: 2.37,
      height: 1,
      scale: '1.5 1.5 1.5',
      position: '0 0.01 0',
      rotation: '-90 0 0',
      emoji: '🛖'
    },
    spaceship: {
      name: 'Nave Espacial',
      markerPreset: 'kanji',
      type: 'model',
      modelUrl: 'assets/models/duck.glb',
      scale: '0.5 0.5 0.5',
      position: '0 0 0',
      rotation: '0 0 0',
      emoji: '🦆'
    }
  };

  setArStarted(started: boolean) {
    this.arStartedSource.next(started);
  }

  setActiveModelId(modelId: string) {
    this.activeModelIdSource.next(modelId);
  }

  setMarkerVisible(visible: boolean) {
    this.markerVisibleSource.next(visible);
  }

  setModelLoaded(loaded: boolean) {
    this.modelLoadedSource.next(loaded);
  }

  setModelAnchored(anchored: boolean) {
    this.modelAnchoredSource.next(anchored);
  }

  setInteriorActive(active: boolean) {
    this.interiorActiveSource.next(active);
  }

  setActiveLayerIndex(index: number) {
    this.activeLayerIndexSource.next(index);
  }

  setActiveElementId(elementId: string) {
    this.activeElementIdSource.next(elementId);
  }

  getCurrentLayer(): Layer {
    return this.layers[this.activeLayerIndexSource.value];
  }
}
