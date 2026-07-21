import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Layer, ARExperience } from '../models/experience.model';

@Injectable({
  providedIn: 'root'
})
export class StateService {
  private arStartedSource = new BehaviorSubject<boolean>(false);
  arStarted$ = this.arStartedSource.asObservable();

  private activeExperienceIdSource = new BehaviorSubject<string>('choza_realalto');
  activeExperienceId$ = this.activeExperienceIdSource.asObservable();

  private markerVisibleSource = new BehaviorSubject<boolean>(false);
  markerVisible$ = this.markerVisibleSource.asObservable();

  private modelLoadedSource = new BehaviorSubject<boolean>(false);
  modelLoaded$ = this.modelLoadedSource.asObservable();

  private modelAnchoredSource = new BehaviorSubject<boolean>(false);
  modelAnchored$ = this.modelAnchoredSource.asObservable();

  private interiorActiveSource = new BehaviorSubject<boolean>(false);
  interiorActive$ = this.interiorActiveSource.asObservable();

  private activeElementIdSource = new BehaviorSubject<string>('valdivia');
  activeElementId$ = this.activeElementIdSource.asObservable();

  private sidebarOpenSource = new BehaviorSubject<boolean>(false);
  sidebarOpen$ = this.sidebarOpenSource.asObservable();

  private activeTabSource = new BehaviorSubject<string>('inicio');
  activeTab$ = this.activeTabSource.asObservable();

  public experiences: ARExperience[] = [
    {
      id: 'choza_realalto',
      name: 'experience.choza_realalto.name',
      markerPreset: 'hiro',
      markerLabel: 'Hiro',
      scanImage: 'assets/img/choza.webp',
      layer: {
        id: 'layer_choza',
        name: 'experience.choza_realalto.layerName',
        mainImage: 'assets/img/choza.webp',
        backgroundImage: 'assets/img/interiorchoza.webp',
        foregroundImage: 'assets/entorno/mesa.png',
        elements: [
          {
            id: 'valdivia',
            name: 'element.valdivia.name',
            glb: 'assets/models/valdivia.glb',
            png: 'assets/models/valdivia.png',
            desc: 'element.valdivia.desc'
          }
        ]
      }
    },
    {
      id: 'choza2_realalto',
      name: 'experience.choza2_realalto.name',
      markerPreset: 'kanji',
      markerLabel: 'Kanji',
      scanImage: 'assets/img/choza2.webp',
      layer: {
        id: 'layer_choza2',
        name: 'experience.choza2_realalto.layerName',
        mainImage: 'assets/img/choza2.webp',
        backgroundImage: 'assets/img/interiorchoza2.webp',
        foregroundImage: 'assets/entorno/mesa.png',
        elements: [
          {
            id: 'choza2_realalto',
            name: 'element.choza2_realalto.name',
            glb: 'assets/models/duck.glb',
            png: 'assets/models/duck.png',
            desc: 'element.choza2_realalto.desc'
          }
        ]
      }
    }
  ];

  setArStarted(started: boolean) {
    this.arStartedSource.next(started);
  }

  setActiveExperienceId(experienceId: string) {
    this.activeExperienceIdSource.next(experienceId);
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

  setActiveElementId(elementId: string) {
    this.activeElementIdSource.next(elementId);
  }

  setSidebarOpen(open: boolean) {
    this.sidebarOpenSource.next(open);
  }

  setActiveTab(tab: string) {
    this.activeTabSource.next(tab);
  }

  getCurrentLayer(): Layer {
    return this.getActiveExperience().layer;
  }

  getActiveExperienceId(): string {
    return this.activeExperienceIdSource.value;
  }

  getActiveExperience(): ARExperience {
    return this.experiences.find(exp => exp.id === this.activeExperienceIdSource.value) || this.experiences[0];
  }
}
