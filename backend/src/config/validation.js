const Joi = require('joi');

const searchParamsSchema = Joi.object({
  category: Joi.string().required(),
  q: Joi.string().max(200).allow(''),
  page: Joi.number().integer().min(1).default(1)
});

const validateSearchParams = (query) => {
  return searchParamsSchema.validate(query, { abortEarly: false });
};

module.exports = { validateSearchParams, searchParamsSchema };
