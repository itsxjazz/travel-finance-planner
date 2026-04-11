const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const hotelController = require('../controllers/hotelController');

const searchLimiter = rateLimit({
    windowMs: 30 * 60 * 1000, 
    max: 10, 
    message: { message: 'Muitas buscas originadas deste IP, por favor tente novamente em 30 minutos.' }
});

router.get('/:location', hotelController.checkCacheHotels, searchLimiter, hotelController.searchHotels);
router.get('/details/:hotelId', hotelController.checkCacheDetails, searchLimiter, hotelController.getHotelDetails);

module.exports = router;