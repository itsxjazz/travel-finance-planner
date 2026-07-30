const axios = require('axios');

const getLastCurrency = async (pair) => {
    const token = process.env.AWESOME_API_TOKEN;
    const url = token ? `https://economia.awesomeapi.com.br/json/last/${pair}?token=${token}` : `https://economia.awesomeapi.com.br/json/last/${pair}`;
    const response = await axios.get(url);
    return response.data;
};

const getDailyCurrency = async (pair, days) => {
    const token = process.env.AWESOME_API_TOKEN;
    const url = token ? `https://economia.awesomeapi.com.br/json/daily/${pair}/${days}?token=${token}` : `https://economia.awesomeapi.com.br/json/daily/${pair}/${days}`;
    const response = await axios.get(url);
    return response.data;
};

module.exports = {
    getLastCurrency,
    getDailyCurrency
};
