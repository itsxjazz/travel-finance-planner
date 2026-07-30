const SearchCache = require('../models/SearchCache');
const { searchFlightsKiwi } = require('../services/kiwiService');

const checkCacheFlights = async (req, res, next) => {
    try {
        const origin = req.query.origin || (req.flightData && req.flightData.origin);
        const destination = req.query.destination || (req.flightData && req.flightData.destination);
        const date = req.query.date;
        const departureDate = req.query.departureDate || date || (req.flightData && req.flightData.departureDate);
        const cabinClass = req.query.cabinClass || 'ECONOMY';

        const cacheKey = `VOO-V4-${origin.toUpperCase()}-${destination.toUpperCase()}-${departureDate}-${cabinClass}`;

        const cachedSearch = await SearchCache.findOne({ cacheKey });
        if (cachedSearch) {
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

        req.flightData = { origin, destination, departureDate, cabinClass, cacheKey };
        next();
    } catch (error) {
        next(error);
    }
};

const searchFlights = async (req, res, next) => {
    try {
        const { origin, destination, departureDate, cabinClass, cacheKey } = req.flightData;

        const mappedFlights = await searchFlightsKiwi(origin, destination, departureDate, cabinClass);

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
        
        const { origin, destination, departureDate } = req.flightData || { origin: '???', destination: '???', departureDate: '2026-01-01' };
        
        // fallback para caso a api dê inconsistência
        console.log('Usando dados de voo falsos (mock) devido a erro na API.');
        const fakeFlights = [
            {
                id: 'mock-1', airlineCode: 'LA', airlineName: 'LATAM (Mock)', stops: 0,
                departure: { at: `${departureDate}T08:00:00`, iataCode: origin },
                duration: 'PT12H30M',
                arrival: { at: `${departureDate}T20:30:00`, iataCode: destination },
                price: 3500, currency: 'BRL'
            },
            {
                id: 'mock-2', airlineCode: 'G3', airlineName: 'GOL (Mock)', stops: 1,
                departure: { at: `${departureDate}T10:15:00`, iataCode: origin },
                duration: 'PT15H45M',
                arrival: { at: `${departureDate}T02:00:00`, iataCode: destination },
                price: 2800, currency: 'BRL'
            },
            {
                id: 'mock-3', airlineCode: 'AA', airlineName: 'American Airlines (Mock)', stops: 2,
                departure: { at: `${departureDate}T14:30:00`, iataCode: origin },
                duration: 'PT20H15M',
                arrival: { at: `${departureDate}T10:45:00`, iataCode: destination },
                price: 2100, currency: 'BRL'
            }
        ];
        return res.json(fakeFlights);
    }
};

module.exports = {
    checkCacheFlights,
    searchFlights
};
