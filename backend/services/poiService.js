const axios = require('axios');

const getCombinedPois = async (lat, lng) => {
    const latFloat = parseFloat(lat);
    const lngFloat = parseFloat(lng);

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

    const responses = await Promise.allSettled([
        requestTravelPlaces, requestGeoFood, requestGeoShop, requestGeoCulture
    ]);

    let rawCombinedData = [];
    let travelCount = 0;
    let geoapifyCount = 0;

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

    const categoriesMap = { CULTURA: [], NATUREZA: [], RESTAURANT: [], SHOPPING: [] };
    
    rawCombinedData.forEach(item => {
        if (categoriesMap[item.category] && categoriesMap[item.category].length < 50) {
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
    - Total final entregue cruzado: ${finalData.length} locais`);

    return finalData;
};

module.exports = {
    getCombinedPois
};
