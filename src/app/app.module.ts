import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import {HttpClientModule} from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ChangeVisComponent } from './change-vis/change-vis.component';
import { HomeComponent } from './home/home.component';

@NgModule({
	declarations: [
		AppComponent,
  		ChangeVisComponent,
    	HomeComponent
	],
	imports: [
		BrowserModule,
		AppRoutingModule,
		HttpClientModule
	],
	providers: [],
	bootstrap: [AppComponent],
})
export class AppModule { }
