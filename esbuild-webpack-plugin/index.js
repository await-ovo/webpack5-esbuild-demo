"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const webpack_1 = __importStar(require("webpack"));
const webpack_sources_1 = require("webpack-sources");
const esbuild_1 = require("esbuild");
class ESBuildPlugin {
    constructor(options = {}) {
        this.options = options;
    }
    static async ensureService(enforce) {
        if (!ESBuildPlugin.service || enforce) {
            ESBuildPlugin.service = await esbuild_1.startService();
        }
    }
    async transformCode({ source, file, devtool, }) {
        let result;
        const transform = async () => await ESBuildPlugin.service.transform(source, {
            ...this.options,
            minify: true,
            sourcemap: !!devtool,
            sourcefile: file,
        });
        try {
            result = await transform();
        }
        catch (e) {
            // esbuild service might be destroyed when using parallel-webpack
            if ([
                'The service is no longer running',
                'The service was stopped'
            ].includes(e.message)) {
                await ESBuildPlugin.ensureService(true);
                result = await transform();
            }
            else {
                throw e;
            }
        }
        return result;
    }
    apply(compiler) {
        const { devtool } = compiler.options;
        const isWebpack5 = webpack_1.default.version.startsWith('5');
        const plugin = 'ESBuild Plugin';
        compiler.hooks.compilation.tap(plugin, (compilation) => {
            if (isWebpack5) {
                const { Compilation } = compiler.webpack;
                compilation.hooks.processAssets.tapPromise({
                    name: plugin,
                    stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE
                }, async (assets) => {
                    await this.updateAssets(compilation, Object.keys(assets), devtool);
                });
            }
            else {
                compilation.hooks.optimizeChunkAssets.tapPromise(plugin, async (chunks) => {
                    for (const chunk of chunks) {
                        await this.updateAssets(compilation, Array.from(chunk.files), devtool);
                    }
                });
            }
        });
        compiler.hooks.beforeRun.tapPromise(plugin, async () => {
            await ESBuildPlugin.ensureService();
        });
        compiler.hooks.done.tapPromise(plugin, async () => {
            if (ESBuildPlugin.service) {
                await ESBuildPlugin.service.stop();
            }
        });
    }
    async updateAssets(compilation, files, devtool) {
        const matchObject = webpack_1.ModuleFilenameHelpers.matchObject.bind(undefined, {});
        for (let file of files) {
            if (!matchObject(file)) {
                continue;
            }
            if (!/\.m?js(\?.*)?$/i.test(file)) {
                continue;
            }
            const assetSource = compilation.assets[file];
            const { source, map } = assetSource.sourceAndMap();
            const result = await this.transformCode({
                source: source.toString(),
                file,
                devtool,
            });
            // @ts-ignore
            compilation.updateAsset(file, () => {
                if (devtool) {
                    return new webpack_sources_1.SourceMapSource(result.code || '', file, result.map, source.toString(), map, true);
                }
                else {
                    return new webpack_sources_1.RawSource(result.code || '');
                }
            });
        }
    }
}
exports.default = ESBuildPlugin;
