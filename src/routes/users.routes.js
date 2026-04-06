const express = require('express');
const Joi = require('joi');
const usersController = require('../controllers/users.controller');
const { authenticate } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validate');

const router = express.Router();

const userIdParam = Joi.object({
  userId: Joi.string().required()
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(255),
  phone: Joi.string().max(32).allow(null, ''),
  username: Joi.string().max(255).allow(null, ''),
  metadata: Joi.object().unknown(true)
}).min(1);

const exportQuerySchema = Joi.object({
  format: Joi.string().valid('json', 'portable').default('json')
});

const deleteSchema = Joi.object({
  reason: Joi.string().max(500).default('user_requested_erasure')
});

router.use(authenticate);

router.get('/:userId', validateParams(userIdParam), usersController.getUser);
router.patch(
  '/:userId',
  validateParams(userIdParam),
  validateBody(updateUserSchema),
  usersController.updateUser
);
router.get(
  '/:userId/export',
  validateParams(userIdParam),
  validateQuery(exportQuerySchema),
  usersController.exportUserData
);
router.delete(
  '/:userId',
  validateParams(userIdParam),
  validateBody(deleteSchema),
  usersController.deleteUserData
);

module.exports = router;
