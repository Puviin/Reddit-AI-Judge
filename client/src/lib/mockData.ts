// ============================================================
// DRAMAFORGE SCOUT — MOCK DATA
// All data is fictional. No real usernames, real faces, or real people.
// ============================================================

export interface RawComment {
  id: string;
  text: string;
  platform: string;
  likes: number;
  unsafe?: boolean;
}

export interface AdaptionResult {
  safetyPass: boolean;
  safetyScore: number;
  conflictClarity: number;
  humorPotential: number;
  commentQuality: number;
  verdictDisagreement: number;
  recommendedForDemo: boolean;
  plaintiff: string;
  defendant: string;
  keyEvidence: string[];
  topFunnySafeComments: string[];
  filteredUnsafeCount: number;
}

export interface Story {
  id: string;
  title: string;
  source: string;
  community: string;
  summary: string;
  safetyScore: number;
  humorScore: number;
  conflictClarity: number;
  commentQuality: number;
  recommendationBadge: "HOT CASE" | "SOLID DRAMA" | "SPICY PICK" | "CROWD PLEASER";
  plaintiff: string;
  defendant: string;
  conflict: string;
  keyEvidence: string[];
  verdictDistribution: { guilty: number; notGuilty: number; bothWrong: number };
  topFunnySafeComments: string[];
  filteredCommentCount: number;
  rawComments: RawComment[];
  adaptionResult: AdaptionResult;
}

export interface Character {
  role: "Judge" | "Plaintiff" | "Defendant" | "Witness";
  name: string;
  visualDescription: string;
  personality: string;
  voiceStyle: string;
  argumentPosition: string;
  imageUrl: string;
}

export interface Scene {
  id: number;
  title: string;
  narration: string;
  speaker: string;
  speakerRole: string;
  duration: number; // seconds
  bgColor: string;
  accentColor: string;
}

export interface CourtroomLine {
  speaker: string;
  role: string;
  text: string;
  type: "opening" | "testimony" | "question" | "ruling";
}

export interface Verdict {
  winner: "Plaintiff" | "Defendant" | "Both Wrong" | "Both Right";
  reasoning: string;
  breakdown: { label: string; percentage: number; color: string }[];
  funniestJudgeQuote: string;
  lessonFromCase: string;
}

// ============================================================
// RAW MESSY DATA (before Adaption pipeline)
// ============================================================
export const rawMessyData = [
  { id: "r1", text: "omg did u see what he DID??? absolute clown behavior lmaooo 💀💀", platform: "Reddit", likes: 412, unsafe: false },
  { id: "r2", text: "NTA obviously but also kinda yta? idk man its complicated", platform: "Reddit", likes: 287, unsafe: false },
  { id: "r3", text: "bro really said 'i forgot' like that's an excuse 😭😭😭", platform: "Reddit", likes: 891, unsafe: false },
  { id: "r4", text: "[REMOVED BY MODERATORS]", platform: "Reddit", likes: 0, unsafe: true },
  { id: "r5", text: "this is why i dont have friends lol", platform: "Reddit", likes: 156, unsafe: false },
  { id: "r6", text: "WAIT WAIT WAIT so he actually showed up?? with the AUDACITY???", platform: "Reddit", likes: 1203, unsafe: false },
  { id: "r7", text: "ok but hear me out... what if she's also wrong though", platform: "Reddit", likes: 445, unsafe: false },
  { id: "r8", text: "[REMOVED - CONTAINS PERSONAL INFORMATION]", platform: "Reddit", likes: 0, unsafe: true },
  { id: "r9", text: "the way i would have just LEFT. no words. just left.", platform: "Reddit", likes: 678, unsafe: false },
  { id: "r10", text: "update us pls OP this is the most dramatic thing ive read all week", platform: "Reddit", likes: 2341, unsafe: false },
  { id: "r11", text: "[REMOVED - VIOLATES COMMUNITY GUIDELINES]", platform: "Reddit", likes: 0, unsafe: true },
  { id: "r12", text: "not me reading this at 2am cackling 💀", platform: "Reddit", likes: 567, unsafe: false },
];

