import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ArViewComponent } from './features/ar-view/ar-view.component';
import { CabinViewComponent } from './features/cabin-view/cabin-view.component';
import { HomeComponent } from './pages/home/home.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { StateService } from './core/services/state.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ArViewComponent, CabinViewComponent, HomeComponent, SidebarComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppComponent implements OnInit {
  showLoadingScreen = true;

  constructor(public stateService: StateService) {}

  ngOnInit() {
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
}
