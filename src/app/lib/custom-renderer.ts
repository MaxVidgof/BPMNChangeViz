
import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer.js';
import BpmnRenderer from 'bpmn-js/lib/draw/BpmnRenderer.js';

import {
  append as svgAppend,
  attr as svgAttr,
  create as svgCreate,
  remove as svgRemove
} from 'tiny-svg';

import {
  getRoundRectPath
} from 'bpmn-js/lib/draw/BpmnRenderUtil';

import { is } from 'bpmn-js/lib/util/ModelUtil';
import { isAny } from 'bpmn-js/lib/features/modeling/util/ModelingUtil';
import { inherits } from 'inherits';


// We extend the very basic BaseRenderer of Diagram.js to define our own stuff.

const HIGH_PRIORITY = 1500;

export default class CustomRenderer extends BaseRenderer {

	bpmnRenderer: BpmnRenderer;

	constructor(eventBus, bpmnRenderer) {
		super(eventBus, HIGH_PRIORITY);
		this.bpmnRenderer = bpmnRenderer;
	}

	canRender(element) {

		// only render tasks and events (ignore labels)
		return isAny(element, [ 'bpmn:Task', 'bpmn:Event' ]) && !element.labelTarget;
	}

	public drawShape(parentNode, element): any {
		const shape = this.bpmnRenderer.drawShape(parentNode, element);

		console.log('comes through here?', shape);
		if (is(element, 'bpmn:Task')) {
			const rect = this.drawRect(parentNode, 100, 80, 80, '#52B415');

			this.prependTo(rect, parentNode);

			svgRemove(shape);

			return rect;
		}

		return shape;
  	}

	public getShapePath(shape): any {
		if (is(shape, 'bpmn:Task')) {
		return getRoundRectPath(shape, 80);
		}

		return this.bpmnRenderer.getShapePath(shape);
  	}

	private drawRect(parentNode: Element, width, height, borderRadius, strokeColor): SVGRectElement {
		const rect = svgCreate('rect');

		svgAttr(rect, {
			width: width,
			height: height,
			rx: borderRadius,
			ry: borderRadius,
			stroke: strokeColor || '#000',
			strokeWidth: 2,
			fill: '#fff'
		});

		svgAppend(parentNode, rect);

		return rect;
	}

	private prependTo(newNode, parentNode, siblingNode = null): void {
		parentNode.insertBefore(newNode, siblingNode || parentNode.firstChild);
	}
}

(<any> CustomRenderer).$inject = [ 'eventBus', 'bpmnRenderer' ];
