//@ts-check

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { composePlugins, withNx } = require('@nx/next');
// libs/sim and libs/types use moduleResolution:nodenext (.js extensions in source).
// Turbopack (enabled by withNx) can't resolve .js → .ts for source files.
// Use relative paths to the compiled dist — Turbopack resolves relative to the Next.js project root (apps/web/).
const nextConfig = {
  nx: {},
  turbopack: {
    resolveAlias: {
      '@conways-game-of-life/sim': '../../libs/sim/dist/index.js',
      '@conways-game-of-life/types': '../../libs/types/dist/index.js',
    },
  },
  webpack: (/** @type {any} */ config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    };
    return config;
  },
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
