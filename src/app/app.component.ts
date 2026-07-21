import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ArViewComponent } from './features/ar-view/ar-view.component';
import { CabinViewComponent } from './features/cabin-view/cabin-view.component';
import { HomeComponent } from './pages/home/home.component';
import { InformationComponent } from './pages/information/information.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { StateService } from './core/services/state.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ArViewComponent, CabinViewComponent, HomeComponent, InformationComponent, SidebarComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppComponent implements OnInit, OnDestroy {
  showLoadingScreen = true;
  showFixedChoza = false;
  isLandscapeMode = true;
  isInteriorActive = false;
  activeExperienceId = '';
  activeMarkerId = '';
  activeScanImage = '';
  detectedExperienceId = '';
  private subscriptions = new Subscription();

  private onMarkerFound = (event: Event) => {
    if (!this.isLandscapeMode) {
      this.showFixedChoza = false;
      return;
    }

    const customEvent = event as CustomEvent<{ id: string }>;
    if (customEvent.detail?.id === this.activeMarkerId) {
      this.showFixedChoza = true;
      this.detectedExperienceId = this.activeExperienceId;
      return;
    }

    if (customEvent.detail?.id && customEvent.detail.id !== this.activeMarkerId) {
      this.showFixedChoza = false;
    }
  };

  private onMarkerLost = (event: Event) => {
    const customEvent = event as CustomEvent<{ id: string }>;
    if (customEvent.detail?.id === this.activeMarkerId) {
      // Keep the detected experience latched until the user selects a new one.
      return;
    }
  };

  private onEnterChozaRequest = () => {
    if (!this.showFixedChoza) {
      return;
    }
    this.startChozaZoomAndFade();
  };

  private onBackToHomeRequest = () => {
    this.returnToHome();
  };

  private onBackToScanRequest = () => {
    this.returnToScanner();
  };

  private onArResetRequest = () => {
    this.showFixedChoza = false;
    this.detectedExperienceId = '';
  };

  private onOrientationChange = () => {
    this.isLandscapeMode = window.innerWidth > window.innerHeight;
    if (!this.isLandscapeMode) {
      this.showFixedChoza = false;
      this.detectedExperienceId = '';
    }
  };

  constructor(public stateService: StateService) {}

  ngOnInit() {
    const activeExperience = this.stateService.getActiveExperience();
    this.activeExperienceId = activeExperience.id;
    this.activeMarkerId = `marker-${activeExperience.markerPreset}`;
    this.activeScanImage = activeExperience.scanImage;

    this.onOrientationChange();
    window.addEventListener('resize', this.onOrientationChange as EventListener);
    window.addEventListener('orientationchange', this.onOrientationChange as EventListener);

    window.addEventListener('ar-marker-found', this.onMarkerFound as EventListener);
    window.addEventListener('ar-marker-lost', this.onMarkerLost as EventListener);
    window.addEventListener('enter-choza-request', this.onEnterChozaRequest as EventListener);
    window.addEventListener('back-to-home-request', this.onBackToHomeRequest as EventListener);
    window.addEventListener('back-to-scan-request', this.onBackToScanRequest as EventListener);
    window.addEventListener('ar-reset-request', this.onArResetRequest as EventListener);

    this.subscriptions.add(
      this.stateService.activeExperienceId$.subscribe(experienceId => {
        this.activeExperienceId = experienceId;
        const activeExperience = this.stateService.getActiveExperience();
        this.activeMarkerId = `marker-${activeExperience.markerPreset}`;
        this.activeScanImage = activeExperience.scanImage;
        this.showFixedChoza = false;
        this.detectedExperienceId = '';
      })
    );

    this.subscriptions.add(
      this.stateService.arStarted$.subscribe(started => {
        if (started) {
          this.showFixedChoza = false;
          this.detectedExperienceId = '';
        }
      })
    );

    this.subscriptions.add(
      this.stateService.interiorActive$.subscribe(active => {
        this.isInteriorActive = active;
        if (active) {
          this.showFixedChoza = false;
          this.detectedExperienceId = '';
        }
      })
    );

    // Desvanecer la pantalla de carga después de 2 segundos para dar tiempo a que los recursos de A-Frame se inicialicen
    setTimeout(() => {
      // Hacemos una transición suave cambiando la opacidad antes de destruir el nodo del DOM con ngIf
      const element = document.getElementById('loading-screen');
      if (element) {
        element.style.opacity = '0';
      }
      setTimeout(() => {
        this.showLoadingScreen = false;
      }, 800); // Coincide con la duración de la transición CSS
    }, 2000);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();

    window.removeEventListener('resize', this.onOrientationChange as EventListener);
    window.removeEventListener('orientationchange', this.onOrientationChange as EventListener);

    window.removeEventListener('ar-marker-found', this.onMarkerFound as EventListener);
    window.removeEventListener('ar-marker-lost', this.onMarkerLost as EventListener);
    window.removeEventListener('enter-choza-request', this.onEnterChozaRequest as EventListener);
    window.removeEventListener('back-to-home-request', this.onBackToHomeRequest as EventListener);
    window.removeEventListener('back-to-scan-request', this.onBackToScanRequest as EventListener);
    window.removeEventListener('ar-reset-request', this.onArResetRequest as EventListener);
  }

  enterChozaFromOverlay() {
    if (!this.isLandscapeMode) {
      return;
    }
    this.startChozaZoomAndFade();
  }

  private startChozaZoomAndFade() {
    const chozaImage = document.querySelector('.fixed-choza-image') as HTMLElement | null;
    const enterBeforeFadeMs = 950;

    if (!chozaImage) {
      this.transitionToCabin();
      return;
    }

    chozaImage.classList.add('zoom-enter');
    setTimeout(() => {
      this.transitionToCabin();
    }, enterBeforeFadeMs);
  }

  private transitionToCabin() {
    const sceneEl = document.querySelector('a-scene') as HTMLElement | null;
    if (sceneEl) {
      sceneEl.style.display = 'none';
    }

    const videoEl = document.querySelector('video') as HTMLVideoElement | null;
    if (videoEl) {
      videoEl.style.display = 'none';
    }

    this.showFixedChoza = false;
    this.detectedExperienceId = '';
    this.stateService.setInteriorActive(true);
  }

  private returnToHome() {
    this.showFixedChoza = false;
    this.detectedExperienceId = '';
    this.stateService.setInteriorActive(false);
    this.stateService.setArStarted(false);
  }

  private returnToScanner() {
    this.showFixedChoza = false;
    this.detectedExperienceId = '';
    this.stateService.setInteriorActive(false);
    this.stateService.setMarkerVisible(false);
    this.stateService.setModelLoaded(false);
    this.stateService.setModelAnchored(false);

    // Remount scanner to reset AR.js tracking/camera state reliably.
    this.stateService.setArStarted(false);
    setTimeout(() => {
      this.stateService.setArStarted(true);
    }, 180);
  }

  get isFixedScanOverlayVisible(): boolean {
    return !this.isInteriorActive && this.isLandscapeMode && this.stateService.getActiveExperienceId() === this.detectedExperienceId && !!this.detectedExperienceId;
  }
}
