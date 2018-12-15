import assert from 'assert';
import Layout from '../../src/util/Layout';

describe('Layout', function() {
	var l;

	before(function() {
		l = new Layout({
			id: '0-0',
			children: [
				{ id: '1-0' },
				{
					id: '1-1',
					children: [
						{ id: '2-0' },
						{ id: '2-1' },
						{ id: '2-2' },
						{ id: '2-3' },
					]
				},
			],
		});
	});

	describe('.do()', function() {
		it('should no error', function() {
			let positions = l.calc();
			console.log('positions=', positions)

			assert.equal(positions.length, 7);

			for (let i in positions) {
				let pos = positions[i];
				switch (pos.id) {
					case '0-0':
						assert.equal(pos.x, 1);
						assert.equal(pos.y, 0);
						break;
					case '1-0':
						assert.equal(pos.x, 0.5);
						assert.equal(pos.y, 1);
						break;
					case '1-1':
						assert.equal(pos.x, 1.5);
						assert.equal(pos.y, 1);
						break;
					case '2-0':
						assert.equal(pos.x, 0);
						assert.equal(pos.y, 2);
						break;
					case '2-1':
						assert.equal(pos.x, 1);
						assert.equal(pos.y, 2);
						break;
					case '2-2':
						assert.equal(pos.x, 2);
						assert.equal(pos.y, 2);
						break;
					case '2-3':
						assert.equal(pos.x, 3);
						assert.equal(pos.y, 2);
						break;
				}
			}
		});
	});

});