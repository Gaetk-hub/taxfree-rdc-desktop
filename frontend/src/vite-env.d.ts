/// <reference types="vite/client" />

declare module '*.tsx' {
  import { ComponentType } from 'react';
  const component: ComponentType<any>;
  export default component;
}
