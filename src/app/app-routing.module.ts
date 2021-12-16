import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChangeVisComponent } from './change-vis/change-vis.component';
import { HomeComponent } from './home/home.component';

const routes: Routes = [
	{path: '', redirectTo: 'home', pathMatch: 'full'},
	{path: 'home', component: HomeComponent},
	{path: 'change-vis', component: ChangeVisComponent}
];

@NgModule({
	imports: [RouterModule.forRoot(routes, {scrollPositionRestoration: 'enabled'})],
	exports: [RouterModule]
})
export class AppRoutingModule { }
