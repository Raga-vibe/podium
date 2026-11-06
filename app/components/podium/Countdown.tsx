import {
  formatCountdown,
  timeLeft,
  useNow,
} from "@/lib/podium";

/** Circular progress ring (0-1) with a centered label. */
export function ProgressRing({
  value,
  size = 56,
  label,
}: {
  value: number;
  size?: number;
  label: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          className="stroke-amber-400 transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
        {Math.round(clamped * 100)}%
      </span>
    </div>
  );
}

/** Live countdown to an ISO deadline. */
export function Countdown({
  deadline,
  className,
}: {
  deadline: string | null;
  className?: string;
}) {
  const now = useNow();
  const left = timeLeft(deadline, now);
  return (
    <span
      className={className}
      aria-live="off"
      title={deadline ? new Date(deadline).toString() : undefined}
    >
      {formatCountdown(left)}
    </span>
  );
}
