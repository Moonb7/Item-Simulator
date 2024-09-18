import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import JoiSchema from '../utils/joi/joiSchema.js';

const router = express.Router();

const joiSchema = new JoiSchema();

// 캐릭터가 장착한 아이템 목록 조회
router.get('/equipments/:characterId', async (req, res, next) => {
  try {
    const { characterId } = await joiSchema.characterIdSchema().validateAsync(req.params);

    const character = await prisma.characters.findUnique({
      where: {
        characterId: characterId, // 어차피 현재 characterId는 고유하다
      },
    });
    // 캐릭터가 있는지 확인
    if (!character) return res.status(404).json({ message: '캐릭터가 존재하지 않습니다.' });

    const equipments = await prisma.equipments.findMany({
      select: { itemCode: true },
      where: {
        characterId: characterId,
      },
      orderBy: {
        itemCode: 'asc',
      },
    });

    for (let i = 0; i < equipments.length; i++) {
      const item = await prisma.items.findFirst({
        select: { itemName: true },
        where: { itemCode: equipments[i].itemCode },
      });

      equipments[i].itemName = item.itemName;
    }

    return res.status(200).json({ equipments: equipments });
  } catch (err) {
    next(err);
  }
});

// 아이템 장착 API
router.post('/equipments/:characterId', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = await joiSchema.characterIdSchema().validateAsync(req.params);
    const { itemCode } = await joiSchema.itemCodeSchema().validateAsync(req.body);
    const userId = req.user.userId;

    const character = await prisma.characters.findUnique({
      where: {
        characterId: characterId, // 어차피 현재 characterId는 고유하다
      },
    });
    // 캐릭터가 있는지 확인
    if (!character) return res.status(404).json({ message: '캐릭터가 존재하지 않습니다.' });
    if (userId !== character.userId) return res.status(409).json({ message: '현재 계정의 캐릭터가 아닙니다.' });

    const isequipItem = await prisma.equipments.findFirst({
      where: {
        characterId: characterId,
        itemCode: itemCode,
      },
    });
    if (isequipItem) return res.status(409).json({ message: '이미 장착중인 아이템입니다.' });

    const isInventoryItem = await prisma.inventories.findFirst({
      where: {
        characterId: characterId,
        itemCode: itemCode,
      },
    });

    // 인벤토리 안에 장착할 아이템이 있는지
    if (!isInventoryItem) return res.status(404).json({ message: '인벤토리에 장착할 아이템이 존재하지 않습니다.' });

    const renewalcharacter = await prisma.$transaction(
      async (tx) => {
        await tx.equipments.create({
          data: {
            characterId: characterId,
            itemCode: itemCode,
          },
        });

        const itemInfo = await tx.items.findFirst({
          where: { itemCode: itemCode },
        });

        const inventoryItem = await tx.inventories.update({
          data: {
            count: isInventoryItem.count - 1, // 다음에는 한번 inventories컬럼에 isUse라는 사용여부 컬럼을 추가해서 해야겠다
          },
          where: {
            inventoryId: isInventoryItem.inventoryId,
          },
        });

        if (inventoryItem.count === 0) {
          await tx.inventories.delete({
            where: {
              inventoryId: isInventoryItem.inventoryId,
            },
          });
        }

        const renewalcharacter = await tx.characters.update({
          where: { characterId: characterId },
          data: {
            health: character.health + itemInfo.health,
            power: character.power + itemInfo.power,
          },
          select: {
            characterName: true,
            health: true,
            power: true,
          },
        });
        return renewalcharacter;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, // DB가 커밋된 후
      },
    );

    return res.status(200).json({ message: renewalcharacter });
  } catch (err) {
    next(err);
  }
});

// 아이템 탈착 API
router.delete('/equipments/:characterId', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = await joiSchema.characterIdSchema().validateAsync(req.params);
    const { itemCode } = await joiSchema.itemCodeSchema().validateAsync(req.body);
    const userId = req.user.userId;

    const character = await prisma.characters.findUnique({
      where: {
        characterId: characterId, // 어차피 현재 characterId는 고유하다
      },
    });
    // 캐릭터가 있는지 확인
    if (!character) return res.status(404).json({ message: '캐릭터가 존재하지 않습니다.' });
    if (userId !== character.userId) return res.status(409).json({ message: '현재 계정의 캐릭터가 아닙니다.' });

    // 해당 인벤토리에 탈착할려는 아이템이 있는지 체크하기 위한 변수
    const isInventoryItem = await prisma.inventories.findFirst({
      where: {
        characterId: characterId,
        itemCode: itemCode,
      },
    });

    const isequipItem = await prisma.equipments.findFirst({
      where: {
        characterId: characterId,
        itemCode: itemCode,
      },
    });
    if (!isequipItem) return res.status(409).json({ message: '장착 중인 아이템이 아닙니다.' });

    const renewalcharacter = await prisma.$transaction(
      async (tx) => {
        // 장비DB에서 삭제
        await tx.equipments.delete({
          where: {
            equipmentId: isequipItem.equipmentId,
          },
        });

        // 인벤토리에 갯수 수정 및 추가
        if (!isInventoryItem) {
          await tx.inventories.create({
            data: {
              characterId: characterId,
              itemCode: itemCode,
              count: 1,
            },
          });
        } else {
          await tx.inventories.update({
            data: {
              count: isInventoryItem.count + 1, // 다음에는 한번 inventories컬럼에 isUse라는 사용여부 컬럼을 추가해서 해야겠다
            },
            where: {
              inventoryId: isInventoryItem.inventoryId,
            },
          });
        }

        const itemInfo = await tx.items.findFirst({
          where: { itemCode: itemCode },
        });

        const renewalcharacter = await tx.characters.update({
          where: { characterId: characterId },
          data: {
            health: character.health - itemInfo.health,
            power: character.power - itemInfo.power,
          },
          select: {
            characterName: true,
            health: true,
            power: true,
          },
        });

        return renewalcharacter;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, // DB가 커밋된 후
      },
    );

    return res.status(200).json({ message: renewalcharacter });
  } catch (err) {
    next(err);
  }
});

export default router;
