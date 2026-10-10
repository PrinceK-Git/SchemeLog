/**
 * Minimal robots.txt parser, used only to refuse disallowed paths.
 * It never grants permission by itself: a person still reads the host's terms
 * and copyright policy and records both dates in the registry.
 */

/**
 * @param {string} text raw robots.txt
 * @returns {{ groups: { agents: string[], allow: string[], disallow: string[] }[] }}
 */
export function parseRobots(text) {
  const groups = [];
  let current = null;
  let expectingAgents = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split('#')[0].trim();
    if (line === '') continue;
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === 'user-agent') {
      if (!current || !expectingAgents) {
        current = { agents: [], allow: [], disallow: [] };
        groups.push(current);
        expectingAgents = true;
      }
      current.agents.push(value.toLowerCase());
      continue;
    }
    if (!current) continue;
    expectingAgents = false;
    if (field === 'allow' && value !== '') current.allow.push(value);
    if (field === 'disallow') current.disallow.push(value);
  }
  return { groups };
}

/** Does a robots path pattern match this URL path? Supports `*` and `$`. */
function matches(pattern, path) {
  if (pattern === '') return false;
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\\\$$/, '$');
  return new RegExp(`^${escaped}`).test(path);
}

/** Pick the group that applies to our user agent, preferring an exact token match. */
function groupFor(parsed, userAgentToken) {
  const token = userAgentToken.toLowerCase();
  const exact = parsed.groups.find((group) =>
    group.agents.some((agent) => token.startsWith(agent) && agent !== '*'),
  );
  return exact || parsed.groups.find((group) => group.agents.includes('*')) || null;
}

/**
 * Decide whether a path may be fetched. The longest matching rule wins;
 * Allow beats Disallow at equal length, matching the common convention.
 *
 * @param {string} robotsText
 * @param {string} userAgentToken e.g. "SchemelogSourceCheck/0.1"
 * @param {string} path e.g. "/public/schemeGuidelines/x.pdf"
 * @returns {boolean}
 */
export function isAllowed(robotsText, userAgentToken, path) {
  const group = groupFor(parseRobots(robotsText), userAgentToken);
  if (!group) return true;
  let decision = true;
  let best = -1;
  for (const rule of group.disallow) {
    if (matches(rule, path) && rule.length > best) {
      best = rule.length;
      decision = false;
    }
  }
  for (const rule of group.allow) {
    if (matches(rule, path) && rule.length >= best) {
      best = rule.length;
      decision = true;
    }
  }
  return decision;
}
