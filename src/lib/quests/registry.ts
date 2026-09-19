import type { TutorialQuest, TutorialQuestId, QuestCatalogEntry } from './types'
import { SNACK_QUEST_STEPS } from './snack'
import { PIPELINE_QUEST_STEPS } from './pipeline'
import { ENCODING_QUEST_STEPS } from './encoding'
import { PARALLEL_QUEST_STEPS } from './parallel'
import { WRITERS_ROOM_QUEST_STEPS } from './writers-room'
import { URL_DETECTIVE_QUEST_STEPS } from './url-detective'
import { VOICE_BOOTH_QUEST_STEPS } from './voice-booth'
import { CAPTURE_DESK_QUEST_STEPS } from './capture-desk'

export const TUTORIAL_QUESTS: Record<TutorialQuestId, TutorialQuest> = {
  snack: {
    id: 'snack',
    title: 'Late-Night Snack Investigator',
    subtitle: 'Chat → Web Scraper → Agent',
    steps: SNACK_QUEST_STEPS,
  },
  pipeline: {
    id: 'pipeline',
    title: 'Data Pipeline Apprentice',
    subtitle: 'Chat → JSON Tool → Custom Script → Agent',
    steps: PIPELINE_QUEST_STEPS,
  },
  encoding: {
    id: 'encoding',
    title: 'Encoding Chain',
    subtitle: 'Chat → Base64 Encode → Base64 Decode → Agent',
    steps: ENCODING_QUEST_STEPS,
  },
  parallel: {
    id: 'parallel',
    title: 'Parallel Context',
    subtitle: 'Chat + Date & Time → Agent Context',
    steps: PARALLEL_QUEST_STEPS,
  },
  'writers-room': {
    id: 'writers-room',
    title: "Writer's Room",
    subtitle: 'Chat → Agent (writer) → Agent (editor)',
    steps: WRITERS_ROOM_QUEST_STEPS,
  },
  'url-detective': {
    id: 'url-detective',
    title: 'URL Detective',
    subtitle: 'Chat → Parse URL → Agent',
    steps: URL_DETECTIVE_QUEST_STEPS,
  },
  'voice-booth': {
    id: 'voice-booth',
    title: 'Voice Booth',
    subtitle: 'Chat → Agent → Speech (TTS)',
    steps: VOICE_BOOTH_QUEST_STEPS,
  },
  'capture-desk': {
    id: 'capture-desk',
    title: 'Capture Desk',
    subtitle: 'Date & Time + UUID → Agent → Text Output',
    steps: CAPTURE_DESK_QUEST_STEPS,
  },
}

export const QUEST_IDS = Object.keys(TUTORIAL_QUESTS) as TutorialQuestId[]

export function getQuestCatalog(): QuestCatalogEntry[] {
  const quests = TUTORIAL_QUESTS
  return [
    {
      id: 'snack',
      step: '1',
      shortLabel: 'Snack Investigator',
      title: quests.snack.title,
      flow: quests.snack.subtitle,
      description: 'Best first quest — scrape a page and get an AI verdict.',
      category: 'basics',
      featured: true,
    },
    {
      id: 'pipeline',
      step: '2',
      shortLabel: 'Pipeline Apprentice',
      title: quests.pipeline.title,
      flow: quests.pipeline.subtitle,
      description: 'Typed ports lesson plus sandbox scripting.',
      category: 'basics',
    },
    {
      id: 'encoding',
      step: '3',
      shortLabel: 'Encoding Chain',
      title: quests.encoding.title,
      flow: quests.encoding.subtitle,
      description: 'Short chain through manifest presets.',
      category: 'basics',
    },
    {
      id: 'parallel',
      step: '4',
      shortLabel: 'Parallel Context',
      title: quests.parallel.title,
      flow: quests.parallel.subtitle,
      description: 'Wire tools in parallel to Agent Context alongside Chat.',
      category: 'basics',
    },
    {
      id: 'writers-room',
      step: '5',
      shortLabel: "Writer's Room",
      title: quests['writers-room'].title,
      flow: quests['writers-room'].subtitle,
      description: 'Multi-agent chain — writer drafts, editor polishes.',
      category: 'advanced',
    },
    {
      id: 'url-detective',
      step: '6',
      shortLabel: 'URL Detective',
      title: quests['url-detective'].title,
      flow: quests['url-detective'].subtitle,
      description: 'Parse a URL into structured JSON context.',
      category: 'advanced',
    },
    {
      id: 'voice-booth',
      step: '7',
      shortLabel: 'Voice Booth',
      title: quests['voice-booth'].title,
      flow: quests['voice-booth'].subtitle,
      description: 'Post-agent Speech tool with browser TTS.',
      category: 'advanced',
    },
    {
      id: 'capture-desk',
      step: '8',
      shortLabel: 'Capture Desk',
      title: quests['capture-desk'].title,
      flow: quests['capture-desk'].subtitle,
      description: 'No-chat workflow with Text Output capture sink.',
      category: 'advanced',
    },
  ]
}

export function getTutorialQuest(questId: TutorialQuestId): TutorialQuest {
  return TUTORIAL_QUESTS[questId]
}

export function getQuestSteps(questId: TutorialQuestId) {
  return getTutorialQuest(questId).steps
}

export function getTutorialCompletedKey(questId: TutorialQuestId): string {
  return `brainwire-tutorial-${questId}-completed`
}

/** @deprecated Use getTutorialCompletedKey('snack') */
export const LEGACY_TUTORIAL_COMPLETED_KEY = 'brainwire-tutorial-completed'

/** All quest step arrays — for integrity tests and tooling. */
export function getAllQuestSteps(): { questId: TutorialQuestId; steps: TutorialQuest['steps'] }[] {
  return QUEST_IDS.map((questId) => ({
    questId,
    steps: TUTORIAL_QUESTS[questId].steps,
  }))
}
