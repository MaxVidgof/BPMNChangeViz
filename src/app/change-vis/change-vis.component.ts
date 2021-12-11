import { Component, OnDestroy, OnInit } from '@angular/core';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Options, Data, DataSetNodes } from 'vis-network';
import { Network } from "vis-network/peer/esm/vis-network";
import { DataSet } from "vis-data/peer/esm/vis-data"

// Bpmn js
import * as BpmnModdle from 'bpmn-moddle/dist/bpmn-moddle.umd.prod.js';
import * as CamundaModdle from 'camunda-bpmn-moddle';
import * as BpmnModeler from 'bpmn-js/dist/bpmn-modeler.production.min.js';
//import * as BpmnViewer from 'bpmn-js/dist/bpmn-navigated-viewer.production.min.js';


import ctExtension from '../lib/meta-model-extension.json';
import { BPMNEdge, BPMNElement, BPMNNode, BPMNNodeType, BPMNNodeTypeMappings, BPMNParticipant, BPMNTextAnnotation, ElementChangeType, ProcessChangeModel } from '../lib/process-change-model';
import { take } from 'rxjs';

@Component({
	selector: 'app-change-vis',
	templateUrl: './change-vis.component.html'
})
export class ChangeVisComponent implements OnInit, OnDestroy {

	pcmBefore: ProcessChangeModel | null = null;
	pcmAfter: ProcessChangeModel | null = null;

	loading: boolean = true;

	constructor(private http: HttpClient) { }

	public initProcessChangeModelsFromXML = async (xmlProcessBefore: string, xmlProcessAfter: string): Promise<void> => {
		
		// Search the SVG and create our own model with the SVG container.
		const containerProcessBefore = document.getElementById("mySVGBefore");
		const containerProcessAfter = document.getElementById("mySVGAfter");

		if (!containerProcessBefore || !containerProcessAfter) {
			throw new Error('there is at least 1 SVG container missing for the two processes.');
		}

		// create bpmn moddle
		let moddle = new BpmnModdle({
			moddleExtensions: {
				ct: ctExtension,
				camunda: CamundaModdle
			}
		});

		// TODO try to parse moddle. if it doesnt work show error to user.
		const processBefore = await moddle.fromXML(xmlProcessBefore);
		const processAfter = await moddle.fromXML(xmlProcessAfter);

		const pcmBefore = await this.buildProcessChangeModelFromModdle(processBefore, containerProcessBefore);
		const pcmAfter = await this.buildProcessChangeModelFromModdle(processAfter, containerProcessAfter);

		console.log(pcmBefore);

		// TODO: for future: finally export our process again maybe with the moddle
		const ourProcess = processBefore.rootElement.get('diagrams')[0].plane.bpmnElement;
		ourProcess.set('lastChangeISO', new Date().toISOString());
		const exported = await moddle.toXML(processBefore.rootElement);
		console.log('Exporting our extended MetaModel to XML with moddle:', exported);
	}

