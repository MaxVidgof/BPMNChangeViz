import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChangeVisComponent } from './change-vis/change-vis.component';

const routes: Routes = [
	{path: '', component: ChangeVisComponent}
];

@NgModule({
	imports: [RouterModule.forRoot(routes)],
	exports: [RouterModule]
})
export class AppRoutingModule { }
