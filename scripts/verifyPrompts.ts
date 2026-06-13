import { loadCatalog } from "../server/dataStore";
import {
  buildAllEmotionalPrompts,
  buildAllPrompts,
  buildPrompt,
  getActiveEmotionalTones,
  getActiveLightingTypes,
  getActiveOutputModes,
  getActivePhotographyProfiles,
  getActiveRatios,
  getActiveStyles,
} from "../src/domain/promptAssembler";

const catalog = await loadCatalog();
const styles = getActiveStyles(catalog);
const lightingTypes = getActiveLightingTypes(catalog);
const ratios = getActiveRatios(catalog);
const emotionalTones = getActiveEmotionalTones(catalog);
const photographyProfiles = getActivePhotographyProfiles(catalog);
const outputModes = getActiveOutputModes(catalog);
const prompts = buildAllPrompts(catalog);
const expectedCount = styles.length * lightingTypes.length * ratios.length;
const invalidPrompts = prompts.filter((prompt) => !prompt.validation.valid);
const duplicateFilenames = findDuplicates(prompts.map((prompt) => prompt.filename));
const emotionalHeaders = [
  "EMOTIONAL IMPACT REQUIREMENTS",
  "COLOR EMOTION ADD-ON",
  "PANEL 1 EMOTION ADD-ON",
  "PANEL 4 EMOTION ADD-ON",
  "PHOTOGRAPHY EMOTION ADD-ON",
  "EMOTIONAL AVOID LIST",
];

if (prompts.length !== expectedCount) {
  throw new Error(`Expected ${expectedCount} prompts, received ${prompts.length}.`);
}

if (invalidPrompts.length > 0) {
  const details = invalidPrompts
    .map((prompt) => {
      const missing = prompt.validation.missingKeywords.join(", ") || "none";
      const forbidden = prompt.validation.forbiddenTokens.join(", ") || "none";
      return `${prompt.filename} | missing: ${missing} | forbidden: ${forbidden}`;
    })
    .join("\n");

  throw new Error(`Invalid prompts found:\n${details}`);
}

if (duplicateFilenames.length > 0) {
  throw new Error(`Duplicate filenames found: ${duplicateFilenames.join(", ")}`);
}

const defaultTonePromptsWithEmotionalContent = prompts.filter((prompt) =>
  emotionalHeaders.some((header) => prompt.promptText.includes(header)),
);
if (defaultTonePromptsWithEmotionalContent.length > 0) {
  throw new Error("Default none mode unexpectedly contains emotional tone content.");
}

const sampleStyle = styles[0];
const sampleType = lightingTypes[0];
const sampleRatio = ratios[0];
if (!sampleStyle || !sampleType || !sampleRatio) {
  throw new Error("At least one active style, lighting type, and ratio are required.");
}

emotionalTones
  .filter((tone) => tone.id !== "none")
  .forEach((tone) => {
    const prompt = buildPrompt(catalog, {
      styleId: sampleStyle.id,
      lightingTypeId: sampleType.id,
      ratioId: sampleRatio.id,
      emotionalToneId: tone.id,
    });

    if (!prompt.validation.valid) {
      throw new Error(`Emotional tone validation failed: ${tone.id}.`);
    }
    if (!prompt.promptText.includes("EMOTIONAL IMPACT REQUIREMENTS")) {
      throw new Error(`Emotional tone content missing: ${tone.id}.`);
    }
    if (!prompt.filename.includes(tone.displayName)) {
      throw new Error(`Emotional tone filename missing display name: ${tone.id}.`);
    }
    if (prompt.metadata.emotionalToneId !== tone.id) {
      throw new Error(`Emotional tone metadata mismatch: ${tone.id}.`);
    }
  });

const defaultPhotographyProfiles = photographyProfiles.filter(
  (profile) => profile.isDefault,
);
if (defaultPhotographyProfiles.length !== 1) {
  throw new Error(
    `Expected exactly one default photography profile, received ${defaultPhotographyProfiles.length}.`,
  );
}

