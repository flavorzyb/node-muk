'use strict';

// keep track of mocks
var mocks = [];
var cache = new Map();


/**
 * Mocks a method of an object.
 *
 * @param {Object} obj
 * @param {string} key
 * @param {!Function} method
 */
var method = module.exports = function mockMethod(obj, key, method) {
  method = method === undefined ? function() {} : method;
  var hasOwnProperty = obj.hasOwnProperty(key);
  mocks.push({
    obj: obj,
    key: key,
    descriptor: Object.getOwnPropertyDescriptor(obj, key),
    // Make sure the key exists on object not the prototype
    hasOwnProperty: hasOwnProperty
  });

  // delete the origin key, redefine it below
  if (hasOwnProperty) {
    delete obj[key];
  }

  // set a flag that checks if it is mocked
  var flag = cache.get(obj);
  if (!flag) {
    flag = new Set();
    cache.set(obj, flag);
  }
  flag.add(key);

  // Can't not delete the property of process.env before node@4
  if (obj === process.env) {
    obj[key] = method;
    return;
  }

  Object.defineProperty(obj, key, {
    writable: true,
    configurable: true,
    enumerable: true,
    value: method
  });

};

/**
 * Restore all mocks
 */
method.restore = function restoreMocks() {
  for (var i = mocks.length - 1; i >= 0; i--) {
    var m = mocks[i];
    if (!m.hasOwnProperty) {
      // delete the mock key, use key on the prototype
      delete m.obj[m.key];
    } else {
      // can't redefine process.env when node<4
      // https://github.com/nodejs/node/pull/2999
      if (m.obj === process.env) {
        m.obj[m.key] = m.descriptor.value;
      } else {
        // redefine the origin key instead of the mock key
        Object.defineProperty(m.obj, m.key, m.descriptor);
      }
    }
  }
  mocks = [];
  cache.clear();

  /*
  requireMocks.forEach(function(m) {
    if (m.existed) {
      require.cache[m.filename].exports = m.original;
    } else {
      delete require.cache[m.filename];
    }
  });
  requireMocks = [];
  */
};

method.isMocked = function isMocked(obj, key) {
  var flag = cache.get(obj);
  return flag ? flag.has(key) : false;
}
