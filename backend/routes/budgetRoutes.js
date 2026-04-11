const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');

router.post('/calculate', budgetController.calculateBudget);

module.exports = router;