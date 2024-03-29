"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isSuccessfulResponse = isSuccessfulResponse;
exports.isValidParameter = isValidParameter;
exports.getArgumentType = getArgumentType;
exports.getPrototype = getPrototype;
exports.commandCallStructure = commandCallStructure;
exports.isW3C = isW3C;
exports.isChrome = isChrome;
exports.isMobile = isMobile;
exports.isIOS = isIOS;
exports.isAndroid = isAndroid;
exports.isSauce = isSauce;
exports.isSeleniumStandalone = isSeleniumStandalone;
exports.environmentDetector = environmentDetector;
exports.getErrorFromResponseBody = getErrorFromResponseBody;
exports.overwriteElementCommands = overwriteElementCommands;
exports.getEnvironmentVars = getEnvironmentVars;
exports.CustomRequestError = void 0;

var _logger = _interopRequireDefault(require("@wdio/logger"));

var _command = _interopRequireDefault(require("./command"));

var _lodash = _interopRequireDefault(require("lodash.merge"));

var _webdriver = _interopRequireDefault(require("../protocol/webdriver.json"));

var _mjsonwp = _interopRequireDefault(require("../protocol/mjsonwp.json"));

var _jsonwp = _interopRequireDefault(require("../protocol/jsonwp.json"));

var _appium = _interopRequireDefault(require("../protocol/appium.json"));

var _chromium = _interopRequireDefault(require("../protocol/chromium.json"));

var _saucelabs = _interopRequireDefault(require("../protocol/saucelabs.json"));

