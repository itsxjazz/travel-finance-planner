const Amadeus = require('amadeus');
const { searchHotelsByLocation } = require('./bookingService');

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

const searchFlightsDetailed = async (origin, destination, departureDate, cabinClass = 'ECONOMY') => {
    const api = initAmadeus();
    if (!api) return [];

    try {
        const response = await api.shopping.flightOffersSearch.get({
            originLocationCode: origin,
            destinationLocationCode: destination,
            departureDate: departureDate,
            adults: '1',
            travelClass: cabinClass,
            max: 15
        });

        return response.data.map(offer => ({
            id: offer.id,
            airlineCode: offer.validatingAirlineCodes[0],
            airlineName: offer.validatingAirlineCodes[0],
            stops: offer.itineraries[0].segments.length - 1,
            departure: {
                at: offer.itineraries[0].segments[0].departure.at,
                iataCode: offer.itineraries[0].segments[0].departure.iataCode
            },
            arrival: {
                at: offer.itineraries[0].segments[offer.itineraries[0].segments.length - 1].arrival.at,
                iataCode: offer.itineraries[0].segments[offer.itineraries[0].segments.length - 1].arrival.iataCode
            },
            duration: offer.itineraries[0].duration,
            price: parseFloat(offer.price.total),
            currency: offer.price.currency
        }));
    } catch (err) {
        console.error('Erro na busca detalhada Amadeus:', err.message);
        return [];
    }
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
            const errorDetail = err.response?.data?.errors?.[0]?.detail || err.message || 'Erro desconhecido';
            console.error('Aviso Amadeus (Voo):', errorDetail);
            return { data: [] };
        });

        const fetchHotels = api.referenceData.locations.hotels.byCity.get({
            cityCode: iataCode,
            ratings: hotelStars.toString()
        }).catch(() => ({ data: [] }));

        [flightResponse, hotelResponse] = await Promise.all([fetchFlight, fetchHotels]);
    }

    let flightBase = flightResponse.data.length > 0
        ? parseFloat(flightResponse.data[0].price.total)
        : (1200 * parsedAdults);

    // --- NOVA LÓGICA DE HOTEL REAL (BOOKING.COM) ---
    // Diária base estimada (fallback se o Booking falhar ou não encontrar resultados)
    let dailyHotelBase = hotelStars * 45; 
    
    try {
        const checkout = new Date(targetDate);
        checkout.setDate(checkout.getDate() + parseInt(days));
        const checkoutStr = checkout.toISOString().split('T')[0];

        // Busca hotéis reais para o número de adultos e padrão de estrelas
        console.log(`[DEBUG-AMADEUS] Solicitando preco real ao Booking: Destino=${cityName}, Estrelas=${hotelStars}, Adultos=${parsedAdults}`);
        const realHotels = await searchHotelsByLocation(cityName, hotelStars, targetDate, checkoutStr, parsedAdults);
        
        if (realHotels && realHotels.length > 0) {
            console.log(`[DEBUG-AMADEUS] Booking retornou preco real: ${realHotels[0].price} ${realHotels[0].currency}`);
            // Pega o preço total do primeiro hotel encontrado e divide pelos dias para ter a média da diária
            const totalPrice = realHotels[0].price;
            dailyHotelBase = totalPrice / days;
        } else {
            console.log('[DEBUG-AMADEUS] Booking nao retornou resultados. Usando fallback de stars * 45.');
        }
    } catch (err) {
        console.error('Aviso Booking (Orçamento): Usando fallback fixo.', err.message);
    }

    // Gasto diário (alimentação etc) continua sendo proporcional ao padrão do hotel selecionado
    let dailyFoodBase = (dailyHotelBase * 0.60); 

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
    calculateBudgetBreakdown,
    searchFlightsDetailed
};
