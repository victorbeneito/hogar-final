export interface Cliente {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono?: string;
  empresa?: string;
  direccion?: string;
  direccionComplementaria?: string;
  codigoPostal?: string;
  ciudad?: string;
  provincia?: string;
  pais?: string;
  nif?: string;
  role?: string;
}
