const axios = require('axios');
const HttpError = require('../models/http-error');

//const ACCESS_TOKEN = 'pk.f9af2250f453adff66b3b1567278ce1c'
const ACCESS_TOKEN = process.env.LOCATION_API

async function getCoordinates(address) {
    let URL = `https://eu1.locationiq.com/v1/search.php?key=${ACCESS_TOKEN}&q=${encodeURI(address)}&format=json`

    const response = await axios.get(URL);
    //console.log(response)
    const data = response["data"];

    //console.log(data)

    if (!data || data.status === 'ZERO_RESULTS') {
        const error = new HttpError('Could not find loaction for address.', 422);
        throw error;
    }
    //console.log(data)
    const { lat, lon } = data[0];

    const coordinates = {
        lat,
        lng:lon
    }
    //console.log(coordinates);
    return coordinates;
}

module.exports = getCoordinates;