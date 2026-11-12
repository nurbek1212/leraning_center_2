import admin from './admin';
import assess from './assess';
import auth from './auth';
import common from './common';
import grading from './grading';
import homework from './homework';
import layout from './layout';
import materials from './materials';
import payments from './payments';
import student from './student';
import teacher from './teacher';
import type { Dict, Fragment } from './types';

const fragments: Fragment[] = [common, layout, auth, admin, grading, payments, materials, teacher, student, assess, homework];

function merge(lang: 'uz' | 'ru' | 'en'): Dict {
  const out: Dict = {};
  for (const f of fragments) Object.assign(out, f[lang]);
  return out;
}

export const messages: Record<'uz' | 'ru' | 'en', Dict> = {
  uz: merge('uz'),
  ru: merge('ru'),
  en: merge('en'),
};
