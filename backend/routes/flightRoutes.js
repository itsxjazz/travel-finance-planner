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
            return res.json(cachedSearch.data); // Retornara exatamente { flights: [...] } armazenado no MongoDB
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

        // Acessível normalmente quando API funciona
        const itineraries = response.data.itineraries || [];

        // MAP: Convertendo Data Bruta pro formato Angular (Básico focado em preço e cia)
        const mappedFlights = itineraries.map(itinerary => {
            const sectors = itinerary.sector?.sectorSegments || [];
            const firstSegment = sectors[0]?.segment || {};

            const airline = firstSegment.carrier?.name || 'Companhia Desconhecida';
            const price = parseFloat(itinerary.price?.amount || 0);

            return {
                id: itinerary.id || itinerary.legacyId || Math.random().toString(36).substring(7),
                airline,
                price,
                currency: "BRL",
                origin: origin.toUpperCase(),
                destination: destination.toUpperCase()
            };
        });

        // Garantia de precos crescentes
        mappedFlights.sort((a, b) => a.price - b.price);

        const resultStruct = { flights: mappedFlights };

        // Save do objeto limpo
        await SearchCache.create({
            cacheKey,
            origin,
            destination,
            departureDate,
            data: resultStruct
        });

        res.json(resultStruct);

    } catch (error) {
        // Correcao de Cota Rate Limit Kiwi Localizada
        if (error.response && error.response.status === 429) {
            return res.status(429).json({ message: "Limite de buscas da API Kiwi atingido. Tente novamente em alguns minutos." });
        }

        // Log para Debug especifico do backend
        const apiErrorMsg = error.response && error.response.data 
            ? JSON.stringify(error.response.data) 
            : error.message;

        console.error('[ERRO KIWI AXIOS]:', apiErrorMsg);
        res.status(500).json({ error: "Falha na busca" });
    }
});

module.exports = router;