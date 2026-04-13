const { calculateBudgetBreakdown } = require('../services/amadeusService');
const SearchCache = require('../models/SearchCache');

const calculateBudget = async (req, res, next) => {
    try {
        const { cityName, days, flightClass, hotelStars, originCode, departureDate, adults } = req.body;

        // Criar chave de cache única para este orçamento específico
        const cacheKey = `BUDGET-V2-${cityName}-${days}-${flightClass}-${hotelStars}-${originCode || 'GRU'}-${departureDate}-${adults}`;

        // Verifica se já existe um orçamento idêntico no banco de dados
        console.log('[DEBUG-BUDGET] Verificando existencia de cache para key:', cacheKey);
        const cachedSearch = await SearchCache.findOne({ cacheKey });
        if (cachedSearch) {
            console.log('[DEBUG-BUDGET] Cache encontrado. Retornando dados persistidos.');
            return res.json({
                success: true,
                breakdown: cachedSearch.data,
                fromCache: true,
                message: `Orçamento recuperado via cache inteligente.`
            });
        }

        console.log('[DEBUG-BUDGET] Cache nao encontrado. Iniciando calculo real via APIs.');
        const data = await calculateBudgetBreakdown(req.body);

        const breakdown = {
            flight: data.flightBase,
            hotel: data.dailyHotelBase * data.days,
            dailyExpenses: data.dailyFoodBase * data.days
        };

        // Salva o resultado no banco de dados para futuras consultas idênticas
        await SearchCache.create({
            cacheKey,
            origin: originCode || 'GRU',
            destination: cityName,
            departureDate: departureDate || '2026-10-15',
            data: breakdown
        });

        res.json({
            success: true,
            breakdown,
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
