const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/pois', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) return res.status(400).json({ message: 'Coordenadas obrigatórias.' });

        const apiKey = process.env.GEOAPIFY_API_KEY;

        // CATEGORIAS: Usando categorias de nível superior para maior abrangência
        const categories = [
            'tourism.attraction', 'tourism.sights', 'entertainment.museum', 'entertainment.culture', 'leisure.park', // CULTURA
            'catering.restaurant', 'catering.cafe', 'catering.bar', 'catering.pub', 'catering.fast_food',          // GASTRONOMIA
            'commercial.clothing', 'commercial.shopping_mall', 'commercial.gift_and_souvenir', 'commercial.books', 'commercial.marketplace' // COMPRAS
        ].join(',');

        const response = await axios.get(`https://api.geoapify.com/v2/places`, {
            params: {
                categories: categories,
                filter: `circle:${lng},${lat},10000`, // Raio de 05km
                bias: `proximity:${lng},${lat}`,
                limit: 100, // Limite de 100 opções
                apiKey: apiKey
            }
        });

        const formattedData = response.data.features
            .filter(feature => feature.properties.name) // Garante locais com nome
            .map(feature => {
                const props = feature.properties;
                const cats = props.categories || [];

                // Mapeamento Inteligente para as 3 Categorias do Frontend
                let category = 'CULTURA';

                if (cats.some(c => c.startsWith('catering'))) {
                    category = 'RESTAURANT';
                } else if (cats.some(c => c.startsWith('commercial'))) {
                    category = 'SHOPPING';
                } else if (cats.some(c => c.startsWith('tourism') || c.startsWith('entertainment') || c.startsWith('leisure'))) {
                    category = 'CULTURA';
                }

                return {
                    id: props.place_id,
                    name: props.name,
                    category: category,
                    address: props.formatted || 'Endereço não disponível',
                    lat: props.lat,
                    lon: props.lon,
                    // Link dinâmico para o Google Maps
                    mapUrl: `https://www.google.com/maps/search/?api=1&query=${props.lat},${props.lon}`,
                    rank: (Math.random() * (5 - 4.2) + 4.2).toFixed(1)
                };
            });

        console.log(`[GEOAPIFY] Sucesso! ${formattedData.length} locais encontrados para o destino.`);
        res.json({ data: formattedData });

    } catch (error) {
        console.error('Erro na Geoapify API:', error.message);
        res.status(500).json({ message: 'Erro ao buscar atrações turísticas.' });
    }
});

module.exports = router;