	public buildProcessChangeModelFromModdle = async (moddle: any, svgContainer: HTMLElement): Promise<ProcessChangeModel> => {

		const corrDiagramElements = moddle.rootElement.get('diagrams')[0].plane.planeElement;

		console.log('diagram objects in moddle', corrDiagramElements);

		const pcm = new ProcessChangeModel('Deine Mutter', svgContainer, moddle);

		let stuffTodoAfterElementsWereAdded: (() => Promise<void>)[] = [];

		for (const element of corrDiagramElements) {
			let toAdd: BPMNElement | null = null;
			const el = element.bpmnElement;
			const corrDiaElement = element;

			//already get type in case its a node.
			let nodeType = BPMNNodeTypeMappings.find(m => m.bpmnIoType === el.$type)?.type;

			// if the element has loopCharacteristics, bpmn-js is trying to tell us that those are some repetition tasks.
			if (el.loopCharacteristics !== undefined) {

				const mappedTypes = BPMNNodeTypeMappings.filter(m => m.bpmnIoType.indexOf(el.loopCharacteristics.$type) >= 0);
				if (mappedTypes.length > 1) {
					for (const t of mappedTypes) {
						let condition = t.bpmnIoType.split(",")[1];
						let variabbl = condition.split(":")[0];
						let conditionRequiringValue = condition.split(":")[1];
						let havingValue = el.loopCharacteristics[variabbl];

						if ((""+havingValue) == conditionRequiringValue) {
							nodeType = t.type;
						}
					}
				} else if (mappedTypes.length === 1) {
					nodeType = mappedTypes[0].type;
				}
			}

			if (el.$type === 'bpmn:SequenceFlow') {
				toAdd = new BPMNEdge(el.id);

				//waypoints are absolute in bpmn-js
				(toAdd as BPMNEdge).diagramShape.waypoints = corrDiaElement.waypoint;

				let idInput = corrDiaElement.bpmnElement.sourceRef?.id;
				let idOutput = corrDiaElement.bpmnElement.targetRef?.id;
				let pr = (): Promise<void> => { return new Promise<void>(async (resolve, reject) => {
					(toAdd as BPMNEdge).input = pcm.getElements().filter(el => el instanceof BPMNNode).find(n => n.id === idInput) as BPMNNode ?? null;
					(toAdd as BPMNEdge).output = pcm.getElements().filter(el => el instanceof BPMNNode).find(n => n.id === idOutput) as BPMNNode ?? null;
					resolve();
				})};
				stuffTodoAfterElementsWereAdded.push(pr);
			} else if (el.$type === 'bpmn:TextAnnotation') {
				toAdd = new BPMNTextAnnotation(el.id);
				(toAdd as BPMNTextAnnotation).diagramShape = corrDiaElement.bounds;
				(toAdd as BPMNTextAnnotation).description = el.text ?? '';
			} else if (el.$type === 'bpmn:Participant') {
				toAdd = new BPMNParticipant(el.id, corrDiaElement.bounds);
				(toAdd as BPMNParticipant).description = el.name ?? '';
			} else if (nodeType !== null && nodeType !== undefined){
				toAdd = new BPMNNode(el.id, nodeType);
				(toAdd as BPMNNode).diagramShape = corrDiaElement.bounds;
				(toAdd as BPMNNode).description = corrDiaElement.bpmnElement.name ?? '';

				let idsInput = (el.incoming ?? []).map(el => el.id);
				let idsOutput = (el.outgoing ?? []).map(el => el.id);
				let pr = (): Promise<void> => { return new Promise((resolve, reject) => {
					(toAdd as BPMNNode).inputs = pcm.getElements().filter(el => el instanceof BPMNEdge).filter(el => idsInput.indexOf(el.id) >= 0) as BPMNEdge[] ?? null;
					(toAdd as BPMNNode).outputs = pcm.getElements().filter(el => el instanceof BPMNEdge).filter(el => idsOutput.indexOf(el.id) >= 0) as BPMNEdge[] ?? null;
					resolve();
				})};
				stuffTodoAfterElementsWereAdded.push(pr);
			}


			if (toAdd !== null) {
				pcm.addElement(toAdd);
			}


		}

		console.log(pcm.getElements().length);
		for (const pr of stuffTodoAfterElementsWereAdded) {
			pr();
		}
		await Promise.all(stuffTodoAfterElementsWereAdded);



		// TEST
		console.log("################################");
		[0, 2, 4, 7, 8, 15, 18, 20, 24].forEach(ind => pcm.getElements()[ind].setChange(ElementChangeType.Added));
		[2, 3, 9, 12, 17, 19, 25].forEach(ind => pcm.getElements()[ind].setChange(ElementChangeType.Removed));

		console.log(pcm.exportToDOTLanguage());


		return pcm;
	}

	public async testBpmnViewer(xml: string): Promise<void> {
	
		let modeler = new BpmnModeler({
			container: '#myBpmnNetwork',
			additionalModules: [
			]
		});

		modeler.importXML(xml, (err) => {

			if (err) {
				console.log('error rendering', err);
			} else {
				console.log('rendered');
			}


			//remove the annoying link bottom right in BpmnViewer.
			let linkElements = document.getElementsByClassName('bjs-powered-by');
			let overlayElements = document.getElementsByClassName('djs-overlays');
			let paletteElements = document.getElementsByClassName('djs-palette');
			Array.from(linkElements).forEach(el => {
				el.remove();
			});

				
			const elementRegistry = modeler.get('elementRegistry');
			const elementFactory = modeler.get('elementFactory');
			const modeling = modeler.get('modeling');
			const popupMenu = modeler.get('popupMenu');
			const contextPadProvider = modeler.get('contextPadProvider');
			const overlays = modeler.get('overlays');	// should also be available in viewer

			const elements = elementRegistry.getAll();

			modeling.setColor([elements[1], elements[3]], {
				fill: 'green',
				stroke: 'red',
			});

		});

	}

	async doSimpleGETRequest<T>(url: string): Promise<T> {
		return new Promise((resolve, reject) => {
			this.http.get(url,  
			{  
				headers: new HttpHeaders()  
				.set('Content-Type', 'text/xml')  
				.append('Access-Control-Allow-Methods', 'GET')  
				.append('Access-Control-Allow-Origin', '*')  
				.append('Access-Control-Allow-Headers', "Access-Control-Allow-Headers, Access-Control-Allow-Origin, Access-Control-Request-Method"),  
				responseType: 'text'  
			}).pipe(take(1)).subscribe((str: any) => {
				resolve(str)
			}, (error: any) => {
				throw new Error(error);
			});
		});
	}

	async ngOnInit(): Promise<void> {

		let svg = document.getElementById('deineMutter');
		

		// read bpmn file
		let myTestXml = '';
		let myTestXml2 = '';

		myTestXml = await this.doSimpleGETRequest('/assets/test-process-bigger.bpmn');
		myTestXml2 = await this.doSimpleGETRequest('/assets/test-process-bigger.bpmn');

		// bpmn-js
		await this.testBpmnViewer(myTestXml2);

		//init our two SVGs with the two XMLs.
		await this.initProcessChangeModelsFromXML(myTestXml, myTestXml2);

		this.loading = false;
	}

	ngOnDestroy(): void {

	}
}
