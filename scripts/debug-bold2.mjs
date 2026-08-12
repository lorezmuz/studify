import Database from "better-sqlite3";

const db = new Database("data/volentieri.sqlite");
let t = db
  .prepare("SELECT riassunto FROM piani WHERE id=?")
  .get("T1N2P3UlJQ").riassunto;

const store = [];
const protect = () => {
  const id = store.length;
  store.push("x");
  return `§§MATH${id}§§`;
};
t = t.replace(/\r\n/g, "\n");
t = t.replace(/\\\[([\s\S]*?)\\\]/g, () => protect());
t = t.replace(/\\\(([\s\S]*?)\\\)/g, () => protect());

const show = (label) => {
  const i = t.indexOf("quiete");
  console.log(label, JSON.stringify(t.slice(i - 45, i + 28)));
};

show("after math");
t = t.replace(/^(#{1,4})([^\s#])/gm, "$1 $2");
t = t.replace(/([^\n])\n(#{1,4}\s)/g, "$1\n\n$2");
t = t.replace(/^\s*---\s*$/gm, "\n\n---\n\n");
t = t.replace(/^(\s*)[-*•]([^\s*-])/gm, "$1- $2");
show("after norms");

// test each
const a = t.replace(/\*\*([ \t]+)([^*\n]+?)\*\*/g, "**$2**");
console.log(
  "pad1",
  JSON.stringify(a.slice(a.indexOf("quiete") - 45, a.indexOf("quiete") + 28))
);
const b = t.replace(/\*\*([^*\n]+?)([ \t]+)\*\*/g, "**$1**");
console.log(
  "pad2",
  JSON.stringify(b.slice(b.indexOf("quiete") - 45, b.indexOf("quiete") + 28))
);

// find pad2 matches near quiete
const re = /\*\*([^*\n]+?)([ \t]+)\*\*/g;
let m;
while ((m = re.exec(t))) {
  if (Math.abs(m.index - t.indexOf("quiete")) < 100) {
    console.log("near match", JSON.stringify(m[0]), "at", m.index);
  }
}

// char codes around quiete
const i = t.indexOf("quiete");
const slice = t.slice(i - 10, i + 15);
console.log(
  "codes",
  [...slice].map((c) => c + ":" + c.charCodeAt(0)).join(" ")
);
