import { createPackage } from 'asar';
import { resolve as pathResolve, basename, isAbsolute } from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { unlink, mkdir, writeFile } from 'fs/promises';
import { createGzip } from 'zlib';
import { BuildUpxOptions, PluginOptions } from './options';
import { ResolvedConfig } from 'vite';
import { Data, isString } from './helper';
import colors from 'picocolors';

const cwd = process.cwd();

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

const formatPluginOptions = (pluginOptions: Data) => {
	pluginOptions.main = 'index.html';
	pluginOptions.logo = basename(pluginOptions.logo);
	pluginOptions.preload = 'preload.js';

	return pluginOptions;
};

const getPluginOptions = (path: string) => {
	const requirePath = isAbsolute(path) ? path : pathResolve(cwd, path);
	const pluginOptions = require(requirePath);
	validatePluginOptions(pluginOptions);

	return formatPluginOptions(pluginOptions) as PluginOptions;
};

const writePluginJson = (pluginOptions: PluginOptions, to: string) =>
	writeFile(`${to}/plugin.json`, JSON.stringify(pluginOptions), 'utf8');

const tempRE = /\[(\w+)\]/g;
const generateOutName = (temp: string, pluginOptions: PluginOptions) =>
	temp.replace(tempRE, (str, key: keyof PluginOptions) => {
		const value = pluginOptions[key];

		return isString(value) ? value : str;
	});

const prepareOutDir = async (buildOptions: BuildUpxOptions, pluginOptions: PluginOptions) => {
	await mkdir(buildOptions.outDir!, { recursive: true });

	return pathResolve(buildOptions.outDir!, generateOutName(buildOptions.outName!, pluginOptions));
};

const TEMPORARY_DEST = pathResolve(cwd, `./.utools_${Math.random()}`);

const doBuild = async (input: string, out: string) => {
	await createPackage(input, TEMPORARY_DEST);

	await new Promise((resolve, reject) => {
		createReadStream(TEMPORARY_DEST)
			.pipe(createGzip())
			.pipe(createWriteStream(out))
			.on('error', reject)
			.on('finish', resolve);
	}).finally(() => unlink(TEMPORARY_DEST));
};

export const buildUpx = async (input: string, buildOptions: BuildUpxOptions, logger: ResolvedConfig['logger']) => {
	logger.info(colors.green('\nbuilding for upx....'));

	try {
		const pluginOptions = getPluginOptions(buildOptions.pluginPath!);
		logger.info(`${colors.green('plugin.json for building upx:')}\n${JSON.stringify(pluginOptions, null, 2)}`);

		await writePluginJson(pluginOptions, input);

		const out = await prepareOutDir(buildOptions, pluginOptions);
		await doBuild(input, out);

		logger.info(`${colors.green('✓')} build upx success`);
		logger.info(colors.magenta(out));

		return out;
	} catch (error: any) {
		logger.error(`${colors.red('build upx failed:')}\n${error.stack || error.message}`);
	}
};

export default buildUpx;
