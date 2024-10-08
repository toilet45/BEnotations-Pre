import Decimal from 'break_eternity.js';
import { __extends } from 'tslib';

var Settings = {
  isInfinite: function isInfinite(decimal) {
    return decimal.gte(new Decimal("1e9000000000000000"));
  },
  exponentCommas: {
    show: true,
    min: 100000,
    max: 1000000000
  },
  exponentDefaultPlaces: 3
};

function commaSection(value, index) {
  if (index === 0) {
    return value.slice(-3);
  }

  return value.slice(-3 * (index + 1), -3 * index);
}

function addCommas(value) {
  return Array.from(Array(Math.ceil(value.length / 3))).map(function (_, i) {
    return commaSection(value, i);
  }).reverse().join(",");
}

function formatWithCommas(value) {
  var decimalPointSplit = value.toString().split(".");
  decimalPointSplit[0] = decimalPointSplit[0].replace(/\w+$/g, addCommas);
  return decimalPointSplit.join(".");
}
function fixMantissaOverflow(value, places, threshold, powerOffset) {
  var pow10 = Math.pow(10, places);
  var isOverflowing = Math.round(value.mantissa * pow10) >= threshold * pow10;

  if (isOverflowing) {
    return Decimal.fromMantissaExponent_noNormalize(1, value.exponent + powerOffset);
  }

  return value;
}
function toEngineering(value) {
  var exponentOffset = value.exponent % 3;
  return Decimal.fromMantissaExponent_noNormalize(value.mantissa * Math.pow(10, exponentOffset), value.exponent - exponentOffset);
}
function toLongScale(value) {
  var mod = value.exponent < 6 ? 3 : 6;
  var exponentOffset = value.exponent % mod;
  return Decimal.fromMantissaExponent_noNormalize(value.mantissa * Math.pow(10, exponentOffset), value.exponent - exponentOffset);
}
function toFixedEngineering(value, places) {
  return fixMantissaOverflow(toEngineering(value), places, 1000, 3);
}
function toFixedLongScale(value, places) {
  var overflowPlaces = value.exponent < 6 ? 3 : 6;
  return fixMantissaOverflow(toLongScale(value), places, Math.pow(10, overflowPlaces), overflowPlaces);
}
var SUBSCRIPT_NUMBERS = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];
function toSubscript(value) {
  return value.toFixed(0).split("").map(function (x) {
    return x === "-" ? "₋" : SUBSCRIPT_NUMBERS[parseInt(x, 10)];
  }).join("");
}
var SUPERSCRIPT_NUMBERS = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
function toSuperscript(value) {
  return value.toFixed(0).split("").map(function (x) {
    return x === "-" ? "⁻" : SUPERSCRIPT_NUMBERS[parseInt(x, 10)];
  }).join("");
}
var STANDARD_ABBREVIATIONS = ["K", "M", "B", "T", "Qa", "Qt", "Sx", "Sp", "Oc", "No"];
var STANDARD_PREFIXES = [["", "U", "D", "T", "Qa", "Qt", "Sx", "Sp", "O", "N"], ["", "Dc", "Vg", "Tg", "Qd", "Qi", "Se", "St", "Og", "Nn"], ["", "Ce", "Dn", "Tc", "Qe", "Qu", "Sc", "Si", "Oe", "Ne"]];
var STANDARD_PREFIXES_2 = ["", "MI-", "MC-", "NA-", "PC-", "FM-", "AT-", "ZP-", "YT-", "RN-", "QC-"];
function abbreviateStandard(rawExp) {
  var exp = rawExp - 1;

  if (exp === -1) {
    return "";
  }

  if (exp < STANDARD_ABBREVIATIONS.length) {
    return STANDARD_ABBREVIATIONS[exp];
  }

  var prefix = [];
  var e = exp;

  while (e > 0) {
    prefix.push(STANDARD_PREFIXES[prefix.length % 3][e % 10]);
    e = Math.floor(e / 10);
  }

  while (prefix.length % 3 !== 0) {
    prefix.push("");
  }

  var abbreviation = "";

  for (var i = prefix.length / 3 - 1; i >= 0; i--) {
    abbreviation += prefix.slice(i * 3, i * 3 + 3).join("") + STANDARD_PREFIXES_2[i];
  }

  return abbreviation.replace(/-[A-Z]{2}-/g, "-").replace(/U([A-Z]{2}-)/g, "$1").replace(/-$/, "");
}
function noSpecialFormatting(exponent) {
  return exponent < Settings.exponentCommas.min;
}
function showCommas(exponent) {
  return Settings.exponentCommas.show && exponent < Settings.exponentCommas.max;
}
function isExponentFullyShown(exponent) {
  return noSpecialFormatting(exponent) || showCommas(exponent);
}
function formatMantissaWithExponent(mantissaFormatting, exponentFormatting, base, steps, mantissaFormattingIfExponentIsFormatted, separator, forcePositiveExponent) {
  if (separator === void 0) {
    separator = "e";
  }

  if (forcePositiveExponent === void 0) {
    forcePositiveExponent = false;
  }

  return function (n, precision, precisionExponent) {
    var realBase = Math.pow(base, steps);
    var exponent = Math.floor(n.exponent / Math.log10(realBase)) * steps;

    if (forcePositiveExponent) {
      exponent = Math.max(exponent, 0);
    }

    var mantissa = n.div(Decimal.pow(base, exponent)).toNumber();

    if (!(1 <= mantissa && mantissa < realBase)) {
      var adjust = Math.floor(Math.log(mantissa) / Math.log(realBase));
      mantissa /= Math.pow(realBase, adjust);
      exponent += steps * adjust;
    }

    var m = mantissaFormatting(mantissa, precision);

    if (m === mantissaFormatting(realBase, precision)) {
      m = mantissaFormatting(1, precision);
      exponent += steps;
    }

    if (exponent === 0) {
      return m;
    }

    var e = exponentFormatting(exponent, precisionExponent);

    if (typeof mantissaFormattingIfExponentIsFormatted !== 'undefined' && !isExponentFullyShown(exponent)) {
      m = mantissaFormattingIfExponentIsFormatted(mantissa, precision);
    }

    return "".concat(m).concat(separator).concat(e);
  };
}
function formatMantissaBaseTen(n, precision) {
  return n.toFixed(Math.max(0, precision));
}
function formatMantissa(base, digits) {
  return function (n, precision) {
    var value = Math.round(n * Math.pow(base, Math.max(0, precision)));
    var d = [];

    while (value > 0 || d.length === 0) {
      d.push(digits[value % base]);
      value = Math.floor(value / base);
    }

    var result = d.reverse().join("");

    if (precision > 0) {
      result = result.padStart(precision + 1, "0");
      result = "".concat(result.slice(0, -precision), ".").concat(result.slice(-precision));
    }

    return result;
  };
}

