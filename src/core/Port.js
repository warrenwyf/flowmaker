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

	getType() {
		return this._options.type;
	}

	_addToNode(node, idInNode, anchor) {
		let self = this;

		if (self._node) {
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

		let g = DomUtil.createSVG('polygon', 'fm-node-port', nodeGraph);
		g._obj = self;

		switch (options.type) {
			case 'input':
				g.setAttribute('points', `${nodeOptions.bgSize / 5} 0 0 ${-nodeOptions.bgSize / 10} 0 ${nodeOptions.bgSize / 10}`);
				break;
			case 'output':
				g.setAttribute('cursor', 'crosshair'); // output port can be a Link's upstream
				g.setAttribute('points', `0 0 ${-nodeOptions.bgSize / 5} ${-nodeOptions.bgSize / 10} ${-nodeOptions.bgSize / 5} ${nodeOptions.bgSize / 10}`);
				break;
		}

		let [anchorX, anchorY] = self._anchor;

		g.setAttribute('transform', `translate(${anchorX} ${anchorY})`);
		g.setAttribute('fill', options.color);

		if (options.borderWidth > 0) {
			g.setAttribute('stroke', options.borderColor);
			g.setAttribute('stroke-width', options.borderWidth);
		}

		g.addEventListener("mousedown", self._onGraphMouseDown);
		g.addEventListener("mouseover", self._onGraphMouseOver);
		g.addEventListener("mouseout", self._onGraphMouseOut);
	}

	_onGraphMouseDown(e) {
		e.stopPropagation();

		// allow left mouse
		if (e.which !== 1) {
			return;
		}

		let self = this._obj;
		let node = self._node;

		if (self._options.type == 'input') {
			return;
		}

		node._flow.emit({
			type: 'portMouseDown',
			data: {
				nodeId: node._id,
				portId: self._id,
				x: e.clientX,
				y: e.clientY,
			}
		});
	}

	_onGraphMouseOver(e) {
		e.stopPropagation();

		let self = this._obj;
		let node = self._node;

		node._flow.emit({
			type: 'portMouseOver',
			data: {
				nodeId: node._id,
				portId: self._id,
				x: e.clientX,
				y: e.clientY,
			}
		});
	}

	_onMouGraphseOut(e) {
		e.stopPropagation();

		let self = this._obj;
		let node = self._node;

		node._flow.emit({
			type: 'portMouseOut',
			data: {
				nodeId: node._id,
				portId: self._id,
				x: e.clientX,
				y: e.clientY,
			}
		});
	}

};