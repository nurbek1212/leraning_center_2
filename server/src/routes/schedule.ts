import { Router } from 'express';
import { mine } from '../controllers/scheduleController';
import { authenticate } from '../middlewares/auth';
import { allowRoles } from '../middlewares/role';

const router = Router();
router.get('/my', authenticate, allowRoles('teacher', 'student'), mine);

export default router;
