# 🚀 HNG Stage 1 — Profile Intelligence API

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://hng-stage-1-coral.vercel.app)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green?logo=node.js)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-blue?logo=mongodb)](https://mongodb.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A high-performance REST API that leverages intelligence from multiple external sources (Genderize, Agify, Nationalize) to build and persist detailed user profiles with advanced classification logic.

## 🌟 Key Features

- **Multi-API Integration**: Aggregates data from 3 distinct intelligence APIs in parallel.
- **Data Persistence**: Uses MongoDB Atlas for reliable profile storage.
- **Classification Engine**: Automatically categorizes profiles into age groups and identifies primary nationality.
- **Idempotency**: Smart handling of duplicate requests to prevent redundant data.
- **UUID v7**: Future-proof, time-ordered identifiers for every record.
- **Advanced Filtering**: Search profiles by gender, country, or age group with case-insensitive support.

## 🛠️ Tech Stack

- **Runtime**: Node.js & Express
- **Database**: MongoDB Atlas via Mongoose
- **Deployment**: Vercel (Serverless Functions)
- **External Intelligence**:
  - `api.genderize.io`
  - `api.agify.io`
  - `api.nationalize.io`

## Setup

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd HNG_Stage_1
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```
   PORT=3000
   MONGODB_URI=your_mongodb_atlas_connection_string
   ```

4. Start the server:
   ```bash
   npm start
   ```

## API Endpoints

### Create Profile
```
POST /api/profiles
Content-Type: application/json

{ "name": "ella" }
```
Returns `201 Created` with the full profile data.
If the name already exists, returns `200 OK` with the existing profile.

### Get Single Profile
```
GET /api/profiles/{id}
```
Returns `200 OK` with the profile data.

### Get All Profiles
```
GET /api/profiles
GET /api/profiles?gender=male
GET /api/profiles?country_id=NG
GET /api/profiles?age_group=adult
GET /api/profiles?gender=female&country_id=US&age_group=adult
```
All query parameters are optional and case-insensitive.

### Delete Profile
```
DELETE /api/profiles/{id}
```
Returns `204 No Content` on success.

## Classification Rules

| Age Range | Age Group  |
|-----------|------------|
| 0–12      | child      |
| 13–19     | teenager   |
| 20–59     | adult      |
| 60+       | senior     |

Nationality is determined by the country with the highest probability from the Nationalize API.

## Error Responses

| Status | Meaning                          |
|--------|----------------------------------|
| 400    | Missing or empty name / Parsing Error|
| 404    | Profile not found                |
| 422    | Invalid type (name is not a string) |
| 502    | External API returned invalid data |
| 500    | Internal server error            |

## 🧠 Natural Language Parser (Stage 2)

The system includes a rule-based Natural Language Search Endpoint (`GET /api/profiles/search?q=...`) to convert plain English strings into database filters.

### Approach & Mappings

The parser splits the query string into tokens, removes common "stop words" (`and`, `who`, `are`, `in`, `with`, etc.), and iterates through the tokens matching known patterns:

- **Gender:** 
  - `male`, `males`, `men`, `boy`, `boys` ➡️ `gender=male`
  - `female`, `females`, `women`, `girl`, `girls` ➡️ `gender=female`
- **Age Aliases:** 
  - `young` ➡️ `min_age=16`, `max_age=24` (Note: internal mapping for queries only)
- **Age Groups:** 
  - `child`, `children` ➡️ `age_group=child`
  - `teenager`, `teenagers`, `teen`, `teens` ➡️ `age_group=teenager`
  - `adult`, `adults` ➡️ `age_group=adult`
  - `senior`, `seniors` ➡️ `age_group=senior`
- **Age Relations:** 
  - `above X`, `over X`, `older than X` ➡️ `min_age = X + 1`
  - `under X`, `below X`, `younger than X` ➡️ `max_age = X - 1`
- **Location:** 
  - `from [CountryName]` ➡️ The `[CountryName]` is passed to the `country-list` npm package to extract the 2-letter ISO code (`country_id`). E.g., `from nigeria` ➡️ `country_id=NG`.

### Limitations & Edge Cases Not Handled

Because the parser is strictly rule-based without an LLM:
1. **OR/Complex Logic:** It cannot comprehend "OR" conditions (e.g., "males from nigeria OR females from kenya"). It treats everything as an "AND" condition.
2. **Ambiguous Locations:** Multi-word country names are partially supported (checks up to 3 words ahead), but complex location phrases with typos might fail to map to proper ISO codes.
3. **Compound Age Relations:** Ranges described as "between 20 and 30" are not currently supported; only simple comparative boundaries like "above 20" or "under 30".
4. **Out of vocabulary words:** If a phrase like "middle-aged folks" is used, the system has no rule matching it to `adult` and will simply ignore those words. If the entire query results in 0 parsed filters, it returns a 400 Error ("Unable to interpret query").
