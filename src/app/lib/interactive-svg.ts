import { DiagramRect } from "./process-change-model";

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


/**
 * This class acts as a little wrapper for custom interactive SVGs.
 * So far only methods relevant for generating BPMN-style graphics are implemented.
 */
export class InteractiveSVG {

	/**
	 * A reference to the svg container in the DOM where it gets rendered.
	 */
	svgContainer: HTMLElement;
	pointerDown: boolean;
	selectedElementForDrag: SVGElement | null;
	dragOffset: {x: number, y: number} = {x: 0, y: 0};

	coloredMarkers: ColoredMarker[] = [];
	
	/**
	 * A big parent-group for everything inside the svg.
	 * Essential for panning and zooming. For more info have a look at:
	 * https://www.petercollingridge.co.uk/tutorials/svg/interactive/pan-and-zoom/
	 */
	matrixGroup: SVGElement;
	currentScale: number;
	
	/**
	 * Initializes the interactive svg.
	 * @param svgContainer the svg container element where everything gets rendered.
	 * @param markers An array of markers that get predefined and can then be used in the svg.
	 * @param uiButtons **Not In Use Yet!** an array to specify UI buttons for the user to interact with.
	 */
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

	public destroy = (): void => {
		this.svgContainer.removeChild(this.matrixGroup);
	}

	/**
	 * Applies transformations on an SVG element, based on the parameters given.
	 * So translation, rotation and scaling can be done in one go.
	 * Requires the element to have a transform attribute.
	 */
	public applySVGMatrixTransformations(element: SVGElement | SVGPathElement, translateX: number, translateY: number, rotateAngle: number, scaleFactor: number): void {
		let matrixRaw = element.getAttributeNS(null, "transform");
		let matrix = matrixRaw?.replace("matrix(", "").replace(")", "").split(" ").map(str => parseFloat(str));
		let m = new DOMMatrix(matrix);
		m.scaleSelf(scaleFactor);
		m.rotateAxisAngleSelf(0, 0, 1, rotateAngle);
		m.translateSelf(translateX, translateY);
		element.setAttributeNS(null, "transform", m.toString());
	}

	/**
	 * Zooms into the midpoint of the own container.
	 * @param scale the factor of scaling applied. The current scale is multiplied by that amount.
	 */
	private zoom = (scale: number): void => {
		// TODO: at best give svg a viewbox that fits the whole process. and then get center from viewbox.
		let viewBox = this.svgContainer.getAttributeNS(null, "viewBox")?.split(" ") ?? [];
		let graphicsBox = (this.matrixGroup as SVGGraphicsElement).getBBox();
		let domRenderedBox = this.matrixGroup.getBoundingClientRect();
		let centerX = parseFloat(viewBox[2]) / 2;//domRenderedBox.width / 2;
		let centerY = parseFloat(viewBox[3]) / 2;domRenderedBox.height / 2;

		let modifiedScale = this.currentScale * scale;
		if (modifiedScale >= 4.0) {
			scale = 1.0;
		} else if(modifiedScale <= 0.2) {
			scale = 1.0;
		}
		this.currentScale *= scale;

		this.applySVGMatrixTransformations(this.matrixGroup, (1 - scale) * centerX, (1 - scale) * centerY, 0, scale);
	}

	private getMousePosition = (evt): {x: number, y: number} => {
		var CTM = (this.matrixGroup as any).getScreenCTM();
		return {
			x: (evt.clientX - CTM.e) / CTM.a,
			y: (evt.clientY - CTM.f) / CTM.d
		};
	}

	/**
	 * adds an svg element to the container.
	 * @param element the element to add
	 * @param recalculateSVGViewFit whether to recalculate fit-to-view
	 */
	public addSVGElement(element: SVGElement, recalculateSVGViewFit: boolean = false): void {
		element.setAttributeNS(null, "svg-index", ""+this.matrixGroup.children.length);
		this.matrixGroup.appendChild(element);

		if (recalculateSVGViewFit) {
			this.recalculateViewFit();
		}
	}

