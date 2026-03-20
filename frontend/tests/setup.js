import axios from 'axios';

// Point directly at the backend — Vite proxy doesn't run in test mode
axios.defaults.baseURL = 'http://localhost:3001';
