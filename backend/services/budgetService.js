const { searchHotelsByLocation } = require('./bookingService');
const { searchFlightsKiwi } = require('./kiwiService');

// Serviço de inteligência para cálculo de orçamento utilizando Kiwi (Voos) e Booking (Hotéis).

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

    // --- LÓGICA DE VOO VIA KIWI ---
    let flightBase = (1200 * parsedAdults); // Fallback padrão
    try {
        const flights = await searchFlightsKiwi(departureAirport, iataCode, targetDate, flightClass);
        
        if (flights && flights.length > 0) {
            // A Kiwi retorna o valor por pessoa, então multiplicamos pelos adultos
            const pricePerPerson = flights[0].price;
            flightBase = pricePerPerson * parsedAdults;

        }
    } catch (err) {
        console.error('[DEBUG-KIWI] Falha na API Kiwi:', err.message);
    }

    // --- LÓGICA DE HOTEL VIA BOOKING.COM ---
    let dailyHotelBase = hotelStars * 45; 
    
    try {
        const checkout = new Date(targetDate);
        checkout.setDate(checkout.getDate() + parseInt(days));
        const checkoutStr = checkout.toISOString().split('T')[0];

        const realHotels = await searchHotelsByLocation(cityName, hotelStars, targetDate, checkoutStr, parsedAdults);
        
        if (realHotels && realHotels.length > 0) {

            // Pega o preço total do primeiro hotel encontrado e divide pelos dias para ter a média da diária
            const totalPrice = realHotels[0].price;
            dailyHotelBase = totalPrice / days;
        }
    } catch (err) {
        console.error('Aviso Booking (Orçamento): Usando fallback fixo.', err.message);
    }

    // Gasto diário (alimentação etc) proporcional à diária
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
    calculateBudgetBreakdown
};
