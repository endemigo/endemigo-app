declare module 'node:assert/strict' {
  interface StrictAssert {
    match(actual: string, expected: RegExp, message?: string): void;
  }

  const assert: StrictAssert;
  export default assert;
}

declare module 'node:fs' {
  export function readFileSync(path: string | URL, encoding: string): string;
}

declare module 'node:test' {
  type TestHandler = () => void | Promise<void>;

  export default function test(name: string, handler: TestHandler): void;
}
