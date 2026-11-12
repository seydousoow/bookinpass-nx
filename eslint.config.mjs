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
            { sourceTag: 'layer:models', onlyDependOnLibsWithTags: [] },
            { sourceTag: 'layer:util', onlyDependOnLibsWithTags: ['layer:models'] },
            { sourceTag: 'layer:config', onlyDependOnLibsWithTags: ['layer:models', 'layer:util'] },
            { sourceTag: 'layer:state', onlyDependOnLibsWithTags: ['layer:models', 'layer:util', 'layer:config'] },
            { sourceTag: 'layer:ui', onlyDependOnLibsWithTags: ['layer:models', 'layer:util', 'layer:config', 'layer:state', 'layer:ui'] },
            { sourceTag: 'layer:app', onlyDependOnLibsWithTags: ['layer:models', 'layer:util', 'layer:config', 'layer:state', 'layer:ui'] },
            // Périmètre : le partagé ne dépend que du partagé ; chaque application, du partagé et de ce qui lui est propre.
            { sourceTag: 'scope:shared', onlyDependOnLibsWithTags: ['scope:shared'] },
            { sourceTag: 'scope:front', onlyDependOnLibsWithTags: ['scope:shared', 'scope:front'] },
            { sourceTag: 'scope:backoffice', onlyDependOnLibsWithTags: ['scope:shared', 'scope:backoffice'] },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts', '**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs'],
    // Override or add rules here
    rules: {},
  },
];
