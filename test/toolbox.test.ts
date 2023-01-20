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
 * \vs 13-14 (b)
 */

test('VS_PATTERN for section title/heading', t => {
  let line = "\\vs (section title)";
  t.regex(line.trim(), VS_PATTERN, "(section title) matches");

  line = "\\vs (section title?)";
  t.regex(line.trim(), VS_PATTERN, "(section title?) matches");

  line = "\\vs (section title) [?]";
  t.regex(line.trim(), VS_PATTERN, "(section title) [?] matches");

  line = "\\vs (section heading)";
  t.regex(line.trim(), VS_PATTERN, "(section heading) matches");
});

// These do not match
test('VS_PATTERN for ?', t => {
  let line = "\\vs ?";
  t.notRegex(line.trim(), VS_PATTERN, "? fails to match");

  line = "\\vs ? (none)";
  t.notRegex(line.trim(), VS_PATTERN, "? (none) fails to match");
});

test('VS_PATTERN for verse', t => {
  let line = "\\vs 9";
  t.regex(line.trim(), VS_PATTERN, "vs 9 matches");

  line = "\\vs 9?"
  t.regex(line.trim(), VS_PATTERN, "9? matches");

  line = "\\vs 8b [not in draft produced at workshop. do we want to keep this?]";
  t.regex(line.trim(), VS_PATTERN, "long line matches");

  line = "\\vs 9a";
  t.regex(line.trim(), VS_PATTERN, "9a matches");

  line = "\\vs 9a?";
  t.regex(line.trim(), VS_PATTERN, "9a? matches");

  line = "\\vs 14";
  t.regex(line.trim(), VS_PATTERN, "14 matches");

  line = "\\vs 14b";
  t.regex(line.trim(), VS_PATTERN, "14b matches");

  line = "\\vs 22b(?)";
  t.regex(line.trim(), VS_PATTERN, "22b(?) matches");

});

test('VS_PATTERN for verse bridge', t => {
  let line = "\\vs (13-14) b";
  t.regex(line.trim(), VS_PATTERN, "(13-14) b matches");

  line = "\\vs [13-14] b";
  t.regex(line.trim(), VS_PATTERN, "[13-14] b matches");

  line = "\\vs 13c-14a";
  t.regex(line.trim(), VS_PATTERN, "13c-14a matches");

  line = "\\vs 8-9 (b)";
  t.regex(line.trim(), VS_PATTERN, "8-9 (b) matches");

  line = "\\vs this should not match";
  t.notRegex(line.trim(), VS_PATTERN, "this should not match");
})


/**
 * VS_BRIDGE_PATTERN
 */
test('VS_BRIDGE_PATTERN for verse ranges', t => {
  let line = "(13-14)";
  t.regex(line.trim(), VS_BRIDGE_PATTERN, "(13-14) matches");

  line = "[13-14]";
  t.regex(line.trim(), VS_BRIDGE_PATTERN, "[13-14] matches");

  line = "13-14";
  t.regex(line.trim(), VS_BRIDGE_PATTERN, "13-14 matches");
  let vsBridgeMatch = line.trim().match(VS_BRIDGE_PATTERN);

  // validate verse range
  if (vsBridgeMatch) {
    if (vsBridgeMatch[2]) {
      t.is(vsBridgeMatch[2], "13", "bridge start matches");
    }
    if (vsBridgeMatch[3]) {
      t.is(vsBridgeMatch[3], "14", "bridge end matches");
    }
  }

  line = "8-9 (b)";
  t.regex(line.trim(), VS_BRIDGE_PATTERN, "8-9 (b) matches");
  vsBridgeMatch = line.trim().match(VS_BRIDGE_PATTERN);

  // validate verse range
  if (vsBridgeMatch) {
    if (vsBridgeMatch[2]) {
      t.is(vsBridgeMatch[2], "8", "bridge start matches");
    }
    if (vsBridgeMatch[3]) {
      t.is(vsBridgeMatch[3], "9", "bridge end matches");
    }
  }

  line = "13-14a";
  t.regex(line.trim(), VS_BRIDGE_PATTERN, "13-14a matches");

  line = "13a-14b";
  t.regex(line.trim(), VS_BRIDGE_PATTERN, "13a-14b matches");
  vsBridgeMatch = line.trim().match(VS_BRIDGE_PATTERN);

  // validate verse range
  if (vsBridgeMatch) {
    if (vsBridgeMatch[2]) {
      t.is(vsBridgeMatch[2], "13", "bridge start matches");
    }
    if (vsBridgeMatch[3]) {
      t.is(vsBridgeMatch[3], "14", "bridge end matches");
    }
  }

})
