const regex =
  /^(?:[A-Za-z0-9_-]+\s+)?GPS(?:[:=]\s*|\s+)(?<gpsLat>-?\d+(?:\.\d+)?)(?:\s*(?:deg)?\s*[NnSs])?,\s*(?<gpsLon>-?\d+(?:\.\d+)?)(?:\s*(?:deg)?\s*[EeWw])?/i;
const segment = 'AH3 GPS 63.742088 deg N, 11.307442 deg E';
console.log(regex.exec(segment));
