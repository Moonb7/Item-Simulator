import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import authMiddleware from '../middlewares/auth.middleware.js';
import JoiSchema from '../utils/joi/joiSchema.js';

const joiSchema = new JoiSchema();

const router = express.Router();

// 아이템 구입 API (JWT 인증 필요)
router.post('/inventories/:characterId', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = await joiSchema.inventorySchema().validateAsync(req.params); // 이렇게 파라미터로 들어온값은 굳이 유효성 검사말고 실제 있는지 없는지를 검사해야 될것 같네요
    const { itemCode, count } = await joiSchema.inventorySchema().validateAsync(req.body); // body에 들어있는값은 유효성 검사하는 것이 좋을 것 같네요.
    const userId = req.user.userId;

    const character = await prisma.characters.findUnique({
      where: {
        characterId: +characterId, // 어차피 현재 characterId는 고유하다
      },
    });
    // 캐릭터가 있는지 확인
    if (!character) return res.status(404).json({ message: '캐릭터가 존재하지 않습니다.' });
    if (userId !== character.userId) return res.status(409).json({ message: '현재 계정의 캐릭터가 아닙니다.' });

    const item = await prisma.items.findUnique({
      where: {
        itemCode: +itemCode,
      },
    });
    // 아이템 목록에 있는 아이템인지 확인
    if (!item) return res.status(404).json({ message: '아이템이 존재하지 않습니다.' });

    const totalPrice = item.itemPrice * count;

    if (character.money < totalPrice) return res.status(409).json({ messgae: '캐릭터의 돈이 부족합니다.' });

    // 트랜잭션
    const renewalcharacter = await prisma.$transaction(
      async (tx) => {
        // 인벤토리에 해당 캐릭터가 아이템을 이미 가지고 있으면
        const isExistinventoryItem = await tx.inventories.findFirst({
          where: {
            characterId: +characterId,
            itemCode: +itemCode,
          },
        });

        // 인벤토리 추가 및 수정
        if (isExistinventoryItem) {
          // 인벤토리에 아이템 있으면 갯수 추가
          await tx.inventories.update({
            data: {
              count: isExistinventoryItem.count + count,
            },
            where: {
              inventoryId: isExistinventoryItem.inventoryId,
            },
          });
        } else {
          // 인벤토리에 아이템 생성
          await tx.inventories.create({
            data: {
              characterId: +characterId,
              itemCode: itemCode,
              count: count,
            },
          });
        }

        // 캐릭터 머니 수정
        const renewalcharacter = await tx.characters.update({
          data: {
            money: character.money - totalPrice,
          },
          where: {
            characterId: +characterId,
          },
        });

        return renewalcharacter;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, // DB가 커밋된 후
      },
    );

    return res.status(201).json({ message: '아이템을 구입했습니다.', money: renewalcharacter.money });
  } catch (err) {
    next(err);
  }
});

// 아이템 판매 API (JWT 인증 필요)
router.delete('/inventories/:characterId', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = await joiSchema.inventorySchema().validateAsync(req.params);
    const { itemCode, count } = await joiSchema.inventorySchema().validateAsync(req.body);
    const userId = req.user.userId;

    const character = await prisma.characters.findUnique({
      where: {
        characterId: +characterId, // 어차피 현재 characterId는 고유하다
      },
    });
    // 캐릭터가 있는지 확인
    if (!character) return res.status(404).json({ message: '캐릭터가 존재하지 않습니다.' });
    if (userId !== character.userId) return res.status(409).json({ message: '현재 계정의 캐릭터가 아닙니다.' });

    const item = await prisma.items.findFirst({
      where: {
        itemCode: +itemCode,
      },
    });
    // 아이템 목록에 있는 아이템인지 확인
    if (!item) return res.status(404).json({ message: '아이템이 존재하지 않습니다.' });

    // 인벤토리에 아이템이 있는지 확인
    const isExistinventoryItem = await prisma.inventories.findFirst({
      where: {
        characterId: +characterId,
        itemCode: itemCode,
      },
    });
    // 인벤토리에 해당 아이템이 없으면
    if (!isExistinventoryItem) return res.status(404).json({ message: '현재 인벤토리에 해당 아이템이 없습니다.' });

    if (isExistinventoryItem.count < count)
      return res.status(409).json({ message: '판매할 아이템의 갯수가 많습니다.' });

    // 트랜잭션
    const renewalcharacter = await prisma.$transaction(
      async (tx) => {
        const totalPrice = Math.floor(item.itemPrice * count * 0.6); // 판매금액의 60%만 갖게 기획을 가집니다.

        // 캐릭터 머니 수정
        const renewalcharacter = await tx.characters.update({
          data: {
            money: character.money + totalPrice,
          },
          where: {
            characterId: +characterId,
          },
        });

        const renewalInventory = await tx.inventories.update({
          data: {
            count: isExistinventoryItem.count - count,
          },
          where: {
            inventoryId: isExistinventoryItem.inventoryId,
            characterId: +characterId,
          },
        });

        if (renewalInventory.count === 0) {
          await tx.inventories.delete({
            where: {
              inventoryId: renewalInventory.inventoryId,
              characterId: +characterId,
            },
          });
        }

        return renewalcharacter;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, // DB가 커밋된 후
      },
    );

    return res.status(201).json({ message: '아이템을 판매하였습니다.', money: renewalcharacter.money });
  } catch (err) {
    next(err);
  }
});

// 내 아이템 목록 조회 API (JWT 인증 필요)
router.get('/inventories/:characterId', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = await joiSchema.inventorySchema().validateAsync(req.params);
    const userId = req.user.userId;

    const character = await prisma.characters.findUnique({
      where: {
        characterId: +characterId, // 어차피 현재 characterId는 고유하다
      },
    });
    // 캐릭터가 있는지 확인
    if (!character) return res.status(404).json({ message: '캐릭터가 존재하지 않습니다.' });
    if (userId !== character.userId) return res.status(409).json({ message: '현재 계정의 캐릭터가 아닙니다.' });

    const inventories = await prisma.inventories.findMany({
      select: {
        itemCode: true,
        count: true,
      },
      where: {
        characterId: characterId,
      },
    });
    // if (!inventories) return res.status(404).json({ message: '현재 캐릭터의 인벤토리에 아이템이 존재하지 않습니다.' });

    for (let i = 0; i < inventories.length; i++) {
      const item = await prisma.items.findFirst({
        select: { itemName: true },
        where: { itemCode: inventories[i].itemCode },
      });

      inventories[i].itemName = item.itemName;
    }

    // 응답할 resultMessage를 순서에 맞게 편하게 보여주기위해 map함수를 이용해 정리
    const resultMessage = inventories.map((inventory) => {
      const resultMessage = {
        itemCode: inventory.itemCode,
        itemName: inventory.itemName,
        count: inventory.count,
      };
      return resultMessage;
    });

    return res.status(200).json({ inventories: resultMessage });
  } catch (err) {
    next(err);
  }
});

export default router;
