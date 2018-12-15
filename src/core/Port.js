import DomUtil from '../util/DomUtil';

const DEFAULT_OPTIONS = {
	type: 'input', // input | output
	optional: false,
	color: '#000',
	borderColor: '#000',
	borderWidth: 1,
};

export default class Port {

	constructor(options = {}) {
		this._options = Object.assign({}, DEFAULT_OPTIONS, options);

		this._connectedLinks = [];
	}

	getType() {
		return this._options.type;
	}

	isOptional() {
		return this._options.optional;
	}

	isConnected() {
		return this._connectedLinks.length > 0;
	}

	_addToNode(node, idInNode, anchor) {
		if (this._node) {
			throw new Error(`Port<${this._id}> is already in a node`);
			return;
		}

		let id = this._id = idInNode;
		node._ports[id] = this;

		this._node = node;
		this._anchor = anchor;

		this._initGraph();
		this._addListeners();

		return this;
	}

	_initGraph() {
		let options = this._options;
		let nodeOptions = this._node._options;

		let nodeGraph = this._node._graph;

		let g = this._graph = DomUtil.createSVG('polygon', 'fm-node-port', nodeGraph);

		switch (options.type) {
			case 'input':
				g.setAttribute('points', `${nodeOptions.bgSize / 5} 0 0 ${-nodeOptions.bgSize / 10} 0 ${nodeOptions.bgSize / 10}`);
				break;
			case 'output':
				g.setAttribute('cursor', 'crosshair'); // output port can be a Link's upstream
				g.setAttribute('points', `0 0 ${-nodeOptions.bgSize / 5} ${-nodeOptions.bgSize / 10} ${-nodeOptions.bgSize / 5} ${nodeOptions.bgSize / 10}`);
				break;
		}

		let [anchorX, anchorY] = this._anchor;

		g.setAttribute('transform', `translate(${anchorX} ${anchorY})`);
		g.setAttribute('fill', options.color);

		if (options.borderWidth > 0) {
			g.setAttribute('stroke', options.borderColor);
			g.setAttribute('stroke-width', options.borderWidth);
		}
	}

	_addListeners() {
		let g = this._graph;

		DomUtil.addListener(g, 'mousedown', this._onGraphMouseDown, this);
		DomUtil.addListener(g, 'mouseover', this._onGraphMouseOver, this);
		DomUtil.addListener(g, 'mouseout', this._onGraphMouseOut, this);
	}

	_onGraphMouseDown(e) {
		e.stopPropagation();

		// allow left mouse
		if (e.which !== 1) {
			return;
		}

		if (this._options.type == 'input') {
			return;
		}

		let node = this._node;
		node._flow.emit({
			type: 'portMouseDown',
			data: {
				nodeId: node._id,
				portId: this._id,
				x: e.offsetX,
				y: e.offsetY,
			}
		});
	}

	_onGraphMouseOver(e) {
		e.stopPropagation();

		let node = this._node;
		node._flow.emit({
			type: 'portMouseOver',
			data: {
				nodeId: node._id,
				portId: this._id,
				x: e.offsetX,
				y: e.offsetY,
			}
		});
	}

	_onGraphMouseOut(e) {
		e.stopPropagation();

		let node = this._node;
		node._flow.emit({
			type: 'portMouseOut',
			data: {
				nodeId: node._id,
				portId: this._id,
				x: e.offsetX,
				y: e.offsetY,
			}
		});
	}

};