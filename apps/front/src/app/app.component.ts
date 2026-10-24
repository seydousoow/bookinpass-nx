import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NxWelcomeComponent } from './nx-welcome.component';
import { Button, DatePicker, Spinner } from 'components';

@Component({
  imports: [NxWelcomeComponent, RouterModule, Button, Spinner, DatePicker],
  selector: 'bip-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  protected title = 'front';
}
