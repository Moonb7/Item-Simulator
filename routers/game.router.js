import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma/index.js';
import JoiSchema from '../utils/joi/joiSchema.js';

const router = express.Router();

const joiSchema = new JoiSchema();

// 게임 머니를 버는 API
router.get('/game/:characterId', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = await joiSchema.characterIdSchema().validateAsync(req.params);
    const userId = req.user.userId;
    const moneyToBuy = 1000;

    const character = await prisma.characters.findUnique({
      where: { characterId: characterId },
    });
    // 캐릭터가 있는지 확인
    if (!character) return res.status(404).json({ message: '캐릭터가 존재하지 않습니다.' });
    if (userId !== character.userId) return res.status(409).json({ message: '현재 계정의 캐릭터가 아닙니다.' });

    const renewalcharacter = await prisma.characters.update({
      data: {
        money: character.money + moneyToBuy,
      },
      where: { characterId: characterId },
    });

    return res.status(200).json({
      message: '돈을 벌었었습니다..',
      money: renewalcharacter.money,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
