const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/pois', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) return res.status(400).json({ message: 'Coordenadas obrigatórias.' });

        const apiKey = process.env.GEOAPIFY_API_KEY;
        const categories = 'tourism.attraction,entertainment.museum,catering.restaurant,catering.cafe,commercial.clothing,commercial.shopping_mall,commercial.gift_and_souvenir';

        const response = await axios.get(`https://api.geoapify.com/v2/places`, {
            params: {
                categories: categories,
                filter: `circle:${lng},${lat},5000`,
                bias: `proximity:${lng},${lat}`,
                limit: 20,
                apiKey: apiKey
            }
        });

        const formattedData = response.data.features
            .filter(feature => feature.properties.name)
            .map(feature => {
                const props = feature.properties;
                const cats = props.categories || [];

                let category = 'CULTURA';
                if (cats.some(c => c.startsWith('catering'))) category = 'RESTAURANT';
                else if (cats.some(c => c.startsWith('commercial'))) category = 'SHOPPING';

                return {
                    id: props.place_id,
                    name: props.name,
                    category: category,
                    rank: (Math.random() * (5 - 4.2) + 4.2).toFixed(1)
                };
            });

        res.json({ data: formattedData });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar atrações.' });
    }
});

module.exports = router;