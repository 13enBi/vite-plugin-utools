import { Plugin, build as viteBuild, ResolvedConfig } from 'vite';
import { resolve } from 'path';
import { createPreloadFilter, isUndef, transformFilter } from './helper';
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

	return {
		name: 'vite:utools-preload',

		config: (userConfig) => ({
			base: isUndef(userConfig.base) || userConfig.base === '/' ? '' : userConfig.base,
			build: {
				rollupOptions: {
					input: {
						index: './index.html',
						preload: path,
					},
					output: {
						entryFileNames: ({ facadeModuleId: id }) =>
							filter(id) ? 'preload.js' : `${userConfig.build?.assetsDir || 'assets'}/[name].js`,
					},
				},
			},
		}),

		transform: (code, id) =>
			!transformFilter(id)
				? code
				: filter(id)
				? transformPreload(code, name)
				: transformExternal(code, (sourcePath) => (filter(resolve(id, '../', sourcePath)) ? name : void 0)),

		handleHotUpdate: async ({ file }) => {
			if (watch && filter(file)) await viteBuild();
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

		closeBundle: () => buildUpx(config.build.outDir, options, config.logger),
	};
};