// ============================================================
// STORIES
// ============================================================
export const stories: Story[] = [
  {
    id: "story-001",
    title: "The Forgotten Birthday Dinner",
    source: "r/AmITheAsshole",
    community: "AITA",
    summary: "A partner forgot their significant other's birthday dinner reservation — the one they had planned for 6 months — because they got distracted watching a sports game with friends. The injured party showed up to the restaurant alone, waited 45 minutes, then went home.",
    safetyScore: 96,
    humorScore: 88,
    conflictClarity: 94,
    commentQuality: 91,
    recommendationBadge: "HOT CASE",
    plaintiff: "Alex (The Forgotten One)",
    defendant: "Jordan (The Forgetful One)",
    conflict: "Jordan forgot the birthday dinner reservation Alex planned for 6 months, choosing sports with friends instead.",
    keyEvidence: [
      "Alex booked the restaurant 6 months in advance",
      "Jordan received 3 calendar reminders",
      "Jordan was seen at a sports bar during the reservation time",
      "Alex waited alone for 45 minutes before leaving",
      "Jordan's excuse: 'The game went into overtime'"
    ],
    verdictDistribution: { guilty: 78, notGuilty: 8, bothWrong: 14 },
    topFunnySafeComments: [
      "The game went into overtime?? Sir, YOUR RELATIONSHIP went into overtime the moment you no-showed 💀",
      "I would have ordered the most expensive thing on the menu and sent Jordan the bill",
      "Not me reading this at 2am cackling. Jordan really said 'the vibes were immaculate at the sports bar tho'",
      "The audacity to show up AFTER the game ended like 'hey babe ready to eat?' 😭",
      "6 months of planning vs 3 hours of sports. Jordan really chose chaos."
    ],
    filteredCommentCount: 4,
    rawComments: rawMessyData,
    adaptionResult: {
      safetyPass: true,
      safetyScore: 96,
      conflictClarity: 94,
      humorPotential: 88,
      commentQuality: 91,
      verdictDisagreement: 22,
      recommendedForDemo: true,
      plaintiff: "Alex (The Forgotten One)",
      defendant: "Jordan (The Forgetful One)",
      keyEvidence: ["6-month advance booking", "3 missed calendar reminders", "45-minute solo wait", "Sports bar alibi", "Overtime excuse"],
      topFunnySafeComments: [
        "The game went into overtime?? Sir, YOUR RELATIONSHIP went into overtime 💀",
        "I would have ordered the most expensive thing on the menu and sent Jordan the bill",
        "Jordan really chose chaos over a 6-month planned dinner"
      ],
      filteredUnsafeCount: 4,
    }
  },
  {
    id: "story-002",
    title: "The Stolen Office Lunch Saga",
    source: "r/WorkDrama",
    community: "WorkDrama",
    summary: "Someone's clearly labeled homemade lunch kept disappearing from the office fridge. After setting up a phone camera, they caught their manager — who earns triple their salary — eating their food. The manager's defense: 'I thought it was communal.'",
    safetyScore: 92,
    humorScore: 95,
    conflictClarity: 98,
    commentQuality: 87,
    recommendationBadge: "SPICY PICK",
    plaintiff: "Sam (The Lunch Victim)",
    defendant: "Manager Blake (The Lunch Thief)",
    conflict: "Manager Blake repeatedly stole Sam's labeled homemade lunch from the office fridge, claiming ignorance despite clear labels.",
    keyEvidence: [
      "Lunch labeled 'SAM - DO NOT EAT' in large letters",
      "This happened 4 times over 3 weeks",
      "Phone camera footage of Blake taking the food",
      "Blake earns 3x Sam's salary",
      "Blake's defense: 'I thought the label was decorative'"
    ],
    verdictDistribution: { guilty: 91, notGuilty: 3, bothWrong: 6 },
    topFunnySafeComments: [
      "'I thought the label was decorative' is the most unhinged defense I've ever heard in my life",
      "The label was DECORATIVE?? Was 'SAM - DO NOT EAT' an art installation??",
      "Blake really looked at 'DO NOT EAT' and thought 'this is for me'",
      "The audacity of eating someone's lunch AND being their boss. Double crime.",
      "Sam should start labeling food with increasingly unhinged warnings"
    ],
    filteredCommentCount: 2,
    rawComments: rawMessyData,
    adaptionResult: {
      safetyPass: true,
      safetyScore: 92,
      conflictClarity: 98,
      humorPotential: 95,
      commentQuality: 87,
      verdictDisagreement: 9,
      recommendedForDemo: true,
      plaintiff: "Sam (The Lunch Victim)",
      defendant: "Manager Blake (The Lunch Thief)",
      keyEvidence: ["Labeled lunch stolen 4 times", "Phone camera evidence", "Salary disparity context", "'Decorative label' defense"],
      topFunnySafeComments: [
        "'I thought the label was decorative' is the most unhinged defense ever",
        "Blake really looked at 'DO NOT EAT' and thought 'this is for me'",
        "Sam should label food with increasingly unhinged warnings"
      ],
      filteredUnsafeCount: 2,
    }
  },
  {
    id: "story-003",
    title: "The Wedding Dress Incident",
    source: "r/JUSTNOMIL",
    community: "JUSTNOMIL",
    summary: "A mother-in-law showed up to her son's wedding wearing a white dress. When confronted, she said she 'didn't think the rule applied to family.' The bride's maid of honor took matters into her own hands with a glass of red wine.",
    safetyScore: 89,
    humorScore: 97,
    conflictClarity: 95,
    commentQuality: 93,
    recommendationBadge: "CROWD PLEASER",
    plaintiff: "Riley (The Bride)",
    defendant: "Margaret (The MIL in White)",
    conflict: "Margaret wore a white dress to Riley's wedding, claiming family is exempt from wedding etiquette rules.",
    keyEvidence: [
      "Margaret was explicitly told 'no white' at the rehearsal dinner",
      "Margaret's dress was described as 'practically a wedding gown'",
      "The maid of honor's wine glass was 'accidentally' unstable",
      "Margaret had 3 months of notice",
      "Margaret's defense: 'White is my color'"
    ],
    verdictDistribution: { guilty: 85, notGuilty: 5, bothWrong: 10 },
    topFunnySafeComments: [
      "'White is my color' is not a legal defense, Margaret",
      "The maid of honor with the wine glass is the hero of this story, full stop",
      "Margaret really said 'the rules don't apply to me' and then was surprised by gravity",
      "Three months of notice and she STILL showed up in white. This was intentional.",
      "I need a full documentary on the maid of honor's decision-making process"
    ],
    filteredCommentCount: 6,
    rawComments: rawMessyData,
    adaptionResult: {
      safetyPass: true,
      safetyScore: 89,
      conflictClarity: 95,
      humorPotential: 97,
      commentQuality: 93,
      verdictDisagreement: 15,
      recommendedForDemo: true,
      plaintiff: "Riley (The Bride)",
      defendant: "Margaret (The MIL in White)",
      keyEvidence: ["Explicit 'no white' warning at rehearsal", "3 months advance notice", "Dress described as 'practically a wedding gown'", "'White is my color' defense"],
      topFunnySafeComments: [
        "'White is my color' is not a legal defense, Margaret",
        "The maid of honor with the wine glass is the hero of this story",
        "Margaret really said 'rules don't apply to me' and was surprised by gravity"
      ],
      filteredUnsafeCount: 6,
    }
  }
];

