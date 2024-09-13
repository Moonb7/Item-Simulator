import Joi from 'joi';

const idPattern = /^[a-z0-9]+$/;
export const userSchema = Joi.object({
  id: Joi.string().regex(idPattern),
  password: Joi.string().min(6),
  verifyPassword: Joi.string().min(6),
  name: Joi.string(),
});

export const characterSchema = Joi.object({
  characterSchema,
});

// 예시
const schema = Joi.object({
  name: Joi.string().min(3).max(30).messages({
    'string.base': '문자열이여야 합니다.',
  }),
  password: Joi.string().min(6),
});

const user = {
  name: 123,
  password: '12345214',
};

if (schema.validate(user).error) console.log(schema.validate(user).error.message);
else console.log(user);
