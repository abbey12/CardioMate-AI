/**
 * Generate SVG waveform visualization for ECG signals.
 * Optimized for PDF inclusion with clinical ECG paper styling.
 */
export function generateWaveformSvg(opts) {
    const width = opts.width ?? 800;
    const height = opts.height ?? 200;
    const samples = opts.samples;
    const rPeaks = opts.rPeaks ?? [];
    const showGrid = opts.showGrid !== false;
    if (samples.length < 2) {
        return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="#666">Insufficient data</text>
    </svg>`;
    }
    // Find min/max for normalization
    let min = Infinity;
    let max = -Infinity;
    for (const v of samples) {
        if (v < min)
            min = v;
        if (v > max)
            max = v;
    }
    const range = Math.max(1e-9, max - min);
    // Calculate points
    const points = [];
    for (let i = 0; i < samples.length; i++) {
        const x = (i / (samples.length - 1)) * width;
        const y = height - ((samples[i] - min) / range) * height;
        points.push(`${x},${y}`);
    }
    // Filter R-peaks within range
    const peaksInRange = rPeaks.filter((p) => p >= 0 && p < samples.length);
    // Generate SVG
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background: #f8f9fa;">`;
    // Grid (clinical ECG paper style)
    if (showGrid) {
        svg += `<defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e0e0e0" stroke-width="0.5"/>
      </pattern>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#grid)" />`;
        // Major grid lines (every 200ms equivalent, assuming 250Hz = 50 samples)
        const majorGridSpacing = 50; // Adjust based on sample rate
        for (let x = 0; x <= width; x += majorGridSpacing) {
            svg += `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#d0d0d0" stroke-width="1"/>`;
        }
        for (let y = 0; y <= height; y += 40) {
            svg += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#d0d0d0" stroke-width="1"/>`;
        }
    }
    // Waveform line
    svg += `<polyline points="${points.join(" ")}" fill="none" stroke="#0066cc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    // R-peak markers
    if (peaksInRange.length > 0) {
        for (const peakIdx of peaksInRange) {
            const x = (peakIdx / (samples.length - 1)) * width;
            svg += `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#ff6b00" stroke-width="1" stroke-opacity="0.6" stroke-dasharray="2,2"/>`;
            // R-peak dot
            const y = height - ((samples[peakIdx] - min) / range) * height;
            svg += `<circle cx="${x}" cy="${y}" r="3" fill="#ff6b00" stroke="#fff" stroke-width="1"/>`;
        }
    }
    // Axes labels (optional, can be added if needed)
    svg += `</svg>`;
    return svg;
}
/**
 * Generate a more detailed annotated waveform with interval markers
 */
export function generateAnnotatedWaveformSvg(opts) {
    const baseSvg = generateWaveformSvg({
        samples: opts.samples,
        rPeaks: opts.rPeaks,
        width: opts.width,
        height: opts.height,
        showGrid: true,
    });
    // TODO: Add P, QRS, T wave annotations if interval data available
    // This would require more sophisticated signal processing
    return baseSvg;
}
