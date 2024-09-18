import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import JoiSchema from '../utils/joi/joiSchema.js';

const router = express.Router();
const joiSchema = new JoiSchema();

// 아이템 생성 API
router.post('/items', async (req, res, next) => {
  try {
    const { itemCode, itemName, health, power, itemPrice } = await joiSchema.itemSchema().validateAsync(req.body);

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
        health,
        power,
        itemPrice,
      },
    });

    return res.status(201).json({ item: item });
  } catch (err) {
    next(err);
  }
});

// 아이템 수정 API
router.patch('/items/:itemCode', async (req, res, next) => {
  try {
    const { itemCode } = await joiSchema.itemSchema().validateAsync(req.params);

    const { itemName, health, power } = await joiSchema.itemSchema().validateAsync(req.body);

    const item = await prisma.items.findFirst({
      where: { itemCode: +itemCode },
    });
    if (!item) return res.status(404).json({ message: '해당 아이템이 존재하지 않습니다.' });

    const renewalItem = await prisma.items.update({
      data: {
        itemName,
        health,
        power,
      },
      where: {
        itemCode: +itemCode,
      },
    });

    return res.status(200).json({ message: '아이템 정보에 성공허였습니다.', renewalItem: renewalItem });
  } catch (err) {
    next(err);
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
    next(err);
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
    next(err);
  }
});

export default router;