var _selenium = _interopRequireDefault(require("../protocol/selenium.json"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const log = (0, _logger.default)('webdriver');

function isSuccessfulResponse(statusCode, body) {
  if (!body) {
    log.debug('request failed due to missing body');
    return false;
  }

  if (body.status === 7 && body.value && body.value.message && (body.value.message.toLowerCase().startsWith('no such element') || body.value.message === 'An element could not be located on the page using the given search parameters.' || body.value.message.toLowerCase().startsWith('unable to find element'))) {
    return true;
  }

  if (body.status && body.status !== 0) {
    log.debug(`request failed due to status ${body.status}`);
    return false;
  }

  const hasErrorResponse = body.value && (body.value.error || body.value.stackTrace || body.value.stacktrace);

  if (statusCode === 200 && !hasErrorResponse) {
    return true;
  }

  if (statusCode === 404 && body.value && body.value.error === 'no such element') {
    return true;
  }

  if (hasErrorResponse) {
    log.debug('request failed due to response error:', body.value.error);
    return false;
  }

  return true;
}

function isValidParameter(arg, expectedType) {
  let shouldBeArray = false;

  if (expectedType.slice(-2) === '[]') {
    expectedType = expectedType.slice(0, -2);
    shouldBeArray = true;
  }

  if (shouldBeArray) {
    if (!Array.isArray(arg)) {
      return false;
    }
  } else {
    arg = [arg];
  }

  for (const argEntity of arg) {
    const argEntityType = getArgumentType(argEntity);

    if (!argEntityType.match(expectedType)) {
      return false;
    }
  }

  return true;
}

function getArgumentType(arg) {
  return arg === null ? 'null' : typeof arg;
}

function getPrototype({
  isW3C,
  isChrome,
  isMobile,
  isSauce,
  isSeleniumStandalone
}) {
  const prototype = {};
  const ProtocolCommands = (0, _lodash.default)(isMobile ? (0, _lodash.default)({}, _jsonwp.default, _webdriver.default) : isW3C ? _webdriver.default : _jsonwp.default, isMobile ? (0, _lodash.default)({}, _mjsonwp.default, _appium.default) : {}, isChrome ? _chromium.default : {}, isSauce ? _saucelabs.default : {}, isSeleniumStandalone ? _selenium.default : {});

  for (const [endpoint, methods] of Object.entries(ProtocolCommands)) {
    for (const [method, commandData] of Object.entries(methods)) {
      prototype[commandData.command] = {
        value: (0, _command.default)(method, endpoint, commandData)
      };
    }
  }

  return prototype;
}

function commandCallStructure(commandName, args) {
  const callArgs = args.map(arg => {
    if (typeof arg === 'string') {
      arg = `"${arg}"`;
    } else if (typeof arg === 'function') {
      arg = '<fn>';
    } else if (arg === null) {
      arg = 'null';
    } else if (typeof arg === 'object') {
      arg = '<object>';
    } else if (typeof arg === 'undefined') {
      arg = typeof arg;
    }

    return arg;
  }).join(', ');
  return `${commandName}(${callArgs})`;
}

function isW3C(capabilities) {
  if (!capabilities) {
    return false;
  }

  const isAppium = capabilities.automationName || capabilities.deviceName;
  const hasW3CCaps = capabilities.platformName && capabilities.browserVersion && (capabilities.platformVersion || Object.prototype.hasOwnProperty.call(capabilities, 'setWindowRect'));
  return Boolean(hasW3CCaps || isAppium);
}

function isChrome(caps) {
  return Boolean(caps.chrome) || Boolean(caps['goog:chromeOptions']);
}

function isMobile(caps) {
  return Boolean(typeof caps['appium-version'] !== 'undefined' || typeof caps['device-type'] !== 'undefined' || typeof caps['deviceType'] !== 'undefined' || typeof caps['device-orientation'] !== 'undefined' || typeof caps['deviceOrientation'] !== 'undefined' || typeof caps.deviceName !== 'undefined' || caps.browserName === '' || caps.browserName !== undefined && (caps.browserName.toLowerCase() === 'ipad' || caps.browserName.toLowerCase() === 'iphone' || caps.browserName.toLowerCase() === 'android'));
}

function isIOS(caps) {
  return Boolean(caps.platformName && caps.platformName.match(/iOS/i) || caps.deviceName && caps.deviceName.match(/(iPad|iPhone)/i));
}

function isAndroid(caps) {
  return Boolean(caps.platformName && caps.platformName.match(/Android/i) || caps.browserName && caps.browserName.match(/Android/i));
}

function isSauce(hostname, caps) {
  return Boolean(caps.extendedDebugging || caps['sauce:options'] && caps['sauce:options'].extendedDebugging);
}

function isSeleniumStandalone(caps) {
  return Boolean(caps['webdriver.remote.sessionid']);
}

function environmentDetector({
  hostname,
  capabilities,
  requestedCapabilities
}) {
  return {
    isW3C: isW3C(capabilities),
    isChrome: isChrome(capabilities),
    isMobile: isMobile(capabilities),
    isIOS: isIOS(capabilities),
    isAndroid: isAndroid(capabilities),
    isSauce: isSauce(hostname, requestedCapabilities.w3cCaps.alwaysMatch),
    isSeleniumStandalone: isSeleniumStandalone(capabilities)
  };
}

function getErrorFromResponseBody(body) {
  if (!body) {
    return new Error('Response has empty body');
  }

  if (typeof body === 'string' && body.length) {
    return new Error(body);
  }

  if (typeof body !== 'object' || !body.value) {
    return new Error('unknown error');
  }

  return new CustomRequestError(body);
}

class CustomRequestError extends Error {
  constructor(body) {
    super(body.value.message || body.value.class || 'unknown error');

    if (body.value.error) {
      this.name = body.value.error;
    } else if (body.value.message && body.value.message.includes('stale element reference')) {
      this.name = 'stale element reference';
    }
  }

}

exports.CustomRequestError = CustomRequestError;

function overwriteElementCommands(propertiesObject) {
  const elementOverrides = propertiesObject['__elementOverrides__'] ? propertiesObject['__elementOverrides__'].value : {};

  for (const [commandName, userDefinedCommand] of Object.entries(elementOverrides)) {
    if (typeof userDefinedCommand !== 'function') {
      throw new Error('overwriteCommand: commands be overwritten only with functions, command: ' + commandName);
    }

    if (!propertiesObject[commandName]) {
      throw new Error('overwriteCommand: no command to be overwritten: ' + commandName);
    }

    if (typeof propertiesObject[commandName].value !== 'function') {
      throw new Error('overwriteCommand: only functions can be overwritten, command: ' + commandName);
    }

    const origCommand = propertiesObject[commandName].value;
    delete propertiesObject[commandName];

    const newCommand = function (...args) {
      const element = this;
      return userDefinedCommand.apply(element, [function origCommandFunction() {
        const context = this || element;
        return origCommand.apply(context, arguments);
      }, ...args]);
    };

    propertiesObject[commandName] = {
      value: newCommand,
      configurable: true
    };
  }

  delete propertiesObject['__elementOverrides__'];
  propertiesObject['__elementOverrides__'] = {
    value: {}
  };
}

function getEnvironmentVars({
  isW3C,
  isMobile,
  isIOS,
  isAndroid,
  isChrome,
  isSauce
}) {
  return {
    isW3C: {
      value: isW3C
    },
    isMobile: {
      value: isMobile
    },
    isIOS: {
      value: isIOS
    },
    isAndroid: {
      value: isAndroid
    },
    isChrome: {
      value: isChrome
    },
    isSauce: {
      value: isSauce
    },
    isSeleniumStandalone: {
      value: isSeleniumStandalone
    }
  };
}