/**
 * Algorithm reference: https://llimllib.github.io/pymag-trees/
 */
export default class Layout {

	constructor(tree) {
		this._t = new LayoutTree(tree);
	}

	calc() {
		return this._t.layout();
	}

};


class LayoutTree {

	constructor(tree, parent, depth = 0, number = 1) {
		this._id = tree.id;
		this._children = [];
		let subtrees = tree.children || [];
		for (let i = 0; i < subtrees.length; i++) {
			let subtree = subtrees[i];
			this._children.push(new LayoutTree(subtree, this, depth + 1, i + 1));
		}
		this._parent = parent;
		this._depth = depth;
		this._number = number;

		this._x = -1;
		this._y = depth;
		this._thread = undefined;
		this._mod = 0;
		this._ancestor = this;
		this._change = 0;
		this._shift = 0;
		this._lmostSibling = undefined;
	}

	layout() {
		let t = LayoutTree._firstWalk(this);
		let min = LayoutTree._secondWalk(t);
		if (min < 0) {
			LayoutTree._thirdWalk(t, -min);
		}

		return LayoutTree._extractNodePositions(this);
	}

	_left() {
		return this._thread || (this._children.length && this._children[0]);
	}

	_right() {
		return this._thread || (this._children.length && this._children[this._children.length - 1]);
	}

	_lbrother() {
		let lb;

		let parent = this._parent;
		if (parent) {
			for (let i in parent._children) {
				let c = parent._children[i];
				if (c == this) {
					return lb;
				} else {
					lb = c;
				}
			}
		}

		return lb;
	}

	_getLmostSibling() {
		if (!this._lmostSibling && this._parent && this != this._parent._children[0]) {
			this._lmostSibling = this._parent._children[0];
		}

		return this._lmostSibling;
	}

	static _extractNodePositions(v) {
		let nodes = [];

		nodes.push({
			id: v._id,
			x: v._x,
			y: v._y,
		});

		for (let i in v._children) {
			let c = v._children[i];
			nodes = nodes.concat(LayoutTree._extractNodePositions(c));
		}

		return nodes;
	}

	static _firstWalk(v, distance = 1) {
		if (!v._children.length) {
			let w = v._lbrother();
			v._x = v._getLmostSibling() && w ? w._x + distance : 0;
		} else {
			let defaultAncestor = v._children[0];
			for (let i in v._children) {
				let w = v._children[i];
				LayoutTree._firstWalk(w);
				defaultAncestor = LayoutTree._apportion(w, defaultAncestor, distance);
			}

			LayoutTree._executeShifts(v);

			let midX = (v._children[0]._x + v._children[v._children.length - 1]._x) / 2;

			let w = v._lbrother();
			if (w) {
				v._x = w._x + distance;
				v._mod = v._x - midX;
			} else {
				v._x = midX;
			}
		}

		return v;
	}

	static _apportion(v, defaultAncestor, distance) {
		let w = v._lbrother();
		if (w) {
			// i: inner, o: outer, r: right, l: left;
			let vir = v;
			let vor = v;
			let vil = w;
			let vol = v._getLmostSibling();
			let sir = v._mod;
			let sor = v._mod;
			let sil = vil._mod;
			let sol = vol._mod;

			while (vil._right() && vir._left()) {
				vil = vil._right();
				vir = vir._left();
				vol = vol._left();
				vor = vor._right();

				vor._ancestor = v;

				let shift = (vil._x + sil) - (vir._x + sir) + distance;
				if (shift > 0) {
					let a = LayoutTree._ancestor(vil, v, defaultAncestor);
					LayoutTree._moveSubtree(a, v, shift);
					sir += shift;
					sor += shift;
				}

				sil += vil._mod;
				sir += vir._mod;
				sol += vol._mod;
				sor += vor._mod;
			}

			if (vil._right() && !vor._right()) {
				vor._thread = vil._right();
				vor._mod += (sil - sor);
			} else {
				if (vir._left() && !vol._left()) {
					vol._thread = vir._left();
					vol._mod += (sir - sol);
				}

				defaultAncestor = v;
			}
		}

		return defaultAncestor;
	}

	static _moveSubtree(wl, wr, shift) {
		let subtrees = wr._number - wl._number;
		wr._change -= shift / subtrees;
		wr._shift += shift;
		wl._change += shift / subtrees;
		wr._x += shift;
		wr._mod += shift;
	}

	static _executeShifts(v) {
		let shift = 0;
		let change = 0;
		for (let i = v._children.length - 1; i >= 0; i--) {
			let c = v._children[i];
			c._x += shift;
			c._mod += shift;

			change += c._change;
			shift += (c._shift + change);
		}
	}

	static _ancestor(vil, v, defaultAncestor) {
		if (v._parent && v._parent._children.indexOf(vil._ancestor) > -1) {
			return vil._ancestor;
		} else {
			return defaultAncestor;
		}
	}

	static _secondWalk(v, m = 0, depth = 0, min) {
		v._x += m;
		v._y = depth;

		if (min === undefined || v._x < min) {
			min = v._x;
		}

		for (let i in v._children) {
			let c = v._children[i];
			min = LayoutTree._secondWalk(c, m + v._mod, depth + 1, min);
		}

		return min;
	}

	static _thirdWalk(t, n) {
		t._x += n;
		for (let i in t._children) {
			let c = t._children[i];
			LayoutTree._thirdWalk(c, n);
		}
	}

};