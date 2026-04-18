const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const hotelController = require('../controllers/hotelController');

const searchLimiter = rateLimit({
    windowMs: 30 * 60 * 1000, 
    max: 5, 
    message: { message: 'Limite de busca de hotéis atingido (5 a cada 30 min). Por favor, aguarde.' }
});

router.get('/:location', hotelController.checkCacheHotels, searchLimiter, hotelController.searchHotels);
router.get('/details/:hotelId', hotelController.checkCacheDetails, searchLimiter, hotelController.getHotelDetails);

module.exports = router;