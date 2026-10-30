declare namespace qrcodegen {
  export class QrCode {
    public static readonly MIN_VERSION: number;
    public static readonly MAX_VERSION: number;
    public static encodeText(text: string, ecl: QrCode.Ecc): QrCode;
    public static encodeBinary(data: Readonly<Array<number>>, ecl: QrCode.Ecc): QrCode;
    public static encodeSegments(segs: Readonly<Array<QrSegment>>, ecl: QrCode.Ecc, minVersion?: number, maxVersion?: number, mask?: number, boostEcl?: boolean): QrCode;

    public readonly version: number;
    public readonly size: number;
    public readonly errorCorrectionLevel: QrCode.Ecc;
    public readonly mask: number;

    public getModule(x: number, y: number): boolean;
  }

  export namespace QrCode {
    export class Ecc {
      public static readonly LOW: Ecc;
      public static readonly MEDIUM: Ecc;
      public static readonly QUARTILE: Ecc;
      public static readonly HIGH: Ecc;
      public readonly ordinal: number;
      public readonly formatBits: number;
    }
  }

  export class QrSegment {
    public static makeBytes(data: Readonly<Array<number>>): QrSegment;
    public static makeNumeric(digits: string): QrSegment;
    public static makeAlphanumeric(text: string): QrSegment;
    public static makeSegments(text: string): Array<QrSegment>;
    public static makeEci(assignVal: number): QrSegment;
    public static isNumeric(text: string): boolean;
    public static isAlphanumeric(text: string): boolean;
    public readonly mode: QrSegment.Mode;
    public readonly numChars: number;
    public getData(): Array<number>;
  }

  export namespace QrSegment {
    export class Mode {
      public static readonly NUMERIC: Mode;
      public static readonly ALPHANUMERIC: Mode;
      public static readonly BYTE: Mode;
      public static readonly KANJI: Mode;
      public static readonly ECI: Mode;
      public readonly modeBits: number;
      public numCharCountBits(ver: number): number;
    }
  }
}

export const qrcodegen: typeof qrcodegen;
