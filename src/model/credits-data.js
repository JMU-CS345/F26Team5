// What the credits screen shows. Keep the asset entries in sync with assets/CREDITS.md.

const CREDITS = Object.freeze({
  game: "Mage Quest",
  course: "JMU CS345 Fall 2026",
  instructor: "Prof. Riley",
  team: Object.freeze(["Enzo", "Nick", "Vincent", "Minhhai", "Prabesh"]),
  assets: Object.freeze([
    Object.freeze({
      asset: "assets/enemy/tiny-creatures.png",
      description: "Zombie, Skeleton, Bat, Eyeball and Demon sprites",
      creator: "Clint Bellanger",
      license: "CC0 1.0",
      source: "opengameart.org/content/tiny-creatures"
    }),
    Object.freeze({
      asset: "Everything else in assets/",
      description: "Jelly and other enemy sheets, weapons, player sprites, tiles, money",
      creator: "Vincent Barr",
      license: "Drawn for this project",
      source: "Team project"
    })
  ])
});

// The credits as a flat list of { text, style } lines, top to bottom.
// Styles are "title", "heading", "text" and "small", and "" is a blank line.
function creditsLines() {
  const lines = [
    { text: CREDITS.game, style: "title" },
    { text: "", style: "" },
    { text: CREDITS.course, style: "text" },
    { text: "Instructor: " + CREDITS.instructor, style: "text" },
    { text: "", style: "" },
    { text: "Team", style: "heading" }
  ];
  for (const name of CREDITS.team) {
    lines.push({ text: name, style: "text" });
  }
  lines.push({ text: "", style: "" });
  lines.push({ text: "Asset credits", style: "heading" });
  for (const entry of CREDITS.assets) {
    lines.push({ text: entry.creator + " (" + entry.license + ")", style: "text" });
    lines.push({ text: entry.asset, style: "small" });
    lines.push({ text: entry.description, style: "small" });
    lines.push({ text: entry.source, style: "small" });
    lines.push({ text: "", style: "" });
  }
  return lines;
}
