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
            getPlaces(lat: ${latFloat}, lng: ${lngFloat}, maxDistMeters: 15000, limit: 50) {
              id name categories distance lat lng
            }
          }
        `;
        const requestTravelPlaces = axios.post('https://travel-places.p.rapidapi.com/', 
            { query: travelQuery },
            { 
              headers: { 
                'Content-Type': 'application/json', 
                'x-rapidapi-host': 'travel-places.p.rapidapi.com', 
                'x-rapidapi-key': process.env.RAPIDAPI_KEY 
              },
              timeout: 10000 
            }
        );

        // 2. CONFIGURAÇÃO: GEOAPIFY API (Separada por temas para garantir distribuição sem timeout)
        const geoBaseParams = { filter: `circle:${lngFloat},${latFloat},15000`, limit: 50, apiKey: process.env.GEOAPIFY_API_KEY };
        
        const requestGeoFood = axios.get(`https://api.geoapify.com/v2/places`, {
            params: { ...geoBaseParams, categories: 'catering.restaurant,catering.cafe,catering.bar,catering.fast_food' },
            timeout: 25000
        });

        const requestGeoShop = axios.get(`https://api.geoapify.com/v2/places`, {
            params: { ...geoBaseParams, categories: 'commercial.clothing,commercial.shopping_mall,commercial.gift_and_souvenir,commercial.marketplace' },
            timeout: 25000
        });

        const requestGeoCulture = axios.get(`https://api.geoapify.com/v2/places`, {
            params: { ...geoBaseParams, categories: 'tourism.attraction,tourism.sights,entertainment.museum,entertainment.culture' },
            timeout: 25000
        });

        // 3. EXECUÇÃO PARALELA (4 micro-requisições bem mais leves para as APIs)
        const responses = await Promise.allSettled([
            requestTravelPlaces, requestGeoFood, requestGeoShop, requestGeoCulture
        ]);

        let rawCombinedData = [];
        let travelCount = 0;
        let geoapifyCount = 0;

        // --- PROCESSANDO RESULTADOS DA TRAVEL PLACES ---
        if (responses[0].status === 'fulfilled' && responses[0].value.data?.data?.getPlaces) {
            const travelData = responses[0].value.data.data.getPlaces
                .filter(place => place.name)
                .map(place => {
                    const cats = JSON.stringify(place.categories || []).toUpperCase();
                    let category = 'CULTURA';
                    if (cats.includes('BEACH') || cats.includes('NATURE') || cats.includes('PARK')) category = 'NATUREZA';

                    return {
                        id: place.id,
                        name: place.name,
                        category: category,
                        address: `${(place.distance / 1000).toFixed(1)}km do centro`,
                        lat: place.lat,
                        lon: place.lng, 
                        mapUrl: `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
                    };
                });
            rawCombinedData = [...rawCombinedData, ...travelData];
            travelCount = travelData.length;
        } else if (responses[0].status === 'rejected') {
            console.error('[TRAVEL PLACES ERRO SILENCIOSO]:', responses[0].reason?.message || responses[0].reason);
        }

        // --- PROCESSANDO RESULTADOS DO GEOAPIFY ---
        [1, 2, 3].forEach(index => {
            const geoRes = responses[index];
            if (geoRes.status === 'fulfilled' && geoRes.value.data?.features) {
                const geoData = geoRes.value.data.features
                    .filter(feature => feature.properties.name)
                    .map(feature => {
                        const props = feature.properties;
                        const cats = props.categories || [];

                        let category = 'CULTURA';
                        if (cats.some(c => c.startsWith('catering'))) category = 'RESTAURANT';
                        else if (cats.some(c => c.startsWith('commercial'))) category = 'SHOPPING';
                        else if (cats.some(c => c.startsWith('tourism') || c.startsWith('entertainment'))) category = 'CULTURA';

                        return {
                            id: props.place_id,
                            name: props.name,
                            category: category,
                            address: props.formatted || `${(props.distance / 1000).toFixed(1)}km do centro`,
                            lat: props.lat,
                            lon: props.lon,
                            mapUrl: `https://www.google.com/maps/search/?api=1&query=${props.lat},${props.lon}`
                        };
                    });
                rawCombinedData = [...rawCombinedData, ...geoData];
                geoapifyCount += geoData.length;
            } else if (geoRes.status === 'rejected') {
                const errReason = geoRes.reason?.response?.data || geoRes.reason?.message || geoRes.reason;
                console.error(`[GEOAPIFY RQ${index} ERRO]:`, errReason);
            }
        });

        // 4. AGRUPAMENTO E LIMITAÇÃO POR CATEGORIA (Max 50 de cada)
        const categoriesMap = { CULTURA: [], NATUREZA: [], RESTAURANT: [], SHOPPING: [] };
        
        rawCombinedData.forEach(item => {
            if (categoriesMap[item.category] && categoriesMap[item.category].length < 50) {
                // Previne duplicados sutis checando IDs
                if (!categoriesMap[item.category].some(x => x.id === item.id)) {
                    categoriesMap[item.category].push(item);
                }
            }
        });

        const finalData = [
            ...categoriesMap.CULTURA,
            ...categoriesMap.NATUREZA,
            ...categoriesMap.RESTAURANT,
            ...categoriesMap.SHOPPING
        ].sort(() => Math.random() - 0.5);

        console.log(`[API STITCHING] Detalhes do retorno balanceado:
        - Travel Places Base: ${travelCount} locais
        - Geoapify Base: ${geoapifyCount} locais
        - Entregue CULTURA: ${categoriesMap.CULTURA.length}/50
        - Entregue NATUREZA: ${categoriesMap.NATUREZA.length}/50
        - Entregue RESTAURANT: ${categoriesMap.RESTAURANT.length}/50
        - Entregue SHOPPING: ${categoriesMap.SHOPPING.length}/50
        - Total final entregue cruzado: ${finalData.length} locais`);
        
        res.json({ data: finalData });

    } catch (error) {
        console.error('Erro na agregação de POIs:', error.message);
        res.status(500).json({ message: 'Erro interno ao procurar atrações.' });
    }
});

module.exports = router;