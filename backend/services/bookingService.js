const axios = require('axios');

const getHeaders = () => ({
    'x-rapidapi-host': 'booking-com.p.rapidapi.com',
    'x-rapidapi-key': process.env.RAPIDAPI_KEY
});

const searchHotelsByLocation = async (location, stars, checkinDateStr, checkoutDateStr) => {
    const locResponse = await axios.get('https://booking-com.p.rapidapi.com/v1/hotels/locations', {
        params: { name: location, locale: 'pt-br' },
        headers: getHeaders()
    });

    if (!locResponse.data || locResponse.data.length === 0) {
        return null;
    }

    const destId = locResponse.data[0].dest_id;
    const destType = locResponse.data[0].dest_type;

    const hotelsRes = await axios.get('https://booking-com.p.rapidapi.com/v1/hotels/search', {
        params: {
            locale: 'pt-br',
            dest_id: destId,
            dest_type: destType,
            checkin_date: checkinDateStr,
            checkout_date: checkoutDateStr,
            adults_number: 2,
            room_number: 1,
            filter_by_currency: 'EUR',
            order_by: 'popularity',
            units: 'metric',
            categories_filter_ids: `class::${stars}`
        },
        headers: getHeaders()
    });

    return hotelsRes.data.result.slice(0, 10).map(hotel => ({
        hotelId: hotel.hotel_id,
        name: hotel.hotel_name,
        price: hotel.min_total_price, 
        currency: hotel.currencycode || 'EUR',
        rating: parseInt(stars) || 3,
        photoUrl: hotel.max_photo_url || hotel.main_photo_url,
        roomType: hotel.accommodation_type_name || 'Quarto Standard', 
        reviewCount: hotel.review_nr || 0,
        distance: hotel.distance_to_cc ? parseFloat(hotel.distance_to_cc).toFixed(1) : '0'
    }));
};

const getHotelDetailsExhaustive = async (hotelId, checkinDateStr, checkoutDateStr) => {
    const [descRes, photosRes, roomsRes] = await Promise.all([
        axios.get('https://booking-com.p.rapidapi.com/v1/hotels/description', {
            params: { hotel_id: hotelId, locale: 'pt-br' },
            headers: getHeaders()
        }),
        axios.get('https://booking-com.p.rapidapi.com/v1/hotels/photos', {
            params: { hotel_id: hotelId, locale: 'pt-br' },
            headers: getHeaders()
        }),
        axios.get('https://booking-com.p.rapidapi.com/v1/hotels/room-list', {
            params: { 
                hotel_id: hotelId, 
                checkin_date: checkinDateStr, 
                checkout_date: checkoutDateStr,
                adults_number_by_rooms: '2',
                units: 'metric',
                currency: 'EUR',
                locale: 'pt-br'
            },
            headers: getHeaders()
        })
    ]);

    return {
        fullDescription: descRes.data.description || 'Descrição completa disponível no site.',
        photos: photosRes.data.map(p => p.url_max || p.url_original).slice(0, 8),
        realRoomName: roomsRes.data[0]?.block?.[0]?.room_name || 'Quarto Selecionado'
    };
};

module.exports = {
    searchHotelsByLocation,
    getHotelDetailsExhaustive
};
