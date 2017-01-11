
const { dependencies } = require('./package.json');

module.exports = {
    entry: [ './src/app.jsx' ],
    devtool: 'inline-source-map',
    target: 'electron-renderer',
    output: {
        libraryTarget: 'commonjs2',
        path: './app/',
        filename: 'bundle.js',
    },
    resolve: {
        extensions: [ '', '.js', '.jsx' ],
    },
    module: {
        loaders: [
            {
                test: /\.(js|jsx)$/,
                exclude: /(node_modules)/,
                loader: 'babel',
            },
        ],
    },
    externals: Object.keys(dependencies || {}),
};
