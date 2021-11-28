import { Component, OnDestroy, OnInit } from '@angular/core';
import { Options, Data } from 'vis-network';
import { Network } from "vis-network/peer/esm/vis-network";
import { DataSet } from "vis-data/peer/esm/vis-data"

@Component({
	selector: 'app-change-vis',
	templateUrl: './change-vis.component.html'
})
export class ChangeVisComponent implements OnInit, OnDestroy {

	network: Network | null = null;
	nodes: DataSet<any> | null = null;

	constructor() { }

	ngOnInit(): void {

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
			{ from: 1, to: 3 },
			{ from: 1, to: 2 },
			{ from: 2, to: 4 },
			{ from: 2, to: 5 },
			{ from: 3, to: 4 },
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

			// lets see whether we can modify single edges/nodes after creation.

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
