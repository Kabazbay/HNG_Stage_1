# HNG Stage 1 — Profile API

A REST API that accepts a name, fetches data from three external APIs (Genderize, Agify, Nationalize), classifies the results, and stores profiles in MongoDB.

## Features

- **Create profiles** from name analysis using external APIs
- **Idempotent creation** — duplicate names return the existing profile
- **Filter profiles** by gender, country, or age group
- **UUID v7** identifiers for all profiles
- **Full error handling** with proper HTTP status codes

## Tech Stack

- Node.js + Express
- MongoDB Atlas (Mongoose ODM)
- External APIs: Genderize, Agify, Nationalize

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
