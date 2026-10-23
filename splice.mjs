import fs from "fs";

const p = "src/components/settings/SettingsPage.tsx";
const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);

// sanity-check the bounds before cutting
if (lines[930].trim() !== "<div>") throw new Error("start: " + lines[930]);
if (lines[1046].trim() !== "</div>") throw new Error("end: " + lines[1046]);
if (lines[1049].trim() !== "</SectionCard>") throw new Error("tail: " + lines[1049]);

const replacement = [
  "          <PayoutAccountForm",
  "            onSaved={() => setEditing(false)}",
  "            onCancel={payout ? () => setEditing(false) : undefined}",
  "          />",
];

lines.splice(930, 1047 - 930, ...replacement);
fs.writeFileSync(p, lines.join("\n"));
console.log("spliced");
