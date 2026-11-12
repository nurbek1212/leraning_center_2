import { Router } from 'express';
import * as ctrl from '../controllers/homeworkController';
import { authenticate } from '../middlewares/auth';
import { allowRoles } from '../middlewares/role';
import { validate } from '../middlewares/validate';
import {
  createHomeworkSchema,
  homeworkListQuery,
  homeworkReviewSchema,
  homeworkStudentParam,
  homeworkSubmitSchema,
  idParam,
  updateHomeworkSchema,
} from '../validators';

const router = Router();
router.use(authenticate);

// Talaba (/my yo'llari /:id dan oldin)
router.get('/my', allowRoles('student'), ctrl.myList);
router.get('/my/:id', allowRoles('student'), validate(idParam, 'params'), ctrl.myOne);
router.put('/my/:id/submit', allowRoles('student'), validate(idParam, 'params'), validate(homeworkSubmitSchema), ctrl.submit);

// Ustoz / admin
const staff = allowRoles('admin', 'teacher');
router.get('/', staff, validate(homeworkListQuery, 'query'), ctrl.list);
router.post('/', staff, validate(createHomeworkSchema), ctrl.create);
router.get('/:id', staff, validate(idParam, 'params'), ctrl.getOne);
router.put('/:id', staff, validate(idParam, 'params'), validate(updateHomeworkSchema), ctrl.update);
router.delete('/:id', staff, validate(idParam, 'params'), ctrl.remove);
router.put('/:id/submissions/:studentId', staff, validate(homeworkStudentParam, 'params'), validate(homeworkReviewSchema), ctrl.review);

export default router;
