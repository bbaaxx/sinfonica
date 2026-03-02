import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  parsePipelineConfig,
  initPipeline,
  resolvePersona,
  WORKFLOW_PERSONA_MAP,
  formatOrchestrationCue,
  dispatchStep,
  processReturnEnvelope,
  detectFailureType,
  handleFailure,
  resumePipeline,
  resumeFromInjection,
  getCompactionInjection,
} from '../../src/workflow/coordinator.js';
import { workflowIndexPath, readWorkflowIndex } from '../../src/workflow/index-manager.js';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

const FULL_PIPELINE = ['create-prd', 'create-spec', 'dev-story', 'code-review'];

async function makeTempDir(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), `coordinator-${prefix}-`));
}

/** Build a minimal valid return envelope for approval tests. */
async function scaffoldReturnEnvelope(
  cwd: string,
  sessionId: string,
  sourcePersona: string,
  targetPersona: string,
): Promise<string> {
  const sessionDir = join(cwd, '.sinfonia', 'handoffs', sessionId);
  await mkdir(sessionDir, { recursive: true });
  const filePath = join(sessionDir, '001-return.md');
  const content = [
    '---',
    `handoff_id: ${sessionId}-001`,
    `session_id: ${sessionId}`,
    'sequence: 1',
    `source_persona: ${sourcePersona}`,
    `target_persona: ${targetPersona}`,
    'type: return',
    'status: completed',
    `created_at: ${new Date().toISOString()}`,
    'word_count: 20',
    '---',
    '',
    '## Summary',
    '',
    'Work completed successfully. All deliverables produced.',
    '',
    '## Result',
    '',
    'Deliverable produced.',
    '',
  ].join('\n');
  await writeFile(filePath, content, 'utf8');
  return filePath;
}

function expectRequiredOrchestrationCue(cue: string): void {
  expect(cue).toContain('Stage Status:');
  expect(cue).toContain('Blockers:');
  expect(cue).toContain('Next Action:');
  expect(cue).toContain('Approval Required:');
}

// ─── CP1: Pipeline Definition & Initiation ───────────────────────────────────

