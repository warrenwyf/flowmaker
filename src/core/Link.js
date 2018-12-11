import DomUtil from '../util/DomUtil';

export default class Link {

	constructor(fromNodeId, fromPortId, toNodeId, toPortId, options = {}) {
		let self = this;

		self._options = Object.assign({
			color: '#999',
			width: 2,
		}, options);

		self._fromNodeId = fromNodeId;
		self._fromPortId = fromPortId;
		self._toNodeId = toNodeId;
		self._toPortId = toPortId;
	}

	addToFlow(flow) {
		let self = this;

		if (!flow || !flow._nodes || !flow._graph) {
			throw new Error(`Flow not found`);
			return;
		}

		if (!!self._id) {
			throw new Error(`Link<${self._id}> is already in a flow`);
			return;
		}

		let id = self._id = ++flow._idSeq;
		flow._links[id] = self;

		self._flow = flow;

		self._initGraph();
		self._updateShape();

		self._initListeners();

		return self;
	}

	_initGraph() {
		let self = this;
		let options = self._options;

		let g = self._graph = DomUtil.createSVG('path', 'fm-link');
		g.setAttribute('fill', 'none');
		g.setAttribute('stroke', options.color);
		g.setAttribute('stroke-width', options.width);

		let flow = self._flow;
		flow._graph.appendChild(g);
	}

	_updateShape() {
		let self = this;
		let flow = self._flow;

		let fromNode = flow.getNode(self._fromNodeId);
		let [fromX, fromY] = fromNode.getPortAnchor(self._fromPortId);

		let toNode = flow.getNode(self._toNodeId);
		let [toX, toY] = toNode.getPortAnchor(self._toPortId);

		let g = self._graph;
		if (toX > fromX) {
			let midX = (fromX + toX) / 2;
			g.setAttribute('d', `M ${fromX},${fromY} C ${midX},${fromY} ${midX},${toY} ${toX},${toY}`);
		} else {
			let dis = Math.hypot(fromX - toX, fromY - toY);
			let midX1 = fromX + dis;
			let midX2 = toX - dis;
			let midY = (fromY + toY) / 2;
			g.setAttribute('d', `M ${fromX},${fromY} Q ${midX1},${fromY} ${(midX1+midX2)/2},${midY} ${midX2},${toY} ${toX},${toY}`);
		}
	}

	_initListeners() {
		let self = this;
		let flow = self._flow;

		flow.on('nodeMove', self._updateShape, self);
	}

};