



// this is gonna be our own little custom data structure to hold information

import { style } from "@angular/animations";
import { platformCore } from "@angular/core";
import { ColoredMarker, InteractiveSVG, SVGUIButton } from "./interactive-svg";

import {findBestMatch, compareTwoStrings} from "string-similarity"

import { HashList } from 'hashlist-typescript';
import * as cloneDeep from 'lodash.clonedeep';


// about the process plus change. So that we can later easily visualize it and export it.
export class ProcessChangeModel {


	// we model our own process elements, the reference to the moddle and the reference to the SVG.
	// thats all we need.

	name: string;
	originalXml: string = '';
	moddleObj: any;

	private elements: BPMNElement[] = [];
	private interactiveSVG: InteractiveSVG;
	private changeTrackingEdges: {old: BPMNNode | null, new: BPMNNode | null}[] = [];

	constructor(name: string, svgContainer: HTMLElement, moddleObj: any) {
		this.name = name;
		this.interactiveSVG = new InteractiveSVG(svgContainer, [
			// SequenceFlow End
			new ColoredMarker('sequenceflow-end-white-black-doq2fvopnj4c3h1erjbstx8an', 'FlowEnd ArrowHead Black', "11", "10", "fill: black; stroke-width: 1px; stroke-linecap: round; stroke-dasharray: 10000, 1; stroke: black;", "M 1 5 L 11 10 L 1 15 Z"),
			new ColoredMarker('sequenceflow-end-red-doq2fvopnj4c3h1erjbstx8an', 'FlowEnd ArrowHead Red', "11", "10",  "fill: red; stroke-width: 1px; stroke-linecap: round; stroke-dasharray: 10000, 1; stroke: red;", "M 1 5 L 11 10 L 1 15 Z"),
			new ColoredMarker('sequenceflow-end-green-doq2fvopnj4c3h1erjbstx8an', 'FlowEnd ArrowHead Green', "11", "10",  "fill: green; stroke-width: 1px; stroke-linecap: round; stroke-dasharray: 10000, 1; stroke: green;", "M 1 5 L 11 10 L 1 15 Z"),
		
			//MessageFlow End
			new ColoredMarker('messageflow-end-white-black-bt4ep41bxmkomwvfg0iplb4ay', 'MessageEnd ArrowHead White', "8.5", "5",  "fill: white; stroke-width: 1px; stroke-linecap: butt; stroke-dasharray: 10000, 1; stroke: black;", "m 1 5 l 0 -3 l 7 3 l -7 3 z"),

			//MessageFlow Start
			new ColoredMarker('messageflow-start-white-black-bt4ep41bxmkomwvfg0iplb4ay', 'MessageStart Point White', "6", "6",  "fill: white; stroke-width: 1px; stroke-linecap: butt; stroke-dasharray: 10000, 1; stroke: black;", "circle")

		], [
			//new SVGUIButton('', 'Select Single', 'fill: #007bbf; pointer: cursor;', () => {}, () => {}, () => {})
		]);
		this.moddleObj = moddleObj;

	}

	public getElements = (): BPMNElement[] => {
		return this.elements;
	}

	public destroy = (): void => {
		this.interactiveSVG.destroy();
		this.elements = [];
		this.moddleObj = null;
	}

	public addElement = (element: BPMNElement): void => {
		this.elements.push(element);

		let correspondingSVGElement: SVGElement | null = null;
		if (element instanceof BPMNNode) {
			if (element.type === BPMNNodeType.StartEvent || element.type === BPMNNodeType.EndEvent) {
				correspondingSVGElement = this.createRoundEventShape(element);
			} else if (element.type === BPMNNodeType.Task || element.type === BPMNNodeType.SendTask || element.type === BPMNNodeType.ReceiveTask || element.type === BPMNNodeType.SubProcess ||
						element.type === BPMNNodeType.ManualTask || element.type === BPMNNodeType.UserTask || element.type === BPMNNodeType.ServiceTask ||
						element.type === BPMNNodeType.ScriptTask || element.type === BPMNNodeType.CallActivity || element.type === BPMNNodeType.BusinessRuleTask ||
						element.type === BPMNNodeType.StandardLoopTask || element.type === BPMNNodeType.MultiInstanceLoopTaskVertical || element.type === BPMNNodeType.MultiInstanceLoopTaskHorizontal) {
				correspondingSVGElement = this.createRectangleActivityShape(element);
			} else if(element.type === BPMNNodeType.GatewayAND || element.type === BPMNNodeType.GatewayOR || element.type === BPMNNodeType.EventBasedGateway || element.type === BPMNNodeType.ComplexGateway) {
				correspondingSVGElement = this.createRotSquareGateShape(element);
			}else {
				// ?
				console.warn("TODO!");
			}
		} else if (element instanceof BPMNEdge) {
			correspondingSVGElement = this.createEdgeShapeByWaypoints(element);
		} else if(element instanceof BPMNTextAnnotation) {
			correspondingSVGElement = this.createRectangleTextAnnotation(element);
		} else if(element instanceof BPMNParticipant) {
			correspondingSVGElement = this.createRectangleParticipantShape(element);
		}

		//add svg element and link bpmn model to it.
		if (correspondingSVGElement != null) {
			element.svg = correspondingSVGElement;
			this.interactiveSVG.addSVGElement(correspondingSVGElement, true);
		}
	}