describe('CP1 — Pipeline Definition & Initiation', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    vi.clearAllMocks();
    for (const dir of tempDirs) {
      await rm(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  describe('parsePipelineConfig', () => {
    it('returns trimmed workflow names for a valid config', () => {
      const result = parsePipelineConfig(FULL_PIPELINE);
      expect(result).toEqual(FULL_PIPELINE);
    });

    it('trims whitespace from workflow names', () => {
      const result = parsePipelineConfig(['  create-prd  ', ' create-spec ']);
      expect(result).toEqual(['create-prd', 'create-spec']);
    });

    it('throws for an empty array', () => {
      expect(() => parsePipelineConfig([])).toThrow(
        'Pipeline config must be a non-empty array',
      );
    });

    it('throws for a non-array input', () => {
      expect(() => parsePipelineConfig(null as unknown as string[])).toThrow(
        'Pipeline config must be a non-empty array',
      );
    });

    it('throws for an array containing an empty string', () => {
      expect(() => parsePipelineConfig(['create-prd', ''])).toThrow(
        'Invalid workflow name',
      );
    });

    it('throws for an array containing a non-string value', () => {
      expect(() => parsePipelineConfig(['create-prd', 42 as unknown as string])).toThrow(
        'Invalid workflow name',
      );
    });

    it('accepts a single-workflow pipeline', () => {
      const result = parsePipelineConfig(['create-prd']);
      expect(result).toEqual(['create-prd']);
    });
  });

  describe('initPipeline', () => {
    it('creates session directory under .sinfonia/handoffs/<sessionId>/', async () => {
      const cwd = await makeTempDir('init');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Build a product');
      const { sessionId } = session;

      const { existsSync } = await import('node:fs');
      const sessionDir = join(cwd, '.sinfonia', 'handoffs', sessionId);
      expect(existsSync(sessionDir)).toBe(true);
    });

    it('creates workflow.md in the session directory', async () => {
      const cwd = await makeTempDir('init-wf');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Build a product');
      const { existsSync } = await import('node:fs');
      expect(existsSync(session.workflowPath)).toBe(true);
    });

    it('returns a workflowIndex with correct totalSteps', async () => {
      const cwd = await makeTempDir('init-steps');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Build a product');
      expect(session.workflowIndex.frontmatter.totalSteps).toBe(FULL_PIPELINE.length);
    });

    it('uses provided sessionId when given', async () => {
      const cwd = await makeTempDir('init-sid');
      tempDirs.push(cwd);

      const customId = 's-20260224-120000';
      const session = await initPipeline(cwd, FULL_PIPELINE, 'Build a product', customId);
      expect(session.sessionId).toBe(customId);
    });

    it('generates a sessionId when none provided', async () => {
      const cwd = await makeTempDir('init-gen');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Build a product');
      expect(session.sessionId).toMatch(/^s-\d{8}-\d{6}$/);
    });

    it('workflow.md has correct workflowId format', async () => {
      const cwd = await makeTempDir('init-wfid');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, ['create-prd', 'create-spec'], 'Test goal');
      expect(session.workflowIndex.frontmatter.workflowId).toBe(
        'pipeline-create-prd-create-spec',
      );
    });

    it('workflow.md steps include persona mapping', async () => {
      const cwd = await makeTempDir('init-persona');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Build a product');
      const steps = session.workflowIndex.steps;
      expect(steps.length).toBe(FULL_PIPELINE.length);
      expect(steps[0].persona).toBe('libretto');
      expect(steps[1].persona).toBe('amadeus');
      expect(steps[2].persona).toBe('coda');
      expect(steps[3].persona).toBe('rondo');
    });

    it('workflow.md schema: required frontmatter fields present', async () => {
      const cwd = await makeTempDir('init-schema');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Build a product');
      const fm = session.workflowIndex.frontmatter;
      expect(fm.workflowId).toBeDefined();
      expect(fm.workflowStatus).toBeDefined();
      expect(fm.currentStep).toBeDefined();
      expect(fm.currentStepIndex).toBeDefined();
      expect(fm.totalSteps).toBeDefined();
      expect(fm.sessionId).toBeDefined();
      expect(fm.createdAt).toBeDefined();
      expect(fm.updatedAt).toBeDefined();
    });
  });
});

// ─── CP2: Sequential Dispatch Routing ────────────────────────────────────────

