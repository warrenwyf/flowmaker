import DomUtil from '../util/DomUtil';
import EventBus from './EventBus';
import Link from './Link';
import Temp from './Temp';
import Validator from './Validator';

export default class Flow extends EventBus {

	constructor(domId, options = {}) {
		super();

		let self = this;

		let container = self._container = document.getElementById(domId);
		if (!container) {
			throw new Error(`DOM with id '${domId}' not found`);
			return;
		}

		self._options = Object.assign({
			fontSize: 12,
		}, options);

		self._x = 0;
		self._y = 0;

		self._idSeq = 1;
		self._nodes = {};
		self._links = {};

		self._initGraph();
		self._initListeners();

		self._ensureSizeAndPos();

		let temp = new Temp();
		temp._addToFlow(self);
	}

	snapToGrid(gridSize = 8) {
		let self = this;

		if (gridSize > 0) {
			for (let key in self._nodes) {
				let node = self._nodes[key];
				node._snapToGrid(gridSize);
			}
		}
	}

	addNode(node, x, y) {
		let self = this;
		node._addToFlow(self, x - self._x, y - self._y);

		return node;
	}

	connect(fromNodeId, fromPortId, toNodeId, toPortId, options) {
		let self = this;

		let connectable = Validator.isConnectable(self, fromNodeId, fromPortId, toNodeId, toPortId);
		if (!connectable) {
			return;
		}

		let link = new Link(fromNodeId, fromPortId, toNodeId, toPortId, options);
		link._addToFlow(self);

		self.emit({
			type: 'linkEstablished',
			data: {
				id: link._id,
				fromNodeId,
				fromPortId,
				toNodeId,
				toPortId,
			}
		});

		return link;
	}

	getNode(nodeId) {
		return this._nodes[nodeId];
	}

	getLink(linkId) {
		return this._links[linkId];
	}

	_initGraph() {
		let self = this;
		let options = self._options;

		let container = self._container;
		container.style.position = 'relative';
		container.style.userSelect = 'none';

		let g = self._graph = DomUtil.createSVG('svg', 'fm-flow', container);
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
		let self = this;

		let container = self._container;
		let w = container.offsetWidth;
		let h = container.offsetHeight;

		let g = self._graph;
		g.setAttribute('viewBox', [-self._x, -self._y, w, h].join(' '));
	}

	_initListeners() {
		let self = this;

		DomUtil.addListener(window, 'resize', self._onWindowResize, self);
		DomUtil.addListener(window, 'keydown', self._onWindowKeyDown, self);

		let g = self._graph;
		DomUtil.addListener(g, 'mousedown', self._onGraphMouseDown, self);
		DomUtil.addListener(g, 'click', self._onGraphClick, self);

		self.on('objSelected', self._onObjSelected);
	}

	_onWindowResize(e) {
		this._ensureSizeAndPos();
	}

	_onWindowKeyDown(e) {
		let self = this;

		if (e.which == 8 /*Backspace*/ || e.which == 46 /*Del*/ ) {
			let selectedObj = self._selectedObj;
			if (selectedObj) {
				if (selectedObj.remove instanceof Function) {
					selectedObj.remove();
				}

				delete self._selectedObj;
			}
		}
	}

	_onGraphMouseDown(e) {
		e.stopPropagation();

		// allow left mouse
		if (e.which !== 1) {
			return;
		}

		let self = this;

		let g = self._graph;
		DomUtil.addListener(g, 'mousemove', self._onGraphMouseMove, self);
		DomUtil.addListener(g, 'mouseup', self._onGraphMouseUp, self);

		self._dragStartX = self._x;
		self._dragStartY = self._y;
		self._dragStartEvent = e;

		g.setAttribute('cursor', 'move');
	}

	_onGraphMouseMove(e) {
		e.stopPropagation();

		let self = this;

		self._x = self._dragStartX + e.offsetX - self._dragStartEvent.offsetX;
		self._y = self._dragStartY + e.offsetY - self._dragStartEvent.offsetY;

		self._ensureSizeAndPos();
	}

	_onGraphMouseUp(e) {
		e.stopPropagation();

		let self = this;

		let g = self._graph;
		DomUtil.removeListener(g, 'mousemove', self._onGraphMouseMove, self);
		DomUtil.removeListener(g, 'mouseup', self._onGraphMouseUp, self);

		self._graph.setAttribute('cursor', 'default');
	}

	_onGraphClick(e) {
		e.stopPropagation();

		let self = this;

		self.emit({
			type: 'objSelected',
			data: {}
		});
	}

	_onObjSelected(e) {
		let self = this;

		let newObj = e.data.obj;
		let selectedObj = self._selectedObj;

		let needUnselect = selectedObj && (newObj != selectedObj);
		if (needUnselect) { // Unselect previous object
			if (selectedObj.unselect instanceof Function) {
				selectedObj.unselect();
			}
		}

		self._selectedObj = newObj;
	}

};