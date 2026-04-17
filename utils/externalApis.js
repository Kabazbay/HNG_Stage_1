// utils/externalApis.js
// This file contains functions that call the 3 external APIs.
// Each function makes an HTTP request, validates the response,
// and either returns the data or throws an error.

const axios = require('axios');

// ──────────────────────────────────────────────
// 1. GENDERIZE API
// URL: https://api.genderize.io?name={name}
// Returns: { name: "ella", gender: "female", probability: 0.99, count: 1234 }
// ──────────────────────────────────────────────
async function fetchGender(name) {
  try {
    // axios.get() makes an HTTP GET request (just like typing a URL in your browser)
    const response = await axios.get(`https://api.genderize.io?name=${encodeURIComponent(name)}`);
    // response.data is the JSON body that the API sent back
    const data = response.data;

    // EDGE CASE: If the API doesn't recognize the name, it returns gender: null
    // The task says: "Genderize returns gender: null or count: 0 → return 502, do not store"
    if (data.gender === null || data.gender === undefined || data.count === 0) {
      // We throw an error here. The controller will catch it and return a 502 response.
      throw new Error('Genderize returned an invalid response');
    }

    // If everything is valid, return the data we need
    return {
      gender: data.gender,                // "male" or "female"
      gender_probability: data.probability, // 0.0 to 1.0
      sample_size: data.count,             // number of people in dataset
    };
  } catch (error) {
    // If the error is one we threw ourselves (invalid response), re-throw it as-is
    if (error.message === 'Genderize returned an invalid response') {
      throw error;
    }
    // If it's a network error or the API is down, throw our standard error
    throw new Error('Genderize returned an invalid response');
  }
}

// ──────────────────────────────────────────────
// 2. AGIFY API
// URL: https://api.agify.io?name={name}
// Returns: { name: "ella", age: 46, count: 1234 }
// ──────────────────────────────────────────────
async function fetchAge(name) {
  try {
    const response = await axios.get(`https://api.agify.io?name=${encodeURIComponent(name)}`);
    const data = response.data;

    // EDGE CASE: "Agify returns age: null → return 502, do not store"
    if (data.age === null || data.age === undefined) {
      throw new Error('Agify returned an invalid response');
    }

    return {
      age: data.age, // predicted age as a number
    };
  } catch (error) {
    if (error.message === 'Agify returned an invalid response') {
      throw error;
    }
    throw new Error('Agify returned an invalid response');
  }
}

// ──────────────────────────────────────────────
// 3. NATIONALIZE API
// URL: https://api.nationalize.io?name={name}
// Returns: { name: "ella", country: [{ country_id: "DRC", probability: 0.85 }, ...] }
// ──────────────────────────────────────────────
async function fetchNationality(name) {
  try {
    const response = await axios.get(`https://api.nationalize.io?name=${encodeURIComponent(name)}`);
    const data = response.data;

    // EDGE CASE: "Nationalize returns no country data → return 502, do not store"
    if (!data.country || data.country.length === 0) {
      throw new Error('Nationalize returned an invalid response');
    }

    // The task says: "pick the country with the highest probability"
    // data.country is an array like: [{ country_id: "NG", probability: 0.4 }, { country_id: "US", probability: 0.3 }]
    // We sort by probability descending and take the first one
    const topCountry = data.country.sort((a, b) => b.probability - a.probability)[0];

    return {
      country_id: topCountry.country_id,       // e.g., "NG"
      country_probability: topCountry.probability, // e.g., 0.85
    };
  } catch (error) {
    if (error.message === 'Nationalize returned an invalid response') {
      throw error;
    }
    throw new Error('Nationalize returned an invalid response');
  }
}

// Export all 3 functions so other files can use them
module.exports = { fetchGender, fetchAge, fetchNationality };
