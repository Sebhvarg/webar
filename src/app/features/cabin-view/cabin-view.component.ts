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
  private dragStartOffsetX = 0;
  private dragStartOffsetY = 0;
  private panoramaOffsetX = 0;
  private panoramaOffsetY = 0;
  private lastYawDeg: number | null = null;
  private readonly pxPerYawDegree = 6;
  private touchControlsInitialized = false;
  private readonly boundParallaxHandler = this.handleParallax.bind(this);
  private subscriptions: Subscription = new Subscription();

  constructor(public stateService: StateService) {}

  ngOnInit() {
    this.currentLayer = this.stateService.getCurrentLayer();

    this.subscriptions.add(
      this.stateService.activeExperienceId$.subscribe(() => {
        this.currentLayer = this.stateService.getCurrentLayer();
        const firstElement = this.currentLayer.elements[0];
        if (firstElement) {
          this.stateService.setActiveElementId(firstElement.id);
        }
      })
    );
    
    this.subscriptions.add(
      this.stateService.activeElementId$.subscribe(id => this.activeElementId = id)
    );

    this.subscriptions.add(
      this.stateService.interiorActive$.subscribe(active => {
        if (active) {
          this.lastYawDeg = null;
          this.panoramaOffsetX = 0;
          this.panoramaOffsetY = 0;
          this.applyPanoramaPosition();
          this.requestOrientationPermission();
          this.setupTouchControls();
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    window.removeEventListener('deviceorientation', this.boundParallaxHandler);
  }

  async requestOrientationPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          window.addEventListener('deviceorientation', this.boundParallaxHandler);
        }
      } catch (error) {
        console.warn("Could not request orientation permission:", error);
      }
    } else {
      window.addEventListener('deviceorientation', this.boundParallaxHandler);
    }
  }

  handleParallax(event: DeviceOrientationEvent) {
    if (this.showModal) return;
    if (this.isDragging) return;

    const yaw = this.getYaw(event);
    if (yaw === null) return;

    if (this.lastYawDeg === null) {
      this.lastYawDeg = yaw;
      return;
    }

    let deltaYaw = yaw - this.lastYawDeg;
    if (deltaYaw > 180) {
      deltaYaw -= 360;
    } else if (deltaYaw < -180) {
      deltaYaw += 360;
    }
    this.lastYawDeg = yaw;

    this.panoramaOffsetX += deltaYaw * this.pxPerYawDegree;

    const beta = event.beta ?? 0;
    this.panoramaOffsetY = Math.max(-35, Math.min(35, (beta - 45) * -0.45));

    this.applyPanoramaPosition();
  }

  private getYaw(event: DeviceOrientationEvent): number | null {
    const anyEvent = event as any;

    if (typeof anyEvent.webkitCompassHeading === 'number') {
      return anyEvent.webkitCompassHeading;
    }

    if (typeof event.alpha === 'number') {
      return event.alpha;
    }

    return null;
  }

  private applyPanoramaPosition() {
    const interiorBg = document.getElementById('interior-bg');
    if (interiorBg) {
      interiorBg.style.backgroundPosition = `${this.panoramaOffsetX}px calc(50% + ${this.panoramaOffsetY}px)`;
    }
  }

  setupTouchControls() {
    if (this.touchControlsInitialized) return;

    const overlay = document.getElementById('interior-overlay');
    if (!overlay) return;

    this.touchControlsInitialized = true;

    overlay.addEventListener('touchstart', (e: TouchEvent) => {
      if (this.showModal) return;
      this.isDragging = true;
      this.startTouchX = e.touches[0].clientX;
      this.startTouchY = e.touches[0].clientY;
      this.dragStartOffsetX = this.panoramaOffsetX;
      this.dragStartOffsetY = this.panoramaOffsetY;
    }, { passive: true });

    overlay.addEventListener('touchmove', (e: TouchEvent) => {
      if (this.showModal) return;
      if (!this.isDragging) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - this.startTouchX;
      const deltaY = currentY - this.startTouchY;

      const dragX = this.dragStartOffsetX + deltaX * 1.2;
      const dragY = Math.max(-35, Math.min(35, this.dragStartOffsetY + deltaY * 0.25));
      const interiorBg = document.getElementById('interior-bg');
      if (interiorBg) {
        interiorBg.style.backgroundPosition = `${dragX}px calc(50% + ${dragY}px)`;
      }
    }, { passive: true });

    overlay.addEventListener('touchend', (e: TouchEvent) => {
      if (this.showModal) return;
      if (!this.isDragging) return;
      this.isDragging = false;

      const touch = e.changedTouches?.[0];
      if (!touch) return;

      const deltaX = touch.clientX - this.startTouchX;
      const deltaY = touch.clientY - this.startTouchY;
      this.panoramaOffsetX = this.dragStartOffsetX + deltaX * 1.2;
      this.panoramaOffsetY = Math.max(-35, Math.min(35, this.dragStartOffsetY + deltaY * 0.25));
      this.applyPanoramaPosition();
    }, { passive: true });
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

  backToScan() {
    this.showModal = false;
    this.selectedElement = null;
    window.dispatchEvent(new CustomEvent('back-to-scan-request'));
  }
}
