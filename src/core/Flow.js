import DomUtil from '../util/DomUtil';
import CommonUtil from '../util/CommonUtil';
import Layout from '../util/Layout';
import EventBus from './EventBus';
import Node from './Node';
import Link from './Link';
import Temp from './Temp';
import Validator from './Validator';
import JsonReceiver from '../protocol/JsonReceiver';

const DEFAULT_OPTIONS = {
	fontSize: 12,
	gridWidth: 180,
	gridHeight: 120,
};

export default class Flow extends EventBus {

	constructor(domId, options = {}) {
		super();

		let container = this._container = document.getElementById(domId);
		if (!container) {
			throw new Error(`DOM with id '${domId}' not found`);
			return;
		}

		this._options = Object.assign({}, DEFAULT_OPTIONS, options);
		this._jsonReceiver = new JsonReceiver(this);
		this._readOnly = false;

		this._x = 0;
		this._y = 0;

		this._idSeq = 1;

		this._nodes = {};
		this._linksByFrom = {};
		this._linksByTo = {};

		this._initGraph();
		this._initListeners();

		this._ensureSizeAndPos();

		let temp = new Temp();
		temp._addToFlow(this);
	}

	clear() {
		if (this._readOnly) {
			return;
		}

		for (let k in this._links) {
			let link = this._links[k];
			link.remove();
		}

		for (let k in this._nodes) {
			let node = this._nodes[k];
			node.remove();
		}
	}

