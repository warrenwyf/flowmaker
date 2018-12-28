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
		if (fromPort._options['type'] == 'input') {
			return false;
		}

		// output port can not be toPort
		if (toPort._options['type'] == 'output') {
			return false;
		}

		// check data types
		let fromDataTypes = fromPort._options['dataTypes'];
		let toDataTypes = toPort._options['dataTypes'];
		let dataTypeMatched = false;

		check:
			for (let i = 0; i < fromDataTypes.length; i++) {
				let fromT = fromDataTypes[i];
				for (let j = 0; j < toDataTypes.length; j++) {
					let toT = toDataTypes[i];
					if (fromT == 'any' || toT == 'any' || fromT == toT) {
						dataTypeMatched = true;
						break check;
					}
				}
			}

		if (!dataTypeMatched) {
			return false;
		}

		return true;
	}

};