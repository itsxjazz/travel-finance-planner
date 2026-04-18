const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.header('x-auth-token'); // O Angular deve enviar o token aqui
    if (!token) return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Adiciona os dados do usuário (id) na requisição
        next();
    } catch (ex) {
        res.status(400).json({ message: 'Token inválido.' });
    }
}; 