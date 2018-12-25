import CommonUtil from './CommonUtil';

const XHTML_NS = 'http://www.w3.org/1999/xhtml';
const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

const DOM_EVENT_PREFIX = '__fm_dom_event__';

let _svgImages = {};
let _svgImageSeq = 1;
let _svgGrads = {};
let _svgGradsSeq = 1;

export default class DomUtil {

	static getDomEventKey(type, fn, context) {
		return DOM_EVENT_PREFIX + type + '_' + CommonUtil.stamp(fn) + (context ? '_' + CommonUtil.stamp(context) : '');
	}

	static addListener(element, type, fn, context, capture) {
		let eventKey = DomUtil.getDomEventKey(type, fn, context);
		let handler = element[eventKey];

		if (handler) {
			return this;
		}

		handler = function(e) {
			return fn.call(context || element, e);
		};

		element.addEventListener(type, handler, capture);
		element[eventKey] = handler;

		return this;
	}

	static removeListener(element, type, fn, context, capture) {
		let eventKey = DomUtil.getDomEventKey(type, fn, context);
		let handler = element[eventKey];

		if (!handler) {
			return this;
		}

		element.removeEventListener(type, handler, capture);
		element[eventKey] = null;

		return this;
	}

	static create(tagName, className, parent) {
		let element = document.createElement(tagName);
		element.className = className || '';

		if (parent) {
			parent.appendChild(element);
		}

		return element;
	}

	static append(element, parent, className) {
		element.className = className || '';
		if (parent && element) {
			parent.appendChild(element);
		}
		return element;
	}

	static remove(element, parent) {
		if (parent && element) {
			parent.removeChild(element);
		}
	}

	static createNS(ns, tagName, className, parent) {
		if (!document.createElementNS) {
			return this.create(tagName, className, parent);
		}

		let element = document.createElementNS(ns, tagName);
		element.setAttribute('class', className);

		if (parent) {
			parent.appendChild(element);
		}

		return element;
	}

	static createXhtml(tagName, className, parent) {
		return this.createNS(XHTML_NS, tagName, className, parent);
	}

	static createSVG(tagName, className, parent) {
		return this.createNS(SVG_NS, tagName, className, parent);
	}

	static setAttributeXlink(element, name, value) {
		return element.setAttributeNS(XLINK_NS, name, value);
	}

	static svgImagePattern(defs, imageSrc, imageWidth, imageHeight) {
		let id, key = imageSrc + '_' + imageWidth + '_' + imageHeight;
		if (key in _svgImages) {
			id = _svgImages[key];
		} else {
			id = _svgImages[key] = _svgImageSeq++;
		}

		let patternId = 'svg_image_' + id;
		let pattern, image;
		if (!defs.querySelector('#' + patternId)) {
			pattern = this.createSVG('pattern', '', defs);
			pattern.setAttribute('id', patternId);
			pattern.setAttribute('patternUnits', 'userSpaceOnUse');
			pattern.setAttribute('width', imageWidth);
			pattern.setAttribute('height', imageHeight);
			image = this.createSVG('image', '', pattern);
			image.setAttributeNS(XLINK_NS, 'href', imageSrc);
			image.setAttribute('width', imageWidth);
			image.setAttribute('height', imageHeight);
		}

		return patternId;
	}

	static svgGradient(defs, color, opacity) {
		let id, key = color + '_' + opacity;
		if (key in _svgGrads) {
			id = _svgGrads[key];
		} else {
			id = _svgGrads[key] = _svgGradsSeq++;
		}

		let gradientId = 'svg_grad_' + id;
		let gradient, from, to;
		if (!defs.querySelector('#' + gradientId)) {
			gradient = this.createSVG('radialGradient', '', defs);
			gradient.setAttribute('id', gradientId);
			gradient.setAttribute('gradientUnits', 'objectBoundingBox');
			gradient.setAttribute('cx', '50%');
			gradient.setAttribute('cy', '50%');
			gradient.setAttribute('r', '50%');
			from = this.createSVG('stop', '', gradient);
			from.setAttribute('offset', '0%');
			from.setAttribute('stop-color', color);
			from.setAttribute('stop-opacity', 1);
			to = this.createSVG('stop', '', gradient);
			to.setAttribute('offset', '50%');
			to.setAttribute('stop-color', color);
			to.setAttribute('stop-opacity', opacity);
		}

		return gradientId;
	}

};