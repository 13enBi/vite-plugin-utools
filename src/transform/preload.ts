import { transformAsync, PluginObj, types as t } from '@babel/core';
import { ensureHoisted, genStatements } from '../helper';

export const transformExportToAssign = (varName: string): PluginObj => {
	return {
		name: 'transform-export-to-assign',

		visitor: {
			Identifier(path) {
				if (path.isIdentifier({ name: 'exports' }) && !path.scope.parent) {
					path.node.name = varName;
				}
			},

			MemberExpression(path) {
				const { node, parent } = path;

				if (
					t.isIdentifier(node.object, { name: 'Object' }) &&
					t.isIdentifier(node.property, { name: 'defineProperty' }) &&
					t.isCallExpression(parent) &&
					t.isStringLiteral(parent.arguments[1], { value: '__esModule' })
				) {
					path.parentPath.remove();
				}
			},

			Program: {
				exit(path) {
					const nodes = genStatements(`${varName} = Object.create(null);`);

					ensureHoisted(nodes);

					path.unshiftContainer('body', nodes);
				},
			},
		},
	};
};

export const transformPreload = async (sourceCode: string, varName: string) => {
	const result = await transformAsync(sourceCode, {
		plugins: ['@babel/plugin-transform-modules-commonjs', transformExportToAssign(varName)],
	});

	return result?.code;
};

export default transformPreload;
