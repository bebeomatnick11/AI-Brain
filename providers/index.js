'use strict';

const BaseProvider =
  require('./BaseProvider');

const CognitiveProvider =
  require('./CognitiveProvider');

const MemoryProvider =
  require('./MemoryProvider');

const KnowledgeProvider =
  require('./KnowledgeProvider');

const ToolProvider =
  require('./ToolProvider');

const ContextProvider =
  require('./ContextProvider');

module.exports = {
  BaseProvider,
  CognitiveProvider,
  MemoryProvider,
  KnowledgeProvider,
  ToolProvider,
  ContextProvider
};
