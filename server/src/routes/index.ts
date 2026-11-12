import { Router } from 'express';
import assessments from './assessments';
import attendance from './attendance';
import auth from './auth';
import dashboard from './dashboard';
import homework from './homework';
import schedule from './schedule';
import grades from './grades';
import grading from './grading';
import groups from './groups';
import payments from './payments';
import students from './students';
import materials from './materials';
import subjects from './subjects';
import topics from './topics';
import teachers from './teachers';

const router = Router();

router.use('/auth', auth);
router.use('/subjects', subjects);
router.use('/teachers', teachers);
router.use('/students', students);
router.use('/groups', groups);
router.use('/topics', topics);
router.use('/materials', materials);
router.use('/grading-schemes', grading);
router.use('/grades', grades);
router.use('/assessments', assessments);
router.use('/homework', homework);
router.use('/schedule', schedule);
router.use('/attendance', attendance);
router.use('/payments', payments);
router.use('/dashboard', dashboard);

export default router;
