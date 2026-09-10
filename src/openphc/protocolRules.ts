import { NextStep } from "./types";

export interface DerivedStepState {
  isOverdue: boolean;
  daysOverdue: number;
  isDueToday: boolean;
  isDueSoon: boolean;
  isAtRisk: boolean;
  isLostToFollow: boolean;
}

/**
 * Calculates date difference in whole days
 */
export function getDaysDiff(targetDateStr: string, currentDate: Date = new Date()): number {
  const target = new Date(targetDateStr);
  target.setHours(0, 0, 0, 0);
  
  const current = new Date(currentDate);
  current.setHours(0, 0, 0, 0);

  const diffTime = current.getTime() - target.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Derives dynamic step state computed on read (AP-2, §7.2, NS-9)
 */
export function deriveStepState(step: NextStep, currentDate: Date = new Date()): DerivedStepState {
  const daysDiff = getDaysDiff(step.dueDate, currentDate);
  const isOpen = step.status === "SCHEDULED" || step.status === "PENDING";

  const isOverdue = isOpen && daysDiff > 0;
  const isDueToday = isOpen && daysDiff === 0;
  const isDueSoon = isOpen && daysDiff < 0 && daysDiff >= -3;

  // NS-9: Derived at-risk of drop out when escalation count >= 2
  const isAtRisk = isOpen && step.escalationCount >= 2;

  // NS-9: Lost to follow-up if declined or unreachable after multiple attempts
  const isLostToFollow = step.status === "DECLINED" || (isOpen && step.escalationCount >= 4);

  return {
    isOverdue,
    daysOverdue: isOverdue ? daysDiff : 0,
    isDueToday,
    isDueSoon,
    isAtRisk,
    isLostToFollow,
  };
}

/**
 * Evaluates whether a commitment qualifies for an automated escalation alert (UC-14, NS-8)
 * Default escalation window: 2 days for maternal, 1 day for newborn
 */
export function shouldEscalate(
  step: NextStep, 
  currentDate: Date = new Date(),
  escalationWindowDays: number = 2
): boolean {
  if (step.status !== "SCHEDULED" && step.status !== "PENDING") {
    return false;
  }

  // Anchor is either the last reset anchor (e.g. "plan to go later") or the original dueDate
  const anchorDateStr = step.escalationClockAnchor || step.dueDate;
  const daysDiff = getDaysDiff(anchorDateStr, currentDate);

  return daysDiff >= escalationWindowDays;
}
