const XHTML_NS = 'http://www.w3.org/1999/xhtml';
const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';


let _svgImages = {};
let _svgImageSeq = 1;
let _svgGrads = {};
let _svgGradsSeq = 1;


export default class DomUtil {

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

	static svgImagePattern(defs, imageSrc, imageWidth, imageHeight) {
		let self = this;

		let id, key = imageSrc + '_' + imageWidth + '_' + imageHeight;
		if (key in _svgImages) {
			id = _svgImages[key];
		} else {
			id = _svgImages[key] = _svgImageSeq++;
		}

		let patternId = 'svg_image_' + id;
		let pattern, image;
		if (!defs.querySelector('#' + patternId)) {
			pattern = self.createSVG('pattern', '', defs);
			pattern.setAttribute('id', patternId);
			pattern.setAttribute('patternUnits', 'userSpaceOnUse');
			pattern.setAttribute('width', imageWidth);
			pattern.setAttribute('height', imageHeight);
			image = self.createSVG('image', '', pattern);
			image.setAttributeNS(XLINK_NS, 'href', imageSrc);
			image.setAttribute('width', imageWidth);
			image.setAttribute('height', imageHeight);
		}

		return patternId;
	}

	static svgGradient(defs, color, opacity) {
		let self = this;

		let id, key = color + '_' + opacity;
		if (key in _svgGrads) {
			id = _svgGrads[key];
		} else {
			id = _svgGrads[key] = _svgGradsSeq++;
		}

		let gradientId = 'svg_grad_' + id;
		let gradient, from, to;
		if (!defs.querySelector('#' + gradientId)) {
			gradient = self.createSVG('radialGradient', '', defs);
			gradient.setAttribute('id', gradientId);
			gradient.setAttribute('gradientUnits', 'objectBoundingBox');
			gradient.setAttribute('cx', '50%');
			gradient.setAttribute('cy', '50%');
			gradient.setAttribute('r', '50%');
			from = self.createSVG('stop', '', gradient);
			from.setAttribute('offset', '0%');
			from.setAttribute('stop-color', color);
			from.setAttribute('stop-opacity', 1);
			to = self.createSVG('stop', '', gradient);
			to.setAttribute('offset', '50%');
			to.setAttribute('stop-color', color);
			to.setAttribute('stop-opacity', opacity);
		}

		return gradientId;
	}

};