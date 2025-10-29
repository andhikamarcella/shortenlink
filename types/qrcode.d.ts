declare module 'qrcode' {
  export type QRColorOptions = {
    dark?: string;
    light?: string;
  };

  export type QRCodeToDataURLOptions = {
    margin?: number;
    width?: number;
    color?: QRColorOptions;
    scale?: number;
  };

  export function toDataURL(
    text: string,
    opts?: QRCodeToDataURLOptions
  ): Promise<string>;
}
