try {
    const serviceAccountJson = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccountJson),
        // Se usar Realtime Database, adicione: databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
    console.log("Firebase Admin SDK inicializado com sucesso.");
} catch (error) {
    console.error("ERRO: Falha ao inicializar Firebase Admin SDK. Verifique a variável FIREBASE_SERVICE_ACCOUNT_JSON.", error);
    console.warn("Prosseguindo sem o Admin SDK, mas algumas funcionalidades Firebase podem não funcionar.");
}