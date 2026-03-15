import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type React from "react";

import { cn } from "@/lib/utils";

interface TabsWarpItem<T extends string> {
  key: T;
  label: React.ReactNode;
  disabled?: boolean;
}

interface TabsWarpProps<T extends string> {
  items: ReadonlyArray<TabsWarpItem<T>>;
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
  itemClassName?: string;
  activeItemClassName?: string;
  inactiveItemClassName?: string;
  indicatorClassName?: string;
}

interface IndicatorState {
  x: number;
  y: number;
  width: number;
  height: number;
  ready: boolean;
}

const EMPTY_INDICATOR: IndicatorState = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  ready: false
};

export function TabsWarp<T extends string>({
  items,
  value,
  onValueChange,
  className,
  itemClassName,
  activeItemClassName,
  inactiveItemClassName,
  indicatorClassName
}: TabsWarpProps<T>): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef(new Map<T, HTMLButtonElement>());
  const [indicator, setIndicator] = useState<IndicatorState>(EMPTY_INDICATOR);

  const syncIndicator = useCallback(() => {
    const container = containerRef.current;
    const activeButton = buttonRefs.current.get(value);

    if (!container || !activeButton) {
      setIndicator(EMPTY_INDICATOR);
      return;
    }

    setIndicator({
      x: activeButton.offsetLeft,
      y: activeButton.offsetTop,
      width: activeButton.offsetWidth,
      height: activeButton.offsetHeight,
      ready: true
    });
  }, [value]);

  useLayoutEffect(() => {
    syncIndicator();
  }, [syncIndicator, items.length]);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") {
      const handleResize = (): void => {
        syncIndicator();
      };
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }

    const observer = new ResizeObserver(() => {
      syncIndicator();
    });

    const container = containerRef.current;
    if (container) {
      observer.observe(container);
    }

    buttonRefs.current.forEach((node) => {
      observer.observe(node);
    });

    return () => {
      observer.disconnect();
    };
  }, [syncIndicator, items.length]);

  return (
    <div
      className={cn("relative inline-flex h-14 items-center gap-2 overflow-hidden rounded-pill border border-[var(--input)] bg-[var(--card)] p-2", className)}
      ref={containerRef}
      role="tablist"
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-0 top-0 rounded-pill bg-[var(--secondary)] transition-[transform,width,height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          indicatorClassName
        )}
        style={{
          transform: `translate3d(${indicator.x}px, ${indicator.y}px, 0)`,
          width: indicator.width,
          height: indicator.height,
          opacity: indicator.ready ? 1 : 0
        }}
      />

      {items.map((item) => {
        const isActive = item.key === value;

        return (
          <button
            aria-selected={isActive}
            className={cn(
              "relative z-10 inline-flex h-10 items-center justify-center rounded-pill bg-transparent px-6 text-sm leading-[1.4286] transition-colors duration-200",
              isActive
                ? "text-[var(--secondary-foreground)]"
                : "ui-hover-shadow bg-white text-[var(--accent-foreground)] hover:bg-[var(--muted-hover)] [--hover-outline:#2a29332e]",
              isActive ? activeItemClassName : inactiveItemClassName,
              itemClassName
            )}
            disabled={item.disabled}
            key={item.key}
            onClick={() => {
              if (isActive || item.disabled) {
                return;
              }
              onValueChange(item.key);
            }}
            ref={(node) => {
              if (node) {
                buttonRefs.current.set(item.key, node);
                return;
              }
              buttonRefs.current.delete(item.key);
            }}
            role="tab"
            type="button"
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
