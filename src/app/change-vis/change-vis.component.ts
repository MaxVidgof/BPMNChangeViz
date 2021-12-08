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
import { BPMNEdge, BPMNElement, BPMNNode, BPMNNodeType, BPMNNodeTypeMappings, ProcessChangeModel } from '../lib/process-change-model';
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
		if (moddle.rootElement.get('rootElements').length <= 0) {
			throw new Error('there is not even a single process defined.');
		}
		const ourProcess = moddle.rootElement.get('diagrams')[0].plane.bpmnElement;
		const corrDiagramElements = moddle.rootElement.get('diagrams')[0].plane.planeElement;

		console.log('our process in moddle', ourProcess);
		console.log('diagram objects in moddle', corrDiagramElements);

		const pcm = new ProcessChangeModel(svgContainer);

		let stuffTodoAfterElementsWereAdded: Promise<void>[] = [];

		for (const element of corrDiagramElements) {
			let toAdd: BPMNElement | null = null;
			const el = element.bpmnElement;
			const corrDiaElement = element;

			//already get type in case its a node.
			let nodeType = BPMNNodeTypeMappings.find(m => m.bpmnIoType === el.$type)?.type;

			if (el.$type === 'bpmn:SequenceFlow') {
				toAdd = new BPMNEdge(el.id);
				(toAdd as BPMNEdge).diagramShape.waypoints = corrDiaElement.waypoint;

				let idInput = corrDiaElement.bpmnElement.sourceRef?.id;
				let idOutput = corrDiaElement.bpmnElement.sourceRef?.id;
				stuffTodoAfterElementsWereAdded.push(new Promise((resolve, reject) => {
					(toAdd as BPMNEdge).input = pcm.getElements().filter(el => el instanceof BPMNNode).find(el => el.id === idInput) as BPMNNode ?? null;
					(toAdd as BPMNEdge).output = pcm.getElements().filter(el => el instanceof BPMNNode).find(el => el.id === idOutput) as BPMNNode ?? null;
					resolve();
				}));
				

			} else if (nodeType){
				toAdd = new BPMNNode(el.id, nodeType);
				(toAdd as BPMNNode).diagramShape = corrDiaElement.bounds;
				(toAdd as BPMNNode).description = corrDiaElement.bpmnElement.name ?? '';
			}

			if (toAdd !== null) {
				pcm.addElement(toAdd);
			}
		}

		await Promise.all(stuffTodoAfterElementsWereAdded);

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
			console.log('we have so many elements', elements.length, elements[3]);

			modeling.setColor([elements[1], elements[3]], {
				fill: 'green',
				stroke: 'red',
			});

		});

	}

	async ngOnInit(): Promise<void> {


		// read bpmn file
		let myTestXml = '';
		let myTestXml2 = '';
		this.http.get('/assets/test-process.bpmn',  
		{  
			headers: new HttpHeaders()  
			.set('Content-Type', 'text/xml')  
			.append('Access-Control-Allow-Methods', 'GET')  
			.append('Access-Control-Allow-Origin', '*')  
			.append('Access-Control-Allow-Headers', "Access-Control-Allow-Headers, Access-Control-Allow-Origin, Access-Control-Request-Method"),  
			responseType: 'text'  
		}).pipe(take(1)).subscribe(async (str) => {
			myTestXml = str;

			this.http.get('/assets/test-process-medium.bpmn',  
			{  
				headers: new HttpHeaders()  
				.set('Content-Type', 'text/xml')  
				.append('Access-Control-Allow-Methods', 'GET')  
				.append('Access-Control-Allow-Origin', '*')  
				.append('Access-Control-Allow-Headers', "Access-Control-Allow-Headers, Access-Control-Allow-Origin, Access-Control-Request-Method"),  
				responseType: 'text'  
			}).pipe(take(1)).subscribe(async (str2) => {
					
				myTestXml2 = str2;
				console.log('we read in a text xml string. that is', myTestXml);

				// bpmn-js
				await this.testBpmnViewer(myTestXml2);

				//init our two SVGs with the two XMLs.
				await this.initProcessChangeModelsFromXML(myTestXml, myTestXml2);

				this.loading = false;

			}, (error: any) => {
				throw new Error(error);
			});

		}, (error: any) => {
			throw new Error(error);
		});

	}

	ngOnDestroy(): void {

	}
}
