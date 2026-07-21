import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { StateService } from '../../core/services/state.service';
import { Subscription } from 'rxjs';

declare const AFRAME: any;

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
  activeExperienceId: string = 'choza_realalto';
  experiences = this.stateService.experiences;
  statusText: string = 'Cargando cámara...';
  statusDotActive: boolean = false;
  isLandscapeMode: boolean = true;
  isMarkerMenuOpen: boolean = false;

  private subscriptions: Subscription = new Subscription();

  private boundMarkerFound = this.onMarkerFound.bind(this);
  private boundMarkerLost = this.onMarkerLost.bind(this);
  private boundOrientationChange = this.handleOrientationRequirement.bind(this);

  constructor(public stateService: StateService) {}

  ngOnInit() {
    this.handleOrientationRequirement();
    window.addEventListener('resize', this.boundOrientationChange);
    window.addEventListener('orientationchange', this.boundOrientationChange);

    window.addEventListener('ar-marker-found', this.boundMarkerFound as any);
    window.addEventListener('ar-marker-lost', this.boundMarkerLost as any);

    this.subscriptions.add(
      this.stateService.activeExperienceId$.subscribe(id => {
        this.activeExperienceId = id;
        this.setupScene();
      })
    );

    this.subscriptions.add(
      this.stateService.arStarted$.subscribe(started => {
        if (started) {
          this.statusDotActive = true;
          const activeExperience = this.stateService.getActiveExperience();
          this.statusText = `Escaneando marcador [${activeExperience.markerPreset.toUpperCase()}]`;
          this.setupScene();
          this.requestSensorPermissions();
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    window.removeEventListener('resize', this.boundOrientationChange);
    window.removeEventListener('orientationchange', this.boundOrientationChange);
    window.removeEventListener('ar-marker-found', this.boundMarkerFound as any);
    window.removeEventListener('ar-marker-lost', this.boundMarkerLost as any);
  }

  startAR() {
    this.stateService.setArStarted(true);
    this.statusDotActive = true;
    const activeExperience = this.stateService.getActiveExperience();
    this.statusText = `Escaneando marcador [${activeExperience.markerPreset.toUpperCase()}]`;
    
    this.setupScene();
    this.requestSensorPermissions();
  }

  async requestSensorPermissions() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          // No-op: marker tracking does not require orientation listeners.
        }
      } catch (error) {
        console.warn("Could not request DeviceOrientation permission:", error);
      }
    }
  }

  onMarkerFound(event: CustomEvent) {
    if (!this.isLandscapeMode) {
      this.stateService.setMarkerVisible(false);
      this.stateService.setModelLoaded(false);
      this.statusDotActive = false;
      return;
    }

    const markerId = event.detail.id;
    const activeExperience = this.stateService.getActiveExperience();
    const expectedMarkerId = `marker-${activeExperience.markerPreset}`;
    
    if (markerId === expectedMarkerId) {
      this.stateService.setMarkerVisible(true);
      this.statusText = 'Marcador detectado';
      setTimeout(() => {
        this.stateService.setModelLoaded(true);
      }, 1000);
    }
  }

  onMarkerLost(event: CustomEvent) {
    const markerId = event.detail.id;
    const activeExperience = this.stateService.getActiveExperience();
    const expectedMarkerId = `marker-${activeExperience.markerPreset}`;

    if (markerId === expectedMarkerId) {
      this.stateService.setMarkerVisible(false);
      this.statusText = 'Buscando marcador...';
    }
  }

  private handleOrientationRequirement() {
    this.isLandscapeMode = window.innerWidth > window.innerHeight;
    if (!this.isLandscapeMode) {
      this.isMarkerMenuOpen = false;
      this.statusDotActive = false;
      this.statusText = 'Escaneo pausado';
      this.stateService.setMarkerVisible(false);
      this.stateService.setModelLoaded(false);
      this.setupScene();
      return;
    }

    this.statusDotActive = true;
    const activeExperience = this.stateService.getActiveExperience();
    this.statusText = `Escaneando marcador [${activeExperience.markerPreset.toUpperCase()}]`;
    this.setupScene();
  }

  goToMainMenu() {
    window.dispatchEvent(new CustomEvent('back-to-home-request'));
  }

  toggleMarkerMenu() {
    this.isMarkerMenuOpen = !this.isMarkerMenuOpen;
  }

  setupScene() {
    this.experiences.forEach(exp => {
      const marker = document.getElementById(`marker-${exp.markerPreset}`);
      if (!marker) return;

      const shouldBeVisible = this.isLandscapeMode && exp.id === this.activeExperienceId;
      marker.setAttribute('visible', shouldBeVisible ? 'true' : 'false');
    });
  }

  resetExperience() {
    window.dispatchEvent(new CustomEvent('ar-reset-request'));

    this.stateService.setMarkerVisible(false);
    this.stateService.setModelLoaded(false);
    this.stateService.setModelAnchored(false);
    this.statusText = 'Reiniciando escaneo...';

    const anchoredModel = document.getElementById('anchored-model');
    if (anchoredModel) {
      anchoredModel.parentNode?.removeChild(anchoredModel);
    }

    this.experiences.forEach(exp => {
      const marker = document.getElementById(`marker-${exp.markerPreset}`);
      marker?.setAttribute('visible', 'false');
    });

    const activeExperience = this.stateService.getActiveExperience();
    setTimeout(() => {
      this.setupScene();
      this.statusText = `Escaneando marcador [${activeExperience.markerPreset.toUpperCase()}]`;
    }, 220);
  }

  selectModel(experienceId: string) {
    this.isMarkerMenuOpen = false;
    this.stateService.setActiveExperienceId(experienceId);
    this.resetExperience();
  }
}