	exportToObject() {
		let obj = {
			options: {},
			x: this._x,
			y: this._y,
			idSeq: this._idSeq,
			nodes: [],
			links: [],
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

		for (let k in this._nodes) {
			let node = this._nodes[k];
			obj.nodes.push(node.exportToObject());
		}

		for (let k in this._links) {
			let link = this._links[k];
			obj.links.push(link.exportToObject());
		}

		return obj;
	}

	importFromObject(obj) {
		if (this._readOnly) {
			return;
		}

		this.clear();

		this._x = obj.x || 0;
		this._y = obj.y || 0;
		this._idSeq = obj.idSeq || 1;

		for (let k in obj.nodes) {
			let { x, y, options, id } = obj.nodes[k];
			let node = new Node(options);
			this.addNode(node, x, y, { id });
		}

		for (let k in obj.links) {
			let { fromNodeId, fromPortId, toNodeId, toPortId, options } = obj.links[k];
			this.connect(fromNodeId, fromPortId, toNodeId, toPortId, options);
		}

		this._ensureSizeAndPos();

		return this;
	}

	snapToGrid() {
		let { gridWidth, gridHeight } = this._options;

		for (let key in this._nodes) {
			let node = this._nodes[key];
			node._snapToGrid(gridWidth, gridHeight);
		}

		return this;
	}

	autoLayout() {
		let { gridWidth, gridHeight } = this._options;

		// start from nodes which have no leftPort connected
		let startNodes = {};
		for (let i in this._nodes) {
			let leftConnected = false;

			let node = this._nodes[i];
			for (let i = 0; i < node._options.leftPorts.length; i++) {
				let portId = `l-${i}`;
				let port = node.getPort(portId);
				if (port.isConnected()) {
					leftConnected = true;
					break;
				}
			}

			if (!leftConnected) {
				startNodes[node._id] = node;
			}
		}

		let occupiedRows = 0;
		let locatedPositions = {};

		for (let k in startNodes) {
			let tree = this._genTreeData(startNodes[k]);
			let layout = new Layout(tree);
			let positions = layout.calc();

			let minY = Number.MAX_VALUE;
			let maxY = 0;
			for (let i in positions) {
				let pos = positions[i];
				if (pos.id in locatedPositions) {
					continue;
				}
				locatedPositions[pos.id] = pos;

				minY = Math.min(minY, pos.x);
				maxY = Math.max(maxY, pos.x);

				let node = this._nodes[pos.id];
				if (node) {
					let x = -this._x + pos.y * gridWidth + 0.5 * gridWidth;
					let y = -this._y + pos.x * gridHeight + (occupiedRows + 0.5) * gridHeight;
					node.moveTo(x, y);
				}
			}

			occupiedRows += (maxY - minY + 1);
		}

		// Unlocated nodes
		for (let i in this._nodes) {
			let node = this._nodes[i];
			if (!(node._id in locatedPositions)) {
				let x = -this._x + 0.5 * gridWidth;
				let y = -this._y + (occupiedRows + 0.5) * gridHeight;
				node.moveTo(x, y);

				occupiedRows += 1;
			}
		}

		return this;
	}

	setReadOnly(v) {
		this._readOnly = v;
	}

	isReadOnly() {
		return this._readOnly;
	}

	addNode(node, x, y, options = {}) {
		if (this._readOnly) {
			return;
		}

		node._addToFlow(this, x - this._x, y - this._y, options);

		return node;
	}

	connect(fromNodeId, fromPortId, toNodeId, toPortId, options) {
		if (this._readOnly) {
			return;
		}

		let connectable = Validator.isConnectable(this, fromNodeId, fromPortId, toNodeId, toPortId);
		if (!connectable) {
			return;
		}

		let link = new Link(fromNodeId, fromPortId, toNodeId, toPortId, options);
		link._addToFlow(this);

		this.emit({
			type: 'linkAdded',
			data: {
				obj: link,
			}
		});

		return link;
	}

	getNode(nodeId) {
		return this._nodes[nodeId];
	}

	sendCommand(command, protocol = 'json') {
		switch (protocol) {
			case 'json':
				this._jsonReceiver.handle(command);
				break;
		}
	}

	_initGraph() {
		let options = this._options;

		let container = this._container;
		container.style.position = 'relative';
		container.style.userSelect = 'none';

		let g = this._graph = DomUtil.createSVG('svg', 'fm-flow', container);
		g.setAttribute('shape-rendering', 'auto');
		g.setAttribute('text-rendering', 'auto');
		g.setAttribute('color-rendering', 'auto');
		g.setAttribute('image-rendering', 'auto');
		g.setAttribute('color-interpolation', 'auto');
		g.setAttribute('preserveAspectRatio', 'none');
		g.setAttribute('stroke-linecap', 'butt');
		g.setAttribute('stroke-linejoin', 'round');
		g.setAttribute('width', '100%');
		g.setAttribute('height', '100%');
		g.setAttribute('font-size', options.fontSize);
	}

	_ensureSizeAndPos() {
		let container = this._container;
		let w = container.offsetWidth;
		let h = container.offsetHeight;

		let g = this._graph;
		g.setAttribute('viewBox', [-this._x, -this._y, w, h].join(' '));
	}

	_initListeners() {
		DomUtil.addListener(window, 'resize', this._onWindowResize, this);
		DomUtil.addListener(window, 'keydown', this._onWindowKeyDown, this);

		let g = this._graph;
		DomUtil.addListener(g, 'mousedown', this._onGraphMouseDown, this);
		DomUtil.addListener(g, 'click', this._onGraphClick, this);

		this.on('objSelected', this._onObjSelected);
		this.on('linkAdded', this._onLinkAdded);
		this.on('linkRemoved', this._onLinkRemoved);
	}

	_onWindowResize(e) {
		this._ensureSizeAndPos();
	}

	_onWindowKeyDown(e) {
		if (e.which == 8 /*Backspace*/ || e.which == 46 /*Del*/ ) {
			if (this._readOnly) {
				return;
			}

			let selectedObj = this._selectedObj;
			if (selectedObj) {
				if (selectedObj.remove instanceof Function) {
					selectedObj.remove();
				}

				delete this._selectedObj;
			}
		}
	}

	_onGraphMouseDown(e) {
		e.stopPropagation();

		// allow left mouse
		if (e.which !== 1) {
			return;
		}


		let g = this._graph;
		DomUtil.addListener(g, 'mousemove', this._onGraphMouseMove, this);
		DomUtil.addListener(g, 'mouseup', this._onGraphMouseUp, this);

		this._dragStartX = this._x;
		this._dragStartY = this._y;
		this._dragStartEvent = e;

		g.setAttribute('cursor', 'move');
	}

	_onGraphMouseMove(e) {
		e.stopPropagation();


		this._x = this._dragStartX + e.offsetX - this._dragStartEvent.offsetX;
		this._y = this._dragStartY + e.offsetY - this._dragStartEvent.offsetY;

		this._ensureSizeAndPos();
	}

	_onGraphMouseUp(e) {
		e.stopPropagation();

		let g = this._graph;
		DomUtil.removeListener(g, 'mousemove', this._onGraphMouseMove, this);
		DomUtil.removeListener(g, 'mouseup', this._onGraphMouseUp, this);

		this._graph.setAttribute('cursor', 'default');
	}

	_onGraphClick(e) {
		e.stopPropagation();

		this.emit({
			type: 'objSelected',
			data: {}
		});
	}

	_onObjSelected(e) {
		let newObj = e.data.obj;
		let selectedObj = this._selectedObj;

		let needUnselect = selectedObj && (newObj != selectedObj);
		if (needUnselect) { // Unselect previous object
			if (selectedObj.unselect instanceof Function) {
				selectedObj.unselect();
			}
		}

		this._selectedObj = newObj;
	}

	_onLinkAdded(e) {
		let link = e.data.obj;
		this._updateNodeByLink(link, 'add');
	}

	_onLinkRemoved(e) {
		let link = e.data.obj;
		this._updateNodeByLink(link, 'remove');
	}

	_updateNodeByLink(link, action) {
		let linkKey = link.getKey();

		let fromNode = this._nodes[link._fromNodeId];
		let fromPort = fromNode && fromNode.getPort(link._fromPortId);
		let toNode = this._nodes[link._toNodeId];
		let toPort = toNode && toNode.getPort(link._toPortId);

		// Update relative ports' connectedLinks property
		switch (action) {
			case 'add':
				fromPort && fromPort._connectedLinks.push(linkKey);
				toPort && toPort._connectedLinks.push(linkKey);
				break;
			case 'remove':
				let fromIdx = fromPort && fromPort._connectedLinks.indexOf(linkKey);
				fromIdx > -1 && fromPort && fromPort._connectedLinks.splice(fromIdx, 1);
				let toIdx = toPort && toPort._connectedLinks.indexOf(linkKey);
				toIdx > -1 && toPort && toPort._connectedLinks.splice(toIdx, 1);
				break;
		}

		// Update relative nodes' runnable property
		fromNode && fromNode._updateRunnable();
		toNode && toNode._updateRunnable();
	}

	_genTreeData(node) {
		let tree = {};

		tree.id = node._id;
		tree.children = [];

		let downstreamNodes = node.getDownstreamNodes();
		for (let i in downstreamNodes) {
			let n = downstreamNodes[i];
			tree.children.push(this._genTreeData(n));
		}

		return tree;
	}

};