



// this is gonna be our own little custom data structure to hold information

import { platformCore } from "@angular/core";
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
			if (element.type === BPMNNodeType.StartEvent || element.type === BPMNNodeType.EndEvent) {
				correspondingSVGElement = this.createRoundEventShape(element);
			} else if (element.type === BPMNNodeType.Task || element.type === BPMNNodeType.SendTask || element.type === BPMNNodeType.ReceiveTask ||
						element.type === BPMNNodeType.ManualTask || element.type === BPMNNodeType.UserTask) {
				correspondingSVGElement = this.createRectangleActivityShape(element);
			} else if(element.type === BPMNNodeType.GatewayAND || element.type === BPMNNodeType.GatewayOR || element.type === BPMNNodeType.EventBasedGateway || element.type === BPMNNodeType.ComplexGateway) {
				correspondingSVGElement = this.createRotSquareGateShape(element);
			}else {
				// ?
				console.warn("TODO!");
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

	private createRoundEventShape = (element: BPMNNode): SVGElement => {

		//adjust style
		let fill = '';
		if (element.type === BPMNNodeType.StartEvent) {
			fill = 'green';
		} else if (element.type === BPMNNodeType.EndEvent) {
			fill = 'red';
		} else {
			fill = 'white';
		}

		let correspondingSVGElement = this.interactiveSVG.createSVGGroup(element.id, true,
			this.interactiveSVG.createCircle(element.id, true, false, 0, 0,
										element.diagramShape.width / 2,
										'fill: ' + fill + '; stroke: black; stroke-width: 3px;')
		);
		this.interactiveSVG.panTransformElement(correspondingSVGElement, element.diagramShape.x + element.diagramShape.width / 2,
			element.diagramShape.y + element.diagramShape.height / 2);
		return correspondingSVGElement;					
	}

	private createRectangleActivityShape = (element: BPMNNode): SVGElement => {

		//adjust style
		let fill = 'white';
		let pathIcon = BPMNNodeTypeMappings.find(m => m.type === element.type)?.iconPath ?? '';

		if (element.type === BPMNNodeType.SendTask) {
			fill = 'black';
		}


		let correspondingSVGElement = this.interactiveSVG.createSVGGroup(element.id, true,
			this.interactiveSVG.createRectangle('', false, false, 0, 0, element.diagramShape.width,
				element.diagramShape.height, 'fill: white; stroke: black; stroke-width: 3px;'),
			...this.interactiveSVG.createTextlines('', false, false, element.diagramShape.width /2, element.diagramShape.height/2, element.description.split("\n"), 'stroke: black'),
			this.interactiveSVG.createRectangle(element.id + "_bg", true, true, 0, 0, element.diagramShape.width, element.diagramShape.height, 'fill: none; stroke: none;'),
			this.interactiveSVG.createPathByString('', false, false, pathIcon,
			'fill: ' + fill + '; stroke: black; stroke-width: 1px;'),
		);
		this.interactiveSVG.panTransformElement(correspondingSVGElement, element.diagramShape.x, element.diagramShape.y);
	
		return correspondingSVGElement;					
	}

	private createRotSquareGateShape = (element: BPMNNode): SVGElement => {

		//adjust style
		let pathIcon = BPMNNodeTypeMappings.find(m => m.type === element.type)?.iconPath ?? '';

		let correspondingSVGElement = this.interactiveSVG.createSVGGroup(element.id, true,
			this.interactiveSVG.createRotSquare('', false, false, 0, 0, element.diagramShape.width /2, 'stroke: black; stroke-width: 2px; fill: white; fill-opacity: 0.95;'),
			this.interactiveSVG.createPathByString('', false, false, pathIcon,
				'fill: black; stroke: black; stroke-width: 1px;'),
			this.interactiveSVG.createRectangle(element.id + "_bg", true, true, 0, 0, element.diagramShape.width, element.diagramShape.height, 'fill: none; stroke: none;')
		);
		this.interactiveSVG.panTransformElement(correspondingSVGElement, element.diagramShape.x, element.diagramShape.y);
		
		return correspondingSVGElement;					
	}

	public takeOverAndNoteChangesFromOtherProcessChangeModel = (otherPcm: ProcessChangeModel): void => {
		// TODO:
		// we have to find out differences to the other pcm.
		//like elements that have the same id but different property.
		const ids1 = this.elements.map(el => el.id);
		const ids2 = otherPcm.elements.map(el => el.id);
		for (const el of this.elements) {
			let elementInOtherWithSameId = otherPcm.elements.find(e => e.id === el.id);
			if (elementInOtherWithSameId) {
				console.log('found an element by id, existing in both processes.');
				// TODO: explore changes.
			}
		}


		// ...or elements that have different id but same properties/texts/positions?
		// think about those scenarios...
		// how could people modify a process?

		// we want to modify this class here according to changes we see in the otherPcm.

		// STEP 2: then is to color those changes meaningfully. But first try to detect all changes.
	}
}

export type BPMNNodeTypeEntry = {
	bpmnIoType: string;
	type: BPMNNodeType;
	iconPath: string;
}


export enum BPMNNodeType {
	"StartEvent",
	"EndEvent",
	"Task",
	"UserTask",
	"SendTask",
	"ReceiveTask",
	"ManualTask",
	"GatewayAND",
	"GatewayOR",
	"ComplexGateway",
	"EventBasedGateway"
}

