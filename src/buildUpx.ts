import { createPackage } from 'asar';
import { resolve as pathResolve, basename } from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { unlink, mkdir, writeFile } from 'fs/promises';
import { createGzip } from 'zlib';
import { BuildUpxOptions, PluginOptions } from './options';
import { ResolvedConfig } from 'vite';
import chalk from 'chalk';
import { Data } from './helper';

const requiredKeys = ['name', 'pluginName', 'description', 'author', 'homepage', 'version'] as const;
const vaildPluginOptions = (options: PluginOptions) => {
	requiredKeys.forEach((key) => {
		if (!options[key]) throw new Error(`plugin ${key} is required`);
	});
};

const formatPluginOptions = (pluginOptions: Data) => {
	pluginOptions.main = 'index.html';
	pluginOptions.logo = basename(pluginOptions.logo);
	pluginOptions.preload && (pluginOptions.preload = 'preload.js');

	return pluginOptions;
};

const getPluginOptons = (path: string) => {
	const pluginOptions = require(path);
	vaildPluginOptions(pluginOptions);

	return formatPluginOptions(pluginOptions) as PluginOptions;
};

const writePluginJson = (pluginOptions: PluginOptions, to: string) =>
	writeFile(`${to}/plugin.json`, JSON.stringify(pluginOptions), 'utf8');

const tempRE = /\[(\w+)\]/g;
const generateOutName = (temp: string, pluginOptions: PluginOptions) =>
	temp.replace(tempRE, (str, key: keyof PluginOptions) => pluginOptions[key] || str);

const prepareOutDir = async (buildOptions: BuildUpxOptions, pluginOptions: PluginOptions) => {
	await mkdir(buildOptions.outDir!, { recursive: true });

	return pathResolve(buildOptions.outDir!, generateOutName(buildOptions.outName!, pluginOptions));
};

const TEMPORARY_DEST = pathResolve(process.cwd(), `./.utools_${Math.random()}`);

const doBuild = (input: string, out: string) =>
	new Promise(async (resolve, reject) => {
		await createPackage(input, TEMPORARY_DEST);

		createReadStream(TEMPORARY_DEST)
			.pipe(createGzip())
			.on('error', reject)
			.pipe(createWriteStream(out))
			.on('error', reject)
			.on('finish', () => resolve(out));
	});

export const buildUpx = async (input: string, buildOptions: BuildUpxOptions, logger: ResolvedConfig['logger']) => {
	logger.info(chalk.green('\nbuilding for upx...'));

	try {
		const pluginOptions = getPluginOptons(buildOptions.pluginPath!);
		await writePluginJson(pluginOptions, input);

		const out = await prepareOutDir(buildOptions, pluginOptions);
		await doBuild(input, out);

		logger.info(chalk.green('✓ ') + chalk.cyan(out));

		return out;
	} catch (error: any) {
		logger.error(error);
	} finally {
		await unlink(TEMPORARY_DEST);
	}
};

export default buildUpx;
