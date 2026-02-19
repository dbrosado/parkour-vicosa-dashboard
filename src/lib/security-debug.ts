type SecurityPayload = Record<string, unknown>

const sensitiveKeyPattern = /(password|token|secret|key|authorization)/i

function sanitizeValue(key: string, value: unknown): unknown {
    if (sensitiveKeyPattern.test(key)) {
        return '[REDACTED]'
    }

    if (Array.isArray(value)) {
        return value.map((item) => {
            if (item && typeof item === 'object') {
                return sanitizePayload(item as SecurityPayload)
            }
            return item
        })
    }

    if (value && typeof value === 'object') {
        return sanitizePayload(value as SecurityPayload)
    }

    if (typeof value === 'string' && value.length > 180) {
        return `${value.slice(0, 180)}...`
    }

    return value
}

function sanitizePayload(payload: SecurityPayload): SecurityPayload {
    return Object.fromEntries(
        Object.entries(payload).map(([key, value]) => [key, sanitizeValue(key, value)]),
    )
}

export function getEmailDomain(email: string): string | null {
    const parts = email.split('@')
    if (parts.length !== 2) return null
    return parts[1].toLowerCase()
}

export function securityDebugLog(event: string, payload?: SecurityPayload) {
    const enabled = import.meta.env.DEV || import.meta.env.VITE_SECURITY_DEBUG === 'true'
    if (!enabled) return

    if (payload) {
        console.info(`[security-check] ${event}`, sanitizePayload(payload))
        return
    }

    console.info(`[security-check] ${event}`)
}
