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

        const latFloat = parseFloat(lat);
        const lngFloat = parseFloat(lng);
        const query = `
          query MyQuery {
            getPlaces(
              lat: ${latFloat}
              lng: ${lngFloat}
              maxDistMeters: 15000
              limit: 60
              includeGallery: true
              includeAbstract: true
            ) {
              id
              name
              abstract
              categories
              distance
              lat
              lng
              gallery {
                url
              }
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

        const formattedData = rawPlaces
            .filter(place => place.name)
            .map(place => {
                const cats = place.categories || [];
                let category = 'CULTURA';
                const catsUpper = cats.map(c => c.toUpperCase());
                
                if (catsUpper.includes('BEACHES') || catsUpper.includes('NATURE')) {
                    category = 'NATUREZA';
                } else if (catsUpper.includes('MUSEUMS') || catsUpper.includes('HISTORIC') || catsUpper.includes('CULTURE')) {
                    category = 'CULTURA';
                } else {
                    category = 'RESTAURANT'; // Fallback para preencher o mapa com outras opções
                }

                const photoUrl = (place.gallery && place.gallery.length > 0) 
                                 ? place.gallery[0].url 
                                 : 'https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=1000&auto=format&fit=crop';

                return {
                    id: place.id,
                    name: place.name,
                    category: category,
                    address: `${(place.distance / 1000).toFixed(1)}km do centro`,
                    description: place.abstract || 'Ponto turístico local. Veja no mapa para mais detalhes.',
                    photo: photoUrl,
                    lat: place.lat,
                    lon: place.lng, 
                    mapUrl: `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}` // Link do Maps corrigido e mais preciso
                };
            });

        console.log(`[TRAVEL PLACES API] Sucesso! ${formattedData.length} locais encontrados.`);
        res.json({ data: formattedData });

    } catch (error) {
        console.error('Erro na Travel Places API:', error.message);
        res.status(500).json({ message: 'Erro ao buscar atrações turísticas.' });
    }
});

module.exports = router;