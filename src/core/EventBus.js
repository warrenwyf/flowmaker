const LISTENERS_KEY = '__fm_listeners__';

export default class EventBus {

	on(type, callback, context) {
		let self = this;

		let listener = {
			callback,
			context: context || self,
		};

		let allListeners = self[LISTENERS_KEY] = self[LISTENERS_KEY] || {};
		allListeners[type] = allListeners[type] || [];
		allListeners[type].push(listener);

		return self;
	}

	off(type, callback, context) {
		let self = this;

		let allListeners = self[LISTENERS_KEY];
		if (!allListeners) {
			return self;
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

		return self;
	}

	emit(event) {
		let self = this;

		if (!event || !event.type) {
			throw new Error('Not an event');
			return self;
		}

		event.cancel = function() {
			this._cancel = true;
			return this;
		};

		let allListeners = self[LISTENERS_KEY] || {};
		let listeners = allListeners[event.type] || [];
		let listener, callback;

		for (let i = listeners.length - 1; i >= 0; i--) {
			listener = listeners[i];

			if (event._cancel) {
				break;
			}

			listener.callback.call(listener.context, event);
		}

		return self;
	}


};