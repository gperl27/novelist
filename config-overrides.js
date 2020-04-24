const {override, addWebpackPlugin, fixBabelImports} = require('customize-cra');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = override(
    addWebpackPlugin(new MonacoWebpackPlugin()),
    fixBabelImports('import', {
        libraryName: 'antd',
        libraryDirectory: 'es',
        style: 'css',
    }),
);