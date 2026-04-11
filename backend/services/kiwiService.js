const axios = require('axios');

const searchFlightsKiwi = async (origin, destination, departureDate) => {
    const RAPIDAPI_HOST = 'kiwi-com-cheap-flights.p.rapidapi.com';
    const url = `https://${RAPIDAPI_HOST}/one-way`;

    const params = {
        source: origin,
        destination: destination,
        outboundDepartmentDateStart: `${departureDate}T00:00:00`,
        outboundDepartmentDateEnd: `${departureDate}T00:00:00`,
        limit: 10,
        sortBy: 'PRICE',
        cabinClass: 'ECONOMY'
    };

    const response = await axios.get(url, {
        params,
        headers: {
            'x-rapidapi-host': RAPIDAPI_HOST,
            'x-rapidapi-key': process.env.RAPIDAPI_KEY
        },
        timeout: 10000 
    });

    const itineraries = response.data.itineraries || response.data.data?.itineraries || [];

    const mappedFlights = itineraries.map(itinerary => {
        const sectors = itinerary.sector?.sectorSegments || [];
        const firstSegment = sectors[0]?.segment || {};
        const lastSegment = sectors[sectors.length - 1]?.segment || {};

        const airlineCode = firstSegment.carrier?.code || '';
        const airlineName = firstSegment.carrier?.name || 'Companhia Desconhecida';
        const price = parseFloat(itinerary.price?.amount || 0);

        const departureAt = firstSegment.source?.localTime || '';
        const departureIataCode = firstSegment.source?.station?.code || '';

        const arrivalAt = lastSegment.destination?.localTime || '';
        const arrivalIataCode = lastSegment.destination?.station?.code || '';

        const durationRaw = itinerary.sector?.duration || 0;
        const durationHours = Math.floor(durationRaw / 3600);
        const durationMinutes = Math.floor((durationRaw % 3600) / 60);
        const durationStr = `PT${durationHours}H${durationMinutes}M`;

        const stops = Math.max(0, sectors.length - 1);

        return {
            id: itinerary.id || itinerary.legacyId || Math.random().toString(36).substring(7),
            airlineCode,
            airlineName,
            stops,
            departure: {
                at: departureAt,
                iataCode: departureIataCode
            },
            duration: durationStr,
            arrival: {
                at: arrivalAt,
                iataCode: arrivalIataCode
            },
            price,
            currency: itinerary.currency || itinerary.price?.currency || response.data.currency || 'EUR'
        };
    });

    mappedFlights.sort((a, b) => a.price - b.price);

    return mappedFlights;
};

module.exports = {
    searchFlightsKiwi
};
