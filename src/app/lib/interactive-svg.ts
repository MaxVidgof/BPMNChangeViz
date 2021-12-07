

// we create ourselves a little interactive wrapper for SVGs.
export class InteractiveSVG {
	svgContainer: HTMLElement;
	pointerDown: boolean;
	selectedElementForDrag: SVGElement | null;
	dragOffset: {x: number, y: number} = {x: 0, y: 0};

	public readonly MARKER_URL_ARROW_HEAD_END = 'sequenceflow-end-white-black-doq2fvopnj4c3h1erjbstx8an';

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
				
				if (event.target.classList.contains('drag-handle-parent')) {
					this.selectedElementForDrag = event.target.parentElement;
				} else {
					this.selectedElementForDrag = event.target;
				}

				this.dragOffset = this.getMousePosition(event);
				let matrixRaw = this.selectedElementForDrag?.getAttributeNS(null, "transform");
				if (matrixRaw) {
					let matrixArr = matrixRaw.replace("matrix(", "").replace(")", "").split(" ");
					this.dragOffset.x -= parseFloat(matrixArr[4]);
					this.dragOffset.y -= parseFloat(matrixArr[5]);
				} else {
					let isCircle = this.selectedElementForDrag?.tagName === 'circle';
					this.dragOffset.x -= parseFloat(this.selectedElementForDrag?.getAttributeNS(null, isCircle ? "cx" : "x") ?? "0");
					this.dragOffset.y -= parseFloat(this.selectedElementForDrag?.getAttributeNS(null, isCircle ? "cy" : "y") ?? "0");
				}
				

			}
		});
		this.svgContainer.addEventListener('pointermove', (event: any) => {

			let coord = this.getMousePosition(event);
			if (this.selectedElementForDrag) {
				event.preventDefault();
				let matrixRaw = this.selectedElementForDrag.getAttributeNS(null, "transform");
				if (matrixRaw) {
					let matrixArr = matrixRaw.replace("matrix(", "").replace(")", "").split(" ");
					matrixArr[4] = "" +  (coord.x - this.dragOffset.x);
					matrixArr[5] = "" +  (coord.y - this.dragOffset.y);
					this.selectedElementForDrag.setAttributeNS(null, "transform", "matrix(" + matrixArr.join(" ") + ")");
				} else {
					let isCircle = this.selectedElementForDrag instanceof SVGCircleElement;
					this.selectedElementForDrag.setAttributeNS(null, isCircle ? "cx" : "x", "" + (coord.x - this.dragOffset.x));
					this.selectedElementForDrag.setAttributeNS(null, isCircle ? "cy" : "y", "" + (coord.y - this.dragOffset.y));
				}
				
			} else {
				event.preventDefault();
				// if we didnt hit an element but still dragging, pan the whole svg
				if (this.pointerDown) {
					this.panTransformElement(this.matrixGroup, event.movementX, event.movementY);
				} else {
					// if we just hover over elements, we could show an outline for draggable elements.
					if (event.target) {
						if (event.target.classList.contains('draggable')) {
							//event.target.style.border = '1px dashed lightblue';
						}
					}

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

		// we add one global matrix group for transformation matrix (panning / zooming)
		let newGroup = this.createSVGGroup("matrix-group", true);
		this.svgContainer.appendChild(newGroup);
		this.matrixGroup = newGroup;

		// create arrowhead marker
		let defs = document.createElementNS("http://www.w3.org/2000/svg", 'defs');
			let marker = document.createElementNS("http://www.w3.org/2000/svg", 'marker');
			marker.setAttributeNS(null, "id", this.MARKER_URL_ARROW_HEAD_END);
			marker.setAttributeNS(null, "viewBox", "0 0 20 20");
			marker.setAttributeNS(null, "refX", "11");
			marker.setAttributeNS(null, "refY", "10");
			marker.setAttributeNS(null, "markerWidth", "10");
			marker.setAttributeNS(null, "markerHeight", "10");
			marker.setAttributeNS(null, "orient", "auto");
				let path = document.createElementNS("http://www.w3.org/2000/svg", 'path');
				path.setAttributeNS(null, "d", "M 1 5 L 11 10 L 1 15 Z");
				path.setAttributeNS(null, "style", "fill: black; stroke-width: 1px; stroke-linecap: round; stroke-dasharray: 10000, 1; stroke: black;");
				marker.appendChild(path);
			defs.appendChild(marker);
		this.svgContainer.appendChild(defs);
		
	}

	public panTransformElement = (element: SVGElement | SVGPathElement, dx: number, dy: number): void => {
		let matrixRaw = element.getAttributeNS(null, "transform");
		let matrix = matrixRaw?.replace("matrix(", "").replace(")", "").split(" ");
		if (matrix) {
			matrix[4] = "" + (parseInt(matrix[4]) + dx);
			matrix[5] = "" + (parseInt(matrix[5]) + dy);
			element.setAttributeNS(null, "transform", "matrix(" +  matrix.join(' ') + ")");
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

	public addSVGElement(element: SVGElement): void {
		this.matrixGroup.appendChild(element);
	}
	
	public createSVGGroup(id: string, setIdentityTransform: boolean, ...elements: SVGElement[] | SVGPathElement[]): SVGElement {
		let newGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g');
		this.setStandardAttributes(newGroup, id, false, false, null);
		if (setIdentityTransform != null) {
			newGroup.setAttributeNS(null, "transform", "matrix(1 0 0 1 0 0)");
		}
		for (const el of elements) {
			newGroup.appendChild(el);
		}

		return newGroup;
	}

	public createCircle = (id: string, draggable: boolean, dragHandleForParent: boolean, cx: number, cy: number, r: number, style: string): SVGCircleElement => {
		let newShape = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
		newShape.setAttributeNS(null, "cx", ""+cx);
		newShape.setAttributeNS(null, "cy", ""+cy);
		newShape.setAttributeNS(null, "r", ""+r);
		this.setStandardAttributes(newShape, id, draggable, dragHandleForParent, style);
		return newShape;
	}

	public createPathByWaypoints = (id: string, draggable: boolean, dragHandleForParent: boolean, waypoints: {x: number, y: number}[], close: boolean, style: string): SVGPathElement => {
		let pathAttribute = "M" + waypoints.map<string>(w => w.x + " " + w.y).join(" L") + (close ? " Z" : "");
		return this.createPathByString(id, draggable, dragHandleForParent, pathAttribute, style);
	};
	public createPathByString = (id: string, draggable: boolean, dragHandleForParent: boolean, path: string, style: string): SVGPathElement => {
		let newShape = document.createElementNS("http://www.w3.org/2000/svg", 'path');
		newShape.setAttributeNS(null, "d", path);
		this.setStandardAttributes(newShape, id, draggable, dragHandleForParent, style);
		return newShape;
	}

	public createRectangle = (id: string, draggable: boolean, dragHandleForParent: boolean, x: number, y: number, width: number, height: number, style: string): SVGRectElement => {
		let newShape = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
		newShape.setAttributeNS(null, "x", ""+x);
		newShape.setAttributeNS(null, "y", ""+y);
		newShape.setAttributeNS(null, "rx", ""+10);
		newShape.setAttributeNS(null, "ry", ""+10);
		newShape.setAttributeNS(null, "width", ""+width);
		newShape.setAttributeNS(null, "height", ""+height);
		this.setStandardAttributes(newShape, id, draggable, dragHandleForParent, style);
		return newShape;
	}

	public createTextlines = (idForAll: string, draggableAll: boolean, dragHandleAll: boolean, xAll: number, yAll: number, textlines: string[], styleAll: string): SVGTextElement[] => {
		let elements: SVGTextElement[] = [];
		for (let i=0; i<textlines.length; i++) {
			elements.push(this.createText(idForAll, draggableAll, dragHandleAll, xAll, yAll, textlines[i], i, textlines.length, styleAll));
		}
		return elements;
	}
	public createText = (id: string, draggable: boolean, dragHandleForParent: boolean, x: number, y: number, textline: string, lineindex: number, numTotalLines: number, style: string): SVGTextElement => {
		let newShape = document.createElementNS("http://www.w3.org/2000/svg", 'text');
		newShape.setAttributeNS(null, "x", ""+x);
		newShape.setAttributeNS(null, "y", ""+y);
		newShape.setAttributeNS(null, "dy", "" + (15 * ( (-(numTotalLines-1)/2) + lineindex)));
		newShape.setAttributeNS(null, "dominant-baseline", "middle");
		newShape.setAttributeNS(null, "text-anchor", "middle");
		let textNode = document.createTextNode(textline);
		newShape.appendChild(textNode);
		this.setStandardAttributes(newShape, id, draggable, dragHandleForParent, style);
		return newShape;
	}

	public createRotSquare = (id: string, draggable: boolean, dragHandleForParent: boolean, x: number, y: number, s: number, style: string): SVGPathElement => {
		let polyPathRelative = [{x: x + s, y: y + 0}, {x: x+s+s, y: y+s}, {x: x+s, y: y+s+s}, {x: x+0, y: y+s}]

		let polyPath = polyPathRelative.map(p => p.x + ',' + p.y).join(' '); '25,0 50,25 25,50 0,25';
		let newShape = document.createElementNS("http://www.w3.org/2000/svg", 'polygon');
		newShape.setAttributeNS(null, "points", polyPath);
		this.setStandardAttributes(newShape, id, draggable, dragHandleForParent , style);
		return newShape;
	}

	private setStandardAttributes(element: SVGElement | SVGPathElement, id: string, draggable: boolean, dragHandleForParent: boolean, style: string | null): void {
		element.setAttributeNS(null, "id", id);
		let className = '';
		className += dragHandleForParent ? " drag-handle-parent": "";
		className += draggable ? " draggable": "";
		if (element.tagName === 'path') {
			className += " path";
		}
		element.setAttributeNS(null, "class", className);
		if (!draggable) {
			element.setAttributeNS(null, "pointer-events", 'none');	
		} else {
			element.setAttributeNS(null, "pointer-events", 'all');	
		}
		if (style != null) {
			element.setAttributeNS(null, "style", style);
		}
	}
}