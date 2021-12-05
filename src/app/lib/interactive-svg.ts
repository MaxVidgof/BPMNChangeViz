

// we create ourselves a little interactive wrapper for SVGs.
export class InteractiveSVG {
	svgContainer: HTMLElement;
	selectedElementForDrag: SVGElement | null;
	dragOffset: {x: number, y: number} = {x: 0, y: 0};

	constructor(svgContainer: HTMLElement) {
		this.svgContainer = svgContainer;
		this.selectedElementForDrag = null;

		this.svgContainer.addEventListener('pointerdown', (event: any) => {

			// start dragging if draggable
			if (event.target.classList.contains('draggable')) {
				this.selectedElementForDrag = event.target;
				let isCircle = this.selectedElementForDrag?.tagName === 'circle';
				this.dragOffset = this.getMousePosition(event);
				this.dragOffset.x -= parseFloat(this.selectedElementForDrag?.getAttributeNS(null, isCircle ? "cx" : "x") ?? "0");
				this.dragOffset.y -= parseFloat(this.selectedElementForDrag?.getAttributeNS(null, isCircle ? "cy" : "y") ?? "0");
			}
		});
		this.svgContainer.addEventListener('pointermove', (event: any) => {

			if (this.selectedElementForDrag) {
				let isCircle = this.selectedElementForDrag instanceof SVGCircleElement;
				event.preventDefault();
				let coord = this.getMousePosition(event);
				this.selectedElementForDrag.setAttributeNS(null, isCircle ? "cx" : "x", "" + (coord.x - this.dragOffset.x));
    			this.selectedElementForDrag.setAttributeNS(null, isCircle ? "cy" : "y", "" + (coord.y - this.dragOffset.y));
			}
		});
		this.svgContainer.addEventListener('pointerup', (event: any) => {
			this.selectedElementForDrag = null;
		});
		this.svgContainer.addEventListener('pointerleave', (event: any) => {

		});
	}

	private getMousePosition = (evt): {x: number, y: number} => {
		var CTM = (this.svgContainer as any).getScreenCTM();
		return {
			x: (evt.clientX - CTM.e) / CTM.a,
			y: (evt.clientY - CTM.f) / CTM.d
		};
	}
	

	public addCircle = (id: string, cx: number, cy: number, r: number, style: string): void => {
		let dragable = true;
		let newShape = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
		newShape.setAttributeNS(null, "id", id);
		newShape.setAttributeNS(null, "cx", ""+cx);
		newShape.setAttributeNS(null, "cy", ""+cy);
		newShape.setAttributeNS(null, "r", ""+r);
		newShape.setAttributeNS(null, "class", dragable ? "draggable": "");
		newShape.setAttributeNS(null, "style", style);
		this.svgContainer.appendChild(newShape);
	}

	public addPath = (id: string, waypoints: {x: number, y: number}[], close: boolean, style: string): void => {

		let pathAttribute = "M" + waypoints.map<string>(w => w.x + " " + w.y).join(" L") + (close ? " Z" : "");

		let dragable = true;
		let newShape = document.createElementNS("http://www.w3.org/2000/svg", 'path');
		newShape.setAttributeNS(null, "id", id);
		newShape.setAttributeNS(null, "d", pathAttribute);
		newShape.setAttributeNS(null, "class", dragable ? "draggable": "");
		newShape.setAttributeNS(null, "style", style);
		this.svgContainer.appendChild(newShape);
	}

	public addRectangle = (id: string, x: number, y: number, width: number, height: number, style: string): void => {
		let dragable = true;
		let newShape = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
		newShape.setAttributeNS(null, "id", id);
		newShape.setAttributeNS(null, "x", ""+x);
		newShape.setAttributeNS(null, "y", ""+y);
		newShape.setAttributeNS(null, "width", ""+width);
		newShape.setAttributeNS(null, "height", ""+height);
		newShape.setAttributeNS(null, "class", dragable ? "draggable": "");
		newShape.setAttributeNS(null, "style", style);
		this.svgContainer.appendChild(newShape);
	}
}