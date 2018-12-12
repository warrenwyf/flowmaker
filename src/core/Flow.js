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

		self._idSeq = 1;
		self._nodes = {};
		self._links = {};

		self._initGraph();
		self._initListeners();

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

		g._obj = self;

		self._updateSize();
	}

	_updateSize() {
		let self = this;

		let container = self._container;
		let w = container.offsetWidth;
		let h = container.offsetHeight;

		let g = self._graph;
		g.setAttribute('viewBox', [0, 0, w, h].join(' '));
	}

	_initListeners() {
		let self = this;

		window.addEventListener("resize", function() {
			self._updateSize();
		});
	}

};