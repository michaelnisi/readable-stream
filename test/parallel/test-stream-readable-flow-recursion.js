"use strict";

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

/*<replacement>*/
var bufferShim = require('safe-buffer').Buffer;
/*</replacement>*/


require('../common');

var assert = require('assert/'); // this test verifies that passing a huge number to read(size)
// will push up the highWaterMark, and cause the stream to read
// more data continuously, but without triggering a nextTick
// warning or RangeError.


var Readable = require('../../').Readable; // throw an error if we trigger a nextTick warning.


process.throwDeprecation = true;
var stream = new Readable({
  highWaterMark: 2
});
var reads = 0;
var total = 5000;

stream._read = function (size) {
  reads++;
  size = Math.min(size, total);
  total -= size;
  if (size === 0) stream.push(null);else stream.push(bufferShim.allocUnsafe(size));
};

var depth = 0;

function flow(stream, size, callback) {
  depth += 1;
  var chunk = stream.read(size);
  if (!chunk) stream.once('readable', flow.bind(null, stream, size, callback));else callback(chunk);
  depth -= 1;
  console.log("flow(".concat(depth, "): exit"));
}

flow(stream, 5000, function () {
  console.log("complete (".concat(depth, ")"));
});
process.on('exit', function (code) {
  assert.strictEqual(reads, 2); // we pushed up the high water mark

  assert.strictEqual(stream.readableHighWaterMark, 8192); // length is 0 right now, because we pulled it all out.

  assert.strictEqual(stream.readableLength, 0);
  assert(!code);
  assert.strictEqual(depth, 0);

  require('tap').pass();
});
;

require('tap').pass('sync run');

var _list = process.listeners('uncaughtException');

process.removeAllListeners('uncaughtException');

_list.pop();

_list.forEach(function (e) {
  return process.on('uncaughtException', e);
});