	private createEdgeShapeByWaypoints = (element: BPMNEdge): SVGElement => {

		let arrowHeadName = element.type === BPMNEdgeType.MessageFlow ? 'MessageEnd ArrowHead White' : 'FlowEnd ArrowHead Black';
		let arrowFootName = element.type === BPMNEdgeType.MessageFlow ? 'MessageStart Point White' : 'FlowEnd ArrowHead Black';
		let style: Partial<CSSStyleDeclaration> = {
			fill: 'none',
			stroke: 'black',
			strokeWidth: "2px",
			strokeLinejoin: 'round',
			strokeDasharray: element.type === BPMNEdgeType.MessageFlow ? ' 10,12' : '',
			markerStart: element.type === BPMNEdgeType.MessageFlow ? "url(#" + this.interactiveSVG.coloredMarkers.find(m => m.name === arrowFootName)?.id + ");" : undefined,
			markerEnd: "url(#" + this.interactiveSVG.coloredMarkers.find(m => m.name === arrowHeadName)?.id + ");"
		};

		// since there seems no way to compute CSS text from partial style declaration,
		// you should get comfortable with regexes.
		let styleStr = Object.keys(style).map(key => key.replace(/([A-Z])/, "-$1".toLowerCase()) + ": " + style[key]).join(";");

		//try to figure out where to put the symbol next to the path.
		let icondestination = {x: 0, y: 0}
		if (element.diagramShape.waypoints.length > 0) {
			let lastDx = element.diagramShape.waypoints[element.diagramShape.waypoints.length - 1].x - element.diagramShape.waypoints[element.diagramShape.waypoints.length - 2].x;
			let lastDy = element.diagramShape.waypoints[element.diagramShape.waypoints.length - 1].y - element.diagramShape.waypoints[element.diagramShape.waypoints.length - 2].y;
			
			icondestination.x = element.diagramShape.waypoints[element.diagramShape.waypoints.length - 1].x;
			icondestination.y = element.diagramShape.waypoints[element.diagramShape.waypoints.length - 1].y;
			if (Math.abs(lastDx) > Math.abs(lastDy)) {
				icondestination.x -= 30 * Math.sign(lastDx);
				icondestination.y -= 15 * Math.sign(lastDx);
			} else {
				icondestination.x += 15 * Math.sign(lastDy);
				icondestination.y -= 30 * Math.sign(lastDy);
			}
		}

		let correspondingSVGElement = this.interactiveSVG.createSVGGroup(element.id, true,
			this.interactiveSVG.createPathByWaypoints("", false, false,
				element.diagramShape.waypoints, false, styleStr, "styler"),
			this.interactiveSVG.createImageObject('', false, false, ElementChangeIconsMapping.get(element.getChangeType()) ?? '', {
				x: icondestination.x - 10,
				y: icondestination.y - 10,
				width: 20, height: 20
			}, '', 'change-icon')
		);
		this.interactiveSVG.applySVGMatrixTransformations(correspondingSVGElement, 0, 0, 0, 1.0);
		return correspondingSVGElement;	
	}

	private createRoundEventShape = (element: BPMNNode): SVGElement => {

		let correspondingSVGElement = this.interactiveSVG.createSVGGroup(element.id, true,
			this.interactiveSVG.createCircle('', true, true, 0, 0,
										element.diagramShape.width / 2,
										'fill: white; stroke: black; stroke-width: 3px;', "styler"),
			this.interactiveSVG.createImageObject('', false, false, ElementChangeIconsMapping.get(element.getChangeType()) ?? '', {
				x: -element.diagramShape.width/2 / 3,
				y: -element.diagramShape.height / 2,
				width: 30, height: 30
			}, '', 'change-icon')
		);
		this.interactiveSVG.applySVGMatrixTransformations(correspondingSVGElement, element.diagramShape.x + element.diagramShape.width / 2, element.diagramShape.y + element.diagramShape.height / 2, 0, 1.0);
		return correspondingSVGElement;					
	}

	private createRectangleTextAnnotation = (element: BPMNTextAnnotation): SVGElement => {

		//adjust style
		let fill = 'none';
		let stroke = 'black';
		let pathIcon = 'm 0, 0 m 10,0 l -10,0 l 0,30 l 10,0';

		let correspondingSVGElement = this.interactiveSVG.createSVGGroup(element.id, true,
			this.interactiveSVG.createGroupOfTextlines('', false, false, element.diagramShape.width /2, element.diagramShape.height/2, element.description.split(/[\r\n]/), 'stroke: black; font-size: 10px', 0, "styler"),
			this.interactiveSVG.createRectangle(element.id + "_bg", true, true, 0, 0, element.diagramShape.width, element.diagramShape.height, 'fill: none; stroke: none;', ""),
			this.interactiveSVG.createPathByString('', false, false, pathIcon,
			'fill: ' + fill + '; stroke: ' + stroke + '; stroke-width: 1px;', ""),
			this.interactiveSVG.createImageObject('', false, false, ElementChangeIconsMapping.get(element.getChangeType()) ?? '', {
				x: element.diagramShape.width * (6/10),
				y: -element.diagramShape.height * (1/10),
				width: 35, height: 35
			}, '', 'change-icon')
		);
		this.interactiveSVG.applySVGMatrixTransformations(correspondingSVGElement, element.diagramShape.x, element.diagramShape.y, 0, 1);
		

		return correspondingSVGElement;					
	}

