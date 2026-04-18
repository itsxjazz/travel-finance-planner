const express = require('express');
const router = express.Router();
const localsController = require('../controllers/localsController');
const { validatePois } = require('../middleware/validators');

router.get('/pois', validatePois, localsController.getPois);

module.exports = router;