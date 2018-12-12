import DomUtil from '../util/DomUtil';

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
		self._initListeners();

		return self;
	}

	_initGraph() {
		let self = this;
		let options = self._options;

		let flow = self._flow;
		let g = self._graph = DomUtil.createSVG('g', 'fm-temp', flow._graph);

		g._obj = self;
	}

	_initListeners() {
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
		flowGraph.addEventListener("mousemove", self._onConnectMove);
		flowGraph.addEventListener("mouseup", self._onConnectEnd);

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

	_onConnectMove(e) {
		let self = this._obj._temp;

		let startData = self._connectStartData;
		if (!startData) {
			return;
		}

		let fromX = startData.x;
		let fromY = startData.y;

		let toX = e.clientX;
		let toY = e.clientY;

		let connectingGraph = self._connectingGraph;
		connectingGraph.setAttribute('d', `M ${fromX},${fromY} L ${toX},${toY}`);
	}

	_onConnectEnd(e) {
		let self = this._obj._temp;

		let startData = self._connectStartData;
		if (!startData) {
			return;
		}

		let flow = self._flow;

		let flowGraph = flow._graph;
		flowGraph.removeEventListener("mousemove", self._onConnectMove);
		flowGraph.removeEventListener("mouseup", self._onConnectEnd);

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
		let g = self._graph;

		if (self._connectStartData) { // tring connect port
			self._connectOverEvent = e;

			// TODO: test connectable
			if (e) {
				let connectingGraph = self._connectingGraph;
				connectingGraph && connectingGraph.setAttribute('stroke-dasharray', '');
			}
		}
	}

	_onLeavePort(e) {
		let self = this;
		let g = self._graph;

		let overEvent = self._connectOverEvent;
		if (overEvent && overEvent.data.nodeId == e.data.nodeId && overEvent.data.portId == e.data.portId) {
			delete self._connectOverEvent;

			let options = self._options;
			let connectingGraph = self._connectingGraph;
			connectingGraph && connectingGraph.setAttribute('stroke-dasharray', options.connectingDash);
		}
	}

};