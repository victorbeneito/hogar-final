import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
p.atributovalor.findMany({
  where: { valor: { in: ["Izquierda", "Derecha"] } },
  select: { id: true, valor: true, imagen: true },
}).then(r => {
  r.forEach(x => console.log(x.id, x.valor, x.imagen?.substring(0, 100)));
}).finally(() => p.$disconnect());
