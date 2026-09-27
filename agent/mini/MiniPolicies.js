const DEFAULT_POLICY = {
  maxSteps: 6,

  maxRetries: 2,

  timeoutMs: 30000,

  allowWeb: true,

  allowFiles: true,

  allowMemory: true,

  allowCode: false,

  allowMedia: true,

  allowDangerousActions: false,

  requireVerification: true
};

function createMiniPolicy(overrides = {}) {
  return {
    ...DEFAULT_POLICY,
    ...overrides
  };
}

function isCapabilityAllowed(
  capability,
  policy
) {
  if (!capability) return false;

  const name =
    String(capability).toLowerCase();

  if (
    name.includes("web") &&
    !policy.allowWeb
  ) {
    return false;
  }

  if (
    name.includes("file") &&
    !policy.allowFiles
  ) {
    return false;
  }

  if (
    name.includes("memory") &&
    !policy.allowMemory
  ) {
    return false;
  }

  if (
    name.includes("code") &&
    !policy.allowCode
  ) {
    return false;
  }

  if (
    (
      name.includes("image") ||
      name.includes("video")
    ) &&
    !policy.allowMedia
  ) {
    return false;
  }

  return true;
}

module.exports = {
  DEFAULT_POLICY,
  createMiniPolicy,
  isCapabilityAllowed
};
