const Joi = require('joi');
const ApiError = require('../utils/ApiError');

const schemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(1).required(),
    rememberMe: Joi.boolean().default(false),
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required(),
  }),

  resetPassword: Joi.object({
    userId: Joi.number().integer().required(),
    token: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
  }),
changePassword: Joi.object({
    currentPassword: Joi.string().min(1).required(),
    newPassword: Joi.string().min(8).required(),
  }),
  refresh: Joi.object({
    refreshToken: Joi.string().optional(), // may also arrive via httpOnly cookie
  }),
};

function validate(schemaName) {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return next(
        ApiError.badRequest(
          'Validation failed',
          error.details.map((d) => d.message)
        )
      );
    }
    req.body = value; 
    next();
  };        
}

module.exports = { validate };  
