import DomUtil from '../util/DomUtil';
import Validator from './Validator';

export default class Temp {

	constructor(options = {}) {
		let self = this;

		self._options = Object.assign({
			connectingColor: '#aaa',
			connectingOpacity: 0.8,
			connectingDash: '4 8',
		}, options);
	}

	_addToFlow(flow) {
		let self = this;

		if (self._flow) {
			throw new Error(`Temp layer is already in a flow`);
			return;
		}

		flow._temp = self;
		self._flow = flow;

		self._initGraph();
		self._addListeners();

		return self;
	}

	_initGraph() {
		let self = this;
		let options = self._options;

		let flow = self._flow;
		let g = self._graph = DomUtil.createSVG('g', 'fm-temp', flow._graph);
	}

	_addListeners() {
		let self = this;
		let flow = self._flow;

		flow.on('portMouseDown', self._onConnectStart, self);
		flow.on('portMouseOver', self._onOverPort, self);
		flow.on('portMouseOut', self._onLeavePort, self);
	}

	_onConnectStart(e) {
		let self = this;
		let flow = self._flow;

		let options = self._options;
		let g = self._graph;

		let connectingGraph = self._connectingGraph = self._connectingGraph || DomUtil.createSVG('path', 'fm-connecting', g);
		connectingGraph.setAttribute('stroke', options.connectingColor);
		connectingGraph.setAttribute('stroke-opacity', options.connectingOpacity);
		connectingGraph.setAttribute('stroke-width', 2);
		connectingGraph.setAttribute('stroke-dasharray', options.connectingDash);

		let flowGraph = flow._graph;
		DomUtil.addListener(flowGraph, 'mousemove', self._onFlowGraphMouseMove, self);
		DomUtil.addListener(flowGraph, 'mouseup', self._onFlowGraphMouseUp, self);

		let { nodeId, portId, x, y } = e.data;
		if (nodeId && portId) {
			let node = flow.getNode(nodeId);
			let anchor = node && node.getPortAnchor(portId);
			self._connectStartData = {
				nodeId,
				portId,
				x: anchor ? anchor[0] : x,
				y: anchor ? anchor[1] : y,
			};
		}
	}

	_onFlowGraphMouseMove(e) {
		e.stopPropagation();

		let self = this;

		let startData = self._connectStartData;
		if (!startData) {
			return;
		}

		let fromX = startData.x;
		let fromY = startData.y;

		let flow = self._flow;
		let toX = e.clientX - flow._x;
		let toY = e.clientY - flow._y;

		let connectingGraph = self._connectingGraph;
		connectingGraph.setAttribute('d', `M ${fromX},${fromY} L ${toX},${toY}`);
	}

	_onFlowGraphMouseUp(e) {
		e.stopPropagation();

		let self = this;

		let startData = self._connectStartData;
		if (!startData) {
			return;
		}

		let flow = self._flow;

		let flowGraph = flow._graph;
		DomUtil.removeListener(flowGraph, 'mousemove', self._onFlowGraphMouseMove, self);
		DomUtil.removeListener(flowGraph, 'mouseup', self._onFlowGraphMouseUp, self);

		self._connectingGraph.remove();
		delete self._connectingGraph;

		let overEvent = self._connectOverEvent;
		if (overEvent) {
			let fromNodeId = startData.nodeId;
			let fromPortId = startData.portId;
			let toNodeId = overEvent.data.nodeId;
			let toPortId = overEvent.data.portId;

			flow.connect(fromNodeId, fromPortId, toNodeId, toPortId);
		}

		delete self._connectStartData;
	}

	_onOverPort(e) {
		let self = this;
		let options = self._options;

		let startData = self._connectStartData;
		if (!startData) {
			return;
		}

		self._connectOverEvent = e;

		let fromNodeId = startData.nodeId;
		let fromPortId = startData.portId;
		let toNodeId = e.data.nodeId;
		let toPortId = e.data.portId;

		let flow = self._flow;
		let connectable = Validator.isConnectable(flow, fromNodeId, fromPortId, toNodeId, toPortId);
		let connectingGraph = self._connectingGraph;
		connectingGraph && connectingGraph.setAttribute('stroke-dasharray', connectable ? '' : options.connectingDash);
	}

	_onLeavePort(e) {
		let self = this;

		let overEvent = self._connectOverEvent;
		if (overEvent && overEvent.data.nodeId == e.data.nodeId && overEvent.data.portId == e.data.portId) {
			delete self._connectOverEvent;

			let options = self._options;
			let connectingGraph = self._connectingGraph;
			connectingGraph && connectingGraph.setAttribute('stroke-dasharray', options.connectingDash);
		}
	}

};