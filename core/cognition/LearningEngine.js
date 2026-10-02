'use strict';

class LearningEngine {
  constructor(options = {}) {
    this.conceptMemory =
      options.conceptMemory || null;

    this.maxExperiences =
      Number(
        options.maxExperiences || 1000
      );

    this.experiences = [];
  }

  setConceptMemory(memory) {
    this.conceptMemory = memory;
  }

  record(experience = {}) {
    const item = {
      input:
        experience.input || null,

      understanding:
        experience.understanding || null,

      reasoning:
        experience.reasoning || null,

      action:
        experience.action || null,

      result:
        experience.result || null,

      success:
        experience.success !== false,

      timestamp:
        Date.now()
    };

    this.experiences.push(item);

    if (
      this.experiences.length >
      this.maxExperiences
    ) {
      this.experiences =
        this.experiences.slice(
          -this.maxExperiences
        );
    }

    this.learnConcepts(item);

    return item;
  }

  learnConcepts(experience) {
    if (
      !this.conceptMemory ||
      !experience.understanding
    ) {
      return;
    }

    const keywords =
      experience
        .understanding
        .keywords || [];

    for (const keyword of keywords) {
      this.conceptMemory.observe(
        keyword,
        {
          lastOutcome:
            experience.success
              ? 'success'
              : 'failure'
        },
        'experience'
      );
    }
  }

  successful(limit = 10) {
    return this.experiences
      .filter(
        x => x.success === true
      )
      .slice(-limit)
      .reverse();
  }

  failed(limit = 10) {
    return this.experiences
      .filter(
        x => x.success === false
      )
      .slice(-limit)
      .reverse();
  }

  statistics() {
    const total =
      this.experiences.length;

    const successful =
      this.experiences.filter(
        x => x.success
      ).length;

    return {
      total,
      successful,
      failed:
        total - successful,

      successRate:
        total
          ? successful / total
          : 0
    };
  }
}

module.exports =
  LearningEngine;
