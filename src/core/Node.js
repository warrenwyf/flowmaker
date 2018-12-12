import DomUtil from '../util/DomUtil';
import Port from './Port';

export default class Node {

	constructor(options = {}) {
		let self = this;

		self._options = Object.assign({
			extInfo: {}, // info for external reference
			name: 'Unknown',
			nameSize: '1em',
			desc: 'an unknown node',
			descSize: '0.9em',
			gap: 4,
			bgSize: 40,
			bgRadius: 4,
			bgColor: '#ccc',
			bgOpacity: 0.8,
			icon: '',
			selectedColor: '#000',
			selectedOpacity: 1.0,
			selectedWidth: 1,
			statusColor: '#ccc',
			idleColor: '#fff',
			warnColor: '#fbfb3d',
			errorColor: '#f14f51',
			successColor: '#6cc05d',
			leftPorts: [],
			rightPorts: [],
		}, options);


		self._ports = {}; // key is port id

		self._progress = -1; // show progress bar when this value >= 0
		self._status = 'idle'; // idle | warn | error | success
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

		self._selected = false;
		self._updateSelected();
	}

	_addToFlow(flow, x, y) {
		let self = this;

		if (self._flow) {
			throw new Error(`Node<${self._id}> is already in a flow`);
			return;
		}

		let id = self._id = ++flow._idSeq;
		flow._nodes[id] = self;

		self._flow = flow;
		self._x = x;
		self._y = y;

		self._initGraph();
		self._updatePos();

		return self;
	}

	_initGraph() {
		let self = this;
		let options = self._options;

		let g = self._graph = DomUtil.createSVG('g', 'fm-node');

		// draggable graph, including background and icon
		let draggable = self._graphDraggable = DomUtil.createSVG('g', 'fm-node-draggable', g);
		draggable.setAttribute('cursor', 'pointer');
		draggable.addEventListener("mousedown", self._onMouseDown);
		draggable.addEventListener("dblclick", self._onDoubleClick);
		draggable._obj = self;

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

	_snapToGrid(gridSize) {
		let self = this;

		let oldX = self._x;
		let oldY = self._y;

		let modX = oldX % gridSize;
		let modY = oldY % gridSize;

		if (modX !== 0 || modY !== 0) {
			self._x = oldX - modX;
			self._y = oldY - modY;
			self._updatePos();

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

	_onMouseDown(e) {
		let self = this._obj;

		let flowGraph = self._flow._graph;
		flowGraph.addEventListener("mousemove", self._onMouseMove);
		flowGraph.addEventListener("mouseup", self._onMouseUp);
		flowGraph._draggingTarget = self;

		self._dragStartX = self._x;
		self._dragStartY = self._y;
		self._dragStartEvt = e;

		self._graphDraggable.setAttribute('cursor', 'move');
	}

	_onMouseMove(e) {
		let self = this._draggingTarget;

		let dx = e.clientX - self._dragStartEvt.clientX;
		let dy = e.clientY - self._dragStartEvt.clientY;

		self._x = self._dragStartX + e.clientX - self._dragStartEvt.clientX;
		self._y = self._dragStartY + e.clientY - self._dragStartEvt.clientY;

		self._updatePos();

		self._flow.emit({ type: 'nodeMove', data: { id: self._id } });
	}

	_onMouseUp(e) {
		let self = this._draggingTarget;

		this.removeEventListener("mousemove", self._onMouseMove);
		this.removeEventListener("mouseup", self._onMouseUp);

		self._graphDraggable.setAttribute('cursor', 'pointer');
	}

	_onDoubleClick(e) {
		let self = this._obj;

		self._selected = true;
		self._updateSelected();

		self._flow.emit({ type: 'nodeSelected', data: { id: self._id } });
	}

	_onPortMouseDown(e) {
		let self = this._obj;

		let flowGraph = self._flow._graph;
		flowGraph.addEventListener("mousemove", self._onPortMouseMove);
		flowGraph.addEventListener("mouseup", self._onPortMouseUp);
		flowGraph._draggingTarget = self;

		self._dragStartX = self._x;
		self._dragStartY = self._y;
		self._dragStartEvt = e;

		self._graphDraggable.setAttribute('cursor', 'move');
	}

	_updatePos() {
		let self = this;

		let g = self._graph;
		g.setAttribute('transform', `translate(${self._x} ${self._y})`);
	}

	_updateProgress() {
		let self = this;

		let v = self._progress;

		let x = self._graphProgress._xhtml;
		x.setAttribute('value', `${v}`);
		x.style.display = v >= 0 ? 'block' : 'none';
	}

	_updateStatus() {
		let self = this;

		let options = self._options;

		let color = options.idleColor;
		switch (self._status) {
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

	_updateSelected() {
		let self = this;

		let options = self._options;
		let bg = self._graphBg;

		if (self._selected) {
			bg.setAttribute('stroke', options.selectedColor);
			bg.setAttribute('stroke-opacity', options.selectedOpacity);
			bg.setAttribute('stroke-width', options.selectedWidth);
		} else {
			bg.setAttribute('stroke', 'none');
		}
	}

};