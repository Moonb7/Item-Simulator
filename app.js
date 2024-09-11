import express from 'express';
import UserRouter from './routers/user.router.js';
import CharacterRouter from './routers/character.router.js';
import ItemRouter from './routers/item.router.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3018;

app.use(express.json()); // req.body를 Json형태로 받기위해

app.use('/api', [UserRouter, CharacterRouter, ItemRouter]);

app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸어요!');
});
