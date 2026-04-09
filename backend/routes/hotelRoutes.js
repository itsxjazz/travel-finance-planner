const express = require('express');
const router = express.Router();
const axios = require('axios');

const HEADERS = {
    'x-rapidapi-host': 'booking-com.p.rapidapi.com',
    'x-rapidapi-key': process.env.RAPIDAPI_KEY
};


router.get('/:location', async (req, res) => {
    try {
        const { location } = req.params;
        const stars = req.query.stars || '3';

        const locResponse = await axios.get('https://booking-com.p.rapidapi.com/v1/hotels/locations', {
            params: { name: location, locale: 'pt-br' },
            headers: HEADERS
        });

        if (!locResponse.data || locResponse.data.length === 0) {
            return res.status(404).json({ message: 'Destino não encontrado.' });
        }

        const destId = locResponse.data[0].dest_id;
        const destType = locResponse.data[0].dest_type;

        const checkin = new Date(); checkin.setDate(checkin.getDate() + 14);
        const checkout = new Date(checkin); checkout.setDate(checkout.getDate() + 1);

        const hotelsRes = await axios.get('https://booking-com.p.rapidapi.com/v1/hotels/search', {
            params: {
                locale: 'pt-br',
                dest_id: destId,
                dest_type: destType,
                checkin_date: checkin.toISOString().split('T')[0],
                checkout_date: checkout.toISOString().split('T')[0],
                adults_number: 2,
                room_number: 1,
                filter_by_currency: 'BRL',
                order_by: 'popularity',
                units: 'metric',
                categories_filter_ids: `class::${stars}`
            },
            headers: HEADERS
        });

        if (!hotelsRes.data.result || hotelsRes.data.result.length === 0) {
             return res.status(404).json({ message: `Sem hotéis disponíveis.` });
        }

        const formattedHotels = hotelsRes.data.result.slice(0, 6).map(hotel => {
            
            const camaInfo = hotel.unit_configuration_label || '1 Cama de Casal';
            
            const nomeQuarto = hotel.default_language_room_name || hotel.accommodation_type_name || 'Quarto Standard';

            return {
                hotelId: hotel.hotel_id,
                name: hotel.hotel_name,
                price: hotel.min_total_price, 
                currency: hotel.currencycode || 'BRL',
                rating: parseInt(stars) || 3,
                
                cancellation: hotel.is_free_cancellable === 1 ? 'Cancelamento Grátis' : 'Verifique Políticas',
                
                photoUrl: hotel.max_photo_url || hotel.main_photo_url,
                roomType: nomeQuarto,
                reviewCount: hotel.review_nr || 0,
                distance: hotel.distance_to_cc ? parseFloat(hotel.distance_to_cc).toFixed(1) : 'alguns',
                
                beds: 1, 
                bedType: camaInfo.replace(/[0-9]/g, '').trim()
            };
        });

        res.json(formattedHotels);

    } catch (error) {
        console.error('Erro na Busca:', error.message);
        res.status(500).json({ message: 'Erro ao buscar hotéis.' });
    }
});


router.get('/details/:hotelId', async (req, res) => {
    try {
        const { hotelId } = req.params;

        const checkin = new Date(); checkin.setDate(checkin.getDate() + 14);
        const checkout = new Date(checkin); checkout.setDate(checkout.getDate() + 1);
        const checkinStr = checkin.toISOString().split('T')[0];
        const checkoutStr = checkout.toISOString().split('T')[0];

        const [descRes, photosRes, roomsRes] = await Promise.all([
            axios.get('https://booking-com.p.rapidapi.com/v1/hotels/description', {
                params: { hotel_id: hotelId, locale: 'pt-br' },
                headers: HEADERS
            }),
            axios.get('https://booking-com.p.rapidapi.com/v1/hotels/photos', {
                params: { hotel_id: hotelId, locale: 'pt-br' },
                headers: HEADERS
            }),
            axios.get('https://booking-com.p.rapidapi.com/v1/hotels/room-list', {
                params: { 
                    hotel_id: hotelId, 
                    checkin_date: checkinStr, 
                    checkout_date: checkoutStr,
                    adults_number_by_rooms: '2',
                    units: 'metric',
                    locale: 'pt-br',
                    currency: 'BRL'
                },
                headers: HEADERS
            })
        ]);

        const firstRoom = roomsRes.data[0] || {};
        
        const realBeds = firstRoom.rooms?.[Object.keys(firstRoom.rooms)[0]]?.bed_configurations?.[0]?.buttons?.[0]?.name 
                         || 'Configuração Standard';

        res.json({
            fullDescription: descRes.data.description || 'Descrição completa no site.',
            photos: photosRes.data.map(p => p.url_max).slice(0, 10),
            realRoomName: firstRoom.block?.[0]?.room_name || 'Quarto Selecionado',
            realBedType: realBeds,
            facilities: firstRoom.facilities?.slice(0, 6).map(f => f.name) || []
        });

    } catch (error) {
        console.error('Erro no Enriquecimento:', error.message);
        res.status(500).json({ message: 'Erro ao buscar detalhes reais do quarto.' });
    }
});

module.exports = router;