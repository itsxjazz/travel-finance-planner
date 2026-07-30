const express = require('express');
const router = express.Router();
const countryController = require('../controllers/countryController');

router.get('/search', countryController.searchCountries);

module.exports = router;
