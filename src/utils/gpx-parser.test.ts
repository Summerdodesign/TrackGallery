import { describe, it, expect } from 'vitest';
import { GPXParser } from './gpx-parser';

const parser = new GPXParser();

// Helper: minimal valid GPX 1.1
const gpx11 = (body: string) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
${body}
</gpx>`;

// Helper: minimal valid GPX 1.0
const gpx10 = (body: string) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.0" xmlns="http://www.topografix.com/GPX/1/0">
${body}
</gpx>`;

describe('GPXParser.parse', () => {
  it('should extract track points from GPX 1.1', () => {
    const xml = gpx11(`
  <trk>
    <name>Test Track</name>
    <trkseg>
      <trkpt lat="30.0" lon="120.0"><ele>100</ele></trkpt>
      <trkpt lat="30.1" lon="120.1"></trkpt>
    </trkseg>
  </trk>`);

    const result = parser.parse(xml);
    expect(result.name).toBe('Test Track');
    expect(result.trackPoints).toHaveLength(2);
    expect(result.trackPoints[0]).toEqual({ lat: 30.0, lon: 120.0, ele: 100 });
    expect(result.trackPoints[1]).toEqual({ lat: 30.1, lon: 120.1 });
  });

  it('should extract track points from GPX 1.0', () => {
    const xml = gpx10(`
  <trk>
    <name>Old Track</name>
    <trkseg>
      <trkpt lat="31.0" lon="121.0"></trkpt>
    </trkseg>
  </trk>`);

    const result = parser.parse(xml);
    expect(result.name).toBe('Old Track');
    expect(result.trackPoints).toHaveLength(1);
    expect(result.trackPoints[0]).toEqual({ lat: 31.0, lon: 121.0 });
  });

  it('should extract waypoints with name and coordinates', () => {
    const xml = gpx11(`
  <wpt lat="30.5" lon="120.5">
    <name>Camp Site</name>
    <ele>500</ele>
  </wpt>
  <wpt lat="30.6" lon="120.6">
    <name>Water Source</name>
  </wpt>
  <trk><name>T</name><trkseg><trkpt lat="30.0" lon="120.0"></trkpt></trkseg></trk>`);

    const result = parser.parse(xml);
    expect(result.waypoints).toHaveLength(2);
    expect(result.waypoints[0]).toEqual({
      name: 'Camp Site',
      position: { lat: 30.5, lon: 120.5, ele: 500 },
    });
    expect(result.waypoints[1]).toEqual({
      name: 'Water Source',
      position: { lat: 30.6, lon: 120.6 },
    });
  });

  it('should maintain track point order across multiple segments', () => {
    const xml = gpx11(`
  <trk>
    <name>Multi Seg</name>
    <trkseg>
      <trkpt lat="1.0" lon="1.0"></trkpt>
      <trkpt lat="2.0" lon="2.0"></trkpt>
    </trkseg>
    <trkseg>
      <trkpt lat="3.0" lon="3.0"></trkpt>
    </trkseg>
  </trk>`);

    const result = parser.parse(xml);
    expect(result.trackPoints).toHaveLength(3);
    expect(result.trackPoints[0].lat).toBe(1.0);
    expect(result.trackPoints[1].lat).toBe(2.0);
    expect(result.trackPoints[2].lat).toBe(3.0);
  });

  it('should return empty data for invalid XML', () => {
    const result = parser.parse('<not valid xml>>>');
    expect(result.name).toBe('');
    expect(result.trackPoints).toHaveLength(0);
    expect(result.waypoints).toHaveLength(0);
  });

  it('should handle GPX without namespace', () => {
    const xml = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk><name>No NS</name><trkseg><trkpt lat="10" lon="20"></trkpt></trkseg></trk>
</gpx>`;
    const result = parser.parse(xml);
    expect(result.name).toBe('No NS');
    expect(result.trackPoints).toHaveLength(1);
  });
});

describe('GPXParser.format', () => {
  it('should produce valid GPX XML with track points and waypoints', () => {
    const trackData = {
      name: 'My Route',
      trackPoints: [
        { lat: 30.0, lon: 120.0, ele: 100 },
        { lat: 30.1, lon: 120.1 },
      ],
      waypoints: [
        { name: 'Start', position: { lat: 30.0, lon: 120.0 } },
      ],
    };

    const xml = parser.format(trackData);
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<gpx');
    expect(xml).toContain('version="1.1"');
    expect(xml).toContain('<trkpt lat="30" lon="120">');
    expect(xml).toContain('<ele>100</ele>');
    expect(xml).toContain('<trkpt lat="30.1" lon="120.1">');
    expect(xml).toContain('<wpt lat="30" lon="120">');
    expect(xml).toContain('<name>Start</name>');
    expect(xml).toContain('<name>My Route</name>');
  });

  it('should escape special XML characters in names', () => {
    const trackData = {
      name: 'Route <A> & "B"',
      trackPoints: [{ lat: 1, lon: 2 }],
      waypoints: [],
    };

    const xml = parser.format(trackData);
    expect(xml).toContain('&lt;A&gt;');
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&quot;B&quot;');
  });

  it('should produce pretty-printed output with indentation', () => {
    const trackData = {
      name: 'Test',
      trackPoints: [{ lat: 1, lon: 2 }],
      waypoints: [],
    };

    const xml = parser.format(trackData);
    const lines = xml.split('\n');
    // Check indentation exists
    expect(lines.some(l => l.startsWith('  <trk>'))).toBe(true);
    expect(lines.some(l => l.startsWith('    <trkseg>'))).toBe(true);
    expect(lines.some(l => l.startsWith('      <trkpt'))).toBe(true);
  });
});

describe('GPXParser.validate', () => {
  it('should return valid for well-formed GPX with track data', () => {
    const xml = gpx11(`
  <trk><trkseg><trkpt lat="30" lon="120"></trkpt></trkseg></trk>`);
    const result = parser.validate(xml);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return error for invalid XML', () => {
    const result = parser.validate('<broken xml>>>');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('GPX 文件格式不合法');
  });

  it('should return error for non-gpx root element', () => {
    const result = parser.validate('<?xml version="1.0"?><html></html>');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('GPX 文件格式不合法');
  });

  it('should return error for GPX without track data', () => {
    const xml = gpx11(`<wpt lat="30" lon="120"><name>A</name></wpt>`);
    const result = parser.validate(xml);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('GPX 文件不包含轨迹数据');
  });

  it('should return error for track segment without track points', () => {
    const xml = gpx11(`<trk><trkseg></trkseg></trk>`);
    const result = parser.validate(xml);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('轨迹段不包含任何轨迹点');
  });

  it('should not throw on completely empty string', () => {
    const result = parser.validate('');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should not throw on random garbage input', () => {
    const result = parser.validate('asdkjhf2398r7(*&^%$#@!');
    expect(result.valid).toBe(false);
  });
});

describe('GPXParser round-trip', () => {
  it('should preserve data through parse → format → parse', () => {
    const original = {
      name: 'Round Trip',
      trackPoints: [
        { lat: 30.123, lon: 120.456, ele: 50 },
        { lat: 30.789, lon: 120.012 },
      ],
      waypoints: [
        { name: 'Point A', position: { lat: 30.5, lon: 120.5, ele: 200 } },
      ],
    };

    const xml = parser.format(original);
    const parsed = parser.parse(xml);

    expect(parsed.name).toBe(original.name);
    expect(parsed.trackPoints).toEqual(original.trackPoints);
    expect(parsed.waypoints).toEqual(original.waypoints);
  });
});
