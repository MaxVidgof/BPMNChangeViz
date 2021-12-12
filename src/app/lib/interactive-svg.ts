
export class ColoredMarker {

	id: string;
	name: string;
	style: string;
	path: string;
	refX: string;
	refY: string;

	constructor(id: string, name: string, refX: string, refY: string, style: string, path: string) {
		this.id = id;
		this.name = name;
		this.style = style;
		this.path = path;
		this.refX=refX;
		this.refY=refY;
	}
}

export class SVGUIButton {
	id: string;
	name: string;
	style: string;
	iconPath: string;
	onHover: () => void;
	onPress: () => void;
	onRelease: () => void

	constructor(id: string, name: string, style: string, onHover: () => void, onPress: () => void, onRelease: () => void) {
		this.id = id;
		this.name = name;
		this.style = style;
		this.onHover = onHover;
		this.onPress = onPress;
		this.onRelease = onRelease;
		this.iconPath = '';
	}
}


// we create ourselves a little interactive wrapper for SVGs.
export class InteractiveSVG {
	svgContainer: HTMLElement;
	pointerDown: boolean;
	selectedElementForDrag: SVGElement | null;
	dragOffset: {x: number, y: number} = {x: 0, y: 0};

	coloredMarkers: ColoredMarker[] = [];
	
	// for panning and zooming. Starts with the identity matrix.
	// https://www.petercollingridge.co.uk/tutorials/svg/interactive/pan-and-zoom/
	matrixGroup: SVGElement;
	currentScale: number;
	
