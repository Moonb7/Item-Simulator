import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// 캐릭터 생성 API
router.post('/characters', authMiddleware, async (req, res, next) => {
  try {
    const { characterName } = req.body;
    const { userId } = req.user;

    if (!characterName || !userId) return res.status(400).json({ errorMessage: '데이터 형식이 올바르지 않습니다.' });

    const isExistCharacter = await prisma.characters.findFirst({
      where: {
        characterName,
      },
    });

    if (isExistCharacter) return res.status(409).json({ message: '이미 존재하는 캐릭터 이름입니다.' });

    const character = await prisma.characters.create({
      data: {
        userId: +userId,
        characterName: characterName,
      },
    });

    return res.status(201).json({ characterId: character.characterId });
  } catch (err) {
    next(err);
  }
});

// 캐릭터 삭제 API
router.delete('/characters/:characterId', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.params;
    const { userId } = req.user;

    if (!characterId || !userId) return res.status(400).json({ errorMessage: '데이터 형식이 올바르지 않습니다.' });

    const character = await prisma.characters.findFirst({
      where: {
        characterId: +characterId,
      },
    });
    if (!character || userId !== character.userId)
      return res.status(404).json({ message: '존재하지 않거나 다른 아이디의 캐릭터입니다.' });

    await prisma.characters.delete({
      where: {
        characterId: +characterId,
      },
    });

    return res.status(200).json({ message: `${characterId}번 캐릭터가 삭제 되었습니다.` });
  } catch (err) {
    next(err);
  }
});

// 캐릭터 조회 API
router.get('/characters/:characterId', async (req, res, next) => {
  try {
    const { characterId } = req.params;

    if (!characterId) return res.status(400).json({ errorMessage: '데이터 형식이 올바르지 않습니다.' });

    const isExistCharacter = await prisma.characters.findFirst({
      where: { characterId: +characterId },
    });
    if (!isExistCharacter) return res.status(404).json({ message: '존재하지 않는 캐릭터입니다.' });

    // 헤더로 토큰을 받고 받은 토큰이 해당 로그인한 아이디가 맞으면
    const { authorization } = req.headers;
    if (authorization) {
      const [tokenType, token] = authorization.split(' ');
      if (tokenType === 'Bearer') {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const id = decodedToken.id;

        // id를 가지고 user 찾아오기
        const user = await prisma.users.findFirst({
          where: { id: id },
        });

        // userId가 맞는지 확인 즉, 로그인한 본인의 캐릭터를 조회하는게 맞는지
        if (user.userId === isExistCharacter.userId) {
          const character = await prisma.characters.findFirst({
            where: { characterId: +characterId },
            select: {
              characterName: true,
              health: true,
              power: true,
              money: true,
            },
          });

          return res.status(200).json({ character: character });
        }
      }
    }

    const character = await prisma.characters.findFirst({
      where: { characterId: +characterId },
      select: {
        characterName: true,
        health: true,
        power: true,
      },
    });

    return res.status(200).json({ character: character });
  } catch (err) {
    next(err);
  }
});

export default router;
