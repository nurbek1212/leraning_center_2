import { Router } from 'express';
import * as staff from '../controllers/assessmentController';
import * as student from '../controllers/assessmentStudentController';
import { authenticate } from '../middlewares/auth';
import { allowRoles } from '../middlewares/role';
import { validate } from '../middlewares/validate';
import {
  assessmentComponentsQuery,
  assessmentListQuery,
  assessmentQuestionsSchema,
  assessmentScoreSchema,
  assessmentStatusSchema,
  assessmentStudentParam,
  assessmentSubmitSchema,
  createAssessmentSchema,
  idParam,
  updateAssessmentSchema,
} from '../validators';

const router = Router();
router.use(authenticate);

// ----- Talaba (/my yo'llari /:id dan oldin) -----
router.get('/my', allowRoles('student'), student.list);
router.get('/my/:id', allowRoles('student'), validate(idParam, 'params'), student.getOne);
router.post('/my/:id/start', allowRoles('student'), validate(idParam, 'params'), student.start);
router.post('/my/:id/submit', allowRoles('student'), validate(idParam, 'params'), validate(assessmentSubmitSchema), student.submit);

// ----- Ustoz / admin -----
const staffOnly = allowRoles('admin', 'teacher');
router.get('/components', staffOnly, validate(assessmentComponentsQuery, 'query'), staff.components);
router.get('/', staffOnly, validate(assessmentListQuery, 'query'), staff.list);
router.post('/', staffOnly, validate(createAssessmentSchema), staff.create);
router.get('/:id', staffOnly, validate(idParam, 'params'), staff.getOne);
router.put('/:id', staffOnly, validate(idParam, 'params'), validate(updateAssessmentSchema), staff.update);
router.delete('/:id', staffOnly, validate(idParam, 'params'), staff.remove);
router.post('/:id/status', staffOnly, validate(idParam, 'params'), validate(assessmentStatusSchema), staff.setStatus);
router.put('/:id/questions', staffOnly, validate(idParam, 'params'), validate(assessmentQuestionsSchema), staff.saveQuestions);
router.get('/:id/results', staffOnly, validate(idParam, 'params'), staff.results);
router.post('/:id/results/accept-suggested', staffOnly, validate(idParam, 'params'), staff.acceptSuggested);
router.put('/:id/results/:studentId', staffOnly, validate(assessmentStudentParam, 'params'), validate(assessmentScoreSchema), staff.setScore);
router.delete('/:id/results/:studentId/score', staffOnly, validate(assessmentStudentParam, 'params'), staff.clearScore);
router.delete('/:id/results/:studentId', staffOnly, validate(assessmentStudentParam, 'params'), staff.resetAttempt);
router.post('/:id/post-grades', staffOnly, validate(idParam, 'params'), staff.postGrades);

export default router;