var Notation = function () {
  function Notation() {}

  Notation.prototype.format = function (value, places, placesUnder1000, placesExponent) {
    if (places === void 0) {
      places = 0;
    }

    if (placesUnder1000 === void 0) {
      placesUnder1000 = 0;
    }

    if (placesExponent === void 0) {
      placesExponent = places;
    }

    if (typeof value === "number" && !Number.isFinite(value)) {
      return this.infinite;
    }

    var decimal = Decimal.fromValue_noAlloc(value);

    if (decimal.exponent < -300) {
      return decimal.sign < 0 ? this.formatVerySmallNegativeDecimal(decimal.abs(), placesUnder1000) : this.formatVerySmallDecimal(decimal, placesUnder1000);
    }

    if (decimal.exponent < 3) {
      var number = decimal.toNumber();
      return number < 0 ? this.formatNegativeUnder1000(Math.abs(number), placesUnder1000) : this.formatUnder1000(number, placesUnder1000);
    }

    if (Settings.isInfinite(decimal.abs())) {
      return decimal.sign < 0 ? this.negativeInfinite : this.infinite;
    }

    return decimal.sign < 0 ? this.formatNegativeDecimal(decimal.abs(), places, placesExponent) : this.formatDecimal(decimal, places, placesExponent);
  };

  Object.defineProperty(Notation.prototype, "negativeInfinite", {
    get: function get() {
      return "-".concat(this.infinite);
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(Notation.prototype, "infinite", {
    get: function get() {
      return "Infinite";
    },
    enumerable: false,
    configurable: true
  });

  Notation.prototype.formatVerySmallNegativeDecimal = function (value, places) {
    return "-".concat(this.formatVerySmallDecimal(value, places));
  };

  Notation.prototype.formatVerySmallDecimal = function (value, places) {
    return this.formatUnder1000(value.toNumber(), places);
  };

  Notation.prototype.formatNegativeUnder1000 = function (value, places) {
    return "-".concat(this.formatUnder1000(value, places));
  };

  Notation.prototype.formatUnder1000 = function (value, places) {
    return value.toFixed(places);
  };

  Notation.prototype.formatNegativeDecimal = function (value, places, placesExponent) {
    return "-".concat(this.formatDecimal(value, places, placesExponent));
  };

  Notation.prototype.formatExponent = function (exponent, precision, specialFormat, largeExponentPrecision) {
    if (precision === void 0) {
      precision = Settings.exponentDefaultPlaces;
    }

    if (specialFormat === void 0) {
      specialFormat = function specialFormat(n, _) {
        return n.toString();
      };
    }

    if (largeExponentPrecision === void 0) {
      largeExponentPrecision = Math.max(2, precision);
    }

    if (noSpecialFormatting(exponent)) {
      return specialFormat(exponent, Math.max(precision, 1));
    }

    if (showCommas(exponent)) {
      return formatWithCommas(specialFormat(exponent, 0));
    }

    return this.format(exponent, largeExponentPrecision, largeExponentPrecision);
  };

  return Notation;
}();

var GreekLettersNotation = function (_super) {
  __extends(GreekLettersNotation, _super);

  function GreekLettersNotation() {
    return _super !== null && _super.apply(this, arguments) || this;
  }

  Object.defineProperty(GreekLettersNotation.prototype, "name", {
    get: function get() {
      return "Greek Letters";
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(GreekLettersNotation.prototype, "greek", {
    get: function get() {
      return "άαβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ".split("");
    },
    enumerable: false,
    configurable: true
  });

  GreekLettersNotation.prototype.formatDecimal = function (value, places) {
    var exp = Math.floor(value.e / 3);
    var step = Math.pow(this.greek.length, Math.floor(Math.log(exp) / Math.log(this.greek.length)));
    var suffix = "";

    while (step >= 1) {
      var ordinal = Math.floor(exp / step);
      suffix += this.greek[ordinal];
      exp -= step * ordinal;
      step /= this.greek.length;
    }

    var mantissa = Decimal.pow(10, (value.exponent + Math.log(Math.max(value.mantissa, 1))) % 3).toFixed(places);
    return "".concat(mantissa, " ").concat(suffix);
  };

  return GreekLettersNotation;
}(Notation);

var OmegaNotation = function (_super) {
  __extends(OmegaNotation, _super);

  function OmegaNotation() {
    return _super !== null && _super.apply(this, arguments) || this;
  }

  Object.defineProperty(OmegaNotation.prototype, "name", {
    get: function get() {
      return "Omega";
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(OmegaNotation.prototype, "greek", {
    get: function get() {
      return "βζλψΣΘΨω";
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(OmegaNotation.prototype, "infinite", {
    get: function get() {
      return "Ω";
    },
    enumerable: false,
    configurable: true
  });

  OmegaNotation.prototype.formatUnder1000 = function (value) {
    return this.formatDecimal(new Decimal(value));
  };

  OmegaNotation.prototype.formatDecimal = function (value) {
    var step = Decimal.floor(value.div(1000));
    var omegaAmount = Decimal.floor(step.div(this.greek.length));
    var lastLetter = this.greek[step.toNumber() % this.greek.length] + toSubscript(value.toNumber() % 1000);
    var beyondGreekArrayBounds = this.greek[step.toNumber() % this.greek.length] === undefined;

    if (beyondGreekArrayBounds || step.toNumber() > Number.MAX_SAFE_INTEGER) {
      lastLetter = "ω";
    }

    var omegaOrder = (value.exponent + Math.log(Math.max(value.mantissa, 1))) / Math.log10(8000);

    if (omegaAmount.equals(0)) {
      return lastLetter;
    } else if (omegaAmount.gt(0) && omegaAmount.lte(3)) {
      var omegas = [];

      for (var i = 0; i < omegaAmount.toNumber(); i++) {
        omegas.push("ω");
      }

      return "".concat(omegas.join("^"), "^").concat(lastLetter);
    } else if (omegaAmount.gt(3) && omegaAmount.lt(10)) {
      return "\u03C9(".concat(omegaAmount.toFixed(0), ")^").concat(lastLetter);
    } else if (omegaOrder < 3) {
      return "\u03C9(".concat(this.formatDecimal(omegaAmount), ")^").concat(lastLetter);
    } else if (omegaOrder < 6) {
      return "\u03C9(".concat(this.formatDecimal(omegaAmount), ")");
    }

    var val = Decimal.pow(8000, omegaOrder % 1);
    var orderStr = omegaOrder < 100 ? Math.floor(omegaOrder).toFixed(0) : this.formatDecimal(Decimal.floor(omegaOrder));
    return "\u03C9[".concat(orderStr, "](").concat(this.formatDecimal(val), ")");
  };

  return OmegaNotation;
}(Notation);

var OmegaShortNotation = function (_super) {
  __extends(OmegaShortNotation, _super);

  function OmegaShortNotation() {
    return _super !== null && _super.apply(this, arguments) || this;
  }

  Object.defineProperty(OmegaShortNotation.prototype, "name", {
    get: function get() {
      return "Omega (Short)";
    },
    enumerable: false,
    configurable: true
  });

  OmegaShortNotation.prototype.formatDecimal = function (value) {
    var step = Decimal.floor(value.div(1000));
    var omegaAmount = Decimal.floor(step.div(this.greek.length));
    var lastLetter = this.greek[step.toNumber() % this.greek.length] + toSubscript(value.toNumber() % 1000);
    var beyondGreekArrayBounds = this.greek[step.toNumber() % this.greek.length] === undefined;

    if (beyondGreekArrayBounds || step.toNumber() > Number.MAX_SAFE_INTEGER) {
      lastLetter = "ω";
    }

    var omegaOrder = (value.exponent + Math.log(Math.max(value.mantissa, 1))) / Math.log10(8000);

    if (omegaAmount.equals(0)) {
      return lastLetter;
    } else if (omegaAmount.gt(0) && omegaAmount.lte(2)) {
      var omegas = [];

      for (var i = 0; i < omegaAmount.toNumber(); i++) {
        omegas.push("ω");
      }

      return "".concat(omegas.join("^"), "^").concat(lastLetter);
    } else if (omegaAmount.gt(2) && omegaAmount.lt(10)) {
      return "\u03C9(".concat(omegaAmount.toFixed(0), ")^").concat(lastLetter);
    }

    var val = Decimal.pow(8000, omegaOrder % 1);
    var orderStr = omegaOrder < 100 ? Math.floor(omegaOrder).toFixed(0) : this.formatDecimal(Decimal.floor(omegaOrder));
    return "\u03C9[".concat(orderStr, "](").concat(this.formatDecimal(val), ")");
  };

  return OmegaShortNotation;
}(OmegaNotation);

var MAX_INT = Number.MAX_SAFE_INTEGER;
var MAX_INT_DECIMAL = new Decimal(MAX_INT);
var MAX_INT_LOG_10 = Math.log10(MAX_INT);
var MAX_FACTOR = 10000;

var PrecisePrimeNotation = function (_super) {
  __extends(PrecisePrimeNotation, _super);

  function PrecisePrimeNotation() {
    return _super !== null && _super.apply(this, arguments) || this;
  }

  Object.defineProperty(PrecisePrimeNotation.prototype, "name", {
    get: function get() {
      return "Precise Prime";
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(PrecisePrimeNotation.prototype, "infinite", {
    get: function get() {
      return "Primefinity?";
    },
    enumerable: false,
    configurable: true
  });

  PrecisePrimeNotation.prototype.formatUnder1000 = function (value) {
    return this.primify(new Decimal(value));
  };

  PrecisePrimeNotation.prototype.formatDecimal = function (value) {
    return this.primify(value);
  };

  PrecisePrimeNotation.prototype.primify = function (value) {
    if (value.lte(MAX_INT_DECIMAL)) {
      var floored = Math.floor(value.toNumber());

      if (floored === 0) {
        return "0";
      }

      if (floored === 1) {
        return "1";
      }

      return this.formatFromList(this.primesFromInt(floored));
    }

    var exp = value.exponent / MAX_INT_LOG_10;
    var base = Math.pow(MAX_INT, exp / Math.ceil(exp));

    if (exp <= MAX_INT) {
      return this.formatPowerTower([Math.round(base), Math.ceil(exp)]);
    }

    var exp2 = Math.log10(exp) / Math.log10(MAX_INT);
    var exp2Ceil = Math.ceil(exp2);
    exp = Math.pow(MAX_INT, exp2 / exp2Ceil);
    base = Math.pow(MAX_INT, exp / Math.ceil(exp));
    return this.formatPowerTower([Math.round(base), Math.ceil(exp), exp2Ceil]);
  };

  PrecisePrimeNotation.prototype.maybeParenthesize = function (x, b) {
    return b ? "(".concat(x, ")") : x;
  };

  PrecisePrimeNotation.prototype.formatPowerTower = function (exps) {
    var _this = this;

    var factorizations = exps.map(function (x) {
      return _this.primesFromInt(x);
    });
    var superscriptLastExponent = factorizations[exps.length - 1].length === 1;
    var parenthesize = factorizations.map(function (x, i) {
      return x[0] !== x[x.length - 1] || i === exps.length - 2 && x.length > 1 && superscriptLastExponent;
    });
    var formattedExps = factorizations.map(function (x, i) {
      return _this.maybeParenthesize(i === exps.length - 1 && superscriptLastExponent ? toSuperscript(x[0]) : _this.formatFromList(x), parenthesize[i]);
    });

    if (superscriptLastExponent) {
      var superscript = formattedExps.pop();
      formattedExps[exps.length - 2] += superscript;
    }

    return formattedExps.join("^");
  };

  PrecisePrimeNotation.prototype.formatFromList = function (factors) {
    var out = [];
    var last = 0;
    var count = 0;

    for (var _i = 0, factors_1 = factors; _i < factors_1.length; _i++) {
      var i = factors_1[_i];

      if (i === last) {
        count++;
      } else {
        if (last > 0) {
          if (count > 1) {
            out.push("".concat(last).concat(toSuperscript(count)));
          } else {
            out.push(last);
          }
        }

        last = i;
        count = 1;
      }
    }

    if (count > 1) {
      out.push("".concat(last).concat(toSuperscript(count)));
    } else {
      out.push(last);
    }

    return out.join("\xD7");
  };

  PrecisePrimeNotation.prototype.primesFromInt = function (num) {
    var n = num;
    var l = [];

    for (var _i = 0, _a = [2, 3]; _i < _a.length; _i++) {
      var k = _a[_i];

      for (; n % k === 0; n /= k) {
        l.push(k);
      }
    }

    var lim = Math.min(MAX_FACTOR, Math.floor(Math.sqrt(n)));

    for (var a = 5; a <= lim && a < n;) {
      for (; n % a === 0; n /= a) {
        l.push(a);
      }

      a += 2;

      for (; n % a === 0; n /= a) {
        l.push(a);
      }

      a += 4;
    }

    if (n > 1) {
      l.push(n);
    }

    return l;
  };

  return PrecisePrimeNotation;
}(Notation);

var JPNNOT_SUFFIXES = ["", "万", "億", "兆", "京", "垓", "秭", "穣", "溝", "澗", "正", "載", "極", "恒河沙", "阿僧祇", "那由他", "不可思議", "無量大数"];

var JapaneseNotation = function (_super) {
  __extends(JapaneseNotation, _super);

  function JapaneseNotation() {
    return _super !== null && _super.apply(this, arguments) || this;
  }

  Object.defineProperty(JapaneseNotation.prototype, "name", {
    get: function get() {
      return "Japanese";
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(JapaneseNotation.prototype, "infinite", {
    get: function get() {
      return "無限";
    },
    enumerable: false,
    configurable: true
  });

  JapaneseNotation.prototype.formatDecimal = function (value, places) {
    if (value.exponent < 72) {
      return this.jpnNotation(value);
    }

    return "".concat(value.mantissa.toFixed(places), "\xD710\u306E").concat(this.jpnNotation(new Decimal(value.exponent)), "\u4E57");
  };

  JapaneseNotation.prototype.getSuffix = function (x) {
    return JPNNOT_SUFFIXES[x];
  };

  JapaneseNotation.prototype.jpnNotation = function (value) {
    var exponentLast = Math.max(0, Math.floor(value.exponent / 4));
    var mantissa = Decimal.times(Decimal.pow(10, value.exponent - 4 * exponentLast), value.mantissa).toFixed(4);
    var integerPart = Decimal.floor(mantissa);
    var subExponent = Decimal.times(Decimal.minus(mantissa, integerPart), 10000);
    var moneyStr = "".concat(integerPart.toString()).concat(this.getSuffix(exponentLast));

    if (exponentLast >= 1 && subExponent.neq(0)) {
      moneyStr += "".concat(subExponent.toString()).concat(this.getSuffix(exponentLast - 1));
    }

    return moneyStr;
  };

  return JapaneseNotation;
}(Notation);

var TritetratedNotation = function (_super) {
  __extends(TritetratedNotation, _super);

  function TritetratedNotation() {
    return _super !== null && _super.apply(this, arguments) || this;
  }

  Object.defineProperty(TritetratedNotation.prototype, "name", {
    get: function get() {
      return "Tritetrated";
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(TritetratedNotation.prototype, "infinite", {
    get: function get() {
      return "Infinity";
    },
    enumerable: false,
    configurable: true
  });

  TritetratedNotation.prototype.formatUnder1000 = function (value) {
    return this.tritetrated(new Decimal(value));
  };

  TritetratedNotation.prototype.formatDecimal = function (value) {
    return this.tritetrated(value);
  };

  TritetratedNotation.prototype.tritetrated = function (value) {
    var low = 0;
    var high = 16;

    while (high - low > 1e-7) {
      var mid = (low + high) / 2;

      if (Decimal.pow(mid, Math.pow(mid, mid)).lt(value)) {
        low = mid;
      } else {
        high = mid;
      }
    }

    return "".concat(low.toFixed(4), "\u2191\u21913");
  };

  return TritetratedNotation;
}(Notation);

var EngineeringNotation = function (_super) {
  __extends(EngineeringNotation, _super);

  function EngineeringNotation() {
    return _super !== null && _super.apply(this, arguments) || this;
  }

  Object.defineProperty(EngineeringNotation.prototype, "name", {
    get: function get() {
      return "Engineering";
    },
    enumerable: false,
    configurable: true
  });

  EngineeringNotation.prototype.formatDecimal = function (value, places, placesExponent) {
    return formatMantissaWithExponent(formatMantissaBaseTen, this.formatExponent.bind(this), 10, 3, function (x, _) {
      return formatMantissaBaseTen(x, 0);
    })(value, places, placesExponent);
  };

  return EngineeringNotation;
}(Notation);

var CustomNotation = function (_super) {
  __extends(CustomNotation, _super);

  function CustomNotation(letters, mantissaExponentSeparator, separator) {
    if (mantissaExponentSeparator === void 0) {
      mantissaExponentSeparator = "";
    }

    if (separator === void 0) {
      separator = "";
    }

    var _this = this;

    if (letters.length < 2) {
      throw new Error("The supplied letter sequence must contain at least 2 letters");
    }

    _this = _super.call(this) || this;
    _this.letters = letters;
    _this.mantissaExponentSeparator = mantissaExponentSeparator;
    _this.separator = separator;
    return _this;
  }

  Object.defineProperty(CustomNotation.prototype, "name", {
    get: function get() {
      return "Custom";
    },
    enumerable: false,
    configurable: true
  });

  CustomNotation.prototype.formatDecimal = function (value, places) {
    var engineering = toEngineering(value);
    var mantissa = engineering.mantissa.toFixed(places);
    return mantissa + this.mantissaExponentSeparator + this.transcribe(engineering.exponent).join(this.separator);
  };

  CustomNotation.prototype.transcribe = function (exponent) {
    var normalizedExponent = exponent / 3;
    var base = this.letters.length;

    if (normalizedExponent <= base) {
      return [this.letters[normalizedExponent - 1]];
    }

    var letters = [];

    while (normalizedExponent > base) {
      var remainder = normalizedExponent % base;
      var letterIndex = (remainder === 0 ? base : remainder) - 1;
      letters.push(this.letters[letterIndex]);
      normalizedExponent = (normalizedExponent - remainder) / base;

      if (remainder === 0) {
        normalizedExponent--;
      }
    }

    letters.push(this.letters[normalizedExponent - 1]);
    return letters.reverse();
  };

  return CustomNotation;
}(EngineeringNotation);

var FLAGS = ["\uD83C\uDDE6\uD83C\uDDEB", "\uD83C\uDDE6\uD83C\uDDE9", "\uD83C\uDDE6\uD83C\uDDEA", "\uD83C\uDDE6\uD83C\uDDEB", "\uD83C\uDDE6\uD83C\uDDEC", "\uD83C\uDDE6\uD83C\uDDEE", "\uD83C\uDDE6\uD83C\uDDF1", "\uD83C\uDDE6\uD83C\uDDF2", "\uD83C\uDDE6\uD83C\uDDF4", "\uD83C\uDDE6\uD83C\uDDF6", "\uD83C\uDDE6\uD83C\uDDF7", "\uD83C\uDDE6\uD83C\uDDF8", "\uD83C\uDDE6\uD83C\uDDF9", "\uD83C\uDDE6\uD83C\uDDFA", "\uD83C\uDDE6\uD83C\uDDFC", "\uD83C\uDDE6\uD83C\uDDFD", "\uD83C\uDDE6\uD83C\uDDFF", "\uD83C\uDDE7\uD83C\uDDE6", "\uD83C\uDDE7\uD83C\uDDE7", "\uD83C\uDDE7\uD83C\uDDE9", "\uD83C\uDDE7\uD83C\uDDEA", "\uD83C\uDDE7\uD83C\uDDEB", "\uD83C\uDDE7\uD83C\uDDEC", "\uD83C\uDDE7\uD83C\uDDED", "\uD83C\uDDE7\uD83C\uDDEE", "\uD83C\uDDE7\uD83C\uDDEF", "\uD83C\uDDE7\uD83C\uDDF1", "\uD83C\uDDE7\uD83C\uDDF2", "\uD83C\uDDE7\uD83C\uDDF3", "\uD83C\uDDE7\uD83C\uDDF4", "\uD83C\uDDE7\uD83C\uDDF6", "\uD83C\uDDE7\uD83C\uDDF7", "\uD83C\uDDE7\uD83C\uDDF8", "\uD83C\uDDE7\uD83C\uDDF9", "\uD83C\uDDE7\uD83C\uDDFB", "\uD83C\uDDE7\uD83C\uDDFC", "\uD83C\uDDE7\uD83C\uDDFE", "\uD83C\uDDE7\uD83C\uDDFF", "\uD83C\uDDE8\uD83C\uDDE6", "\uD83C\uDDE8\uD83C\uDDE8", "\uD83C\uDDE8\uD83C\uDDE9", "\uD83C\uDDE8\uD83C\uDDEB", "\uD83C\uDDE8\uD83C\uDDEC", "\uD83C\uDDE8\uD83C\uDDED", "\uD83C\uDDE8\uD83C\uDDEE", "\uD83C\uDDE8\uD83C\uDDF0", "\uD83C\uDDE8\uD83C\uDDF1", "\uD83C\uDDE8\uD83C\uDDF2", "\uD83C\uDDE8\uD83C\uDDF3", "\uD83C\uDDE8\uD83C\uDDF4", "\uD83C\uDDE8\uD83C\uDDF5", "\uD83C\uDDE8\uD83C\uDDF7", "\uD83C\uDDE8\uD83C\uDDFA", "\uD83C\uDDE8\uD83C\uDDFB", "\uD83C\uDDE8\uD83C\uDDFC", "\uD83C\uDDE8\uD83C\uDDFD", "\uD83C\uDDE8\uD83C\uDDFE", "\uD83C\uDDE8\uD83C\uDDFF", "\uD83C\uDDE9\uD83C\uDDEA", "\uD83C\uDDE9\uD83C\uDDEC", "\uD83C\uDDE9\uD83C\uDDEF", "\uD83C\uDDE9\uD83C\uDDF0", "\uD83C\uDDE9\uD83C\uDDF2", "\uD83C\uDDE9\uD83C\uDDF4", "\uD83C\uDDE9\uD83C\uDDFF", "\uD83C\uDDEA\uD83C\uDDE6", "\uD83C\uDDEA\uD83C\uDDE8", "\uD83C\uDDEA\uD83C\uDDEA", "\uD83C\uDDEA\uD83C\uDDEC", "\uD83C\uDDEA\uD83C\uDDED", "\uD83C\uDDEA\uD83C\uDDF7", "\uD83C\uDDEA\uD83C\uDDF8", "\uD83C\uDDEA\uD83C\uDDF9", "\uD83C\uDDEA\uD83C\uDDFA", "\uD83C\uDDEB\uD83C\uDDEE", "\uD83C\uDDEB\uD83C\uDDEF", "\uD83C\uDDEB\uD83C\uDDF0", "\uD83C\uDDEB\uD83C\uDDF2", "\uD83C\uDDEB\uD83C\uDDF4", "\uD83C\uDDEB\uD83C\uDDF7", "\uD83C\uDDEC\uD83C\uDDE6", "\uD83C\uDDEC\uD83C\uDDE7", "\uD83C\uDDEC\uD83C\uDDE9", "\uD83C\uDDEC\uD83C\uDDEA", "\uD83C\uDDEC\uD83C\uDDEB", "\uD83C\uDDEC\uD83C\uDDEC", "\uD83C\uDDEC\uD83C\uDDED", "\uD83C\uDDEC\uD83C\uDDEE", "\uD83C\uDDEC\uD83C\uDDF1", "\uD83C\uDDEC\uD83C\uDDF2", "\uD83C\uDDEC\uD83C\uDDF3", "\uD83C\uDDEC\uD83C\uDDF5", "\uD83C\uDDEC\uD83C\uDDF6", "\uD83C\uDDEC\uD83C\uDDF7", "\uD83C\uDDEC\uD83C\uDDF8", "\uD83C\uDDEC\uD83C\uDDF9", "\uD83C\uDDEC\uD83C\uDDFA", "\uD83C\uDDEC\uD83C\uDDFC", "\uD83C\uDDEC\uD83C\uDDFE", "\uD83C\uDDED\uD83C\uDDF0", "\uD83C\uDDED\uD83C\uDDF2", "\uD83C\uDDED\uD83C\uDDF3", "\uD83C\uDDED\uD83C\uDDF7", "\uD83C\uDDED\uD83C\uDDF9", "\uD83C\uDDED\uD83C\uDDFA", "\uD83C\uDDEE\uD83C\uDDE8", "\uD83C\uDDEE\uD83C\uDDE9", "\uD83C\uDDEE\uD83C\uDDEA", "\uD83C\uDDEE\uD83C\uDDF1", "\uD83C\uDDEE\uD83C\uDDF2", "\uD83C\uDDEE\uD83C\uDDF3", "\uD83C\uDDEE\uD83C\uDDF4", "\uD83C\uDDEE\uD83C\uDDF6", "\uD83C\uDDEE\uD83C\uDDF7", "\uD83C\uDDEE\uD83C\uDDF8", "\uD83C\uDDEE\uD83C\uDDF9", "\uD83C\uDDEF\uD83C\uDDEA", "\uD83C\uDDEF\uD83C\uDDF2", "\uD83C\uDDEF\uD83C\uDDF4", "\uD83C\uDDEF\uD83C\uDDF5", "\uD83C\uDDF0\uD83C\uDDEA", "\uD83C\uDDF0\uD83C\uDDEC", "\uD83C\uDDF0\uD83C\uDDED", "\uD83C\uDDF0\uD83C\uDDEE", "\uD83C\uDDF0\uD83C\uDDF2", "\uD83C\uDDF0\uD83C\uDDF3", "\uD83C\uDDF0\uD83C\uDDF5", "\uD83C\uDDF0\uD83C\uDDF7", "\uD83C\uDDF0\uD83C\uDDFC", "\uD83C\uDDF0\uD83C\uDDFE", "\uD83C\uDDF0\uD83C\uDDFF", "\uD83C\uDDF1\uD83C\uDDE6", "\uD83C\uDDF1\uD83C\uDDE7", "\uD83C\uDDF1\uD83C\uDDE8", "\uD83C\uDDF1\uD83C\uDDEE", "\uD83C\uDDF1\uD83C\uDDF0", "\uD83C\uDDF1\uD83C\uDDF7", "\uD83C\uDDF1\uD83C\uDDF8", "\uD83C\uDDF1\uD83C\uDDF9", "\uD83C\uDDF1\uD83C\uDDFA", "\uD83C\uDDF1\uD83C\uDDFB", "\uD83C\uDDF1\uD83C\uDDFE", "\uD83C\uDDF2\uD83C\uDDE6", "\uD83C\uDDF2\uD83C\uDDE8", "\uD83C\uDDF2\uD83C\uDDE9", "\uD83C\uDDF2\uD83C\uDDEA", "\uD83C\uDDF2\uD83C\uDDEB", "\uD83C\uDDF2\uD83C\uDDEC", "\uD83C\uDDF2\uD83C\uDDED", "\uD83C\uDDF2\uD83C\uDDF0", "\uD83C\uDDF2\uD83C\uDDF1", "\uD83C\uDDF2\uD83C\uDDF2", "\uD83C\uDDF2\uD83C\uDDF3", "\uD83C\uDDF2\uD83C\uDDF4", "\uD83C\uDDF2\uD83C\uDDF5", "\uD83C\uDDF2\uD83C\uDDF6", "\uD83C\uDDF2\uD83C\uDDF7", "\uD83C\uDDF2\uD83C\uDDF8", "\uD83C\uDDF2\uD83C\uDDF9", "\uD83C\uDDF2\uD83C\uDDFA", "\uD83C\uDDF2\uD83C\uDDFB", "\uD83C\uDDF2\uD83C\uDDFC", "\uD83C\uDDF2\uD83C\uDDFD", "\uD83C\uDDF2\uD83C\uDDFE", "\uD83C\uDDF2\uD83C\uDDFF", "\uD83C\uDDF3\uD83C\uDDE6", "\uD83C\uDDF3\uD83C\uDDE8", "\uD83C\uDDF3\uD83C\uDDEA", "\uD83C\uDDF3\uD83C\uDDEB", "\uD83C\uDDF3\uD83C\uDDEC", "\uD83C\uDDF3\uD83C\uDDEE", "\uD83C\uDDF3\uD83C\uDDF1", "\uD83C\uDDF3\uD83C\uDDF4", "\uD83C\uDDF3\uD83C\uDDF5", "\uD83C\uDDF3\uD83C\uDDF7", "\uD83C\uDDF3\uD83C\uDDFA", "\uD83C\uDDF3\uD83C\uDDFF", "\uD83C\uDDF4\uD83C\uDDF2", "\uD83C\uDDF5\uD83C\uDDE6", "\uD83C\uDDF5\uD83C\uDDEA", "\uD83C\uDDF5\uD83C\uDDEB", "\uD83C\uDDF5\uD83C\uDDEC", "\uD83C\uDDF5\uD83C\uDDED", "\uD83C\uDDF5\uD83C\uDDF0", "\uD83C\uDDF5\uD83C\uDDF1", "\uD83C\uDDF5\uD83C\uDDF2", "\uD83C\uDDF5\uD83C\uDDF3", "\uD83C\uDDF5\uD83C\uDDF7", "\uD83C\uDDF5\uD83C\uDDF8", "\uD83C\uDDF5\uD83C\uDDF9", "\uD83C\uDDF5\uD83C\uDDFC", "\uD83C\uDDF5\uD83C\uDDFE", "\uD83C\uDDF6\uD83C\uDDE6", "\uD83C\uDDF7\uD83C\uDDEA", "\uD83C\uDDF7\uD83C\uDDF4", "\uD83C\uDDF7\uD83C\uDDF8", "\uD83C\uDDF7\uD83C\uDDFA", "\uD83C\uDDF7\uD83C\uDDFC", "\uD83C\uDDF8\uD83C\uDDE6", "\uD83C\uDDF8\uD83C\uDDE7", "\uD83C\uDDF8\uD83C\uDDE8", "\uD83C\uDDF8\uD83C\uDDE9", "\uD83C\uDDF8\uD83C\uDDEA", "\uD83C\uDDF8\uD83C\uDDEC", "\uD83C\uDDF8\uD83C\uDDED", "\uD83C\uDDF8\uD83C\uDDEE", "\uD83C\uDDF8\uD83C\uDDEF", "\uD83C\uDDF8\uD83C\uDDF0", "\uD83C\uDDF8\uD83C\uDDF1", "\uD83C\uDDF8\uD83C\uDDF2", "\uD83C\uDDF8\uD83C\uDDF3", "\uD83C\uDDF8\uD83C\uDDF4", "\uD83C\uDDF8\uD83C\uDDF7", "\uD83C\uDDF8\uD83C\uDDF8", "\uD83C\uDDF8\uD83C\uDDF9", "\uD83C\uDDF8\uD83C\uDDFB", "\uD83C\uDDF8\uD83C\uDDFD", "\uD83C\uDDF8\uD83C\uDDFE", "\uD83C\uDDF8\uD83C\uDDFF", "\uD83C\uDDF9\uD83C\uDDE6", "\uD83C\uDDF9\uD83C\uDDE8", "\uD83C\uDDF9\uD83C\uDDE9", "\uD83C\uDDF9\uD83C\uDDEB", "\uD83C\uDDF9\uD83C\uDDEC", "\uD83C\uDDF9\uD83C\uDDED", "\uD83C\uDDF9\uD83C\uDDEF", "\uD83C\uDDF9\uD83C\uDDF0", "\uD83C\uDDF9\uD83C\uDDF1", "\uD83C\uDDF9\uD83C\uDDF2", "\uD83C\uDDF9\uD83C\uDDF3", "\uD83C\uDDF9\uD83C\uDDF4", "\uD83C\uDDF9\uD83C\uDDF7", "\uD83C\uDDF9\uD83C\uDDF9", "\uD83C\uDDF9\uD83C\uDDFB", "\uD83C\uDDF9\uD83C\uDDFC", "\uD83C\uDDF9\uD83C\uDDFF", "\uD83C\uDDFA\uD83C\uDDE6", "\uD83C\uDDFA\uD83C\uDDEC", "\uD83C\uDDFA\uD83C\uDDF2", "\uD83C\uDDFA\uD83C\uDDF3", "\uD83C\uDDFA\uD83C\uDDF8", "\uD83C\uDDFA\uD83C\uDDFE", "\uD83C\uDDFA\uD83C\uDDFF", "\uD83C\uDDFB\uD83C\uDDE6", "\uD83C\uDDFB\uD83C\uDDE8", "\uD83C\uDDFB\uD83C\uDDEA", "\uD83C\uDDFB\uD83C\uDDEC", "\uD83C\uDDFB\uD83C\uDDEE", "\uD83C\uDDFB\uD83C\uDDF3", "\uD83C\uDDFB\uD83C\uDDFA", "\uD83C\uDDFC\uD83C\uDDEB", "\uD83C\uDDFC\uD83C\uDDF8", "\uD83C\uDDFD\uD83C\uDDF0", "\uD83C\uDDFE\uD83C\uDDEA", "\uD83C\uDDFE\uD83C\uDDF9", "\uD83C\uDDFF\uD83C\uDDE6", "\uD83C\uDDFF\uD83C\uDDF2", "\uD83C\uDDFF\uD83C\uDDFC"];

var FlagsNotation = function (_super) {
  __extends(FlagsNotation, _super);

  function FlagsNotation() {
    return _super.call(this, FLAGS) || this;
  }

  Object.defineProperty(FlagsNotation.prototype, "name", {
    get: function get() {
      return "Flags";
    },
    enumerable: false,
    configurable: true
  });
  return FlagsNotation;
}(CustomNotation);

var YesNoNotation = function (_super) {
  __extends(YesNoNotation, _super);

  function YesNoNotation() {
    return _super !== null && _super.apply(this, arguments) || this;
  }

  Object.defineProperty(YesNoNotation.prototype, "name", {
    get: function get() {
      return "YesNo";
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(YesNoNotation.prototype, "negativeInfinite", {
    get: function get() {
      return "YES";
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(YesNoNotation.prototype, "infinite", {
    get: function get() {
      return "YES";
    },
    enumerable: false,
    configurable: true
  });

  YesNoNotation.prototype.formatVerySmallNegativeDecimal = function (x) {
    return x.neq(0) ? "YES" : "NO";
  };

  YesNoNotation.prototype.formatVerySmallDecimal = function (x) {
    return x.neq(0) ? "YES" : "NO";
  };

  YesNoNotation.prototype.formatNegativeUnder1000 = function (x) {
    return x !== 0 ? "YES" : "NO";
  };

  YesNoNotation.prototype.formatUnder1000 = function (x) {
    return x !== 0 ? "YES" : "NO";
  };

  YesNoNotation.prototype.formatNegativeDecimal = function (x) {
    return x.neq(0) ? "YES" : "NO";
  };

  YesNoNotation.prototype.formatDecimal = function (x) {
    return x.neq(0) ? "YES" : "NO";
  };

  return YesNoNotation;
}(Notation);

var ScientificNotation = function (_super) {
  __extends(ScientificNotation, _super);

  function ScientificNotation() {
    return _super !== null && _super.apply(this, arguments) || this;
  }

  Object.defineProperty(ScientificNotation.prototype, "name", {
    get: function get() {
      return "Scientific";
    },
    enumerable: false,
    configurable: true
  });

  ScientificNotation.prototype.formatDecimal = function (value, places, placesExponent) {
    return formatMantissaWithExponent(formatMantissaBaseTen, this.formatExponent.bind(this), 10, 1, function (x, _) {
      return formatMantissaBaseTen(x, 0);
    })(value, places, placesExponent);
  };

  return ScientificNotation;
}(Notation);

var scientific$1 = new ScientificNotation();

var EvilNotation = function (_super) {
  __extends(EvilNotation, _super);

  function EvilNotation() {
    return _super !== null && _super.apply(this, arguments) || this;
  }

  Object.defineProperty(EvilNotation.prototype, "name", {
    get: function get() {
      return "Evil";
    },
    enumerable: false,
    configurable: true
  });

  EvilNotation.prototype.formatDecimal = function (value, places) {
    var loglog = Math.log((value.exponent + Math.log(Math.max(value.mantissa, 1))) / Math.log(2)) / Math.log(2);
    var roundedLoglog = Math.round(loglog);
    var adjustedValue = new Decimal();

    if (roundedLoglog < 6 || Math.abs(loglog - roundedLoglog) > 0.25) {
      adjustedValue = value;
    } else {
      adjustedValue = value.pow(roundedLoglog % 2 === 0 ? 2 : 1 / 2);
    }

    return scientific$1.format(adjustedValue, places);
  };

  return EvilNotation;
}(Notation);

var scientific = new ScientificNotation();
var EMOJIER = ["🎂", "🎄", "💀", "👪", "🌈", "💯", "🎃", "💋", "😂", "🌙"];

var EmojierNotation = function (_super) {
  __extends(EmojierNotation, _super);

  function EmojierNotation() {
    return _super !== null && _super.apply(this, arguments) || this;
  }

  Object.defineProperty(EmojierNotation.prototype, "name", {
    get: function get() {
      return "Emojier";
    },
    enumerable: false,
    configurable: true
  });

  EmojierNotation.prototype.formatUnder1000 = function (value, places) {
    return this.affect(scientific.formatUnder1000(value, places));
  };

  EmojierNotation.prototype.formatDecimal = function (value, places, placesExponent) {
    return this.affect(scientific.formatDecimal(value, places, placesExponent));
  };

  EmojierNotation.prototype.affect = function (formatted) {
    var characters = formatted.split("");
    var seenDigits = [];

    for (var i = 0; i < characters.length; i++) {
      if ("0123456789".includes(characters[i])) {
        if (seenDigits.map(function (x) {
          return x % 5;
        }).includes(Number(characters[i]) % 5)) {
          var emojierIndex = seenDigits.map(function (x) {
            return x % 5;
          }).indexOf(Number(characters[i]) % 5) + 5 * ((Number(!seenDigits.includes(Number(characters[i]))) + i) % 2);
          characters[i] = EMOJIER[emojierIndex];
        } else {
          seenDigits.push(Number(characters[i]));
        }
      }
    }

    return characters.join("");
  };

  return EmojierNotation;
}(Notation);

var ChineseNotPrefixes = ["", "万", "亿", "兆", "京", "垓", "秭", "穰", "沟", "涧", "正", "载", "极"];
var ChineseNotDigits = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
var ChineseNotPlaces = ["", "十", "百", "千"];

var ChineseNotation = function (_super) {
  __extends(ChineseNotation, _super);

  function ChineseNotation() {
    return _super !== null && _super.apply(this, arguments) || this;
  }

  Object.defineProperty(ChineseNotation.prototype, "name", {
    get: function get() {
      return "Chinese";
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(ChineseNotation.prototype, "infinite", {
    get: function get() {
      return "無窮";
    },
    enumerable: false,
    configurable: true
  });

  ChineseNotation.prototype.formatUnder1000 = function (value) {
    return this.formatUnder10000(value);
  };

  ChineseNotation.prototype.formatDecimal = function (value) {
    return this.formatChinese(value);
  };

  ChineseNotation.prototype.formatChinese = function (value) {
    if (value.exponent < 4) {
      return this.formatUnder10000(value.toNumber());
    }

    if (value.exponent < 52) {
      return this.formatAbove10000(value);
    }

    var replacement = Math.floor(value.exponent / 48);

    if (replacement < 6) {
      return this.formatAbove1e48(value.div(Decimal.pow(1e48, replacement))) + ChineseNotPrefixes[12].repeat(replacement);
    }

    return "".concat(this.formatAbove1e48(value.div(Decimal.pow(1e48, replacement))), "(").concat(this.formatChinese(new Decimal(replacement)), ")").concat(ChineseNotPrefixes[12]);
  };

  ChineseNotation.prototype.formatAbove1e48 = function (value) {
    var exp = Math.floor(value.exponent / 4) * 4;
    var man = value.mantissa * Math.pow(10, value.exponent - exp);
    return this.formatUnder10000WithPlaces(man) + ChineseNotPrefixes[exp / 4];
  };

  ChineseNotation.prototype.formatAbove10000 = function (value) {
    var exp = Math.floor(value.exponent / 4) * 4;
    var man = Math.floor(value.mantissa * Math.pow(10, value.exponent - exp));
    var manb = Math.floor(value.mantissa * Math.pow(10, value.exponent - exp + 4)) % 10000;
    return this.formatUnder10000(man) + ChineseNotPrefixes[exp / 4] + (manb > 0 ? this.formatUnder10000(manb) + ChineseNotPrefixes[exp / 4 - 1] : "");
  };

  ChineseNotation.prototype.formatUnder10000WithPlaces = function (value) {
    return "".concat(this.formatUnder1000(value), "\u9EDE").concat([1, 2, 3].map(function (x) {
      return ChineseNotDigits[Math.floor(value * Math.pow(10, x)) % 10];
    }).join(""));
  };

  ChineseNotation.prototype.formatUnder10000 = function (value) {
    return [3, 2, 1, 0].map(function (x) {
      var digit = Math.floor(value / Math.pow(10, x)) % 10;

      if (digit === 0) {
        return "";
      }

      if (digit === 1 && x === 1) {
        return ChineseNotPlaces[x];
      }

      return ChineseNotDigits[digit] + ChineseNotPlaces[x];
    }).join("") || ChineseNotDigits[0];
  };

  return ChineseNotation;
}(Notation);

var ELEMENT_LISTS = [["H"], ["He", "Li", "Be", "B", "C", "N", "O", "F"], ["Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl"], ["Ar", "K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br"], ["Kr", "Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn", "Sb", "Te", "I"], ["Xe", "Cs", "Ba", "La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu", "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg", "Tl", "Pb", "Bi", "Po", "At"], ["Rn", "Fr", "Ra", "Ac", "Th", "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm", "Md", "No", "Lr", "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds", "Rg", "Cn", "Nh", "Fl", "Mc", "Lv", "Ts"], ["Og"]];

var ElementalNotation = function (_super) {
  __extends(ElementalNotation, _super);

  function ElementalNotation() {
    return _super !== null && _super.apply(this, arguments) || this;
  }

  Object.defineProperty(ElementalNotation.prototype, "name", {
    get: function get() {
      return "Elemental";
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(ElementalNotation.prototype, "infinite", {
    get: function get() {
      return "Infinity";
    },
    enumerable: false,
    configurable: true
  });

  ElementalNotation.prototype.formatUnder1000 = function (value, placesUnder1000) {
    return this.elemental(new Decimal(value), placesUnder1000);
  };

  ElementalNotation.prototype.formatDecimal = function (value, places) {
    return this.elemental(value, places);
  };

  ElementalNotation.prototype.getAbbreviationAndValue = function (x) {
    var abbreviationListIndexUnfloored = Math.log(x) / Math.log(118);
    var abbreviationListIndex = Math.floor(abbreviationListIndexUnfloored);
    var abbreviationList = ELEMENT_LISTS[Math.floor(abbreviationListIndex)];
    var abbreviationSublistIndex = Math.floor((abbreviationListIndexUnfloored - abbreviationListIndex) * abbreviationList.length);
    var abbreviation = abbreviationList[abbreviationSublistIndex];
    var value = Math.pow(118, abbreviationListIndex + abbreviationSublistIndex / abbreviationList.length);
    return [abbreviation, value];
  };

  ElementalNotation.prototype.formatElementalPart = function (abbreviation, n) {
    if (n === 1) {
      return abbreviation;
    }

    return "".concat(n, " ").concat(abbreviation);
  };

  ElementalNotation.prototype.elemental = function (value, places) {
    var _this = this;

    var log = (value.exponent + Math.log(Math.max(value.mantissa, 1))) / Math.log(118);
    var parts = [];

    while (log >= 1 && parts.length < 4) {
      var _a = this.getAbbreviationAndValue(log),
          abbreviation = _a[0],
          value_1 = _a[1];

      var n = Math.floor(log / value_1);
      log -= n * value_1;
      parts.unshift([abbreviation, n]);
    }

    if (parts.length >= 4) {
      return parts.map(function (x) {
        return _this.formatElementalPart(x[0], x[1]);
      }).join(" + ");
    }

    var formattedMantissa = Decimal.pow(118, log).toFixed(places);

    if (parts.length === 0) {
      return formattedMantissa;
    }

    if (parts.length === 1) {
      return "".concat(formattedMantissa, " \xD7 ").concat(this.formatElementalPart(parts[0][0], parts[0][1]));
    }

    return "".concat(formattedMantissa, " \xD7 (").concat(parts.map(function (x) {
      return _this.formatElementalPart(x[0], x[1]);
    }).join(" + "), ")");
  };

  return ElementalNotation;
}(Notation);

var CustomBaseNotation = function (_super) {
  __extends(CustomBaseNotation, _super);

  function CustomBaseNotation(digits, exponentBase) {
    var _this = this;

    if (digits.length < 2) {
      throw new Error("The supplied digits must contain at least 2 digits");
    }

    _this = _super.call(this) || this;
    _this.formatBase = digits.length;
    _this.digits = digits;
    _this.exponentBase = exponentBase;
    return _this;
  }

  Object.defineProperty(CustomBaseNotation.prototype, "name", {
    get: function get() {
      return "Custom Base";
    },
    enumerable: false,
    configurable: true
  });

  CustomBaseNotation.prototype.formatUnder1000 = function (value, places) {
    return formatMantissa(this.formatBase, this.digits)(value, places);
  };

  CustomBaseNotation.prototype.formatDecimal = function (value, places, placesExponent) {
    var _this = this;

    return formatMantissaWithExponent(formatMantissa(this.formatBase, this.digits), function (n, p) {
      return _this.formatExponent(n, p, function (n2, _) {
        return formatMantissa(_this.formatBase, _this.digits)(n2, 0);
      });
    }, this.exponentBase, 1, function (x, _) {
      return formatMantissa(_this.formatBase, _this.digits)(x, 0);
    })(value, places, placesExponent);
  };

  return CustomBaseNotation;
}(Notation);

var BinaryNotation = function (_super) {
  __extends(BinaryNotation, _super);

  function BinaryNotation() {
    return _super.call(this, "01", 2) || this;
  }

  Object.defineProperty(BinaryNotation.prototype, "name", {
    get: function get() {
      return "Binary";
    },
    enumerable: false,
    configurable: true
  });
  return BinaryNotation;
}(CustomBaseNotation);

var HexadecimalNotation = function (_super) {
  __extends(HexadecimalNotation, _super);

  function HexadecimalNotation() {
    return _super.call(this, "0123456789ABCDEF", 16) || this;
  }

  Object.defineProperty(HexadecimalNotation.prototype, "name", {
    get: function get() {
      return "Hexadecimal";
    },
    enumerable: false,
    configurable: true
  });
  return HexadecimalNotation;
}(CustomBaseNotation);

var LOG69 = Math.log(69);

var HahaFunnyNotation = function (_super) {
  __extends(HahaFunnyNotation, _super);

  function HahaFunnyNotation() {
    return _super !== null && _super.apply(this, arguments) || this;
  }

  Object.defineProperty(HahaFunnyNotation.prototype, "name", {
    get: function get() {
      return "Haha Funny";
    },
    enumerable: false,
    configurable: true
  });

  HahaFunnyNotation.prototype.formatDecimal = function (value) {
    if (value.eq(0)) {
      return "42069";
    }

    if (value.lt(1)) {
      return this.formatDecimal(value.pow(-1)).split("").reverse().join("");
    }

    var log69 = Math.LN10 / LOG69 * (value.exponent + Math.log(Math.max(value.mantissa, 1)));
    var log = Math.floor(log69 * Math.pow(69, 2));
    var parts = [];

    while (log > 0 || parts.length < 3) {
      var remainder = log % 69;
      log = Math.floor(log / 69);
      parts.push((remainder + 1).toString());
    }

    return parts.join("");
  };

  Object.defineProperty(HahaFunnyNotation.prototype, "infinite", {
    get: function get() {
      return "69420";
    },
    enumerable: false,
    configurable: true
  });

  HahaFunnyNotation.prototype.formatUnder1000 = function (value) {
    return this.formatDecimal(new Decimal(value));
  };

  return HahaFunnyNotation;
}(Notation);

var NiceNotation = function (_super) {
  __extends(NiceNotation, _super);

  function NiceNotation() {
    return _super !== null && _super.apply(this, arguments) || this;
  }

  Object.defineProperty(NiceNotation.prototype, "name", {
    get: function get() {
      return "Nice";
    },
    enumerable: false,
    configurable: true
  });

  NiceNotation.prototype.formatDecimal = function (value, places) {
    return value.log(69).toFixed(Math.max(2, places)).replace("-", "^");
  };

  Object.defineProperty(NiceNotation.prototype, "infinite", {
    get: function get() {
      return "69420";
    },
    enumerable: false,
    configurable: true
  });

  NiceNotation.prototype.formatUnder1000 = function (value, places) {
    return this.formatDecimal(new Decimal(value), places);
  };

  return NiceNotation;
}(Notation);

var LongScaleNotation = function (_super) {
  __extends(LongScaleNotation, _super);

  function LongScaleNotation() {
    var _this = _super !== null && _super.apply(this, arguments) || this;

    _this.name = "Long scale";
    return _this;
  }

  LongScaleNotation.prototype.formatDecimal = function (value, places) {
    var longScale = toFixedLongScale(value, places);
    var mantissa = longScale.mantissa.toFixed(places);
    var abbreviation = abbreviateStandard(Math.floor(longScale.exponent / 6) + 1);
    return "".concat(mantissa, " ").concat(abbreviation).replace(/[,.]/g, function (x) {
      return x === "." ? "," : ".";
    });
  };

  return LongScaleNotation;
}(Notation);

var AbstractInfixNotation = function (_super) {
  __extends(AbstractInfixNotation, _super);

  function AbstractInfixNotation() {
    var _this = _super !== null && _super.apply(this, arguments) || this;

    _this.name = "Abstract Infix";
    _this.groupDigits = 3;
    _this.canHandleZeroExponent = true;
    return _this;
  }

  AbstractInfixNotation.prototype.formatDecimal = function (value, places, _placesExponent) {
    return this.formatInfix(value, places);
  };

  AbstractInfixNotation.prototype.format = function (value, places, _placesUnder1000, placesExponent) {
    if (places === void 0) {
      places = 0;
    }

    if (placesExponent === void 0) {
      placesExponent = places;
    }

    if (typeof value === "number" && !Number.isFinite(value)) {
      return this.infinite;
    }

    var decimal = Decimal.fromValue_noAlloc(value);

    if (Settings.isInfinite(decimal.abs())) {
      return decimal.sign < 0 ? this.negativeInfinite : this.infinite;
    }

    return decimal.sign < 0 ? this.formatNegativeDecimal(decimal.abs(), places, placesExponent) : this.formatDecimal(decimal, places, placesExponent);
  };

  AbstractInfixNotation.prototype.formatInfix = function (inputValue, inputPlaces) {
    var value = fixMantissaOverflow(inputValue, this.numberOfPlaces(inputValue, inputPlaces), 10, 1);
    var places = this.numberOfPlaces(value, inputPlaces);
    var mantissaString = value.mantissa.toFixed(places).replace(".", "");
    var result = [];
    var anyExponent = false;

    if (value.exponent === -1) {
      if (this.canHandleZeroExponent) {
        result.push(this.formatExponent(0));
      } else {
        result.push(".");
      }
    }

    for (var i = 0; i < places + 1; i++) {
      result.push(this.formatMantissa(Number(mantissaString[i])));

      if (i === places && anyExponent) {
        break;
      }

      var currentExponent = value.exponent - i;

      if (currentExponent === 0 && !this.canHandleZeroExponent) {
        result.push(".");
      } else {
        var sepExp = this.nextSeparatorExponent(currentExponent);

        if (currentExponent === sepExp) {
          result.push(this.formatExponent(currentExponent));
          anyExponent = true;
        } else if ((currentExponent - sepExp) % 3 === 0) {
          result.push(",");
        }
      }
    }

    return result.join("");
  };

  AbstractInfixNotation.prototype.nextSeparatorExponent = function (e) {
    var modulus = e >= 0 && e < this.groupDigits ? 3 : this.groupDigits;
    return e - (e % modulus + modulus) % modulus;
  };

  AbstractInfixNotation.prototype.numberOfPlaces = function (value, places) {
    var exp = value.exponent;
    var minPlaces = 0;

    if (exp >= 0) {
      minPlaces = Math.min(exp, exp < this.groupDigits ? 3 : this.groupDigits - 1);
    } else if (exp === -1) {
      minPlaces = 0;
    } else {
      minPlaces = exp - this.nextSeparatorExponent(exp);
    }

    return Math.max(places, minPlaces);
  };

  return AbstractInfixNotation;
}(Notation);

var InfixEngineeringNotation = function (_super) {
  __extends(InfixEngineeringNotation, _super);

  function InfixEngineeringNotation() {
    var _this = _super !== null && _super.apply(this, arguments) || this;

    _this.name = "Infix engineering";
    return _this;
  }

  InfixEngineeringNotation.prototype.formatMantissa = function (digit) {
    return digit.toString(10);
  };

  InfixEngineeringNotation.prototype.formatExponent = function (exp) {
    return toSubscript(exp);
  };

  return InfixEngineeringNotation;
}(AbstractInfixNotation);

var InfixEngineeringReverseNotation = function (_super) {
  __extends(InfixEngineeringReverseNotation, _super);

  function InfixEngineeringReverseNotation() {
    var _this = _super !== null && _super.apply(this, arguments) || this;

    _this.name = "Reverse infix engineering";
    return _this;
  }

  InfixEngineeringReverseNotation.prototype.formatNegativeDecimal = function (value, places, placesExponent) {
    return "\u208B".concat(this.formatDecimal(value, places, placesExponent));
  };

  InfixEngineeringReverseNotation.prototype.formatMantissa = function (digit) {
    return toSubscript(digit);
  };

  InfixEngineeringReverseNotation.prototype.formatExponent = function (exp) {
    return exp.toString(10);
  };

  return InfixEngineeringReverseNotation;
}(AbstractInfixNotation);

var InfixShortScaleNotation = function (_super) {
  __extends(InfixShortScaleNotation, _super);

  function InfixShortScaleNotation() {
    var _this = _super !== null && _super.apply(this, arguments) || this;

    _this.name = "Infix short scale";
    _this.canHandleZeroExponent = false;
    return _this;
  }

  InfixShortScaleNotation.prototype.formatNegativeDecimal = function (value, places, placesExponent) {
    return "\u208B".concat(this.formatDecimal(value, places, placesExponent));
  };

  InfixShortScaleNotation.prototype.formatMantissa = function (digit) {
    return toSubscript(digit);
  };

  InfixShortScaleNotation.prototype.formatExponent = function (exp) {
    if (exp < 0) {
      return (exp / 3).toString();
    }

    return abbreviateStandard(exp / 3);
  };

  return InfixShortScaleNotation;
}(AbstractInfixNotation);

var InfixLongScaleNotation = function (_super) {
  __extends(InfixLongScaleNotation, _super);

  function InfixLongScaleNotation() {
    var _this = _super !== null && _super.apply(this, arguments) || this;

    _this.name = "Infix long scale";
    _this.groupDigits = 6;
    _this.canHandleZeroExponent = false;
    return _this;
  }

  InfixLongScaleNotation.prototype.formatDecimal = function (value, places, _placesExponent) {
    return this.formatInfix(value, places).replace(/[,.]/g, function (x) {
      return x === "." ? "," : ".";
    });
  };

  InfixLongScaleNotation.prototype.formatNegativeDecimal = function (value, places, placesExponent) {
    return "\u208B".concat(this.formatDecimal(value, places, placesExponent));
  };

  InfixLongScaleNotation.prototype.formatMantissa = function (digit) {
    return toSubscript(digit);
  };

  InfixLongScaleNotation.prototype.formatExponent = function (exp) {
    if (exp < 0) {
      return (exp / 6).toString();
    }

    return abbreviateStandard(Math.floor(exp / 6) + 1);
  };

  return InfixLongScaleNotation;
}(AbstractInfixNotation);

var UNITS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
var TENS = ["", "ten", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
var PREFIXES = [["", "un", "duo", "tre", "quattuor", "quin", "se", "septe", "octo", "nove"], ["", "deci", "viginti", "triginta", "quadraginta", "quinquaginta", "sexaginta", "septuaginta", "octoginta", "nonaginta"], ["", "centi", "ducenti", "trecenti", "quadringenti", "quingenti", "sescenti", "septingenti", "octingenti", "nongenti"]];
var PREFIXES_2 = ["", "milli-", "micro-", "nano-", "pico-", "femto-", "atto-", "zepto-", "yocto-", "xono-", "veco-", "meco-", "dueco-", "treco-", "tetreco-", "penteco-", "hexeco-", "hepteco-", "octeco-", "enneco-", "icoso-", "meicoso-", "dueicoso-", "trioicoso-", "tetreicoso-", "penteicoso-", "hexeicoso-", "hepteicoso-", "octeicoso-", "enneicoso-", "triaconto-", "metriaconto-", "duetriaconto-", "triotriaconto-", "tetretriaconto-", "pentetriaconto-", "hexetriaconto-", "heptetriaconto-", "octtriaconto-", "ennetriaconto-", "tetraconto-", "metetraconto-", "duetetraconto-", "triotetraconto-", "tetretetraconto-", "pentetetraconto-", "hexetetraconto-", "heptetetraconto-", "octetetraconto-", "ennetetraconto-", "pentaconto-", "mepentaconto-", "duepentaconto-", "triopentaconto-", "tetrepentaconto-", "pentepentaconto-", "hexepentaconto-", "heptepentaconto-", "octepentaconto-", "ennepentaconto-", "hexaconto-", "mehexaconto-", "duehexaconto-", "triohexaconto-", "tetrehexaconto-", "pentehexaconto-", "hexehexaconto-", "heptehexaconto-", "octehexaconto-", "ennehexaconto-", "heptaconto-", "meheptaconto-", "dueheptaconto-", "trioheptaconto-", "tetreheptaconto-", "penteheptaconto-", "hexeheptaconto-", "hepteheptaconto-", "octeheptaconto-", "enneheptaconto-", "octaconto-", "meoctaconto-", "dueoctaconto-", "triooctaconto-", "tetreoctaconto-", "penteoctaconto-", "hexeoctaconto-", "hepteoctaconto-", "octeoctaconto-", "enneoctaconto-", "ennaconto-", "meennaconto-", "dueeennaconto-", "trioennaconto-", "tetreennaconto-", "penteennaconto-", "hexeennaconto-", "hepteennaconto-", "octeennaconto-", "enneennaconto-", "hecto-", "mehecto-", "duehecto-"];

var EnglishNotation = function (_super) {
  __extends(EnglishNotation, _super);

  function EnglishNotation() {
    return _super !== null && _super.apply(this, arguments) || this;
  }

  Object.defineProperty(EnglishNotation.prototype, "name", {
    get: function get() {
      return "English";
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(EnglishNotation.prototype, "negativeInfinite", {
    get: function get() {
      return "an infinitely large negative number";
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(EnglishNotation.prototype, "infinite", {
    get: function get() {
      return "an infinitely large positive number";
    },
    enumerable: false,
    configurable: true
  });

  EnglishNotation.prototype.formatNegativeVerySmallDecimal = function (value, places) {
    return "negative one ".concat(this.formatDecimal(value.reciprocal(), places).replace(/ /g, "-").replace("--", "-"), "th");
  };

  EnglishNotation.prototype.formatVerySmallDecimal = function (value, places) {
    return "one ".concat(this.formatDecimal(value.reciprocal(), places).replace(/ /g, "-").replace("--", "-"), "th");
  };

  EnglishNotation.prototype.formatNegativeUnder1000 = function (value, places) {
    return "negative ".concat(this.formatDecimal(new Decimal(value), places));
  };

  EnglishNotation.prototype.formatUnder1000 = function (value, places) {
    return this.formatDecimal(new Decimal(value), places);
  };

  EnglishNotation.prototype.formatNegativeDecimal = function (value, places) {
    return "negative ".concat(this.formatDecimal(value, places));
  };

  EnglishNotation.prototype.formatDecimal = function (value, places) {
    if (value.eq(0)) {
      return "zero";
    }

    if (value.lte(0.001)) {
      return this.formatVerySmallDecimal(value, places);
    }

    var engineering = toFixedEngineering(value, places);
    var precision = Math.pow(10, -places);

    if (value.lte(0.01)) {
      return this.formatUnits(value.toNumber() + precision / 2, places);
    }

    var ceiled = engineering.mantissa + precision / 2 >= 1000;
    var mantissa = ceiled ? 1 : engineering.mantissa + precision / 2;
    var exponent = engineering.exponent + (ceiled ? 1 : 0);
    var unit = this.formatUnits(mantissa, places);
    var abbreviation = this.formatPrefixes(exponent);
    return "".concat(unit, " ").concat(abbreviation);
  };

  EnglishNotation.prototype.formatUnits = function (e, p) {
    var ans = [];
    var origin = e;
    var precision = Math.pow(10, -p);

    if (e >= 100) {
      var a = Math.floor(e / 100);
      ans.push("".concat(UNITS[a], " hundred"));
      e -= a * 100;
    }

    if (e < 20) {
      if (e >= 1 && ans.length > 0) ans.push("and");
      var a = Math.floor(e);
      ans.push(e < 1 && origin > 1 ? "" : UNITS[a]);
      e -= a;
    } else {
      if (ans.length > 0) ans.push("and");
      var a = Math.floor(e / 10);
      ans.push(TENS[a]);
      e -= a * 10;
      a = Math.floor(e);

      if (a !== 0) {
        ans.push(UNITS[a]);
        e -= a;
      }
    }

    if (e >= Math.pow(10, -p) && p > 0) {
      ans.push("point");
      var a = 0;

      while (e >= precision && a < p) {
        ans.push(UNITS[Math.floor(e * 10)]);
        e = e * 10 - Math.floor(e * 10);
        precision *= 10;
        a++;
      }
    }

    return ans.filter(function (i) {
      return i !== "";
    }).join(" ");
  };

  EnglishNotation.prototype.formatPrefixes = function (e) {
    e = Math.floor(e / 3) - 1;

    if (e <= 3) {
      return ["", "thousand", "million", "billion", "trillion"][e + 1];
    }

    var index2 = 0;
    var prefix = [PREFIXES[0][e % 10]];

    while (e >= 10) {
      e = Math.floor(e / 10);
      prefix.push(PREFIXES[++index2 % 3][e % 10]);
    }

    index2 = Math.floor(index2 / 3);

    while (prefix.length % 3 !== 0) {
      prefix.push("");
    }

    var abbreviation = "";

    while (index2 >= 0) {
      if (prefix[index2 * 3] !== "un" || prefix[index2 * 3 + 1] !== "" || prefix[index2 * 3 + 2] !== "" || index2 === 0) {
        var abb2 = prefix[index2 * 3 + 1] + prefix[index2 * 3 + 2];

        if (["tre", "se"].includes(prefix[index2 * 3]) && ["v", "t", "q"].includes(abb2.substr(0, 1))) {
          abb2 = "s".concat(abb2);
        }

        if (prefix[index2 * 3] === "se" && ["c", "o"].includes(abb2.substr(0, 1))) {
          abb2 = "x".concat(abb2);
        }

        if (["septe", "nove"].includes(prefix[index2 * 3]) && ["v", "o"].includes(abb2.substr(0, 1))) {
          abb2 = "m".concat(abb2);
        }

        if (["septe", "nove"].includes(prefix[index2 * 3]) && ["d", "c", "t", "q", "s"].includes(abb2.substr(0, 1))) {
          abb2 = "n".concat(abb2);
        }

        abbreviation += prefix[index2 * 3] + abb2;
      }

      if (prefix[index2 * 3] !== "" || prefix[index2 * 3 + 1] !== "" || prefix[index2 * 3 + 2] !== "") {
        abbreviation += PREFIXES_2[index2];
      }

      index2--;
    }

    abbreviation = abbreviation.replace(/-$/, "");
    return "".concat(abbreviation, "illion").replace("i-illion", "illion").replace("iillion", "illion").replace("aillion", "illion").replace("oillion", "illion").replace("eillion", "illion").replace("unillion", "untillion").replace("duillion", "duotillion").replace("trillion", "tretillion").replace("quattuorillion", "quadrillion").replace("quinillion", "quintillion").replace("sillion", "sextillion").replace("novillion", "nonillion");
  };

  return EnglishNotation;
}(EngineeringNotation);

var LOG4 = Math.log10(4);
var NUMBERS = ["4-4", "4÷4", "√4", "4-4÷4", "4", "4+4÷4", "4!÷4", "(4!+4)÷4", "4+4", "4+4+4÷4", "4!÷4+4", "44÷4", "4!÷√4", "44÷4+√4", "4×4-√4", "4×4-4÷4"];

var FoursNotation = function (_super) {
  __extends(FoursNotation, _super);

  function FoursNotation() {
    return _super !== null && _super.apply(this, arguments) || this;
  }

  Object.defineProperty(FoursNotation.prototype, "name", {
    get: function get() {
      return "Fours";
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(FoursNotation.prototype, "negativeInfinite", {
    get: function get() {
      return "-∞";
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(FoursNotation.prototype, "infinite", {
    get: function get() {
      return "∞";
    },
    enumerable: false,
    configurable: true
  });

  FoursNotation.prototype.formatVerySmallNegativeDecimal = function (val) {
    return this.formatNegativeDecimal(val);
  };

  FoursNotation.prototype.formatVerySmallDecimal = function (val) {
    return this.formatDecimal(val);
  };

  FoursNotation.prototype.formatNegativeUnder1000 = function (val) {
    var str = this.formatUnder1000(val);
    return "-".concat(this.bracketify(str));
  };

  FoursNotation.prototype.formatUnder1000 = function (val) {
    var exponent = Math.log10(val);

    if (val === 0) {
      return NUMBERS[0];
    }

    if (exponent < 0) {
      return this.formatAsFraction(new Decimal(val));
    }

    return this.formatAsInteger(val);
  };

  FoursNotation.prototype.formatNegativeDecimal = function (val) {
    var str = this.formatDecimal(val);
    return "-".concat(this.bracketify(str));
  };

  FoursNotation.prototype.formatDecimal = function (val) {
    if (val.sign < 0) {
      return this.formatNegativeDecimal(Decimal.minus(0, val));
    }

    var exponent = val.exponent + Math.log(Math.max(val.mantissa, 1));
    var absoluteExponent = Math.abs(exponent);

    if (absoluteExponent >= 24) {
      return this.formatAsPow(val);
    }

    if (absoluteExponent >= 3) {
      return this.formatAsRoot(val);
    }

    return this.formatUnder1000(val.toNumber());
  };

  FoursNotation.prototype.formatAsPow = function (val) {
    var power = val.exponent + Math.log(Math.max(val.mantissa, 1)) / LOG4;
    var powerStr = this.formatDecimal(new Decimal(power));
    return "4^".concat(this.bracketify(powerStr));
  };

  FoursNotation.prototype.formatAsRoot = function (val) {
    var root = Decimal.sqrt(val);
    var str = this.formatDecimal(root);
    return "(".concat(str, ")^").concat(NUMBERS[2]);
  };

  FoursNotation.prototype.formatAsInteger = function (val) {
    if (val >= 16) {
      var quotient = Math.floor(val / 16);
      var remainder = Math.floor(Math.max(0, Math.min(15, val - quotient * 16)));
      var pre = remainder === 0 ? "" : "".concat(NUMBERS[Math.floor(remainder)], "+");
      var suf = quotient === 1 ? "" : "\xD7".concat(this.multiBracketify(this.formatAsInteger(quotient)));
      return "".concat(pre, "4\xD74").concat(suf);
    }

    return NUMBERS[Math.floor(val)];
  };

  FoursNotation.prototype.formatAsFraction = function (val) {
    var reciprocal = Decimal.div(4, val);
    var denominator = this.formatDecimal(reciprocal);
    return "4\xF7".concat(this.bracketify(denominator));
  };

  FoursNotation.prototype.bracketify = function (str) {
    if ((str.match(/[\+\-\×÷\^]/) || ["^"])[0] !== "^") {
      return "(".concat(str, ")");
    }

    return str;
  };

  FoursNotation.prototype.multiBracketify = function (str) {
    var bracketLayer = 0;

    for (var i = 0; i < str.length; i++) {
      var _char = str.charAt(i);

      if (["+", "-"].includes(_char) && bracketLayer === 0) {
        return "(".concat(str, ")");
      }

      bracketLayer += this.bracket(_char);
    }

    return str;
  };

  FoursNotation.prototype.bracket = function (_char2) {
    switch (_char2) {
      case "(":
        return 1;

      case ")":
        return -1;

      default:
        return 0;
    }
  };

  return FoursNotation;
}(Notation);

var _a;
var LEN = 23;
var START = "\uE010";
var START_HEX = (_a = START.codePointAt(0)) !== null && _a !== void 0 ? _a : 65;
var INFINITY = "\uE027";
var NEGATIVE = "\uE028";
var BLOBS = [];

for (var i = 0; i < LEN; i++) {
  var _char = String.fromCharCode(START_HEX + i);

  BLOBS.push(_char);
}

var LOG3 = Math.log10(3);

var BlobsNotation = function (_super) {
  __extends(BlobsNotation, _super);

  function BlobsNotation() {
    return _super !== null && _super.apply(this, arguments) || this;
  }

  Object.defineProperty(BlobsNotation.prototype, "name", {
    get: function get() {
      return "Blobs";
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(BlobsNotation.prototype, "infinite", {
    get: function get() {
      return "".concat(INFINITY);
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(BlobsNotation.prototype, "negativeInfinite", {
    get: function get() {
      return "".concat(NEGATIVE).concat(INFINITY);
    },
    enumerable: false,
    configurable: true
  });

  BlobsNotation.prototype.formatNegativeUnder1000 = function (num) {
    return "".concat(NEGATIVE).concat(this.blobify(new Decimal(num - 1)));
  };

  BlobsNotation.prototype.formatNegativeDecimal = function (num) {
    return "".concat(NEGATIVE).concat(this.blobify(num.minus(1)));
  };

  BlobsNotation.prototype.formatUnder1000 = function (num) {
    return this.blobify(new Decimal(num));
  };

  BlobsNotation.prototype.formatDecimal = function (num) {
    return this.blobify(num);
  };

  BlobsNotation.prototype.blobify = function (num) {
    var number = this.reduceNumber(num.abs());

    if (number < LEN) {
      return BLOBS[Math.floor(number)];
    }

    if (Math.floor(number / LEN) < LEN + 1) {
      return BLOBS[Math.floor(number / LEN) - 1] + BLOBS[Math.floor(number % LEN)];
    }

    return this.blobify(Decimal.floor(number / LEN - 1)) + BLOBS[Math.floor(number % LEN)];
  };

  BlobsNotation.prototype.reduceNumber = function (num) {
    if (num.lte(1000)) {
      return num.toNumber();
    }

    return (Math.log10(num.max(1).log10().toNumber()) - LOG3) / Math.log10(1.0002) + 1000;
  };

  return BlobsNotation;
}(Notation);

var BlobsTextNotation = function (_super) {
  __extends(BlobsTextNotation, _super);

  function BlobsTextNotation() {
    return _super !== null && _super.apply(this, arguments) || this;
  }

  Object.defineProperty(BlobsTextNotation.prototype, "name", {
    get: function get() {
      return "Blobs (Text)";
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(BlobsTextNotation.prototype, "prefixes", {
    get: function get() {
      return ["", "big", "large", "great", "grand", "huge", "super", "ultra", "mega", "giga", "omega"];
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(BlobsTextNotation.prototype, "suffixes", {
    get: function get() {
      return ["", "think", "wave", "hug", "nom", "sad", "pats", "yes", "no", "heart", "sleep"];
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(BlobsTextNotation.prototype, "prefixNegative", {
    get: function get() {
      return "notlike";
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(BlobsTextNotation.prototype, "suffixInfinity", {
    get: function get() {
      return "finity";
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(BlobsTextNotation.prototype, "negativeInfinite", {
    get: function get() {
      return this.blobConstructor(this.prefixNegative, this.suffixInfinity);
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(BlobsTextNotation.prototype, "infinite", {
    get: function get() {
      return this.blobConstructor("", this.suffixInfinity);
    },
    enumerable: false,
    configurable: true
  });

  BlobsTextNotation.prototype.formatVerySmallNegativeDecimal = function (num) {
    return this.blobify(Decimal.sub(0, num));
  };

  BlobsTextNotation.prototype.formatNegativeUnder1000 = function (num) {
    return this.blobify(new Decimal(-num));
  };

  BlobsTextNotation.prototype.formatNegativeDecimal = function (num) {
    return this.blobify(Decimal.sub(0, num));
  };

  BlobsTextNotation.prototype.blobify = function (num) {
    var prefix = "",
        suffix = "";
    var number = this.reduceNumber(num.abs());

    if (num.sign === -1) {
      prefix = this.prefixNegative;
      number = Math.max(0, number - 1);
    }

    var indexes = [Math.floor(number / (this.suffixes.length * this.prefixes.length)), Math.floor(number / this.suffixes.length) % this.prefixes.length, number % this.suffixes.length];

    if (indexes[0] >= 1) {
      suffix = "-".concat(indexes[0] + 1);
    }

    return this.blobConstructor(prefix + this.prefixes[Math.floor(indexes[1])], this.suffixes[Math.floor(indexes[2])] + suffix);
  };

  BlobsTextNotation.prototype.blobConstructor = function (prefix, suffix) {
    return ":".concat(prefix, "blob").concat(suffix, ":");
  };

  return BlobsTextNotation;
}(BlobsNotation);

var BlobsShortTextNotation = function (_super) {
  __extends(BlobsShortTextNotation, _super);

  function BlobsShortTextNotation() {
    return _super !== null && _super.apply(this, arguments) || this;
  }

  Object.defineProperty(BlobsShortTextNotation.prototype, "name", {
    get: function get() {
      return "Blobs (Short Text)";
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(BlobsShortTextNotation.prototype, "prefixNegative", {
    get: function get() {
      return "un";
    },
    enumerable: false,
    configurable: true
  });

  BlobsShortTextNotation.prototype.blobify = function (num) {
    var prefix = "",
        suffix = "";
    var number = this.reduceNumber(num.abs());

    if (num.sign === -1) {
      prefix = this.prefixNegative;
      number = Math.max(0, number - 1);
    }

    var indexes = [Math.floor(number / this.suffixes.length), number % this.suffixes.length];

    if (indexes[0] >= 1) {
      suffix = "-".concat(indexes[0] + 1);
    }

    return this.blobConstructor(prefix, this.suffixes[Math.floor(indexes[1])] + suffix);
  };

  return BlobsShortTextNotation;
}(BlobsTextNotation);

export { BinaryNotation, BlobsShortTextNotation, BlobsTextNotation, ChineseNotation, CustomBaseNotation, ElementalNotation, EmojierNotation, EnglishNotation, EvilNotation, FlagsNotation, FoursNotation, GreekLettersNotation, HahaFunnyNotation, HexadecimalNotation, InfixEngineeringNotation, InfixEngineeringReverseNotation, InfixLongScaleNotation, InfixShortScaleNotation, JapaneseNotation, LongScaleNotation, NiceNotation, Notation, OmegaNotation, OmegaShortNotation, PrecisePrimeNotation, Settings, TritetratedNotation, YesNoNotation };
