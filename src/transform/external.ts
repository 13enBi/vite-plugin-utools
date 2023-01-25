import { PluginObj, transformAsync, types as t } from '@babel/core';

import { joinVarName, replaceByTemplate } from '../helper';

type SourceExternal = (source: string) => string | void | undefined | null;

const getImportNames = (specific: t.ImportSpecifier | t.ImportDefaultSpecifier | t.ImportNamespaceSpecifier) => {
	switch (specific.type) {
		case 'ImportSpecifier':
			return {
				local: specific.local.name,
				imported: (specific.imported as t.Identifier).name,
			};

		case 'ImportDefaultSpecifier':
			return {
				local: specific.local.name,
				imported: 'default',
			};

		case 'ImportNamespaceSpecifier':
			return {
				local: specific.local.name,
			};
	}
};

export const transformImportToExternal = (sourceExternal: SourceExternal): PluginObj => {
	return {
		name: 'transform-import-to-external',

		visitor: {
			ImportDeclaration: (path) => {
				const sourcePath = path.node.source.value;
				const external = sourceExternal(sourcePath);
				if (!external) return;

				const importNames = path.node.specifiers.map(getImportNames);
				const code = importNames
					.map(
						({ local, imported }) =>
							`const ${local} = ${imported ? joinVarName(external, imported) : external}`
					)
					.join(';');

				replaceByTemplate(path, code);
			},

			Import: (path) => {
				if (!t.isCallExpression(path.parent)) return;

				const [source] = path.parent.arguments;
				if (!t.isStringLiteral(source)) return;

				const sourcePath = source.value;
				const external = sourceExternal(sourcePath);
				if (!external) return;

				replaceByTemplate(path.parentPath, `Promise.resolve(${external})`);
			},
		},
	};
};

export const transformExternal = async (sourceCode: string, sourceExternal: SourceExternal) => {
	const result = await transformAsync(sourceCode, {
		plugins: [transformImportToExternal(sourceExternal)],
	});

	return result?.code;
};

export default transformExternal;
