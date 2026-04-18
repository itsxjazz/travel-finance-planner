const axios = require('axios');

const getLastCurrency = async (pair) => {
    const token = process.env.AWESOME_API_TOKEN;
    const response = await axios.get(`https://economia.awesomeapi.com.br/json/last/${pair}?token=${token}`);
    return response.data;
};

const getDailyCurrency = async (pair, days) => {
    const token = process.env.AWESOME_API_TOKEN;
    const response = await axios.get(`https://economia.awesomeapi.com.br/json/daily/${pair}/${days}?token=${token}`);
    return response.data;
};

module.exports = {
    getLastCurrency,
    getDailyCurrency
};
