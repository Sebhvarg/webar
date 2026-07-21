import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { StateService } from '../../core/services/state.service';
import { TPipe } from '../../core/pipes/t.pipe';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TPipe]
})
export class SidebarComponent implements OnInit {
  activeTab: string = 'inicio';
  isOpen: boolean = false;

  constructor(private stateService: StateService) {}

  ngOnInit() {
    // Listen to active tab state
    this.stateService.activeTab$.subscribe(tab => {
      this.activeTab = tab;
    });

    // Listen to sidebar open/close state
    this.stateService.sidebarOpen$.subscribe(open => {
      this.isOpen = open;
    });
  }

  selectTab(tab: string) {
    this.stateService.setActiveTab(tab);

    if (tab === 'ar') {
      this.stateService.setArStarted(true);
    } else if (tab === 'informacion') {
      this.stateService.setArStarted(false);
      this.stateService.setInteriorActive(false);
    } else if (tab === 'inicio') {
      this.stateService.setArStarted(false);
      this.stateService.setInteriorActive(false);
    }

    this.closeSidebar();
  }

  closeSidebar() {
    this.stateService.setSidebarOpen(false);
  }

  exitApp() {
    // Reset app state and close sidebar
    this.stateService.setArStarted(false);
    this.stateService.setInteriorActive(false);
    this.stateService.setActiveTab('inicio');
    this.closeSidebar();
  }
}
