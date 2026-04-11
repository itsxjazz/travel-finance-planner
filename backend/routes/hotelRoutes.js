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

const HEADERS = {
    'x-rapidapi-host': 'booking-com.p.rapidapi.com',
    'x-rapidapi-key': process.env.RAPIDAPI_KEY
};

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
            console.log(`[CACHE] Entregando busca de hotéis para ${location} sem gastar API.`);
            return res.json(cachedSearch.data);
        }

        req.hotelData = { location, stars, checkinDateStr, checkoutDateStr, cacheKey };
        next();
    } catch (error) {
        next(error);
    }
};

router.get('/:location', checkCacheHotels, searchLimiter, async (req, res) => {
    try {
        const { location, stars, checkinDateStr, checkoutDateStr, cacheKey } = req.hotelData;

        const locResponse = await axios.get('https://booking-com.p.rapidapi.com/v1/hotels/locations', {
            params: { name: location, locale: 'pt-br' },
            headers: HEADERS
        });

        if (!locResponse.data || locResponse.data.length === 0) {
            return res.status(404).json({ message: 'Destino não encontrado.' });
        }

        const destId = locResponse.data[0].dest_id;
        const destType = locResponse.data[0].dest_type;

        const hotelsRes = await axios.get('https://booking-com.p.rapidapi.com/v1/hotels/search', {
            params: {
                locale: 'pt-br',
                dest_id: destId,
                dest_type: destType,
                checkin_date: checkinDateStr,
                checkout_date: checkoutDateStr,
                adults_number: 2,
                room_number: 1,
                order_by: 'popularity',
                units: 'metric',
                categories_filter_ids: `class::${stars}`
            },
            headers: HEADERS
        });

        const formattedHotels = hotelsRes.data.result.slice(0, 10).map(hotel => ({
            hotelId: hotel.hotel_id,
            name: hotel.hotel_name,
            price: hotel.min_total_price, 
            currency: hotel.currencycode || 'EUR',
            rating: parseInt(stars) || 3,
            photoUrl: hotel.max_photo_url || hotel.main_photo_url,
            roomType: hotel.accommodation_type_name || 'Quarto Standard', 
            reviewCount: hotel.review_nr || 0,
            distance: hotel.distance_to_cc ? parseFloat(hotel.distance_to_cc).toFixed(1) : '0'
        }));

        await SearchCache.create({
            cacheKey,
            destination: location,
            departureDate: checkinDateStr,
            data: formattedHotels
        });

        res.json(formattedHotels);

    } catch (error) {
        console.error('Erro na Busca:', error.message);
        res.status(500).json({ message: 'Erro ao buscar hotéis.' });
    }
});

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
            console.log(`[CACHE] Entregando hotel ${hotelId} sem gastar API.`);
            return res.json(cachedDetails.data);
        }

        req.hotelDetails = { hotelId, checkinDateStr, checkoutDateStr, cacheKey };
        next();
    } catch (error) {
        next(error);
    }
};

router.get('/details/:hotelId', checkCacheDetails, searchLimiter, async (req, res) => {
    try {
        const { hotelId, checkinDateStr, checkoutDateStr, cacheKey } = req.hotelDetails;

        const [descRes, photosRes, roomsRes] = await Promise.all([
            axios.get('https://booking-com.p.rapidapi.com/v1/hotels/description', {
                params: { hotel_id: hotelId, locale: 'pt-br' },
                headers: HEADERS
            }),
            axios.get('https://booking-com.p.rapidapi.com/v1/hotels/photos', {
                params: { hotel_id: hotelId, locale: 'pt-br' },
                headers: HEADERS
            }),
            axios.get('https://booking-com.p.rapidapi.com/v1/hotels/room-list', {
                params: { 
                    hotel_id: hotelId, 
                    checkin_date: checkinDateStr, 
                    checkout_date: checkoutDateStr,
                    adults_number_by_rooms: '2',
                    units: 'metric',
                    locale: 'pt-br'
                },
                headers: HEADERS
            })
        ]);

        const result = {
            fullDescription: descRes.data.description || 'Descrição completa disponível no site.',
            photos: photosRes.data.map(p => p.url_max || p.url_original).slice(0, 8),
            realRoomName: roomsRes.data[0]?.block?.[0]?.room_name || 'Quarto Selecionado'
        };

        await SearchCache.create({
            cacheKey,
            destination: `hotel-${hotelId}`,
            data: result
        });

        res.json(result);

    } catch (error) {
        console.error('Erro no Enriquecimento:', error.message);
        res.status(500).json({ message: 'Erro ao buscar detalhes.' });
    }
});

module.exports = router;