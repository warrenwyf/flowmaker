import DomUtil from '../util/DomUtil';

export default class Node {

	constructor(options = {}) {
		let self = this;

		self._options = Object.assign({
			name: 'Unknown',
			nameSize: '1.1em',
			desc: 'dafdsf',
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
		}, options);
	}

	addToFlow(flow, x, y) {
		let self = this;

		if (!flow || !flow._nodes || !flow._graph) {
			throw new Error(`Flow not found`);
			return;
		}

		if (!!self._id) {
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
	}

	_initGraph() {
		let self = this;

		let options = self._options;
		let g = self._graph = DomUtil.createSVG('g', 'fm-node');

		// background
		let bg = self._graphBg = DomUtil.createSVG('rect', 'fm-node-bg', g);
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
			let icon = self._graphIcon = DomUtil.createSVG('image', 'fm-node-icon', g);
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

		// desc
		let desc = self._graphDesc = DomUtil.createSVG('text', 'fm-node-desc', g);
		desc.innerHTML = options.desc;
		desc.setAttribute('x', 0);
		desc.setAttribute('y', options.bgSize / 2 + options.gap);
		desc.setAttribute('font-size', options.descSize);
		desc.setAttribute('text-anchor', 'middle');
		desc.setAttribute('alignment-baseline', 'text-before-edge');

		// in ports
		let port = DomUtil.createSVG('polygon', 'fm-node-port', g);
		port.setAttribute('points', `0 0 ${-options.bgSize / 5} ${-options.bgSize / 10} ${-options.bgSize / 5} ${options.bgSize / 10}`);
		port.setAttribute('transform', `translate(${-options.bgSize / 2} 0)`);
		port.setAttribute('fill', '#000');
		port.setAttribute('fill-opacity', 1.0);

		// out ports


		let flow = self._flow;
		flow._graph.appendChild(g);

		self._updatePos();
	}

	_updatePos() {
		let self = this;

		let g = self._graph;
		g.setAttribute('transform', `translate(${self._x} ${self._y})`);
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