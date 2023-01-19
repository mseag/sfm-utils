// Copyright 2023 SIL International
// Trivial unit test for testing toolbox.ts regex
import test from 'ava';

import { VS_PATTERN, VS_BRIDGE_PATTERN } from '../dist/toolbox'


/*
 * VS_PATTERN tests
 * \vs (section title)
 * \vs (section heading)
 * \vs (13-14) b
 * \vs [13-14] b
 * TODO: \vs 13-14 (b)
 */

test('VS_PATTERN for section title/heading', t => {
  let line = "\\vs (section title)";
  t.regex(line.trim(), VS_PATTERN, "line matches");

  line = "\\vs (section title?)";
  t.regex(line.trim(), VS_PATTERN, "line matches");

  line = "\\vs (section title) [?]";
  t.regex(line.trim(), VS_PATTERN, "line matches");

  line = "\\vs (section heading)";
  t.regex(line.trim(), VS_PATTERN, "line matches");
});

// These do not match
test('VS_PATTERN for ?', t => {
  let line = "\\vs ?";
  t.notRegex(line.trim(), VS_PATTERN, "line fails to match");

  line = "\\vs ? (none)";
  t.notRegex(line.trim(), VS_PATTERN, "line fails to match");
});

test('VS_PATTERN for verse', t => {
  let line = "\\vs 9";
  t.regex(line.trim(), VS_PATTERN, "line matches");

  line = "\\vs 9?"
  t.regex(line.trim(), VS_PATTERN, "line matches");

  line = "\\vs 8b [not in draft produced at workshop. do we want to keep this?]";
  t.regex(line.trim(), VS_PATTERN, "line matches");

  line = "\\vs 9a";
  t.regex(line.trim(), VS_PATTERN, "line matches");

  line = "\\vs 9a?";
  t.regex(line.trim(), VS_PATTERN, "line matches");

  line = "\\vs 14";
  t.regex(line.trim(), VS_PATTERN, "line matches");

  line = "\\vs 14b";
  t.regex(line.trim(), VS_PATTERN, "line matches");

  line = "\\vs 22b(?)";
  t.regex(line.trim(), VS_PATTERN, "line matches");

});

test('VS_PATTERN for verse bridge', t => {
  let line = "\\vs (13-14) b";
  t.regex(line.trim(), VS_PATTERN, "line matches");

  line = "\\vs [13-14] b";
  t.regex(line.trim(), VS_PATTERN, "line matches");

  line = "\\vs 13c-14a";
  t.regex(line.trim(), VS_PATTERN, "line matches");

  line = "\\vs this should not match";
  t.notRegex(line.trim(), VS_PATTERN, "line fails to match");
})


/**
 * VS_BRIDGE_PATTERN
 */
test('VS_BRIDGE_PATTERN for verse ranges', t => {
  let line = "(13-14)";
  t.regex(line.trim(), VS_BRIDGE_PATTERN, "line matches");

  line = "[13-14]";
  t.regex(line.trim(), VS_BRIDGE_PATTERN, "line matches");

  line = "13-14";
  t.regex(line.trim(), VS_BRIDGE_PATTERN, "line matches");
  let vsBridgeMatch = line.trim().match(VS_BRIDGE_PATTERN);

  /* TODO: validate verse range
  t.assert(vsBridgeMatch, 'bridge matches');
  t.is(vsBridgeMatch[2], "13");
  t.is(vsBridgeMatch[3], "14");
  */

  line = "13-14a";
  t.regex(line.trim(), VS_BRIDGE_PATTERN, "line matches");

  line = "13a-14b";
  t.notRegex(line.trim(), VS_BRIDGE_PATTERN, "line fails to match but should (TODO)");
  vsBridgeMatch = line.trim().match(VS_BRIDGE_PATTERN);
})
