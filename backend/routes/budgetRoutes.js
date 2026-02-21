const express = require('express');
const router = express.Router();
const Amadeus = require('amadeus');

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

router.post('/calculate', async (req, res) => {
  try {
    // 1. Recebe todas as propriedades enviadas pelo Angular
    const { cityName, days, flightClass, hotelStars, originCode, departureDate, adults } = req.body;
    
    // 2. Fallbacks de segurança para garantir que a API nunca quebre
    const departureAirport = (originCode || 'GRU').toUpperCase();
    const targetDate = departureDate || '2026-10-15';
    const numAdults = adults ? adults.toString() : '1'; // A Amadeus exige que seja string
    const parsedAdults = parseInt(numAdults);

    // Dicionário BFF para IATA
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

    // 3. Busca Dinâmica na Amadeus
    const fetchFlight = amadeus.shopping.flightOffersSearch.get({
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

    const fetchHotels = amadeus.referenceData.locations.hotels.byCity.get({
        cityCode: iataCode,
        ratings: hotelStars.toString() 
    }).catch(() => ({ data: [] }));

    const [flightResponse, hotelResponse] = await Promise.all([fetchFlight, fetchHotels]);

    // --- DEBUG PARA O TERMINAL DO NODE.JS ---
    if (flightResponse.data && flightResponse.data.length > 0) {
        console.log(`SUCESSO AMADEUS: Voo encontrado por $${flightResponse.data[0].price.total} USD (Total para ${parsedAdults} adultos).`);
    } else {
        console.log(`FALLBACK ATIVADO: Voo não encontrado no cache da Amadeus. Usando estimativa de $${1200 * parsedAdults} USD.`);
    }
    // ----------------------------------------
    
    // Voo: A API já retorna o valor total para X adultos. 
    // Se falhar e usarmos o fallback, multiplicamos os $1200 pelo número de adultos.
    let flightBase = flightResponse.data.length > 0 
        ? parseFloat(flightResponse.data[0].price.total) 
        : (1200 * parsedAdults); 
        
    // Hotel: Calcula por quarto, então o número de adultos não multiplica o valor da diária diretamente
    let dailyHotelBase = hotelStars * 45; 
    
    // Alimentação/Transporte: Esse gasto é individual. Multiplicamos pelos adultos.
    let dailyFoodBase = (dailyHotelBase * 0.60) * parsedAdults;

    // 5. Devolve o pacote pronto para o Frontend
    res.json({
        success: true,
        breakdown: {
            flight: flightBase,
            hotel: dailyHotelBase * days,
            dailyExpenses: dailyFoodBase * days
        },
        message: `Orçamento base gerado para ${parsedAdults} adulto(s) na data ${targetDate}.`
    });

  } catch (error) {
    console.error('Erro Crítico no Servidor:', error);
    res.status(500).json({ error: 'Erro no servidor ao processar o orçamento' });
  }
});

module.exports = router;