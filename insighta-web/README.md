# Insighta Web Portal

The web-based interface for Insighta Labs+. Built with React and Vite.

## Features

- **GitHub OAuth Login**: Secure session management using HTTP-only cookies.
- **Dashboard**: High-level overview of profile metrics.
- **Profile Management**: Filter, sort, and paginate through demographic data.
- **Natural Language Search**: Find profiles using English queries.
- **Role-Based Access**: Interface adjusts based on user permissions (Admin vs. Analyst).
- **Security**: CSRF protection and automatic token refreshing.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Backend API running (see `insighta-backend` repository)

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd insighta-web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the root directory:
   ```env
   VITE_API_URL=http://localhost:3000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## Architecture

- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router 6
- **API Client**: Axios (configured with credentials and CSRF headers)
- **Styling**: Vanilla CSS with a custom dark-mode design system

## Authentication Flow

1. User clicks "Login with GitHub".
2. Browser redirects to Backend's `/auth/github`.
3. Backend redirects to GitHub OAuth.
4. After authorization, GitHub redirects to Backend's callback.
5. Backend sets HTTP-only cookies and redirects to `/dashboard`.
6. Web app calls `/auth/me` on load to verify session.
