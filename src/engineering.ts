import type Decimal from "break_eternity.js";
import { Notation } from "./notation";
import { formatMantissaWithExponent, formatMantissaBaseTen } from "./utils";

export class EngineeringNotation extends Notation {
  public get name(): string {
    return "Engineering";
  }

  public formatDecimal(value: Decimal, places: number, placesExponent: number): string {
    return formatMantissaWithExponent(formatMantissaBaseTen, this.formatExponent.bind(this),
      10, 3, (x, _) => formatMantissaBaseTen(x, 2)
    )(value, places, placesExponent);
  }
}
