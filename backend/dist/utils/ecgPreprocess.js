function mean(xs) {
    return xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1);
}
function std(xs, mu) {
    const v = xs.reduce((acc, x) => acc + (x - mu) * (x - mu), 0) /
        Math.max(xs.length, 1);
    return Math.sqrt(v);
}
function movingAverage(xs, window) {
    if (window <= 1)
        return xs.slice();
    const w = Math.max(1, Math.floor(window));
    const out = new Array(xs.length).fill(0);
    let sum = 0;
    for (let i = 0; i < xs.length; i++) {
        sum += xs[i];
        if (i >= w)
            sum -= xs[i - w];
        const denom = i + 1 < w ? i + 1 : w;
        out[i] = sum / denom;
    }
    return out;
}
function zNormalize(xs) {
    const mu = mean(xs);
    const sigma = std(xs, mu) || 1;
    return { normalized: xs.map((x) => (x - mu) / sigma), mu, sigma };
}
function detectRPeaksSimple(normalized, sampleRateHz) {
    // Minimal peak detector:
    // - compute first difference magnitude
    // - threshold at k * median
    // - enforce refractory period (200ms)
    const diffs = normalized.map((x, i) => i === 0 ? 0 : Math.abs(x - normalized[i - 1]));
    const sorted = diffs.slice().sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] || 0;
    const thr = Math.max(0.6, 4 * median);
    const refractory = Math.floor(0.2 * sampleRateHz);
    const peaks = [];
    let last = -Infinity;
    for (let i = 1; i < diffs.length - 1; i++) {
        if (i - last < refractory)
            continue;
        const isLocalMax = diffs[i] >= diffs[i - 1] && diffs[i] >= diffs[i + 1];
        if (isLocalMax && diffs[i] > thr) {
            // refine by searching max amplitude within +/- 50ms
            const radius = Math.floor(0.05 * sampleRateHz);
            const start = Math.max(0, i - radius);
            const end = Math.min(normalized.length - 1, i + radius);
            let bestIdx = i;
            let bestVal = normalized[i];
            for (let j = start; j <= end; j++) {
                if (normalized[j] > bestVal) {
                    bestVal = normalized[j];
                    bestIdx = j;
                }
            }
            peaks.push(bestIdx);
            last = bestIdx;
        }
    }
    return peaks;
}
function estimateHeartRateBpm(rPeakIndices, sampleRateHz) {
    if (rPeakIndices.length < 2)
        return undefined;
    const rr = [];
    for (let i = 1; i < rPeakIndices.length; i++) {
        rr.push((rPeakIndices[i] - rPeakIndices[i - 1]) / sampleRateHz);
    }
    const rrMean = mean(rr);
    if (!Number.isFinite(rrMean) || rrMean <= 0)
        return undefined;
    return Math.round((60 / rrMean) * 10) / 10;
}
export function preprocessEcg(signal) {
    const xs = signal.samples.map((s) => s.v);
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    const mu0 = mean(xs);
    const sigma0 = std(xs, mu0);
    // very small denoise: moving average smoothing
    const cleaned = movingAverage(xs, Math.max(3, Math.floor(signal.sampleRateHz * 0.01)));
    const { normalized } = zNormalize(cleaned);
    const rPeakIndices = detectRPeaksSimple(normalized, signal.sampleRateHz);
    const estimatedHeartRateBpm = estimateHeartRateBpm(rPeakIndices, signal.sampleRateHz);
    const durationSec = xs.length / signal.sampleRateHz;
    const summary = {
        sampleRateHz: signal.sampleRateHz,
        sampleCount: xs.length,
        durationSec,
        mean: mu0,
        std: sigma0,
        min,
        max,
        rPeakIndices,
        estimatedHeartRateBpm
    };
    return { cleaned, normalized, summary };
}
