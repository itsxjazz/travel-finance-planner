const SearchCache = require('../models/SearchCache');
const { searchFlightsKiwi } = require('../services/kiwiService');

const checkCacheFlights = async (req, res, next) => {
    try {
        const origin = req.query.origin || (req.flightData && req.flightData.origin);
        const destination = req.query.destination || (req.flightData && req.flightData.destination);
        const date = req.query.date;
        const departureDate = req.query.departureDate || date || (req.flightData && req.flightData.departureDate);

        const cacheKey = `VOO-V3-${origin.toUpperCase()}-${destination.toUpperCase()}-${departureDate}`;

        const cachedSearch = await SearchCache.findOne({ cacheKey });
        if (cachedSearch) {
            console.log(`[CACHE] Entregando voos de ${origin} para ${destination} sem gastar API.`);
            
            let returnData = [];
            if (Array.isArray(cachedSearch.data)) {
                returnData = cachedSearch.data;
            } else if (cachedSearch.data && Array.isArray(cachedSearch.data.flights)) {
                returnData = cachedSearch.data.flights;
            } else {
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

const searchFlights = async (req, res, next) => {
    try {
        const { origin, destination, departureDate, cacheKey } = req.flightData;

        const mappedFlights = await searchFlightsKiwi(origin, destination, departureDate);

        await SearchCache.create({
            cacheKey,
            origin,
            destination,
            departureDate,
            data: mappedFlights
        });

        res.json(mappedFlights);

    } catch (error) {
        if (error.response && error.response.status === 429) {
            return next({ statusCode: 429, payload: { message: "Limite de buscas da API Kiwi atingido. Tente novamente em alguns minutos." }});
        }

        const apiErrorMsg = error.response && error.response.data 
            ? JSON.stringify(error.response.data) 
            : error.message;

        console.error('[ERRO KIWI AXIOS]:', apiErrorMsg);
        next({ statusCode: 500, payload: { error: "Falha na busca" } });
    }
};

module.exports = {
    checkCacheFlights,
    searchFlights
};
