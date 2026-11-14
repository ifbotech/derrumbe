import { defineConfig } from 'vitest/config';

// Margen amplio para las pruebas: varias juegan campañas enteras o hablan con un servidor de salas de verdad,
// y con la máquina cargada (laboratorio, QA visual) los 5 s por defecto no siempre alcanzan.
export default defineConfig({
  test: { testTimeout: 30_000, hookTimeout: 30_000 },
});
