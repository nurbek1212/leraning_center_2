import Badge, { Tone } from '../../components/Badge';
import { assessFormatLabel, assessStatusLabel, stageLabel } from '../../utils/format';
import type { AssessmentFormat, AssessmentStage, AssessmentStatus } from '../../types';

const stageTone: Record<AssessmentStage, Tone> = { current: 'blue', midterm: 'amber', final: 'red' };
const statusTone: Record<AssessmentStatus, Tone> = { draft: 'gray', open: 'green', closed: 'amber' };

export const StageBadge = ({ stage }: { stage: AssessmentStage }) => <Badge tone={stageTone[stage]}>{stageLabel(stage)}</Badge>;
export const StatusBadge = ({ status }: { status: AssessmentStatus }) => (
  <Badge tone={statusTone[status]} dot>
    {assessStatusLabel(status)}
  </Badge>
);
export const FormatBadge = ({ format }: { format: AssessmentFormat }) => <Badge>{assessFormatLabel(format)}</Badge>;