	private createRectangleParticipantShape = (element: BPMNParticipant): SVGElement => {

		//adjust style
		let fill = 'none';
		let stroke = 'black';
		let path = "m " + element.diagramLine.x1 + " " + element.diagramLine.y1 + " L " + element.diagramLine.x2 + " " + element.diagramLine.y2 + " z";

		let correspondingSVGElement = this.interactiveSVG.createSVGGroup(element.id, true,
			this.interactiveSVG.createRectangle(element.id, false, false, 0, 0, element.diagramShape.width, element.diagramShape.height, 'fill: ' + fill + '; stroke: ' + stroke + '; stroke-width: 3px', "styler"),
			this.interactiveSVG.createPathByString('', false, false, path, 'fill: ' + fill + '; stroke: ' + stroke + '; stroke-width: 3px;', "styler"),
			this.interactiveSVG.createGroupOfTextlines('', false, false, element.diagramLine.x1 / 2, element.diagramShape.height/2, element.description.split(/[\r\n]/), 'stroke: black; font-size: 10px', 270, "styler"),
			this.interactiveSVG.createImageObject('', false, false, ElementChangeIconsMapping.get(element.getChangeType()) ?? '', {
				x: element.diagramShape.width * (19/20),
				y: -element.diagramShape.height * (1/20),
				width: 35, height: 35
			}, '', 'change-icon')
		);
		this.interactiveSVG.applySVGMatrixTransformations(correspondingSVGElement, element.diagramShape.x, element.diagramShape.y, 0, 1);

		return correspondingSVGElement;
	}

	private createRectangleActivityShape = (element: BPMNNode): SVGElement => {

		//adjust style
		let fill = 'white';
		let stroke = 'black';
		let pathIcons = BPMNNodeTypeMappings.find(m => m.type === element.type)?.iconPaths ?? [];

		if (element.type === BPMNNodeType.SendTask) {
			fill = 'black';
			stroke = 'white';
		}

		let elementsInGroup: (SVGElement | SVGPathElement)[] = [
			this.interactiveSVG.createRectangle('', false, false, 0, 0, element.diagramShape.width,
				element.diagramShape.height, 'fill: white; stroke: black; stroke-width: 3px;', "styler"),
			this.interactiveSVG.createGroupOfTextlines('', false, false, element.diagramShape.width /2, element.diagramShape.height/2, element.description.split(/[\r\n]/), 'stroke: black; font-size: 10px', 0, "styler"),
			this.interactiveSVG.createRectangle(element.id + "_bg", true, true, 0, 0, element.diagramShape.width, element.diagramShape.height, 'fill: none; stroke: none;', ""),
			...pathIcons.map(icon => this.interactiveSVG.createPathByString('', false, false, icon, 'fill: ' + fill + '; stroke: ' + stroke + '; stroke-width: 1px;', "styler")),
			this.interactiveSVG.createImageObject('', false, false, ElementChangeIconsMapping.get(element.getChangeType()) ?? '', {
				x: element.diagramShape.width * (7/10),
				y: -element.diagramShape.height * (1/10),
				width: 35, height: 35
			}, '', 'change-icon')
		];
		if (element.type === BPMNNodeType.CallActivity) {
			const rect: SVGRectElement = this.interactiveSVG.createRectangle('', false, false, 0, 0, 14, 14, 'fill: none; stroke: black; stroke-width: 1.5px;', "styler");
			rect.setAttributeNS(null, "transform", "matrix(1 0 0 1 42.5 60)");
			rect.setAttributeNS(null, "rx", "0");
			rect.setAttributeNS(null, "ry", "0");
			elementsInGroup.push(rect);
		}
		let correspondingSVGElement = this.interactiveSVG.createSVGGroup(element.id, true, ...elementsInGroup);
		this.interactiveSVG.applySVGMatrixTransformations(correspondingSVGElement, element.diagramShape.x, element.diagramShape.y, 0, 1);

		return correspondingSVGElement;					
	}

	private createRotSquareGateShape = (element: BPMNNode): SVGElement => {

		//adjust style
		let pathIcons = BPMNNodeTypeMappings.find(m => m.type === element.type)?.iconPaths ?? [];

		let correspondingSVGElement = this.interactiveSVG.createSVGGroup(element.id, true,
			this.interactiveSVG.createRotSquare('', false, false, 0, 0, element.diagramShape.width /2, 'stroke: black; stroke-width: 2px; fill: white; fill-opacity: 0.95;', "styler"),
			...pathIcons.map(icon => this.interactiveSVG.createPathByString('', false, false, icon, 'fill: black; stroke: black; stroke-width: 1px;', "styler")),
			this.interactiveSVG.createRectangle(element.id + "_bg", true, true, 0, 0, element.diagramShape.width, element.diagramShape.height, 'fill: none; stroke: none;', ""),
			this.interactiveSVG.createImageObject('', false, false, ElementChangeIconsMapping.get(element.getChangeType()) ?? '', {
				x: element.diagramShape.width * (4/10),
				y: -element.diagramShape.height * (1/10),
				width: 35, height: 35
			}, '', 'change-icon')
		);
		this.interactiveSVG.applySVGMatrixTransformations(correspondingSVGElement, element.diagramShape.x, element.diagramShape.y, 0, 1);

		return correspondingSVGElement;					
	}

