const express = require('express');
const router = express.Router();
const currencyController = require('../controllers/currencyController');

router.get('/last/:pair', currencyController.getLast);
router.get('/daily/:pair/:days', currencyController.getDaily);

module.exports = router;