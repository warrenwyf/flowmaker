const LISTENERS_KEY = '__fm_listeners__';

export default class EventBus {

	on(type, callback, context) {
		let listener = {
			callback,
			context: context || this,
		};

		let allListeners = this[LISTENERS_KEY] = this[LISTENERS_KEY] || {};
		allListeners[type] = allListeners[type] || [];
		allListeners[type].push(listener);

		return this;
	}

	off(type, callback, context) {
		let allListeners = this[LISTENERS_KEY];
		if (!allListeners) {
			return this;
		}

		if (!callback) {
			delete allListeners[type];
		} else {
			let listeners = allListeners[type];
			if (listeners) {
				for (let i = listeners.length - 1; i >= 0; i--) {
					if ((listeners[i].callback === callback) && (!context || (listeners[i].context === context))) {
						let removed = listeners.splice(i, 1);
					}
				}
			}
		}

		return this;
	}

	emit(event) {
		if (!event || !event.type) {
			throw new Error('Not an event');
			return this;
		}

		event.cancel = function() {
			this._cancel = true;
			return this;
		};

		let allListeners = this[LISTENERS_KEY] || {};
		let listeners = allListeners[event.type] || [];
		let listener, callback;

		for (let i = listeners.length - 1; i >= 0; i--) {
			listener = listeners[i];

			if (event._cancel) {
				break;
			}

			listener.callback.call(listener.context, event);
		}

		return this;
	}


};