import express from 'express';
import { prisma } from '../utils/prisma/index.js';

const router = express.Router();

// 아이템 생성 API
router.post('/items', async (req, res, next) => {
  try {
    const { itemCode, itemName, itemStat, itemPrice } = req.body;

    if (!itemCode || !itemName || !itemStat || !itemPrice)
      return res.status(400).json({ errorMessage: '데이터 형식이 올바르지 않습니다.' });

    const isExistItem = await prisma.items.findFirst({
      where: {
        itemCode: itemCode,
      },
    });

    if (isExistItem)
      return res.status(409).json({
        message: `해당 코드 아이템은 이미 생성되어 있습니다. itemCode: ${isExistItem.itemCode}, 아이템 이름 : ${isExistItem.itemName}`,
      });

    const item = await prisma.items.create({
      data: {
        itemCode,
        itemName,
        itemStat,
        itemPrice,
      },
    });

    return res.status(201).json({ item: item });
  } catch (err) {
    return res.status(500).json({ errorMessage: err.message });
  }
});

// 아이템 수정 API
router.patch('/items/:itemCode', async (req, res, next) => {
  try {
    const { itemCode } = req.params;
    const { itemName, itemStat } = req.body;

    if (!itemCode || !itemName || !itemStat)
      return res.status(400).json({ errorMessage: '데이터 형식이 올바르지 않습니다.' });

    const item = await prisma.items.findFirst({
      where: { itemCode: +itemCode },
    });
    if (!item) return res.status(404).json({ message: '해당 아이템이 존재하지 않습니다.' });

    const renewalItem = await prisma.items.update({
      data: {
        itemName,
        itemStat,
      },
      where: {
        itemCode: +itemCode,
      },
    });

    return res.status(200).json({ message: '아이템 정보에 성공허였습니다.', renewalItem: renewalItem });
  } catch (err) {
    return res.status(500).json({ errorMessage: err.message });
  }
});

// 아이템 목록 조회 API
router.get('/items', async (req, res, next) => {
  try {
    const items = await prisma.items.findMany({
      select: {
        itemCode: true,
        itemName: true,
        itemPrice: true,
      },
    });

    if (!items) return res.status(404).json({ message: '현재 목록에 아이템이 존재하지 않습니다.' });

    return res.status(200).json({ items: items });
  } catch (err) {
    return res.status(500).json({ errorMessage: err.message });
  }
});

// 아이템 상세 조회 API
router.get('/items/:itemCode', async (req, res, next) => {
  try {
    const { itemCode } = req.params;
    const item = await prisma.items.findFirst({
      where: { itemCode: +itemCode },
    });
    if (!item) return res.status(404).json({ message: '해당 아이템이 존재하지 않습니다.' });

    return res.status(200).json({ item: item });
  } catch (err) {
    return res.status(500).json({ errorMessage: err.message });
  }
});

export default router;
