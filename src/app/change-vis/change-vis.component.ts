import { Component, OnDestroy, OnInit } from '@angular/core';
import { Options, Data } from 'vis-network';
import { Network } from "vis-network/peer/esm/vis-network";
import { DataSet } from "vis-data/peer/esm/vis-data"

// Bpmn js
import * as BpmnModdle from 'bpmn-moddle/dist/bpmn-moddle.umd.prod.js';
import * as BpmnModeler from 'bpmn-js/dist/bpmn-modeler.production.min.js';
//import * as BpmnViewer from 'bpmn-js/dist/bpmn-navigated-viewer.production.min.js';

import CustomRenderer from '../lib/custom-renderer';

@Component({
	selector: 'app-change-vis',
	templateUrl: './change-vis.component.html'
})
export class ChangeVisComponent implements OnInit, OnDestroy {

	// Vis network
	network: Network | null = null;
	nodes: DataSet<any> | null = null;


	myTestXml = 
  `
  <?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_13fnm1p" targetNamespace="http://bpmn.io/schema/bpmn" exporter="bpmn-js (https://demo.bpmn.io)" exporterVersion="8.8.2">
  <bpmn:process id="Process_0l16kqm" isExecutable="false">
    <bpmn:startEvent id="StartEvent_0dn6xbj">
      <bpmn:outgoing>Flow_0rbozlh</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Activity_1ncql3e" name="Ac1">
      <bpmn:incoming>Flow_0rbozlh</bpmn:incoming>
      <bpmn:outgoing>Flow_0e5lcif</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Activity_0l662zv" name="Ac 2">
      <bpmn:incoming>Flow_1boe108</bpmn:incoming>
    </bpmn:task>
    <bpmn:exclusiveGateway id="Gateway_1ybi4r8">
      <bpmn:incoming>Flow_0e5lcif</bpmn:incoming>
      <bpmn:outgoing>Flow_1boe108</bpmn:outgoing>
      <bpmn:outgoing>Flow_1etvjm7</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:sequenceFlow id="Flow_0rbozlh" sourceRef="StartEvent_0dn6xbj" targetRef="Activity_1ncql3e" />
    <bpmn:sequenceFlow id="Flow_0e5lcif" name="Connection haha" sourceRef="Activity_1ncql3e" targetRef="Gateway_1ybi4r8" />
    <bpmn:sequenceFlow id="Flow_1boe108" sourceRef="Gateway_1ybi4r8" targetRef="Activity_0l662zv" />
    <bpmn:task id="Activity_0lq9wnl">
      <bpmn:incoming>Flow_1etvjm7</bpmn:incoming>
      <bpmn:outgoing>Flow_04nyiht</bpmn:outgoing>
    </bpmn:task>
    <bpmn:sequenceFlow id="Flow_1etvjm7" sourceRef="Gateway_1ybi4r8" targetRef="Activity_0lq9wnl" />
    <bpmn:endEvent id="Event_1s4i4gw">
      <bpmn:incoming>Flow_04nyiht</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_04nyiht" sourceRef="Activity_0lq9wnl" targetRef="Event_1s4i4gw" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_0l16kqm">
      <bpmndi:BPMNEdge id="Flow_0rbozlh_di" bpmnElement="Flow_0rbozlh">
        <di:waypoint x="192" y="99" />
        <di:waypoint x="256" y="99" />
        <di:waypoint x="256" y="170" />
        <di:waypoint x="320" y="170" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_0e5lcif_di" bpmnElement="Flow_0e5lcif">
        <di:waypoint x="420" y="170" />
        <di:waypoint x="490" y="170" />
        <di:waypoint x="490" y="305" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="468" y="152" width="84" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_1boe108_di" bpmnElement="Flow_1boe108">
        <di:waypoint x="515" y="330" />
        <di:waypoint x="603" y="330" />
        <di:waypoint x="603" y="360" />
        <di:waypoint x="690" y="360" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_1etvjm7_di" bpmnElement="Flow_1etvjm7">
        <di:waypoint x="465" y="330" />
        <di:waypoint x="340" y="330" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_04nyiht_di" bpmnElement="Flow_04nyiht">
        <di:waypoint x="280" y="370" />
        <di:waypoint x="280" y="530" />
        <di:waypoint x="432" y="530" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_0dn6xbj">
        <dc:Bounds x="156" y="81" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_1ncql3e_di" bpmnElement="Activity_1ncql3e">
        <dc:Bounds x="320" y="130" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_1ybi4r8_di" bpmnElement="Gateway_1ybi4r8" isMarkerVisible="true">
        <dc:Bounds x="465" y="305" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_0l662zv_di" bpmnElement="Activity_0l662zv">
        <dc:Bounds x="690" y="290" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_0lq9wnl_di" bpmnElement="Activity_0lq9wnl">
        <dc:Bounds x="240" y="290" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Event_1s4i4gw_di" bpmnElement="Event_1s4i4gw">
        <dc:Bounds x="432" y="512" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
  `

	constructor() { }

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

	public async testBpmnModdle(xmlStr: string): Promise<void> {
	
		let moddle = new BpmnModdle({});


		/*const xmlStr = `
  <?xml version="1.0" encoding="UTF-8"?>
  <bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL"
                     id="empty-definitions"
                     targetNamespace="http://bpmn.io/schema/bpmn">

	<bpmn2:process id="financialReport" name="Monthly financial report reminder process">

      <bpmn2:startEvent id="theStart" />

      <bpmn2:sequenceFlow id="flow1" sourceRef="theStart" targetRef="writeReportTask" />

	</bpmn2:process>

		
  </bpmn2:definitions>

  `;
  */

		const {
 			 rootElement: definitions
		} = await moddle.fromXML(xmlStr);

		const thingy = await moddle.fromXML(xmlStr);

		console.log(moddle, definitions, thingy);

		// update id attribute
		definitions.set('id', 'NEW ID');

		// add a root element
		const bpmnProcess = moddle.create('bpmn:Process', { id: 'MyProcess_1' });
		definitions.get('rootElements').push(bpmnProcess);


		const {
			xml: xmlStrUpdated
		} = await moddle.toXML(definitions);


		console.log('finished with moddle', xmlStrUpdated);
	}


	async ngOnInit(): Promise<void> {

		await this.testBpmnModdle(this.myTestXml);
		await this.testBpmnViewer(this.myTestXml);

		// if the div is there, initialize network
		var container = document.getElementById("mynetwork");
		if (container instanceof HTMLElement) {
			this.initializeNetworkInDiv(container);
		}


	}

	ngOnDestroy(): void {
		if (this.network) {
			this.network.destroy();
		}
		this.network = null;
	}

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
