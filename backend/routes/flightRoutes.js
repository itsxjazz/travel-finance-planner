const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const flightController = require('../controllers/flightController');
const { validateFlightSearch } = require('../middleware/validators');

const searchLimiter = rateLimit({
    windowMs: 30 * 60 * 1000, 
    max: 10, 
    message: { message: 'Muitas buscas originadas deste IP, por favor tente novamente em 30 minutos.' }
});

router.get('/search', validateFlightSearch, flightController.checkCacheFlights, searchLimiter, flightController.searchFlights);

module.exports = router;