	public takeOverAndNoteChangesFromEarlierProcessChangeModel = (otherPcm: ProcessChangeModel): void => {
		

		//this array keeps track of which node becomes which between the two versions.
		// null means points to nowhere or comes from nowhere (removed / added)
		//the array NOT having a node represents that it has no idea about it yet.
		this.changeTrackingEdges = [];

		//1. identify nodes by description.
		//2. identify leftover nodes by id.
		//3. identify edges between nodes that are new or old.


		console.log("############### We are going to find some changes, yahoo.");

		// STEP 1 - match nodes by descriptions.
		let txtsNew = this.elements.filter(e => e instanceof BPMNNode && e.description.length > 0 && !this.changeTrackingEdges.find(ed => ed.new === e)).map(e => e.description);
		let txtsOld = otherPcm.elements.filter(e => e instanceof BPMNNode && e.description.length > 0 && !this.changeTrackingEdges.find(ed => ed.old === e)).map(e => e.description);
		if (txtsOld.length > 0) {
			for (const neww of this.elements.filter(e => e instanceof BPMNNode && e.description.length > 0)) {
				let matches = findBestMatch(neww.description, txtsOld);
				let oldd: BPMNNode | null = null;
				if (matches.bestMatch.rating >= 0.91) {
					oldd = otherPcm.elements.find(e => e.description === matches.bestMatch.target) as BPMNNode ?? null;
				}

				if (!this.changeTrackingEdges.find(ed => (ed.old !== null && ed.old === oldd) || (ed.new !== null && ed.new === neww))) {
					this.changeTrackingEdges.push({old: oldd as BPMNNode, new: neww as BPMNNode});
				}
			}
		}
		txtsNew = this.elements.filter(e => e instanceof BPMNNode && e.description.length > 0 && !this.changeTrackingEdges.find(ed => ed.new === e)).map(e => e.description);
		txtsOld = otherPcm.elements.filter(e => e instanceof BPMNNode && e.description.length > 0 && !this.changeTrackingEdges.find(ed => ed.old === e)).map(e => e.description);
		if (txtsNew.length > 0) {
			for (const oldd of otherPcm.elements.filter(e => e instanceof BPMNNode && e.description.length > 0)) {
				let matches = findBestMatch(oldd.description, txtsNew);
				let neww: BPMNNode | null = null;
				if (matches.bestMatch.rating >= 0.91) {
					neww = this.elements.find(e => e.description === matches.bestMatch.target) as BPMNNode ?? null;
				}

				if (!this.changeTrackingEdges.find(ed => (ed.old !== null && ed.old === oldd) || (ed.new !== null && ed.new === neww))) {
					this.changeTrackingEdges.push({old: oldd as BPMNNode, new: neww as BPMNNode});
				}
			}
		}

		//STEP 2 - match leftover nodes by id
		let idsNew = this.elements.filter(e => e instanceof BPMNNode && !this.changeTrackingEdges.find(ed => ed.new === e)).map(e => e.id);
		let idsOld = otherPcm.elements.filter(e => e instanceof BPMNNode && !this.changeTrackingEdges.find(ed => ed.old === e)).map(e => e.id);
		for (const neww of this.elements.filter(e => e instanceof BPMNNode && !this.changeTrackingEdges.find(ed => ed.new === e))) {

			let oldd: BPMNNode | null = null;
			if (idsOld.indexOf(neww.id) >= 0) {
				oldd = otherPcm.elements.find(e => e.id === neww.id) as BPMNNode ?? null;
			} else {
				console.log("found no element in other with same id as in me.", neww.description);
			}

			if (!this.changeTrackingEdges.find(ed => (ed.old !== null && ed.old === oldd) || (ed.new !== null && ed.new === neww))) {
				this.changeTrackingEdges.push({old: oldd as BPMNNode, new: neww as BPMNNode});
			}
		}
		idsNew = this.elements.filter(e => e instanceof BPMNNode && !this.changeTrackingEdges.find(ed => ed.new === e)).map(e => e.id);
		idsOld = otherPcm.elements.filter(e => e instanceof BPMNNode && !this.changeTrackingEdges.find(ed => ed.old === e)).map(e => e.id);
		for (const oldd of otherPcm.elements.filter(e => e instanceof BPMNNode && !this.changeTrackingEdges.find(ed => ed.old === e))) {

			let neww: BPMNNode | null = null;
			if (idsNew.indexOf(oldd.id) >= 0) {
				neww = this.elements.find(e => e.id === oldd.id) as BPMNNode ?? null;
			} else {
				console.log("found no element in me with same id as in other.", oldd.description);
			}

			if (!this.changeTrackingEdges.find(ed => (ed.old !== null && ed.old === oldd) || (ed.new !== null && ed.new === neww))) {
				this.changeTrackingEdges.push({old: oldd as BPMNNode, new: neww as BPMNNode});
			}
		}

		// do an extra round for elements that got removed. because they are not in processAfter yet.
		for (const edge of this.changeTrackingEdges) {

			if (edge.new === null && edge.old !== null) {
				let cpy = cloneDeep(edge.old) as BPMNNode;
				cpy.id = cpy.id + "__ZZZ";
				this.addElement(cpy);
				cpy.setChange(ElementChangeType.Removed);
				edge.new = cpy;
			} else if (edge.old === null && edge.new !== null) {
				edge.new?.setChange(ElementChangeType.Added);
			}
		}

		// and now for basically every node check whether any edges got added/removed.
		for (const n of this.elements.filter(e => e instanceof BPMNNode)) {
			if (n.getChangeType() === ElementChangeType.Added) {
				for (const link of [...(n as BPMNNode).inputs, ...(n as BPMNNode).outputs]) {
					link.setChange(ElementChangeType.Added);
				}
			} else if (n.getChangeType() === ElementChangeType.Removed) {
				for (const inp of (n as BPMNNode).inputs) {

					if (!this.elements.find(e => e === inp)) {
						let cpyEdge = cloneDeep(inp) as BPMNEdge;
						cpyEdge.id = cpyEdge.id + "__ZZZ";
						(n as BPMNNode).inputs.splice((n as BPMNNode).inputs.indexOf(inp), 1);
						(n as BPMNNode).inputs.push(cpyEdge);
						cpyEdge.output = n as BPMNNode;

						let track = this.changeTrackingEdges.find(e => e.old?.id === cpyEdge.input?.id);
						cpyEdge.input = track?.new ?? null;
						track?.new?.outputs.splice(track.new.outputs.indexOf(inp));
						
						this.addElement(cpyEdge);
						cpyEdge.setChange(ElementChangeType.Removed);
					}
				}
				for (const outp of (n as BPMNNode).outputs) {

					if (!this.elements.find(e => e === outp)) {
						let cpyEdge = cloneDeep(outp) as BPMNEdge;
						cpyEdge.id = cpyEdge.id + "__ZZZ";
						(n as BPMNNode).outputs.splice((n as BPMNNode).outputs.indexOf(outp), 1);
						(n as BPMNNode).outputs.push(cpyEdge);
						cpyEdge.input = n as BPMNNode;

						let track = this.changeTrackingEdges.find(e => e.old?.id === cpyEdge.output?.id);
						cpyEdge.output = track?.new ?? null;
						track?.new?.inputs.splice(track.new.inputs.indexOf(outp));
						
						this.addElement(cpyEdge);
						cpyEdge.setChange(ElementChangeType.Removed);
					}
				}
			} else {
				let currentTrack = this.changeTrackingEdges.find(e => e.new === n);
				for (const inp of currentTrack?.old?.inputs ?? []) {

					let changeTrack = this.changeTrackingEdges.find(e => e.old === inp.input);
					let inpNew = currentTrack?.new?.inputs.find(i => i.input === changeTrack?.new);
					if (!inpNew) {
						let cpyEdge = cloneDeep(inp) as BPMNEdge;
						cpyEdge.id = cpyEdge.id + "__ZZZ";

						let edgeToRemove = changeTrack?.new?.outputs.find(e => e.output?.id == currentTrack?.old?.id);
						if (edgeToRemove) {
							changeTrack?.new?.outputs.splice(changeTrack.new.outputs.indexOf(edgeToRemove), 1);
						}

						
						(n as BPMNNode).inputs.push(cpyEdge);
						(changeTrack?.new as BPMNNode).outputs.push(cpyEdge);
						cpyEdge.output = n as BPMNNode;
						cpyEdge.input = changeTrack?.new ?? null;


						this.addElement(cpyEdge);
						cpyEdge.setChange(ElementChangeType.Removed);
					}
				}

				for (const outp of currentTrack?.old?.outputs ?? []) {

					let changeTrack = this.changeTrackingEdges.find(e => e.old === outp.output);
					let outpNew = currentTrack?.new?.outputs.find(i => i.output === changeTrack?.new);
					if (!outpNew) {
						let cpyEdge = cloneDeep(outp) as BPMNEdge;
						cpyEdge.id = cpyEdge.id + "__ZZZ";

						let edgeToRemove = changeTrack?.new?.inputs.find(e => e.input?.id == currentTrack?.old?.id);
						if (edgeToRemove) {
							changeTrack?.new?.inputs.splice(changeTrack.new.inputs.indexOf(edgeToRemove), 1);
						}

						(n as BPMNNode).outputs.push(cpyEdge);
						(changeTrack?.new as BPMNNode).inputs.push(cpyEdge);
						cpyEdge.input = n as BPMNNode;
						cpyEdge.output = changeTrack?.new ?? null;

						this.addElement(cpyEdge);
						cpyEdge.setChange(ElementChangeType.Removed);
					}
				}
			}
		}






		console.log("############### We hopefully found some changes, yahoooo.");
	}

