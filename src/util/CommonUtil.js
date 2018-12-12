const ID_KEY = '__fm_id__';

let _stampId = 1;

export default class CommonUtil {

	static stamp(obj) {
		obj[ID_KEY] = obj[ID_KEY] || _stampId++;
		return obj[ID_KEY];
	}

};