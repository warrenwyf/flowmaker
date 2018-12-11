import DomUtil from '../util/DomUtil';
import EventBus from './EventBus';
import Link from './Link';

export default class Flow extends EventBus {

	constructor(domId, options = {}) {
		super();

		let self = this;

		let container = self._container = document.getElementById(domId);
		if (!container) {
			throw new Error(`DOM with id '${domId}' not found`);
			return;
		}

		self._idSeq = 1;
		self._nodes = {};
		self._links = {};

		self._initGraph();

		window.addEventListener("resize", function() {
			self._updateSize();
		});
	}

	connect(fromNodeId, fromPortId, toNodeId, toPortId) {
		let link = new Link(fromNodeId, fromPortId, toNodeId, toPortId);
		link.addToFlow(this);

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

};