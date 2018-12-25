import DomUtil from '../util/DomUtil';
import CommonUtil from '../util/CommonUtil';
import Port from './Port';

const DEFAULT_OPTIONS = {
	leftPorts: [],
	rightPorts: [],
	extInfo: {}, // info for external reference
	name: 'Unknown',
	nameSize: '1em',
	desc: 'an unknown node',
	descSize: '0.9em',
	gap: 4,
	bgSize: 40,
	bgRadius: 4,
	bgColor: '#ccc',
	bgOpacity: 1.0,
	icon: '',
	selectedColor: '#000',
	selectedWidth: 2,
	hoverColor: '#ccc',
	hoverWidth: 2,
	statusOutlineColor: '#ccc',
	statusOutlineWidth: 1,
	idleColor: '#ccc',
	runningColor: '#3b88fd',
	warnColor: '#fbfb3d',
	errorColor: '#f14f51',
	successColor: '#6cc05d',
	clickTolerance: 2,
};

export default class Node {

	constructor(options = {}) {
		this._options = Object.assign({}, DEFAULT_OPTIONS, options);

		this._ports = {}; // key is port id

		this._runnable = false; // show status and progress when the node is runnable
		this._progress = -1; // show progress bar when this value >= 0
		this._status = 'idle'; // idle | running | warn | error | success
	}

