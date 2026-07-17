import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { StateService } from '../../core/services/state.service';

@Component({
  selector: 'app-home-page',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class HomeComponent implements OnInit {
  galleryItems = [
    {
      image: 'assets/img/choza.webp',
      title: 'Choza Ceremonial'
    },
    {
      image: 'assets/img/interiorchoza.webp',
      title: 'Interior Choza'
    }
  ];

  activeSlideIndex = 0;

  constructor(private stateService: StateService) {}

  ngOnInit() {}

  toggleSidebar() {
    this.stateService.setSidebarOpen(true);
  }

  iniciarWebAR() {
    this.stateService.setArStarted(true);
  }

  nextSlide() {
    this.activeSlideIndex = (this.activeSlideIndex + 1) % this.galleryItems.length;
  }

  prevSlide() {
    this.activeSlideIndex = (this.activeSlideIndex - 1 + this.galleryItems.length) % this.galleryItems.length;
  }

  setSlide(index: number) {
    this.activeSlideIndex = index;
  }
}
