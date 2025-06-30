import * as esbuild from 'esbuild';
import * as tsup from 'tsup';

const main = async () => {
	await tsup.build({
		entryPoints: ['./src/**/*.{ts,tsx,js,css}'],
		outDir: './dist',
		external: [
			'@sinclair/typebox',
			'@paralleldrive/cuid2',
			'd3'
		],
		watch: ['./src/**/*.{ts,tsx,js,css}'],
		splitting: false,
		dts: true,
		clean: true,
		format: ['cjs', 'esm'],
		outExtension: (ctx) => {
			if (ctx.format === 'cjs') {
				return {
					dts: '.d.ts',
					js: '.js',
				};
			}
			return {
				dts: '.d.mts',
				js: '.mjs',
			};
		},
	});
};

main().catch((e) => {
	console.error(e);
});