'use strict';

const HttpService = {
  async post(url, body, secret) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (secret) {
      headers['X-Brain-Secret'] = secret;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = {
        raw: text
      };
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        `HTTP ${response.status}`
      );
    }

    return data;
  }
};

const DEFAULT_SLANG = {
  bro: 'cách gọi thân mật giữa bạn bè',
  bruh: 'biểu cảm ngạc nhiên hoặc khó hiểu',
  fr: 'for real',
  ngl: 'not gonna lie',
  idk: 'I do not know',
  imo: 'in my opinion',
  lol: 'laughing out loud',
  lmao: 'laughing my ass off',
  sus: 'suspicious',
  cap: 'nói dối hoặc không đúng',
  'no cap': 'nói thật',
  w: 'win hoặc điều tốt',
  l: 'loss hoặc điều tệ',
  cooked: 'đã gặp tình trạng rất khó hoặc thất bại',
  aura: 'khí chất hoặc độ ngầu',
  sigma: 'cách gọi meme về một người độc lập/ngầu',
  rizz: 'khả năng thu hút người khác',
  based: 'đồng tình hoặc đánh giá cao',
  goat: 'greatest of all time',
  mid: 'bình thường hoặc không ấn tượng',
  deadass: 'hoàn toàn nghiêm túc',
  lowkey: 'hơi hoặc kín đáo',
  highkey: 'rất rõ ràng hoặc mạnh',
  ong: 'on God',
  iykyk: 'if you know, you know',
  ngmi: 'not gonna make it',
  gm: 'good morning',
  gn: 'good night'
};

function detectLanguage(text) {
  const value =
    String(text || '')
      .toLowerCase();

  if (!value) {
    return {
      language: 'unknown',
      confidence: 0
    };
  }

  const vietnamese =
    (
      value.match(
        /\b(và|là|của|cho|mình|tôi|anh|em|không|được|đang|này|đó|với|rất|thì|nhưng|sao|gì|hả|bro)\b/g
      ) || []
    ).length;

  const english =
    (
      value.match(
        /\b(the|is|are|you|your|this|that|what|why|how|with|for|and|not|can|will|bro|bruh)\b/g
      ) || []
    ).length;

  if (vietnamese > english) {
    return {
      language: 'Vietnamese',
      confidence:
        Math.min(
          1,
          0.55 +
          vietnamese * 0.05
        )
    };
  }

  if (english > vietnamese) {
    return {
      language: 'English',
      confidence:
        Math.min(
          1,
          0.55 +
          english * 0.05
        )
    };
  }

  return {
    language: 'unknown',
    confidence: 0.2
  };
}

function detectSlang(text) {
  const value =
    String(text || '')
      .toLowerCase();

  const terms = [];
  const definitions = {};

  for (const [
    slang,
    definition
  ] of Object.entries(
    DEFAULT_SLANG
  )) {
    if (
      value.includes(slang)
    ) {
      terms.push(slang);
      definitions[slang] =
        definition;
    }
  }

  return {
    terms,
    definitions
  };
}

function createLanguageObserver(config = {}) {
  const options = {
    baseUrl:
      config.baseUrl ||
      'https://ai-brain-yp8y.onrender.com',

    brainSecret:
      config.brainSecret ||
      '',

    enabled:
      config.enabled !== false,

    cooldownMs:
      Number(
        config.cooldownMs ||
        15000
      ),

    maxMessageLength:
      Number(
        config.maxMessageLength ||
        300
      )
  };

  let lastSent = 0;

  async function observe(input = {}) {
    if (!options.enabled) {
      return {
        skipped: true,
        reason: 'disabled'
      };
    }

    const now =
      Date.now();

    if (
      now - lastSent <
      options.cooldownMs
    ) {
      return {
        skipped: true,
        reason: 'cooldown'
      };
    }

    const text =
      String(
        input.text || ''
      ).slice(
        0,
        options.maxMessageLength
      );

    if (!text.trim()) {
      return {
        skipped: true,
        reason: 'empty'
      };
    }

    const language =
      detectLanguage(text);

    const slang =
      detectSlang(text);

    const payload = {
      userId:
        input.userId,

      username:
        input.username ||
        input.displayName ||
        null,

      language:
        language.language,

      confidence:
        language.confidence,

      youthSlang:
        slang.terms.length > 0,

      slangTerms:
        slang.terms,

      slangDefinitions:
        slang.definitions,

      pattern:
        input.pattern ||
        null,

      context:
        input.context ||
        null,

      gameId:
        input.gameId ||
        null,

      placeId:
        input.placeId ||
        null,

      visibility:
        'personal'
    };

    /*
     * Không gửi raw chat lên server.
     */

    const result =
      await HttpService.post(
        options.baseUrl +
          '/api/brain/language/observe',
        payload,
        options.brainSecret
      );

    lastSent =
      Date.now();

    return result;
  }

  return {
    observe,
    detectLanguage,
    detectSlang
  };
}

module.exports = {
  createLanguageObserver,
  detectLanguage,
  detectSlang
};
