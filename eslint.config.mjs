import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          // Sens unique : models ← utils ← configs ← state ← ui (components, pipes) ← app.
          depConstraints: [
            { sourceTag: 'type:models', onlyDependOnLibsWithTags: [] },
            { sourceTag: 'type:util', onlyDependOnLibsWithTags: ['type:models'] },
            { sourceTag: 'type:config', onlyDependOnLibsWithTags: ['type:models', 'type:util'] },
            { sourceTag: 'type:state', onlyDependOnLibsWithTags: ['type:models', 'type:util', 'type:config'] },
            { sourceTag: 'type:ui', onlyDependOnLibsWithTags: ['type:models', 'type:util', 'type:config', 'type:state', 'type:ui'] },
            { sourceTag: 'type:app', onlyDependOnLibsWithTags: ['type:models', 'type:util', 'type:config', 'type:state', 'type:ui'] },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
