import { Router } from 'express';
import * as ctrl from '../controllers/materialController';
import { authenticate } from '../middlewares/auth';
import { allowRoles } from '../middlewares/role';
import { validate } from '../middlewares/validate';
import { idParam } from '../validators';

const router = Router();

router.use(authenticate);
router.get('/:id/download', validate(idParam, 'params'), ctrl.download);
router.delete('/:id', allowRoles('admin', 'teacher'), validate(idParam, 'params'), ctrl.remove);

export default router;
