// routes/currencyRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

// Rota para cotação atual (last)
router.get('/last/:pair', async (req, res) => {
    try {
        const { pair } = req.params;
        const token = process.env.AWESOME_API_TOKEN;
        const response = await axios.get(`https://economia.awesomeapi.com.br/json/last/${pair}?token=${token}`);
        res.json(response.data);
    } catch (error) {
        console.error('Erro na AwesomeAPI:', error.message);
        res.status(500).json({ message: 'Erro ao buscar cotação' });
    }
});

// Rota para histórico (daily)
router.get('/daily/:pair/:days', async (req, res) => {
    try {
        const { pair, days } = req.params;
        const token = process.env.AWESOME_API_TOKEN;
        const response = await axios.get(`https://economia.awesomeapi.com.br/json/daily/${pair}/${days}?token=${token}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar histórico' });
    }
});

module.exports = router;