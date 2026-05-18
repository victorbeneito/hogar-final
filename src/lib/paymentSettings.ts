export type PaymentMethodRow = {
  id: number;
  nombre: string;
  descripcion: string | null;
  recargo: number;
  activa: boolean;
  orden: number;
};

export type PaymentCheckoutConfig = {
  bizum: {
    telefono: string;
    nombre: string;
    instrucciones: string;
    conceptoPrefix: string;
  };
  transferencia: {
    banco: string;
    iban: string;
    titular: string;
    instrucciones: string;
  };
  contrareembolso: {
    comisionFija: number;
    porcentaje: number;
    minimoVariable: number;
    instrucciones: string;
  };
  gateways: {
    redsys: {
      activa: boolean;
      merchantCode: string;
      terminal: string;
      merchantName: string;
      secretKey: string;
      entorno: "sandbox" | "produccion";
    };
    paypal: {
      activa: boolean;
      clientId: string;
      entorno: "sandbox" | "produccion";
    };
  };
};

export const DEFAULT_PAYMENT_CONFIG: PaymentCheckoutConfig = {
  bizum: {
    telefono: "678 529 510",
    nombre: "El Hogar de tus Sueños",
    instrucciones: "Envía el Bizum por el importe exacto al número indicado.",
    conceptoPrefix: "PEDIDO",
  },
  transferencia: {
    banco: "Banco Sabadell",
    iban: "ES82 0081 0319 0452 7458 0563",
    titular: "El Hogar de tus Sueños S.L.",
    instrucciones: "Realiza la transferencia e indica el número de pedido como concepto.",
  },
  contrareembolso: {
    comisionFija: 3,
    porcentaje: 3,
    minimoVariable: 0,
    instrucciones: "Pagarás al recibir el paquete. El recargo cubre la gestión del cobro.",
  },
  gateways: {
    redsys: {
      activa: false,
      merchantCode: "",
      terminal: "",
      merchantName: "",
      secretKey: "",
      entorno: "sandbox",
    },
    paypal: {
      activa: false,
      clientId: "",
      entorno: "sandbox",
    },
  },
};

export function normalizePaymentConfig(input: any): PaymentCheckoutConfig {
  const source = input && typeof input === "object" ? input : {};
  return {
    bizum: {
      telefono: String(source.bizum?.telefono ?? DEFAULT_PAYMENT_CONFIG.bizum.telefono),
      nombre: String(source.bizum?.nombre ?? DEFAULT_PAYMENT_CONFIG.bizum.nombre),
      instrucciones: String(source.bizum?.instrucciones ?? DEFAULT_PAYMENT_CONFIG.bizum.instrucciones),
      conceptoPrefix: String(source.bizum?.conceptoPrefix ?? DEFAULT_PAYMENT_CONFIG.bizum.conceptoPrefix),
    },
    transferencia: {
      banco: String(source.transferencia?.banco ?? DEFAULT_PAYMENT_CONFIG.transferencia.banco),
      iban: String(source.transferencia?.iban ?? DEFAULT_PAYMENT_CONFIG.transferencia.iban),
      titular: String(source.transferencia?.titular ?? DEFAULT_PAYMENT_CONFIG.transferencia.titular),
      instrucciones: String(source.transferencia?.instrucciones ?? DEFAULT_PAYMENT_CONFIG.transferencia.instrucciones),
    },
    contrareembolso: {
      comisionFija: Number(source.contrareembolso?.comisionFija ?? DEFAULT_PAYMENT_CONFIG.contrareembolso.comisionFija),
      porcentaje: Number(source.contrareembolso?.porcentaje ?? DEFAULT_PAYMENT_CONFIG.contrareembolso.porcentaje),
      minimoVariable: Number(source.contrareembolso?.minimoVariable ?? DEFAULT_PAYMENT_CONFIG.contrareembolso.minimoVariable),
      instrucciones: String(source.contrareembolso?.instrucciones ?? DEFAULT_PAYMENT_CONFIG.contrareembolso.instrucciones),
    },
    gateways: {
      redsys: {
        activa: Boolean(source.gateways?.redsys?.activa ?? DEFAULT_PAYMENT_CONFIG.gateways.redsys.activa),
        merchantCode: String(source.gateways?.redsys?.merchantCode ?? DEFAULT_PAYMENT_CONFIG.gateways.redsys.merchantCode),
        terminal: String(source.gateways?.redsys?.terminal ?? DEFAULT_PAYMENT_CONFIG.gateways.redsys.terminal),
        merchantName: String(source.gateways?.redsys?.merchantName ?? DEFAULT_PAYMENT_CONFIG.gateways.redsys.merchantName),
        secretKey: String(source.gateways?.redsys?.secretKey ?? DEFAULT_PAYMENT_CONFIG.gateways.redsys.secretKey),
        entorno: source.gateways?.redsys?.entorno === "produccion" ? "produccion" : "sandbox",
      },
      paypal: {
        activa: Boolean(source.gateways?.paypal?.activa ?? DEFAULT_PAYMENT_CONFIG.gateways.paypal.activa),
        clientId: String(source.gateways?.paypal?.clientId ?? DEFAULT_PAYMENT_CONFIG.gateways.paypal.clientId),
        entorno: source.gateways?.paypal?.entorno === "produccion" ? "produccion" : "sandbox",
      },
    },
  };
}

export function calculateContrareembolso(totalBase: number, config: PaymentCheckoutConfig["contrareembolso"]) {
  const porcentaje = Math.max(0, Number(config.porcentaje) || 0) / 100;
  const comisionFija = Math.max(0, Number(config.comisionFija) || 0);
  const minimoVariable = Math.max(0, Number(config.minimoVariable) || 0);

  const variable = Math.max(totalBase * porcentaje, minimoVariable);
  const total = totalBase + comisionFija + variable;

  return {
    base: totalBase,
    comisionFija,
    variable,
    total,
  };
}

export function inferContrareembolsoBase(totalFinal: number, config: PaymentCheckoutConfig["contrareembolso"]) {
  const porcentaje = Math.max(0, Number(config.porcentaje) || 0) / 100;
  const comisionFija = Math.max(0, Number(config.comisionFija) || 0);
  const minimoVariable = Math.max(0, Number(config.minimoVariable) || 0);

  const candidatePercent = porcentaje > 0 ? (totalFinal - comisionFija) / (1 + porcentaje) : totalFinal - comisionFija - minimoVariable;
  const baseWithPercent = Math.max(0, candidatePercent);
  const variableWithPercent = Math.max(baseWithPercent * porcentaje, minimoVariable);
  const totalWithPercent = baseWithPercent + comisionFija + variableWithPercent;

  if (Math.abs(totalWithPercent - totalFinal) < 0.01) {
    return { base: baseWithPercent, comisionFija, variable: variableWithPercent, total: totalWithPercent };
  }

  const baseWithMin = Math.max(0, totalFinal - comisionFija - minimoVariable);
  const variableWithMin = Math.max(baseWithMin * porcentaje, minimoVariable);
  const totalWithMin = baseWithMin + comisionFija + variableWithMin;

  return { base: baseWithMin, comisionFija, variable: variableWithMin, total: totalWithMin };
}
