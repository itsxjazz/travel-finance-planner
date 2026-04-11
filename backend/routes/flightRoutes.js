const express = require('express');
const router = express.Router();
const axios = require('axios');
const SearchCache = require('../models/SearchCache');
const rateLimit = require('express-rate-limit');

const searchLimiter = rateLimit({
    windowMs: 30 * 60 * 1000, 
    max: 10, 
    message: { message: 'Muitas buscas originadas deste IP, por favor tente novamente em 30 minutos.' }
});

const RAPIDAPI_HOST = 'kiwicom-cheap-flights.p.rapidapi.com';

const checkCacheFlights = async (req, res, next) => {
    try {
        const { origin, destination, date, returnDate, currency = 'BRL' } = req.query;

        // Aceita 'date' do frontend mapeando internamente
        const departureDate = req.query.departureDate || date;

        if (!origin || !destination || !departureDate) {
            return res.status(400).json({ message: 'Origem, destino e data são obrigatórios.' });
        }

        const cacheKeyDate = returnDate ? `${departureDate}-${returnDate}` : departureDate;
        const cacheKey = `VOO-${origin.toUpperCase()}-${destination.toUpperCase()}-${cacheKeyDate}`;

        const cachedSearch = await SearchCache.findOne({ cacheKey });
        if (cachedSearch) {
            console.log(`[CACHE] Entregando voos de ${origin} para ${destination} sem gastar API.`);
            return res.json(cachedSearch.data);
        }

        // Passa adiante os parametros ja ajustados
        req.flightData = { origin, destination, departureDate, returnDate, currency, cacheKey };
        next();
    } catch (error) {
        next(error);
    }
};

router.get('/search', checkCacheFlights, searchLimiter, async (req, res) => {
    try {
        const { origin, destination, departureDate, returnDate, currency, cacheKey } = req.flightData;

        const isRoundTrip = !!returnDate;
        const endpoint = isRoundTrip ? '/round-trip' : '/one-way';
        const url = `https://${RAPIDAPI_HOST}/v1/flights${endpoint}`;

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

        const response = await axios.get(url, {
            params,
            headers: {
                'x-rapidapi-host': RAPIDAPI_HOST,
                'x-rapidapi-key': process.env.RAPIDAPI_KEY
            },
            timeout: 10000 
        });

        let flightsData = response.data;
        
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
        res.status(500).json({ error: "Serviço de voos instável", code: "API_TIMEOUT" });
    }
});

module.exports = router;