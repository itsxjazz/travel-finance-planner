const { getLastCurrency, getDailyCurrency } = require('../services/currencyService');

const getLast = async (req, res, next) => {
    try {
        const data = await getLastCurrency(req.params.pair);
        res.json(data);
    } catch (error) {
        console.error('Erro na AwesomeAPI:', error.message);
        next({ statusCode: 500, payload: { message: 'Erro ao buscar cotação' } });
    }
};

const getDaily = async (req, res, next) => {
    try {
        const data = await getDailyCurrency(req.params.pair, req.params.days);
        res.json(data);
    } catch (error) {
        next({ statusCode: 500, payload: { message: 'Erro ao buscar histórico' } });
    }
};

module.exports = {
    getLast,
    getDaily
};
