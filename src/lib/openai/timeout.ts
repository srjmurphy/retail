export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 16000,
  message = "OpenAI request timed out.",
) {
  let timeout: NodeJS.Timeout | undefined;

  const timer = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timer]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
