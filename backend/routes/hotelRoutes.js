const express = require('express');
const router = express.Router();
const Amadeus = require('amadeus');

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

router.get('/:cityCode', async (req, res) => {
  try {
    const { cityCode } = req.params;

    // 1. Busca hotéis na cidade
    const hotelsSearch = await amadeus.referenceData.locations.hotels.byCity.get({ cityCode });
    const hotelIds = hotelsSearch.data.slice(0, 10).map(h => h.hotelId).join(',');

    if (!hotelIds) return res.status(404).json({ message: 'Nenhum hotel encontrado.' });

    // 2. Busca ofertas e sentimentos em paralelo para performance
    const [hotelOffers, hotelRatings] = await Promise.all([
      amadeus.shopping.hotelOffersSearch.get({
        hotelIds: hotelIds,
        adults: '1',
        checkInDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        roomQuantity: '1',
        bestRateOnly: 'true'
      }),
      // API de Reputação/Sentimentos 
      amadeus.eReputation.hotelSentiments.get({ hotelIds })
    ]);

    // Criar um mapa de ratings para busca rápida por hotelId 
    const ratingsMap = new Map(hotelRatings.data.map(r => [r.hotelId, r]));

    const formattedHotels = hotelOffers.data
      .filter(offer => offer.offers && offer.offers.length > 0)
      .map(offer => {
        const firstOffer = offer.offers[0];
        const ratingData = ratingsMap.get(offer.hotel.hotelId);
        
        // Converte score 0-100 para escala de 5 estrelas 
        const starRating = ratingData ? Math.round(ratingData.overallRating / 20) : 3;

        return {
          hotelId: offer.hotel.hotelId,
          name: offer.hotel.name,
          price: firstOffer.price.total,
          currency: firstOffer.price.currency,
          // Novas Informações Detalhadas 
          rating: starRating,
          reviewCount: ratingData?.numberOfReviews || 0,
          roomType: firstOffer.room.typeEstimated?.category?.replace(/_/g, ' ') || 'Standard',
          beds: firstOffer.room.typeEstimated?.beds || 1,
          bedType: firstOffer.room.typeEstimated?.bedType || 'Double',
          cancellation: firstOffer.policies?.cancellation?.type === 'FULL_STAY' ? 'Não Reembolsável' : 'Cancelamento Grátis',
          fullDescription: firstOffer.room.description?.text || 'Acomodação premium com excelente localização.'
        };
      });

    res.json(formattedHotels);
  } catch (error) {
    console.error('Erro Amadeus:', error.message);
    res.status(500).json({ message: 'Erro ao buscar hotéis.' });
  }
});

module.exports = router;