// ============================================================
// THEMES
// ============================================================
export const themes = [
  { id: "tamil-masala", label: "Tamil Masala Courtroom", emoji: "🎭", description: "Over-the-top dramatic flair, slow-motion reveals, background music swells", color: "#FF6B35" },
  { id: "netflix-crime", label: "Netflix True Crime", emoji: "🎬", description: "Serious documentary tone, evidence close-ups, ominous narration", color: "#C41E3A" },
  { id: "judge-judy", label: "Judge Judy Energy", emoji: "⚖️", description: "No-nonsense rapid fire, zero tolerance for excuses, iconic one-liners", color: "#FFD700" },
  { id: "corporate-hr", label: "Corporate HR Mediation", emoji: "💼", description: "Passive-aggressive professionalism, HR jargon, awkward silences", color: "#4A90D9" },
  { id: "anime-battle", label: "Anime Courtroom Battle", emoji: "⚡", description: "Speed lines, OBJECTION moments, dramatic power-ups, emotional backstories", color: "#FF1744" },
  { id: "bbc-doc", label: "BBC Documentary", emoji: "🎙️", description: "Measured British narration, historical context, understated devastation", color: "#2ECC71" },
];

// ============================================================
// CHARACTER BIBLE (generated per story — shown for story-001)
// ============================================================
export const characterBible: Record<string, Character[]> = {
  "story-001": [
    {
      role: "Judge",
      name: "Judge Maximilian Harrow",
      visualDescription: "Stern elder in ornate black robes with gold scales emblem, white powdered wig, piercing grey eyes, holds a massive golden gavel",
      personality: "Theatrically serious, delivers verdicts like proclamations, has zero patience for weak excuses, secretly finds everything hilarious",
      voiceStyle: "Deep, measured, booming — every word lands like a gavel strike",
      argumentPosition: "Neutral arbiter of justice and common sense",
      imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_judge-fkcYYmvfKxmx2rg4rZEzY9.webp"
    },
    {
      role: "Plaintiff",
      name: "Alex 'The Forgotten' Vance",
      visualDescription: "Sharp-dressed young woman in a deep red blazer, holding an evidence folder, pointing dramatically, short dark hair with a red streak",
      personality: "Passionate, righteous, armed with receipts, speaks in perfectly constructed arguments",
      voiceStyle: "Clear, confident, rising in intensity — builds to dramatic crescendos",
      argumentPosition: "Jordan had every opportunity to remember. This was a choice.",
      imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_plaintiff-cmbVj2wtDZwKYqA4tkwQ7K.webp"
    },
    {
      role: "Defendant",
      name: "Jordan 'Overtime' Calloway",
      visualDescription: "Nervous young man in a hoodie and jeans, sweating profusely, hands raised defensively, messy hair, wide panicked eyes",
      personality: "Genuinely remorseful but terrible at explaining himself, keeps making things worse by talking",
      voiceStyle: "Rapid, stumbling, lots of 'I mean... but like... you have to understand...'",
      argumentPosition: "It was an honest mistake. The game went to overtime. I panicked.",
      imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_defendant-bvyV8J4edbFiRJRXLKtG7c.webp"
    },
    {
      role: "Witness",
      name: "Professor Greta Finch",
      visualDescription: "Eccentric older woman with wild grey hair, round glasses, purple blazer, holding a notepad labeled 'VERY IMPORTANT GOSSIP'",
      personality: "Overly enthusiastic about drama, treats every testimony like a TED talk, has opinions about everything",
      voiceStyle: "Rapid-fire, excited, constantly going on tangents before being redirected",
      argumentPosition: "Represents the voice of the internet — the jury of public opinion",
      imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_witness-FJyE4XFzTg2HGnHbXpPxj4.webp"
    }
  ],
  "story-002": [
    {
      role: "Judge",
      name: "Judge Maximilian Harrow",
      visualDescription: "Stern elder in ornate black robes with gold scales emblem, white powdered wig, piercing grey eyes",
      personality: "Theatrically serious, zero patience for weak excuses",
      voiceStyle: "Deep, measured, booming",
      argumentPosition: "Neutral arbiter of justice",
      imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_judge-fkcYYmvfKxmx2rg4rZEzY9.webp"
    },
    {
      role: "Plaintiff",
      name: "Sam 'The Hungry' Okafor",
      visualDescription: "Determined office worker in business casual, holding a labeled lunch box as evidence, righteous fury in their eyes",
      personality: "Methodical, patient until pushed too far, came prepared with receipts and camera footage",
      voiceStyle: "Calm and measured, then suddenly explosive when presenting evidence",
      argumentPosition: "The label said DO NOT EAT. Four times. This was not an accident.",
      imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_plaintiff-cmbVj2wtDZwKYqA4tkwQ7K.webp"
    },
    {
      role: "Defendant",
      name: "Manager Blake 'Decorative Labels' Harrington",
      visualDescription: "Smug manager in an expensive suit, arms crossed, trying to maintain authority while clearly in the wrong",
      personality: "Entitled, uses corporate-speak to deflect, genuinely confused why this is a big deal",
      voiceStyle: "Condescending, lots of 'I think we need to look at the bigger picture here'",
      argumentPosition: "The label was ambiguous. I was hungry. This is a learning opportunity for everyone.",
      imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_defendant-bvyV8J4edbFiRJRXLKtG7c.webp"
    },
    {
      role: "Witness",
      name: "Professor Greta Finch",
      visualDescription: "Eccentric expert witness with wild grey hair, round glasses, holding a notepad",
      personality: "Overly enthusiastic, treats testimony like a TED talk",
      voiceStyle: "Rapid-fire, excited, going on tangents",
      argumentPosition: "Voice of the internet jury",
      imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_witness-FJyE4XFzTg2HGnHbXpPxj4.webp"
    }
  ],
  "story-003": [
    {
      role: "Judge",
      name: "Judge Maximilian Harrow",
      visualDescription: "Stern elder in ornate black robes with gold scales emblem, white powdered wig",
      personality: "Theatrically serious, zero patience for weak excuses",
      voiceStyle: "Deep, measured, booming",
      argumentPosition: "Neutral arbiter of justice",
      imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_judge-fkcYYmvfKxmx2rg4rZEzY9.webp"
    },
    {
      role: "Plaintiff",
      name: "Riley 'The Bride' Nakamura",
      visualDescription: "Radiant bride in white, holding wedding flowers, expression shifting between joy and barely-contained fury",
      personality: "Gracious under pressure but has a limit, speaks with quiet devastation that hits harder than shouting",
      voiceStyle: "Soft but precise — every word chosen like a surgical strike",
      argumentPosition: "She was told explicitly. Three months ago. At the rehearsal dinner. In front of witnesses.",
      imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_plaintiff-cmbVj2wtDZwKYqA4tkwQ7K.webp"
    },
    {
      role: "Defendant",
      name: "Margaret 'White Is My Color' Ashworth",
      visualDescription: "Overdressed older woman in an unmistakably bridal white dress, pearl necklace, looking genuinely confused by the proceedings",
      personality: "Believes rules are for other people, uses 'family' as a shield, expert at playing victim",
      voiceStyle: "Wounded innocence, lots of sighing, 'I just don't understand why everyone is so upset'",
      argumentPosition: "White is simply my color. I didn't think it would be a problem. I'm family.",
      imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_defendant-bvyV8J4edbFiRJRXLKtG7c.webp"
    },
    {
      role: "Witness",
      name: "Professor Greta Finch",
      visualDescription: "Eccentric expert witness with wild grey hair, round glasses",
      personality: "Overly enthusiastic about drama",
      voiceStyle: "Rapid-fire, excited",
      argumentPosition: "Voice of the internet jury",
      imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_witness-FJyE4XFzTg2HGnHbXpPxj4.webp"
    }
  ]
};

