import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

// 아이템 구입 API (JWT 인증 필요)
router.post('/inventories/:characterId', authMiddleware, async (req, res, next) => {
  const { characterId } = req.params;
  const { itemCode, count } = req.body;
});

// 아이템 판매 API (JWT 인증 필요)
router.delete('/inventories/:characterId', authMiddleware, async (req, res, next) => {
  const { characterId } = req.params;
  const { itemCode, count } = req.body;
});

// 내 아이템 목록 조회 API (JWT 인증 필요)
router.get('/inventories/:characterId', authMiddleware, async (req, res, next) => {});

export default router;
