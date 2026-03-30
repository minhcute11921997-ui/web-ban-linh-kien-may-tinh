const Joi = require('joi');

exports.registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required()
    .messages({ 'string.alphanum': 'Username chỉ được chứa chữ và số' }),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required()
    .messages({ 'string.min': 'Password phải có ít nhất 6 ký tự' }),
  full_name: Joi.string().max(100).allow('', null),
  phone: Joi.string().pattern(/^[0-9+\-\s]{7,15}$/).allow('', null),
  address: Joi.string().max(255).allow('', null),
});

exports.loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});