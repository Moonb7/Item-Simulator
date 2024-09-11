import { PrismaClient } from '@prisma/client';

// PrismaClient 인스턴스를 생성합니다.
export const prisma = new PrismaClient({
  // Prisma를 이용해 데이터베이스를 접근할 때, SQL을 출력해줍니다.
  log: ['query', 'info', 'warn', 'error'],

  // 에러메세지를 보기좋게 편집하여 출력
  errorFormat: 'pretty',
});