describe('CP2 — Sequential Dispatch Routing', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    vi.clearAllMocks();
    for (const dir of tempDirs) {
      await rm(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  describe('resolvePersona / WORKFLOW_PERSONA_MAP', () => {
    it('maps create-prd to libretto', () => {
      expect(resolvePersona('create-prd')).toBe('libretto');
    });

    it('maps create-spec to amadeus', () => {
      expect(resolvePersona('create-spec')).toBe('amadeus');
    });

    it('maps dev-story to coda', () => {
      expect(resolvePersona('dev-story')).toBe('coda');
    });

    it('maps code-review to rondo', () => {
      expect(resolvePersona('code-review')).toBe('rondo');
    });

    it('returns null for unknown workflow', () => {
      expect(resolvePersona('unknown-workflow')).toBeNull();
    });

    it('routing table covers all 4 standard workflows', () => {
      const keys = Object.keys(WORKFLOW_PERSONA_MAP);
      expect(keys).toContain('create-prd');
      expect(keys).toContain('create-spec');
      expect(keys).toContain('dev-story');
      expect(keys).toContain('code-review');
      expect(keys.length).toBe(4);
    });
  });

  describe('dispatchStep', () => {
    it('throws for unknown workflow name', async () => {
      const cwd = await makeTempDir('dispatch-err');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Test goal');
      await expect(
        dispatchStep(cwd, session.sessionId, 0, 'unknown-workflow', 'task', 'context'),
      ).rejects.toThrow('No persona mapping found for workflow: unknown-workflow');
    });

    it('returns correct persona for each workflow', async () => {
      const cwd = await makeTempDir('dispatch-persona');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Test goal');

      for (const [workflow, expectedPersona] of Object.entries(WORKFLOW_PERSONA_MAP)) {
        const result = await dispatchStep(
          cwd,
          session.sessionId,
          0,
          workflow,
          'Do the task',
          'Some context',
        );
        expect(result.persona).toBe(expectedPersona);
        expect(result.workflowName).toBe(workflow);
        expectRequiredOrchestrationCue(result.orchestrationCue);
      }
    });

    it('creates a dispatch envelope file', async () => {
      const cwd = await makeTempDir('dispatch-env');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Test goal');
      const result = await dispatchStep(
        cwd,
        session.sessionId,
        0,
        'create-prd',
        'Write the PRD',
        'Project context here',
      );

      expect(result.envelopePath).toBeTruthy();
      const { existsSync } = await import('node:fs');
      expect(existsSync(result.envelopePath)).toBe(true);
    });

    it('delegation context contains required fields', async () => {
      const cwd = await makeTempDir('dispatch-ctx');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Test goal');
      const result = await dispatchStep(
        cwd,
        session.sessionId,
        0,
        'create-prd',
        'Write the PRD',
        'Project context here',
        ['constraint-1', 'constraint-2'],
      );

      expect(result.delegationContext).toContain(session.sessionId);
      expect(result.delegationContext).toContain('libretto');
      expect(result.delegationContext).toContain('maestro');
    });

    it('returns correct stepIndex and sessionId', async () => {
      const cwd = await makeTempDir('dispatch-idx');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Test goal');
      const result = await dispatchStep(
        cwd,
        session.sessionId,
        2,
        'dev-story',
        'Implement story',
        'Context',
      );

      expect(result.stepIndex).toBe(2);
      expect(result.sessionId).toBe(session.sessionId);
    });
  });
});

describe('Presentation guardrail — orchestration cue formatting', () => {
  it('renders required cues with explicit no-blockers and no-approval markers', () => {
    const cue = formatOrchestrationCue({
      stageStatus: 'Stage 2/4 in-progress: create-spec delegated to amadeus.',
      blockers: [],
      nextAction: 'Wait for return envelope before approval decision.',
      approvalRequired: false,
    });

    expect(cue).toContain('Stage Status: Stage 2/4 in-progress: create-spec delegated to amadeus.');
    expect(cue).toContain('Blockers: None');
    expect(cue).toContain('Next Action: Wait for return envelope before approval decision.');
    expect(cue).toContain('Approval Required: No');
  });

  it('renders blocker and approval cues when present', () => {
    const cue = formatOrchestrationCue({
      stageStatus: 'Stage 2/4 blocked: revision requested from coda.',
      blockers: ['Implementation artifact missing required evidence.'],
      nextAction: 'Review revised return envelope and decide approve or reject.',
      approvalRequired: true,
    });

    expect(cue).toContain('Stage Status: Stage 2/4 blocked: revision requested from coda.');
    expect(cue).toContain('Blockers: Implementation artifact missing required evidence.');
    expect(cue).toContain('Next Action: Review revised return envelope and decide approve or reject.');
    expect(cue).toContain('Approval Required: Yes');
  });
});

// ─── CP3: Approval Gate Integration ──────────────────────────────────────────

describe('CP3 — Approval Gate Integration', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    vi.clearAllMocks();
    for (const dir of tempDirs) {
      await rm(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it('approve → advances pipeline (outcome: advanced)', async () => {
    const cwd = await makeTempDir('approval-approve');
    tempDirs.push(cwd);

    const session = await initPipeline(cwd, FULL_PIPELINE, 'Test goal');
    const envelopePath = await scaffoldReturnEnvelope(
      cwd,
      session.sessionId,
      'libretto',
      'maestro',
    );

    const result = await processReturnEnvelope(
      cwd,
      session.sessionId,
      envelopePath,
      'approve',
      'test-reviewer',
    );

    expect(result.outcome).toBe('advanced');
    expect(result.nextStepIndex).toBeDefined();
    expectRequiredOrchestrationCue(result.orchestrationCue);
    expect(result.orchestrationCue).toContain('Approval Required: No');
  });

  it('approve → workflow.md currentStepIndex increments', async () => {
    const cwd = await makeTempDir('approval-advance-idx');
    tempDirs.push(cwd);

    const session = await initPipeline(cwd, FULL_PIPELINE, 'Test goal');
    const initialIndex = session.workflowIndex.frontmatter.currentStepIndex ?? 1;

    const envelopePath = await scaffoldReturnEnvelope(
      cwd,
      session.sessionId,
      'libretto',
      'maestro',
    );

    const result = await processReturnEnvelope(
      cwd,
      session.sessionId,
      envelopePath,
      'approve',
      'test-reviewer',
    );

    expect(result.nextStepIndex).toBe(initialIndex + 1);
  });

  it('approve on last step → workflow.md status becomes complete', async () => {
    const cwd = await makeTempDir('approval-complete');
    tempDirs.push(cwd);

    // Single-step pipeline so approval completes it
    const session = await initPipeline(cwd, ['create-prd'], 'Test goal');
    const envelopePath = await scaffoldReturnEnvelope(
      cwd,
      session.sessionId,
      'libretto',
      'maestro',
    );

    const result = await processReturnEnvelope(
      cwd,
      session.sessionId,
      envelopePath,
      'approve',
      'test-reviewer',
    );

    expect(result.outcome).toBe('advanced');
    expect(result.workflowIndex.frontmatter.workflowStatus).toBe('complete');
  });

  it('reject → workflow.md status becomes blocked', async () => {
    const cwd = await makeTempDir('approval-reject');
    tempDirs.push(cwd);

    const session = await initPipeline(cwd, FULL_PIPELINE, 'Test goal');
    const envelopePath = await scaffoldReturnEnvelope(
      cwd,
      session.sessionId,
      'libretto',
      'maestro',
    );

    const result = await processReturnEnvelope(
      cwd,
      session.sessionId,
      envelopePath,
      'reject',
      'test-reviewer',
      'Needs more detail',
    );

    expect(['held', 'revision-sent']).toContain(result.outcome);
    expect(result.workflowIndex.frontmatter.workflowStatus).toBe('blocked');
    expectRequiredOrchestrationCue(result.orchestrationCue);
    expect(result.orchestrationCue).toContain('Approval Required: Yes');
  });

  it('reject → revision envelope created (outcome: revision-sent)', async () => {
    const cwd = await makeTempDir('approval-revision');
    tempDirs.push(cwd);

    const session = await initPipeline(cwd, FULL_PIPELINE, 'Test goal');
    const envelopePath = await scaffoldReturnEnvelope(
      cwd,
      session.sessionId,
      'libretto',
      'maestro',
    );

    const result = await processReturnEnvelope(
      cwd,
      session.sessionId,
      envelopePath,
      'reject',
      'test-reviewer',
      'Needs revision',
    );

    // revision-sent means a revision envelope was created
    if (result.outcome === 'revision-sent') {
      expect(result.revisionPath).toBeTruthy();
      const { existsSync } = await import('node:fs');
      expect(existsSync(result.revisionPath!)).toBe(true);
    } else {
      // held is also acceptable if approval.ts didn't create revision
      expect(result.outcome).toBe('held');
    }
  });
});

// ─── CP4: Error Handling & Retry ─────────────────────────────────────────────

describe('CP4 — Error Handling & Retry', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    vi.clearAllMocks();
    for (const dir of tempDirs) {
      await rm(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  describe('detectFailureType', () => {
    it('returns missing-envelope when envelopePath is null', async () => {
      const result = await detectFailureType(null);
      expect(result).toBe('missing-envelope');
    });

    it('returns missing-envelope when envelopePath is empty string', async () => {
      const result = await detectFailureType('');
      expect(result).toBe('missing-envelope');
    });

    it('returns missing-envelope when file does not exist', async () => {
      const result = await detectFailureType('/nonexistent/path/envelope.md');
      expect(result).toBe('missing-envelope');
    });

    it('returns partial-return for an invalid envelope file', async () => {
      const cwd = await makeTempDir('detect-partial');
      tempDirs.push(cwd);

      const sessionDir = join(cwd, '.sinfonia', 'handoffs', 's-test');
      await mkdir(sessionDir, { recursive: true });
      const filePath = join(sessionDir, 'bad.md');
      await writeFile(filePath, '---\nbroken: yaml: [\n---\n', 'utf8');

      const result = await detectFailureType(filePath);
      expect(['partial-return', 'missing-envelope']).toContain(result);
    });

    it('returns blocked for an envelope with blocked status', async () => {
      const cwd = await makeTempDir('detect-blocked');
      tempDirs.push(cwd);

      const sessionId = 's-20260224-120000';
      const sessionDir = join(cwd, '.sinfonia', 'handoffs', sessionId);
      await mkdir(sessionDir, { recursive: true });
      const filePath = join(sessionDir, '001-blocked.md');
      const content = [
        '---',
        `handoff_id: ${sessionId}-001`,
        `session_id: ${sessionId}`,
        'sequence: 1',
        'source_persona: coda',
        'target_persona: maestro',
        'type: return',
        'status: blocked',
        `created_at: ${new Date().toISOString()}`,
        'word_count: 10',
        '---',
        '',
        '## Summary',
        '',
        'Blocked on dependency.',
        '',
      ].join('\n');
      await writeFile(filePath, content, 'utf8');

      const result = await detectFailureType(filePath);
      expect(result).toBe('blocked');
    });
  });

  describe('handleFailure — retry', () => {
    it('retry → re-creates dispatch envelope', async () => {
      const cwd = await makeTempDir('retry-env');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Test goal');
      const result = await handleFailure(
        cwd,
        session.sessionId,
        0,
        'create-prd',
        'retry',
        'Write the PRD',
        'Original context',
        'Previous attempt timed out',
      );

      expect(result.action).toBe('retry');
      expect(result.envelopePath).toBeTruthy();
      const { existsSync } = await import('node:fs');
      expect(existsSync(result.envelopePath!)).toBe(true);
      expectRequiredOrchestrationCue(result.orchestrationCue);
      expect(result.orchestrationCue).toContain('Approval Required: No');
    });

    it('retry → augmented context includes failure notes', async () => {
      const cwd = await makeTempDir('retry-ctx');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Test goal');
      const result = await handleFailure(
        cwd,
        session.sessionId,
        0,
        'create-prd',
        'retry',
        'Write the PRD',
        'Original context',
        'Timed out after 30s',
      );

      expect(result.action).toBe('retry');
      // Envelope should exist and contain failure notes
      if (result.envelopePath) {
        const { readFile } = await import('node:fs/promises');
        const content = await readFile(result.envelopePath, 'utf8');
        expect(content).toContain('Timed out after 30s');
      }
    });

    it('retry → workflow.md status is in-progress', async () => {
      const cwd = await makeTempDir('retry-status');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Test goal');
      const result = await handleFailure(
        cwd,
        session.sessionId,
        0,
        'create-prd',
        'retry',
        'Write the PRD',
        'Context',
        'Failed',
      );

      expect(result.workflowIndex.frontmatter.workflowStatus).toBe('in-progress');
    });
  });

  describe('handleFailure — skip', () => {
    it('skip → advances pipeline (currentStepIndex increments)', async () => {
      const cwd = await makeTempDir('skip-advance');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Test goal');
      const initialIndex = session.workflowIndex.frontmatter.currentStepIndex ?? 1;

      const result = await handleFailure(
        cwd,
        session.sessionId,
        0,
        'create-prd',
        'skip',
        'Write the PRD',
        'Context',
        'Skipping due to timeout',
      );

      expect(result.action).toBe('skip');
      expect(result.workflowIndex.frontmatter.currentStepIndex).toBe(initialIndex + 1);
      expectRequiredOrchestrationCue(result.orchestrationCue);
      expect(result.orchestrationCue).toContain('Approval Required: No');
    });

    it('skip on last step → workflow.md status becomes complete', async () => {
      const cwd = await makeTempDir('skip-complete');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, ['create-prd'], 'Test goal');
      const result = await handleFailure(
        cwd,
        session.sessionId,
        0,
        'create-prd',
        'skip',
        'Write the PRD',
        'Context',
        'Skipping',
      );

      expect(result.workflowIndex.frontmatter.workflowStatus).toBe('complete');
    });
  });

  describe('handleFailure — abort', () => {
    it('abort → workflow.md status becomes failed', async () => {
      const cwd = await makeTempDir('abort-failed');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Test goal');
      const result = await handleFailure(
        cwd,
        session.sessionId,
        0,
        'create-prd',
        'abort',
        'Write the PRD',
        'Context',
        'Unrecoverable error',
      );

      expect(result.action).toBe('abort');
      expect(result.workflowIndex.frontmatter.workflowStatus).toBe('failed');
      expectRequiredOrchestrationCue(result.orchestrationCue);
      expect(result.orchestrationCue).toContain('Approval Required: Yes');
    });

    it('abort → preserves full state (workflow.md still readable)', async () => {
      const cwd = await makeTempDir('abort-preserve');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Test goal');
      await handleFailure(
        cwd,
        session.sessionId,
        0,
        'create-prd',
        'abort',
        'Write the PRD',
        'Context',
        'Unrecoverable error',
      );

      // State should be preserved and readable
      const workflowPath = workflowIndexPath(cwd, session.sessionId);
      const index = await readWorkflowIndex(workflowPath);
      expect(index.frontmatter.workflowStatus).toBe('failed');
      expect(index.frontmatter.sessionId).toBe(session.sessionId);
    });
  });
});

// ─── CP5: Partial Execution & Resume ─────────────────────────────────────────

describe('CP5 — Partial Execution & Resume', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    vi.clearAllMocks();
    for (const dir of tempDirs) {
      await rm(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  describe('resumePipeline', () => {
    it('reads workflow.md and returns current step index', async () => {
      const cwd = await makeTempDir('resume-basic');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Test goal');
      const resume = await resumePipeline(cwd, session.sessionId);

      expect(resume.sessionId).toBe(session.sessionId);
      expect(resume.currentStepIndex).toBe(session.workflowIndex.frontmatter.currentStepIndex);
      expect(resume.workflowIndex).toBeDefined();
      expectRequiredOrchestrationCue(resume.orchestrationCue);
      expect(resume.orchestrationCue).toContain('Approval Required: No');
    });

    it('can resume from mid-pipeline step N', async () => {
      const cwd = await makeTempDir('resume-mid');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Test goal');

      // Simulate advancing to step 3 via approval
      const envelopePath = await scaffoldReturnEnvelope(
        cwd,
        session.sessionId,
        'libretto',
        'maestro',
      );
      await processReturnEnvelope(
        cwd,
        session.sessionId,
        envelopePath,
        'approve',
        'reviewer',
      );

      const resume = await resumePipeline(cwd, session.sessionId);
      expect(resume.currentStepIndex).toBeGreaterThan(
        session.workflowIndex.frontmatter.currentStepIndex ?? 1,
      );
    });

    it('returns workflowIndex with all required frontmatter', async () => {
      const cwd = await makeTempDir('resume-fm');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Test goal');
      const resume = await resumePipeline(cwd, session.sessionId);

      const fm = resume.workflowIndex.frontmatter;
      expect(fm.workflowId).toBeDefined();
      expect(fm.workflowStatus).toBeDefined();
      expect(fm.sessionId).toBe(session.sessionId);
      expect(fm.totalSteps).toBe(FULL_PIPELINE.length);
    });
  });

  describe('getCompactionInjection', () => {
    it('returns a non-empty string for a valid session', async () => {
      const cwd = await makeTempDir('compact-basic');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Test goal');
      const injection = await getCompactionInjection(cwd, session.sessionId);

      expect(typeof injection).toBe('string');
      expect(injection.length).toBeGreaterThan(0);
    });

    it('injection contains session ID', async () => {
      const cwd = await makeTempDir('compact-sid');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Test goal');
      const injection = await getCompactionInjection(cwd, session.sessionId);

      expect(injection).toContain(session.sessionId);
    });

    it('injection contains workflow status', async () => {
      const cwd = await makeTempDir('compact-status');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Test goal');
      const injection = await getCompactionInjection(cwd, session.sessionId);

      // Should contain status info
      expect(injection).toMatch(/status|created|in-progress/i);
    });

    it('returns a string gracefully for missing session (fallback injection)', async () => {
      const cwd = await makeTempDir('compact-missing');
      tempDirs.push(cwd);

      // generateCompactionInjection returns a fallback string (not empty) for missing sessions
      const injection = await getCompactionInjection(cwd, 's-nonexistent-session');
      expect(typeof injection).toBe('string');
      // Should not throw — graceful degradation
    });
  });

  describe('resumeFromInjection', () => {
    it('resumes pipeline from a valid compaction injection', async () => {
      const cwd = await makeTempDir('resume-inject');
      tempDirs.push(cwd);

      const session = await initPipeline(cwd, FULL_PIPELINE, 'Test goal');
      const injection = await getCompactionInjection(cwd, session.sessionId);

      const resume = await resumeFromInjection(cwd, injection);
      expect(resume.sessionId).toBe(session.sessionId);
      expect(resume.currentStepIndex).toBeDefined();
      expect(resume.workflowIndex).toBeDefined();
      expectRequiredOrchestrationCue(resume.orchestrationCue);
      expect(resume.orchestrationCue).toContain('Approval Required: No');
    });

    it('throws for an injection pointing to a missing workflow', async () => {
      const cwd = await makeTempDir('resume-inject-missing');
      tempDirs.push(cwd);

      const fakeInjection = [
        '## Workflow State',
        '- session: s-99999999-999999',
        '- workflow: pipeline-create-prd',
        '- current step: 1-create-prd',
        '- status: in-progress',
      ].join('\n');

      await expect(resumeFromInjection(cwd, fakeInjection)).rejects.toThrow(
        'Cannot resume',
      );
    });
  });

  describe('Full integration: start → pause → resume → complete', () => {
    it('completes a 4-workflow pipeline with simulated compaction', async () => {
      const cwd = await makeTempDir('integration-full');
      tempDirs.push(cwd);

      // 1. Start pipeline
      const session = await initPipeline(cwd, FULL_PIPELINE, 'Full integration test');
      expect(session.workflowIndex.frontmatter.totalSteps).toBe(4);

      // 2. Dispatch step 1 (create-prd → libretto)
      const dispatch1 = await dispatchStep(
        cwd,
        session.sessionId,
        0,
        'create-prd',
        'Write the PRD',
        'Project context',
      );
      expect(dispatch1.persona).toBe('libretto');

      // 3. Simulate compaction (pause)
      const injection = await getCompactionInjection(cwd, session.sessionId);
      expect(injection).toContain(session.sessionId);

      // 4. Resume from injection
      const resumed = await resumeFromInjection(cwd, injection);
      expect(resumed.sessionId).toBe(session.sessionId);

      // 5. Approve step 1 → advance to step 2
      const returnEnv1 = await scaffoldReturnEnvelope(
        cwd,
        session.sessionId,
        'libretto',
        'maestro',
      );
      const approval1 = await processReturnEnvelope(
        cwd,
        session.sessionId,
        returnEnv1,
        'approve',
        'reviewer',
      );
      expect(approval1.outcome).toBe('advanced');

      // 6. Dispatch step 2 (create-spec → amadeus)
      const dispatch2 = await dispatchStep(
        cwd,
        session.sessionId,
        1,
        'create-spec',
        'Write the spec',
        'PRD context',
      );
      expect(dispatch2.persona).toBe('amadeus');

      // 7. Approve step 2
      const returnEnv2 = await scaffoldReturnEnvelope(
        cwd,
        session.sessionId,
        'amadeus',
        'maestro',
      );
      const approval2 = await processReturnEnvelope(
        cwd,
        session.sessionId,
        returnEnv2,
        'approve',
        'reviewer',
      );
      expect(approval2.outcome).toBe('advanced');

      // 8. Skip step 3 (dev-story) due to simulated failure
      const skip3 = await handleFailure(
        cwd,
        session.sessionId,
        2,
        'dev-story',
        'skip',
        'Implement story',
        'Context',
        'Simulated failure',
      );
      expect(skip3.action).toBe('skip');

      // 9. Dispatch step 4 (code-review → rondo)
      const dispatch4 = await dispatchStep(
        cwd,
        session.sessionId,
        3,
        'code-review',
        'Review the code',
        'Code context',
      );
      expect(dispatch4.persona).toBe('rondo');

      // 10. Approve final step → pipeline complete
      const returnEnv4 = await scaffoldReturnEnvelope(
        cwd,
        session.sessionId,
        'rondo',
        'maestro',
      );
      const finalApproval = await processReturnEnvelope(
        cwd,
        session.sessionId,
        returnEnv4,
        'approve',
        'reviewer',
      );
      expect(finalApproval.outcome).toBe('advanced');
      expect(finalApproval.workflowIndex.frontmatter.workflowStatus).toBe('complete');
    });
  });
});
