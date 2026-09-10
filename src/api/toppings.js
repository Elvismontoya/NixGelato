import { apiGet } from './client.js'

export const getToppings = () => apiGet('/api/toppings')
