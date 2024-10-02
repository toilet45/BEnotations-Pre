import type Decimal from "break_eternity.js";
import { Notation } from "./notation";
import { StandardNotation } from "./standard";
import { formatMantissaWithExponent, formatMantissaBaseTen } from "./utils";

const standard = new StandardNotation();

export class MixedEngineeringNotation extends Notation {
  public get name(): string {
    return "Mixed engineering";
  }

  public formatDecimal(value: Decimal, places: number, placesExponent: number): string {
    if (value.max(1).log10().lt(33)) {
      return standard.formatDecimal(value, places, placesExponent);
    }
    return formatMantissaWithExponent(formatMantissaBaseTen, this.formatExponent.bind(this),
      10, 3, (x, _) => formatMantissaBaseTen(x, 2)
    )(value, places, placesExponent);
  }
}
