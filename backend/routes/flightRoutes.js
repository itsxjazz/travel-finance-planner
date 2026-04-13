const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const flightController = require('../controllers/flightController');
const { validateFlightSearch } = require('../middleware/validators');

const searchLimiter = rateLimit({
    windowMs: 30 * 60 * 1000, 
    max: 5, 
    message: { message: 'Limite de busca de voos atingido (5 a cada 30 min). Por favor, aguarde.' }
});

router.get('/search', validateFlightSearch, flightController.checkCacheFlights, searchLimiter, flightController.searchFlights);

module.exports = router;