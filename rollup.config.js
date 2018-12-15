import json from 'rollup-plugin-json';
import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import { terser } from "rollup-plugin-terser";
import { name, version, author } from './package.json';

const banner =
	`/*!\n` +
	` * ${name} v${version}\n` +
	` * (c) 2018-${new Date().getFullYear()} ${author}\n` +
	` * Released under the Apache-2.0 License.\n` +
	` */`;

export default commandLineArgs => {
	const release = (commandLineArgs.environment === 'BUILD:production');

	let plugins = [
		json(),
		resolve(),
		babel(),
	];
	if (release) {
		plugins.push(terser());
	}

	return {
		input: 'src/main.js',
		output: {
			file: 'dist/flowmaker' + (release ? '.min.js' : '.js'),
			format: 'umd',
			name,
			banner,
		},
		plugins,
	};
}