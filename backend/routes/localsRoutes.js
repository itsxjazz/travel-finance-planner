// const express = require('express');
// const router = express.Router();
// const axios = require('axios');

// router.get('/pois', async (req, res) => {
//     try {
//         const { lat, lng } = req.query;
//         if (!lat || !lng) return res.status(400).json({ message: 'Coordenadas obrigatórias.' });

//         const apiKey = process.env.GEOAPIFY_API_KEY;

//         // CATEGORIAS: Usando categorias de nível superior para maior abrangência
//         const categories = [
//             'tourism.attraction', 'tourism.sights', 'entertainment.museum', 'entertainment.culture', 'leisure.park', // CULTURA
//             'catering.restaurant', 'catering.cafe', 'catering.bar', 'catering.pub', 'catering.fast_food',          // GASTRONOMIA
//             'commercial.clothing', 'commercial.shopping_mall', 'commercial.gift_and_souvenir', 'commercial.books', 'commercial.marketplace' // COMPRAS
//         ].join(',');

//         const response = await axios.get(`https://api.geoapify.com/v2/places`, {
//             params: {
//                 categories: categories,
//                 filter: `circle:${lng},${lat},15000`, // Raio de 15km
//                 bias: `proximity:${lng},${lat}`,
//                 limit: 100, // Limite de 100 opções
//                 apiKey: apiKey
//             }
//         });

//         const formattedData = response.data.features
//             .filter(feature => feature.properties.name) // Garante locais com nome
//             .map(feature => {
//                 const props = feature.properties;
//                 const cats = props.categories || [];

//                 // Mapeamento Inteligente para as 3 Categorias do Frontend
//                 let category = 'CULTURA';

//                 if (cats.some(c => c.startsWith('catering'))) {
//                     category = 'RESTAURANT';
//                 } else if (cats.some(c => c.startsWith('commercial'))) {
//                     category = 'SHOPPING';
//                 } else if (cats.some(c => c.startsWith('tourism') || c.startsWith('entertainment') || c.startsWith('leisure'))) {
//                     category = 'CULTURA';
//                 }

//                 return {
//                     id: props.place_id,
//                     name: props.name,
//                     category: category,
//                     address: props.formatted || 'Endereço não disponível',
//                     lat: props.lat,
//                     lon: props.lon,
//                     // Link dinâmico para o Google Maps
//                     mapUrl: `https://www.google.com/maps/search/?api=1&query=${props.lat},${props.lon}`, rank: (Math.random() * (5 - 4.2) + 4.2).toFixed(1)
//                 };
//             });

//         console.log(`[GEOAPIFY] Sucesso! ${formattedData.length} locais encontrados para o destino.`);
//         res.json({ data: formattedData });

//     } catch (error) {
//         console.error('Erro na Geoapify API:', error.message);
//         res.status(500).json({ message: 'Erro ao buscar atrações turísticas.' });
//     }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/pois', async (req, res) => {
    try {
        const cityName = req.query.iataCode; 
        if (!cityName) return res.status(400).json({ message: 'Nome do destino é obrigatório.' });

        // PASSO 1: Converter Nome da Cidade em Coordenadas (Geocoding)
        const geoRes = await axios.get(`https://nominatim.openstreetmap.org/search`, {
            params: { q: cityName, format: 'json', limit: 1 }
        });

        if (!geoRes.data || geoRes.data.length === 0) {
            return res.status(404).json({ message: 'Coordenadas não encontradas para este destino.' });
        }

        const { lat, lon } = geoRes.data[0];

        // PASSO 2: Chamar a Travel Places API (GraphQL) com as coordenadas descobertas
        const query = `
          query MyQuery {
            getPlaces(
              lat: ${lat}, lng: ${lon},
              maxDistMeters: 15000, limit: 50,
              includeGallery: true, includeAbstract: true
            ) {
              id, name, abstract, categories, distance,
              gallery { url }
            }
          }
        `;

        const response = await axios.post('https://travel-places.p.rapidapi.com/', 
            { query },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-rapidapi-host': 'travel-places.p.rapidapi.com',
                    'x-rapidapi-key': process.env.RAPIDAPI_KEY
                }
            }
        );

        const rawPlaces = response.data?.data?.getPlaces || [];

        // PASSO 3: Formatar para o DiscoveryGrid 
        const formattedData = rawPlaces.map(place => ({
            id: place.id,
            name: place.name,
            category: place.categories?.includes('Museums') ? 'CULTURA' : 'CULTURA', 
            address: `${(place.distance / 1000).toFixed(1)}km do centro`,
            description: place.abstract || 'Ponto turístico disponível para visitação.',
            photo: place.gallery?.[0]?.url || 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800',
            mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`
        }));

        res.json({ data: formattedData });

    } catch (error) {
        console.error('Erro no processamento de locais:', error.message);
        res.status(500).json({ message: 'Erro interno ao buscar atrações.' });
    }
});

module.exports = router;