	private getRectangleIntersectionArea(a: {x: number, y: number, width: number, height: number},
										b: {x: number, y: number, width: number, height: number}): number {
		let dx = Math.max(0, Math.min(a.x+a.width, b.x+b.width) - Math.max(a.x, b.x));
		let dy = Math.max(0, Math.min(a.y+a.height, b.y+b.height) - Math.max(a.y, b.y));
		let absoluteOverlap = Math.abs(dx) * Math.abs(dy);
		
		let percentageOverlap = Math.max(absoluteOverlap / (a.width*a.height), absoluteOverlap / (b.width, b.height)) / 100;
		return percentageOverlap;
	}

	public exportToDOTLanguage(): string {
		let lfcr = "\r\n";
		let cGreen = "#1ed92d";
		let cRed = "#e32727";
		let cBlack = "#000000";

		let str = "digraph " + this.name.replace(" ", "") + "{" + lfcr;
		for (const el of this.elements.filter(e => e instanceof BPMNNode)) {
			let shape = 'rect';
			if ((el as BPMNNode).type === BPMNNodeType.StartEvent || (el as BPMNNode).type === BPMNNodeType.EndEvent) {
				shape = 'circle';
			} else if ((el as BPMNNode).type === BPMNNodeType.GatewayOR || (el as BPMNNode).type === BPMNNodeType.ComplexGateway ||
			(el as BPMNNode).type === BPMNNodeType.EventBasedGateway || (el as BPMNNode).type === BPMNNodeType.GatewayAND) {
				shape = 'diamond';
			}

			let color = cBlack;
			if (el.getChangeType() === ElementChangeType.Added) {
				color = cGreen;
			} else if(el.getChangeType() === ElementChangeType.Removed){
				color = cRed;
			}

			str += "\t" + el.id + ' [label="' + el.description + '" shape="' + shape + '" color="' + color + '"];' + lfcr;
		}
		console.log(this.elements.filter(e => e instanceof BPMNEdge));
		for (const el of this.elements.filter(e => e instanceof BPMNEdge && e.input && e.output)) {
			let color = cBlack;
			if (el.getChangeType() === ElementChangeType.Added) {
				color = cGreen;
			} else if(el.getChangeType() === ElementChangeType.Removed){
				color = cRed;
			}
			str += "\t" + (el as BPMNEdge).input?.id + ' -> ' + (el as BPMNEdge).output?.id + '[label="' + el.description + '" color="' + color + '"];' + lfcr;
		}
		str += "}" + lfcr;

		return str;
	}
}


export enum ElementChangeType {
	"NONE",
	"Added",
	"Removed",
	"IncreasedTraffic",
	"DecreasedTraffic"
}

export const ElementChangeIconsMapping: Map<ElementChangeType, string> = new Map([
	[ElementChangeType.NONE, ""],
	[ElementChangeType.Added, "/assets/symbols/added512.png"],
	[ElementChangeType.Removed, "/assets/symbols/removed512.png"],
	[ElementChangeType.IncreasedTraffic, "/assets/symbols/increased512.png"],
	[ElementChangeType.DecreasedTraffic, "/assets/symbols/decreased512.png"],
]);



