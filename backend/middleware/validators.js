// Validadores extraídos das rotas para manter a limpeza dos controllers

const validateFlightSearch = (req, res, next) => {
    const origin = req.query.origin || (req.flightData && req.flightData.origin);
    const destination = req.query.destination || (req.flightData && req.flightData.destination);
    const date = req.query.date;
    const departureDate = req.query.departureDate || date || (req.flightData && req.flightData.departureDate);

    if (!origin || !destination || !departureDate) {
        return res.status(400).json({ message: 'Origem, destino e data são obrigatórios.' });
    }
    next();
};

const validatePois = (req, res, next) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
        return res.status(400).json({ message: 'Coordenadas obrigatórias.' });
    }
    next();
};

const validateUserRegistration = (req, res, next) => {
    // Adicionado de forma proativa, mas sem mudar a regra de negócio
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
    }
    next();
};

module.exports = {
    validateFlightSearch,
    validatePois,
    validateUserRegistration
};
