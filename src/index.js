import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do PostgreSQL usando variável do Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Criar tabela se não existir
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

pool.query(createTableQuery)
  .then(() => console.log('✅ Tabela de transações criada/verificada com sucesso'))
  .catch(err => console.error('❌ Erro ao criar tabela:', err));

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: 'API de Finanças Pessoais - Online!' });
});

// Criar nova transação
app.post('/api/transactions', async (req, res) => {
  try {
    const { description, amount, type, category } = req.body;
    const result = await pool.query(
      'INSERT INTO transactions (description, amount, type, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [description, amount, type, category]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar todas as transações
app.get('/api/transactions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transactions ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Excluir uma transação
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM transactions WHERE id = $1', [id]);
    res.json({ message: 'Transação excluída com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar uma transação
app.put('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount, type, category } = req.body;
    const result = await pool.query(
      'UPDATE transactions SET description = $1, amount = $2, type = $3, category = $4 WHERE id = $5 RETURNING *',
      [description, amount, type, category, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obter total de receitas e despesas
app.get('/api/transactions/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses
      FROM transactions
    `);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});