	exportToObject() {
		let obj = {
			options: {},
			x: this._x,
			y: this._y,
			id: this._id,
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

	getOption(k) {
		return this._options[k] || DEFAULT_OPTIONS[k];
	}

	getId() {
		return this._id;
	}

	getPort(portId) {
		return this._ports[portId];
	}

	unselect() {

		this._updateSelected(false);
		return this;
	}

	getUpstreamNodes() {
		let flow = this._flow;

		let nodes = [];
		for (let k in this._ports) {
			let port = this._ports[k];
			let portKey = this._getPortKey(port._id);
			let link = flow._linksByTo[portKey];
			let node = link && flow.getNode(link._fromNodeId);
			node && nodes.push(node);
		}

		return nodes;
	}

	getDownstreamNodes() {
		let flow = this._flow;

		let nodes = [];
		for (let k in this._ports) {
			let port = this._ports[k];
			let portKey = this._getPortKey(port._id);
			let links = flow._linksByFrom[portKey] || {};
			for (let linkKey in links) {
				let link = links[linkKey];
				let node = link && flow.getNode(link._toNodeId);
				node && nodes.push(node);
			}
		}

		return nodes;
	}

	remove() {
		this._remove();
	}

	getBBox() {
		return this._graph.getBBox();
	}

	moveTo(x, y) {
		this._x = x;
		this._y = y;

		this._ensurePos();

		let flow = this._flow;
		flow && flow.emit({
			type: 'nodeMove',
			data: {
				id: this._id,
			}
		});
	}

	_addToFlow(flow, x, y, options = {}) {
		if (this._flow) {
			throw new Error(`Node<${this._id}> is already in a flow`);
			return;
		}

		let id = this._id = options.id || ++flow._idSeq;
		flow._nodes[id] = this;

		this._flow = flow;
		this._x = x;
		this._y = y;

		this._initGraph();
		this._addListeners();

		this._ensurePos();
		this._ensureRunnable();

		return this;
	}

	_remove() {
		let flow = this._flow;

		this._removeListeners();
		this._graph.remove();

		delete flow._nodes[this._id];

		this._flow.emit({
			type: 'nodeRemoved',
			data: {
				obj: this,
			}
		});
	}

	_initGraph() {
		let options = this._options;

		let g = this._graph = DomUtil.createSVG('g', 'fm-node');

		// draggable graph, including background and icon
		let draggable = this._graphDraggable = DomUtil.createSVG('g', 'fm-node-draggable', g);
		draggable.setAttribute('cursor', 'pointer');

		// background
		let bg = this._graphBg = DomUtil.createSVG('rect', 'fm-node-bg', draggable);
		bg.setAttribute('x', -options.bgSize / 2);
		bg.setAttribute('y', -options.bgSize / 2);
		bg.setAttribute('width', options.bgSize);
		bg.setAttribute('height', options.bgSize);
		bg.setAttribute('rx', options.bgRadius);
		bg.setAttribute('ry', options.bgRadius);
		bg.setAttribute('fill', options.bgColor);
		bg.setAttribute('fill-opacity', options.bgOpacity);

		// icon
		if (options.icon) {
			let icon = this._graphIcon = DomUtil.createSVG('image', 'fm-node-icon', draggable);
			icon.setAttribute('x', options.bgRadius - options.bgSize / 2);
			icon.setAttribute('y', options.bgRadius - options.bgSize / 2);
			icon.setAttribute('width', options.bgSize - 2 * options.bgRadius);
			icon.setAttribute('height', options.bgSize - 2 * options.bgRadius);
			icon.setAttribute('preserveAspectRatio', 'xMidYMid meet');
			DomUtil.setAttributeXlink(icon, 'href', options.icon);
		}

		// name
		let name = this._graphName = DomUtil.createSVG('text', 'fm-node-name', g);
		name.innerHTML = options.name;
		name.setAttribute('x', 0);
		name.setAttribute('y', -options.bgSize / 2 - options.gap);
		name.setAttribute('font-size', options.nameSize);
		name.setAttribute('text-anchor', 'middle');
		name.setAttribute('alignment-baseline', 'text-after-edge');
		name.setAttribute('font-weight', 'bold');
		name.setAttribute('cursor', 'default');

		// desc
		let desc = this._graphDesc = DomUtil.createSVG('text', 'fm-node-desc', g);
		desc.innerHTML = options.desc;
		desc.setAttribute('x', 0);
		desc.setAttribute('y', options.bgSize / 2 + options.gap * 2);
		desc.setAttribute('font-size', options.descSize);
		desc.setAttribute('text-anchor', 'middle');
		desc.setAttribute('alignment-baseline', 'text-before-edge');
		desc.setAttribute('cursor', 'default');

		// runnable contains status and progress
		let runnable = this._graphRunnable = DomUtil.createSVG('svg', 'fm-node-runnable', g);
		runnable.setAttribute('overflow', 'visible');
		runnable.setAttribute('x', -options.bgSize / 2);
		runnable.setAttribute('y', options.bgSize / 2 + options.gap);

		// status
		let status = this._graphStatus = DomUtil.createSVG('rect', 'fm-node-status', runnable);
		status.setAttribute('width', options.bgSize);
		status.setAttribute('height', options.gap);
		status.setAttribute('rx', options.gap / 2);
		status.setAttribute('ry', options.gap / 2);
		status.setAttribute('fill', options.idleColor);
		status.setAttribute('stroke', options.statusOutlineColor);
		status.setAttribute('stroke-width', options.statusOutlineWidth);

		// progress
		let progress = this._graphProgress = DomUtil.createSVG('rect', 'fm-node-progress', runnable);
		progress.setAttribute('x', options.statusOutlineWidth);
		progress.setAttribute('y', options.statusOutlineWidth);
		progress.setAttribute('width', 0);
		progress.setAttribute('height', options.gap - 2 * options.statusOutlineWidth);
		progress.setAttribute('rx', options.gap / 2);
		progress.setAttribute('ry', options.gap / 2);
		progress.setAttribute('fill', options.runningColor);

		// used by ports
		let sideLen = options.bgSize - 4 * options.bgRadius;

		// left ports
		let leftPortsCount = options.leftPorts.length;
		if (leftPortsCount > 0) {
			let sideSpacing = leftPortsCount == 1 ? 0 : sideLen / (leftPortsCount - 1);
			for (let i = 0; i < leftPortsCount; i++) {
				let portOptions = options.leftPorts[i];

				let anchor = this._calcPortAnchor(portOptions, i, -options.bgSize / 2, sideLen, sideSpacing);
				let port = new Port(portOptions);
				port._addToNode(this, `l-${i}`, anchor);
			}
		}

		// right ports
		let rightPortsCount = options.rightPorts.length;
		if (rightPortsCount > 0) {
			let sideSpacing = rightPortsCount == 1 ? 0 : sideLen / (rightPortsCount - 1);
			for (let i = 0; i < rightPortsCount; i++) {
				let portOptions = options.rightPorts[i];

				let anchor = this._calcPortAnchor(portOptions, i, options.bgSize / 2, sideLen, sideSpacing);
				let port = new Port(portOptions);
				port._addToNode(this, `r-${i}`, anchor);
			}
		}


		let flow = this._flow;
		flow._graph.appendChild(g);
	}

	_addListeners() {
		let g = this._graphDraggable;
		DomUtil.addListener(g, 'mousedown', this._onGraphMouseDown, this);
		DomUtil.addListener(g, 'click', this._onGraphClick, this);
		DomUtil.addListener(g, 'mouseover', this._onGraphMouseOver, this);
		DomUtil.addListener(g, 'mouseout', this._onGraphMouseOut, this);
	}

	_removeListeners() {
		let g = this._graphDraggable;
		DomUtil.removeListener(g, 'mousedown', this._onGraphMouseDown, this);
		DomUtil.removeListener(g, 'click', this._onGraphClick, this);
		DomUtil.removeListener(g, 'mouseover', this._onGraphMouseOver, this);
		DomUtil.removeListener(g, 'mouseout', this._onGraphMouseOut, this);
	}

	_snapToGrid(gridWidth, gridHeight) {
		let oldX = this._x;
		let oldY = this._y;

		let modX = (oldX - gridWidth / 2) % gridWidth;
		let modY = (oldY - gridHeight / 2) % gridHeight;

		if (modX !== 0 || modY !== 0) {
			let dx = modX < (gridWidth - modX) ? -modX : gridWidth - modX;
			let dy = modY < (gridHeight - modY) ? -modY : gridHeight - modY;

			this._x = oldX + dx;
			this._y = oldY + dy;
			this._ensurePos();

			this._flow.emit({ type: 'nodeMove', data: { id: this._id } });
		}
	}

	_getPortKey(portId) {
		return `${this._id}:${portId}`;
	}

	_getPortAnchor(portId) {
		let port = this._ports[portId];
		if (port) {
			let anchor = port._anchor;
			return [anchor[0] + this._x, anchor[1] + this._y];
		}
	}

	_calcPortAnchor(portOptions, sideIdx, sideX, sideLen, sideSpacing) {
		let options = this._options;

		let anchorX = sideX;
		switch (portOptions.type) {
			case 'input':
				anchorX -= options.bgSize / 5;
				break;
			case 'output':
				anchorX += options.bgSize / 5;
				break;
		}

		let anchorY = sideSpacing ? -sideLen / 2 + sideSpacing * sideIdx : 0;

		return [anchorX, anchorY];
	}

	_onGraphMouseDown(e) {
		e.stopPropagation();

		// allow left mouse
		if (e.which !== 1) {
			return;
		}

		let g = this._flow._graph;
		DomUtil.addListener(g, 'mousemove', this._onGraphMouseMove, this);
		DomUtil.addListener(g, 'mouseup', this._onGraphMouseUp, this);

		this._dragStartX = this._x;
		this._dragStartY = this._y;
		this._dragStartEvent = e;
		this._forbidClick = true;

		this._graphDraggable.setAttribute('cursor', 'move');
	}

	_onGraphMouseMove(e) {
		e.stopPropagation();

		this._x = this._dragStartX + e.offsetX - this._dragStartEvent.offsetX;
		this._y = this._dragStartY + e.offsetY - this._dragStartEvent.offsetY;

		this._ensurePos();

		this._flow.emit({ type: 'nodeMove', data: { id: this._id } });
	}

	_onGraphMouseUp(e) {
		e.stopPropagation();

		let dx = e.offsetX - this._dragStartEvent.offsetX;
		let dy = e.offsetY - this._dragStartEvent.offsetY;
		let tol = this._options['clickTolerance'];
		if (dx < tol && dy < tol) {
			this._forbidClick = false;
		}

		let g = this._flow._graph;
		DomUtil.removeListener(g, 'mousemove', this._onGraphMouseMove, this);
		DomUtil.removeListener(g, 'mouseup', this._onGraphMouseUp, this);

		this._graphDraggable.setAttribute('cursor', 'pointer');
	}

	_onGraphClick(e) {
		e.stopPropagation();

		if (this._forbidClick) { // click event will be fired after mouseup event
			this._forbidClick = false;
			return;
		}

		this._updateSelected(true);

		this._flow.emit({
			type: 'objSelected',
			data: {
				cls: 'Node',
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

	_onPortMouseDown(e) {
		let g = this._flow._graph;
		DomUtil.addListener(g, 'mousemove', this._onPortMouseMove, this);
		DomUtil.addListener(g, 'mouseup', this._onPortMouseUp, this);

		this._dragStartX = this._x;
		this._dragStartY = this._y;
		this._dragStartEvent = e;

		this._graphDraggable.setAttribute('cursor', 'move');
	}

	_ensurePos() {
		let g = this._graph;
		g.setAttribute('transform', `translate(${this._x} ${this._y})`);
	}

	_ensureRunnable() {
		let g = this._graphRunnable;
		if (this._runnable) {
			g.setAttribute('visibility', 'visible');
		} else {
			g.setAttribute('visibility', 'hidden');
		}
	}

	_updateRunnable() {
		let runnable = true;

		for (let i in this._ports) {
			let port = this._ports[i];

			if (!port.isOptional() && !port.isConnected()) {
				runnable = false;
				break;
			}
		}

		this._runnable = runnable;

		this._ensureRunnable();
	}

	_updateProgress(v) {
		let options = this._options;

		// progress should be [0, 100]
		let progress = this._progress = v < 0 ? 0 : Math.min(v, 100);
		let w = options.bgSize - 2 * options.statusOutlineWidth;

		let graphProgress = this._graphProgress;
		graphProgress.setAttribute('width', w * progress / 100);
	}

	_updateStatus(status) {
		let options = this._options;

		let graphStatus = this._graphStatus;
		let graphProgress = this._graphProgress;

		this._status = status;
		if (status == 'running') { // show progress if status is running
			graphStatus.setAttribute('fill', 'none');
			graphProgress.setAttribute('fill', options.runningColor);
		} else {
			let color = options.idleColor;
			switch (status) {
				case 'warn':
					color = options.warnColor;
					break;
				case 'error':
					color = options.errorColor;
					break;
				case 'success':
					color = options.successColor;
					break;
			}
			graphStatus.setAttribute('fill', color);
			graphProgress.setAttribute('fill', 'none');
		}
	}

	_updateSelected(flag) {
		let options = this._options;
		let bg = this._graphBg;

		this._selected = flag;
		if (flag) {
			bg.setAttribute('stroke', options.selectedColor);
			bg.setAttribute('stroke-width', options.selectedWidth);
		} else {
			bg.setAttribute('stroke', 'none');
		}
	}

	_updateHover(flag) {
		let options = this._options;
		let bg = this._graphBg;

		if (flag) {
			bg.setAttribute('stroke', options.hoverColor);
			bg.setAttribute('stroke-width', options.hoverWidth);
		} else {
			if (this._selected) {
				bg.setAttribute('stroke', options.selectedColor);
				bg.setAttribute('stroke-width', options.selectedWidth);
			} else {
				bg.setAttribute('stroke', 'none');
			}
		}
	}

};