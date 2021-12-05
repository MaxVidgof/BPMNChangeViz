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
import CustomRenderer from '../lib/custom-renderer';
import { BPMNEdge, BPMNElement, BPMNNode, BPMNNodeType, ProcessChangeModel } from '../lib/process-change-model';
import { take } from 'rxjs';

@Component({
	selector: 'app-change-vis',
	templateUrl: './change-vis.component.html'
})
export class ChangeVisComponent implements OnInit, OnDestroy {

	// Vis network
	network: Network | null = null;
	nodes: DataSet<any> | null = null;

	//inject angular's httpclient in this component
	constructor(private http: HttpClient) { }

	public testCustomSVG = async (xml: string): Promise<void> => {
		
		// Search the SVG and create our own model with the SVG container.
		const container = document.getElementById("mySVG");
		if (container == null) {
			throw new Error("There is no svg container.");
		}
		const pcm = new ProcessChangeModel(container);


		// create bpmn moddle
		let moddle = new BpmnModdle({
			moddleExtensions: {
				ct: ctExtension,
				camunda: CamundaModdle
			}
		});
		const thingy = await moddle.fromXML(xml);
		if (thingy.rootElement.get('rootElements').length <= 0) {
			throw new Error('there is not even a single process defined.');
		}
		const ourProcess = thingy.rootElement.get('diagrams')[0].plane.bpmnElement;
		const corrDiagramElements = thingy.rootElement.get('diagrams')[0].plane.planeElement;

		console.log('our process in moddle', ourProcess);
		console.log('diagram objects in moddle', corrDiagramElements);

		// loop over the elements of the moddle and create SVG elements.
		for (const el of ourProcess.flowElements) {
			let toAdd: BPMNElement | null = null;
			const corrDiaElement = el.$type === 'bpmn:StartEvent' ?
				corrDiagramElements.find(ele => ele.id.toLowerCase().indexOf('startevent') >= 0)
				: corrDiagramElements.find(ele => ele.id.replace("_di", "") === el.id);

			if (el.$type === 'bpmn:StartEvent') {
				toAdd = new BPMNNode(el.id, BPMNNodeType.StartEvent);
				(toAdd as BPMNNode).diagramShape = corrDiaElement.bounds;
			} else if (el.$type === 'bpmn:Task') {
				toAdd = new BPMNNode(el.id, BPMNNodeType.Task);
				(toAdd as BPMNNode).diagramShape = corrDiaElement.bounds;
			} if (el.$type === 'bpmn:SequenceFlow') {
				toAdd = new BPMNEdge(el.id);
				(toAdd as BPMNEdge).diagramShape.waypoints = corrDiaElement.waypoint;
			} else if (el.$type === 'bpmn:ExclusiveGateway') {
				// TODO
			}

			if (toAdd !== null) {
				pcm.addElement(toAdd);
			}
		}


		// finally export our process again maybe with the moddle
		ourProcess.set('lastChangeISO', new Date().toISOString());
		const exported = await moddle.toXML(thingy.rootElement);
		console.log('Exporting our extended MetaModel to XML with moddle:', exported);
	}

	public async testBpmnViewer(xml: string): Promise<void> {
	
		let modeler = new BpmnModeler({
			container: '#myBpmnNetwork',
			additionalModules: [
				CustomRenderer
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

				
			console.log('we read in a text xml string. that is', myTestXml);

			// bpmn-js
			await this.testBpmnViewer(myTestXml);

			//our SVG
			await this.testCustomSVG(myTestXml);

			// test vis-network
			// vis-network
			var container = document.getElementById("mynetwork");
			if (container instanceof HTMLElement) {
				this.initializeNetworkInDiv(container);
			}
		}, (error: any) => {
			throw new Error(error);
		});

	}

	ngOnDestroy(): void {
		if (this.network) {
			this.network.destroy();
		}
		this.network = null;
	}

	//vis-network
	public initializeNetworkInDiv(element: HTMLElement) {

		// create an array with nodes
		this.nodes = new DataSet([
			{ id: 1, font: "10px arial black", label: "Activity 1 \n\n Some text \n describing blablabla", group: "activity", },
			{ id: 2, font: "10px arial black", label: "", group: "gate", },
			{ id: 3, font: "10px arial black", label: "", group: "gate" },
			{ id: 4, font: "10px arial black", label: "Node 4", group: "activity" },
			{ id: 5, font: "10px arial black", label: "Node 5", group: "activity" },
		]);

		// create an array with edges
		let edges = new DataSet<any>([
			{ from: 1, to: 3, width: 1, selectionWidth: 3, smooth: true, arrows: {to: {enabled: true}} },
			{ from: 1, to: 2, width: 1, selectionWidth: 3, smooth: true, arrows: {to: {enabled: true}} },
			{ from: 2, to: 4, width: 1, selectionWidth: 3, smooth: false, arrows: {to: {enabled: true}} },
			{ from: 2, to: 5, width: 1, selectionWidth: 3, smooth: true, arrows: {to: {enabled: true}} },
			{ from: 3, to: 4, width: 1, selectionWidth: 3, smooth: false, arrows: {to: {enabled: true}} },
		]);

		let data: Data = {
			nodes: this.nodes,
			edges: edges,
		};
		let options: Options = {
			interaction: {
				multiselect: true,
				navigationButtons: true,
				selectConnectedEdges: false
			},
			physics: {
				barnesHut: {
					springLength: 130
				}
			},
			groups: {
				activity: {
					shape: 'box',
					color: {background: 'white', border: 'black'}
				},
				gate: {
					shape: 'diamond',
					color: {background: 'white', border: 'black'}
				}
			}
		};
		this.network = new Network(element, data, options);


		//alternatively selectEdge, selectNode
		this.network.on('click', (eventObj: any) => {
			console.log("Clicked in network.", eventObj);

			// lets see whether we can modify single edges/nodes after

			let selectedNodeId = eventObj.nodes[0];
			if (selectedNodeId) {
				console.log(this.network);

				this.nodes?.update({
					id: selectedNodeId,
					label: "New Label On Change!"
				});
			}
		});
	}
}
