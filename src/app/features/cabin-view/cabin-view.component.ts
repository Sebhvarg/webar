import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { StateService } from '../../core/services/state.service';
import { Layer, LayerElement } from '../../core/models/experience.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cabin-view',
  templateUrl: './cabin-view.component.html',
  styleUrls: ['./cabin-view.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CabinViewComponent implements OnInit, OnDestroy {
  currentLayer!: Layer;
  activeElementId: string = '';
  showModal: boolean = false;
  selectedElement: LayerElement | null = null;
  
  private isDragging = false;
  private startTouchX = 0;
  private startTouchY = 0;
  private baseOffsetX = 0;
  private baseOffsetY = 0;
  private initialParallaxSaved = false;
  private initialGamma = 0;
  private initialBeta = 0;
  private subscriptions: Subscription = new Subscription();

  constructor(public stateService: StateService) {}

  ngOnInit() {
    this.currentLayer = this.stateService.getCurrentLayer();
    
    this.subscriptions.add(
      this.stateService.activeElementId$.subscribe(id => this.activeElementId = id)
    );

    this.subscriptions.add(
      this.stateService.interiorActive$.subscribe(active => {
        if (active) {
          this.initialParallaxSaved = false;
          this.requestOrientationPermission();
          this.setupTouchControls();
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    window.removeEventListener('deviceorientation', this.handleParallax);
  }

  async requestOrientationPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          window.addEventListener('deviceorientation', this.handleParallax.bind(this));
        }
      } catch (error) {
        console.warn("Could not request orientation permission:", error);
      }
    } else {
      window.addEventListener('deviceorientation', this.handleParallax.bind(this));
    }
  }

  handleParallax(event: DeviceOrientationEvent) {
    if (this.isDragging) return;

    let rawGamma = event.gamma;
    let rawBeta = event.beta;

    if (rawGamma === null || rawBeta === null) return;

    if (!this.initialParallaxSaved) {
      this.initialGamma = rawGamma;
      this.initialBeta = rawBeta;
      this.initialParallaxSaved = true;
      return;
    }

    let diffX = rawGamma - this.initialGamma;
    let diffY = rawBeta - this.initialBeta;

    const isLandscape = window.innerWidth > window.innerHeight;
    if (isLandscape) {
      diffX = rawBeta - this.initialBeta;
      diffY = rawGamma - this.initialGamma;
    }

    const maxOffsetX = 150;
    const maxOffsetY = 30;
    const targetX = -diffX * 4.5;
    const targetY = -diffY * 2.5;

    this.baseOffsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, targetX));
    this.baseOffsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, targetY));

    const interiorBg = document.getElementById('interior-bg');
    if (interiorBg) {
      interiorBg.style.transform = `translate(${this.baseOffsetX}px, ${this.baseOffsetY}px) scale(1.35)`;
    }
  }

  setupTouchControls() {
    const overlay = document.getElementById('interior-overlay');
    if (!overlay) return;

    overlay.addEventListener('touchstart', (e: TouchEvent) => {
      this.isDragging = true;
      this.startTouchX = e.touches[0].clientX;
      this.startTouchY = e.touches[0].clientY;
    }, { passive: true });

    overlay.addEventListener('touchmove', (e: TouchEvent) => {
      if (!this.isDragging) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - this.startTouchX;
      const deltaY = currentY - this.startTouchY;

      const maxOffsetX = 150;
      const maxOffsetY = 30;
      const targetX = this.baseOffsetX + deltaX * 1.5;
      const targetY = this.baseOffsetY + deltaY * 1.5;

      const clampedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, targetX));
      const clampedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, targetY));

      const interiorBg = document.getElementById('interior-bg');
      if (interiorBg) {
        interiorBg.style.transform = `translate(${clampedX}px, ${clampedY}px) scale(1.35)`;
      }
    }, { passive: true });

    overlay.addEventListener('touchend', () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      
      const interiorBg = document.getElementById('interior-bg');
      if (interiorBg) {
        const style = window.getComputedStyle(interiorBg);
        const matrix = new (window as any).WebKitCSSMatrix(style.transform);
        this.baseOffsetX = matrix.m41;
        this.baseOffsetY = matrix.m42;
      }
    });
  }

  openElement(element: LayerElement) {
    this.selectedElement = element;
    this.stateService.setActiveElementId(element.id);
    
    // Add micro delay for smooth UI transition
    setTimeout(() => {
      this.showModal = true;
    }, 100);
  }

  closeModal() {
    this.showModal = false;
    this.selectedElement = null;
  }
}
