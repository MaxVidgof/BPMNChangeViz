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
import { BPMNEdge, BPMNEdgeType, BPMNElement, BPMNEventDefinitionMappings, BPMNNode, BPMNNodeType, BPMNNodeTypeMappings, BPMNParticipant, BPMNTextAnnotation, ElementChangeType, ProcessChangeModel } from '../lib/process-change-model';
import { take } from 'rxjs';
import { readyException } from 'jquery';

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

	/**
	 * Initializes a ProcessChangeModel with given XML and SVG Container.
	 *
	 * @param xml the xml string according to BPMN 2.0 specification.
	 * @param svgContainer the svg container embedded in the DOM for rendering.
	 * @returns the initialized ProcessChangeModel when successful. Returns null if it was not successful, e.g. because of invalid BPMN format.
	 */
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

			const pcm = new ProcessChangeModel('AwesomeProcess', svgContainer, moddle);

			//create a promise to store actions we want to execute later.
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

					//set output and input in the promise
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

					if (el.eventDefinitions && el.eventDefinitions.length > 0) {
						(toAdd as BPMNNode).eventDefinition = BPMNEventDefinitionMappings.find(ee => ee.bpmnIoEventType === el.eventDefinitions[0].$type)?.type ?? null;
					}

					// set outputs and inputs in the promise.
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

	private downloadStringAsFile(filename: string, text: string): void {

		var element = document.createElement('a');
		element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
		element.setAttribute('download', filename);
		element.style.display = 'none';
		document.body.appendChild(element);
		
		element.click();
		document.body.removeChild(element);
	}

	/**
	 * Does a simple HTTP GET request.
	 *
	 * @param url the url to be called.
	 * @returns an object cast to the generic type argument.
	 */
	private async doSimpleGETRequest<T>(url: string): Promise<T> {
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

			if (!fileEl1) {
				throw new Error('Container is not ready.');
			}

			if (this.pcmBefore) {
				this.pcmBefore.destroy();
			}
			this.pcmBefore = await this.initProcessChangeModelFromXML(str, containerProcessBefore);

			if (!this.pcmBefore) {
				fileEl1.className = fileEl1?.className.replace(/is\-(in)*valid/, "is-invalid");
			} else {
				fileEl1.className = fileEl1.className.replace(/is\-(in)*valid/, "is-valid");
			}
		});
		this.addFileInputEventListener(fileEl2, async (str) => {
			
			if (!fileEl2) {
				throw new Error('Container is not ready.');
			}

			if (this.pcmAfter) {
				this.pcmAfter.destroy();
			}
			this.pcmAfter = await this.initProcessChangeModelFromXML(str, containerProcessAfter);
			if (!this.pcmAfter) {
				fileEl2.className = fileEl2?.className.replace(/is\-(in)*valid/, "is-invalid");
			} else {
				fileEl2.className = fileEl2?.className.replace(/is\-(in)*valid/, "is-valid");
			}
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
			let lowerSec = document.getElementById('change-vis-lower-section');
			if (lowerSec) {
				lowerSec.style['display'] = "";
			}
			resolve();
		});
	}

	
	//download .dot file
	public exportAsDOT(): void {
		this.downloadStringAsFile(this.pcmFinal?.name + ".dot", this.pcmFinal?.exportToDOTLanguage() ?? '');
	}

	//download delta json file
	public exportDelta(): void {
		this.downloadStringAsFile(this.pcmFinal?.name + ".delta.json", this.pcmFinal?.getDeltaInfoExport() ?? '');
	}


	//download svg file
	public exportAsSVG(): void {

		let svgContainer = document.getElementById("mySVGFinal");
		if (svgContainer) {
			this.downloadStringAsFile(this.pcmFinal?.name + ".svg", this.pcmFinal?.getSVGContent() ?? '');
		}

		// TODO: for future: finally export our process again maybe with the moddle
		/*
		const ourProcess = this.pcmFinal?.moddleObj.rootElement.get('diagrams')[0].plane.bpmnElement;
		ourProcess.set('lastChangeISO', new Date().toISOString());
		const exported = await this.moddle.toXML(this.moddle.rootElement);
		console.log('Exporting our extended MetaModel to XML with moddle:', exported);
		*/
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
		if (this.pcmBefore) {
			this.pcmBefore.destroy();
		}
		if (this.pcmAfter) {
			this.pcmAfter.destroy();
		}
	}
}