export const BPMNNodeTypeMappings: BPMNNodeTypeEntry[] = [
	{bpmnIoType: 'bpmn:StartEvent', type: BPMNNodeType.StartEvent, iconPath: ''},
	{bpmnIoType: 'bpmn:EndEvent', type: BPMNNodeType.EndEvent, iconPath: ''},
	{bpmnIoType: 'bpmn:ExclusiveGateway', type: BPMNNodeType.GatewayOR, iconPath: 'm 16,15 7.42857142857143,9.714285714285715 -7.42857142857143,9.714285714285715 3.428571428571429,0 5.714285714285715,-7.464228571428572 5.714285714285715,7.464228571428572 3.428571428571429,0 -7.42857142857143,-9.714285714285715 7.42857142857143,-9.714285714285715 -3.428571428571429,0 -5.714285714285715,7.464228571428572 -5.714285714285715,-7.464228571428572 -3.428571428571429,0 z'},
	{bpmnIoType: 'bpmn:ParallelGateway', type: BPMNNodeType.GatewayAND, iconPath: 'm 23,10 0,12.5 -12.5,0 0,5 12.5,0 0,12.5 5,0 0,-12.5 12.5,0 0,-5 -12.5,0 0,-12.5 -5,0 z'},
	{bpmnIoType: 'bpmn:ComplexGateway', type: BPMNNodeType.ComplexGateway, iconPath: 'm 23,13 0,7.116788321167883 -5.018248175182482,-5.018248175182482 -3.102189781021898,3.102189781021898 5.018248175182482,5.018248175182482 -7.116788321167883,0 0,4.37956204379562 7.116788321167883,0  -5.018248175182482,5.018248175182482 l 3.102189781021898,3.102189781021898 5.018248175182482,-5.018248175182482 0,7.116788321167883 4.37956204379562,0 0,-7.116788321167883 5.018248175182482,5.018248175182482 3.102189781021898,-3.102189781021898 -5.018248175182482,-5.018248175182482 7.116788321167883,0 0,-4.37956204379562 -7.116788321167883,0 5.018248175182482,-5.018248175182482 -3.102189781021898,-3.102189781021898 -5.018248175182482,5.018248175182482 0,-7.116788321167883 -4.37956204379562,0 z'},
	{bpmnIoType: 'bpmn:EventBasedGateway', type: BPMNNodeType.EventBasedGateway, iconPath: 'm 18,22 7.363636363636364,-4.909090909090909 7.363636363636364,4.909090909090909 -2.4545454545454546,9.818181818181818 -9.818181818181818,0 z'},
	{bpmnIoType: 'bpmn:Task', type: BPMNNodeType.Task, iconPath: ''},
	{bpmnIoType: 'bpmn:UserTask', type: BPMNNodeType.UserTask, iconPath: 'm 15,12 c 0.909,-0.845 1.594,-2.049 1.594,-3.385 0,-2.554 -1.805,-4.62199999 -4.357,-4.62199999 -2.55199998,0 -4.28799998,2.06799999 -4.28799998,4.62199999 0,1.348 0.974,2.562 1.89599998,3.405 -0.52899998,0.187 -5.669,2.097 -5.794,4.7560005 v 6.718 h 17 v -6.718 c 0,-2.2980005 -5.5279996,-4.5950005 -6.0509996,-4.7760005 zm -8,6 l 0,5.5 m 11,0 l 0,-5'},
	{bpmnIoType: 'bpmn:ManualTask', type: BPMNNodeType.ManualTask, iconPath: 'm 17,15 c 0.234,-0.01 5.604,0.008 8.029,0.004 0.808,0 1.271,-0.172 1.417,-0.752 0.227,-0.898 -0.334,-1.314 -1.338,-1.316 -2.467,-0.01 -7.886,-0.004 -8.108,-0.004 -0.014,-0.079 0.016,-0.533 0,-0.61 0.195,-0.042 8.507,0.006 9.616,0.002 0.877,-0.007 1.35,-0.438 1.353,-1.208 0.003,-0.768 -0.479,-1.09 -1.35,-1.091 -2.968,-0.002 -9.619,-0.013 -9.619,-0.013 v -0.591 c 0,0 5.052,-0.016 7.225,-0.016 0.888,-0.002 1.354,-0.416 1.351,-1.193 -0.006,-0.761 -0.492,-1.196 -1.361,-1.196 -3.473,-0.005 -10.86,-0.003 -11.0829995,-0.003 -0.022,-0.047 -0.045,-0.094 -0.069,-0.139 0.3939995,-0.319 2.0409995,-1.626 2.4149995,-2.017 0.469,-0.4870005 0.519,-1.1650005 0.162,-1.6040005 -0.414,-0.511 -0.973,-0.5 -1.48,-0.236 -1.4609995,0.764 -6.5999995,3.6430005 -7.7329995,4.2710005 -0.9,0.499 -1.516,1.253 -1.882,2.19 -0.37000002,0.95 -0.17,2.01 -0.166,2.979 0.004,0.718 -0.27300002,1.345 -0.055,2.063 0.629,2.087 2.425,3.312 4.859,3.318 4.6179995,0.014 9.2379995,-0.139 13.8569995,-0.158 0.755,-0.004 1.171,-0.301 1.182,-1.033 0.012,-0.754 -0.423,-0.969 -1.183,-0.973 -1.778,-0.01 -5.824,-0.004 -6.04,-0.004 10e-4,-0.084 0.003,-0.586 10e-4,-0.67 z'},
	{bpmnIoType: 'bpmn:SendTask', type: BPMNNodeType.SendTask, iconPath: 'm 5.984999999999999,4.997999999999999 l 0,14 l 21,0 l 0,-14 z l 10.5,6 l 10.5,-6'},
	{bpmnIoType: 'bpmn:ReceiveTask', type: BPMNNodeType.ReceiveTask, iconPath: 'm 6.3,5.6000000000000005 l 0,12.6 l 18.900000000000002,0 l 0,-12.6 z l 9.450000000000001,5.4 l 9.450000000000001,-5.4'}
];


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