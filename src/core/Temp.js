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

		let options = self._options;
		let g = self._graph;

		let connectingGraph = self._connectingGraph = self._connectingGraph || DomUtil.createSVG('path', 'fm-connecting', g);
		connectingGraph.setAttribute('stroke', options.connectingColor);
		connectingGraph.setAttribute('stroke-opacity', options.connectingOpacity);
		connectingGraph.setAttribute('stroke-width', 2);
		connectingGraph.setAttribute('stroke-dasharray', options.connectingDash);

		let flowGraph = self._flow._graph;
		flowGraph.addEventListener("mousemove", self._onConnectMove);
		flowGraph.addEventListener("mouseup", self._onConnectEnd);

		self._connectStartEvent = e;
	}

	_onConnectMove(e) {
		let self = this._obj._temp;

		let startData = self._connectStartEvent.data;
		let fromX = startData.x;
		let fromY = startData.y;

		let toX = e.clientX;
		let toY = e.clientY;

		let connectingGraph = self._connectingGraph;
		connectingGraph.setAttribute('d', `M ${fromX},${fromY} L ${toX},${toY}`);
	}

	_onConnectEnd(e) {
		let self = this._obj._temp;
		let g = self._graph;

		let flowGraph = self._flow._graph;
		flowGraph.removeEventListener("mousemove", self._onConnectMove);
		flowGraph.removeEventListener("mouseup", self._onConnectEnd);

		self._connectingGraph.remove();
		delete self._connectingGraph;
		delete self._connectStartEvent;

		let overEvt = self._connectOverEvent;
		if (overEvt) {
			let nodeId = overEvt.data.nodeId;
			let portId = overEvt.data.portId;
			console.log(nodeId, portId)
		}
	}

	_onOverPort(e) {
		let self = this;
		let g = self._graph;

		if (self._connectStartEvent) { // tring connect port
			self._connectOverEvent = e;

			console.log(e)

			// test connectable
			if (e) {
				let connectingGraph = self._connectingGraph;
				connectingGraph.setAttribute('stroke-dasharray', '');
			}
		}
	}

	_onLeavePort(e) {
		let self = this;
		let g = self._graph;

		let overEvt = self._connectOverEvent;
		if (overEvt && overEvt.data.nodeId == e.data.nodeId && overEvt.data.portId == e.data.portId) {
			delete self._connectOverEvent;

			let options = self._options;
			let connectingGraph = self._connectingGraph;
			connectingGraph && connectingGraph.setAttribute('stroke-dasharray', options.connectingDash);
		}
	}

};