export type BPMNNodeTypeEntry = {
	bpmnIoType: string;
	type: BPMNNodeType;
	iconPaths: string[];
}

export enum BPMNEdgeType {
	"MessageFlow",
	"SequenceFlow"
}

export enum BPMNNodeType {
	"StartEvent",
	"EndEvent",
	"Task",
	"UserTask",
	"SendTask",
	"ReceiveTask",
	"ManualTask",
	"ScriptTask",
	"BusinessRuleTask",
	"ServiceTask",
	"StandardLoopTask",
	"MultiInstanceLoopTaskHorizontal",
	"MultiInstanceLoopTaskVertical",
	"GatewayAND",
	"GatewayOR",
	"ComplexGateway",
	"EventBasedGateway",
	"CallActivity",
	"SubProcess"
}

export const BPMNNodeTypeMappings: BPMNNodeTypeEntry[] = [
	{bpmnIoType: 'bpmn:StartEvent', type: BPMNNodeType.StartEvent, iconPaths: ['']},
	{bpmnIoType: 'bpmn:EndEvent', type: BPMNNodeType.EndEvent, iconPaths: ['']},
	{bpmnIoType: 'bpmn:ExclusiveGateway', type: BPMNNodeType.GatewayOR, iconPaths: ['m 16,15 7.42857142857143,9.714285714285715 -7.42857142857143,9.714285714285715 3.428571428571429,0 5.714285714285715,-7.464228571428572 5.714285714285715,7.464228571428572 3.428571428571429,0 -7.42857142857143,-9.714285714285715 7.42857142857143,-9.714285714285715 -3.428571428571429,0 -5.714285714285715,7.464228571428572 -5.714285714285715,-7.464228571428572 -3.428571428571429,0 z']},
	{bpmnIoType: 'bpmn:ParallelGateway', type: BPMNNodeType.GatewayAND, iconPaths: ['m 23,10 0,12.5 -12.5,0 0,5 12.5,0 0,12.5 5,0 0,-12.5 12.5,0 0,-5 -12.5,0 0,-12.5 -5,0 z']},
	{bpmnIoType: 'bpmn:ComplexGateway', type: BPMNNodeType.ComplexGateway, iconPaths: ['m 23,13 0,7.116788321167883 -5.018248175182482,-5.018248175182482 -3.102189781021898,3.102189781021898 5.018248175182482,5.018248175182482 -7.116788321167883,0 0,4.37956204379562 7.116788321167883,0  -5.018248175182482,5.018248175182482 l 3.102189781021898,3.102189781021898 5.018248175182482,-5.018248175182482 0,7.116788321167883 4.37956204379562,0 0,-7.116788321167883 5.018248175182482,5.018248175182482 3.102189781021898,-3.102189781021898 -5.018248175182482,-5.018248175182482 7.116788321167883,0 0,-4.37956204379562 -7.116788321167883,0 5.018248175182482,-5.018248175182482 -3.102189781021898,-3.102189781021898 -5.018248175182482,5.018248175182482 0,-7.116788321167883 -4.37956204379562,0 z']},
	{bpmnIoType: 'bpmn:EventBasedGateway', type: BPMNNodeType.EventBasedGateway, iconPaths: ['m 18,22 7.363636363636364,-4.909090909090909 7.363636363636364,4.909090909090909 -2.4545454545454546,9.818181818181818 -9.818181818181818,0 z']},
	{bpmnIoType: 'bpmn:Task', type: BPMNNodeType.Task, iconPaths: ['']},
	{bpmnIoType: 'bpmn:BusinessRuleTask', type: BPMNNodeType.BusinessRuleTask, iconPaths: ['m 8,8 0,12 20,0 0,-12 zm 0,8 l 20,0 m -13,-4 l 0,8', 'm 8,8 0,4 20,0 0,-4 z']},
	{bpmnIoType: 'bpmn:UserTask', type: BPMNNodeType.UserTask, iconPaths: ['m 15,12 c 0.909,-0.845 1.594,-2.049 1.594,-3.385 0,-2.554 -1.805,-4.62199999 -4.357,-4.62199999 -2.55199998,0 -4.28799998,2.06799999 -4.28799998,4.62199999 0,1.348 0.974,2.562 1.89599998,3.405 -0.52899998,0.187 -5.669,2.097 -5.794,4.7560005 v 6.718 h 17 v -6.718 c 0,-2.2980005 -5.5279996,-4.5950005 -6.0509996,-4.7760005 zm -8,6 l 0,5.5 m 11,0 l 0,-5']},
	{bpmnIoType: 'bpmn:ManualTask', type: BPMNNodeType.ManualTask, iconPaths: ['m 17,15 c 0.234,-0.01 5.604,0.008 8.029,0.004 0.808,0 1.271,-0.172 1.417,-0.752 0.227,-0.898 -0.334,-1.314 -1.338,-1.316 -2.467,-0.01 -7.886,-0.004 -8.108,-0.004 -0.014,-0.079 0.016,-0.533 0,-0.61 0.195,-0.042 8.507,0.006 9.616,0.002 0.877,-0.007 1.35,-0.438 1.353,-1.208 0.003,-0.768 -0.479,-1.09 -1.35,-1.091 -2.968,-0.002 -9.619,-0.013 -9.619,-0.013 v -0.591 c 0,0 5.052,-0.016 7.225,-0.016 0.888,-0.002 1.354,-0.416 1.351,-1.193 -0.006,-0.761 -0.492,-1.196 -1.361,-1.196 -3.473,-0.005 -10.86,-0.003 -11.0829995,-0.003 -0.022,-0.047 -0.045,-0.094 -0.069,-0.139 0.3939995,-0.319 2.0409995,-1.626 2.4149995,-2.017 0.469,-0.4870005 0.519,-1.1650005 0.162,-1.6040005 -0.414,-0.511 -0.973,-0.5 -1.48,-0.236 -1.4609995,0.764 -6.5999995,3.6430005 -7.7329995,4.2710005 -0.9,0.499 -1.516,1.253 -1.882,2.19 -0.37000002,0.95 -0.17,2.01 -0.166,2.979 0.004,0.718 -0.27300002,1.345 -0.055,2.063 0.629,2.087 2.425,3.312 4.859,3.318 4.6179995,0.014 9.2379995,-0.139 13.8569995,-0.158 0.755,-0.004 1.171,-0.301 1.182,-1.033 0.012,-0.754 -0.423,-0.969 -1.183,-0.973 -1.778,-0.01 -5.824,-0.004 -6.04,-0.004 10e-4,-0.084 0.003,-0.586 10e-4,-0.67 z']},
	{bpmnIoType: 'bpmn:SendTask', type: BPMNNodeType.SendTask, iconPaths: ['m 5.984999999999999,4.997999999999999 l 0,14 l 21,0 l 0,-14 z l 10.5,6 l 10.5,-6']},
	{bpmnIoType: 'bpmn:ReceiveTask', type: BPMNNodeType.ReceiveTask, iconPaths: ['m 6.3,5.6000000000000005 l 0,12.6 l 18.900000000000002,0 l 0,-12.6 z l 9.450000000000001,5.4 l 9.450000000000001,-5.4']},
	{bpmnIoType: 'bpmn:ServiceTask', type: BPMNNodeType.ServiceTask, iconPaths: ['m 12,18 v -1.71335 c 0.352326,-0.0705 0.703932,-0.17838 1.047628,-0.32133 0.344416,-0.14465 0.665822,-0.32133 0.966377,-0.52145 l 1.19431,1.18005 1.567487,-1.57688 -1.195028,-1.18014 c 0.403376,-0.61394 0.683079,-1.29908 0.825447,-2.01824 l 1.622133,-0.01 v -2.2196 l -1.636514,0.01 c -0.07333,-0.35153 -0.178319,-0.70024 -0.323564,-1.04372 -0.145244,-0.34406 -0.321407,-0.6644 -0.522735,-0.96217 l 1.131035,-1.13631 -1.583305,-1.56293 -1.129598,1.13589 c -0.614052,-0.40108 -1.302883,-0.68093 -2.022633,-0.82247 l 0.0093,-1.61852 h -2.241173 l 0.0042,1.63124 c -0.353763,0.0736 -0.705369,0.17977 -1.049785,0.32371 -0.344415,0.14437 -0.665102,0.32092 -0.9635006,0.52046 l -1.1698628,-1.15823 -1.5667691,1.5792 1.1684265,1.15669 c -0.4026573,0.61283 -0.68308,1.29797 -0.8247287,2.01713 l -1.6588041,0.003 v 2.22174 l 1.6724648,-0.006 c 0.073327,0.35077 0.1797598,0.70243 0.3242851,1.04472 0.1452428,0.34448 0.3214064,0.6644 0.5227339,0.96066 l -1.1993431,1.19723 1.5840256,1.56011 1.1964668,-1.19348 c 0.6140517,0.40346 1.3028827,0.68232 2.0233517,0.82331 l 7.19e-4,1.69892 h 2.226848 z m 0.221462,-3.9957 c -1.788948,0.7502 -3.8576,-0.0928 -4.6097055,-1.87438 -0.7521065,-1.78321 0.090598,-3.84627 1.8802645,-4.59604 1.78823,-0.74936 3.856881,0.0929 4.608987,1.87437 0.752106,1.78165 -0.0906,3.84612 -1.879546,4.59605 z', 'm 17,22 v -1.71335 c 0.352326,-0.0705 0.703932,-0.17838 1.047628,-0.32133 0.344416,-0.14465 0.665822,-0.32133 0.966377,-0.52145 l 1.19431,1.18005 1.567487,-1.57688 -1.195028,-1.18014 c 0.403376,-0.61394 0.683079,-1.29908 0.825447,-2.01824 l 1.622133,-0.01 v -2.2196 l -1.636514,0.01 c -0.07333,-0.35153 -0.178319,-0.70024 -0.323564,-1.04372 -0.145244,-0.34406 -0.321407,-0.6644 -0.522735,-0.96217 l 1.131035,-1.13631 -1.583305,-1.56293 -1.129598,1.13589 c -0.614052,-0.40108 -1.302883,-0.68093 -2.022633,-0.82247 l 0.0093,-1.61852 h -2.241173 l 0.0042,1.63124 c -0.353763,0.0736 -0.705369,0.17977 -1.049785,0.32371 -0.344415,0.14437 -0.665102,0.32092 -0.9635006,0.52046 l -1.1698628,-1.15823 -1.5667691,1.5792 1.1684265,1.15669 c -0.4026573,0.61283 -0.68308,1.29797 -0.8247287,2.01713 l -1.6588041,0.003 v 2.22174 l 1.6724648,-0.006 c 0.073327,0.35077 0.1797598,0.70243 0.3242851,1.04472 0.1452428,0.34448 0.3214064,0.6644 0.5227339,0.96066 l -1.1993431,1.19723 1.5840256,1.56011 1.1964668,-1.19348 c 0.6140517,0.40346 1.3028827,0.68232 2.0233517,0.82331 l 7.19e-4,1.69892 h 2.226848 z m 0.221462,-3.9957 c -1.788948,0.7502 -3.8576,-0.0928 -4.6097055,-1.87438 -0.7521065,-1.78321 0.090598,-3.84627 1.8802645,-4.59604 1.78823,-0.74936 3.856881,0.0929 4.608987,1.87437 0.752106,1.78165 -0.0906,3.84612 -1.879546,4.59605 z']},
	{bpmnIoType: 'bpmn:ScriptTask', type: BPMNNodeType.ScriptTask, iconPaths: ['m 15,20 c 9.966553,-6.27276 -8.000926,-7.91932 2.968968,-14.938 l -8.802728,0 c -10.969894,7.01868 6.997585,8.66524 -2.968967,14.938 z m -7,-12 l 5,0 m -4.5,3 l 4.5,0 m -3,3 l 5,0m -4,3 l 5,0']},
	{bpmnIoType: 'bpmn:CallActivity', type: BPMNNodeType.CallActivity, iconPaths: ['m42.5,60 m 7,2 l 0,10 m -5,-5 l 10,0']},
	{bpmnIoType: 'bpmn:SubProcess', type: BPMNNodeType.SubProcess, iconPaths: []},
	{bpmnIoType: 'bpmn:StandardLoopCharacteristics', type: BPMNNodeType.StandardLoopTask, iconPaths: ['m 50,73 c 3.526979,0 6.386161,-2.829858 6.386161,-6.320661 0,-3.490806 -2.859182,-6.320661 -6.386161,-6.320661 -3.526978,0 -6.38616,2.829855 -6.38616,6.320661 0,1.745402 0.714797,3.325567 1.870463,4.469381 0.577834,0.571908 1.265885,1.034728 2.029916,1.35457 l -0.718163,-3.909793 m 0.718163,3.909793 -3.885211,0.802902']},
	{bpmnIoType: 'bpmn:MultiInstanceLoopCharacteristics,isSequential:true', type: BPMNNodeType.MultiInstanceLoopTaskVertical, iconPaths: ['m47,61 m 0,3 l 10,0 m -10,3 l 10,0 m -10,3 l 10,0']},
	{bpmnIoType: 'bpmn:MultiInstanceLoopCharacteristics,isSequential:false', type: BPMNNodeType.MultiInstanceLoopTaskHorizontal, iconPaths: ['m44,60 m 3,2 l 0,10 m 3,-10 l 0,10 m 3,-10 l 0,10']},
];


