import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { StateService } from '../../core/services/state.service';
import { I18nService } from '../../core/services/i18n.service';
import { TPipe } from '../../core/pipes/t.pipe';
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
  imports: [CommonModule, IonicModule, TPipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ArViewComponent implements OnInit, OnDestroy {
  activeExperienceId: string = 'choza_realalto';
  experiences = this.stateService.experiences;
  statusText: string = '';
  statusDotActive: boolean = false;
  isLandscapeMode: boolean = true;
  isMarkerMenuOpen: boolean = false;
  private statusMode: 'loading' | 'scanning' | 'detected' | 'searching' | 'paused' | 'resetting' = 'loading';
  private statusMarker = '';

  private subscriptions: Subscription = new Subscription();

  private boundMarkerFound = this.onMarkerFound.bind(this);
  private boundMarkerLost = this.onMarkerLost.bind(this);
  private boundOrientationChange = this.handleOrientationRequirement.bind(this);

  constructor(public stateService: StateService, private i18n: I18nService) {
    this.refreshStatusText();
  }

  ngOnInit() {
    this.subscriptions.add(
      this.i18n.language$.subscribe(() => {
        this.refreshStatusText();
      })
    );

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
          this.setScanningStatus(activeExperience.markerPreset);
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
    this.setScanningStatus(activeExperience.markerPreset);
    
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
      this.statusMode = 'detected';
      this.refreshStatusText();
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
      this.statusMode = 'searching';
      this.refreshStatusText();
    }
  }

  private handleOrientationRequirement() {
    this.isLandscapeMode = window.innerWidth > window.innerHeight;
    if (!this.isLandscapeMode) {
      this.isMarkerMenuOpen = false;
      this.statusDotActive = false;
      this.statusMode = 'paused';
      this.refreshStatusText();
      this.stateService.setMarkerVisible(false);
      this.stateService.setModelLoaded(false);
      this.setupScene();
      return;
    }

    this.statusDotActive = true;
    const activeExperience = this.stateService.getActiveExperience();
    this.setScanningStatus(activeExperience.markerPreset);
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
    this.statusMode = 'resetting';
    this.refreshStatusText();

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
      this.setScanningStatus(activeExperience.markerPreset);
    }, 220);
  }

  selectModel(experienceId: string) {
    this.isMarkerMenuOpen = false;
    this.stateService.setActiveExperienceId(experienceId);
    this.resetExperience();
  }

  getMarkerPillLabel(markerLabel: string | undefined, markerPreset: string, experienceNameKey: string): string {
    const marker = markerLabel || markerPreset;
    return `${marker} - ${this.i18n.t(experienceNameKey)}`;
  }

  private setScanningStatus(markerPreset: string) {
    this.statusMode = 'scanning';
    this.statusMarker = markerPreset.toUpperCase();
    this.refreshStatusText();
  }

  private refreshStatusText() {
    if (this.statusMode === 'scanning') {
      const template = this.i18n.t('ar.status.scanning');
      this.statusText = template.replace('{marker}', this.statusMarker || '');
      return;
    }

    this.statusText = this.i18n.t(`ar.status.${this.statusMode}`);
  }
}
