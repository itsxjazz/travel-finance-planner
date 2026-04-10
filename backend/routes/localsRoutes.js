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
        const { lat, lng } = req.query;
        if (!lat || !lng) return res.status(400).json({ message: 'Coordenadas obrigatórias.' });

        const query = `
          query {
            getPlaces(
              lat: ${parseFloat(lat)},
              lng: ${parseFloat(lng)},
              maxDistMeters: 10000,
              limit: 20
            ) {
              id
              name
              abstract
              categories
              distance
              lat
              lng
              country
            }
          }
        `;

        const response = await axios.post('https://travel-places.p.rapidapi.com/', 
            { query: query },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-rapidapi-host': 'travel-places.p.rapidapi.com',
                    'x-rapidapi-key': process.env.RAPIDAPI_KEY 
                }
            }
        );

        if (!response.data || !response.data.data || !response.data.data.getPlaces) {
            return res.json({ data: [] });
        }

        const rawPlaces = response.data.data.getPlaces;

        const categoriasEncontradas = new Set();
        rawPlaces.forEach(place => {
            if (place.categories) {
                place.categories.forEach(cat => categoriasEncontradas.add(cat));
            }
        });
        console.log(' CATEGORIAS NESTA CIDADE:', Array.from(categoriasEncontradas).join(', '));

        // 1. BANCO DE IMAGENS
        const imagesDB = {
            'CULTURA': [
                'https://images.unsplash.com/photo-1518398046578-8cca57782e17?q=80&w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?q=80&w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1541194577687-8c63bf9e7ee3?q=80&w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1564399579883-456a5d4400e0?q=80&w=800&auto=format&fit=crop'
            ],
            'NATUREZA': [
                'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1426604966848-d7adac402bff?q=80&w=800&auto=format&fit=crop'
            ],
            'RESTAURANT': [
                'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1505826759037-406b40feb4cd?q=80&w=800&auto=format&fit=crop'
            ],
            'GERAL': [
                'https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=800&auto=format&fit=crop'
            ]
        };

        const formattedData = rawPlaces
            .filter(place => place.name)
            .map((place, index) => {
                const cats = place.categories || [];
                let category = 'CULTURA';
                
                const catsString = JSON.stringify(cats).toUpperCase();
                
                if (catsString.includes('BEACH') || catsString.includes('NATURE')) {
                    category = 'NATUREZA';
                } else if (catsString.includes('MUSEUM') || catsString.includes('HISTORIC') || catsString.includes('CULTURE')) {
                    category = 'CULTURA';
                } else if (catsString.includes('RESTAURANT') || catsString.includes('FOOD')) {
                    category = 'RESTAURANT';
                }

                // 2. LÓGICA DE DISTRIBUIÇÃO DAS FOTOS
                const categoryPhotos = imagesDB[category] || imagesDB['GERAL'];
                const selectedPhoto = categoryPhotos[index % categoryPhotos.length];

                return {
                    id: place.id,
                    name: place.name,
                    category: category,
                    address: `${(place.distance / 1000).toFixed(1)}km do centro`,
                    description: place.abstract || 'Ponto turístico local em destaque. Veja no mapa para mais detalhes.',
                    
                    photo: selectedPhoto,
                    
                    lat: place.lat,
                    lon: place.lng, 
                    mapUrl: `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
                };
            });

        console.log(`[TRAVEL PLACES API] Sucesso! ${formattedData.length} locais encontrados.`);
        res.json({ data: formattedData });

    } catch (error) {
        console.error('⚠️ Detalhes do Erro na API:', error.response?.data || error.message);
        res.status(500).json({ message: 'Erro interno ao buscar atrações.' });
    }
});

module.exports = router;