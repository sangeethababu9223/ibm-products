/**
 * Copyright IBM Corp. 2024
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import { fileURLToPath } from 'url';
import { globby } from 'globby';
import { rollup } from 'rollup';
import alias from '@rollup/plugin-alias';
import autoprefixer from 'autoprefixer';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import cssnano from 'cssnano';
import litSCSS from '../tools/rollup-plugin-lit-scss.js';
import nodeResolve from '@rollup/plugin-node-resolve';
import path from 'path';
import postcss from 'postcss';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import fs from 'fs-extra';

import * as packageJson from '../package.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function build() {
  const esInputs = await globby([
    'src/**/*.ts',
    '!src/**/*.stories.ts',
    '!src/**/*.d.ts',
    '!src/polyfills',
  ]);

  const libInputs = await globby([
    'src/components/**/defs.ts',
    'src/globals/**/*.ts',
    '!src/globals/decorators/**/*.ts',
    '!src/globals/directives/**/*.ts',
    '!src/globals/internal/**/*.ts',
    '!src/globals/mixins/**/*.ts',
  ]);

  const iconInput = await globby([
    '../node_modules/@carbon/icons/lib/**/*.js',
    '../../node_modules/@carbon/icons/lib/**/*.js',
    '!**/index.js',
  ]);

  const entryPoint = {
    rootDir: 'src',
    outputDirectory: path.resolve(__dirname, '..'),
  };

  const formats = [
    {
      type: 'esm',
      directory: 'es',
    },
    {
      type: 'commonjs',
      directory: 'lib',
    },
  ];

  for (const format of formats) {
    const outputDirectory = path.join(
      entryPoint.outputDirectory,
      format.directory
    );

    const cwcInputConfig = getRollupConfig(
      format.type === 'esm' ? esInputs : libInputs,
      entryPoint.rootDir,
      outputDirectory,
      format.type === 'esm' ? iconInput : []
    );

    const cwcBundle = await rollup(cwcInputConfig);

    await cwcBundle.write({
      dir: outputDirectory,
      format: format.type,
      preserveModules: true,
      preserveModulesRoot: 'src',
      banner,
      exports: 'named',
      sourcemap: true,
    });
  }

  await postBuild();
}

const banner = `/**
 * Copyright IBM Corp. 2024
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
`;

function getRollupConfig(input, rootDir, outDir, iconInput) {
  return {
    input,
    // Mark dependencies listed in `package.json` as external so that they are
    // not included in the output bundle.
    external: [
      ...Object.keys(packageJson.default.dependencies),
      ...Object.keys(packageJson.default.devDependencies),
    ].map((name) => {
      // Transform the name of each dependency into a regex so that imports from
      // nested paths are correctly marked as external.
      //
      // Example:
      // import 'module-name';
      // import 'module-name/path/to/nested/module';
      return new RegExp(`^${name}(/.*)?`);
    }),
    plugins: [
      alias({
        entries: [{ find: /^(.*)\.scss\?lit$/, replacement: '$1.scss' }],
      }),
      copy({
        targets: [{ src: 'src/components/**/*.scss', dest: 'scss' }],
        flatten: false,
      }),
      [json()],
      nodeResolve({
        browser: true,
        mainFields: ['jsnext', 'module', 'main'],
        extensions: ['.js', '.ts'],
      }),
      commonjs({
        include: [/node_modules/],
      }),
      litSCSS({
        includePaths: [
          path.resolve(__dirname, '../node_modules'),
          path.resolve(__dirname, '../../../node_modules'),
        ],
        async preprocessor(contents, id) {
          return (
            await postcss([autoprefixer(), cssnano()]).process(contents, {
              from: id,
            })
          ).css;
        },
      }),
      typescript({
        noEmitOnError: true,
        compilerOptions: {
          rootDir,
          outDir,
        },
      }),
    ],
  };
}

build().catch((error) => {
  console.log(error);
  process.exit(1);
});

async function postBuild() {
  const sourceDir = path.resolve(__dirname, '../es');

  if (sourceDir) {
    const targetDir = path.resolve(__dirname, '../es-custom');

    // Copy `es` directory to `es-custom`
    await fs.copy(sourceDir, targetDir);

    // Find all files in the `es-custom` directory
    const files = await globby([`${targetDir}/**/*`], { onlyFiles: true });

    // Replace "cds" with "cds-custom" in all files
    await Promise.all(
      files.map(async (file) => {
        let content = await fs.promises.readFile(file, 'utf8');
        content = content.replace(/cds/g, 'cds-custom');
        content = content.replace(
          /import\s+['"]@carbon\/web-components\/es\/components\/(.*?)['"]/g,
          "import '@carbon/web-components/es-custom/components/$1'"
        );
        await fs.promises.writeFile(file, content);
      })
    );
  }
}
