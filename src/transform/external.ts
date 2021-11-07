import { NodePath, PluginObj, transformAsync, types as t } from '@babel/core';

import { genStatements } from '../helper';

type SourceExternal = (source: string) => string | void | undefined | null;
type Specifier = t.ImportDefaultSpecifier | t.ImportSpecifier | t.ImportNamespaceSpecifier | t.ExportSpecifier;

const genExternalTemp = (external: string, specifiers: Specifier[]) =>
	specifiers.reduce((temp, specifier) => {
		const localName = specifier.local.name;
		let varName = localName,
			externalName = external;

		if (t.isExportSpecifier(specifier)) {
			temp += 'export ';
			//@ts-ignore
			varName = specifier.exported.name;

			if (localName === 'default') {
				externalName += `["${localName}"]`;
			}
		} else if (t.isImportSpecifier(specifier)) {
			//@ts-ignore
			externalName += `["${specifier.imported.name}"]`;
		}

		temp += `const ${varName} = ${externalName};`;

		return temp;
	}, '');

export const transformImportToExternal = (sourceExternal: SourceExternal): PluginObj => {
	const replaceDecl = (path: NodePath<t.ImportDeclaration | t.ExportNamedDeclaration>) => {
		const { node } = path;
		const external = node.source && sourceExternal(node.source.value);

		if (!external) return;

		const { specifiers } = node;

		const temp = genExternalTemp(external, specifiers as any);

		temp && path.replaceWithMultiple(genStatements(temp));
	};

	return {
		name: 'transform-import-to-external',

		visitor: {
			ImportDeclaration: replaceDecl,

			ExportNamedDeclaration: replaceDecl,
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
