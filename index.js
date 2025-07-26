// Importa os módulos necessários
const express = require('express');
const app = express();
const port = 3000; // Define a porta em que o servidor irá rodar

// Importa o módulo Firebase Admin SDK
const admin = require('firebase-admin');

// Importa o módulo Mercado Pago SDK
const mercadopago = require('mercadopago');

// Middleware para fazer parse de JSON no corpo das requisições
app.use(express.json());
// Middleware para servir arquivos estáticos da pasta 'public'
app.use(express.static('public')); // <--- ESTA LINHA É CRUCIAL AGORA!

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

// Referência ao Firestore Database
const db = admin.firestore();

// --- CONFIGURAÇÃO DO MERCADO PAGO SDK ---
// Pega o Access Token dos secrets do Replit
const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
if (!accessToken) {
    console.error('ERRO: MERCADO_PAGO_ACCESS_TOKEN não configurado nos secrets do Replit.');
    process.exit(1);
}
mercadopago.configure({
    access_token: accessToken
});
console.log('Mercado Pago SDK configurado com sucesso.');

// --- ROTAS DO SERVIDOR EXPRESS ---

// Rota principal (home page) - Agora o Express.static cuidará de servir index.html
// Se você moveu index.html para a pasta 'public', esta rota específica para '/' não é mais estritamente necessária
// a menos que você queira alguma lógica específica antes de servir.
// No entanto, para simplicidade, vamos deixar o express.static fazer o trabalho.
// Se seu index.html estiver na raiz da pasta 'public', ele será servido automaticamente ao acessar '/'

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

// Rota para salvar URL da imagem do Cloudinary no Firestore
app.post('/salvar-url-imagem-no-firestore', async (req, res) => {
    const { imageUrl, publicId } = req.body;
    if (!imageUrl || !publicId) {
        return res.status(400).json({ message: 'URL da imagem ou Public ID ausentes.' });
    }
    try {
        const docRef = await db.collection('imagens').add({
            url: imageUrl,
            public_id: publicId,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('URL da imagem salva no Firestore com ID:', docRef.id);
        res.status(200).json({ message: 'URL da imagem salva com sucesso no Firestore!', id: docRef.id });
    } catch (error) {
        console.error('Erro ao salvar URL da imagem no Firestore:', error);
        res.status(500).json({ message: 'Erro ao salvar URL da imagem no Firestore.' });
    }
});


// Rota para criar preferência de pagamento do Mercado Pago
app.post('/criar-preferencia-pagamento', async (req, res) => {
    // Um ID de item simples para demonstração
    const itemId = '123';
    const itemTitle = 'Produto Zafyre';
    const itemQuantity = 1;
    const itemUnitPrice = 100.00; // Valor do produto

    // Substitua 'https://seunomedeusuario-nomedorepl.replit.dev' pela URL pública do seu Repl
    // Exemplo: https://meu-projeto-replit.replit.dev
    const REPLIT_PUBLIC_URL = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
    // OU, se você configurou um domínio personalizado no Replit, use-o aqui
    // Exemplo: const REPLIT_PUBLIC_URL = "https://seusite.com";


    let preference = {
        items: [
            {
                id: itemId,
                title: itemTitle,
                quantity: itemQuantity,
                unit_price: itemUnitPrice
            }
        ],
        back_urls: {
            // Essas URLs para onde o Mercado Pago redireciona o usuário após o pagamento
            success: `${REPLIT_PUBLIC_URL}/pagamento-sucesso`,
            failure: `${REPLIT_PUBLIC_URL}/pagamento-falha`,
            pending: `${REPLIT_PUBLIC_URL}/pagamento-pendente`
        },
        auto_return: 'approved', // Retorna automaticamente para a URL de sucesso após pagamento aprovado
        // notification_url: `${REPLIT_PUBLIC_URL}/webhook-mercado-pago` // URL para notificações de status de pagamento (opcional, para backend)
    };

    try {
        const response = await mercadopago.preferences.create(preference);
        console.log('Preferência de pagamento criada:', response.body.init_point);
        res.status(200).json({ init_point: response.body.init_point });
    } catch (error) {
        console.error('Erro ao criar preferência de pagamento do Mercado Pago:', error);
        res.status(500).json({ message: 'Erro ao criar preferência de pagamento.', error: error.message });
    }
});

// Rotas de retorno do Mercado Pago (para redirecionamento do usuário)
app.get('/pagamento-sucesso', (req, res) => {
    // Aqui você pode adicionar lógica para confirmar o pagamento, exibir mensagem de sucesso, etc.
    // Disparar o evento do Google Ads aqui seria uma boa ideia no frontend (trackConversion())
    res.send('Pagamento realizado com sucesso! Em breve, sua conversão será rastreada.');
});

app.get('/pagamento-falha', (req, res) => {
    res.send('Pagamento falhou. Por favor, tente novamente.');
});

app.get('/pagamento-pendente', (req, res) => {
    res.send('Pagamento pendente. Aguardando confirmação.');
});

// Inicia o servidor Express
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
    console.log(`Acesse seu app em: http://localhost:${port}`); // No Replit, use a URL pública
});