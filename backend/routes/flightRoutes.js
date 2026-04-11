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
            
            // Fix for old cache formats (raw Kiwi response or {flights: []} object)
            let returnData = [];
            if (Array.isArray(cachedSearch.data)) {
                returnData = cachedSearch.data;
            } else if (cachedSearch.data && Array.isArray(cachedSearch.data.flights)) {
                returnData = cachedSearch.data.flights;
            } else {
                // If it's a raw unmapped kiwi response, delete cache and proceed to fetch fresh
                await SearchCache.deleteOne({ cacheKey });
                req.flightData = { origin, destination, departureDate, cacheKey };
                return next();
            }
            
            return res.json(returnData);
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
            cabinClass: 'ECONOMY'
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
        // The Kiwi one-way endpoint on rapid API might return data directly or wrapped
        const itineraries = response.data.itineraries || response.data.data?.itineraries || [];

        // MAP: Convertendo Data Bruta pro formato Angular (Básico focado em preço e cia)
        const mappedFlights = itineraries.map(itinerary => {
            const sectors = itinerary.sector?.sectorSegments || [];
            const firstSegment = sectors[0]?.segment || {};
            const lastSegment = sectors[sectors.length - 1]?.segment || {};

            const airlineCode = firstSegment.carrier?.code || '';
            const airlineName = firstSegment.carrier?.name || 'Companhia Desconhecida';
            const price = parseFloat(itinerary.price?.amount || 0);

            const departureAt = firstSegment.source?.localTime || '';
            const departureIataCode = firstSegment.source?.station?.code || '';

            const arrivalAt = lastSegment.destination?.localTime || '';
            const arrivalIataCode = lastSegment.destination?.station?.code || '';

            const durationRaw = itinerary.sector?.duration || 0;
            const durationHours = Math.floor(durationRaw / 3600);
            const durationMinutes = Math.floor((durationRaw % 3600) / 60);
            const durationStr = `PT${durationHours}H${durationMinutes}M`;

            const stops = Math.max(0, sectors.length - 1);

            return {
                id: itinerary.id || itinerary.legacyId || Math.random().toString(36).substring(7),
                airlineCode,
                airlineName,
                stops,
                departure: {
                    at: departureAt,
                    iataCode: departureIataCode
                },
                duration: durationStr,
                arrival: {
                    at: arrivalAt,
                    iataCode: arrivalIataCode
                },
                price,
                currency: itinerary.currency || itinerary.price?.currency || response.data.currency || 'EUR'
            };
        });

        // Garantia de precos crescentes
        mappedFlights.sort((a, b) => a.price - b.price);

        // Save do array mapeado em data
        await SearchCache.create({
            cacheKey,
            origin,
            destination,
            departureDate,
            data: mappedFlights
        });

        res.json(mappedFlights);

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