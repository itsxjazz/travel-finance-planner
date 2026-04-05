const express = require('express');
const router = express.Router();
const Amadeus = require('amadeus');

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

function cleanHotelDescription(text) {
  if (!text || text.length < 5) {
    return 'Acomodação premium com excelente localização e serviços exclusivos.';
  }

  // 1. Corrige vírgulas sem espaço (ex: "BED,NSMK,STND" -> "BED, NSMK, STND")
  let cleaned = text.replace(/,([^\s])/g, ', $1');

  // 2. Remove espaços duplos
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 3. Converte tudo para minúsculo e capitaliza apenas a 1ª letra de cada frase
  cleaned = cleaned.toLowerCase().replace(/(^\w|[\.\?!]\s*\w)/g, (match) => {
    return match.toUpperCase();
  });

  // 4. Substitui siglas legadas do Amadeus por termos legíveis
  cleaned = cleaned
    .replace(/\bnsmk\b/gi, 'não fumante')
    .replace(/\bstnd\b/gi, 'padrão')
    .replace(/\baircon\b/gi, 'ar condicionado')
    .replace(/\bdble\b/gi, 'casal')
    .replace(/\bgovt military rate\b/gi, 'tarifa especial')
    .replace(/\bpromotion rate\b/gi, 'tarifa promocional');

  return cleaned;
}

router.get('/:cityCode', async (req, res) => {
  try {
    const { cityCode } = req.params;

    const hotelsSearch = await amadeus.referenceData.locations.hotels.byCity.get({ cityCode });
    const hotelIds = hotelsSearch.data.slice(0, 10).map(h => h.hotelId).join(',');

    if (!hotelIds) return res.status(404).json({ message: 'Nenhum hotel encontrado.' });

    const unsplashUrl = `https://api.unsplash.com/search/photos?query=hotel%20${cityCode}&orientation=landscape&per_page=10&client_id=${process.env.UNSPLASH_ACCESS_KEY}`;

    const [hotelOffers, hotelRatings, unsplashResponse] = await Promise.all([
      amadeus.shopping.hotelOffersSearch.get({
        hotelIds: hotelIds,
        adults: '1',
        checkInDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        roomQuantity: '1',
        bestRateOnly: 'true'
      }),
      amadeus.eReputation.hotelSentiments.get({ hotelIds }).catch(() => ({ data: [] })),
      fetch(unsplashUrl).then(res => res.json()).catch(() => ({ results: [] }))
    ]);

    const ratingsMap = new Map((hotelRatings.data || []).map(r => [r.hotelId, r]));
    const unsplashPhotos = unsplashResponse.results || [];

    const formattedHotels = hotelOffers.data
      .filter(offer => offer.offers && offer.offers.length > 0)
      .map((offer, index) => {
        const firstOffer = offer.offers[0];
        const ratingData = ratingsMap.get(offer.hotel.hotelId);
        const starRating = ratingData ? Math.round(ratingData.overallRating / 20) : 3;
        
        const photoUrl = unsplashPhotos[index]?.urls?.regular || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80';

        const rawDescription = firstOffer.room.description?.text || '';

        return {
          hotelId: offer.hotel.hotelId,
          name: offer.hotel.name,
          price: firstOffer.price.total,
          currency: firstOffer.price.currency,
          rating: starRating,
          reviewCount: ratingData?.numberOfReviews || 0,
          roomType: firstOffer.room.typeEstimated?.category?.replace(/_/g, ' ') || 'Tipo de quarto não especificado',
          beds: firstOffer.room.typeEstimated?.beds || 1,
          bedType: firstOffer.room.typeEstimated?.bedType || 'Tipo de cama não especificado',
          cancellation: firstOffer.policies?.cancellation?.type === 'FULL_STAY' ? 'Não Reembolsável' : 'Cancelamento Grátis',
          
          fullDescription: cleanHotelDescription(rawDescription),
          
          photoUrl: photoUrl 
        };
      });

    res.json(formattedHotels);
  } catch (error) {
    if (error.response && error.response.statusCode === 400) {
      return res.status(404).json({ message: 'Destino não suportado no ambiente de testes da Amadeus.' });
    }
    console.error('Erro na rota de hotéis:', error.message);
    res.status(500).json({ message: 'Erro interno ao buscar ofertas de hotéis.' });
  }
});

module.exports = router;