import mongoose from 'mongoose';

// 👇 PON TU URL AQUÍ (Asegúrate de que termina en /nombre_bd si lo sabes, si no, déjalo como lo tienes)
const MONGO_URI = "mongodb+srv://vicben_db:Fisicayquimica2025@cluster0.ynidino.mongodb.net/?appName=Cluster0"; 

async function espiarMongo() {
  try {
    console.log("🕵️ Conectando a Mongo...");
    await mongoose.connect(MONGO_URI);
    
    const dbName = mongoose.connection.db?.databaseName;
    console.log(`\n✅ Conectado a la Base de Datos: "${dbName}"`);
    console.log("---------------------------------------------------");

    // Listar todas las colecciones que existen ahí dentro
    const collections = await mongoose.connection.db?.listCollections().toArray();
    
    if (!collections || collections.length === 0) {
        console.log("⚠️ NO HAY COLECCIONES. Estás en la base de datos equivocada.");
        console.log("👉 Revisa tu MONGO_URI, después del '.net/' debe ir el nombre de tu BD.");
    } else {
        console.log("📂 Colecciones encontradas:");
        for (const col of collections) {
            // Contamos cuántos documentos tiene cada una
            const count = await mongoose.connection.db?.collection(col.name).countDocuments();
            console.log(`   - "${col.name}": ${count} documentos`);
        }
    }
    console.log("---------------------------------------------------");

  } catch (error) {
    console.error("❌ Error de conexión:", error);
  } finally {
    await mongoose.disconnect();
  }
}

espiarMongo();