import type { TimelineEvent } from './types'

/** Relative timestamps so 7d / 30d filters stay meaningful. */
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString()
}

function daysAgo(d: number): string {
  return hoursAgo(d * 24)
}

const alice = {
  id: 'u_alice',
  name: 'Alice Chen',
  email: 'alice@example.com',
  role: 'project-manager' as const,
}

const bob = {
  id: 'u_bob',
  name: 'Bob Rivera',
  email: 'bob@example.com',
  role: 'coder' as const,
}

const cara = {
  id: 'u_cara',
  name: 'Cara Nguyen',
  email: 'cara@example.com',
  role: 'coder' as const,
}

const dan = {
  id: 'u_dan',
  name: 'Dan Okonkwo',
  email: 'dan@example.com',
  role: 'coder' as const,
}

/**
 * Rich mock feed covering every renderer / event type for UI development.
 * Sorted newest-first.
 */
const RAW_EVENTS: TimelineEvent[] = [
  {
    id: 'ev_coding_bob',
    type: 'coding.activity',
    renderer: 'coding',
    createdAt: hoursAgo(2),
    actor: bob,
    summary: 'Completed 5 coding tasks',
    payload: {
      completedCount: 5,
      tasks: [
        {
          taskId: 't1',
          title: 'Interview clip — school climate',
          taskType: 'video',
          completedAt: hoursAgo(2.1),
        },
        {
          taskId: 't2',
          title: 'Policy memo excerpt',
          taskType: 'pdf',
          completedAt: hoursAgo(3),
        },
        {
          taskId: 't3',
          title: 'Focus group audio #12',
          taskType: 'audio',
          completedAt: hoursAgo(4),
        },
        {
          taskId: 't4',
          title: 'Classroom photo set A',
          taskType: 'image',
          completedAt: hoursAgo(5),
        },
        {
          taskId: 't5',
          title: 'Open response: equity',
          taskType: 'text',
          completedAt: hoursAgo(6),
        },
      ],
    },
  },
  {
    id: 'ev_tag_updated',
    type: 'tag.group_updated',
    renderer: 'tag',
    createdAt: hoursAgo(5),
    actor: alice,
    summary: 'Updated tag group Sentiment',
    payload: {
      change: {
        groupId: 'tg_sentiment',
        groupName: 'Sentiment',
        nameChanged: { from: 'Tone', to: 'Sentiment' },
        before: {
          id: 'tg_sentiment',
          name: 'Tone',
          options: [
            { id: 'o1', label: 'Positive' },
            { id: 'o2', label: 'Neutral' },
            { id: 'o3', label: 'Negative' },
          ],
        },
        after: {
          id: 'tg_sentiment',
          name: 'Sentiment',
          options: [
            { id: 'o1', label: 'Positive' },
            { id: 'o2', label: 'Neutral' },
            { id: 'o4', label: 'Mixed' },
            { id: 'o5', label: 'Unclear' },
          ],
        },
        addedOptions: [
          { id: 'o4', label: 'Mixed' },
          { id: 'o5', label: 'Unclear' },
        ],
        removedOptions: [{ id: 'o3', label: 'Negative' }],
        renamedOptions: [],
      },
    },
  },
  {
    id: 'ev_file_upload',
    type: 'file.uploaded',
    renderer: 'file',
    createdAt: hoursAgo(8),
    actor: alice,
    summary: 'Uploaded 4 tasks',
    payload: {
      count: 4,
      files: [
        { taskId: 't10', title: 'Board meeting.pdf', mediaType: 'pdf' },
        { taskId: 't11', title: 'hallway.mp4', mediaType: 'video' },
        { taskId: 't12', title: 'bell.mp3', mediaType: 'audio' },
        { taskId: 't13', title: 'poster.jpg', mediaType: 'image' },
      ],
    },
  },
  {
    id: 'ev_member_approved',
    type: 'member.approved',
    renderer: 'member',
    createdAt: hoursAgo(12),
    actor: alice,
    summary: 'Approved Cara Nguyen to join as coder',
    payload: {
      applicant: cara,
      asRole: 'coder',
    },
  },
  {
    id: 'ev_member_applied',
    type: 'member.applied',
    renderer: 'member',
    createdAt: hoursAgo(20),
    actor: cara,
    summary: 'Applied to join the project',
    payload: {
      message: 'Happy to help with PDF and interview coding this semester.',
    },
  },
  {
    id: 'ev_coding_cara',
    type: 'coding.activity',
    renderer: 'coding',
    createdAt: daysAgo(2),
    actor: cara,
    summary: 'Completed 2 coding tasks',
    payload: {
      completedCount: 2,
      tasks: [
        {
          taskId: 't20',
          title: 'Staff handbook §3',
          taskType: 'pdf',
          completedAt: daysAgo(2),
        },
        {
          taskId: 't21',
          title: 'Parent survey comment #8',
          taskType: 'text',
          completedAt: daysAgo(2.05),
        },
      ],
    },
  },
  {
    id: 'ev_tag_created',
    type: 'tag.group_created',
    renderer: 'tag',
    createdAt: daysAgo(3),
    actor: alice,
    summary: 'Created tag group Theme',
    payload: {
      change: {
        groupId: 'tg_theme',
        groupName: 'Theme',
        group: {
          id: 'tg_theme',
          name: 'Theme',
          options: [
            { id: 'th1', label: 'Equity' },
            { id: 'th2', label: 'Safety' },
            { id: 'th3', label: 'Instruction' },
            { id: 'th4', label: 'Community' },
          ],
        },
        addedOptions: [
          { id: 'th1', label: 'Equity' },
          { id: 'th2', label: 'Safety' },
          { id: 'th3', label: 'Instruction' },
          { id: 'th4', label: 'Community' },
        ],
      },
    },
  },
  {
    id: 'ev_member_assigned',
    type: 'member.assigned',
    renderer: 'member',
    createdAt: daysAgo(3.2),
    actor: alice,
    summary: 'Assigned 6 tasks to Bob Rivera',
    payload: {
      assignee: bob,
      taskCount: 6,
      taskTitles: [
        'Interview clip — school climate',
        'Policy memo excerpt',
        'Focus group audio #12',
        'Classroom photo set A',
        'Open response: equity',
        'Hallway observation notes',
      ],
    },
  },
  {
    id: 'ev_icr',
    type: 'icr.resolved',
    renderer: 'icr',
    createdAt: daysAgo(4),
    actor: alice,
    summary: 'Resolved ICR conflict on Policy memo excerpt',
    payload: {
      taskId: 't2',
      taskTitle: 'Policy memo excerpt',
      coders: [bob, cara],
      resolution: 'Kept Sentiment → Mixed; Theme → Equity',
    },
  },
  {
    id: 'ev_export',
    type: 'export.completed',
    renderer: 'export',
    createdAt: daysAgo(5),
    actor: alice,
    summary: 'Exported complete project package',
    payload: {
      exportKind: 'complete-zip',
      fileName: 'OpenCoder_export_2026-08-03.zip',
    },
  },
  {
    id: 'ev_file_deleted',
    type: 'file.deleted',
    renderer: 'file',
    createdAt: daysAgo(6),
    actor: alice,
    summary: 'Deleted 1 task',
    payload: {
      count: 1,
      files: [{ taskId: 't99', title: 'duplicate_upload.mp4', mediaType: 'video' }],
    },
  },
  {
    id: 'ev_member_rejected',
    type: 'member.rejected',
    renderer: 'member',
    createdAt: daysAgo(8),
    actor: alice,
    summary: 'Rejected application from Dan Okonkwo',
    payload: {
      applicant: dan,
      reason: 'Cohort already full for this wave',
    },
  },
  {
    id: 'ev_tag_deleted',
    type: 'tag.group_deleted',
    renderer: 'tag',
    createdAt: daysAgo(10),
    actor: alice,
    summary: 'Deleted tag group Legacy codes',
    payload: {
      change: {
        groupId: 'tg_legacy',
        groupName: 'Legacy codes',
        group: {
          id: 'tg_legacy',
          name: 'Legacy codes',
          options: [
            { id: 'l1', label: 'Old-A' },
            { id: 'l2', label: 'Old-B' },
          ],
        },
        removedOptions: [
          { id: 'l1', label: 'Old-A' },
          { id: 'l2', label: 'Old-B' },
        ],
      },
    },
  },
  {
    id: 'ev_project_created',
    type: 'project.created',
    renderer: 'project',
    createdAt: daysAgo(14),
    actor: alice,
    summary: 'Created project School Climate Study',
    payload: {
      projectName: 'School Climate Study',
      projectId: 'p_demo',
      memo: 'Exploratory coding of school climate interviews across three districts.',
    },
  },
  {
    id: 'ev_coding_old',
    type: 'coding.activity',
    renderer: 'coding',
    createdAt: daysAgo(22),
    actor: bob,
    summary: 'Completed 3 coding tasks',
    payload: {
      completedCount: 3,
      tasks: [
        {
          taskId: 't30',
          title: 'Pilot item 1',
          taskType: 'text',
          completedAt: daysAgo(22),
        },
        {
          taskId: 't31',
          title: 'Pilot item 2',
          taskType: 'text',
          completedAt: daysAgo(22.1),
        },
        {
          taskId: 't32',
          title: 'Pilot item 3',
          taskType: 'image',
          completedAt: daysAgo(22.2),
        },
      ],
    },
  },
]

export const EXAMPLE_TIMELINE_EVENTS: TimelineEvent[] = [...RAW_EVENTS].sort(
  (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
)
