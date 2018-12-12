import DomUtil from '../util/DomUtil';
import CommonUtil from '../util/CommonUtil';
import Port from './Port';

const DEFAULT_OPTIONS = {
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
	statusColor: '#ccc',
	idleColor: '#fff',
	warnColor: '#fbfb3d',
	errorColor: '#f14f51',
	successColor: '#6cc05d',
	leftPorts: [],
	rightPorts: [],
};

export default class Node {

	constructor(options = {}) {
		let self = this;

		self._options = Object.assign({}, DEFAULT_OPTIONS, options);

		self._ports = {}; // key is port id

		self._progress = -1; // show progress bar when this value >= 0
		self._status = 'idle'; // idle | warn | error | success
	}

	exportToObject() {
		let self = this;

		let obj = {
			options: {},
			x: self._x,
			y: self._y,
			id: self._id,
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

	getId() {
		return this._id;
	}

	getPort(portId) {
		return this._ports[portId];
	}

	getPortAnchor(portId) {
		let self = this;

		let port = self._ports[portId];
		if (port) {
			let anchor = port._anchor;
			return [anchor[0] + self._x, anchor[1] + self._y];
		}
	}

	unselect() {
		let self = this;

		self._updateSelected(false);
		return self;
	}

	remove() {
		this._remove();
	}

	_addToFlow(flow, x, y, options = {}) {
		let self = this;

		if (self._flow) {
			throw new Error(`Node<${self._id}> is already in a flow`);
			return;
		}

		let id = self._id = options.id || ++flow._idSeq;
		flow._nodes[id] = self;

		self._flow = flow;
		self._x = x;
		self._y = y;

		self._initGraph();
		self._addListeners();

		self._ensurePos();

		return self;
	}

	_remove() {
		let self = this;
		let flow = self._flow;

		self._removeListeners();
		self._graph.remove();

		delete flow._nodes[self._id];

		self._flow.emit({
			type: 'nodeRemoved',
			data: {
				obj: self,
			}
		});
	}

	_initGraph() {
		let self = this;
		let options = self._options;

		let g = self._graph = DomUtil.createSVG('g', 'fm-node');

		// draggable graph, including background and icon
		let draggable = self._graphDraggable = DomUtil.createSVG('g', 'fm-node-draggable', g);
		draggable.setAttribute('cursor', 'pointer');

		// background
		let bg = self._graphBg = DomUtil.createSVG('rect', 'fm-node-bg', draggable);
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
			let icon = self._graphIcon = DomUtil.createSVG('image', 'fm-node-icon', draggable);
			icon.setAttribute('href', options.icon);
			icon.setAttribute('x', options.bgRadius - options.bgSize / 2);
			icon.setAttribute('y', options.bgRadius - options.bgSize / 2);
			icon.setAttribute('width', options.bgSize - 2 * options.bgRadius);
			icon.setAttribute('height', options.bgSize - 2 * options.bgRadius);
			icon.setAttribute('preserveAspectRatio', 'xMidYMid meet');
		}

		// name
		let name = self._graphName = DomUtil.createSVG('text', 'fm-node-name', g);
		name.innerHTML = options.name;
		name.setAttribute('x', 0);
		name.setAttribute('y', -options.bgSize / 2 - options.gap);
		name.setAttribute('font-size', options.nameSize);
		name.setAttribute('text-anchor', 'middle');
		name.setAttribute('alignment-baseline', 'text-after-edge');
		name.setAttribute('font-weight', 'bold');
		name.setAttribute('cursor', 'default');

		// desc
		let desc = self._graphDesc = DomUtil.createSVG('text', 'fm-node-desc', g);
		desc.innerHTML = options.desc;
		desc.setAttribute('x', 0);
		desc.setAttribute('y', options.bgSize / 2 + options.gap * 3);
		desc.setAttribute('font-size', options.descSize);
		desc.setAttribute('text-anchor', 'middle');
		desc.setAttribute('alignment-baseline', 'text-before-edge');
		desc.setAttribute('cursor', 'default');


		// used by ports
		let sideLen = options.bgSize - 4 * options.bgRadius;

		// left ports
		let leftPortsCount = options.leftPorts.length;
		if (leftPortsCount > 0) {
			let sideSpacing = leftPortsCount == 1 ? 0 : sideLen / (leftPortsCount - 1);
			for (let i = 0; i < leftPortsCount; i++) {
				let portOptions = options.leftPorts[i];

				let anchor = self._calcPortAnchor(portOptions, i, -options.bgSize / 2, sideLen, sideSpacing);
				let port = new Port(portOptions);
				port._addToNode(self, `l-${i}`, anchor);
			}
		}

		// right ports
		let rightPortsCount = options.rightPorts.length;
		if (rightPortsCount > 0) {
			let sideSpacing = rightPortsCount == 1 ? 0 : sideLen / (rightPortsCount - 1);
			for (let i = 0; i < rightPortsCount; i++) {
				let portOptions = options.rightPorts[i];

				let anchor = self._calcPortAnchor(portOptions, i, options.bgSize / 2, sideLen, sideSpacing);
				let port = new Port(portOptions);
				port._addToNode(self, `r-${i}`, anchor);
			}
		}


		// progress
		let progress = self._graphProgress = DomUtil.createSVG('foreignObject', 'fm-node-progress', g);
		progress.setAttribute('transform', `translate(${-options.bgSize / 2} ${options.bgSize / 2})`);
		let x = progress._xhtml = DomUtil.createXhtml('progress', '', progress);
		x.setAttribute('max', '100');
		x.style.width = options.bgSize + 'px';
		x.style.height = options.gap + 'px';
		x.style.display = 'none';

		// status
		let status = self._graphStatus = DomUtil.createSVG('rect', 'fm-node-status', g);
		status.setAttribute('x', -options.bgSize / 2);
		status.setAttribute('y', options.bgSize / 2 + options.gap);
		status.setAttribute('width', options.bgSize);
		status.setAttribute('height', options.gap);
		status.setAttribute('rx', options.gap / 2);
		status.setAttribute('ry', options.gap / 2);
		status.setAttribute('fill', options.idleColor);
		status.setAttribute('stroke', options.statusColor);
		status.setAttribute('stroke-width', '1');


		let flow = self._flow;
		flow._graph.appendChild(g);
	}

	_addListeners() {
		let self = this;

		let g = self._graphDraggable;
		DomUtil.addListener(g, 'mousedown', self._onGraphMouseDown, self);
		DomUtil.addListener(g, 'click', self._onGraphClick, self);
	}

	_removeListeners() {
		let self = this;

		let g = self._graphDraggable;
		DomUtil.removeListener(g, 'mousedown', self._onGraphMouseDown, self);
		DomUtil.removeListener(g, 'click', self._onGraphClick, self);
	}

	_snapToGrid(gridSize) {
		let self = this;

		let oldX = self._x;
		let oldY = self._y;

		let modX = oldX % gridSize;
		let modY = oldY % gridSize;

		if (modX !== 0 || modY !== 0) {
			let dx = modX < (gridSize - modX) ? -modX : gridSize - modX;
			let dy = modY < (gridSize - modY) ? -modY : gridSize - modY;

			self._x = oldX + dx;
			self._y = oldY + dy;
			self._ensurePos();

			self._flow.emit({ type: 'nodeMove', data: { id: self._id } });
		}
	}

	_calcPortAnchor(portOptions, sideIdx, sideX, sideLen, sideSpacing) {
		let self = this;
		let options = self._options;

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

		let self = this;

		let g = self._flow._graph;
		DomUtil.addListener(g, 'mousemove', self._onGraphMouseMove, self);
		DomUtil.addListener(g, 'mouseup', self._onGraphMouseUp, self);

		self._dragStartX = self._x;
		self._dragStartY = self._y;
		self._dragStartEvent = e;

		self._graphDraggable.setAttribute('cursor', 'move');
	}

	_onGraphMouseMove(e) {
		e.stopPropagation();

		let self = this;

		self._x = self._dragStartX + e.offsetX - self._dragStartEvent.offsetX;
		self._y = self._dragStartY + e.offsetY - self._dragStartEvent.offsetY;

		self._ensurePos();

		self._flow.emit({ type: 'nodeMove', data: { id: self._id } });
	}

	_onGraphMouseUp(e) {
		e.stopPropagation();

		let self = this;

		let g = self._flow._graph;
		DomUtil.removeListener(g, 'mousemove', self._onGraphMouseMove, self);
		DomUtil.removeListener(g, 'mouseup', self._onGraphMouseUp, self);

		self._graphDraggable.setAttribute('cursor', 'pointer');
	}

	_onGraphClick(e) {
		e.stopPropagation();

		let self = this;

		self._updateSelected(true);

		self._flow.emit({
			type: 'objSelected',
			data: {
				cls: 'Node',
				obj: self,
			}
		});
	}

	_onPortMouseDown(e) {
		let self = this;

		let g = self._flow._graph;
		DomUtil.addListener(g, 'mousemove', self._onPortMouseMove, self);
		DomUtil.addListener(g, 'mouseup', self._onPortMouseUp, self);

		self._dragStartX = self._x;
		self._dragStartY = self._y;
		self._dragStartEvent = e;

		self._graphDraggable.setAttribute('cursor', 'move');
	}

	_ensurePos() {
		let self = this;

		let g = self._graph;
		g.setAttribute('transform', `translate(${self._x} ${self._y})`);
	}

	_updateProgress(v) {
		let self = this;

		self._progress = v;

		let x = self._graphProgress._xhtml;
		x.setAttribute('value', `${v}`);
		x.style.display = v >= 0 ? 'block' : 'none';
	}

	_updateStatus(status) {
		let self = this;
		let options = self._options;

		self._status = status;

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
		self._graphStatus.setAttribute('fill', color);
	}

	_updateSelected(flag) {
		let self = this;

		let options = self._options;
		let bg = self._graphBg;

		self._selected = flag;
		if (flag) {
			bg.setAttribute('stroke', options.selectedColor);
			bg.setAttribute('stroke-width', options.selectedWidth);
		} else {
			bg.setAttribute('stroke', 'none');
		}
	}

};