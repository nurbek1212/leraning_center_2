import { Router } from 'express';
import * as ctrl from '../controllers/authController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { changePasswordSchema, loginSchema } from '../validators';

const router = Router();

router.post('/login', validate(loginSchema), ctrl.login);
router.get('/me', authenticate, ctrl.me);
router.post('/change-password', authenticate, validate(changePasswordSchema), ctrl.changePassword);

export default router;