// ============================================================
// CLIP SCENES (per story)
// ============================================================
export const clipScenes: Record<string, Scene[]> = {
  "story-001": [
    { id: 1, title: "CASE OPENS", narration: "Six months. One reservation. One sports game. One very empty chair at a table for two.", speaker: "Narrator", speakerRole: "Narrator", duration: 4, bgColor: "#0A0E1A", accentColor: "#FFD700" },
    { id: 2, title: "THE EVIDENCE", narration: "Alex: 'Three calendar reminders. I sent THREE. And you still chose the overtime.'", speaker: "Alex Vance", speakerRole: "Plaintiff", duration: 4, bgColor: "#1a0a0a", accentColor: "#FF1744" },
    { id: 3, title: "THE DEFENSE", narration: "Jordan: 'Look, I know how it sounds. But you have to understand — it was the championship. It went to OVERTIME.'", speaker: "Jordan Calloway", speakerRole: "Defendant", duration: 5, bgColor: "#0a0a1a", accentColor: "#4A90D9" },
    { id: 4, title: "THE INTERNET SPEAKS", narration: "Professor Finch: 'I have reviewed 2,341 comments. The consensus is... Jordan, you absolute disaster.'", speaker: "Prof. Greta Finch", speakerRole: "Witness", duration: 4, bgColor: "#0a1a0a", accentColor: "#FFD700" },
    { id: 5, title: "THE RULING", narration: "Judge Harrow: 'In all my years on this bench, I have never heard an excuse quite this spectacular in its wrongness.'", speaker: "Judge Harrow", speakerRole: "Judge", duration: 5, bgColor: "#1a0a00", accentColor: "#FFD700" },
    { id: 6, title: "VERDICT", narration: "The court finds: Jordan Calloway — GUILTY of catastrophic prioritization failure. The game went to overtime. So did this relationship.", speaker: "Narrator", speakerRole: "Narrator", duration: 4, bgColor: "#0A0E1A", accentColor: "#FF1744" },
  ],
  "story-002": [
    { id: 1, title: "CASE OPENS", narration: "Four lunches. Four weeks. One label that said DO NOT EAT. One manager who apparently cannot read.", speaker: "Narrator", speakerRole: "Narrator", duration: 4, bgColor: "#0A0E1A", accentColor: "#FFD700" },
    { id: 2, title: "THE EVIDENCE", narration: "Sam: 'I wrote my name in letters this big. I used a red marker. I underlined it twice.'", speaker: "Sam Okafor", speakerRole: "Plaintiff", duration: 4, bgColor: "#1a0a0a", accentColor: "#FF1744" },
    { id: 3, title: "THE DEFENSE", narration: "Blake: 'I think we need to look at the bigger picture here. Was the label truly... unambiguous?'", speaker: "Manager Blake", speakerRole: "Defendant", duration: 5, bgColor: "#0a0a1a", accentColor: "#4A90D9" },
    { id: 4, title: "THE INTERNET SPEAKS", narration: "Professor Finch: 'I have reviewed the label. It says, and I quote, SAM — DO NOT EAT. This is not ambiguous.'", speaker: "Prof. Greta Finch", speakerRole: "Witness", duration: 4, bgColor: "#0a1a0a", accentColor: "#FFD700" },
    { id: 5, title: "THE RULING", narration: "Judge Harrow: 'The label was decorative? Sir, this court has heard many things. This is a new low.'", speaker: "Judge Harrow", speakerRole: "Judge", duration: 5, bgColor: "#1a0a00", accentColor: "#FFD700" },
    { id: 6, title: "VERDICT", narration: "The court finds: Manager Blake — GUILTY of willful lunch theft and creative label interpretation. Return the Tupperware.", speaker: "Narrator", speakerRole: "Narrator", duration: 4, bgColor: "#0A0E1A", accentColor: "#FF1744" },
  ],
  "story-003": [
    { id: 1, title: "CASE OPENS", narration: "A wedding. A white dress. A mother-in-law who believed the rules were for everyone else.", speaker: "Narrator", speakerRole: "Narrator", duration: 4, bgColor: "#0A0E1A", accentColor: "#FFD700" },
    { id: 2, title: "THE EVIDENCE", narration: "Riley: 'I told her at the rehearsal dinner. In front of seven witnesses. She said, and I quote, of course darling.'", speaker: "Riley Nakamura", speakerRole: "Plaintiff", duration: 4, bgColor: "#1a0a0a", accentColor: "#FF1744" },
    { id: 3, title: "THE DEFENSE", narration: "Margaret: 'White is simply my color. I didn't think it would be a problem. I'm family. Surely family is different.'", speaker: "Margaret Ashworth", speakerRole: "Defendant", duration: 5, bgColor: "#0a0a1a", accentColor: "#4A90D9" },
    { id: 4, title: "THE INTERNET SPEAKS", narration: "Professor Finch: 'I have read 3,891 comments. The maid of honor with the wine glass has been described as a hero in 94% of them.'", speaker: "Prof. Greta Finch", speakerRole: "Witness", duration: 4, bgColor: "#0a1a0a", accentColor: "#FFD700" },
    { id: 5, title: "THE RULING", narration: "Judge Harrow: 'White is your color. Consequences, however, are also your color today.'", speaker: "Judge Harrow", speakerRole: "Judge", duration: 5, bgColor: "#1a0a00", accentColor: "#FFD700" },
    { id: 6, title: "VERDICT", narration: "The court finds: Margaret Ashworth — GUILTY of deliberate wedding etiquette violation. The maid of honor is acquitted.", speaker: "Narrator", speakerRole: "Narrator", duration: 4, bgColor: "#0A0E1A", accentColor: "#FF1744" },
  ]
};

