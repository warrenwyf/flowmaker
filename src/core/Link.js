import DomUtil from '../util/DomUtil';
import CommonUtil from '../util/CommonUtil';

const DEFAULT_OPTIONS = {
	color: '#999',
	width: 2,
	selectedColor: '#000',
};

export default class Link {

	constructor(fromNodeId, fromPortId, toNodeId, toPortId, options = {}) {
		let self = this;

		self._options = Object.assign({}, DEFAULT_OPTIONS, options);

		self._fromNodeId = fromNodeId;
		self._fromPortId = fromPortId;
		self._toNodeId = toNodeId;
		self._toPortId = toPortId;
	}

	exportToObject() {
		let self = this;

		let obj = {
			options: {},
			fromNodeId: self._fromNodeId,
			fromPortId: self._fromPortId,
			toNodeId: self._toNodeId,
			toPortId: self._toPortId,
		};

		for (let k in self._options) {
			let v = self._options[k];
			if (v !== DEFAULT_OPTIONS[k]) {
				obj.options[k] = v;
			}
		}

		if (CommonUtil.isEmptyObject(obj.options)) {
			delete obj.options;
		}

		return obj;
	}

	unselect() {
		let self = this;

		self._updateSelected(false);
		return self;
	}

	remove() {
		this._remove();
	}

	_getFromKey() {
		let self = this;
		return `${self._fromNodeId}:${self._fromPortId}`;
	}

	_getToKey() {
		let self = this;
		return `${self._toNodeId}:${self._toPortId}`;
	}

	_addToFlow(flow) {
		let self = this;

		if (self._flow) {
			throw new Error(`Link<${self._id}> is already in a flow`);
			return;
		}

		let fromKey = self._getFromKey();
		let toKey = self._getToKey();

		flow._linksByFrom[fromKey] = flow._linksByFrom[fromKey] || {};
		flow._linksByFrom[fromKey][toKey] = self; // one fromPort can connect many toPort
		flow._linksByTo[toKey] && flow._linksByTo[toKey]._remove();
		flow._linksByTo[toKey] = self; // one toPort can only be connected by one fromPort

		self._flow = flow;

		self._initGraph();
		self._addListeners();

		self._ensureShape();

		return self;
	}

	_remove() {
		let self = this;
		let flow = self._flow;

		self._removeListeners();
		self._graph.remove();

		let fromKey = self._getFromKey();
		let toKey = self._getToKey();

		if (toKey in flow._linksByFrom[fromKey]) {
			delete flow._linksByFrom[fromKey][toKey];
		}
		delete flow._linksByTo[toKey];

		self._flow.emit({
			type: 'linkRemoved',
			data: {
				obj: self,
			}
		});
	}

	_initGraph() {
		let self = this;
		let options = self._options;

		let g = self._graph = DomUtil.createSVG('path', 'fm-link');
		g.setAttribute('cursor', 'pointer');
		g.setAttribute('fill', 'none');
		g.setAttribute('stroke', options.color);
		g.setAttribute('stroke-width', options.width);

		let flow = self._flow;
		flow._graph.appendChild(g);
	}

	_onGraphClick(e) {
		e.stopPropagation();

		let self = this;

		self._updateSelected(true);

		self._flow.emit({
			type: 'objSelected',
			data: {
				cls: 'Link',
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

		let [fromX, fromY] = fromNode._getPortAnchor(self._fromPortId);
		let [toX, toY] = toNode._getPortAnchor(self._toPortId);

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

	_addListeners() {
		let self = this;

		let g = self._graph;
		DomUtil.addListener(g, 'click', self._onGraphClick, self);

		let flow = self._flow;
		flow.on('nodeMove', self._onNodeMove, self);
		flow.on('nodeRemoved', self._onNodeRemoved, self);
	}

	_removeListeners() {
		let self = this;

		let g = self._graph;
		DomUtil.removeListener(g, 'click', self._onGraphClick, self);

		let flow = self._flow;
		flow.off('nodeMove', self._onNodeMove, self);
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

	_onNodeRemoved(e) { // related Links should be removed too
		let self = this;

		let node = e.data.obj;

		if (node._id != self._toNodeId) {
			return;
		}

		for (let portId in node._ports) {
			if (portId === self._toPortId) {
				self._remove();
				return;
			}
		}
	}

};