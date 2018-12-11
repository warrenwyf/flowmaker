import DomUtil from '../util/DomUtil';

export default class Port {

	constructor(options = {}) {
		let self = this;

		self._options = Object.assign({
			type: 'input', // input | output
			color: '#000',
			borderColor: '#000',
			borderWidth: 1,
		}, options);
	}

	addToNode(node, idInNode, anchor) {
		let self = this;

		if (!node || !node._ports || !node._graph) {
			throw new Error(`Node not found`);
			return;
		}

		if (!!self._id) {
			throw new Error(`Port<${self._id}> is already in a node`);
			return;
		}

		let id = self._id = idInNode;
		node._ports[id] = self;

		self._node = node;
		self._anchor = anchor;

		self._initGraph();

		return self;
	}

	_initGraph() {
		let self = this;
		let options = self._options;
		let nodeOptions = self._node._options;

		let nodeGraph = self._node._graph;

		let port = DomUtil.createSVG('polygon', 'fm-node-port', nodeGraph);
		switch (options.type) {
			case 'input':
				port.setAttribute('points', `${nodeOptions.bgSize / 5} 0 0 ${-nodeOptions.bgSize / 10} 0 ${nodeOptions.bgSize / 10}`);
				break;
			case 'output':
				port.setAttribute('points', `0 0 ${-nodeOptions.bgSize / 5} ${-nodeOptions.bgSize / 10} ${-nodeOptions.bgSize / 5} ${nodeOptions.bgSize / 10}`);
				break;
		}

		let [anchorX, anchorY] = self._anchor;

		port.setAttribute('transform', `translate(${anchorX} ${anchorY})`);
		port.setAttribute('fill', options.color);

		if (options.borderWidth > 0) {
			port.setAttribute('stroke', options.borderColor);
			port.setAttribute('stroke-width', options.borderWidth);
		}

		port.setAttribute('cursor', 'crosshair');
		// port.addEventListener("mousedown", self._onPortMouseDown);
	}

};