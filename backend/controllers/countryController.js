const axios = require('axios');

const searchCountries = async (req, res, next) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ message: "Query 'q' is required" });
        }

        const url = `https://api.restcountries.com/countries/v5?q=${encodeURIComponent(query)}`;
        const token = process.env.RESTCOUNTRIES_API_KEY || 'rc_live_b2b50d357f6e4c0b87adfc247f66ddf9';

        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('[ERRO RESTCOUNTRIES]:', error.message);
        next({ statusCode: 500, payload: { message: "Falha ao buscar países" } });
    }
};

module.exports = {
    searchCountries
};
