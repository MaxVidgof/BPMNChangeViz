import { Component } from '@angular/core';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
})
export class AppComponent {
	title = 'process-change-visualizer';

	public fifo: number = 5;

	constructor() { }

	public doStuff = (): void => {
		let bla = 'hey';
	};
}
