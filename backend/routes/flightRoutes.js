const express = require('express');
const router = express.Router();
const Amadeus = require('amadeus');

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET
});
 
function formatAirlineName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase()) // Capitaliza 1ª letra de cada palavra
    .replace(/\bvoo\b/gi, '') 
    .trim();
}

router.get('/search', async (req, res) => {
  try {
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
      max: 10 
    });

    if (!flightOffers.data || flightOffers.data.length === 0) {
      return res.status(404).json({ message: 'Nenhum voo encontrado.' });
    }

    // 2. Extrai códigos IATA para buscar nomes reais
    const airlineCodes = new Set();
    flightOffers.data.forEach(offer => {
      offer.validatingAirlineCodes.forEach(code => airlineCodes.add(code));
    });

    // 3. Busca nomes das companhias
    let airlineDictionary = {};
    if (airlineCodes.size > 0) {
      try {
        const airlinesData = await amadeus.referenceData.airlines.get({
          airlineCodes: Array.from(airlineCodes).join(',')
        });
        airlinesData.data.forEach(airline => {
          airlineDictionary[airline.iataCode] = airline.businessName || airline.commonName;
        });
      } catch (err) {
        console.warn('Falha ao traduzir nomes de companhias.');
      }
    }

    // 4. Formatação (Padronizada)
    const formattedFlights = flightOffers.data.map(offer => {
      const itinerary = offer.itineraries[0];
      const firstSegment = itinerary.segments[0];
      const lastSegment = itinerary.segments[itinerary.segments.length - 1];
      const carrierCode = offer.validatingAirlineCodes[0];

      return {
        id: offer.id,
        airlineCode: carrierCode,
        // Nome padronizado (Ex: "AIR EUROPA" -> "Air Europa")
        airlineName: formatAirlineName(airlineDictionary[carrierCode] || carrierCode),
        // Preço com 2 casas decimais garantidas
        price: parseFloat(offer.price.total).toFixed(2),
        currency: offer.price.currency,
        departure: {
          iataCode: firstSegment.departure.iataCode,
          at: firstSegment.departure.at
        },
        arrival: {
          iataCode: lastSegment.arrival.iataCode,
          at: lastSegment.arrival.at
        },
        duration: itinerary.duration,
        stops: itinerary.segments.length - 1
      };
    });

    res.json(formattedFlights);

  } catch (error) {
    console.error('Erro na rota de voos:', error.message);
    res.status(500).json({ message: 'Erro interno ao buscar voos.' });
  }
});

module.exports = router;