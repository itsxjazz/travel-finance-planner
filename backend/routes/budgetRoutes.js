const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const budgetController = require('../controllers/budgetController');

// Limite de segurança: 5 orçamentos a cada 30 minutos por IP
const budgetLimiter = rateLimit({
    windowMs: 30 * 60 * 1000, 
    max: 5, 
    message: { message: 'Muitas solicitações seguidas. Você pode gerar até 5 orçamentos a cada 30 minutos.' }
});

router.post('/calculate', budgetLimiter, budgetController.calculateBudget);

module.exports = router;