import { Component, ComponentFactoryResolver, OnDestroy, OnInit } from '@angular/core';
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
import { BPMNEdge, BPMNEdgeType, BPMNElement, BPMNNode, BPMNNodeType, BPMNNodeTypeMappings, BPMNParticipant, BPMNTextAnnotation, ElementChangeType, ProcessChangeModel } from '../lib/process-change-model';
import { take } from 'rxjs';

@Component({
	selector: 'app-change-vis',
	templateUrl: './change-vis.component.html'
})
export class ChangeVisComponent implements OnInit, OnDestroy {

	pcmBefore: ProcessChangeModel | null = null;
	pcmAfter: ProcessChangeModel | null = null;
	pcmFinal: ProcessChangeModel | null = null;

	loading: boolean = false;
	moddle: any | null = null;

	constructor(private http: HttpClient) {
		// create bpmn moddle
		this.moddle = new BpmnModdle({
			moddleExtensions: {
				ct: ctExtension,
				camunda: CamundaModdle
			}
		});
	}

	public initProcessChangeModelFromXML = async (xml: string, svgContainer: HTMLElement): Promise<ProcessChangeModel | null> => {
	
		return new Promise(async (resolve, reject) => {

			let pcm: ProcessChangeModel | null = null;
			try {

				const process = await this.moddle.fromXML(xml);
				
				pcm = await this.buildProcessChangeModelFromModdle(process, svgContainer);
				
				pcm.originalXml = xml;
				
			} catch(e) {
				console.warn('this process could not be read/created. Please check it for valid BPMN2.0 specification.');
			}
			
			resolve(pcm);
		});
	}

	public buildProcessChangeModelFromModdle = async (moddle: any, svgContainer: HTMLElement): Promise<ProcessChangeModel> => {

		return new Promise(async (resolve, reject) => {

			const corrDiagramElements = moddle.rootElement.get('diagrams')[0].plane.planeElement;

			console.log('diagram objects in moddle', corrDiagramElements);

			const pcm = new ProcessChangeModel('AwesomeProcess', svgContainer, moddle);

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

				if (el.$type === 'bpmn:SequenceFlow' || el.$type === 'bpmn:MessageFlow') {
					const typ = el.$type === 'bpmn:SequenceFlow' ? BPMNEdgeType.SequenceFlow : BPMNEdgeType.MessageFlow;
					toAdd = new BPMNEdge(el.id, typ);

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

			for (const pr of stuffTodoAfterElementsWereAdded) {
				pr();
			}
			await Promise.all(stuffTodoAfterElementsWereAdded);

			resolve(pcm);
		});
	}

	public downloadStringAsFile(filename: string, text: string): void {

		var element = document.createElement('a');
		element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
		element.setAttribute('download', filename);
		element.style.display = 'none';
		document.body.appendChild(element);
		
		element.click();
		document.body.removeChild(element);
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

		// read local bpmn file
		//let myTestXml = await this.doSimpleGETRequest('/assets/event-planning-process.bpmn');
		//let myTestXml2 = await this.doSimpleGETRequest('/assets/event-planning-process-changed.bpmn');

		// bpmn-js, TODO: remove
		//await this.testBpmnViewer(myTestXml2);


		// search file input elements
		let fileEl1 = document.getElementById('processBeforeFile');
		let fileEl2 = document.getElementById('processAfterFile');
		// Search the SVG elements
		const containerProcessBefore = document.getElementById("mySVGBefore");
		const containerProcessAfter = document.getElementById("mySVGAfter");

		if (!fileEl1 || !fileEl2) {
			throw new Error("was soll des. One of the two process file input ids is not existent.");
		}
		if (!containerProcessBefore || !containerProcessAfter) {
			throw new Error("was soll des. One of the two process svg ids is not existent.");
		}
		this.addFileInputEventListener(fileEl1, async (str) => {
			this.pcmBefore = await this.initProcessChangeModelFromXML(str, containerProcessBefore);
		});
		this.addFileInputEventListener(fileEl2, async (str) => {
			this.pcmAfter = await this.initProcessChangeModelFromXML(str, containerProcessAfter);
		});
	}

	public async calculateChangesAndVisualize(): Promise<void> {

		return new Promise(async (resolve, reject) => {

			this.loading = true;
			const containerProcessFinal = document.getElementById("mySVGFinal");

			if (!this.pcmBefore || !this.pcmAfter || !containerProcessFinal) {
				console.warn("One of the two processes is not initialized yet! Or the svg container is not there.");
			} else {

				if (this.pcmFinal) {
					this.pcmFinal.destroy();
				}
				this.pcmFinal = await this.initProcessChangeModelFromXML(this.pcmAfter.originalXml, containerProcessFinal);
				
				// Test check for changes.
				this.pcmFinal?.takeOverAndNoteChangesFromEarlierProcessChangeModel(this.pcmBefore);
			}
			
			this.loading = false;
			resolve();
		});
	}

	public async export(): Promise<void> {
		
		this.loading = true;

		//download.
		this.downloadStringAsFile(this.pcmFinal?.name + ".dot", this.pcmFinal?.exportToDOTLanguage() ?? '');

		// TODO: for future: finally export our process again maybe with the moddle
		const ourProcess = this.moddle.rootElement.get('diagrams')[0].plane.bpmnElement;
		ourProcess.set('lastChangeISO', new Date().toISOString());
		const exported = await this.moddle.toXML(this.moddle.rootElement);
		console.log('Exporting our extended MetaModel to XML with moddle:', exported);
	}

	private addFileInputEventListener(el: HTMLElement, callback: (fileContent: string) => void) {
		el.addEventListener('change', (event) => {
			let file = (event?.target as any).files[0];

			if (file) {
				let fr = new FileReader();
				fr.onload = () => {
					callback(fr.result as string);
				};
			
				fr.onerror = () => {
					console.warn(fr.error);
				};
				fr.readAsText(file);
			}
		});
	}

	ngOnDestroy(): void {

	}
}
