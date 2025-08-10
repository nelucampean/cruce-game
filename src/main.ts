import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(A11yModule)
    // Add other providers here as needed
  ]
}).catch(err => console.error(err));