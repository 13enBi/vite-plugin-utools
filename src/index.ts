import { Plugin } from 'vite';
import { resolveOptions, Options } from './options';
import { apiExternalPlugin, buildUpxPlugin, preloadPlugin } from './plugins';

export const viteUtoolsPlugin = (options: Options = {}): Plugin[] => {
	const requiredOptions = resolveOptions(options);

	return [
		preloadPlugin(requiredOptions.preload),
		apiExternalPlugin(requiredOptions.external),
		buildUpxPlugin(requiredOptions),
	];
};

export default viteUtoolsPlugin;