	//this alone does not update the rendering.
	//TODO: find a way to recalc view fit on its own.
	//not even appendchild makes it update.
	public recalculateViewFit(): void {
		const rect = (this.matrixGroup as SVGGraphicsElement).getBBox();
		this.svgContainer.setAttributeNS(null, "viewBox", (rect.x - 20) + " " + (rect.y - 20) + " " + (rect.width + 40) + " " + (rect.height + 40))
	}

	public switchOrderOfTwoElements(element1: SVGElement | null, element2: SVGElement | null): boolean {
		if (!element1 || !element2) {
			return false;
		}
		
		let ix1 = element1.getAttributeNS(null, "svg-index");
		let ix2 = element2.getAttributeNS(null, "svg-index");
		if (!ix1 || !ix2) {
			return false;
		}

		let allElements = Array.from(this.matrixGroup.childNodes);
		let elementThatComesAfter1 = allElements.find(ee => 
			parseInt((ee as SVGElement).getAttributeNS(null, "svg-index") ?? '-1') === parseInt(ix1 ?? "-1")+1
		);
		
		//this.matrixGroup.insertBefore(element2, element1);
		//this.matrixGroup.insertBefore(element1, element2);
		//element2.setAttributeNS(null, "svg-index", ix1);
		//element1.setAttributeNS(null, "svg-index", ix2);

		return true;
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

	/**
	 * creates a group of textlines, centered vertically
	 * @param id the id of the group
	 * @param draggableAll whether every textline should have that property
	 * @param dragHandleAll whether every textline should have that property
	 * @param xAll x position for center of this multiline group
	 * @param yAll y position for center of this multiline group
	 * @param textlines the actual textlines
	 * @param styleAll the style to apply. Can be a string for all or an array of strings for each individual line.
	 * @param rotationAngleForAll the rotation to rotate the whole group of textlines
	 * @param classNames the classnames to give each textline.
	 * @returns 
	 */
	public createGroupOfTextlines = (id: string, draggableAll: boolean, dragHandleAll: boolean, xAll: number, yAll: number, textlines: string[], styleAll: string | string[], rotationAngleForAll: number, classNames: string): SVGElement => {
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
	public createTextlines = (idForAll: string, draggableAll: boolean, dragHandleAll: boolean, xAll: number, yAll: number, textlines: string[], styleAll: string | string[], classNames: string): SVGTextElement[] => {
		let elements: SVGTextElement[] = [];

		for (let i=0; i<textlines.length; i++) {
			elements.push(this.createText(idForAll, draggableAll, dragHandleAll, xAll, yAll, textlines[i], i, textlines.length, typeof(styleAll) === 'string' ? styleAll : styleAll[i], classNames));
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
		if (style != null) {
			newShape.setAttributeNS(null, "style", style);
		}
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

	public createImageObject = (id: string, draggable: boolean, dragHandleForParent: boolean, href: string, rect: DiagramRect, style: string, classNames: string): SVGImageElement => {
		let newShape = document.createElementNS("http://www.w3.org/2000/svg", 'image');
		newShape.setAttributeNS('http://www.w3.org/1999/xlink', "xlink:href", href);
		newShape.setAttributeNS(null, "x", "" + rect.x);
		newShape.setAttributeNS(null, "y", "" + rect.y);
		newShape.setAttributeNS(null, "width", "" + rect.width);
		newShape.setAttributeNS(null, "height", "" + rect.height);
		this.setStandardAttributes(newShape, id, draggable, dragHandleForParent, style, classNames);
		return newShape;
	}

	/**
	 * Sets some common attributes of an element for the interactive svg class to work.
	 */
	private setStandardAttributes(element: SVGElement | SVGPathElement, id: string, draggable: boolean, dragHandleForParent: boolean, style: string | null, classNames = ""): void {
		element.setAttributeNS(null, "id", id);
		let className = classNames;
		className += dragHandleForParent && className.indexOf("drag-handle-parent")<0 ? " drag-handle-parent": "";
		//className += draggable && className.indexOf("draggable")<0 ? " draggable": "";	//disable draggable for now. But can be a thing in the future.
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
