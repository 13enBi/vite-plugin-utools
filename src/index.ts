import { Plugin, build as viteBuild, ResolvedConfig } from 'vite';
import { resolve } from 'path';
import { createPreloadFilter, transformFilter } from './helper';
import { resolveOptions, Options } from './options';
import transformExternal from './transform/external';
import transformPreload from './transform/preload';
import buildUpx from './buildUpx';

export const viteUtoolsPlugin = (options: Options = {}): Plugin => {
	const {
		external: apiExternal,
		preload: { path: preloadPath, watch, name: preloadName },
		buildUpx: buildUpxOptions,
	} = resolveOptions(options);
	const preloadFilter = createPreloadFilter(preloadPath);

	let config: ResolvedConfig;

	return {
		name: 'vite:utools',

		config: (userConfig) => ({
			optimizeDeps: { exclude: [apiExternal] },
			build: {
				rollupOptions: {
					external: [apiExternal],
					input: {
						index: './index.html',
						preload: preloadPath,
					},
					output: {
						entryFileNames: ({ facadeModuleId: id }) =>
							preloadFilter(id) ? 'preload.js' : `${userConfig.build?.assetsDir || 'assets'}/[name].js`,
					},
				},
			},
		}),

		transform: (code, id) =>
			!transformFilter(id)
				? code
				: preloadFilter(id)
				? transformPreload(code, preloadName)
				: transformExternal(code, (sourcePath) =>
						sourcePath === apiExternal
							? 'window.utools'
							: preloadFilter(resolve(id, '../', sourcePath))
							? preloadName
							: void 0
				  ),

		handleHotUpdate: async ({ file }) => {
			if (watch && preloadFilter(file)) await viteBuild();
		},

		configResolved: (c) => {
			config = c;
		},

		closeBundle: async () => {
			if (buildUpxOptions) {
				await buildUpx(config.build.outDir, buildUpxOptions, config.logger);
			}
		},
	};
};

export default viteUtoolsPlugin;