	constructor(svgContainer: HTMLElement, markers: ColoredMarker[], uiButtons: SVGUIButton[]) {
		this.svgContainer = svgContainer;
		this.pointerDown = false;
		this.currentScale = 1;
		this.selectedElementForDrag = null;
		this.coloredMarkers = markers;

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
					this.applySVGMatrixTransformations(this.matrixGroup, event.movementX, event.movementY, 0, 1.0);
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
			this.zoom(1.0 + 0.1 * Math.sign(event.wheelDelta));
		});

		// we add one global matrix group for transformation matrix (panning / zooming)
		let newGroup = this.createSVGGroup("matrix-group", true);
		this.svgContainer.appendChild(newGroup);
		this.matrixGroup = newGroup;



		// create arrowhead marker
		let defs = document.createElementNS("http://www.w3.org/2000/svg", 'defs');
		for (const m of this.coloredMarkers) {
			let marker = document.createElementNS("http://www.w3.org/2000/svg", 'marker');
			marker.setAttributeNS(null, "id", m.id);
			marker.setAttributeNS(null, "viewBox", "0 0 20 20");
			marker.setAttributeNS(null, "refX", m.refX);
			marker.setAttributeNS(null, "refY", m.refY);
			marker.setAttributeNS(null, "markerWidth", "30");
			marker.setAttributeNS(null, "markerHeight", "30");
			marker.setAttributeNS(null, "orient", "auto");
			marker.setAttributeNS(null, "markerUnits", "userSpaceOnUse");

				let child = document.createElementNS("http://www.w3.org/2000/svg", 'path');
				if (m.path === 'circle') {
					child = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
					child.setAttributeNS(null, "cx", "6");
					child.setAttributeNS(null, "cy", "6");
					child.setAttributeNS(null, "r", "3.5");
					child.setAttributeNS(null, "style", m.style);
				} else {
					child = document.createElementNS("http://www.w3.org/2000/svg", 'path');
					child.setAttributeNS(null, "d", m.path);
					child.setAttributeNS(null, "style", m.style);
				}
				marker.appendChild(child);
			defs.appendChild(marker);
		}
		this.svgContainer.appendChild(defs);
		
		// create UI buttons
		let buttonGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g');
		for (const b of uiButtons) {
			let button = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
			button.setAttributeNS(null, "id", b.id);
			button.setAttributeNS(null, "name", b.name);
			button.setAttributeNS(null, "x", "20");
			button.setAttributeNS(null, "y", "1");
			button.setAttributeNS(null, "width", "52");
			button.setAttributeNS(null, "height", "22");
			button.setAttributeNS(null, "rx", "5");
			button.setAttributeNS(null, "ry", "5");
			button.setAttributeNS(null, "style", b.style);
			button.setAttributeNS(null, "onpointerdown", "b.onPress()");
			button.setAttributeNS(null, "onmpointerup", "b.onRelease()");
			button.setAttributeNS(null, "onpointerhover", "b.onHover()");
			buttonGroup.appendChild(button);
		}
		this.svgContainer.appendChild(buttonGroup);



	}

	public applySVGMatrixTransformations(element: SVGElement | SVGPathElement, translateX, translateY, rotateAngle, scaleFactor): void {
		let matrixRaw = element.getAttributeNS(null, "transform");
		let matrix = matrixRaw?.replace("matrix(", "").replace(")", "").split(" ").map(str => parseFloat(str));
		let m = new DOMMatrix(matrix);
		m.scaleSelf(scaleFactor);
		m.rotateAxisAngleSelf(0, 0, 1, rotateAngle);
		m.translateSelf(translateX, translateY);
		element.setAttributeNS(null, "transform", m.toString());
	}

	private zoom = (scale: number): void => {
		// TODO: at best give svg a viewbox that fits the whole process. and then get center from viewbox.
		let graphicsBox = (this.matrixGroup as SVGGraphicsElement).getBBox();
		let domRenderedBox = this.matrixGroup.getBoundingClientRect();
		let centerX = domRenderedBox.width / 2;
		let centerY = domRenderedBox.height / 2;

		let modifiedScale = this.currentScale * scale;
		if (modifiedScale >= 2.0) {
			scale = 1.0;
		} else if(modifiedScale <= 0.2) {
			scale = 1.0;
		}
		this.currentScale *= scale;

		this.applySVGMatrixTransformations(this.matrixGroup, (1 - scale) * centerX, (1 - scale) * centerY, 0, scale);

		/*
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
		*/
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
	
	public createSVGGroup(id: string, setIdentityTransform: boolean, ...elements: (SVGElement | SVGPathElement)[]): SVGElement {
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

	public createCircle = (id: string, draggable: boolean, dragHandleForParent: boolean, cx: number, cy: number, r: number, style: string, classNames: string): SVGCircleElement => {
		let newShape = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
		newShape.setAttributeNS(null, "cx", ""+cx);
		newShape.setAttributeNS(null, "cy", ""+cy);
		newShape.setAttributeNS(null, "r", ""+r);
		this.setStandardAttributes(newShape, id, draggable, dragHandleForParent, style, classNames);
		return newShape;
	}

	public createPathByWaypoints = (id: string, draggable: boolean, dragHandleForParent: boolean, waypoints: {x: number, y: number}[], close: boolean, style: string, classNames: string): SVGPathElement => {
		let pathAttribute = "M" + waypoints.map<string>(w => w.x + " " + w.y).join(" L") + (close ? " Z" : "");
		return this.createPathByString(id, draggable, dragHandleForParent, pathAttribute, style, classNames);
	};
	public createPathByString = (id: string, draggable: boolean, dragHandleForParent: boolean, path: string, style: string, classNames: string): SVGPathElement => {
		let newShape = document.createElementNS("http://www.w3.org/2000/svg", 'path');
		newShape.setAttributeNS(null, "d", path);
		this.setStandardAttributes(newShape, id, draggable, dragHandleForParent, style, classNames);
		return newShape;
	}

	public createRectangle = (id: string, draggable: boolean, dragHandleForParent: boolean, x: number, y: number, width: number, height: number, style: string, classNames: string): SVGRectElement => {
		let newShape = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
		newShape.setAttributeNS(null, "x", ""+x);
		newShape.setAttributeNS(null, "y", ""+y);
		newShape.setAttributeNS(null, "rx", ""+10);
		newShape.setAttributeNS(null, "ry", ""+10);
		newShape.setAttributeNS(null, "width", ""+width);
		newShape.setAttributeNS(null, "height", ""+height);
		this.setStandardAttributes(newShape, id, draggable, dragHandleForParent, style, classNames);
		return newShape;
	}

	public createGroupOfTextlines = (id: string, draggableAll: boolean, dragHandleAll: boolean, xAll: number, yAll: number, textlines: string[], styleAll: string, rotationAngleForAll: number, classNames: string): SVGElement => {
		let group = this.createSVGGroup(id, true,
			...this.createTextlines('', draggableAll, dragHandleAll, 0, 0, textlines, styleAll, classNames)
		);

		// rotate
		let matrixRaw = group.getAttributeNS(null, "transform");
		let matrix = matrixRaw?.replace("matrix(", "").replace(")", "").split(" ").map(str => parseFloat(str));
		let m = new DOMMatrix(matrix);
		m.translateSelf(xAll, yAll);
		m.rotateAxisAngleSelf(0 ,0, 1, rotationAngleForAll);
		group.setAttributeNS(null, "transform", m.toString());

		return group;
	}
	public createTextlines = (idForAll: string, draggableAll: boolean, dragHandleAll: boolean, xAll: number, yAll: number, textlines: string[], styleAll: string, classNames: string): SVGTextElement[] => {
		let elements: SVGTextElement[] = [];
		for (let i=0; i<textlines.length; i++) {
			elements.push(this.createText(idForAll, draggableAll, dragHandleAll, xAll, yAll, textlines[i], i, textlines.length, styleAll, classNames));
		}
		return elements;
	}
	public createText = (id: string, draggable: boolean, dragHandleForParent: boolean, x: number, y: number, textline: string, lineindex: number, numTotalLines: number, style: string, classNames: string): SVGTextElement => {
		let newShape = document.createElementNS("http://www.w3.org/2000/svg", 'text');
		newShape.setAttributeNS(null, "x", ""+x);
		newShape.setAttributeNS(null, "y", ""+y);
		newShape.setAttributeNS(null, "dy", "" + (15 * ( (-(numTotalLines-1)/2) + lineindex)));
		newShape.setAttributeNS(null, "dominant-baseline", "middle");
		newShape.setAttributeNS(null, "text-anchor", "middle");
		let textNode = document.createTextNode(textline);
		newShape.appendChild(textNode);
		this.setStandardAttributes(newShape, id, draggable, dragHandleForParent, style, classNames);
		return newShape;
	}

	public createRotSquare = (id: string, draggable: boolean, dragHandleForParent: boolean, x: number, y: number, s: number, style: string, classNames: string): SVGPathElement => {
		let polyPathRelative = [{x: x + s, y: y + 0}, {x: x+s+s, y: y+s}, {x: x+s, y: y+s+s}, {x: x+0, y: y+s}]

		let polyPath = polyPathRelative.map(p => p.x + ',' + p.y).join(' '); '25,0 50,25 25,50 0,25';
		let newShape = document.createElementNS("http://www.w3.org/2000/svg", 'polygon');
		newShape.setAttributeNS(null, "points", polyPath);
		this.setStandardAttributes(newShape, id, draggable, dragHandleForParent , style, classNames);
		return newShape;
	}

	private setStandardAttributes(element: SVGElement | SVGPathElement, id: string, draggable: boolean, dragHandleForParent: boolean, style: string | null, classNames = ""): void {
		element.setAttributeNS(null, "id", id);
		let className = classNames;
		className += dragHandleForParent && className.indexOf("drag-handle-parent")<0 ? " drag-handle-parent": "";
		className += draggable && className.indexOf("draggable")<0 ? " draggable": "";
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


export class SVGTransformMatrix {

	a: number;
	b: number;
	c: number;
	d: number;
	e: number;
	f: number;


	constructor(...arr: number[]) {
		this.a = arr[0];
		this.b = arr[1];
		this.c = arr[2];
		this.d = arr[3];
		this.e = arr[4];
		this.d = arr[5];
		this.f = arr[6];
	}

	public createFromTransformString(matrixRaw: string): SVGTransformMatrix {
		let arr = matrixRaw.replace("matrix(", "").replace(")", "").split(" ");
		this.a = parseFloat(arr[0]);
		this.b = parseFloat(arr[1]);
		this.c = parseFloat(arr[2]);
		this.d = parseFloat(arr[3]);
		this.e = parseFloat(arr[4]);
		this.f = parseFloat(arr[5]);
		return this;
	}

	public exportToTransformString(): string {
		return "matrix(" + this.a + " " + this.b + " " + this.c + " " + this.d + " " + this.e + " " + this.f + ")";
	}

	public static Identity(): SVGTransformMatrix {
		return new SVGTransformMatrix(1, 0, 0, 1, 0, 0);
	}

	public static Rotation(theta: number): SVGTransformMatrix {
		return new SVGTransformMatrix(Math.cos(theta), Math.sin(theta), -Math.sin(theta), Math.cos(theta), 0, 0);
	}

	public static Translation(dx: number, dy: number): SVGTransformMatrix {
		return new SVGTransformMatrix(1, 0, 0, 1, dx, dy);
	}

	public static Scaling(scale: number): SVGTransformMatrix {
		return new SVGTransformMatrix(scale, scale, scale, scale, 0, 0);
	}

	public toString(): string {
		return this.exportToTransformString();
	}
}