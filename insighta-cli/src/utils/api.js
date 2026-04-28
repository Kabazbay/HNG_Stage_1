// src/utils/api.js
// This file creates an HTTP client (using axios) that:
//   1. Automatically includes the access token on every request
//   2. Automatically refreshes the token if it gets a 401 response
//   3. Prompts re-login if refresh also fails
//
// EVERY command that talks to the backend uses this client instead of raw axios.

const axios = require('axios');
const { API_BASE_URL } = require('../config');
const { getAccessToken, getRefreshToken, updateTokens, clearCredentials } = require('./auth');

// Create an axios instance with the base URL pre-configured
// This means we only need to specify the path (like "/api/v1/profiles")
// instead of the full URL every time.
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
});

// ──────────────────────────────────────────────
// REQUEST INTERCEPTOR
// Runs BEFORE every request — adds the access token
// ──────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ──────────────────────────────────────────────
// RESPONSE INTERCEPTOR
// Runs AFTER every response — handles 401 (token expired)
// ──────────────────────────────────────────────
apiClient.interceptors.response.use(
  // Success — just pass the response through
  (response) => response,

  // Error — check if it's a 401
  async (error) => {
    const originalRequest = error.config;

    // If we get a 401 AND we haven't already tried refreshing
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark so we don't loop forever

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        // No refresh token — user needs to log in
        const chalk = require('chalk');
        console.error(chalk.red('\n⚠ Session expired. Please run: insighta login\n'));
        clearCredentials();
        process.exit(1);
      }

      try {
        // Try to get new tokens using the refresh token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data.data;

        // Save the new tokens
        updateTokens(access_token, refresh_token);

        // Retry the original request with the new access token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed — user needs to log in again
        const chalk = require('chalk');
        console.error(chalk.red('\n⚠ Session expired. Please run: insighta login\n'));
        clearCredentials();
        process.exit(1);
      }
    }

    return Promise.reject(error);
  }
);

module.exports = apiClient;
