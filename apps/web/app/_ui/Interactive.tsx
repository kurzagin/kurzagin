'use client';

import type { ReactNode } from 'react';

/**
 * Generic replacement for the old inline `onclick="..."`/`onsubmit="..."` string handlers.
 * Server pages pass only serializable props; handlers resolve `window.<fn>` lazily at event time
 * (functions come from the global /main.js).
 */
type Props = {
  as?: string;
  /** DOM event to bind (default click). */
  on?: 'click' | 'submit' | 'input' | 'change';
  /** Name of a window function to call. */
  fn?: string;
  /** Pass the element (this) as first arg. */
  withEl?: boolean;
  /** Pass the native event as first arg. */
  withEvent?: boolean;
  /** Extra string arg appended after the element/event arg. */
  arg?: string;
  stop?: boolean;
  prevent?: boolean;
  /** Navigate with window.location.href. */
  href?: string;
  /** Remove the parent element (`this.parentElement.remove()`). */
  removeParent?: boolean;
  children?: ReactNode;
  [key: string]: unknown;
};

export default function Interactive({
  as = 'div',
  on = 'click',
  fn,
  withEl,
  withEvent,
  arg,
  stop,
  prevent,
  href,
  removeParent,
  children,
  ...rest
}: Props) {
  const Tag = as as unknown as React.ElementType;
  const handler = (e: any) => {
    if (stop) e.stopPropagation();
    if (prevent) e.preventDefault();
    if (href) {
      window.location.href = href;
      return;
    }
    if (removeParent) {
      e.currentTarget.parentElement?.remove();
      return;
    }
    if (fn) {
      const f = (window as any)[fn];
      if (typeof f !== 'function') return;
      const args: unknown[] = [];
      if (withEl) args.push(e.currentTarget);
      if (withEvent) args.push(e.nativeEvent);
      if (arg !== undefined) args.push(arg);
      f(...args);
    }
  };
  const evProp = on === 'click' ? 'onClick' : on === 'submit' ? 'onSubmit' : on === 'input' ? 'onInput' : 'onChange';
  return (
    <Tag {...rest} {...{ [evProp]: handler }}>
      {children}
    </Tag>
  );
}
