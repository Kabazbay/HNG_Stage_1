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
| 400    | Missing or empty name            |
| 404    | Profile not found                |
| 422    | Invalid type (name is not a string) |
| 502    | External API returned invalid data |
| 500    | Internal server error            |
