export default class Validator {

	static isConnectable(flow, fromNodeId, fromPortId, toNodeId, toPortId) {
		let fromNode = flow.getNode(fromNodeId);
		let fromPort = fromNode && fromNode.getPort(fromPortId);
		let toNode = flow.getNode(toNodeId);
		let toPort = toNode && toNode.getPort(toPortId);

		// check ports exists
		if (!fromPort || !toPort) {
			return false;
		}

		// input port can not be fromPort
		if (fromPort.getType() == 'input') {
			return false;
		}

		// output port can not be toPort
		if (toPort.getType() == 'output') {
			return false;
		}

		return true;
	}

};