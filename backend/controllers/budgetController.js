const { calculateBudgetBreakdown } = require('../services/amadeusService');

const calculateBudget = async (req, res, next) => {
    try {
        const data = await calculateBudgetBreakdown(req.body);

        res.json({
            success: true,
            breakdown: {
                flight: data.flightBase,
                hotel: data.dailyHotelBase * data.days,
                dailyExpenses: data.dailyFoodBase * data.days
            },
            message: `Orçamento base gerado para ${data.parsedAdults} adulto(s) na data ${data.targetDate}.`
        });

    } catch (error) {
        console.error('Erro Crítico no Servidor:', error);
        next({ statusCode: 500, payload: { error: 'Erro no servidor ao processar o orçamento' }});
    }
};

module.exports = {
    calculateBudget
};
