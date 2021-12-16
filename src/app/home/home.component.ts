import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
	selector: 'app-home',
	templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {

	constructor(private router: Router) { }

	ngOnInit(): void {
	}

	public navigateToChangeVisComponent() {
		this.router.navigate(['/change-vis']);
	}
}
