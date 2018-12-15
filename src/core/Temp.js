import DomUtil from '../util/DomUtil';
import Validator from './Validator';

const DEFAULT_OPTIONS = {
	connectingColor: '#aaa',
	connectingOpacity: 0.8,
	connectingDash: '4 8',
};

export default class Temp {

	constructor(options = {}) {
		this._options = Object.assign({}, DEFAULT_OPTIONS, options);
	}

	_addToFlow(flow) {
		if (this._flow) {
			throw new Error(`Temp layer is already in a flow`);
			return;
		}

		flow._temp = this;
		this._flow = flow;

		this._initGraph();
		this._addListeners();

		return this;
	}

	_initGraph() {
		let options = this._options;

		let flow = this._flow;
		let g = this._graph = DomUtil.createSVG('g', 'fm-temp', flow._graph);
	}

	_addListeners() {
		let flow = this._flow;

		flow.on('portMouseDown', this._onConnectStart, this);
		flow.on('portMouseOver', this._onOverPort, this);
		flow.on('portMouseOut', this._onLeavePort, this);
	}

	_onConnectStart(e) {
		let flow = this._flow;

		let { nodeId, portId, x, y } = e.data;
		if (nodeId && portId) {
			let node = flow.getNode(nodeId);
			let anchor = node && node._getPortAnchor(portId);
			this._connectStartData = {
				nodeId,
				portId,
				x: anchor ? anchor[0] : x,
				y: anchor ? anchor[1] : y,
			};
		}

		let options = this._options;
		let g = this._graph;

		let connectingGraph = this._connectingGraph = this._connectingGraph || DomUtil.createSVG('path', 'fm-connecting', g);
		connectingGraph.setAttribute('stroke', options.connectingColor);
		connectingGraph.setAttribute('stroke-opacity', options.connectingOpacity);
		connectingGraph.setAttribute('stroke-width', 2);
		connectingGraph.setAttribute('stroke-dasharray', options.connectingDash);
		connectingGraph.setAttribute('d', `M ${x},${y} L ${x},${y}`);

		let flowGraph = flow._graph;
		DomUtil.addListener(flowGraph, 'mousemove', this._onFlowGraphMouseMove, this);
		DomUtil.addListener(flowGraph, 'mouseup', this._onFlowGraphMouseUp, this);
	}

	_onFlowGraphMouseMove(e) {
		e.stopPropagation();

		let startData = this._connectStartData;
		if (!startData) {
			return;
		}

		let fromX = startData.x;
		let fromY = startData.y;

		let flow = this._flow;
		let toX = e.offsetX - flow._x;
		let toY = e.offsetY - flow._y;

		let connectingGraph = this._connectingGraph;
		connectingGraph.setAttribute('d', `M ${fromX},${fromY} L ${toX},${toY}`);
	}

	_onFlowGraphMouseUp(e) {
		e.stopPropagation();

		let startData = this._connectStartData;
		if (!startData) {
			return;
		}

		let flow = this._flow;

		let flowGraph = flow._graph;
		DomUtil.removeListener(flowGraph, 'mousemove', this._onFlowGraphMouseMove, this);
		DomUtil.removeListener(flowGraph, 'mouseup', this._onFlowGraphMouseUp, this);

		this._connectingGraph.remove();
		delete this._connectingGraph;

		let overEvent = this._connectOverEvent;
		if (overEvent) {
			let fromNodeId = startData.nodeId;
			let fromPortId = startData.portId;
			let toNodeId = overEvent.data.nodeId;
			let toPortId = overEvent.data.portId;

			flow.connect(fromNodeId, fromPortId, toNodeId, toPortId);
		}

		delete this._connectStartData;
	}

	_onOverPort(e) {
		let options = this._options;

		let startData = this._connectStartData;
		if (!startData) {
			return;
		}

		this._connectOverEvent = e;

		let fromNodeId = startData.nodeId;
		let fromPortId = startData.portId;
		let toNodeId = e.data.nodeId;
		let toPortId = e.data.portId;

		let flow = this._flow;
		let connectable = Validator.isConnectable(flow, fromNodeId, fromPortId, toNodeId, toPortId);
		let connectingGraph = this._connectingGraph;
		connectingGraph && connectingGraph.setAttribute('stroke-dasharray', connectable ? '' : options.connectingDash);
	}

	_onLeavePort(e) {
		let overEvent = this._connectOverEvent;
		if (overEvent && overEvent.data.nodeId == e.data.nodeId && overEvent.data.portId == e.data.portId) {
			delete this._connectOverEvent;

			let options = this._options;
			let connectingGraph = this._connectingGraph;
			connectingGraph && connectingGraph.setAttribute('stroke-dasharray', options.connectingDash);
		}
	}

};