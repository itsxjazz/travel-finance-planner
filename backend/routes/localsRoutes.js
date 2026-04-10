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

        // 1. CONFIGURAÇÃO: TRAVEL PLACES API (Foco: Cultura e Natureza)
        const travelQuery = `
          query {
            getPlaces(lat: ${latFloat}, lng: ${lngFloat}, maxDistMeters: 15000, limit: 20) {
              id name categories distance lat lng
            }
          }
        `;
        const requestTravelPlaces = axios.post('https://travel-places.p.rapidapi.com/', 
            { query: travelQuery },
            { headers: { 'Content-Type': 'application/json', 'x-rapidapi-host': 'travel-places.p.rapidapi.com', 'x-rapidapi-key': process.env.RAPIDAPI_KEY } }
        );

        // 2. CONFIGURAÇÃO: GEOAPIFY API (Foco: Restaurantes e Compras)
        const geoCategories = [
            'catering.restaurant', 'catering.cafe', 'catering.bar', 'catering.pub', // Gastronomia
            'commercial.shopping_mall', 'commercial.marketplace', 'commercial.clothing' // Compras
        ].join(',');
        
        const requestGeoapify = axios.get(`https://api.geoapify.com/v2/places`, {
            params: {
                categories: geoCategories,
                filter: `circle:${lngFloat},${latFloat},15000`, 
                limit: 30, 
                apiKey: process.env.GEOAPIFY_API_KEY
            }
        });

        // 3. EXECUÇÃO PARALELA (Dispara as duas APIs ao mesmo tempo)
        const [travelResponse, geoResponse] = await Promise.allSettled([
            requestTravelPlaces, 
            requestGeoapify
        ]);

        let combinedData = [];

        // --- PROCESSANDO RESULTADOS DA TRAVEL PLACES (Cultura/Natureza) ---
        if (travelResponse.status === 'fulfilled' && travelResponse.value.data?.data?.getPlaces) {
            const travelData = travelResponse.value.data.data.getPlaces
                .filter(place => place.name)
                .map(place => {
                    const cats = JSON.stringify(place.categories || []).toUpperCase();
                    let category = 'CULTURA'; // Padrão
                    if (cats.includes('BEACH') || cats.includes('NATURE') || cats.includes('PARK')) category = 'NATUREZA';

                    return {
                        id: place.id,
                        name: place.name,
                        category: category,
                        address: `${(place.distance / 1000).toFixed(1)}km do centro`,
                        lat: place.lat,
                        lon: place.lng, 
                        mapUrl: `http://googleusercontent.com/maps.google.com/?q=${place.lat},${place.lng}`
                    };
                });
            combinedData = [...combinedData, ...travelData];
        } else {
            console.error('Falha ao buscar Travel Places:', travelResponse.reason?.message);
        }

        // --- PROCESSANDO RESULTADOS DO GEOAPIFY (Gastronomia/Compras) ---
        if (geoResponse.status === 'fulfilled' && geoResponse.value.data?.features) {
            const geoData = geoResponse.value.data.features
                .filter(feature => feature.properties.name)
                .map(feature => {
                    const props = feature.properties;
                    const cats = props.categories || [];
                    
                    let category = 'RESTAURANT'; // Padrão para essa busca
                    if (cats.some(c => c.startsWith('commercial'))) category = 'SHOPPING';

                    return {
                        id: props.place_id,
                        name: props.name,
                        category: category,
                        address: props.formatted || `${(props.distance / 1000).toFixed(1)}km do centro`,
                        lat: props.lat,
                        lon: props.lon,
                        mapUrl: `http://googleusercontent.com/maps.google.com/?q=${props.lat},${props.lon}`
                    };
                });
            combinedData = [...combinedData, ...geoData];
        } else {
            console.error('Falha ao buscar Geoapify:', geoResponse.reason?.message);
        }

        // 4. RETORNO PARA O FRONTEND
        combinedData = combinedData.sort(() => Math.random() - 0.5);

        console.log(`[API STITCHING] Sucesso! Entregando ${combinedData.length} locais combinados.`);
        res.json({ data: combinedData });

    } catch (error) {
        console.error('Erro na agregação de POIs:', error.message);
        res.status(500).json({ message: 'Erro interno ao procurar atrações.' });
    }
});

module.exports = router;