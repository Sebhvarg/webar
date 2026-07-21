import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { StateService } from '../../core/services/state.service';
import { TPipe } from '../../core/pipes/t.pipe';
import { I18nService } from '../../core/services/i18n.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home-page',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TPipe]
})
export class HomeComponent implements OnInit {
  currentLanguage: string = 'es';
  private subscriptions = new Subscription();

  constructor(private stateService: StateService, private i18n: I18nService) {}

  ngOnInit() {
    this.currentLanguage = this.i18n.getCurrentLanguage();
    this.subscriptions.add(
      this.i18n.language$.subscribe(language => {
        this.currentLanguage = language;
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  toggleSidebar() {
    this.stateService.setSidebarOpen(true);
  }

  iniciarWebAR() {
    this.stateService.setArStarted(true);
  }

  changeLanguage(language: string) {
    this.i18n.setLanguage(language);
  }
}
