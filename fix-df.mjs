import fs from "node:fs";

const p = "src/features/datasets/components/DetailsForm.jsx";
let s = fs.readFileSync(p , "utf8");

const Q = String.fromCharCode(34);  // double quote
const C = String.fromCharCode(58);  // colon
const O = String.fromCharCode(123); // {
const G = String.fromCharCode(125); // }
const E = String.fromCharCode(91);  // [
const F = String.fromCharCode(93);  // ]
const N = String.fromCharCode(10);  // newline

const entries = [
  ["English", "English"],
  ["Amharic", "Amharic — አማርኛ"],
  ["Afaan Oromo", "Afaan Oromo — Afaan Oromoo"],
  ["Tigrinya", "Tigrinya — ትግርኛ"],
  ["Somali", "Somali — Soomaali"],
  ["Afar", "Afar — Qafár af"],
  ["Sidama", "Sidama — Sidaamu Afoo"],
  ["Wolaytta", "Wolaytta"],
  ["Gurage", "Gurage — ጉራጌ"],
  ["Hadiyya", "Hadiyya"],
  ["Kembata", "Kembata"],
  ["Gamo", "Gamo"],
  ["Gofa", "Gofa"],
  ["Silte", "Silte"],
  ["Arsi Oromo", "Arsi Oromo"],
  ["Boorana Oromo", "Boorana Oromo"],
  ["Guragigna", "Guragigna"],
  ["Harari", "Harari — ሐረሪ"],
  ["Kafa", "Kafa"],
  ["Shinasha", "Shinasha"],
  ["Bench", "Bench — Bench Non"],
  ["Sheko", "Sheko"],
  ["Dawuro", "Dawuro"],
  ["Konso", "Konso"],
  ["Maji", "Maji"],
  ["Surma", "Surma"],
  ["Me'en", "Me'en"],
  ["Not Applicable", "Not Applicable"],
  ["Arabic", "Arabic — العربية"],
  ["French", "French"],
  ["German", "German"],
  ["Chinese", "Chinese"],
  ["Portuguese", "Portuguese"],
  ["Italian", "Italian"],
  ["Japanese", "Japanese"],
  ["Korean", "Korean"],
  ["Swahili", "Swahili — Kiswahili"],
];

const lines = [];
lines.push("const LANGUAGE_OPTIONS = " + E);
lines.push("  // Language is OPTIONAL — a dataset with no textual/linguistic content");
lines.push("  // can select Not Applicable. Covers English, all major Ethiopian");
lines.push("  // languages, and common international research languages.");
for (const pair of entries) {
  const v = pair[0];
  const l = pair[1];
  const obj =
    O + " value" + C + " " + Q + v + Q + ", label" + C + " " + Q + l + Q + " " + G + ",";
  lines.push("  " + obj);
}
lines.push(F + ";");
const newBlock = lines.join(N );

const startMarker = "// Exhaustive list of supported languages";
const endMarker = "export default function DetailsForm";
const startIdx = s.indexOf(startMarker);
const endIdx = s.indexOf(endMarker );
if (startIdx === -1 || endIdx === -1) throw new Error("markers not found");

s = s.slice(0, startIdx) + newBlock + N + s.slice(endIdx );
fs.writeFileSync(p, s);
console.log("DetailsForm language block written");