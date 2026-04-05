// routes/hotelRoutes.js
const express = require('express');
const router = express.Router();
const Amadeus = require('amadeus');

const amadeus = new Amadeus({
    clientId: process.env.AMADEUS_CLIENT_ID,
    clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

// Dicionário Idêntico ao do Orçamento Inteligente
const bffDictionary = {
    'Brasil': 'GRU', 'Estados Unidos': 'NYC', 'Canadá': 'YTO', 'México': 'MEX',
    'Argentina': 'EZE', 'Chile': 'SCL', 'Colômbia': 'BOG', 'Peru': 'LIM', 'Uruguai': 'MVD',
    'França': 'PAR', 'Reino Unido': 'LON', 'Portugal': 'LIS', 'Espanha': 'MAD',
    'Itália': 'ROM', 'Alemanha': 'BER', 'Países Baixos': 'AMS', 'Holanda': 'AMS',
    'Suíça': 'ZRH', 'Bélgica': 'BRU', 'Áustria': 'VIE',
    'Japão': 'TYO', 'Coreia do Sul': 'SEL', 'Singapura': 'SIN', 'Tailândia': 'BKK',
    'Emirados Árabes Unidos': 'DXB', 'Austrália': 'SYD', 'Nova Zelândia': 'AKL',
    'Egito': 'CAI'
};

router.get('/:location', async (req, res) => {
    try {
        const { location } = req.params;
        const stars = req.query.stars || '3'; // Pega as estrelas via query string

        // Resolve se é um código (ROM) ou nome (Itália)
        let iataCode = location.length === 3 ? location.toUpperCase() : (bffDictionary[location] || 'PAR');

        // 1. Busca IDs de hotéis na cidade com a classificação desejada
        const hotelsSearch = await amadeus.referenceData.locations.hotels.byCity.get({
            cityCode: iataCode,
            ratings: stars
        });

        const hotelIds = hotelsSearch.data.slice(0, 8).map(h => h.hotelId).join(',');

        if (!hotelIds) return res.status(404).json({ message: 'Nenhum hotel com esse perfil encontrado.' });

        // 2. Busca ofertas reais
        const hotelOffers = await amadeus.shopping.hotelOffersSearch.get({
            hotelIds: hotelIds,
            adults: '1',
            checkInDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            roomQuantity: '1',
            bestRateOnly: 'true'
        });

        const formatted = hotelOffers.data.map(offer => ({
            name: offer.hotel.name,
            price: offer.offers[0].price.total,
            currency: offer.offers[0].price.currency,
            stars: stars,
            // Foto dinâmica baseada na cidade para evitar repetição
            photoUrl: `https://source.unsplash.com/800x600/?hotel,${iataCode},room&sig=${Math.random()}`
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Erro Hotel Route:', error.message);
        res.status(500).json({ message: 'Erro ao buscar hotéis.' });
    }
});

module.exports = router;