import Database from "better-sqlite3";

const db = new Database("data/volentieri.sqlite");
let t = db
  .prepare("SELECT riassunto FROM piani WHERE id=?")
  .get("T1N2P3UlJQ").riassunto;

const store = [];
const protect = (x) => {
  store.push(x);
  return `§§MATH${store.length - 1}§§`;
};
t = t.replace(/\\\[([\s\S]*?)\\\]/g, () => protect("D"));
t = t.replace(/\\\(([\s\S]*?)\\\)/g, () => protect("I"));

const region = t.slice(t.indexOf("Premessa"), t.indexOf("Premessa") + 550);
console.log("REGION:\n", region);
console.log("\n--- bold1 ---");
console.log(region.replace(/\*\*\s+([^*]+?)\s*\*\*/g, "**$1**"));
console.log("\n--- bold2 ---");
console.log(region.replace(/\*\*([^*]+?)\s+\*\*/g, "**$1**"));
console.log("\n--- bold3 ---");
console.log(region.replace(/(\*\*[^*]+\*\*)([A-Za-zÀ-ÿ])/g, "$1 $2"));

// full pipeline bold only
let u = region;
u = u.replace(/\*\*\s+([^*]+?)\s*\*\*/g, "**$1**");
u = u.replace(/\*\*([^*]+?)\s+\*\*/g, "**$1**");
u = u.replace(/(\*\*[^*]+\*\*)([A-Za-zÀ-ÿ])/g, "$1 $2");
console.log("\n--- all bold ---");
console.log(u);

// list all bold2 matches on FULL text
console.log("\n--- bold2 matches that include space issue ---");
const re = /\*\*([^*]+?)\s+\*\*/g;
let m;
while ((m = re.exec(t))) {
  if (m[0].length < 80) console.log(JSON.stringify(m[0]));
}
