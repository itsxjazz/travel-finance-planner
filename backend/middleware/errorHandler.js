module.exports = (err, req, res, next) => {
    console.error('Global Error Handler:', err.message || err);

    // Se o erro vier com um status e formato específicos definidos pelos controllers
    if (err.statusCode) {
        return res.status(err.statusCode).json(err.payload || { message: err.message });
    }

    // Fallback global de segurança que já existia no server.js
    res.status(500).json({ error: "Serviço temporariamente instável", code: "API_TIMEOUT" });
};
