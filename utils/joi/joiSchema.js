import Joi from 'joi';

export default class schema {
  userSchema() {
    const idPattern = /^[a-z0-9]+$/;

    const userSchema = Joi.object({
      id: Joi.string().regex(idPattern).required(),
      password: Joi.string().min(6).required(),
      verifyPassword: Joi.string().min(6),
      name: Joi.string(),
    });
    return userSchema;
  }

  itemSchema() {
    const itemSchema = Joi.object({
      itemCode: Joi.number(),
      itemName: Joi.string(),
      health: Joi.number(),
      power: Joi.number(),
      itemPrice: Joi.number(),
    });
    return itemSchema;
  }

  inventorySchema() {
    const inventorySchema = Joi.object({
      characterId: Joi.number(),
      itemCode: Joi.number(),
      count: Joi.number(),
    });
    return inventorySchema;
  }

  characterIdSchema() {
    const characterIdSchema = Joi.object({
      characterId: Joi.number().required(),
    });
    return characterIdSchema;
  }

  itemCodeSchema() {
    const itemCodeSchema = Joi.object({
      itemCode: Joi.number().required(),
    });
    return itemCodeSchema;
  }
}

// 예시
// const schema = Joi.object({
//   name: Joi.string().min(3).max(30).messages({
//     'string.base': '문자열이여야 합니다.',
//   }),
//   password: Joi.string().min(6),
// });

// const user = {
//   name: 123,
//   password: '12345214',
// };

// if (schema.validate(user).error) console.log(schema.validate(user).error.message);
// else console.log(user);
