import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, isAbsolute, resolve as pathResolve } from 'node:path';
import { createGzip } from 'node:zlib';

import { createPackage } from 'asar';
import colors from 'picocolors';
import { ResolvedConfig } from 'vite';

import { cwd, Data, isString } from './helper';
import { BuildUpxOptions, NestedRequired, PluginOptions, RequiredOptions } from './options';

const requiredKeys = [
	'name',
	'pluginName',
	'description',
	'author',
	'homepage',
	'version',
	'logo',
	'features',
] as const;
const DOC_URL = 'https://www.u.tools/docs/developer/config.html#基本配置';
const validatePluginOptions = (options: PluginOptions) => {
	requiredKeys.forEach((key) => {
		if (!options[key]) throw new Error(colors.red(`plugin ${key} is required,see: ${colors.bold(DOC_URL)}`));
	});
};

const formatPluginOptions = (pluginOptions: Data, needPreload: boolean) => {
	pluginOptions.main = 'index.html';
	pluginOptions.logo = basename(pluginOptions.logo);
	pluginOptions.preload = needPreload ? 'preload.js' : void 0;

	return pluginOptions as PluginOptions;
};

const getPluginOptions = (path: string) => {
	const requirePath = isAbsolute(path) ? path : pathResolve(cwd, path);
	const pluginOptions = require(requirePath);
	validatePluginOptions(pluginOptions);

	return pluginOptions;
};

const writePluginJson = (pluginOptions: PluginOptions, to: string) =>
	writeFile(`${to}/plugin.json`, JSON.stringify(pluginOptions), 'utf8');

const tempRE = /\[(\w+)\]/g;
const generateOutName = (temp: string, pluginOptions: PluginOptions) =>
	temp.replace(tempRE, (str, key: keyof PluginOptions) => {
		const value = pluginOptions[key];

		return isString(value) ? value : str;
	});

const prepareOutDir = async (buildOptions: NestedRequired<BuildUpxOptions>, pluginOptions: PluginOptions) => {
	await mkdir(buildOptions.outDir, { recursive: true });

	return pathResolve(buildOptions.outDir, generateOutName(buildOptions.outName, pluginOptions));
};

const TEMPORARY_DEST = pathResolve(cwd, `./.utools_${Math.random()}`);

const doBuild = async (input: string, out: string) => {
	await createPackage(input, TEMPORARY_DEST);

	await new Promise((resolve, reject) =>
		createReadStream(TEMPORARY_DEST)
			.pipe(createGzip())
			.pipe(createWriteStream(out))
			.on('error', reject)
			.on('finish', resolve)
	).finally(() => unlink(TEMPORARY_DEST));
};

export const buildUpx = async (input: string, options: RequiredOptions, logger: ResolvedConfig['logger']) => {
	const { buildUpx: buildOptions, preload } = options;
	if (!buildOptions) return;

	logger.info(colors.green('\nbuilding for upx....'));

	try {
		const pluginOptions = formatPluginOptions(getPluginOptions(buildOptions.pluginPath), !!preload);
		logger.info(`${colors.green('plugin.json for building upx:')}\n${JSON.stringify(pluginOptions, null, 2)}`);

		await writePluginJson(pluginOptions, input);

		const out = await prepareOutDir(buildOptions, pluginOptions);
		await doBuild(input, out);

		logger.info(`${colors.green('✓')} build upx success`);
		logger.info(colors.magenta(out));
	} catch (error: any) {
		logger.error(`${colors.red('build upx failed:')}\n${error.stack || error.message}`);
	}
};

export default buildUpx;
