import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { StateService } from '../../core/services/state.service';
import { TPipe } from '../../core/pipes/t.pipe';

@Component({
  selector: 'app-information-page',
  templateUrl: './information.component.html',
  styleUrls: ['./information.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TPipe]
})
export class InformationComponent {
  constructor(private stateService: StateService) {}

  toggleSidebar() {
    this.stateService.setSidebarOpen(true);
  }
}
