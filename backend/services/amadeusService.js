const Amadeus = require('amadeus');

// Inicializado apenas se configurado para evitar crash no boot, mas será usado no calculateBudget
let amadeus;

const initAmadeus = () => {
    if (!amadeus && process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET) {
        amadeus = new Amadeus({
            clientId: process.env.AMADEUS_CLIENT_ID,
            clientSecret: process.env.AMADEUS_CLIENT_SECRET
        });
    }
    return amadeus;
};

const getDefaultFlightsAndHotels = async (iataCode, targetDate, numAdults, hotelStars, flightClass) => {
    const api = initAmadeus();
    if (!api) {
        // Fallback total se API não configurada
        return { flightResponse: { data: [] }, hotelResponse: { data: [] } };
    }

    const fetchFlight = api.shopping.flightOffersSearch.get({
        originLocationCode: 'GRU', // Mantendo a lógica fixa do fallback que estava no base
        destinationLocationCode: iataCode,
        departureDate: targetDate,
        adults: numAdults,
        travelClass: flightClass,
        max: 1
    }).catch((err) => {
        console.error('Aviso Amadeus (Voo):', err.message);
        return { data: [] };
    });

    const fetchHotels = api.referenceData.locations.hotels.byCity.get({
        cityCode: iataCode,
        ratings: hotelStars.toString()
    }).catch(() => ({ data: [] }));

    const [flightResponse, hotelResponse] = await Promise.all([fetchFlight, fetchHotels]);
    
    return { flightResponse, hotelResponse };
};

const calculateBudgetBreakdown = async (params) => {
    const { cityName, days, flightClass, hotelStars, originCode, departureDate, adults } = params;

    const departureAirport = (originCode || 'GRU').toUpperCase();
    const targetDate = departureDate || '2026-10-15';
    const numAdults = adults ? adults.toString() : '1';
    const parsedAdults = parseInt(numAdults);

    const bffDictionary = {
        // Américas
        'Brasil': 'GRU', 'Estados Unidos': 'NYC', 'Canadá': 'YTO', 'México': 'MEX',
        'Argentina': 'EZE', 'Chile': 'SCL', 'Colômbia': 'BOG', 'Peru': 'LIM', 'Uruguai': 'MVD',

        // Europa
        'França': 'PAR', 'Reino Unido': 'LON', 'Portugal': 'LIS', 'Espanha': 'MAD',
        'Itália': 'ROM', 'Alemanha': 'BER', 'Países Baixos': 'AMS', 'Holanda': 'AMS',
        'Suíça': 'ZRH', 'Bélgica': 'BRU', 'Áustria': 'VIE',

        // Ásia e Oceania
        'Japão': 'TYO', 'Coreia do Sul': 'SEL', 'Singapura': 'SIN', 'Tailândia': 'BKK',
        'Emirados Árabes Unidos': 'DXB', 'Austrália': 'SYD', 'Nova Zelândia': 'AKL',

        // África
        'Egito': 'CAI'
    };

    let iataCode = bffDictionary[cityName] || 'LHR';

    // Para evitar mudar a lógica real do Amadeus na rota original, 
    // replicamos 100% da chamada original aqui com origin alterado localmente.
    const api = initAmadeus();
    
    let flightResponse = { data: [] };
    let hotelResponse = { data: [] };
    
    if (api) {
        const fetchFlight = api.shopping.flightOffersSearch.get({
            originLocationCode: departureAirport,
            destinationLocationCode: iataCode,
            departureDate: targetDate,
            adults: numAdults,
            travelClass: flightClass,
            max: 1
        }).catch((err) => {
            console.error('Aviso Amadeus (Voo):', err.message);
            return { data: [] };
        });

        const fetchHotels = api.referenceData.locations.hotels.byCity.get({
            cityCode: iataCode,
            ratings: hotelStars.toString()
        }).catch(() => ({ data: [] }));

        [flightResponse, hotelResponse] = await Promise.all([fetchFlight, fetchHotels]);
    }

    if (flightResponse.data && flightResponse.data.length > 0) {
        console.log(`SUCESSO AMADEUS: Voo encontrado por $${flightResponse.data[0].price.total} USD (Total para ${parsedAdults} adultos).`);
    } else {
        console.log(`FALLBACK ATIVADO: Voo não encontrado no cache da Amadeus. Usando estimativa de $${1200 * parsedAdults} USD.`);
    }

    let flightBase = flightResponse.data.length > 0
        ? parseFloat(flightResponse.data[0].price.total)
        : (1200 * parsedAdults);

    let dailyHotelBase = hotelStars * 45;
    let dailyFoodBase = (dailyHotelBase * 0.60) * parsedAdults;

    return {
        flightBase,
        dailyHotelBase,
        dailyFoodBase,
        days,
        targetDate,
        parsedAdults
    };
};

module.exports = {
    calculateBudgetBreakdown
};
