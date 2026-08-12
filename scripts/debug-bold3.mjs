import Database from "better-sqlite3";

const db = new Database("data/volentieri.sqlite");
let t = db
  .prepare("SELECT riassunto FROM piani WHERE id=?")
  .get("T1N2P3UlJQ").riassunto;

const store = [];
const protect = () => {
  store.push("x");
  return `§§MATH${store.length - 1}§§`;
};
t = t.replace(/\r\n/g, "\n");
t = t.replace(/\\\[([\s\S]*?)\\\]/g, () => protect());
t = t.replace(/\\\(([\s\S]*?)\\\)/g, () => protect());

const show = (label, s = t) => {
  const i = s.indexOf("quiete");
  console.log(label, JSON.stringify(s.slice(i - 50, i + 30)));
};

show("math only");
t = t.replace(/^(#{1,4})([^\s#])/gm, "$1 $2");
t = t.replace(/([^\n])\n(#{1,4}\s)/g, "$1\n\n$2");
t = t.replace(/^\s*---\s*$/gm, "\n\n---\n\n");
t = t.replace(/^(\s*)[-*•]([^\s*-])/gm, "$1- $2");
show("norms");

const pad1 = /\*\*([ \t]+)([^*\n]+?)\*\*/g;
const pad1b = /(^|[\s([{«"'])\*\*[ \t]+([^*\n]+?)\*\*/gm;
const pad2b = /(^|[\s([{«"'])\*\*([^*\n]+?)[ \t]+\*\*/gm;

let u = t;
u = u.replace(pad1b, "$1**$2**");
show("pad1b", u);
u = t.replace(pad2b, "$1**$2**");
show("pad2b only", u);

// print pad2b matches near quiete
let m;
const re = new RegExp(pad2b.source, pad2b.flags);
while ((m = re.exec(t))) {
  if (Math.abs(m.index - t.indexOf("quiete")) < 120) {
    console.log("pad2b match", JSON.stringify(m[0]));
  }
}
