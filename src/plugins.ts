import { Plugin, build as viteBuild, ResolvedConfig } from 'vite';
import { resolve } from 'path';
import { NodeBuiltin, createPreloadFilter, isUndef, transformFilter } from './helper';
import { BUILD_UTOOLS_MODE } from './constant';
import { RequiredOptions } from './options';
import transformExternal from './transform/external';
import transformPreload from './transform/preload';
import buildUpx from './buildUpx';

export const preloadPlugin = (preloadOptions: RequiredOptions['preload']): Plugin => {
	if (!preloadOptions)
		return {
			name: 'vite:utools-preload',
		};

	const { path, watch, name } = preloadOptions;
	const filter = createPreloadFilter(path);

	let config: ResolvedConfig;

	return {
		name: 'vite:utools-preload',

		config: (userConfig) => ({
			base: isUndef(userConfig.base) || userConfig.base === '/' ? '' : userConfig.base,
			build:
				userConfig.mode !== BUILD_UTOOLS_MODE
					? void 0
					: {
							// TODO: use build lib options ?
							emptyOutDir: false,
							rollupOptions: {
								external: [...NodeBuiltin],
								plugins: [
									{
										name: 'preload',
										transform: (code, id) => (filter(id) ? transformPreload(code, name) : code),
									},
								],
								input: path,
								output: {
									entryFileNames: 'preload.js',
									format: 'iife',
									globals: (id: string) => `require('${id}')`,
								},
							},
					  },
		}),

		configResolved: (c) => {
			config = c;
		},

		transform: (code, id) =>
			!transformFilter(id)
				? code
				: transformExternal(code, (sourcePath) => (filter(resolve(id, '../', sourcePath)) ? name : void 0)),

		handleHotUpdate: async ({ file }) => {
			if (watch && filter(file)) await viteBuild();
		},

		closeBundle: async () => {
			if (config.mode !== BUILD_UTOOLS_MODE)
				await viteBuild({
					mode: BUILD_UTOOLS_MODE,
				});
		},
	};
};

export const apiExternalPlugin = (apiExternal: RequiredOptions['external']): Plugin => {
	return {
		name: 'vite:utools-api',

		config: () => ({
			optimizeDeps: { exclude: [apiExternal] },
			build: {
				rollupOptions: {
					external: [apiExternal],
				},
			},
		}),

		transform: (code, id) =>
			!transformFilter(id)
				? code
				: transformExternal(code, (sourcePath) => (sourcePath === apiExternal ? 'window.utools' : void 0)),
	};
};

export const buildUpxPlugin = (options: RequiredOptions): Plugin => {
	let config: ResolvedConfig;

	return {
		name: 'vite:utools-build-upx',

		configResolved: (c) => {
			config = c;
		},

		closeBundle: async () => {
			if (config.mode === BUILD_UTOOLS_MODE) await buildUpx(config.build.outDir, options, config.logger);
		},
	};
};
