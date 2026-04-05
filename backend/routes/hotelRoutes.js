const express = require('express');
const router = express.Router();
const Amadeus = require('amadeus');

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

// Rota: GET /api/hotels/:cityCode
router.get('/:cityCode', async (req, res) => {
  try {
    const { cityCode } = req.params;

    // PASSO 1: Buscar hotéis disponíveis na cidade
    const hotelsSearch = await amadeus.referenceData.locations.hotels.byCity.get({
      cityCode: cityCode
    });

    // Primeiros 10 IDs de hotéis para não sobrecarregar a próxima chamada
    const hotelIds = hotelsSearch.data
      .slice(0, 10)
      .map(hotel => hotel.hotelId)
      .join(',');

    if (!hotelIds) {
      return res.status(404).json({ message: 'Nenhum hotel encontrado nesta cidade.' });
    }

    // PASSO 2: Buscar ofertas de preços para esses hotéis específicos
    // Nota: O Amadeus v3 exige checkInDate. Data simulada para o orçamento.
    const hotelOffers = await amadeus.shopping.hotelOffersSearch.get({
      hotelIds: hotelIds,
      adults: '1',
      checkInDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Daqui a 7 dias
      roomQuantity: '1',
      paymentPolicy: 'NONE',
      bestRateOnly: 'true'
    });

    // FORMATAR OS DADOS: Unindo nome, preço e detalhes
    const formattedHotels = hotelOffers.data.map(offer => {
      return {
        hotelId: offer.hotel.hotelId,
        name: offer.hotel.name,
        latitude: offer.hotel.latitude,
        longitude: offer.hotel.longitude,
        price: offer.offers[0].price.total,
        currency: offer.offers[0].price.currency,
        // O Amadeus Test muitas vezes não envia fotos reais. 
        // Placeholder de alta qualidade baseado no nome do hotel.
        photoUrl: `https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=500` 
      };
    });

    res.json(formattedHotels);

  } catch (error) {
    console.error('Erro Amadeus Hotels:', error.code === 'ECONNRESET' ? 'Timeout' : error.message);
    res.status(500).json({ message: 'Erro ao buscar ofertas de hotéis.' });
  }
});

module.exports = router;