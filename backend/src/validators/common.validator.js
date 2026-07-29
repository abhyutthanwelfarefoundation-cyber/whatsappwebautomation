const Joi = require('joi');
const ApiError = require('../utils/ApiError');

const schemas = {
  customerSearch: Joi.object({
    query: Joi.string().allow('').default(''),
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
  }),

  orderList: Joi.object({
    status: Joi.string().valid('Pending', 'Invoiced', 'Dispatched', 'Completed', 'Cancelled').optional(),
    dispatchStatus: Joi.string().valid('Pending', 'Packed', 'Dispatched', 'Delivered').optional(),
    customerId: Joi.number().integer().optional(),
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
  }),

  orderStatusUpdate: Joi.object({
    status: Joi.string().valid('Pending', 'Invoiced', 'Dispatched', 'Completed', 'Cancelled').optional(),
    dispatchStatus: Joi.string().valid('Pending', 'Packed', 'Dispatched', 'Delivered').optional(),
  }).or('status', 'dispatchStatus'),

  globalSearch: Joi.object({
    query: Joi.string().min(1).required(),
  }),

  sendMessage: Joi.object({
    customerId: Joi.number().integer().required(),
    content: Joi.string().allow('').optional(),
    attachmentId: Joi.number().integer().optional(),
    caption: Joi.string().allow('').optional(),
  }).or('content', 'attachmentId'),

  sendInvoiceTemplate: Joi.object({
    customerId: Joi.number().integer().required(),
    attachmentId: Joi.number().integer().required(),
    invoiceReference: Joi.string().min(1).max(100).required(),
  }),

  conversationList: Joi.object({
    search: Joi.string().allow('').optional(),
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(30),
  }),

  threadQuery: Joi.object({
    before: Joi.date().iso().optional(),
    limit: Joi.number().integer().min(1).max(200).default(50),
  }),
  scheduleMessage: Joi.object({
    customerId: Joi.number().integer().required(),
    messageType: Joi.string().valid('Text', 'Document', 'Image', 'Template').required(),
    content: Joi.string().allow('').optional(),
    attachmentId: Joi.number().integer().optional(),
    invoiceReference: Joi.string().max(100).optional(),
    scheduledFor: Joi.date().iso().required(),
  }),
  orderCreate: Joi.object({
    customerId: Joi.number().integer().required(),
    invoiceNumber: Joi.string().max(50).allow('').optional(),
    pub5OrderNumber: Joi.string().max(50).allow('').optional(),
    challanNumber: Joi.string().max(50).allow('').optional(),
    amount: Joi.number().min(0).required(),
    status: Joi.string().valid('Pending','Invoiced','Dispatched','Completed','Cancelled').default('Pending'),
    dispatchStatus: Joi.string().valid('Pending','Packed','Dispatched','Delivered').default('Pending'),
    orderDate: Joi.date().iso().optional(),
  }),
  scheduledList: Joi.object({
    customerId: Joi.number().integer().optional(),
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(200).default(50),
  }),
};



function validateQuery(schemaName) {
  return (req, res, next) => {
    const { error, value } = schemas[schemaName].validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return next(ApiError.badRequest('Validation failed', error.details.map((d) => d.message)));
    }
    req.query = value;
    next();
  };
}

function validateBody(schemaName) {
  return (req, res, next) => {
    const { error, value } = schemas[schemaName].validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return next(ApiError.badRequest('Validation failed', error.details.map((d) => d.message)));
    }
    req.body = value;
    next();
  };
}



module.exports = { validateQuery, validateBody };