// Copyright 2023 SIL International
// Trivial unit test for testing toolbox.ts regex
import test from 'ava';

import { VS_PATTERN, VS_BRIDGE_PATTERN, bridgeType, getVerseBridge } from '../dist/toolbox'


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
 * Tests VS_BRIDGE_PATTERN matches and determining verse bridges
 */
test('VS_BRIDGE_PATTERN for verse ranges', t => {
  let line = "(13-14)";
  t.regex(line.trim(), VS_BRIDGE_PATTERN, "(13-14) matches");
  t.deepEqual(getVerseBridge(line, 13), 
    {
      start: 13,
      end: 14
    }, "bridge (13, 14)");

  line = "[13-14]";
  t.regex(line.trim(), VS_BRIDGE_PATTERN, "[13-14] matches");
  t.deepEqual(getVerseBridge(line, 13), 
    {
      start: 13,
      end: 14
    }, "bridge [13, 14]");

  line = "13-14";
  t.regex(line.trim(), VS_BRIDGE_PATTERN, "13-14 matches");
  t.deepEqual(getVerseBridge(line, 13), 
    {
      start: 13,
      end: 14
    }, "bridge {13, 14}");

  line = "8-9 (b)";
  t.regex(line.trim(), VS_BRIDGE_PATTERN, "8-9 (b) matches");
  t.deepEqual(getVerseBridge(line, 8),
    {
      start: 8,
      end: 9
    }, "bridge 8-9 (b)");

  line = "13-14a";
  t.regex(line.trim(), VS_BRIDGE_PATTERN, "13-14a matches");

  line = "13a-14b";
  t.regex(line.trim(), VS_BRIDGE_PATTERN, "13a-14b matches");
  t.deepEqual(getVerseBridge(line, 13), 
    {
      start: 13,
      end: 14
    }, "bridge 13a-14b");

  // These do not match
  line = "x15a-y21b";
  t.notRegex(line.trim(), VS_BRIDGE_PATTERN, "x15a-y21b does not match");
  t.deepEqual(getVerseBridge(line, 15),
    {
      start: 15,
      end: 15
    }, "bridge x15a-y21b");

})
