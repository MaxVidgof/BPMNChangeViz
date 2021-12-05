

// we create ourselves a little interactive wrapper for SVGs.
export class InteractiveSVG {
	svgContainer: HTMLElement;
	pointerDown: boolean;
	selectedElementForDrag: SVGElement | null;
	dragOffset: {x: number, y: number} = {x: 0, y: 0};

	// for panning and zooming. Starts with the identity matrix.
	// https://www.petercollingridge.co.uk/tutorials/svg/interactive/pan-and-zoom/
	matrixGroup: SVGElement;
	currentScale: number;

	constructor(svgContainer: HTMLElement) {
		this.svgContainer = svgContainer;
		this.pointerDown = false;
		this.currentScale = 1;
		this.selectedElementForDrag = null;

		this.svgContainer.addEventListener('pointerdown', (event: any) => {

			// start dragging if draggable
			this.pointerDown = true;
			if (event.target.classList.contains('draggable')) {
				this.selectedElementForDrag = event.target;
				let isCircle = this.selectedElementForDrag?.tagName === 'circle';
				this.dragOffset = this.getMousePosition(event);
				this.dragOffset.x -= parseFloat(this.selectedElementForDrag?.getAttributeNS(null, isCircle ? "cx" : "x") ?? "0");
				this.dragOffset.y -= parseFloat(this.selectedElementForDrag?.getAttributeNS(null, isCircle ? "cy" : "y") ?? "0");
			}
		});
		this.svgContainer.addEventListener('pointermove', (event: any) => {

			let coord = this.getMousePosition(event);
			if (this.selectedElementForDrag) {
				let isCircle = this.selectedElementForDrag instanceof SVGCircleElement;
				event.preventDefault();
				this.selectedElementForDrag.setAttributeNS(null, isCircle ? "cx" : "x", "" + (coord.x - this.dragOffset.x));
    			this.selectedElementForDrag.setAttributeNS(null, isCircle ? "cy" : "y", "" + (coord.y - this.dragOffset.y));
			} else {
				event.preventDefault();
				// if we didnt hit an element but still dragging, pan the whole svg
				if (this.pointerDown) {
					this.pan(event.movementX, event.movementY);
				}
			}
		});
		this.svgContainer.addEventListener('pointerup', (event: any) => {
			this.selectedElementForDrag = null;
			this.pointerDown = false;
		});
		this.svgContainer.addEventListener('pointerleave', (event: any) => {

		});
		this.svgContainer.addEventListener('wheel', (event: any) => {
			event.preventDefault();
			let scale = 1.0 + 0.1 * Math.sign(event.wheelDelta);
			this.currentScale *= scale;
			this.zoom(1.0 + 0.1 * Math.sign(event.wheelDelta));
		});

		// we add a g group for transformation matrix (panning / zooming)
		let newGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g');
		newGroup.setAttributeNS(null, "id", "matrix-group");
		newGroup.setAttributeNS(null, "transform", "matrix(1 0 0 1 0 0)");
		this.svgContainer.appendChild(newGroup);
		this.matrixGroup = newGroup;
	}

	private pan = (dx: number, dy: number): void => { 	
		let matrixRaw = this.matrixGroup.getAttributeNS(null, "transform");
		let matrix = matrixRaw?.replace("matrix(", "").replace(")", "").split(" ");
		if (matrix) {
			matrix[4] = "" + (parseInt(matrix[4]) + dx);
			matrix[5] = "" + (parseInt(matrix[5]) + dy);
			this.matrixGroup.setAttributeNS(null, "transform", "matrix(" +  matrix.join(' ') + ")");
		}
	}

	private zoom = (scale: number): void => {
		// TODO: at best give svg a viewbox that fits the whole process. and then get center from viewbox.
		let centerX = 400;//parseFloat(this.svgContainer.getAttributeNS(null, "width") ?? "1") / 2;
		let centerY = 300;//parseFloat(this.svgContainer.getAttributeNS(null, "height") ?? "1") / 2;
		let matrixRaw = this.matrixGroup.getAttributeNS(null, "transform");
		let matrix = matrixRaw?.replace("matrix(", "").replace(")", "").split(" ");
		if (matrix) {
			for (var i = 0; i < 4; i++) {
				matrix[i] = "" + (parseFloat(matrix[i]) * scale);
			}
			
			matrix[4] = "" + (parseFloat(matrix[4]) + (1 - scale) * centerX);
			matrix[5] = "" + (parseFloat(matrix[5]) + (1 - scale) * centerY);
			this.matrixGroup.setAttributeNS(null, "transform", "matrix(" +  matrix.join(' ') + ")");
		}
	}

	private getMousePosition = (evt): {x: number, y: number} => {
		var CTM = (this.matrixGroup as any).getScreenCTM();
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
		this.matrixGroup.appendChild(newShape);
	}

	public addPath = (id: string, waypoints: {x: number, y: number}[], close: boolean, style: string): void => {

		let pathAttribute = "M" + waypoints.map<string>(w => w.x + " " + w.y).join(" L") + (close ? " Z" : "");

		let dragable = true;
		let newShape = document.createElementNS("http://www.w3.org/2000/svg", 'path');
		newShape.setAttributeNS(null, "id", id);
		newShape.setAttributeNS(null, "d", pathAttribute);
		newShape.setAttributeNS(null, "class", dragable ? "draggable": "");
		newShape.setAttributeNS(null, "style", style);
		this.matrixGroup.appendChild(newShape);
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
		this.matrixGroup.appendChild(newShape);
	}
}