// ============================================================
// COURTROOM DIALOGUE (per story)
// ============================================================
export const courtroomDialogue: Record<string, CourtroomLine[]> = {
  "story-001": [
    { speaker: "Alex Vance", role: "Plaintiff", type: "opening", text: "Your Honor, I planned this dinner for six months. Six. Months. I booked the reservation in November for a May birthday. I sent three calendar invites. I mentioned it at breakfast that morning. And Jordan — Jordan chose a sports game. Not even a championship. A regular season game that happened to go to overtime." },
    { speaker: "Jordan Calloway", role: "Defendant", type: "opening", text: "Okay so — look, I know how this sounds. And I know I messed up. But you have to understand the context. It was tied. In overtime. And my phone was on silent because we were watching the game and — okay I'm making this worse aren't I. I'm sorry. I'm genuinely sorry. But also the game was really good." },
    { speaker: "Prof. Greta Finch", role: "Witness", type: "testimony", text: "I have reviewed 2,341 community comments on this case. The top comment, with 891 upvotes, reads: 'bro really said I forgot like that's an excuse.' The second most upvoted comment suggests Jordan send a very expensive apology dinner. The third suggests Jordan is, and I quote, 'an actual clown.'" },
    { speaker: "Judge Harrow", role: "Judge", type: "question", text: "Jordan. Look at me. You received three calendar reminders. On your phone. Which was in your hand. At the sports bar. And you still did not remember. I have one question for you: at what point during the overtime did you think, perhaps I should check my notifications?" },
    { speaker: "Jordan Calloway", role: "Defendant", type: "testimony", text: "...The final buzzer." },
    { speaker: "Judge Harrow", role: "Judge", type: "ruling", text: "The final buzzer. I see. The court has heard enough." },
  ],
  "story-002": [
    { speaker: "Sam Okafor", role: "Plaintiff", type: "opening", text: "Your Honor, I present Exhibit A: my lunch box. Note the label. It reads, in red marker, underlined twice: SAM — DO NOT EAT. This happened four times. Four lunches. Four weeks. I set up a camera on week three. The footage is Exhibit B." },
    { speaker: "Manager Blake", role: "Defendant", type: "opening", text: "I think we need to look at the bigger picture here. Office culture is about shared resources. The label — and I want to be clear, I'm not saying it wasn't there — but was it truly unambiguous? Could 'Sam' not refer to a brand? Could 'Do Not Eat' not be a playful warning?" },
    { speaker: "Prof. Greta Finch", role: "Witness", type: "testimony", text: "I have reviewed the label in question. It says SAM — DO NOT EAT. I have also reviewed 1,847 comments. The phrase 'decorative label' has been used sarcastically 1,203 times. The community is not on Blake's side." },
    { speaker: "Judge Harrow", role: "Judge", type: "question", text: "Mr. Harrington. You earn three times Sam's salary. You have a company card for client lunches. You saw a label that said DO NOT EAT. And you ate it. Four times. I want you to explain to me — slowly — what part of DO NOT EAT was unclear to you." },
    { speaker: "Manager Blake", role: "Defendant", type: "testimony", text: "...I was very hungry." },
    { speaker: "Judge Harrow", role: "Judge", type: "ruling", text: "You were hungry. With a company card. In front of a label that said DO NOT EAT. This court is done." },
  ],
  "story-003": [
    { speaker: "Riley Nakamura", role: "Plaintiff", type: "opening", text: "Your Honor, I told Margaret at the rehearsal dinner. In front of seven witnesses. I said, Margaret, please don't wear white to the wedding. She said 'of course darling.' She then appeared the next day in what can only be described as a wedding gown. With a veil." },
    { speaker: "Margaret Ashworth", role: "Defendant", type: "opening", text: "I simply don't understand what all the fuss is about. White is my color. I've worn white to every important event in my life. I'm the groom's mother. Surely family is held to a different standard? I wasn't trying to upstage anyone. I just wanted to look my best." },
    { speaker: "Prof. Greta Finch", role: "Witness", type: "testimony", text: "I have reviewed 3,891 comments. The maid of honor's wine glass incident has been described as 'heroic,' 'iconic,' and 'the most satisfying thing I've read all year.' Margaret's 'white is my color' defense has been described as 'not a legal defense' in 2,104 comments." },
    { speaker: "Judge Harrow", role: "Judge", type: "question", text: "Mrs. Ashworth. You were told explicitly. Three months ago. At the rehearsal dinner. In front of witnesses. You said 'of course darling.' Then you wore white. With a veil. I want to understand your reasoning. Please take your time." },
    { speaker: "Margaret Ashworth", role: "Defendant", type: "testimony", text: "...White is simply my color." },
    { speaker: "Judge Harrow", role: "Judge", type: "ruling", text: "White is your color. Consequences, however, are also your color today. The maid of honor is not on trial. The court has reached its verdict." },
  ]
};

