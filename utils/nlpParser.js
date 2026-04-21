// utils/nlpParser.js
// This file converts a plain English query into an API filter object.
// Example: "young males from nigeria" -> { gender: "male", min_age: 16, max_age: 24, country_id: "NG" }

const { getCode } = require('country-list');

// Stop words we can safely ignore to make parsing easier
const STOP_WORDS = new Set(["and", "who", "are", "the", "people", "persons", "users", "in", "with"]);

function parseNLQ(query) {
  if (!query || typeof query !== 'string') return null;
  
  const originalQuery = query.trim();
  let tokens = originalQuery.toLowerCase().split(/\s+/).filter(word => !STOP_WORDS.has(word));
  
  const filters = {};
  let i = 0;

  // Let's iterate through the tokens and pick up known concepts
  while (i < tokens.length) {
    const token = tokens[i];

    // 1. Gender
    if (token === 'male' || token === 'males' || token === 'men' || token === 'boy' || token === 'boys') {
      filters.gender = 'male';
    } 
    else if (token === 'female' || token === 'females' || token === 'women' || token === 'girl' || token === 'girls') {
      filters.gender = 'female';
    }

    // 2. Custom age aliases ("young")
    else if (token === 'young') {
      filters.min_age = 16;
      filters.max_age = 24;
    }

    // 3. Age Groups
    else if (token === 'child' || token === 'children') {
      filters.age_group = 'child';
    }
    else if (token === 'teenager' || token === 'teenagers' || token === 'teen' || token === 'teens') {
      filters.age_group = 'teenager';
    }
    else if (token === 'adult' || token === 'adults') {
      filters.age_group = 'adult';
    }
    else if (token === 'senior' || token === 'seniors') {
      filters.age_group = 'senior';
    }

    // 4. Age relations (above/over/older than vs under/below/younger than)
    else if (token === 'above' || token === 'over') {
      const num = parseInt(tokens[i + 1], 10);
      if (!isNaN(num)) {
        filters.min_age = num + 1;
        i++; // skip the number token
      }
    }
    else if (token === 'under' || token === 'below') {
      const num = parseInt(tokens[i + 1], 10);
      if (!isNaN(num)) {
        filters.max_age = num - 1;
        i++; // skip the number token
      }
    }
    else if (token === 'older' && tokens[i + 1] === 'than') {
      const num = parseInt(tokens[i + 2], 10);
      if (!isNaN(num)) {
        filters.min_age = num + 1;
        i += 2;
      }
    }
    else if (token === 'younger' && tokens[i + 1] === 'than') {
      const num = parseInt(tokens[i + 2], 10);
      if (!isNaN(num)) {
        filters.max_age = num - 1;
        i += 2;
      }
    }

    // 5. Locations ("from Nigeria")
    else if (token === 'from') {
      // The rest of the token(s) could be a country name (e.g., "new zealand")
      // So we take the rest of the string from this point on and try to match it
      // Let's just try 1, 2, or 3 words ahead.
      let possibleCountry = tokens.slice(i + 1, i + 4).join(" "); // Try up to 3 words
      let code = getCode(possibleCountry);
      
      if (code) {
        filters.country_id = code;
        i += possibleCountry.split(" ").length; // skip the country words
      } else {
        // Try 2 words
        possibleCountry = tokens.slice(i + 1, i + 3).join(" ");
        code = getCode(possibleCountry);
        if (code) {
          filters.country_id = code;
          i += 2;
        } else {
          // Try 1 word
          possibleCountry = tokens[i + 1];
          // some exceptions or common names
          if (possibleCountry === 'uk') code = 'GB';
          else if (possibleCountry === 'usa' || possibleCountry === 'us') code = 'US';
          else if (possibleCountry === 'uae') code = 'AE';
          else code = possibleCountry ? getCode(possibleCountry) : undefined;
          
          if (code) {
            filters.country_id = code;
            i += 1;
          }
        }
      }
    }

    // Move to next token
    i++;
  }

  // If no filters were extracted, it means we couldn't understand the query
  if (Object.keys(filters).length === 0) {
    return null; // Signals failure
  }

  return filters;
}

module.exports = { parseNLQ };