photographyProfiles.forEach((profile) => {
  const prompt = buildPrompt(catalog, {
    styleId: sampleStyle.id,
    lightingTypeId: sampleType.id,
    ratioId: sampleRatio.id,
    emotionalToneId: "fresh_air",
    photographyProfileId: profile.id,
  });

  if (!prompt.validation.valid) {
    throw new Error(`Photography profile validation failed: ${profile.id}.`);
  }
  if (!prompt.promptText.includes("PHOTOGRAPHY PROFILE")) {
    throw new Error(`Photography profile content missing: ${profile.id}.`);
  }
  if (
    profile.isDefault &&
    prompt.filename.includes(profile.displayName)
  ) {
    throw new Error(`Default photography profile leaked into filename: ${profile.id}.`);
  }
  if (
    !profile.isDefault &&
    !prompt.filename.includes(profile.displayName)
  ) {
    throw new Error(`Photography profile filename missing display name: ${profile.id}.`);
  }
  if (prompt.metadata.photographyProfileId !== profile.id) {
    throw new Error(`Photography profile metadata mismatch: ${profile.id}.`);
  }

  const emotionIndex = prompt.promptText.indexOf(
    "EMOTIONAL IMPACT REQUIREMENTS",
  );
  const profileIndex = prompt.promptText.indexOf("PHOTOGRAPHY PROFILE");
  const outputModeIndex = prompt.promptText.indexOf("OUTPUT MODE");
  const productGoalIndex = prompt.promptText.indexOf(
    "Act as a world-class Luxury Lighting Designer, Conceptual Product Designer",
  );
  if (
    emotionIndex < 0 ||
    outputModeIndex < 0 ||
    productGoalIndex <= outputModeIndex ||
    profileIndex <= emotionIndex
  ) {
    throw new Error(`Photography profile order is incorrect: ${profile.id}.`);
  }
});

const defaultOutputModes = outputModes.filter((outputMode) => outputMode.isDefault);
if (
  defaultOutputModes.length !== 1 ||
  defaultOutputModes[0]?.id !== "four_panel_storyboard"
) {
  throw new Error("four_panel_storyboard must be the single default output mode.");
}

outputModes.forEach((outputMode) => {
  const prompt = buildPrompt(catalog, {
    styleId: sampleStyle.id,
    lightingTypeId: sampleType.id,
    ratioId: sampleRatio.id,
    outputModeId: outputMode.id,
    emotionalToneId: "fresh_air",
    photographyProfileId: "xiaohongshu_home_blogger",
  });

  if (!prompt.validation.valid) {
    const missing = prompt.validation.missingKeywords.join(", ") || "none";
    const forbidden = prompt.validation.forbiddenTokens.join(", ") || "none";
    throw new Error(
      `Output mode validation failed: ${outputMode.id}. Missing: ${missing}. Forbidden: ${forbidden}.`,
    );
  }
  if (!prompt.filename.includes(outputMode.displayName)) {
    throw new Error(`Output mode filename missing display name: ${outputMode.id}.`);
  }
  if (prompt.metadata.outputModeId !== outputMode.id) {
    throw new Error(`Output mode metadata mismatch: ${outputMode.id}.`);
  }

  if (outputMode.category === "technical") {
    [
      "EMOTIONAL IMPACT REQUIREMENTS",
      "PHOTOGRAPHY PROFILE",
      "Shot on iPhone 17 Pro Max",
      "No spacing between panels",
    ].forEach((forbidden) => {
      if (prompt.promptText.includes(forbidden)) {
        throw new Error(
          `Technical output contains forbidden photography content: ${outputMode.id} / ${forbidden}.`,
        );
      }
    });
    if (
      prompt.filename.includes("清新空气感") ||
      prompt.filename.includes("小红书家居博主模式")
    ) {
      throw new Error(
        `Technical output filename contains ignored soft modules: ${outputMode.id}.`,
      );
    }
  }
});

const allEmotionalPrompts = buildAllEmotionalPrompts(catalog);
const expectedEmotionalCount = expectedCount * emotionalTones.length;
if (allEmotionalPrompts.length !== expectedEmotionalCount) {
  throw new Error(
    `Expected ${expectedEmotionalCount} all-emotion prompts, received ${allEmotionalPrompts.length}.`,
  );
}

console.log(`Verified ${prompts.length} prompts.`);
console.log(
  `Styles: ${styles.length}, lighting types: ${lightingTypes.length}, ratios: ${ratios.length}, emotional tones: ${emotionalTones.length}, photography profiles: ${photographyProfiles.length}, output modes: ${outputModes.length}.`,
);
console.log(`Sample: ${prompts[0].filename}`);

function findDuplicates(items: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  items.forEach((item) => {
    if (seen.has(item)) {
      duplicates.add(item);
    }
    seen.add(item);
  });

  return [...duplicates];
}
