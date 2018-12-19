import DomUtil from '../util/DomUtil';
import CommonUtil from '../util/CommonUtil';

const DEFAULT_OPTIONS = {
	color: '#999',
	width: 2,
	selectedColor: '#000',
};

export default class Link {

	constructor(fromNodeId, fromPortId, toNodeId, toPortId, options = {}) {
		this._options = Object.assign({}, DEFAULT_OPTIONS, options);

		this._fromNodeId = fromNodeId;
		this._fromPortId = fromPortId;
		this._toNodeId = toNodeId;
		this._toPortId = toPortId;
	}

	exportToObject() {
		let obj = {
			options: {},
			fromNodeId: this._fromNodeId,
			fromPortId: this._fromPortId,
			toNodeId: this._toNodeId,
			toPortId: this._toPortId,
		};

		for (let k in this._options) {
			let v = this._options[k];
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
		this._updateSelected(false);
		return this;
	}

	remove() {
		this._remove();
	}

	getKey() {
		return `${this._getFromKey()}|${this._getToKey()}`;
	}

	_getFromKey() {
		return `${this._fromNodeId}:${this._fromPortId}`;
	}

	_getToKey() {
		return `${this._toNodeId}:${this._toPortId}`;
	}

	_addToFlow(flow) {
		if (this._flow) {
			throw new Error(`Link<${this._id}> is already in a flow`);
			return;
		}

		let fromKey = this._getFromKey();
		let toKey = this._getToKey();

		flow._linksByFrom[fromKey] = flow._linksByFrom[fromKey] || {};
		flow._linksByFrom[fromKey][toKey] = this; // one fromPort can connect many toPort
		flow._linksByTo[toKey] && flow._linksByTo[toKey]._remove();
		flow._linksByTo[toKey] = this; // one toPort can only be connected by one fromPort

		this._flow = flow;

		this._initGraph();
		this._addListeners();

		this._ensureShape();

		return this;
	}

	_remove() {
		let flow = this._flow;

		this._removeListeners();
		this._graph.remove();

		let fromKey = this._getFromKey();
		let toKey = this._getToKey();

		if (toKey in flow._linksByFrom[fromKey]) {
			delete flow._linksByFrom[fromKey][toKey];
		}
		delete flow._linksByTo[toKey];

		this._flow.emit({
			type: 'linkRemoved',
			data: {
				obj: this,
			}
		});
	}

	_initGraph() {
		let options = this._options;

		let g = this._graph = DomUtil.createSVG('path', 'fm-link');
		g.setAttribute('cursor', 'pointer');
		g.setAttribute('fill', 'none');
		g.setAttribute('stroke', options.color);
		g.setAttribute('stroke-width', options.width);

		let flow = this._flow;
		flow._graph.appendChild(g);
	}

	_onGraphClick(e) {
		e.stopPropagation();

		this._updateSelected(true);

		this._flow.emit({
			type: 'objSelected',
			data: {
				cls: 'Link',
				obj: this,
			}
		});
	}

	_onGraphMouseOver(e) {
		if (this._selected) {
			return;
		}

		e.stopPropagation();
		this._updateHover(true);
	}

	_onGraphMouseOut(e) {
		if (this._selected) {
			return;
		}

		e.stopPropagation();
		this._updateHover(false);
	}

	_ensureShape() {
		let flow = this._flow;

		let fromNode = flow.getNode(this._fromNodeId);
		let toNode = flow.getNode(this._toNodeId);

		if (!fromNode || !toNode) {
			return;
		}

		let [fromX, fromY] = fromNode._getPortAnchor(this._fromPortId);
		let [toX, toY] = toNode._getPortAnchor(this._toPortId);

		let g = this._graph;
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
		let options = this._options;
		let g = this._graph;

		this._selected = flag;
		if (flag) {
			g.setAttribute('stroke', options.selectedColor);
			g.setAttribute('stroke-width', options.width * 1.5);
		} else {
			g.setAttribute('stroke', options.color);
			g.setAttribute('stroke-width', options.width);
		}
	}

	_updateHover(flag) {
		let options = this._options;
		let g = this._graph;

		if (flag) {
			g.setAttribute('stroke-width', options.width * 1.5);
		} else {
			g.setAttribute('stroke-width', options.width);
		}
	}

	_addListeners() {
		let g = this._graph;
		DomUtil.addListener(g, 'click', this._onGraphClick, this);
		DomUtil.addListener(g, 'mouseover', this._onGraphMouseOver, this);
		DomUtil.addListener(g, 'mouseout', this._onGraphMouseOut, this);

		let flow = this._flow;
		flow.on('nodeMove', this._onNodeMove, this);
		flow.on('nodeRemoved', this._onNodeRemoved, this);
	}

	_removeListeners() {
		let g = this._graph;
		DomUtil.removeListener(g, 'click', this._onGraphClick, this);
		DomUtil.removeListener(g, 'mouseover', this._onGraphMouseOver, this);
		DomUtil.removeListener(g, 'mouseout', this._onGraphMouseOut, this);

		let flow = this._flow;
		flow.off('nodeMove', this._onNodeMove, this);
	}

	_onNodeMove(e) {
		let flow = this._flow;

		// Update if the node is relative
		let nodeId = e.data.id;
		if (this._fromNodeId == nodeId || this._toNodeId == nodeId) {
			this._ensureShape();
		}
	}

	_onNodeRemoved(e) { // related Links should be removed too
		let node = e.data.obj;

		if (node._id != this._toNodeId && node._id != this._fromNodeId) {
			return;
		}

		for (let portId in node._ports) {
			if (portId === this._toPortId) {
				this._remove();
				return;
			}
		}
	}

};