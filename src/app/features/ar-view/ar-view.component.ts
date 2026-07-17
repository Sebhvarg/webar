import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { StateService } from '../../core/services/state.service';
import { ARModel } from '../../core/models/experience.model';
import { Subscription } from 'rxjs';

declare const AFRAME: any;
declare const THREE: any;

// Registrar componente de A-Frame de forma global al cargar el archivo
if (typeof window !== 'undefined' && (window as any).AFRAME && !(window as any).AFRAME.components['registerevents']) {
  (window as any).AFRAME.registerComponent('registerevents', {
    init: function () {
      const marker = this.el;
      marker.addEventListener('markerFound', () => {
        window.dispatchEvent(new CustomEvent('ar-marker-found', { detail: { id: marker.id } }));
      });
      marker.addEventListener('markerLost', () => {
        window.dispatchEvent(new CustomEvent('ar-marker-lost', { detail: { id: marker.id } }));
      });
    }
  });
}

@Component({
  selector: 'app-ar-view',
  templateUrl: './ar-view.component.html',
  styleUrls: ['./ar-view.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ArViewComponent implements OnInit, OnDestroy {
  activeModelId: string = 'robot';
  modelLoaded: boolean = false;
  modelAnchored: boolean = false;
  statusText: string = 'Cargando cámara...';
  statusDotActive: boolean = false;
  showInstructionBanner: boolean = false;
  instructionTitle: string = 'MUEVA EL CELULAR HACIA ARRIBA';
  instructionDesc: string = 'Tensa el dispositivo hacia arriba para fijar el modelo en tu espacio.';
  
  private initialPitch: number | null = null;
  private tiltThreshold = 15;
  private subscriptions: Subscription = new Subscription();

  private boundMarkerFound = this.onMarkerFound.bind(this);
  private boundMarkerLost = this.onMarkerLost.bind(this);

  constructor(public stateService: StateService) {}

  ngOnInit() {
    window.addEventListener('ar-marker-found', this.boundMarkerFound as any);
    window.addEventListener('ar-marker-lost', this.boundMarkerLost as any);

    this.subscriptions.add(
      this.stateService.activeModelId$.subscribe(id => {
        this.activeModelId = id;
        this.setupScene();
      })
    );

    this.subscriptions.add(
      this.stateService.modelLoaded$.subscribe(loaded => this.modelLoaded = loaded)
    );

    this.subscriptions.add(
      this.stateService.modelAnchored$.subscribe(anchored => this.modelAnchored = anchored)
    );

    this.subscriptions.add(
      this.stateService.arStarted$.subscribe(started => {
        if (started) {
          this.statusDotActive = true;
          const modelConfig = this.stateService.models[this.activeModelId];
          this.statusText = `Escaneando marcador [${modelConfig.markerPreset.toUpperCase()}]`;
          this.setupScene();
          this.requestSensorPermissions();
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    window.removeEventListener('deviceorientation', this.handleOrientation);
    window.removeEventListener('ar-marker-found', this.boundMarkerFound as any);
    window.removeEventListener('ar-marker-lost', this.boundMarkerLost as any);
  }

  startAR() {
    this.stateService.setArStarted(true);
    this.statusDotActive = true;
    const modelConfig = this.stateService.models[this.activeModelId];
    this.statusText = `Escaneando marcador [${modelConfig.markerPreset.toUpperCase()}]`;
    
    this.setupScene();
    this.requestSensorPermissions();
  }

  async requestSensorPermissions() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          window.addEventListener('deviceorientation', this.handleOrientation.bind(this));
        }
      } catch (error) {
        console.warn("Could not request DeviceOrientation permission:", error);
      }
    } else {
      window.addEventListener('deviceorientation', this.handleOrientation.bind(this));
    }
  }

  handleOrientation(event: DeviceOrientationEvent) {
    if (!this.modelLoaded || this.modelAnchored) return;

    const pitch = event.beta;
    if (pitch === null) return;

    if (this.initialPitch === null) {
      this.initialPitch = pitch;
      return;
    }

    const diff = Math.abs(pitch - this.initialPitch);
    if (diff > this.tiltThreshold) {
      this.anchorModel();
    }
  }

  onMarkerFound(event: CustomEvent) {
    const markerId = event.detail.id;
    const modelConfig = this.stateService.models[this.activeModelId];
    const expectedMarkerId = `marker-${modelConfig.markerPreset}`;
    
    if (markerId === expectedMarkerId) {
      this.stateService.setMarkerVisible(true);
      this.statusText = 'Marcador detectado';
      setTimeout(() => {
        this.stateService.setModelLoaded(true);
        this.showInstruction(
          'MUEVA EL CELULAR HACIA ARRIBA',
          'Tensa el dispositivo hacia el cielo para fijar el modelo 3D.'
        );
      }, 1000);
    }
  }

  onMarkerLost(event: CustomEvent) {
    const markerId = event.detail.id;
    const modelConfig = this.stateService.models[this.activeModelId];
    const expectedMarkerId = `marker-${modelConfig.markerPreset}`;

    if (markerId === expectedMarkerId) {
      this.stateService.setMarkerVisible(false);
      if (!this.modelAnchored) {
        this.statusText = 'Buscando marcador...';
        this.hideInstruction();
      }
    }
  }

  setupScene() {
    // Al usar marcadores estáticos, alternamos su visibilidad según el modelo seleccionado
    const markerHiro = document.getElementById('marker-hiro');
    const markerKanji = document.getElementById('marker-kanji');
    if (!markerHiro || !markerKanji) return;

    if (this.activeModelId === 'robot') {
      markerHiro.setAttribute('visible', 'true');
      markerKanji.setAttribute('visible', 'false');
    } else {
      markerHiro.setAttribute('visible', 'false');
      markerKanji.setAttribute('visible', 'true');
    }

    // Asegurar que los listeners de click estén asociados a los elementos estáticos
    const modelHiro = document.getElementById('ar-model');
    if (modelHiro && !(modelHiro as any)._clickBound) {
      modelHiro.addEventListener('click', this.startZoomAndFade.bind(this));
      (modelHiro as any)._clickBound = true;
    }

    const modelKanji = document.getElementById('ar-model-kanji');
    if (modelKanji && !(modelKanji as any)._clickBound) {
      modelKanji.addEventListener('click', this.startZoomAndFade.bind(this));
      (modelKanji as any)._clickBound = true;
    }
  }

  showInstruction(title: string, desc: string) {
    this.instructionTitle = title;
    this.instructionDesc = desc;
    this.showInstructionBanner = true;
  }

  hideInstruction() {
    this.showInstructionBanner = false;
  }

  anchorModel() {
    if (this.modelAnchored) return;

    const activeModel = this.stateService.models[this.activeModelId];
    const modelId = activeModel.type === 'image' ? 'ar-model' : 'ar-model-kanji';
    const modelEl = document.getElementById(modelId);
    const sceneEl = document.querySelector('a-scene');
    if (!modelEl || !sceneEl) return;

    const worldPos = new THREE.Vector3();
    (modelEl as any).object3D.getWorldPosition(worldPos);

    const worldRot = new THREE.Quaternion();
    (modelEl as any).object3D.getWorldQuaternion(worldRot);

    const worldScale = new THREE.Vector3();
    (modelEl as any).object3D.getWorldScale(worldScale);

    const staticModel = document.createElement(activeModel.type === 'image' ? 'a-image' : 'a-entity');
    staticModel.setAttribute('id', 'anchored-model');

    if (activeModel.type === 'image') {
      staticModel.setAttribute('src', activeModel.url || '');
      if (activeModel.width) staticModel.setAttribute('width', activeModel.width.toString());
      if (activeModel.height) staticModel.setAttribute('height', activeModel.height.toString());
    } else {
      staticModel.setAttribute('gltf-model', `url(${activeModel.modelUrl})`);
    }

    staticModel.setAttribute('scale', `${worldScale.x} ${worldScale.y} ${worldScale.z}`);
    staticModel.setAttribute('position', `${worldPos.x} ${worldPos.y} ${worldPos.z}`);
    staticModel.classList.add('interactive');
    staticModel.addEventListener('click', this.startZoomAndFade.bind(this));

    sceneEl.appendChild(staticModel);
    (staticModel as any).object3D.quaternion.copy(worldRot);

    modelEl.setAttribute('visible', 'false');
    this.stateService.setModelAnchored(true);
    this.statusText = 'Modelo Fijado en el Espacio';

    this.showInstruction('MODELO ANCLADO', 'El modelo ahora está fijo en la habitación. ¡Muévete alrededor!');
    setTimeout(() => {
      if (this.modelAnchored) {
        this.hideInstruction();
      }
    }, 4000);
  }

  startZoomAndFade(event: any) {
    const el = event.currentTarget;
    const currentScale = el.getAttribute('scale') || { x: 1, y: 1, z: 1 };
    const startScaleX = currentScale.x;
    const startScaleY = currentScale.y;
    const startScaleZ = currentScale.z;

    const currentPos = el.getAttribute('position') || { x: 0, y: 0, z: 0 };
    const startPosX = currentPos.x;
    const startPosY = currentPos.y;
    const startPosZ = currentPos.z;

    const duration = 1200;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * progress;
      const zoomFactor = 1 + easeProgress * 5.0;
      const opacity = 1 - progress;

      el.setAttribute('scale', `${startScaleX * zoomFactor} ${startScaleY * zoomFactor} ${startScaleZ * zoomFactor}`);
      el.setAttribute('position', `${startPosX} ${startPosY + easeProgress * 0.8} ${startPosZ + easeProgress * 2.5}`);
      el.setAttribute('material', `opacity: ${opacity}`);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.transitionToCabin();
      }
    };
    requestAnimationFrame(animate);
  }

  transitionToCabin() {
    // Hide standard overlay elements
    const sceneEl = document.querySelector('a-scene');
    if (sceneEl) (sceneEl as any).style.display = 'none';

    // Stop camera video stream
    const videoEl = document.querySelector('video');
    if (videoEl) {
      const stream = (videoEl as any).srcObject;
      if (stream) {
        stream.getTracks().forEach((track: any) => track.stop());
      }
      videoEl.parentNode?.removeChild(videoEl);
    }

    // Set interior layer active state
    this.stateService.setInteriorActive(true);
  }

  resetExperience() {
    this.stateService.setMarkerVisible(false);
    this.stateService.setModelLoaded(false);
    this.stateService.setModelAnchored(false);
    this.initialPitch = null;
    this.hideInstruction();

    const anchoredModel = document.getElementById('anchored-model');
    if (anchoredModel) {
      anchoredModel.parentNode?.removeChild(anchoredModel);
    }
    this.setupScene();
  }

  selectModel(modelId: string) {
    this.stateService.setActiveModelId(modelId);
    this.resetExperience();
  }
}
