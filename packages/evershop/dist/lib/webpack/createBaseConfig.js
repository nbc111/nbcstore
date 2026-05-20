import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import webpack from 'webpack';
import { SwcMinifyWebpackPlugin } from 'swc-minify-webpack-plugin';
import { getConfig } from '../util/getConfig.js';
import { getEnabledExtensions } from '../../bin/extension/index.js';
import { getCoreModules } from '../../bin/lib/loadModules.js';
import { CONSTANTS } from '../helpers.js';
import { getEnabledTheme } from '../util/getEnabledTheme.js';
import isProductionMode from '../util/isProductionMode.js';
import { loadCsvTranslationFiles } from './loaders/loadTranslationFromCsv.js';
// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
function isRealDirectorySync(path) {
    try {
        const stats = fs.lstatSync(path);
        if (stats.isSymbolicLink()) {
            return false;
        }
        return stats.isDirectory();
    } catch (err) {
        if (err.code === 'ENOENT') {
            return false;
        }
        throw err;
    }
}
function parseCsvField(content, startIndex) {
    let i = startIndex;
    let field = '';
    if (content[i] === '"') {
        i += 1;
        while(i < content.length){
            if (content[i] === '"') {
                if (content[i + 1] === '"') {
                    field += '"';
                    i += 2;
                } else {
                    i += 1;
                    break;
                }
            } else {
                field += content[i++];
            }
        }
        return {
            field,
            index: i
        };
    }
    while(i < content.length && content[i] !== ',' && content[i] !== '\n' && content[i] !== '\r'){
        field += content[i++];
    }
    return {
        field,
        index: i
    };
}
function loadTranslationsSync() {
    const language = getConfig('shop.language', 'en');
    if (language === 'en') {
        return {};
    }
    const folderPath = path.resolve(CONSTANTS.ROOTPATH, 'translations', language);
    if (!fs.existsSync(folderPath)) {
        return {};
    }
    const results = {};
    for (const file of fs.readdirSync(folderPath)){
        if (!file.endsWith('.csv')) {
            continue;
        }
        const content = fs.readFileSync(path.join(folderPath, file), 'utf8');
        let i = 0;
        while(i < content.length){
            while(i < content.length && (content[i] === '\n' || content[i] === '\r')){
                i += 1;
            }
            if (i >= content.length) {
                break;
            }
            const keyParsed = parseCsvField(content, i);
            i = keyParsed.index;
            if (i < content.length && content[i] === ',') {
                i += 1;
            }
            const valueParsed = parseCsvField(content, i);
            i = valueParsed.index;
            const key = keyParsed.field;
            if (key && !key.startsWith('#')) {
                results[key] = valueParsed.field;
            }
            while(i < content.length && content[i] !== '\n' && content[i] !== '\r'){
                i += 1;
            }
        }
    }
    return results;
}
export function createBaseConfig(isServer) {
    const extenions = getEnabledExtensions();
    const coreModules = getCoreModules();
    const theme = getEnabledTheme();
    const translations = loadTranslationsSync();
    const loaders = [
        {
            test: /\.m?js$/,
            resolve: {
                fullySpecified: false
            }
        },
        {
            test: /\.js$/,
            exclude: {
                and: [
                    /node_modules/
                ],
                not: [
                    /@evershop[\\/]evershop/,
                    ...extenions.map((ext)=>{
                        const regex = new RegExp(ext.resolve.replace(/\\/g, '[\\\\\\]').replace(/\//g, '[\\\\/]'));
                        return regex;
                    })
                ]
            },
            use: [
                {
                    loader: path.resolve(CONSTANTS.LIBPATH, 'webpack/loaders/LayoutLoader.js')
                },
                {
                    loader: path.resolve(CONSTANTS.LIBPATH, 'webpack/loaders/GraphqlLoader.js')
                },
                {
                    loader: path.resolve(CONSTANTS.LIBPATH, 'webpack/loaders/TranslationLoader.js'),
                    options: {
                        getTranslateData: async ()=>{
                            const result = await loadCsvTranslationFiles();
                            return result;
                        }
                    }
                }
            ]
        }
    ];
    const output = isServer ? {
        path: CONSTANTS.BUILDPATH,
        publicPath: CONSTANTS.BUILDPATH,
        filename: isServer === true ? '[name]/server/index.js' : '[name]/client/index.js',
        pathinfo: false
    } : {
        path: CONSTANTS.BUILDPATH,
        publicPath: isProductionMode() ? '/assets/' : '/',
        pathinfo: false
    };
    if (!isProductionMode()) {
        Object.assign(output, {
            chunkFilename: (pathData)=>`${pathData.chunk.renderedHash}/client/${pathData.chunk.runtime}.js`
        });
    } else {
        Object.assign(output, {
            chunkFilename: (pathData)=>`chunks/${pathData.chunk.renderedHash}.js`
        });
    }
    if (isServer) {
        output.library = {
            type: 'module'
        };
        output.module = true;
        output.chunkFormat = 'module';
        output.environment = {
            module: true
        };
        output.iife = false;
        output.scriptType = 'module';
    }
    const config = {
        mode: isProductionMode() ? 'production' : 'development',
        module: {
            rules: loaders
        },
        target: isServer === true ? 'node' : 'web',
        output,
        plugins: [
            new webpack.DefinePlugin({
                __EVERSHOP_TRANSLATIONS__: JSON.stringify(translations)
            })
        ],
        cache: {
            type: 'memory'
        }
    };
    if (isServer) {
        config.experiments = {
            outputModule: true
        };
    }
    // Resolve aliases
    const alias = {
        '@evershop/evershop/components': path.resolve(__dirname, '../../components')
    };
    if (theme) {
        alias['@components'] = [
            path.resolve(theme.path, 'dist/components')
        ];
    } else {
        alias['@components'] = [];
    }
    if (!isRealDirectorySync(path.resolve(CONSTANTS.ROOTPATH, 'node_modules', '@evershop', 'evershop'))) {
        alias['@evershop/evershop'] = path.resolve(CONSTANTS.ROOTPATH, 'packages', 'evershop', 'dist');
    }
    // Resolve alias for extensions
    extenions.forEach((ext)=>{
        alias['@components'].push(path.resolve(ext.resolve, 'dist/components'));
    });
    alias['@components'].push(path.resolve(__dirname, '../../components'));
    // Avoid multiple react instances
    alias['react'] = path.resolve(CONSTANTS.ROOTPATH, 'node_modules/react');
    alias['react-dom'] = path.resolve(CONSTANTS.ROOTPATH, 'node_modules/react-dom');
    alias['webpack-hot-middleware'] = path.resolve(CONSTANTS.ROOTPATH, 'node_modules/webpack-hot-middleware');
    config.resolve = {
        alias,
        extensions: [
            '.js',
            '.json',
            '.wasm'
        ],
        extensionAlias: {
            '.jsx': [
                '.js'
            ]
        },
        fullySpecified: true
    };
    config.optimization = {};
    // Check if the flag --skip-minify is set
    const skipMinify = process.argv.includes('--skip-minify');
    if (isProductionMode()) {
        config.optimization = Object.assign(config.optimization, {
            minimize: !skipMinify,
            minimizer: [
                new SwcMinifyWebpackPlugin({
                    compress: true,
                    mangle: true,
                    module: true,
                    sourceMap: true,
                    keep_classnames: false,
                    keep_fnames: false,
                    safari10: true,
                    sourceMap: true
                })
            ]
        });
    }
    return config;
}
