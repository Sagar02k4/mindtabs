export function isMatchingOAuthCallback(expectedUrl, receivedUrl) {
  try {
    const expected = new URL(expectedUrl);
    const received = new URL(receivedUrl);
    return received.origin === expected.origin && received.pathname === expected.pathname;
  } catch {
    return false;
  }
}
