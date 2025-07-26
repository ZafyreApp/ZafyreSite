// Importa o módulo Express para criar o servidor web
const express = require('express');
const app = express();
const port = 3000; // Define a porta em que o servidor irá rodar

// Importa o módulo Firebase Admin SDK
const admin = require('firebase-admin');

// --- INICIALIZAÇÃO DO FIREBASE ADMIN SDK ---
// Pega o valor da variável de ambiente (secret) que contém o JSON da conta de serviço
const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

let serviceAccount;
try {
  // Tenta converter a string JSON para um objeto JavaScript
  serviceAccount = JSON.parse(serviceAccountString);
} catch (error) {
  // Se houver um erro na conversão (JSON inválido), exibe uma mensagem de erro
  console.error('ERRO: Falha ao fazer parse do FIREBASE_SERVICE_ACCOUNT_JSON. Verifique o formato do JSON no secret do Replit.', error);
  // É crucial que este JSON esteja correto. Se não estiver, o Admin SDK não vai funcionar.
  // Encerra o processo se o JSON for inválido para evitar mais erros.
  process.exit(1); 
}

// Inicializa o Firebase Admin SDK com as credenciais da conta de serviço
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Você pode adicionar a URL do seu Realtime Database aqui se estiver usando:
  // databaseURL: "https://SEU_PROJETO.firebaseio.com"
});

console.log('Firebase Admin SDK inicializado com sucesso.');

// Referência ao Firestore Database (se você for usar o Firestore)
const db = admin.firestore();

// --- ROTAS DO SERVIDOR EXPRESS ---

// Rota principal (home page)
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html'); // Serve o arquivo index.html
});

// Exemplo de rota para adicionar dados ao Firestore
app.get('/adicionar-dado', async (req, res) => {
  try {
    const docRef = await db.collection('testes').add({
      mensagem: 'Olá do Firebase Admin SDK no Replit!',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Documento adicionado com ID:', docRef.id);
    res.send(`Dado adicionado ao Firestore com sucesso! ID: ${docRef.id}`);
  } catch (error) {
    console.error('Erro ao adicionar dado ao Firestore:', error);
    res.status(500).send('Erro ao adicionar dado ao Firestore.');
  }
});

// Exemplo de rota para buscar dados do Firestore
app.get('/buscar-dados', async (req, res) => {
  try {
    const snapshot = await db.collection('testes').get();
    const dados = [];
    snapshot.forEach(doc => {
      dados.push(doc.data());
    });
    console.log('Dados do Firestore:', dados);
    res.json(dados);
  } catch (error) {
    console.error('Erro ao buscar dados do Firestore:', error);
    res.status(500).send('Erro ao buscar dados do Firestore.');
  }
});

// Inicia o servidor Express
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  console.log(`Acesse seu app em: http://localhost:${port}`); // No Replit, use a URL pública
});