import DomUtil from '../util/DomUtil';

export default class Link {

	constructor(fromNodeId, fromPortId, toNodeId, toPortId, options = {}) {
		let self = this;

		self._options = Object.assign({
			color: '#999',
			width: 2,
			selectedColor: '#000',
		}, options);

		self._fromNodeId = fromNodeId;
		self._fromPortId = fromPortId;
		self._toNodeId = toNodeId;
		self._toPortId = toPortId;
	}

	unselect() {
		this._updateSelected(false);
	}

	_addToFlow(flow) {
		let self = this;

		if (self._flow) {
			throw new Error(`Link<${self._id}> is already in a flow`);
			return;
		}

		let id = self._id = `${self._fromNodeId}:${self._fromPortId}-${self._toNodeId}:${self._toPortId}`;
		flow._links[id] = self;

		self._flow = flow;

		self._initGraph();
		self._ensureShape();

		self._initListeners();

		return self;
	}

	_initGraph() {
		let self = this;
		let options = self._options;

		let g = self._graph = DomUtil.createSVG('path', 'fm-link');
		g._obj = self;
		g.setAttribute('cursor', 'pointer');
		g.setAttribute('fill', 'none');
		g.setAttribute('stroke', options.color);
		g.setAttribute('stroke-width', options.width);
		g.addEventListener("click", self._onGraphClick);

		let flow = self._flow;
		flow._graph.appendChild(g);
	}

	_onGraphClick(e) {
		e.stopPropagation();

		let self = this._obj;

		self._updateSelected(true);

		self._flow.emit({
			type: 'objSelected',
			data: {
				type: 'link',
				obj: self,
			}
		});
	}

	_ensureShape() {
		let self = this;
		let flow = self._flow;

		let fromNode = flow.getNode(self._fromNodeId);
		let toNode = flow.getNode(self._toNodeId);

		if (!fromNode || !toNode) {
			return;
		}

		let [fromX, fromY] = fromNode.getPortAnchor(self._fromPortId);
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

	_updateSelected(flag) {
		let self = this;

		let options = self._options;
		let g = self._graph;

		self._selected = flag;
		if (flag) {
			g.setAttribute('stroke', options.selectedColor);
			g.setAttribute('stroke-width', options.width * 1.5);
		} else {
			g.setAttribute('stroke', options.color);
			g.setAttribute('stroke-width', options.width);
		}
	}

	_initListeners() {
		let self = this;
		let flow = self._flow;

		flow.on('nodeMove', self._onNodeMove, self);
		flow.on('linkEstablished', self._onLinkEstablished, self);
	}

	_remove() {
		let self = this;
		let flow = self._flow;

		// remove listeners
		flow.off('nodeMove', self._onNodeMove, self);
		flow.off('linkEstablished', self._onLinkEstablished, self);

		// remove graph
		self._graph.remove();

		delete flow._links[self._id];
	}

	_onNodeMove(e) {
		let self = this;
		let flow = self._flow;

		// Update if the node is relative
		let nodeId = e.data.id;
		if (self._fromNodeId == nodeId || self._toNodeId == nodeId) {
			self._ensureShape();
		}
	}

	_onLinkEstablished(e) {
		let self = this;
		let flow = self._flow;

		let {
			id,
			fromNodeId,
			fromPortId,
			toNodeId,
			toPortId
		} = e.data;

		// remove unavailable links
		if (self._id != id && self._toNodeId == toNodeId && self._toPortId == toPortId) { // only one Link is allowed to connect to a port
			self._remove();
		}
	}

};