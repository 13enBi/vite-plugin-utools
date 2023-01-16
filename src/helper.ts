import { types, NodePath } from '@babel/core';
import { parse } from '@babel/parser';
import { createFilter } from '@rollup/pluginutils';
import { builtinModules } from 'node:module';
import { resolve } from 'path';
import { AliasOptions, Alias } from 'vite';

const Modules = [
	...builtinModules,
	'assert/strict',
	'diagnostics_channel',
	'dns/promises',
	'fs/promises',
	'path/posix',
	'path/win32',
	'readline/promises',
	'stream/consumers',
	'stream/promises',
	'stream/web',
	'timers/promises',
	'util/types',
	'wasi',
];
export const NodeBuiltin = [...new Set([...Modules, ...Modules.map((id) => `node:${id}`)])];

export const cwd = process.cwd();

export type Data = Record<any, any>;

export const genStatements = (source: string) => parse(source).program.body;

export const ensureHoisted = (statements: types.Statement[]) =>
	statements.forEach((node) => {
		//@ts-ignore
		node._blockHoist = 3;
	});

const includeRE = /\.([jt]sx?|vue)$/i;
export const transformFilter = createFilter(includeRE, 'node_modules');

export const createPreloadFilter = (preloadPath: string) =>
	createFilter([preloadPath, preloadPath.replace(includeRE, '')]);

export const isObject = (val: unknown): val is Data => !!val && typeof val === 'object';

export const isUndef = (val: unknown): val is undefined | null => val == void 0;

export const isString = (val: unknown): val is string => typeof val === 'string';

export const joinVarName = (varName: string, prop: string) => `${varName}['${prop}']`;

export const replaceByTemplate = <T>(path: NodePath<T>, template: string) =>
	path.replaceWithMultiple(genStatements(template));

const isMatch = (source: string, find: string | RegExp) =>
	isString(find) ? find === source || source.startsWith(`${find}/`) : source.match(find);

export type ReplaceAlias = (path: string) => string;
export const createReplaceAlias = (aliasOpts: AliasOptions): ReplaceAlias => {
	const aliasEntires: Alias[] = Array.isArray(aliasOpts)
		? aliasOpts
		: Object.entries(aliasOpts).map(([find, replacement]) => ({ find, replacement }));

	return (path) => {
		const entry = aliasEntires.find(({ find }) => isMatch(path, find));
		return entry ? resolve(cwd, path.replace(entry.find, entry.replacement)) : path;
	};
};
