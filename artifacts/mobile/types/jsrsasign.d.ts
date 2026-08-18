declare module 'jsrsasign' {
  export const KJUR: {
    crypto: {
      Signature: new (options: { alg: string }) => {
        init: (key: unknown) => void;
        updateString: (value: string) => void;
        verify: (signatureHex: string) => boolean;
      };
    };
  };
  export const KEYUTIL: {
    getKey: (key: string) => unknown;
  };
  export function b64utohex(value: string): string;
  export function hextorstr(value: string): string;
}