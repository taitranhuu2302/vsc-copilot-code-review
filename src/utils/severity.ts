import type { ReviewSeverity } from '@/types/ReviewComment';

const order: ReviewSeverity[] = ['low', 'medium', 'high', 'critical'];

export function severityRank(severity: ReviewSeverity): number {
    return order.indexOf(severity);
}

export function severityFromUnknown(value: unknown): ReviewSeverity {
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (
            normalized === 'low' ||
            normalized === 'medium' ||
            normalized === 'high' ||
            normalized === 'critical'
        ) {
            return normalized;
        }
    }

    if (typeof value === 'number') {
        if (value >= 5) {
            return 'critical';
        }
        if (value >= 4) {
            return 'high';
        }
        if (value >= 3) {
            return 'medium';
        }
        return 'low';
    }

    return 'low';
}

export function passesMinSeverity(
    severity: ReviewSeverity,
    minSeverity: number
): boolean {
    const minSeverityLabel =
        minSeverity >= 5
            ? 'critical'
            : minSeverity >= 4
              ? 'high'
              : minSeverity >= 3
                ? 'medium'
                : 'low';
    return severityRank(severity) >= severityRank(minSeverityLabel);
}