// ============================================================
// VERDICTS (per story)
// ============================================================
export const verdicts: Record<string, Verdict> = {
  "story-001": {
    winner: "Plaintiff",
    reasoning: "Jordan had three calendar reminders, knew about the reservation for six months, and chose to attend a sports event instead. The 'overtime' defense is not recognized by this court as a valid excuse for missing a partner's birthday dinner.",
    breakdown: [
      { label: "Jordan is Wrong", percentage: 78, color: "#FF1744" },
      { label: "Both Wrong", percentage: 14, color: "#FFD700" },
      { label: "Jordan is Right", percentage: 8, color: "#4A90D9" },
    ],
    funniestJudgeQuote: "The game went to overtime. So did this relationship. Court adjourned.",
    lessonFromCase: "Three calendar reminders is not a suggestion. It is a legal document. Treat it accordingly."
  },
  "story-002": {
    winner: "Plaintiff",
    reasoning: "The label clearly stated DO NOT EAT. It was not decorative. It was not ambiguous. It was not a brand name. Manager Blake consumed Sam's labeled food four times, despite clear markings and a significant salary advantage that precluded any claim of necessity.",
    breakdown: [
      { label: "Blake is Wrong", percentage: 91, color: "#FF1744" },
      { label: "Both Wrong", percentage: 6, color: "#FFD700" },
      { label: "Blake is Right", percentage: 3, color: "#4A90D9" },
    ],
    funniestJudgeQuote: "The label was decorative. Sir, this court has heard many things. This is a new low. Return the Tupperware.",
    lessonFromCase: "If it says DO NOT EAT and it is not yours, do not eat it. This is not complicated. This has never been complicated."
  },
  "story-003": {
    winner: "Plaintiff",
    reasoning: "Margaret was explicitly warned three months in advance, confirmed she understood, and then appeared in what witnesses described as 'practically a wedding gown.' The 'white is my color' defense is not recognized by any court, earthly or otherwise.",
    breakdown: [
      { label: "Margaret is Wrong", percentage: 85, color: "#FF1744" },
      { label: "Both Wrong", percentage: 10, color: "#FFD700" },
      { label: "Margaret is Right", percentage: 5, color: "#4A90D9" },
    ],
    funniestJudgeQuote: "White is your color. Consequences, however, are also your color today. The maid of honor is acquitted.",
    lessonFromCase: "When someone says 'please don't wear white to my wedding' and you say 'of course darling,' you have entered a binding verbal contract. Honor it."
  }
};
