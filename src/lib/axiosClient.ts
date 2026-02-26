import axios from 'axios';

const clienteAxios = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api', // Ajusta según tu necesidad
  headers: {
    'Content-Type': 'application/json',
  },
});

export default clienteAxios;