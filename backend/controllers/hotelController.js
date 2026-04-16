const SearchCache = require('../models/SearchCache');
const { searchHotelsByLocation, getHotelDetailsExhaustive } = require('../services/bookingService');

const checkCacheHotels = async (req, res, next) => {
    try {
        const { location } = req.params;
        const stars = req.query.stars || '3';

        const checkin = new Date(); checkin.setDate(checkin.getDate() + 14);
        const checkout = new Date(checkin); checkout.setDate(checkout.getDate() + 1);
        const checkinDateStr = checkin.toISOString().split('T')[0];
        const checkoutDateStr = checkout.toISOString().split('T')[0];

        const cacheKey = `HOTEL-V3-${location.toUpperCase()}-${checkinDateStr}-${stars}`;
        
        const cachedSearch = await SearchCache.findOne({ cacheKey });
        if (cachedSearch) {
            return res.json(cachedSearch.data);
        }

        req.hotelData = { location, stars, checkinDateStr, checkoutDateStr, cacheKey };
        next();
    } catch (error) {
        next(error);
    }
};

const searchHotels = async (req, res, next) => {
    try {
        const { location, stars, checkinDateStr, checkoutDateStr, cacheKey } = req.hotelData;
        
        const formattedHotels = await searchHotelsByLocation(location, stars, checkinDateStr, checkoutDateStr);

        if (!formattedHotels) {
            return res.status(404).json({ message: 'Destino não encontrado.' });
        }

        await SearchCache.create({
            cacheKey,
            destination: location,
            departureDate: checkinDateStr,
            data: formattedHotels
        });

        res.json(formattedHotels);

    } catch (error) {
        const apiStatus = error.response?.status;
        const apiBody = JSON.stringify(error.response?.data || error.message);
        console.error(`[HOTEL BUSCA ERRO] Status: ${apiStatus} | Body: ${apiBody}`);
        next({ statusCode: 500, payload: { message: 'Erro ao buscar hotéis.' } });
    }
};

const checkCacheDetails = async (req, res, next) => {
    try {
        const { hotelId } = req.params;

        const checkin = new Date(); checkin.setDate(checkin.getDate() + 14);
        const checkout = new Date(checkin); checkout.setDate(checkout.getDate() + 1);
        const checkinDateStr = checkin.toISOString().split('T')[0];
        const checkoutDateStr = checkout.toISOString().split('T')[0];

        const cacheKey = `HOTEL-DETAILS-V3-${hotelId}-${checkinDateStr}`;

        const cachedDetails = await SearchCache.findOne({ cacheKey });
        if (cachedDetails) {
            return res.json(cachedDetails.data);
        }

        req.hotelDetails = { hotelId, checkinDateStr, checkoutDateStr, cacheKey };
        next();
    } catch (error) {
        next(error);
    }
};

const getHotelDetails = async (req, res, next) => {
    try {
        const { hotelId, checkinDateStr, checkoutDateStr, cacheKey } = req.hotelDetails;

        const result = await getHotelDetailsExhaustive(hotelId, checkinDateStr, checkoutDateStr);

        await SearchCache.create({
            cacheKey,
            destination: `hotel-${hotelId}`,
            data: result
        });

        res.json(result);

    } catch (error) {
        console.error('Erro no Enriquecimento:', error.message);
        next({ statusCode: 500, payload: { message: 'Erro ao buscar detalhes.' } });
    }
};

module.exports = {
    checkCacheHotels,
    searchHotels,
    checkCacheDetails,
    getHotelDetails
};
