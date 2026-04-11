const { getCombinedPois } = require('../services/poiService');

const getPois = async (req, res, next) => {
    try {
        const { lat, lng } = req.query;
        const finalData = await getCombinedPois(lat, lng);
        res.json({ data: finalData });
    } catch (error) {
        console.error('Erro na agregação de POIs:', error.message);
        next({ statusCode: 500, payload: { message: 'Erro interno ao procurar atrações.' } });
    }
};

module.exports = {
    getPois
};
