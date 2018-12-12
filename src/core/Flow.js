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

		self._options = Object.assign({}, options);

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

	snapToGrid(gridSize) {
		let self = this;

		if (gridSize > 0) {
			for (let key in self._nodes) {
				let node = self._nodes[key];
				node._snapToGrid(gridSize);
			}
		}
	}

	addNode(node, x, y) {
		node._addToFlow(this, x, y);

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

		let container = self._container;
		container.style.position = 'relative';
		container.style.userSelect = 'none';

		let g = self._graph = DomUtil.createSVG('svg', 'fm-flow', container);
		g._obj = self;
		g.setAttribute('shape-rendering', 'auto');
		g.setAttribute('text-rendering', 'auto');
		g.setAttribute('color-rendering', 'auto');
		g.setAttribute('image-rendering', 'auto');
		g.setAttribute('color-interpolation', 'auto');
		g.setAttribute('preserveAspectRatio', 'none');
		g.setAttribute('font-size', '12');
		g.setAttribute('stroke-linecap', 'round');
		g.setAttribute('stroke-linejoin', 'round');
		g.setAttribute('width', '100%');
		g.setAttribute('height', '100%');
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

		window.addEventListener("resize", function() {
			self._updateSize();
		});

		let g = self._graph;
		g.addEventListener("mousedown", self._onGraphMouseDown);
		g.addEventListener("click", self._onGraphClick);

		self.on('objSelected', self._onObjSelected);
	}

	_onGraphMouseDown(e) {
		e.stopPropagation();

		// allow left mouse
		if (e.which !== 1) {
			return;
		}

		let self = this._obj;

		let g = self._graph;
		g.addEventListener("mousemove", self._onGraphMouseMove);
		g.addEventListener("mouseup", self._onGraphMouseUp);

		self._dragStartX = self._x;
		self._dragStartY = self._y;
		self._dragStartEvent = e;

		g.setAttribute('cursor', 'move');
	}

	_onGraphMouseMove(e) {
		e.stopPropagation();

		let self = this._obj;

		self._x = self._dragStartX + e.clientX - self._dragStartEvent.clientX;
		self._y = self._dragStartY + e.clientY - self._dragStartEvent.clientY;

		self._ensureSizeAndPos();
	}

	_onGraphMouseUp(e) {
		e.stopPropagation();

		let self = this._obj;

		this.removeEventListener("mousemove", self._onGraphMouseMove);
		this.removeEventListener("mouseup", self._onGraphMouseUp);

		self._graph.setAttribute('cursor', 'default');
	}

	_onGraphClick(e) {
		e.stopPropagation();

		let self = this._obj;

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