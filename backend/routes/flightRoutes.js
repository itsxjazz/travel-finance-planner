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

const RAPIDAPI_HOST = 'kiwi-com-cheap-flights.p.rapidapi.com';

const checkCacheFlights = async (req, res, next) => {
    try {
        const { origin, destination, date } = req.query;

        const departureDate = req.query.departureDate || date;

        if (!origin || !destination || !departureDate) {
            return res.status(400).json({ message: 'Origem, destino e data são obrigatórios.' });
        }

        const cacheKey = `VOO-${origin.toUpperCase()}-${destination.toUpperCase()}-${departureDate}`;

        const cachedSearch = await SearchCache.findOne({ cacheKey });
        if (cachedSearch) {
            console.log(`[CACHE] Entregando voos de ${origin} para ${destination} sem gastar API.`);
            return res.json(cachedSearch.data);
        }

        req.flightData = { origin, destination, departureDate, cacheKey };
        next();
    } catch (error) {
        next(error);
    }
};

router.get('/search', checkCacheFlights, searchLimiter, async (req, res) => {
    try {
        const { origin, destination, departureDate, cacheKey } = req.flightData;

        // Endpoint exato especificado
        const url = `https://${RAPIDAPI_HOST}/one-way`;

        // Range fixo com restricoes rigorosas da querystring
        const params = {
            source: origin,
            destination: destination,
            outboundDepartmentDateStart: `${departureDate}T00:00:00`,
            outboundDepartmentDateEnd: `${departureDate}T00:00:00`,
            limit: 10,
            sortBy: 'PRICE',
            cabinClass: 'ECONOMY',
            currency: 'BRL'
        };

        const response = await axios.get(url, {
            params,
            headers: {
                'x-rapidapi-host': RAPIDAPI_HOST,
                'x-rapidapi-key': process.env.RAPIDAPI_KEY
            },
            timeout: 10000 
        });

        const flightsData = response.data;
        
        await SearchCache.create({
            cacheKey,
            origin,
            destination,
            departureDate,
            data: flightsData
        });

        res.json(flightsData);

    } catch (error) {
        // Log para Debug especifico do backend (Render logs)
        const apiErrorMsg = error.response && error.response.data 
            ? JSON.stringify(error.response.data) 
            : error.message;

        console.error('[ERRO KIWI AXIOS]:', apiErrorMsg);
        
        // JSON Seguro pro browser/cliente amigavel
        res.status(500).json({ error: "Falha na busca" });
    }
});

module.exports = router;