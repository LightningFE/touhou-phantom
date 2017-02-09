
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
            {
                test: /\.(jpg|png|svg)$/,
                loader: 'url',
                query: {
                    limit: 16384,
                    name: './files/[hash].[ext]',
                },
            },
        ],
    },
    externals: Object.keys(dependencies || {}),
};
