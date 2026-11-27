module.exports = {
    '/api/**': {
        target: 'http://nota-agil-back:8080',
        pathRewrite: { '^/api': '' },
        changeOrigin: true
    }
};
