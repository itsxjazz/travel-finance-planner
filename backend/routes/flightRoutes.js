const express = require('express');
const router = express.Router();
const Amadeus = require('amadeus');

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

// Rota de busca de voos: /api/flights/search
router.get('/search', async (req, res) => {
  try {
    // Recebe origem, destino e data pela URL (query params)
    const { origin, destination, date } = req.query;

    if (!origin || !destination || !date) {
      return res.status(400).json({ message: 'Origem, destino e data são obrigatórios.' });
    }

    // 1. Busca as ofertas de voos
    const flightOffers = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate: date,
      adults: '1',
      max: 10 // Apenas os 10 primeiros voos para não sobrecarregar o app
    });

    if (!flightOffers.data || flightOffers.data.length === 0) {
      return res.status(404).json({ message: 'Nenhum voo encontrado para esta rota.' });
    }

    // 2. Extrai os códigos das companhias aéreas (ex: "LA", "BA", "AF")
    const airlineCodes = new Set();
    flightOffers.data.forEach(offer => {
      offer.validatingAirlineCodes.forEach(code => airlineCodes.add(code));
    });

    // 3. Busca o nome real das companhias aéreas usando a API de Referência
    let airlineDictionary = {};
    if (airlineCodes.size > 0) {
      const airlinesString = Array.from(airlineCodes).join(',');
      try {
        const airlinesData = await amadeus.referenceData.airlines.get({
          airlineCodes: airlinesString
        });
        
        // Mapeia o código IATA para o Nome Comercial
        airlinesData.data.forEach(airline => {
          airlineDictionary[airline.iataCode] = airline.businessName || airline.commonName || airline.iataCode;
        });
      } catch (err) {
        console.warn('Não foi possível buscar nomes das companhias. Usando códigos IATA.');
      }
    }

    // 4. Formata os dados para o Angular receber um JSON limpo
    const formattedFlights = flightOffers.data.map(offer => {
      // Pega o primeiro itinerário
      const itinerary = offer.itineraries[0];
      
      // Pega o primeiro segmento (origem) e o último segmento (destino final)
      const firstSegment = itinerary.segments[0];
      const lastSegment = itinerary.segments[itinerary.segments.length - 1];
      
      const carrierCode = offer.validatingAirlineCodes[0];

      return {
        id: offer.id,
        airlineCode: carrierCode,
        airlineName: airlineDictionary[carrierCode] || carrierCode,
        price: offer.price.total,
        currency: offer.price.currency,
        departure: {
          iataCode: firstSegment.departure.iataCode,
          at: firstSegment.departure.at
        },
        arrival: {
          iataCode: lastSegment.arrival.iataCode,
          at: lastSegment.arrival.at
        },
        duration: itinerary.duration, // Ex: "PT8H40M" (trataremos no front depois)
        stops: itinerary.segments.length - 1 // Se tem 2 segmentos, tem 1 parada (escala)
      };
    });

    res.json(formattedFlights);

  } catch (error) {
    console.error('Erro na rota de voos:', error.response?.data || error.message);
    res.status(500).json({ message: 'Erro interno ao buscar ofertas de voos.' });
  }
});

module.exports = router;