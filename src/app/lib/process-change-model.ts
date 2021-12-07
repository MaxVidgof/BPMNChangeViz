



// this is gonna be our own little custom data structure to hold information

import { InteractiveSVG } from "./interactive-svg";

// about the process plus change. So that we can later easily visualize it and export it.
export class ProcessChangeModel {

	private elements: BPMNElement[] = [];
	private interactiveSVG: InteractiveSVG;

	constructor(svgContainer: HTMLElement) {
		this.interactiveSVG = new InteractiveSVG(svgContainer);
	}

	public getElements = (): BPMNElement[] => {
		return this.elements;
	}

	public addElement = (element: BPMNElement): void => {
		this.elements.push(element);

		let correspondingSVGElement: SVGElement | null = null;
		if (element instanceof BPMNNode) {
			if (element.type === BPMNNodeType.StartEvent) {
				correspondingSVGElement = this.interactiveSVG.createCircle(element.id, true, false, element.diagramShape.x + element.diagramShape.width / 2,
												element.diagramShape.y + element.diagramShape.height / 2,
												element.diagramShape.width / 2,
												'fill: green; stroke: black; stroke-width: 3px;');
			} else if (element.type === BPMNNodeType.EndEvent) {
				correspondingSVGElement = this.interactiveSVG.createCircle(element.id, true, false, element.diagramShape.x + element.diagramShape.width / 2,
												element.diagramShape.y + element.diagramShape.height / 2,
												element.diagramShape.width / 2,
												'fill: red; stroke: black; stroke-width: 3px;');
			} else if (element.type === BPMNNodeType.Task) {

				correspondingSVGElement = this.interactiveSVG.createSVGGroup(element.id, true,
					this.interactiveSVG.createRectangle('', false, false, 0, 0, element.diagramShape.width,
						element.diagramShape.height, 'fill: white; stroke: black; stroke-width: 3px;'),
					...this.interactiveSVG.createTextlines('', false, false, element.diagramShape.width /2, element.diagramShape.height/2, element.description.split("\n"), 'stroke: black'),
					this.interactiveSVG.createRectangle(element.id + "_bg", true, true, 0, 0, element.diagramShape.width, element.diagramShape.height, 'fill: none; stroke: none;')
				);
				this.interactiveSVG.panTransformElement(correspondingSVGElement, element.diagramShape.x, element.diagramShape.y);
			
			
			} else if(element.type === BPMNNodeType.JoinAND || element.type === BPMNNodeType.JoinOR || element.type === BPMNNodeType.SplitAND || element.type === BPMNNodeType.SplitOR) {
				correspondingSVGElement = this.interactiveSVG.createSVGGroup(element.id, true,
					this.interactiveSVG.createRotSquare('', false, false, 0, 0, element.diagramShape.width /2, 'stroke: black; stroke-width: 2px; fill: white; fill-opacity: 0.95;'),
					this.interactiveSVG.createPathByString('', false, false, 'm 16,15 7.42857142857143,9.714285714285715 -7.42857142857143,9.714285714285715 3.428571428571429,0 5.714285714285715,-7.464228571428572 5.714285714285715,7.464228571428572 3.428571428571429,0 -7.42857142857143,-9.714285714285715 7.42857142857143,-9.714285714285715 -3.428571428571429,0 -5.714285714285715,7.464228571428572 -5.714285714285715,-7.464228571428572 -3.428571428571429,0 z',
						'fill: black; stroke: black; stroke-width: 1px;'),
					this.interactiveSVG.createRectangle(element.id + "_bg", true, true, 0, 0, element.diagramShape.width, element.diagramShape.height, 'fill: none; stroke: none;')
				);
				this.interactiveSVG.panTransformElement(correspondingSVGElement, element.diagramShape.x, element.diagramShape.y);
			}else {
				// TODO
			}
		} else if (element instanceof BPMNEdge) {
			correspondingSVGElement = this.interactiveSVG.createPathByWaypoints(element.id, false, false, element.diagramShape.waypoints, false, "fill: none; stroke: black; stroke-width: 3px; stroke-linejoin: round; marker-end: url(#" + this.interactiveSVG.MARKER_URL_ARROW_HEAD_END + ");");
		}

		//add svg element and link bpmn model to it.
		if (correspondingSVGElement != null) {
			element.svg = correspondingSVGElement;
			this.interactiveSVG.addSVGElement(correspondingSVGElement);
		}
	}

	public takeOverAndNoteChangesFromOtherProcessChangeModel = (otherPcm: ProcessChangeModel): void => {
		// TODO:
		// we have to find out differences to the other pcm.
		//like elements that have the same id but different property.
		// or elements that have different id but same properties/texts/positions?
		// think about those scenarios...
		// how could people modify a process?

		// we want to modify this class here according to changes we see in the otherPcm.

		// STEP 2: then is to color those changes meaningfully. But first try to detect all changes.
	}
}



export enum BPMNNodeType {
	"StartEvent",
	"EndEvent",
	"Task",
	"SplitAND",
	"SplitOR",
	"JoinAND",
	"JoinOR"
}

export interface DiagramRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface DiagramPath {
	waypoints: {x: number, y: number}[];
}

export abstract class BPMNElement {
	changed: boolean = false;
	lastChangedISO: string = new Date().toISOString();
	description: string = "";
	id: string;
	svg: SVGElement | null = null;

	constructor(id: string) {
		this.id = id;
	}
}

export class BPMNNode extends BPMNElement {
	diagramShape: DiagramRect;
	type: BPMNNodeType;
	outputs: BPMNEdge[] = [];
	inputs: BPMNEdge[] = [];

	constructor(id: string, type: BPMNNodeType, shape: DiagramRect = {x: 0, y: 0, width: 100, height: 80}) {
		super(id);
		this.diagramShape = shape; 
		this.type = type;
	}
}

export class BPMNEdge extends BPMNElement {
	diagramShape: DiagramPath;
	output: BPMNNode | null = null;
	input: BPMNNode | null = null;

	constructor(id: string) {
		super(id);
		this.diagramShape = {
			waypoints: []
		}
	}
}