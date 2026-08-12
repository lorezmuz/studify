import Database from "better-sqlite3";

const db = new Database("data/volentieri.sqlite");
let t = db.prepare("SELECT riassunto FROM piani WHERE id=?").get("T1N2P3UlJQ").riassunto;
const show = () => {
  const i = t.indexOf("quiete");
  console.log(JSON.stringify(t.slice(i - 35, i + 25)));
};

console.log("0 raw");
show();

t = t.replace(/\r\n/g, "\n");
// only math with dummy protect (no real katex needed)
const store = [];
const protect = (x) => {
  store.push(x);
  return `§§MATH${store.length - 1}§§`;
};
t = t.replace(/\\\[([\s\S]*?)\\\]/g, (_, b) => protect(`D:${b.slice(0, 20)}`));
console.log("1 after display math, count", store.length);
show();
t = t.replace(/\$\$([\s\S]*?)\$\$/g, (_, b) => protect(`DD:${b.slice(0, 20)}`));
console.log("2 after $$");
show();
t = t.replace(/\\\(([\s\S]*?)\\\)/g, (_, b) => protect(`I:${b.slice(0, 20)}`));
console.log("3 after inline \\( count", store.length);
show();
t = t.replace(/\$([^$\n]+?)\$/g, (_, b) => protect(`S:${b.slice(0, 20)}`));
console.log("4 after $");
show();

t = t.replace(/^(#{1,4})([^\s#])/gm, "$1 $2");
t = t.replace(/([^\n])\n(#{1,4}\s)/g, "$1\n\n$2");
t = t.replace(/^\s*---\s*$/gm, "\n\n---\n\n");
t = t.replace(/^(\s*)[-*•]([^\s*-])/gm, "$1- $2");
console.log("5 after md norms");
show();

t2 = t.replace(/\*\*\s+([^*]+?)\s*\*\*/g, "**$1**");
console.log("6 after bold1", JSON.stringify(t2.slice(t2.indexOf("quiete") - 35, t2.indexOf("quiete") + 25)));
t3 = t2.replace(/\*\*([^*]+?)\s+\*\*/g, "**$1**");
console.log("7 after bold2", JSON.stringify(t3.slice(t3.indexOf("quiete") - 35, t3.indexOf("quiete") + 25)));
t4 = t3.replace(/(\*\*[^*]+\*\*)([A-Za-zÀ-ÿ])/g, "$1 $2");
console.log("8 after bold3", JSON.stringify(t4.slice(t4.indexOf("quiete") - 35, t4.indexOf("quiete") + 25)));
