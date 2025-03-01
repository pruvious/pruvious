import generate from '@babel/generator'
import { parse } from '@babel/parser'
import _traverse, { Binding, NodePath } from '@babel/traverse'
import { isObject, uniqueArray } from '@pruvious/utils'

interface Context {
  /**
   * The source code string.
   * Can be either TypeScript or JavaScript.
   */
  code: string

  /**
   * Indicates the programming language of the source code.
   * Use `ts` for TypeScript or `js` for JavaScript.
   */
  mode: 'js' | 'ts'

  /**
   * Array of function names that should be targeted in the operation.
   */
  targetFunctionNames: string[]
}

const traverse = isObject(_traverse) ? ((_traverse as any).default as typeof _traverse) : _traverse

/**
 * Extracts string literals that are passed as arguments to specific function calls within the source code.
 */
export function extractStringLiteralArguments({
  code,
  mode,
  targetFunctionNames,
}: Context): { functionName: string; args: (string | undefined)[] }[] {
  const ast = parse(code, { sourceType: 'module', plugins: mode === 'ts' ? ['typescript'] : [] })
  const matches: { functionName: string; args: (string | undefined)[] }[] = []

  traverse(ast, {
    CallExpression({ node }) {
      if (node.callee.type === 'Identifier' && targetFunctionNames.includes(node.callee.name)) {
        matches.push({
          functionName: node.callee.name,
          args: node.arguments.map((arg) => (arg.type === 'StringLiteral' ? arg.value : undefined)),
        })
      }
    },
  })

  return matches
}

/**
 * Removes unused code from the source while preserving specified functions and their required dependencies.
 */
export function cleanupUnusedCode({ code, mode, targetFunctionNames }: Context): string {
  const ast = parse(code, { sourceType: 'module', plugins: mode === 'ts' ? ['typescript'] : [] })
  const ancestors = new Set<NodePath>()

  traverse(ast, {
    CallExpression(path) {
      if (path.node.callee.type === 'Identifier' && targetFunctionNames.includes(path.node.callee.name)) {
        const _ancestors = path.getAncestry()
        const _index = _ancestors.length - 2

        if (_ancestors[_index]) {
          ancestors.add(_ancestors[_index])
        }
      }
    },
  })

  const outerBindings = getOuterBindings([...ancestors])
  const keep = uniqueArray([...outerBindings.map(({ path }) => path), ...ancestors])

  traverse(ast, {
    ImportSpecifier(path) {
      if (!keep.some((keepPath) => keepPath === path)) {
        path.remove()
        if (path.parentPath.node.type === 'ImportDeclaration' && path.parentPath.node.specifiers.length === 0) {
          path.parentPath.remove()
        }
      }
    },
    ImportDefaultSpecifier(path) {
      if (!keep.some((keepPath) => keepPath === path)) {
        path.remove()
        if (path.parentPath.node.type === 'ImportDeclaration' && path.parentPath.node.specifiers.length === 0) {
          path.parentPath.remove()
        }
      }
    },
    Declaration(path) {
      if (
        !keep.some((keepPath) => path === keepPath) &&
        !keep.some((keepPath) => path.isAncestor(keepPath)) &&
        !keep.some((keepPath) => path.isDescendant(keepPath))
      ) {
        path.remove()
      }
    },
  })

  return generate(ast, { compact: false }).code
}

/**
 * Resolves all outer bindings of the specified parent paths.
 */
export function getOuterBindings(parentPaths: NodePath[]): Binding[] {
  const bindings = new Set<Binding>()

  parentPaths.forEach((parentPath) => {
    console.log('parentPath', parentPath.node.loc?.start)
    traverse(
      parentPath.node,
      {
        Identifier(path) {
          if (path.isReferenced()) {
            const binding = path.scope.getBinding(path.node.name)

            if (binding && binding?.scope.uid <= parentPath.scope.uid) {
              bindings.add(binding)
            }
          }
        },
      },
      parentPath.scope,
    )
  })

  if (parentPaths.length !== bindings.size) {
    const diff = [...bindings].filter((binding) => parentPaths.every((parentPath) => parentPath !== binding.path))
    getOuterBindings(diff.map(({ path }) => path)).forEach((path) => bindings.add(path))
  }

  return [...bindings]
}