export interface DiagramRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface DiagramLine {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

export interface DiagramPath {
	waypoints: {x: number, y: number}[];
}

export abstract class BPMNElement {
	lastChangedISO: string = new Date().toISOString();
	description: string = "";
	//styleConfig: ElementStyleConfig;
	traffic: number = 0;
	id: string;
	svg: SVGElement | null = null;

	private changeType: ElementChangeType;

	constructor(id: string) {
		this.id = id;
		this.changeType = ElementChangeType.NONE;
	}

	public getChangeType(): ElementChangeType {
		return this.changeType;
	}

	public hasChanged(): boolean {
		return this.changeType !== ElementChangeType.NONE;
	}

	public setChange(changeType: ElementChangeType) {
		let elementsTostyle = [];
		this.changeType = changeType;
		let config: ElementStyleConfig = {
			fill: "none",
			stroke: "black",
			strokeWidth: "3px",
			indicatorIcon: ElementChangeIconsMapping.get(this.changeType) ?? ''
		}

		if (this.svg) {
			if (this.changeType === ElementChangeType.Added) {
				config.fill = 'rgba(30, 217, 45, 0.7)';
				config.stroke = 'rgba(13, 115, 21, 1.0)';
				config.strokeWidth = "9px";
			} else if (this.changeType === ElementChangeType.Removed) {
				config.fill = 'rgba(227, 39, 39, 0.7)';
				config.stroke = 'rgba(112, 2, 2, 1.0)';
				config.strokeWidth = "9px";
			}

			if (this instanceof BPMNEdge) {
				config.fill = 'none';
			} else if(this instanceof BPMNParticipant) {
				config.fill = 'none';
			}

			// set style to each child which has styler class.
			this.svg?.childNodes.forEach((value, key, parent) => {
				let clist = (value as SVGElement).classList;

				if (clist.contains('styler')) {
					(value as SVGElement).style.fill = config.fill;
					(value as SVGElement).style.stroke = config.stroke;
					if ( (value as SVGElement).tagName !== 'path' || this instanceof BPMNEdge) {
						(value as SVGElement).style.strokeWidth = config.strokeWidth;
					}
				} else if(clist.contains('change-icon')) {
					(value as SVGImageElement).setAttributeNS('http://www.w3.org/1999/xlink', "xlink:href", config.indicatorIcon);
				}
			});
		} else {
			console.warn("Element has no svg to style.", this.id);
		}
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
	type: BPMNEdgeType;
	output: BPMNNode | null = null;
	input: BPMNNode | null = null;

	constructor(id: string, type: BPMNEdgeType) {
		super(id);
		this.type = type;
		this.diagramShape = {
			waypoints: []
		}
	}
}

export class BPMNParticipant extends BPMNElement {
	diagramShape: DiagramRect;
	diagramLine: DiagramLine;

	constructor(id: string, shape: DiagramRect) {
		super(id);
		this.diagramShape = shape;
		this.diagramLine = {
			x1: 30, y1: 0,
			x2: 30, y2: shape.height
		};
	}
}

export class BPMNTextAnnotation extends BPMNElement {
	diagramShape: DiagramRect;

	constructor(id: string, shape: DiagramRect = {x: 0, y: 0, width: 100, height: 80}) {
		super(id);
		this.diagramShape = shape;
	}
}

export interface ElementStyleConfig {
	fill: string;
	stroke: string;
	strokeWidth: string;
	indicatorIcon: string;
}