const Joi = require("joi");

exports.registerSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({ "string.alphanum": "Username chỉ được chứa chữ và số" }),

  email: Joi.string()
    .email()
    .required()
    .messages({ "string.email": "Email không hợp lệ" }),

  password: Joi.string()
    .min(6)
    .max(100)
    .required()
    .messages({ "string.min": "Password phải có ít nhất 6 ký tự" }),

  full_name: Joi.string()
    .pattern(/^[^0-9!@#$%^&*()\-_+={}\[\]|\\:;"'<>,.?/`~]*$/)
    .max(100)
    .allow("", null)
    .messages({
      "string.pattern.base": "Họ và tên không được chứa số hoặc ký tự đặc biệt",
    }),

  phone: Joi.string()
    .pattern(/^[0-9+\-\s]{7,15}$/)
    .allow("", null)
    .messages({ "string.pattern.base": "Số điện thoại không hợp lệ" }),

  address: Joi.string().max(255).allow("", null),
});

exports.loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});
