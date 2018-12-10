import DomUtil from '../util/DomUtil';

export default class Flow {

	constructor(domId, options = {}) {
		let self = this;

		let container = self._container = document.getElementById(domId);
		if (!container) {
			throw new Error(`DOM with id '${domId}' not found`);
			return;
		}

		self._idSeq = 1;
		self._nodes = {};

		self._initGraph();

		window.addEventListener("resize", function() {
			self._updateSize();
		});
	}

	_initGraph() {
		let self = this;

		let container = self._container;
		container.style.position = 'relative';

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