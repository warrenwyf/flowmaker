export default class JsonReceiver {

	constructor(flow) {
		this._flow = flow;
	}

	handle(command) {
		if (!this._flow) {
			return;
		}

		let json = JSON.parse(command);
		let { name, data } = json;

		switch (name) {
			case 'update_node_status':
				this._handleUpdateNodeStatus(data);
				break;
			case 'update_node_progress':
				this._handleUpdateNodeProgress(data);
				break;
		}
	}

	_handleUpdateNodeStatus(data) {
		let flow = this._flow;

		let { nodeId, status } = data;

		let node = flow.getNode(nodeId);
		node && node._updateStatus(status);
	}

	_handleUpdateNodeProgress(data) {
		let flow = this._flow;

		let { nodeId, progress } = data;

		let node = flow.getNode(nodeId);
		node && node._updateProgress(progress);
	}

};