import express, { Router } from 'express';
import * as materials from '../controllers/materialController';
import * as ctrl from '../controllers/topicController';
import { authenticate } from '../middlewares/auth';
import { allowRoles } from '../middlewares/role';
import { validate } from '../middlewares/validate';
import { idParam, materialUploadQuery, subjectIdParam, topicSchema } from '../validators';
import { MAX_FILE_BYTES } from '../utils/materials';

const router = Router();

router.use(authenticate);

router.get('/my', allowRoles('teacher', 'student'), ctrl.myList);
router.get('/subject/:subjectId', validate(subjectIdParam, 'params'), ctrl.listBySubject);

// Yozish: admin va ustoz (fanga kirish huquqi controller ichida tekshiriladi)
router.post('/subject/:subjectId', allowRoles('admin', 'teacher'), validate(subjectIdParam, 'params'), validate(topicSchema), ctrl.create);
router.put('/:id', allowRoles('admin', 'teacher'), validate(idParam, 'params'), validate(topicSchema), ctrl.update);
router.delete('/:id', allowRoles('admin', 'teacher'), validate(idParam, 'params'), ctrl.remove);

// Fayl tanasi xom (raw) holda keladi; hajm chegarasi shu yerda ham qo'yiladi
router.post(
  '/:id/materials',
  allowRoles('admin', 'teacher'),
  validate(idParam, 'params'),
  validate(materialUploadQuery, 'query'),
  express.raw({ type: () => true, limit: MAX_FILE_BYTES }),
  materials.upload
);

export default router;
