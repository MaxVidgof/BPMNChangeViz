



// this is gonna be our own little custom data structure to hold information

import { InteractiveSVG } from "./interactive-svg";

// about the process plus change. So that we can later easily visualize it and export it.
export class ProcessChangeModel {

	private elements: BPMNElement[] = [];
	private interactiveSVG: InteractiveSVG;

	constructor(svgContainer: HTMLElement) {
		this.interactiveSVG = new InteractiveSVG(svgContainer);
	}

	public addElement = (element: BPMNElement): void => {
		this.elements.push(element);

		if (element instanceof BPMNNode) {
			if (element.type === BPMNNodeType.StartEvent) {
				this.interactiveSVG.addCircle(element.id, element.diagramShape.x + element.diagramShape.width / 2,
												element.diagramShape.y + element.diagramShape.height / 2,
												element.diagramShape.width / 2,
												'fill: green; stroke: black; stroke-width: 3px;');
			} else if (element.type === BPMNNodeType.Task) {
				this.interactiveSVG.addRectangle(element.id, element.diagramShape.x, element.diagramShape.y, element.diagramShape.width,
						element.diagramShape.height, 'fill: grey; stroke: black; stroke-width: 3px;');
			} else {
				// TODO
			}
		} else if (element instanceof BPMNEdge) {
			//only type sequenceflow exists so far.

			this.interactiveSVG.addPath(element.id, element.diagramShape.waypoints, false, 'fill: none; stroke: black; stroke-width: 3px');
		}
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