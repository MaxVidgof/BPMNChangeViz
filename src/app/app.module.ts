import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ChangeVisComponent } from './change-vis/change-vis.component';

@NgModule({
	declarations: [
		AppComponent,
  ChangeVisComponent
	],
	imports: [
		BrowserModule,
		AppRoutingModule
	],
	providers: [],
	bootstrap: [AppComponent],
})
export class AppModule { }
