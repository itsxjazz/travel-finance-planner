const express = require('express');
const router = express.Router();
const axios = require('axios');
const SearchCache = require('../models/SearchCache');

const RAPIDAPI_HOST = 'kiwicom-cheap-flights.p.rapidapi.com';

router.get('/search', async (req, res) => {
    try {
        const { origin, destination, departureDate, returnDate, currency = 'BRL' } = req.query;

        if (!origin || !destination || !departureDate) {
            return res.status(400).json({ message: 'Origem, destino e data (departureDate) são obrigatórios.' });
        }

        const cacheKeyDate = returnDate ? `${departureDate}-${returnDate}` : departureDate;
        const cacheKey = `VOO-${origin.toUpperCase()}-${destination.toUpperCase()}-${cacheKeyDate}`;

        // Verificação no Cache (usando o recém criado schema TTL 24h)
        const cachedSearch = await SearchCache.findOne({ cacheKey });
        if (cachedSearch) {
            console.log(`[CACHE] Entregando voos de ${origin} para ${destination} sem gastar API.`);
            return res.json(cachedSearch.data);
        }

        // Endpoint Dinâmico base nas regras de negócio (One Way ou Round Trip)
        const isRoundTrip = !!returnDate;
        const endpoint = isRoundTrip ? '/round-trip' : '/one-way';
        const url = `https://${RAPIDAPI_HOST}/v1/flights${endpoint}`;

        // Adequando a formatação específica da Kiwi.com para datas com Timezone Time
        const params = {
            source: origin,
            destination: destination,
            outboundDepartmentDateStart: `${departureDate}T00:00:00`,
            currency: currency,
            limit: 10,
            sortBy: 'PRICE'
        };

        if (isRoundTrip) {
            params.inboundDepartmentDateStart = `${returnDate}T00:00:00`;
        }

        // Requisição Externa usando infraestrutura do Axios e não mais client amadeus
        const response = await axios.get(url, {
            params,
            headers: {
                'x-rapidapi-host': RAPIDAPI_HOST,
                'x-rapidapi-key': process.env.RAPIDAPI_KEY
            },
            timeout: 10000 
        });

        let flightsData = response.data;
        
        // Garante a ordenação exigida (ascendente por preço)
        if (Array.isArray(flightsData)) {
             flightsData = flightsData.sort((a, b) => {
                 const priceA = parseFloat(a.price) || 0;
                 const priceB = parseFloat(b.price) || 0;
                 return priceA - priceB;
             });
        } else if (flightsData.data && Array.isArray(flightsData.data)) {
             flightsData.data = flightsData.data.sort((a, b) => {
                 const priceA = parseFloat(a.price) || parseFloat(a.min_price) || 0;
                 const priceB = parseFloat(b.price) || parseFloat(b.min_price) || 0;
                 return priceA - priceB;
             });
        }

        // Salvamento do Sucesso no Cache MongoDB
        await SearchCache.create({
            cacheKey,
            origin,
            destination,
            departureDate,
            returnDate,
            data: flightsData
        });

        res.json(flightsData);

    } catch (error) {
        console.error('Erro na API da Kiwi.com (Voos):', error.message);
        
        // Regra de segurança/fallabck de retorno
        res.status(500).json({ error: "Serviço de voos instável", code: "API_TIMEOUT" });
    }
});

module.exports = router;